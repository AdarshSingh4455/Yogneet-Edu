# Architecture & Coding Engine Comparison: Ai-Hiring Platform vs. Yogneet Edu

**Comparative Technical Audit:** Evaluating `Code sample/Ai-Hiring platform` against `Yogneet Edu`  
**Date:** November 7, 2026  
**Auditor:** Yogneet Edu Core Engineering & Security Team  

---

## 1. Technical Criteria Comparison Matrix

The table below contrasts the technical implementation of both systems based on verified source code evidence:

| Criteria | Existing Ai-Hiring Platform | Yogneet Edu (Current) | Recommended Target Architecture |
|---|---|---|---|
| **Editor Quality** | **Monaco Editor** (`@monaco-editor/react` v4.7.0). Dark theme, line numbers, syntax highlighting. | **HTML `<textarea>`** (`CodingProblemPage.tsx`). No syntax highlighting, no line numbers, no autocomplete. | **Monaco Editor** configured with Phoenix dark theme, automatic layout, JetBrains Mono font, and language modes. |
| **Multi-Language Support** | 4 languages: Python, JavaScript, C++, Java. Hardcoded templates. | 4 languages: Python 3, JavaScript (Node 18), C++ 20 (GCC 9+), Java 17 (OpenJDK). Supported via Judge0 mapping. | Retain Yogneet Edu's 4 languages with auto-harness driver wrappers for both LeetCode and CP input formats. |
| **Compiler Reliability** | **Host CLI execution** via `spawn()`. Unchecked `g++` return codes; hardcoded `Main.java` collision. | **Judge0 CE Isolated Sandbox**. Standardized container compilers with structured stdout, stderr, and compileOutput. | **Judge0 CE** via secure backend Edge Function proxy with structured compile diagnostics. |
| **Sandbox Isolation** | **0% Isolation (Severe RCE Vulnerability)**. User code executes with full host daemon privileges. | **100% Isolated Sandbox**. Untrusted student code runs in isolated Judge0 containers. Zero host execution. | **100% Isolated Sandbox** (Judge0 CE). Host execution strictly prohibited. |
| **Test-Case Evaluation** | Permissive normalizer: lowercases text and collapses whitespace into single space. Leaks all tests to client. | Server-authoritative judging via Edge Function. Evaluates both public and hidden test cases sequentially. | **Deterministic Evaluator**: exact comparison with normalized newlines (`\r\n` -> `\n`) and trailing whitespace handling. |
| **Hidden Test Security** | **None**. All test cases and expected outputs are returned directly in the response payload. | **High Security**. Supabase RLS blocks student reads (`is_hidden = true`). Hidden tests judged strictly on server. | **High Security**. Supabase RLS + trusted server runtime judging. Never expose hidden test inputs or expected outputs. |
| **Time & Memory Limits** | Fixed 3.0s wall-clock timeout (`setTimeout`). **No memory limits, no process limits**. | **Strict Limits**: 2.0s CPU time, 5.0s Wall time, 256 MB RAM, max 64 processes/threads. Enforced by Judge0 cgroups. | **Strict Limits**: 2.0s CPU, 5.0s Wall, 256 MB RAM, max 64 processes/threads. Network access disabled (`enable_network: false`). |
| **Custom Input** | Basic textarea, but **destroys all newlines** via `input.replace(/\n/g, " ")`. | Not explicitly provided in problem page UI; only ran sample tests against `problem.examples`. | **Dedicated Custom Input Drawer**: allows arbitrary multiline inputs executed via isolated sandbox. |
| **Error Reporting** | Concatenates `stderr` into output; crashes on C++ compile failure. | UI had hardcoded fallback string `"Execution Error. Please check constraints."` masking real details. | **Detailed Diagnostic Console**: displays exact compile errors, runtime stack traces, and sample diffs cleanly. |
| **Scalability** | **Extremely Poor**. Host disk file writes (`temp_<ts>.py`), fixed `Main.java` race condition. | **High**. Stateless Supabase Edge Functions with connection pooling and async Judge0 queueing. | **High**. Edge Functions + rate-limited backend proxy + connection pooling. |
| **Security & Permissions** | Basic Supabase JWT verification on route. No role checks, no rate limits, client-authoritative scoring. | **Enterprise Security**. Multi-role RBAC (Admin, Sub-Admin, Student), atomic Postgres rate limiting, anti-spoofing triggers. | **Enterprise Security**. Full preservation of Yogneet Edu RBAC, atomic DB rate limits, and server-authoritative scoring. |
| **Integration Effort** | Low to moderate for frontend UI; backend cannot be reused. | Already integrated with Supabase, RLS, and test suites. Needs editor and Two Sum remediation. | **Selective Integration**: integrate Monaco Editor and UI patterns into Yogneet Edu; discard Ai-Hiring backend. |

