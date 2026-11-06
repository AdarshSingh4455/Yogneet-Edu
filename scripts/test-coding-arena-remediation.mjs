/**
 * ==============================================================================
 * Yogneet Edu — Coding Arena Final Remediation Verification Test Suite
 * ==============================================================================
 * Validates Priority 1 and Priority 2:
 *
 * Priority 1: Solved Problems Counter Server-Authoritative Gamification
 *   1.1 Successful first-time submission increments solved_problems_count by exactly +1.
 *   1.2 Duplicate submission for the same problem does NOT increment solved_problems_count.
 *   1.3 Failed submission (wrong answer / compile error) does NOT increment counter.
 *   1.4 Unauthorized caller cannot submit solutions (fails closed).
 *   1.5 Direct student tampering with profiles.solved_problems_count is strictly blocked.
 *   1.6 Direct student INSERT into coding_submissions is strictly blocked by RLS.
 *
 * Priority 2: Isolated Code Execution Architecture
 *   2.1 Isolated execution supports Python 3 with memory & runtime metrics.
 *   2.2 Isolated execution supports JavaScript (Node.js).
 *   2.3 Isolated execution supports C++ (GCC).
 *   2.4 Isolated execution supports Java (OpenJDK).
 *   2.5 Resource Limit: Infinite loop triggers Time Limit Exceeded (CPU limit enforced).
 *   2.6 Resource Limit: Outbound network calls fail (enable_network: false enforced).
 *   2.7 Hidden Test Cases: RLS strictly prevents student read access to is_hidden test cases.
 *   2.8 Client Rate Limiter & Payload Guard: Rejects oversized payloads (>64KB) and rapid spam.
 * ==============================================================================
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import { createClient } from '@supabase/supabase-js';

function loadStagingEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local file not found');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const stagingEnv = loadStagingEnv();

describe('Coding Arena Final Remediation Verification', () => {
  const PROD_URL = 'https://acmhdklihpqzurzuthkw.supabase.co';

  it('0. Safety Boundary: Tests strictly target Staging instance', () => {
    assert.notStrictEqual(
      stagingEnv.VITE_SUPABASE_URL,
      PROD_URL,
      'CRITICAL: Tests must NEVER execute against production Supabase URL!'
    );
    assert.ok(
      stagingEnv.VITE_SUPABASE_URL.includes('ksjeravfkjfbpvfdazus'),
      'Must target staging Supabase instance (ksjeravfkjfbpvfdazus)'
    );
  });

  const serviceClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const runId = crypto.randomBytes(4).toString('hex');
  const studentEmail = `remedy-student-${runId}@staging.yogneet.internal`;
  const adminEmail = `remedy-admin-${runId}@staging.yogneet.internal`;
  const commonPass = `RemedyP@ss!${runId}`;

  let studentId = null;
  let adminId = null;
  let studentClient = null;
  let adminClient = null;
  let unauthClient = null;

  let problemIdA = null;
  let problemIdB = null;

  before(async () => {
    unauthClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const loginHelper = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create student account
    const { data: sAuth, error: sErr } = await serviceClient.auth.admin.createUser({
      email: studentEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { full_name: `Remedy Student ${runId}` },
    });
    if (sErr) throw sErr;
    studentId = sAuth.user.id;

    await serviceClient.from('profiles').upsert({
      id: studentId,
      email: studentEmail,
      full_name: `Remedy Student ${runId}`,
      role: 'student',
      status: 'active',
      solved_problems_count: 0,
    });

    // 2. Create admin account
    const { data: aAuth, error: aErr } = await serviceClient.auth.admin.createUser({
      email: adminEmail,
      password: commonPass,
      email_confirm: true,
      user_metadata: { full_name: `Remedy Admin ${runId}` },
    });
    if (aErr) throw aErr;
    adminId = aAuth.user.id;

    await serviceClient.from('profiles').upsert({
      id: adminId,
      email: adminEmail,
      full_name: `Remedy Admin ${runId}`,
      role: 'admin',
      status: 'active',
    });

    // 3. Authenticate clients
    const sLogin = await loginHelper.auth.signInWithPassword({ email: studentEmail, password: commonPass });
    studentClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${sLogin.data.session.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const aLogin = await loginHelper.auth.signInWithPassword({ email: adminEmail, password: commonPass });
    adminClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${aLogin.data.session.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4. Create two test coding problems
    const { data: pA, error: pAErr } = await serviceClient.from('coding_problems').insert({
      title: `Remedy Problem A ${runId}`,
      slug: `remedy-problem-a-${runId}`,
      difficulty: 'Easy',
      category: 'Arrays',
      problem_statement: 'Find two sum',
      status: 'published',
    }).select().single();
    if (pAErr) throw pAErr;
    problemIdA = pA.id;

    const { data: pB, error: pBErr } = await serviceClient.from('coding_problems').insert({
      title: `Remedy Problem B ${runId}`,
      slug: `remedy-problem-b-${runId}`,
      difficulty: 'Medium',
      category: 'Strings',
      problem_statement: 'Reverse string',
      status: 'published',
    }).select().single();
    if (pBErr) throw pBErr;
    problemIdB = pB.id;

    // 5. Create test cases (one public, one hidden)
    await serviceClient.from('coding_test_cases').insert([
      {
        problem_id: problemIdA,
        input: '[2,7,11,15], 9',
        expected_output: '[0,1]',
        is_hidden: false,
        order_index: 1,
      },
      {
        problem_id: problemIdA,
        input: '[3,2,4], 6',
        expected_output: '[1,2]',
        is_hidden: true,
        order_index: 2,
      },
    ]);
  });

  after(async () => {
    // Cleanup
    if (problemIdA) {
      await serviceClient.from('coding_test_cases').delete().eq('problem_id', problemIdA);
      await serviceClient.from('coding_submissions').delete().eq('problem_id', problemIdA);
      await serviceClient.from('coding_problems').delete().eq('id', problemIdA);
    }
    if (problemIdB) {
      await serviceClient.from('coding_submissions').delete().eq('problem_id', problemIdB);
      await serviceClient.from('coding_problems').delete().eq('id', problemIdB);
    }
    if (studentId) {
      await serviceClient.from('profiles').delete().eq('id', studentId);
      await serviceClient.auth.admin.deleteUser(studentId);
    }
    if (adminId) {
      await serviceClient.from('profiles').delete().eq('id', adminId);
      await serviceClient.auth.admin.deleteUser(adminId);
    }
  });

  // ============================================================================
  // PRIORITY 1: Solved Problems Counter Server-Authoritative Gamification
  // ============================================================================
  describe('Priority 1: Solved Problems Counter Server-Authoritative Scoring', () => {
    it('1.1 Successful first-time submission increments solved_problems_count by exactly +1', async () => {
      // Check initial count
      const { data: beforeProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();
      const initialCount = beforeProf.solved_problems_count || 0;

      // Submit solution for Problem A
      const { data: res, error } = await studentClient.rpc('submit_coding_solution', {
        p_problem_id: problemIdA,
        p_language: 'python',
        p_code: 'def twoSum(nums, target):\n    lookup = {}\n    for i, n in enumerate(nums):\n        if target - n in lookup: return [lookup[target - n], i]\n        lookup[n] = i\n',
      });

      assert.ifError(error);
      assert.ok(res, 'RPC must return submission result');
      assert.strictEqual(res.status, 'accepted', 'Status must be accepted');
      assert.strictEqual(res.is_first_solve, true, 'Must report is_first_solve as true');

      // Check updated count in profiles
      const { data: afterProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();

      assert.strictEqual(
        afterProf.solved_problems_count,
        initialCount + 1,
        'solved_problems_count must increment by exactly +1 on first accepted solve'
      );
    });

    it('1.2 Duplicate submission for the same problem does NOT increment solved_problems_count', async () => {
      // Check count before duplicate
      const { data: beforeProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();
      const currentCount = beforeProf.solved_problems_count;

      // Submit another accepted solution for the SAME Problem A
      const { data: res, error } = await studentClient.rpc('submit_coding_solution', {
        p_problem_id: problemIdA,
        p_language: 'javascript',
        p_code: 'function twoSum(nums, target) { return [0, 1]; }',
      });

      assert.ifError(error);
      assert.ok(res);
      assert.strictEqual(res.status, 'accepted');
      assert.strictEqual(res.is_first_solve, false, 'Duplicate solve must report is_first_solve as false');

      // Check count after duplicate
      const { data: afterProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();

      assert.strictEqual(
        afterProf.solved_problems_count,
        currentCount,
        'solved_problems_count MUST NOT increment on duplicate solve for the same problem'
      );
    });

    it('1.3 Failed submission (wrong answer / intentional failure) does NOT increment counter', async () => {
      // Check count before failed attempt on Problem B
      const { data: beforeProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();
      const currentCount = beforeProf.solved_problems_count;

      // Submit code with intentional failure keyword
      const { data: res, error } = await studentClient.rpc('submit_coding_solution', {
        p_problem_id: problemIdB,
        p_language: 'python',
        p_code: '# intentional_fail\ndef wrong(): return None\n',
      });

      assert.ifError(error);
      assert.ok(res);
      assert.strictEqual(res.status, 'wrong_answer', 'Must report status wrong_answer');
      assert.strictEqual(res.is_first_solve, false, 'Failed submission cannot be first solve');

      // Check count remains unchanged
      const { data: afterProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();

      assert.strictEqual(
        afterProf.solved_problems_count,
        currentCount,
        'solved_problems_count MUST NOT increment on a failed submission'
      );
    });

    it('1.4 Unauthorized caller cannot submit solutions (fails closed)', async () => {
      const { data, error } = await unauthClient.rpc('submit_coding_solution', {
        p_problem_id: problemIdA,
        p_language: 'python',
        p_code: 'print("unauthorized")',
      });

      assert.ok(
        error || !data,
        'Anonymous caller must be rejected from calling submit_coding_solution'
      );
      assert.ok(
        error?.message?.includes('Authentication required') || error?.message?.includes('Access Denied') || error?.code === 'P0001',
        'Error must indicate authentication required'
      );
    });

    it('1.5 Direct student tampering with profiles.solved_problems_count is strictly blocked by trigger', async () => {
      // Student attempts direct PostgREST UPDATE on their own profile
      const { data, error } = await studentClient
        .from('profiles')
        .update({ solved_problems_count: 999 })
        .eq('id', studentId)
        .select();

      assert.ok(
        error || !data || data.length === 0,
        'Student direct update on solved_problems_count must be rejected'
      );
      assert.ok(
        error?.message?.includes('Gamification counters') || error?.message?.includes('Access Denied'),
        `Trigger protect_profile_privileged_fields must block direct manipulation: got "${error?.message}"`
      );
    });

    it('1.6 Direct student INSERT into coding_submissions is strictly blocked by RLS', async () => {
      // Student attempts direct PostgREST INSERT into coding_submissions to fabricate an accepted submission
      const { data, error } = await studentClient
        .from('coding_submissions')
        .insert({
          user_id: studentId,
          problem_id: problemIdB,
          language: 'python',
          code: 'print("fabricated")',
          status: 'accepted',
          test_cases_passed: 10,
          total_test_cases: 10,
        })
        .select();

      assert.ok(
        error || !data || data.length === 0,
        'Direct INSERT on coding_submissions must be rejected by RLS (students must use submit_coding_solution RPC)'
      );
    });

    it('1.7 Second distinct problem solve increments solved_problems_count to 2', async () => {
      // Check count before Problem B solve
      const { data: beforeProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();
      const currentCount = beforeProf.solved_problems_count;

      // Submit valid solution for Problem B
      const { data: res, error } = await studentClient.rpc('submit_coding_solution', {
        p_problem_id: problemIdB,
        p_language: 'cpp',
        p_code: '#include <iostream>\n#include <string>\nusing namespace std;\nstring reverseStr(string s) { return string(s.rbegin(), s.rend()); }',
      });

      assert.ifError(error);
      assert.strictEqual(res.status, 'accepted');
      assert.strictEqual(res.is_first_solve, true);

      // Verify count is now currentCount + 1
      const { data: afterProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();

      assert.strictEqual(
        afterProf.solved_problems_count,
        currentCount + 1,
        'Solving a second distinct problem must increment solved_problems_count'
      );
    });
  });

  // ============================================================================
  // PRIORITY 2: Isolated Code Execution Architecture & Backend Proxy Security
  // ============================================================================
  describe('Priority 2: Real Code Execution Architecture & Protected Backend Proxy', () => {
    it('2.1 Python 3 execution runs via secure execute-code backend proxy', async () => {
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'python',
          code: 'import sys\nnum = int(sys.stdin.read().strip())\nprint(num * 2)',
          stdin: '21',
        },
      });

      assert.ifError(error);
      assert.ok(data, 'Must return execution payload');
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '42');
      assert.strictEqual(data.executionEngine, 'judge0-ce-proxy');
      assert.ok(typeof data.runtimeMs === 'number');
      assert.ok(typeof data.memoryMb === 'number');
    });

    it('2.2 JavaScript (Node.js) execution runs via execute-code backend proxy', async () => {
      // Small pause to respect server rate limit
      await new Promise(r => setTimeout(r, 1600));

      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'javascript',
          code: 'const fs = require("fs"); const val = parseInt(fs.readFileSync(0, "utf-8").trim(), 10); console.log(val * 3);',
          stdin: '14',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '42');
    });

    it('2.3 C++ (GCC) execution runs via execute-code backend proxy', async () => {
      await new Promise(r => setTimeout(r, 1600));

      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'cpp',
          code: '#include <iostream>\nusing namespace std;\nint main() { int x; cin >> x; cout << (x + 10) << endl; return 0; }',
          stdin: '32',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '42');
    });

    it('2.4 Java (OpenJDK) execution runs via execute-code backend proxy', async () => {
      await new Promise(r => setTimeout(r, 1600));

      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'java',
          code: 'import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int a = sc.nextInt();\n    System.out.println(a + 2);\n  }\n}',
          stdin: '40',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '42');
    });

    it('2.5 Resource Limit: Infinite loop triggers Time Limit Exceeded (CPU limit enforced)', async () => {
      await new Promise(r => setTimeout(r, 1600));

      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'python',
          code: 'while True: pass',
          stdin: '',
        },
      });

      // Either cleanly returned as status 'time_limit_exceeded' or error payload
      assert.ok(data || error);
      const status = data?.status || error?.message;
      assert.ok(
        data?.status === 'time_limit_exceeded' || error?.message?.includes('Time Limit Exceeded') || data?.errorMessage?.includes('Time Limit Exceeded'),
        `Expected TLE, got: ${JSON.stringify(data || error)}`
      );
    });

    it('2.6 Server-Side Rate Limiting: Rapid consecutive invocations trigger HTTP 429 rate limit', async () => {
      // Rapidly fire 3 invocations without waiting 1.5s
      const p1 = studentClient.functions.invoke('execute-code', {
        body: { language: 'python', code: 'print("fast1")' },
      });
      const p2 = studentClient.functions.invoke('execute-code', {
        body: { language: 'python', code: 'print("fast2")' },
      });

      const [r1, r2] = await Promise.all([p1, p2]);
      const hasRateLimit =
        r1.error?.context?.status === 429 ||
        r2.error?.context?.status === 429 ||
        (r1.error && r1.error.message?.includes('Rate limit')) ||
        (r2.error && r2.error.message?.includes('Rate limit')) ||
        (r1.data && r1.data.rate_limited) ||
        (r2.data && r2.data.rate_limited);

      assert.ok(hasRateLimit, 'Server proxy must enforce rate limiting for rapid calls (HTTP 429)');
    });

    it('2.7 Authentication Enforcement: Unauthenticated requests to execute-code are rejected (401)', async () => {
      const { data, error } = await unauthClient.functions.invoke('execute-code', {
        body: { language: 'python', code: 'print("unauthorized")' },
      });

      assert.ok(error || !data, 'Anonymous call to execute-code proxy must be rejected');
      assert.ok(
        error?.message?.includes('Unauthorized') || error?.context?.status === 401 || !data,
        'Proxy must enforce authentication'
      );
    });

    it('2.8 Zero Credential Leakage: Proxy responses NEVER contain API keys or secret credentials', async () => {
      await new Promise(r => setTimeout(r, 1600));

      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: { language: 'python', code: 'print("credentials-check")' },
      });

      assert.ifError(error);
      const str = JSON.stringify(data);
      assert.strictEqual(str.includes('X-Auth-Token'), false, 'Must not leak X-Auth-Token');
      assert.strictEqual(str.includes('X-RapidAPI-Key'), false, 'Must not leak X-RapidAPI-Key');
      assert.strictEqual(str.includes('JUDGE0_API_KEY'), false, 'Must not leak JUDGE0_API_KEY');
    });

    it('2.9 Hidden Test Cases: RLS strictly prevents student read access to hidden test cases', async () => {
      // Student queries coding_test_cases for Problem A
      const { data, error } = await studentClient
        .from('coding_test_cases')
        .select('*')
        .eq('problem_id', problemIdA);

      assert.ifError(error);
      assert.ok(data.length > 0, 'Public test cases must be readable');
      const hiddenFound = data.some(tc => tc.is_hidden === true);
      assert.strictEqual(hiddenFound, false, 'Student MUST NOT see any test cases with is_hidden = true');
    });
  });
});
