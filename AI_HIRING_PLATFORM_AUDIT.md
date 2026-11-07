# Comprehensive Technical Audit: Ai-Hiring Platform Coding Engine

**Target System:** `Code sample/Ai-Hiring platform`  
**Audit Date:** November 7, 2026  
**Auditor:** Yogneet Edu Senior Systems & Security Architecture Team  
**Evaluation Scope:** Code Editor, Compiler Integration, Sandbox Isolation, Evaluator Pipeline, Security Boundaries, Database Contracts, and Reusable Assets.

---

## 1. Executive Summary

A comprehensive forensic audit was conducted on the LeetCode-style coding platform located at `Code sample/Ai-Hiring platform`. While the project features an aesthetically pleasing dark-theme user interface based on `@monaco-editor/react`, **the underlying execution engine possesses critical architectural defects and severe remote code execution (RCE) vulnerabilities** that render it completely unacceptable for production use in its current form.

The engine executes untrusted user-submitted code directly on the host operating system via Node.js `child_process.spawn` with zero sandboxing, no memory boundaries, no CPU limits, and no process isolation. Furthermore, the test-case evaluation pipeline destroys multi-line input by stripping newlines, case-folds output via `.toLowerCase()`, leaks hidden test-case inputs and outputs directly to the client browser, and relies on client-authoritative `localStorage` for scoring.

---

## 2. Comprehensive 16-Point Analysis

### 2.1 Code Editor Implementation
* **Library:** `@monaco-editor/react` (v4.7.0).
* **Implementation:** `client/src/app/coding/page.tsx` line 347:
  ```tsx
  <Editor height="65vh" language={language} value={code} onChange={(v)=>setCode(v || "")} theme="vs-dark"/>
  ```
* **Evaluation:** Monaco Editor provides an authentic VS Code editing experience with syntax highlighting, line numbers, and basic keybindings. However, it lacks advanced configuration: no disabled minimap, no custom font configuration, no automatic layout resizing, no diagnostics/linter hookups, and no tab-size customizations.

### 2.2 Supported Programming Languages
* **Languages:** Python, JavaScript, C++, Java.
* **Implementation:** Hardcoded string union `"python" | "javascript" | "java" | "cpp"` with basic starter templates in `client/src/app/coding/page.tsx` (lines 29–74).
* **Evaluation:** Language selection changes local state and resets the editor value to a predefined template. It lacks version pinning (e.g. Node 18+, Python 3.10+, GCC 11, OpenJDK 17).

### 2.3 Compiler and Runtime Integration
* **Host Direct CLI:** `server/server.js` (lines 87–107 and lines 148–168).
* **Mechanisms:**
  - **Python:** `spawn("python", [fileName])`
  - **Node.js:** `spawn("node", [fileName])`
  - **C++:** `spawn("g++", [fileName, "-o", exeName])` followed by `spawn(exeName)`
  - **Java:** `spawn("javac", ["Main.java"])` followed by `spawn("java", ["Main"])`
* **Defect:** Relies on whatever CLI binaries are ambiently present in the server's PATH. If `g++` or `javac` is not installed on the host, requests crash with unhandled ENOENT errors.

### 2.4 Execution Sandbox Architecture
* **Isolation Level:** **NONE (0% Isolation).**
* **Finding:** Untrusted student code is written to temporary files on the host disk and spawned directly as native OS child processes under the privileges of the Node.js daemon. There are no Docker containers, no Linux cgroups, no namespaces, no `chroot`, no `seccomp` filters, and no network jail.

### 2.5 Sample Test-Case Execution
* **API:** `POST /api/assessment/run-code` in `server/server.js` (lines 76–127).
* **Lifecycle:** Receives `{ code, language, input }`, formats code with basic wrappers, spawns process, writes input to `stdin`, collects `stdout` and `stderr`, and responds with `{ output: output.trim() }`.

### 2.6 Hidden Test-Case Execution
* **Status:** **NON-EXISTENT.**
* **Finding:** The platform has no concept of private/hidden test cases. In `POST /api/assessment/submit-code`, the server retrieves question test cases from `questions.js` (typically 2 cases) and returns the full input, expected output, and actual output for every test case directly in the HTTP response JSON (lines 182–196):
  ```javascript
  results.push({
    input: testCase.input,
    expected: testCase.expected,
    output: output.trim(),
    passed: clean(output) === clean(testCase.expected)
  });
  ```
  Students can inspect the network response and view all test cases immediately.