---

## 2. In-Depth Root Cause Analysis: The Two Sum Issue

The prompt specifically requested an exhaustive investigation of the previously reported Two Sum issue:
1. Problem lookup returns HTTP 406.
2. Supabase error `PGRST116`.
3. Zero matching rows returned for slug `two-sum`.
4. Run Tests displays a generic execution error.

### 2.1 Cause 1: Problem Data Absence in Supabase Database
* **Finding:** While migration `20261104000025_revenue_engagement_platform_upgrade.sql` created the `public.coding_problems` and `public.coding_test_cases` tables, **no initial seed rows were ever inserted into the database**.
* **Verification:** Running an inspection query against Supabase confirmed:
  ```json
  "Problems in DB count: 0"
  "two-sum search result count: 0"
  ```
  The table was completely empty.

### 2.2 Cause 2: Database Query Uses `.single()` Instead of `.maybeSingle()`
* **Location:** `src/services/codingService.ts` lines 102–106:
  ```typescript
  const { data, error } = await (supabase as any)
    .from('coding_problems')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  ```
* **PostgREST Behavior:** When PostgREST queries a resource with `.single()`, it sets the HTTP Header `Accept: application/vnd.pgrst.object+json`. When zero rows match, PostgREST returns:
  - **HTTP Status:** `406 Not Acceptable`
  - **Error Code:** `PGRST116`
  - **Message:** `"JSON object requested, multiple (or no) rows returned"`
* **Consequence:** The query throws an exception, jumping to the catch block.

### 2.3 Cause 3: Strict Production Fallback Suppression (`isMockFallbackAllowed()`)
* **Location:** `src/services/codingService.ts` lines 160–163 and `src/services/supabaseClient.ts` lines 172–178:
  ```typescript
  if (isMockFallbackAllowed()) {
    return ApiService.getCodingProblemById(slug) || null;
  }
  return null;
  ```
* **Analysis:** In connected environments where `VITE_SUPABASE_URL` is set, `isMockFallbackAllowed()` returns `false` (enforcing strict production security against fabricated personas). As a result, `getProblemBySlug` returned `null`.
* In `CodingProblemPage.tsx` (lines 37–46), because `p` was `null`, `setProblem(p)` was never called. The page remained mounted on `initialProblem` retrieved from local mock storage (`id: 'prob_1'`).

### 2.4 Cause 4: UUID vs. String ID Type Collision in Supabase Backend
* **Database Schema:** `coding_problems.id` is a `UUID`, and `coding_test_cases.problem_id` is `UUID NOT NULL REFERENCES public.coding_problems(id)`.
* **Execution Failure:** When the student clicks "Submit Solution", `submitSolution` passes `problem.id` (`"prob_1"` from mock data) to the `execute-code` Edge Function.
* In `execute-code/index.ts` line 202:
  ```typescript
  .from('coding_test_cases')
  .select('id, input, expected_output, is_hidden, order_index')
  .eq('problem_id', problemId)
  ```
  PostgreSQL crashes with:
  ```text
  invalid input syntax for type uuid: "prob_1"
  ```
  The Edge Function fails with HTTP 500: `{"error": "Failed to retrieve problem test cases."}`.

### 2.5 Cause 5: Missing Driver Harness for LeetCode Method Signatures
* **Starter Code:** In `mockData.ts`, Two Sum provides:
  ```python
  class Solution:
      def twoSum(self, nums: list[int], target: int) -> list[int]:
          ...
  ```
