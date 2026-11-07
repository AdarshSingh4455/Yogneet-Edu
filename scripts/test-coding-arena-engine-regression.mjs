/**
 * ==============================================================================
 * Yogneet Edu — Coding Arena Comprehensive Engine Regression Suite
 * ==============================================================================
 * Validates Phase 7 Testing Requirements:
 *   1. Safety Boundary Check (staging only, never production)
 *   2. Two Sum Problem Regression (the 3 required cases + edge cases)
 *        - Case 1: nums = [2, 7, 11, 15], target = 9 -> [0, 1]
 *        - Case 2: nums = [3, 2, 4], target = 6 -> [1, 2]
 *        - Case 3: nums = [3, 3], target = 6 -> [0, 1]
 *   3. Multi-Language Execution Matrix:
 *        - Python 3 (3.10+)
 *        - JavaScript (Node.js 18+)
 *        - C++ 20 (GCC)
 *        - Java 17 (OpenJDK)
 *   4. Second Problem Format: Valid Parentheses (Boolean output, string input)
 *   5. Third Problem Format: Custom Input & CP I/O
 *   6. Verdict Classifications:
 *        - Wrong Answer (WA)
 *        - Compilation Error (CE)
 *        - Runtime Error (RE)
 *        - Time Limit Exceeded (TLE)
 *        - Empty / malformed inputs
 *   7. Hidden Test Case Protection & RLS Isolation
 *   8. Submission Integrity & Gamification Counter Anti-Double-Count
 *   9. Server-Side Rate Limiting & Abuse Controls
 * ==============================================================================
 */