### 2.7 Custom Input Support
* **Frontend:** A raw `<textarea>` in `client/src/app/coding/page.tsx` line 350.
* **Critical Flaw:** In `server/server.js` line 71:
  ```javascript
  const formatInput = (input) => {
    if (!input) return ""
    return input.replace(/\n/g, " ").trim()
  }
  ```
  **Newline Destruction:** It systematically replaces all newline characters (`\n`) with spaces. This completely breaks any multi-line input format (e.g. matrices, arrays on subsequent lines, graphs, or multi-line strings).

### 2.8 Input/Output Parsing and Normalization
* **Normalization Logic:** `server/server.js` line 69:
  ```javascript
  const clean = (value) => value.trim().toLowerCase().replace(/\s+/g, " ")
  ```
* **Evaluation:**
  - Forces lowercase (`.toLowerCase()`), rendering case-sensitive problem verification impossible.
  - Collapses all whitespace into a single space (`replace(/\s+/g, " ")`), destroying structured output (such as indented code, ASCII diagrams, formatted tables, or multiline outputs).

### 2.9 Expected-Output Comparison
* **Comparison Rule:** `clean(output) === clean(testCase.expected)`.
* **Evaluation:** This comparison is overly permissive and fragile. A student program that prints `"HELLO   WORLD"` matches expected output `"hello world"`. Conversely, questions expecting exact casing or multiple output lines fail unpredictably due to aggressive normalization.

### 2.10 Time and Memory Limits
* **Time Limit:** Hardcoded `setTimeout(() => process.kill(), 3000)` (3.0 seconds).
  - Does not distinguish between CPU time and wall-clock time.
  - Process killing via `process.kill()` does not kill orphaned child processes spawned by malicious scripts.
* **Memory Limit:** None. A student script allocating arrays in an infinite loop can trigger host Out-Of-Memory (OOM) crashes.
* **Process Limit:** None. Vulnerable to fork bombs (`:(){ :|:& };:` in bash or infinite subprocess spawning in Python).

### 2.11 Compilation Errors and Runtime Error Handling
* **C++ Compilation Flaw:**
  ```javascript
  const compile = spawn("g++", [fileName, "-o", exeName])
  await new Promise((resolve) => compile.on("close", resolve))
  process = spawn(exeName)
  ```
  The compiler's exit code is never checked! If `g++` compilation fails, `exeName` is never created. Spawning a non-existent binary causes an unhandled exception or crash.
* **Java Concurrency Collision:**
  ```javascript
  fs.writeFileSync("Main.java", finalCode)
  const compile = spawn("javac", ["Main.java"])
  ```
  The file name is statically hardcoded as `"Main.java"` in the server's root directory. If two students run Java code at the same time, their files overwrite each other, causing race condition compilation collisions.
* **Runtime Errors:** `stderr` is simply concatenated into `output`:
  ```javascript
  process.stdout.on("data", (data) => (output += data.toString()))
  process.stderr.on("data", (data) => (output += data.toString()))
  ```
  Python tracebacks and runtime exceptions are presented as the student's output and compared against expected test results.

### 2.12 Submission Evaluation and Scoring
* **Evaluation:** Server counts passed cases in memory: `passed = results.filter(r => r.passed).length`.
* **Scoring Flaw:** The server does not store submissions or user progress. Scoring is client-authoritative in `client/src/app/coding/page.tsx` (lines 226–230):
  ```javascript
  localStorage.setItem("codingResult", JSON.stringify({
    status,
    solved,
    skipped
  }));
  ```
  No verified submission record is stored in a database. Any user can edit their `localStorage` to claim 100% completion.

### 2.13 Backend APIs and Database Dependencies
* **Data Source:** In-memory static array in `server/questions.js` (10 hardcoded questions).
* **Database Tables:** Zero database tables for coding questions, test cases, or submissions.
* **Endpoints:**
  - `GET /api/assessment/questions` (returns 3 randomly sorted questions)
  - `POST /api/assessment/run-code`
  - `POST /api/assessment/submit-code`

### 2.14 Authentication and Authorization Requirements
* **Auth Check:** Middleware `requireAuth` in `server/middleware/authMiddleware.js` verifies Supabase JWT.
* **Defect:** No role-based access control (RBAC), no rate limiting, no permission checks, and no student-versus-admin boundary.

