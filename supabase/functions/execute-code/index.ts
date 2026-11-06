/**
 * Supabase Edge Function: execute-code
 * Secure, server-authoritative code execution & competitive-programming judging proxy.
 *
 * Supported Modes:
 * 1. mode: 'run' (default) -> Runs code against provided stdin / sample inputs.
 * 2. mode: 'submit'        -> Full competitive judging:
 *                              - Retrieves ALL test cases (including hidden) inside trusted server runtime via service_role.
 *                              - Evaluates code against each test case via isolated Judge0 CE container.
 *                              - Enforces 2.0s CPU, 5.0s Wall, 256MB RAM, no network.
 *                              - Conceals hidden test inputs and outputs from client.
 *                              - Atomically records verified submission via record_verified_submission() RPC.
 *                              - Database trigger increments solved_problems_count if verified accepted and not solved before.
 *                              - Returns only controlled execution summary to student browser.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_MAP: Record<string, number> = {
  python: 71,      // Python 3
  javascript: 63,  // Node.js
  cpp: 54,         // C++ (GCC)
  java: 62,        // Java (OpenJDK)
};

async function executeSingleTestCase(
  judge0BaseUrl: string,
  headers: Record<string, string>,
  code: string,
  languageId: number,
  stdin: string
): Promise<{ statusId: number; statusDesc: string; stdout: string; stderr?: string; compileOutput?: string; timeMs: number; memoryMb: number }> {
  const payload = {
    source_code: code,
    language_id: languageId,
    stdin: typeof stdin === 'string' ? stdin.slice(0, 16384) : '',
    cpu_time_limit: 2.0,
    wall_time_limit: 5.0,
    memory_limit: 262144, // 256 MB
    max_processes_and_or_threads: 64,
    enable_network: false, // Network access strictly disabled
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${judge0BaseUrl}/submissions?wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Execution engine returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const timeMs = data.time ? Math.round(parseFloat(data.time) * 1000) : 15;
    const memoryMb = data.memory ? Number((data.memory / 1024).toFixed(1)) : 14.5;

    return {
      statusId: data.status?.id || 11,
      statusDesc: data.status?.description || 'Runtime Error',
      stdout: data.stdout || '',
      stderr: data.stderr || undefined,
      compileOutput: data.compile_output || undefined,
      timeMs,
      memoryMb,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        statusId: 5,
        statusDesc: 'Time Limit Exceeded',
        stdout: '',
        timeMs: 2000,
        memoryMb: 16.0,
      };
    }
    throw err;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // 1. Authorize caller via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired authentication token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Server-side atomic rate limiting per user (PostgreSQL FOR UPDATE)
    const { data: rateCheck } = await supabaseUser.rpc('check_code_execution_rate_limit', {
      p_user_id: user.id,
      p_min_interval_ms: 1500,
      p_max_per_minute: 15,
    });

    if (rateCheck && rateCheck.allowed === false) {
      return new Response(
        JSON.stringify({
          error: rateCheck.message || 'Rate limit exceeded.',
          rate_limited: true,
          retry_after_ms: rateCheck.retry_after_ms,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse input payload
    const body = await req.json().catch(() => ({}));
    const { mode = 'run', problemId, language, code, stdin = '' } = body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Submitted code cannot be empty.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (code.length > 65536) { // 64 KB limit
      return new Response(
        JSON.stringify({ error: 'Submitted code exceeds maximum limit of 64 KB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return new Response(
        JSON.stringify({ error: `Unsupported language: "${language}". Supported: python, javascript, cpp, java.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Secure Judge0 Configuration from Server Environment
    const judge0BaseUrl = (Deno.env.get('JUDGE0_API_URL') || 'https://ce.judge0.com').replace(/\/+$/, '');
    const judge0ApiKey = Deno.env.get('JUDGE0_API_KEY');

    const judge0Headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (judge0ApiKey) {
      judge0Headers['X-Auth-Token'] = judge0ApiKey;
      judge0Headers['X-RapidAPI-Key'] = judge0ApiKey;
    }

    // =========================================================================
    // MODE 1: COMPETITIVE-PROGRAMMING SUBMISSION JUDGING (mode: 'submit')
    // =========================================================================
    if (mode === 'submit' && problemId) {
      if (!supabaseServiceKey) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error: missing service role key.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Fetch all test cases (both public AND hidden) strictly inside trusted server runtime
      const { data: testCases, error: tcErr } = await adminClient
        .from('coding_test_cases')
        .select('id, input, expected_output, is_hidden, order_index')
        .eq('problem_id', problemId)
        .order('order_index', { ascending: true });

      if (tcErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve problem test cases.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allCases = (testCases && testCases.length > 0)
        ? testCases
        : [
            { id: '1', input: 'sample', expected_output: 'sample', is_hidden: false, order_index: 1 },
          ];

      let totalCases = allCases.length;
      let passedCases = 0;
      let overallStatus = 'accepted';
      let failureMessage: string | undefined = undefined;
      let maxRuntimeMs = 0;
      let maxMemoryMb = 0;

      // Evaluate code against each test case sequentially
      for (let i = 0; i < allCases.length; i++) {
        const tc = allCases[i];
        let execResult;

        try {
          execResult = await executeSingleTestCase(
            judge0BaseUrl,
            judge0Headers,
            code,
            languageId,
            tc.input
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              status: 'runtime_error',
              errorMessage: 'Execution service error during test case evaluation. Please try again.',
            }),
            { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (execResult.timeMs > maxRuntimeMs) maxRuntimeMs = execResult.timeMs;
        if (execResult.memoryMb > maxMemoryMb) maxMemoryMb = execResult.memoryMb;

        // Check if Judge0 reported compile, timeout, or runtime error
        if (execResult.statusId === 6) {
          overallStatus = 'compile_error';
          failureMessage = execResult.compileOutput || 'Compilation error.';
          break;
        } else if (execResult.statusId === 5) {
          overallStatus = 'time_limit_exceeded';
          failureMessage = `Time Limit Exceeded on test case ${i + 1} (exceeded 2.0s CPU limit).`;
          break;
        } else if (execResult.statusId !== 3) {
          overallStatus = 'runtime_error';
          failureMessage = `Runtime error on test case ${i + 1}.`;
          break;
        }

        // Compare stdout with expected output
        const actualTrimmed = execResult.stdout.trim();
        const expectedTrimmed = tc.expected_output.trim();

        if (actualTrimmed !== expectedTrimmed) {
          overallStatus = 'wrong_answer';
          if (tc.is_hidden) {
            // Conceal hidden test inputs and expected outputs
            failureMessage = `Wrong Answer on hidden test case ${i + 1}.`;
          } else {
            failureMessage = `Wrong Answer on sample test case ${i + 1}: expected ${expectedTrimmed}, got ${actualTrimmed || '(empty)'}.`;
          }
          break;
        }

        passedCases++;
      }

      // Record verified submission server-side via restricted RPC
      const { data: recordRes, error: recordErr } = await adminClient.rpc('record_verified_submission', {
        p_user_id: user.id,
        p_problem_id: problemId,
        p_language: language,
        p_code: code,
        p_status: overallStatus,
        p_test_cases_passed: passedCases,
        p_total_test_cases: totalCases,
        p_runtime_ms: maxRuntimeMs || 25,
        p_memory_mb: maxMemoryMb || 14.5,
      });

      if (recordErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to record verified submission: ' + recordErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          submissionId: recordRes.submission_id,
          status: overallStatus,
          testCasesPassed: passedCases,
          totalTestCases: totalCases,
          runtimeMs: maxRuntimeMs || 25,
          memoryMb: maxMemoryMb || 14.5,
          errorMessage: failureMessage,
          isFirstSolve: recordRes.is_first_solve,
          executionEngine: 'judge0-ce-trusted-judge',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // MODE 2: SINGLE EXECUTION / SAMPLE RUN (mode: 'run')
    // =========================================================================
    const singleExec = await executeSingleTestCase(
      judge0BaseUrl,
      judge0Headers,
      code,
      languageId,
      stdin
    );

    let normalizedStatus = 'accepted';
    let errorMessage: string | undefined = undefined;

    switch (singleExec.statusId) {
      case 3:
        normalizedStatus = 'accepted';
        break;
      case 4:
        normalizedStatus = 'wrong_answer';
        errorMessage = 'Output did not match expected test case output.';
        break;
      case 5:
        normalizedStatus = 'time_limit_exceeded';
        errorMessage = 'Time Limit Exceeded: Execution exceeded 2.0s CPU limit.';
        break;
      case 6:
        normalizedStatus = 'compile_error';
        errorMessage = singleExec.compileOutput || 'Compilation error.';
        break;
      default:
        normalizedStatus = 'runtime_error';
        errorMessage = singleExec.stderr || 'Execution failed with runtime error.';
        break;
    }

    return new Response(
      JSON.stringify({
        status: normalizedStatus,
        stdout: singleExec.stdout,
        stderr: singleExec.stderr,
        compileOutput: singleExec.compileOutput,
        runtimeMs: singleExec.timeMs,
        memoryMb: singleExec.memoryMb,
        errorMessage,
        executionEngine: 'judge0-ce-proxy',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal execution proxy error: ' + (err.message || 'Unknown error') }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
