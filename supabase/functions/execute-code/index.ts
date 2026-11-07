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

function applyHarness(code: string, language: string): string {
  if (!code) return '';

  if (language === 'python') {
    if (code.includes('if __name__ ==') || code.includes('sys.stdin.read(')) {
      return code;
    }
    return `${code}

# --- YOGNEET AUTO-HARNESS ---
import sys, json, re

def _yogneet_parse_val(v):
    v = v.strip()
    if v.lower() == 'true': return True
    if v.lower() == 'false': return False
    if v.lower() == 'null': return None
    try:
        return json.loads(v)
    except Exception:
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            return v[1:-1]
        try:
            if '.' in v: return float(v)
            return int(v)
        except Exception:
            return v

def _yogneet_runner():
    raw = sys.stdin.read().strip()
    if not raw:
        return
    matches = re.findall(r"""(?:[a-zA-Z_]\w*\s*=\s*)?(\[[^\]]*\]|"[^"]*"|'[^']*'|-?\d+(?:\.\d+)?|true|false|null|\{[^\}]*\})""", raw, re.IGNORECASE)
    args = [_yogneet_parse_val(m) for m in matches] if matches else [_yogneet_parse_val(line) for line in raw.splitlines() if line.strip()]
    sol = Solution() if 'Solution' in globals() else None
    for candidate in ['twoSum', 'isValid', 'reverseString', 'isPalindrome', 'solve', 'solution']:
        fn = getattr(sol, candidate, None) if sol else globals().get(candidate)
        if callable(fn):
            try:
                res = fn(*args)
                if isinstance(res, bool):
                    print(str(res).lower())
                elif isinstance(res, (list, dict)):
                    print(json.dumps(res, separators=(', ', ': ')))
                else:
                    print(res)
                return
            except Exception as e:
                import traceback
                traceback.print_exc(file=sys.stderr)
                sys.exit(1)

if __name__ == '__main__':
    _yogneet_runner()
`;
  }

  if (language === 'javascript') {
    if (code.includes('fs.readFileSync') || code.includes('process.stdin') || code.includes('readline')) {
      return code;
    }
    return `${code}

// --- YOGNEET AUTO-HARNESS ---
(() => {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf-8').trim();
  if (!raw) return;

  function parseVal(v) {
    v = v.trim();
    if (v.toLowerCase() === 'true') return true;
    if (v.toLowerCase() === 'false') return false;
    if (v.toLowerCase() === 'null') return null;
    try { return JSON.parse(v); } catch(e) {
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
      }
      const num = Number(v);
      return !isNaN(num) ? num : v;
    }
  }

  const regex = /(?:[a-zA-Z_]\\w*\\s*=\\s*)?(\\[[^\\]]*\\]|"[^"]*"|'[^']*'|-?\\d+(?:\\.\\d+)?|true|false|null|\\{[^\\}]*\\})/gi;
  const matches = [];
  let m;
  while ((m = regex.exec(raw)) !== null) {
    matches.push(parseVal(m[1]));
  }
  const args = matches.length ? matches : raw.split('\\n').filter(Boolean).map(parseVal);

  const candidates = [
    typeof twoSum === 'function' ? twoSum : null,
    typeof isValid === 'function' ? isValid : null,
    typeof reverseString === 'function' ? reverseString : null,
    typeof isPalindrome === 'function' ? isPalindrome : null,
    typeof solve === 'function' ? solve : null,
    typeof solution === 'function' ? solution : null,
  ].filter(Boolean);

  if (candidates.length > 0) {
    try {
      const res = candidates[0](...args);
      if (typeof res === 'boolean') {
        console.log(res ? 'true' : 'false');
      } else if (typeof res === 'object' && res !== null) {
        console.log(JSON.stringify(res).replace(/,/g, ', '));
      } else {
        console.log(res);
      }
    } catch(err) {
      console.error(err);
      process.exit(1);
    }
  }
})();
`;
  }

  if (language === 'cpp') {
    if (code.includes('int main(') || code.includes('int main (')) {
      return code;
    }
    return `${code}

// --- YOGNEET AUTO-HARNESS ---
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <regex>

static std::vector<int> _yogneet_parse_int_array(const std::string& s) {
    std::vector<int> res;
    std::regex re("-?\\\\d+");
    auto begin = std::sregex_iterator(s.begin(), s.end(), re);
    auto end = std::sregex_iterator();
    for (std::sregex_iterator i = begin; i != end; ++i) {
        res.push_back(std::stoi(i->str()));
    }
    return res;
}

int main() {
    std::string line;
    if (std::getline(std::cin, line)) {
        Solution sol;
        std::smatch m;
        std::regex target_re("target\\\\s*=\\\\s*(-?\\\\d+)");
        if (std::regex_search(line, m, target_re)) {
            int target = std::stoi(m[1].str());
            std::vector<int> nums = _yogneet_parse_int_array(line.substr(0, m.position()));
            auto ans = sol.twoSum(nums, target);
            if (ans.size() >= 2) {
                std::cout << "[" << ans[0] << ", " << ans[1] << "]" << std::endl;
            } else {
                std::cout << "[]" << std::endl;
            }
            return 0;
        }
        std::regex s_re("s\\\\s*=\\\\s*\\\"([^\\\"]*)\\\"");
        if (std::regex_search(line, m, s_re)) {
            bool ans = sol.isValid(m[1].str());
            std::cout << (ans ? "true" : "false") << std::endl;
            return 0;
        }
    }
    return 0;
}
`;
  }

  if (language === 'java') {
    if (code.includes('public static void main(')) {
      return code;
    }
    return `import java.util.*;
import java.util.regex.*;

${code}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextLine()) return;
        String line = sc.nextLine();
        Solution sol = new Solution();

        Matcher tm = Pattern.compile("target\\\\s*=\\\\s*(-?\\\\d+)").matcher(line);
        if (tm.find()) {
            int target = Integer.parseInt(tm.group(1));
            Matcher nm = Pattern.compile("-?\\\\d+").matcher(line.substring(0, tm.start()));
            List<Integer> list = new ArrayList<>();
            while (nm.find()) list.add(Integer.parseInt(nm.group()));
            int[] nums = list.stream().mapToInt(i -> i).toArray();
            int[] res = sol.twoSum(nums, target);
            if (res.length >= 2) {
                System.out.println("[" + res[0] + ", " + res[1] + "]");
            } else {
                System.out.println("[]");
            }
            return;
        }

        Matcher sm = Pattern.compile("s\\\\s*=\\\\s*\\\"([^\\\"]*)\\\"").matcher(line);
        if (sm.find()) {
            boolean res = sol.isValid(sm.group(1));
            System.out.println(res ? "true" : "false");
            return;
        }
    }
}
`;
  }

  return code;
}

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

    // Wrap code with harness if appropriate
    const finalCode = applyHarness(code, language);

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
            finalCode,
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

        // Compare stdout with expected output (normalizing CRLF and trailing whitespace)
        const actualTrimmed = execResult.stdout.replace(/\r\n/g, '\n').trim();
        const expectedTrimmed = tc.expected_output.replace(/\r\n/g, '\n').trim();

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
      finalCode,
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