### 2.15 Security Vulnerabilities & Execution Isolation
* **CRITICAL RCE:** Any authenticated student can execute arbitrary shell commands on the server:
  - Python: `import os; os.system("cat /etc/passwd")` or `os.system("del C:\\Windows")`.
  - Node.js: `require('child_process').execSync('type .env')`.
* **Credential Theft:** An attacker can read `.env`, stealing the `SUPABASE_SERVICE_ROLE_KEY`, database connection strings, and AI API keys (`GROQ_API_KEY`).
* **Host Takeover:** Full access to the host network stack allows lateral movement, DDoS attacks, or cryptocurrency mining.

### 2.16 Existing Reusable Components and Services
* **Reusable Assets:**
  - Monaco Editor wrapper configuration (`@monaco-editor/react`).
  - Dark theme UI layout patterns and styling.
  - Multi-question navigation bar concept (circle indicators).
* **Rejected Assets:**
  - The entire backend execution pipeline (`server/server.js`).
  - Hardcoded `questions.js`.
  - Normalization helpers (`clean`, `formatInput`).
  - Client-side `localStorage` scoring.

---

## 3. End-to-End Execution Lifecycle Trace

```text
[User Types in Monaco Editor]
         │
         ▼
[Click "Run Code" / "Run Testcases"]
         │
         ▼ (HTTP POST with JWT)
[Express Server: /api/assessment/run-code]
         │
         ├─► wrapCode(code, language)
         │     (Prepends <bits/stdc++.h> or wraps Main class)
         │
         ├─► formatInput(input)
         │     (Destructive: replaces all \n with " ")
         │
         ├─► fs.writeFileSync("temp_<timestamp>.<ext>")
         │     (Writes file directly to server root disk)
         │
         ├─► child_process.spawn(runtime, [file])
         │     (Direct host execution without container/sandbox)
         │
         ├─► setTimeout(3000, kill)
         │     (Wall-clock timer kill)
         │
         ├─► Output Collection
         │     (Concatenates stdout + stderr)
         │
         ├─► fs.unlinkSync(tempFile)
         │
         ▼
[Test Case Evaluator: clean(output) === clean(expected)]
         │
         ▼ (Returns results, input, expected, and output in JSON)
[Client Browser]
         │
         ├─► Renders test case list in right sidebar
         ├─► Computes passed count in React state
         └─► Saves { status, solved, skipped } to window.localStorage
```

---

## 4. Reusable Component Classification

| Component / Subsystem | Location | Classification | Justification |
|---|---|---|---|
| Monaco Editor UI | `client/src/app/coding/page.tsx` | **READY TO REUSE** | Excellent base for code editing; can be wrapped in a dedicated React component. |
| UI Question Circles | `client/src/app/coding/page.tsx` | **REUSE AFTER MODIFICATION** | Good visual cue for multi-problem assessments, but needs integration with Supabase problem state. |
| Language Selector & Templates | `client/src/app/coding/page.tsx` | **REUSE AFTER MODIFICATION** | Good boilerplate structure; needs alignment with Judge0 templates and function harnesses. |
| `wrapCode` Utility | `server/server.js` | **DO NOT REUSE** | Fragile text interpolation without AST validation; causes compile errors. |
| `formatInput` Utility | `server/server.js` | **DO NOT REUSE** | Destroys newline structure in multiline inputs. |
| `clean` Output Normalizer | `server/server.js` | **DO NOT REUSE** | Aggressive lowercase conversion and space flattening breaks test validity. |
| Local Execution Pipeline | `server/server.js` | **DO NOT REUSE** | Critical RCE security vulnerability; lacks sandbox, memory limits, and process controls. |
| `questions.js` Static Array | `server/questions.js` | **DO NOT REUSE** | In-memory mock data; must be managed via Supabase PostgreSQL tables and RLS. |
| `localStorage` Scoring | `client/src/app/coding/page.tsx` | **DO NOT REUSE** | Insecure client-side grading; submissions must be server-authoritative. |

---

## 5. Audit Conclusion

The Ai-Hiring Platform contains **zero production-grade execution or evaluation infrastructure**. Under no circumstances should its backend execution code be deployed in Yogneet Edu.

However, its use of `@monaco-editor/react` and its split-screen UI layout provide valuable inspiration for upgrading Yogneet Edu's student coding experience from a plain `<textarea>` to a professional competitive programming IDE.