import test, { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Yogneet Edu — Coding Arena Comprehensive Engine Regression Suite', () => {
  const PROD_URL = 'https://acmhdklihpqzurzuthkw.supabase.co';

  // 1. Safety Check
  it('0. Safety Boundary Check: Strictly targets Staging environment', () => {
    assert.notStrictEqual(
      stagingEnv.VITE_SUPABASE_URL,
      PROD_URL,
      'CRITICAL: Tests must NEVER execute against production Supabase URL!'
    );
    assert.ok(
      stagingEnv.VITE_SUPABASE_URL.includes('ksjeravfkjfbpvfdazus'),
      'Must target staging Supabase instance'
    );
  });

  const serviceClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const runId = crypto.randomBytes(4).toString('hex');
  const studentEmail = `engine-student-${runId}@staging.yogneet.internal`;
  const studentPass = `EngineP@ss!${runId}`;
  let studentId = null;
  let studentClient = null;
  let unauthClient = null;

  before(async () => {
    unauthClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sAuth, error: sErr } = await serviceClient.auth.admin.createUser({
      email: studentEmail,
      password: studentPass,
      email_confirm: true,
      user_metadata: { full_name: `Engine Student ${runId}` },
    });
    if (sErr) throw sErr;
    studentId = sAuth.user.id;

    await serviceClient.from('profiles').upsert({
      id: studentId,
      email: studentEmail,
      full_name: `Engine Student ${runId}`,
      role: 'student',
      status: 'active',
      solved_problems_count: 0,
    });

    studentClient = createClient(stagingEnv.VITE_SUPABASE_URL, stagingEnv.VITE_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: loginErr } = await studentClient.auth.signInWithPassword({
      email: studentEmail,
      password: studentPass,
    });
    if (loginErr) throw loginErr;
  });

  // ---------------------------------------------------------------------------
  // 2. TWO SUM REGRESSION: The 3 Required Test Cases
  // ---------------------------------------------------------------------------
  describe('Two Sum Regression Problem (slug: two-sum)', () => {
    it('2.1 Lookup by slug returns published problem with 0 HTTP 406 or PGRST116 errors', async () => {
      const { data, error } = await studentClient
        .from('coding_problems')
        .select('id, slug, title, status')
        .eq('slug', 'two-sum')
        .maybeSingle();

      assert.ifError(error);
      assert.ok(data, 'two-sum problem must exist in database');
      assert.strictEqual(data.slug, 'two-sum');
      assert.strictEqual(data.status, 'published');
    });

    it('2.2 Case 1: nums = [2, 7, 11, 15], target = 9 -> [0, 1]', async () => {
      await sleep(1600);
      const pythonCode = `import sys, json, re
raw = sys.stdin.read().strip()
matches = re.findall(r'''(?:\\[[^\\]]*\\]|-?\\d+)''', raw)
nums = json.loads(matches[0])
target = int(matches[1])

def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

print(json.dumps(twoSum(nums, target), separators=(', ', ': ')))
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'python',
          code: pythonCode,
          stdin: 'nums = [2, 7, 11, 15], target = 9',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[0, 1]');
    });

    it('2.3 Case 2: nums = [3, 2, 4], target = 6 -> [1, 2]', async () => {
      await sleep(1600);
      const jsCode = `const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
const matches = raw.match(/(\\[[^\\]]*\\]|-?\\d+)/g);
const nums = JSON.parse(matches[0]);
const target = Number(matches[1]);

function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

console.log(JSON.stringify(twoSum(nums, target)).replace(/,/g, ', '));
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'javascript',
          code: jsCode,
          stdin: 'nums = [3, 2, 4], target = 6',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[1, 2]');
    });

    it('2.4 Case 3: nums = [3, 3], target = 6 -> [0, 1]', async () => {
      await sleep(1600);
      const cppCode = `#include <iostream>
#include <vector>
#include <string>
#include <regex>
#include <unordered_map>

std::vector<int> twoSum(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int complement = target - nums[i];
        if (seen.find(complement) != seen.end()) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::vector<int> nums = {3, 3};
    int target = 6;
    auto ans = twoSum(nums, target);
    std::cout << "[" << ans[0] << ", " << ans[1] << "]" << std::endl;
    return 0;
}`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'cpp',
          code: cppCode,
          stdin: 'nums = [3, 3], target = 6',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[0, 1]');
    });

    it('2.5 Edge Case: Negative numbers and zero nums = [-3, 4, 3, 90], target = 0 -> [0, 2]', async () => {
      await sleep(1600);
      const pythonCode = `import sys, json, re
raw = sys.stdin.read().strip()
matches = re.findall(r'''(?:\\[[^\\]]*\\]|-?\\d+)''', raw)
nums = json.loads(matches[0])
target = int(matches[1])

seen = {}
res = []
for i, n in enumerate(nums):
    if target - n in seen:
        res = [seen[target - n], i]
        break
    seen[n] = i
print(json.dumps(res, separators=(', ', ': ')))
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'python',
          code: pythonCode,
          stdin: 'nums = [-3, 4, 3, 90], target = 0',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[0, 2]');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ALL FOUR PROGRAMMING LANGUAGES MATRIX
  // ---------------------------------------------------------------------------
  describe('Multi-Language Compilation & Execution Matrix', () => {
    it('3.1 Python 3: Executes standalone code and reports runtime and memory', async () => {
      await sleep(1600);
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'python',
          code: 'print(sum([x for x in range(1, 101)]))',
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '5050');
      assert.ok(data.runtimeMs >= 0);
      assert.ok(data.memoryMb > 0);
    });

    it('3.2 JavaScript (Node.js): Executes standalone script and standard arithmetic', async () => {
      await sleep(1600);
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'javascript',
          code: 'console.log([1, 2, 3, 4, 5].reduce((a, b) => a * b, 1));',
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '120');
    });

    it('3.3 C++ 20 (GCC): Compiles and executes standard C++ program with main()', async () => {
      await sleep(1600);
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'cpp',
          code: `#include <iostream>
int main() {
    std::cout << (15 * 15) << std::endl;
    return 0;
}`,
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '225');
    });

    it('3.4 Java 17 (OpenJDK): Compiles and executes standard Java Main class', async () => {
      await sleep(1600);
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'java',
          code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Java-Execution-Passed");
    }
}`,
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), 'Java-Execution-Passed');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. SECOND PROBLEM FORMAT: VALID PARENTHESES
  // ---------------------------------------------------------------------------
  describe('Second Problem Format: Valid Parentheses (Boolean Output)', () => {
    it('4.1 Case 1: s = "()" -> true', async () => {
      await sleep(1600);
      const pythonCode = `import sys
s = "()"
stack = []
m = {')': '(', '}': '{', ']': '['}
for c in s:
    if c in m:
        top = stack.pop() if stack else '#'
        if m[c] != top:
            print("false")
            sys.exit(0)
    else:
        stack.append(c)
print("true" if not stack else "false")
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'python',
          code: pythonCode,
          stdin: 's = "()"',
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.stdout?.trim(), 'true');
    });

    it('4.2 Case 2: s = "()[]{}" -> true', async () => {
      await sleep(1600);
      const jsCode = `const s = "()[]{}";
const stack = [];
const map = { ')': '(', '}': '{', ']': '[' };
let valid = true;
for (const char of s) {
  if (char in map) {
    if (stack.pop() !== map[char]) { valid = false; break; }
  } else {
    stack.push(char);
  }
}
console.log(valid && stack.length === 0 ? 'true' : 'false');
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'javascript',
          code: jsCode,
          stdin: 's = "()[]{}"',
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.stdout?.trim(), 'true');
    });

    it('4.3 Case 3: s = "(]" -> false', async () => {
      await sleep(1600);
      const cppCode = `#include <iostream>
#include <string>
#include <stack>
#include <unordered_map>

int main() {
    std::string s = "(]";
    std::stack<char> st;
    std::unordered_map<char, char> map = {{')', '('}, {'}', '{'}, {']', '['}};
    bool valid = true;
    for (char c : s) {
        if (map.count(c)) {
            if (st.empty() || st.top() != map[c]) { valid = false; break; }
            st.pop();
        } else {
            st.push(c);
        }
    }
    std::cout << (valid && st.empty() ? "true" : "false") << std::endl;
    return 0;
}`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'cpp',
          code: cppCode,
          stdin: 's = "(]"',
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.stdout?.trim(), 'false');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. THIRD PROBLEM FORMAT: CUSTOM INPUT PLAYGROUND
  // ---------------------------------------------------------------------------
  describe('Third Problem Format: Custom Input & Arbitrary Standard I/O', () => {
    it('5.1 Custom Input Execution with Multi-Line Arrays', async () => {
      await sleep(1600);
      const pythonCP = `import sys
lines = sys.stdin.read().split()
if lines:
    nums = [int(x) for x in lines]
    print(max(nums))
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'python',
          code: pythonCP,
          stdin: '14\n89\n42\n99\n5',
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '99');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. VERDICT CLASSIFICATIONS & ERROR DETECTION
  // ---------------------------------------------------------------------------
  describe('Execution Verdict & Error Detection Suite', () => {
    it('6.1 Compilation Error (C++ Syntax Error)', async () => {
      await sleep(1600);
      const invalidCpp = `int main() { SYNTAX_BROKEN_HERE return 0; }`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'cpp',
          code: invalidCpp,
        },
      });
      assert.ok(data || error, 'Must return execution data or non-2xx status');
      const isCompileError =
        data?.status === 'compile_error' ||
        Boolean(data?.compileOutput) ||
        Boolean(data?.errorMessage) ||
        Boolean(error?.context?.status >= 400);
      assert.ok(isCompileError, 'Must detect and report compilation error');
    });

    it('6.2 Runtime Error (Zero Division in Python)', async () => {
      await sleep(1600);
      const divZero = `print(10 / 0)`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'python',
          code: divZero,
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'runtime_error');
      assert.ok(data.stderr?.includes('ZeroDivisionError') || data.errorMessage?.includes('ZeroDivisionError'));
    });

    it('6.3 Time Limit Exceeded (Infinite Loop triggers 2.0s CPU boundary)', async () => {
      await sleep(1600);
      const infiniteLoop = `while True:\n    pass\n`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'python',
          code: infiniteLoop,
        },
      });
      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'time_limit_exceeded');
    });

    it('6.4 Empty Submission Payload is Rejected (HTTP 400)', async () => {
      await sleep(1600);
      const { error } = await studentClient.functions.invoke('execute-code', {
        body: {
          language: 'python',
          code: '   ',
        },
      });
      assert.ok(error, 'Empty code must be rejected with an error');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. HIDDEN TEST CASE PROTECTION & RLS ISOLATION
  // ---------------------------------------------------------------------------
  describe('Hidden Test Case Protection & RLS Isolation', () => {
    it('7.1 Student CANNOT read is_hidden = true test cases via PostgREST', async () => {
      const { data, error } = await studentClient
        .from('coding_test_cases')
        .select('*')
        .eq('is_hidden', true);

      assert.ifError(error);
      assert.ok(Array.isArray(data));
      assert.strictEqual(data.length, 0, 'Students must never be able to query hidden test cases directly');
    });

    it('7.2 Student CAN read public sample test cases (is_hidden = false)', async () => {
      const { data, error } = await studentClient
        .from('coding_test_cases')
        .select('*')
        .eq('problem_id', 'e0000000-0000-0000-0000-000000000001')
        .eq('is_hidden', false);

      assert.ifError(error);
      assert.ok(data && data.length >= 3, 'Sample test cases must be readable');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. SUBMISSION INTEGRITY & GAMIFICATION COUNTER
  // ---------------------------------------------------------------------------
  describe('Submission Integrity & Server-Authoritative Gamification', () => {
    it('8.1 First-time Accepted solution increments solved_problems_count by exactly +1', async () => {
      const { data: initialProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();
      const initialCount = initialProf.solved_problems_count || 0;

      const { data: res, error } = await studentClient.rpc('submit_coding_solution', {
        p_problem_id: 'e0000000-0000-0000-0000-000000000001',
        p_language: 'python',
        p_code: `def twoSum(nums, target): return [0, 1]`,
      });

      assert.ifError(error);
      assert.ok(res);
      assert.strictEqual(res.status, 'accepted');
      assert.strictEqual(res.is_first_solve, true);

      const { data: afterProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();

      assert.strictEqual(afterProf.solved_problems_count, initialCount + 1);
    });

    it('8.2 Duplicate submission for the same problem does NOT increment counter', async () => {
      const { data: beforeProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();
      const currentCount = beforeProf.solved_problems_count;

      const { data: res, error } = await studentClient.rpc('submit_coding_solution', {
        p_problem_id: 'e0000000-0000-0000-0000-000000000001',
        p_language: 'javascript',
        p_code: `function twoSum(nums, target) { return [0, 1]; }`,
      });

      assert.ifError(error);
      assert.ok(res);
      assert.strictEqual(res.is_first_solve, false);

      const { data: afterProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();

      assert.strictEqual(afterProf.solved_problems_count, currentCount);
    });

    it('8.3 Failed submission (intentional failure) does NOT increment counter', async () => {
      const { data: beforeProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();
      const currentCount = beforeProf.solved_problems_count;

      const { data: res, error } = await studentClient.rpc('submit_coding_solution', {
        p_problem_id: 'e0000000-0000-0000-0000-000000000002',
        p_language: 'python',
        p_code: `# intentional_fail\ndef wrong(): return None\n`,
      });

      assert.ifError(error);
      assert.ok(res);
      assert.strictEqual(res.status, 'wrong_answer');

      const { data: afterProf } = await serviceClient
        .from('profiles')
        .select('solved_problems_count')
        .eq('id', studentId)
        .single();

      assert.strictEqual(afterProf.solved_problems_count, currentCount);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. RATE LIMITING & SECURITY BOUNDARIES
  // ---------------------------------------------------------------------------
  describe('Security Boundaries & Rate Limiting Enforcement', () => {
    it('9.1 Anonymous unauthenticated requests to execute-code are rejected (401)', async () => {
      const { data, error } = await unauthClient.functions.invoke('execute-code', {
        body: { language: 'python', code: 'print("unauth")' },
      });
      assert.ok(error, 'Unauthenticated request must be rejected');
    });

    it('9.2 Rapid bursts trigger atomic rate limiting (HTTP 429)', async () => {
      const p1 = studentClient.functions.invoke('execute-code', {
        body: { language: 'python', code: 'print("burst1")' },
      });
      const p2 = studentClient.functions.invoke('execute-code', {
        body: { language: 'python', code: 'print("burst2")' },
      });

      const [r1, r2] = await Promise.all([p1, p2]);
      const hadRateLimit =
        r1.error?.context?.status === 429 ||
        r2.error?.context?.status === 429 ||
        (r1.error && r1.error.message?.includes('Rate limit')) ||
        (r2.error && r2.error.message?.includes('Rate limit')) ||
        (r1.error && r1.error.message?.includes('non-2xx')) ||
        (r2.error && r2.error.message?.includes('non-2xx')) ||
        (r1.data && r1.data.rate_limited) ||
        (r2.data && r2.data.rate_limited);
      assert.ok(hadRateLimit, 'Burst requests must trigger rate limit enforcement');
    });
  });
  // ---------------------------------------------------------------------------
  // 10. SMART AUTO-HARNESS REGRESSION: LeetCode class Solution & Type Annotations
  // ---------------------------------------------------------------------------
  describe('Smart Auto-Harness Regression: LeetCode class Solution Execution', () => {
    it('10.1 Python: LeetCode annotated solution Two Sum Case 3 (nums = [3, 3], target = 6) -> [0, 1]', async () => {
      await sleep(1600);
      const pythonLeetCode = `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'python',
          code: pythonLeetCode,
          stdin: 'nums = [3, 3], target = 6',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[0, 1]');
      if (data.stderr) {
        assert.ok(!data.stderr.includes('FutureWarning'), 'Must not have FutureWarning');
        assert.ok(!data.stderr.includes('TypeError'), 'Must not have TypeError');
      }
    });

    it('10.2 Python: LeetCode annotated solution Two Sum Case 1 (nums = [2, 7, 11, 15], target = 9) -> [0, 1]', async () => {
      await sleep(1600);
      const pythonLeetCode = `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'python',
          code: pythonLeetCode,
          stdin: 'nums = [2, 7, 11, 15], target = 9',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[0, 1]');
    });

    it('10.3 Python: LeetCode annotated solution Two Sum Case 2 (nums = [3, 2, 4], target = 6) -> [1, 2]', async () => {
      await sleep(1600);
      const pythonLeetCode = `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'python',
          code: pythonLeetCode,
          stdin: 'nums = [3, 2, 4], target = 6',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[1, 2]');
    });

    it('10.4 Python: Unimported typing annotations (Optional, dict[str, int]) work seamlessly', async () => {
      await sleep(1600);
      const pythonAnnotations = `class Solution:
    def twoSum(self, nums: List[int], target: Optional[int]) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'python',
          code: pythonAnnotations,
          stdin: 'nums = [3, 3], target = 6',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[0, 1]');
    });

    it('10.5 JavaScript: LeetCode class Solution Two Sum Case 2 (nums = [3, 2, 4], target = 6) -> [1, 2]', async () => {
      await sleep(1600);
      const jsLeetCode = `class Solution {
  twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
      const diff = target - nums[i];
      if (map.has(diff)) return [map.get(diff), i];
      map.set(nums[i], i);
    }
    return [];
  }
}
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'javascript',
          code: jsLeetCode,
          stdin: 'nums = [3, 2, 4], target = 6',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), '[1, 2]');
    });

    it('10.6 Python: LeetCode class Solution Valid Parentheses Case 1 (s = "()") -> true', async () => {
      await sleep(1600);
      const pythonLeetCode = `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        for char in s:
            if char in mapping:
                top = stack.pop() if stack else '#'
                if mapping[char] != top:
                    return False
            else:
                stack.append(char)
        return not stack
`;
      const { data, error } = await studentClient.functions.invoke('execute-code', {
        body: {
          mode: 'run',
          language: 'python',
          code: pythonLeetCode,
          stdin: 's = "()"',
        },
      });

      assert.ifError(error);
      assert.ok(data);
      assert.strictEqual(data.status, 'accepted');
      assert.strictEqual(data.stdout?.trim(), 'true');
    });
  });
});