* **Sandbox Execution Reality:** Judge0 executes standalone programs via standard I/O (`stdin` and `stdout`). It does not run Python reflection or test harnesses automatically.
* When Judge0 runs this code with `stdin: "nums = [2, 7, 11, 15], target = 9"`:
  - Python defines `class Solution` and terminates. `stdout` is empty (`""`).
  - C++ fails compilation (`undefined reference to 'main'`).
  - Java fails compilation (no `public static void main`).
* Without a language driver harness that parses input, instantiates `Solution`, invokes `twoSum`, and prints the result, the solution produces zero output.

### 2.6 Cause 6: Flawed Sample Test Evaluation Logic
* **Location:** `src/services/codeExecutionService.ts` line 317:
  ```typescript
  const passed = exec.status === 'accepted' && (actualTrimmed === expectedTrimmed || actualTrimmed.length > 0);
  ```
* **Flaw:** The clause `|| actualTrimmed.length > 0` allowed ANY code that printed ANY non-empty output to pass sample test cases! Conversely, if `exec.status` was `compile_error` (as occurred with C++ without `main`), `passed` was `false`.

### 2.7 Cause 7: Frontend Generic Error Masking
* **Location:** `src/pages/student/CodingProblemPage.tsx` lines 373–375:
  ```tsx
  ) : (
    <span className="text-rose-500">Execution Error. Please check constraints.</span>
  )
  ```
* **Flaw:** Even though the execution service populated `summary.details` or `firstFailed.errorMessage`, the UI discarded that information and rendered a hardcoded generic string.

---

## 3. Component Reusability Classification

| Component | Source Platform | Classification | Technical Rationale |
|---|---|---|---|
| `@monaco-editor/react` Integration | Ai-Hiring Platform | **READY TO REUSE** | Standard, reliable React binding for Monaco Editor. |
| Problem Tab & Circle Indicators | Ai-Hiring Platform | **REUSE AFTER MODIFICATION** | Clean UI concept; adapted for Yogneet Edu's difficulty and category filters. |
| Test Results Drawer Layout | Ai-Hiring Platform | **REUSE AFTER MODIFICATION** | Layout with per-test case cards adapted to show input, expected, output, and diff. |
| Starter Code Language Templates | Both Projects | **REUSE AFTER MODIFICATION** | Combined to support both competitive programming `main()` templates and LeetCode method harnesses. |
| Child Process Spawn Execution | Ai-Hiring Platform | **DO NOT REUSE** | Fatal security vulnerability (Remote Code Execution on server). |
| Newline-Stripping `formatInput` | Ai-Hiring Platform | **DO NOT REUSE** | Destroys multiline input formatting. |
| Case-Folding `clean()` Normalizer | Ai-Hiring Platform | **DO NOT REUSE** | Aggressive lowercase conversion invalidates test results. |
| `questions.js` Static Array | Ai-Hiring Platform | **DO NOT REUSE** | In-memory data; must be managed via Supabase PostgreSQL tables. |
| Client-Side `localStorage` Grading | Ai-Hiring Platform | **DO NOT REUSE** | Insecure; must be server-authoritative via database triggers and RPCs. |
| HTML `<textarea>` Editor | Yogneet Edu (Current) | **DO NOT REUSE** | Inferior developer experience; replaced with Monaco Editor. |

---

## 4. Remediation Strategy Summary

1. **Seed Problem Catalog:** Insert standard problems (Two Sum, Valid Parentheses, Reverse String) with valid UUIDs and both public and hidden test cases into Supabase via a dedicated migration.
2. **Graceful Querying:** Update `getProblemBySlug` to use `.maybeSingle()` and provide safe fallback without throwing HTTP 406.
3. **Smart Language Driver Harness:** Build an execution wrapper that automatically invokes `Solution` methods with parsed input when no `main` is present, allowing both LeetCode and CP solutions to run cleanly on Judge0.
4. **Fix Test-Case Evaluator:** Replace line 317 in `codeExecutionService.ts` with strict, deterministic comparison supporting line-ending normalization (`\r\n` vs `\n`).
5. **Modern Monaco Editor Component:** Create a professional `CodeEditor` component with dark theme, line numbers, and language modes.
6. **Transparent Diagnostic UI:** Upgrade `CodingProblemPage.tsx` with a multi-tab test runner drawer, custom input runner, and transparent compiler/runtime error reporting.
