# Coding Arena Architecture Decision: Hybrid Enterprise Engine

**Document Reference:** `CODING_ARENA_ARCHITECTURE_DECISION.md`  
**Status:** APPROVED FOR INTEGRATION  
**Decision Date:** November 7, 2026  
**Architectural Tier:** Production Grade Competitive Programming & Assessment Platform  

---

## 1. Options Evaluation

### Option A: Reuse Existing Ai-Hiring Platform Coding Engine
* **Verdict:** **REJECTED.**
* **Rationale:** The Ai-Hiring platform backend executes untrusted student code directly on the host operating system via Node.js `child_process.spawn`. This represents a critical Remote Code Execution (RCE) vulnerability that allows any user to compromise the host, extract environment secrets (`.env`), crash the server with fork bombs or memory leaks, and bypass all grading integrity. Adopting Option A would destroy Yogneet Edu's security posture.

### Option B: Retain Yogneet Edu's Current Architecture Without Upgrades
* **Verdict:** **REJECTED.**
* **Rationale:** While Yogneet Edu's backend security model (Judge0, Supabase RLS, atomic rate limiting, and server-authoritative gamification) is rock solid, the frontend coding experience uses a primitive HTML `<textarea>`. It lacks syntax highlighting, code folding, line numbers, autocomplete, and proper error/diff displays. Furthermore, it suffers from the unseeded database issue and the missing language harness for LeetCode-style method signatures.

### Option C: Design a Hybrid Architecture Combining the Best of Both Projects
* **Verdict:** **APPROVED (SELECTED ARCHITECTURE).**
* **Rationale:** Option C leverages the professional developer experience of Monaco Editor (`@monaco-editor/react`) and clean UI drawer patterns from the Ai-Hiring platform, while retaining Yogneet Edu's robust Judge0 container isolation, Supabase PostgreSQL schema, and server-authoritative submission verification. It bridges the gap by introducing an intelligent Language Driver Harness, a deterministic output comparison evaluator, custom input support, and seeded database problems.

### Option D: Implement a Completely New Solution from Scratch
* **Verdict:** **REJECTED.**
* **Rationale:** Unnecessary rewrite. Yogneet Edu already has a battle-tested Judge0 Edge Function, strict RLS policies, atomic rate limiting RPCs, and 400+ passing regression tests.

---

## 2. Selected Architecture: The Hybrid Enterprise Blueprint

```mermaid
flowchart TD
    subgraph Frontend["Frontend Layer (React 18 + TypeScript + Vite)"]
        UI["CodingProblemPage (Split View)"]
        ME["Monaco Editor (@monaco-editor/react)"]
        TR["Test Results Drawer (Tabs, Diffs, Metrics)"]
        CI["Custom Input Playground"]
        UI --> ME
        UI --> TR
        UI --> CI
    end

    subgraph ClientService["Client Service Layer"]
        CES["CodeExecutionService"]
        CS["CodingService"]
        Harness["Language Auto-Harness Engine"]
        Eval["Deterministic Output Evaluator"]
        ME --> CES
        CES --> Harness
        TR --> Eval
    end

    subgraph SecurityBoundary["Security & Proxy Boundary (Supabase Edge Function)"]
        EF["execute-code Edge Function (Deno)"]
        RL["Postgres Rate Limiter (Atomic)"]
        JWT["JWT Auth Verification"]
        EF --> JWT
        JWT --> RL
    end

    subgraph SandboxEngine["Isolated Sandbox Execution Engine"]
        Judge0["Judge0 CE Container Cluster"]
        Limits["2.0s CPU | 256MB RAM | No Network | 64 Procs"]
        Judge0 --> Limits
    end

    subgraph DatabaseLayer["Supabase PostgreSQL 15"]
        CP["coding_problems (Seeded Catalog)"]
        CTC["coding_test_cases (is_hidden RLS)"]
        CSUB["coding_submissions (Server-Authoritative)"]
        PROF["profiles (Gamification Trigger)"]
    end

    CES -->|mode: run (Sample/Custom)| EF
    CS -->|mode: submit (Full Judging)| EF
    EF -->|Fetch Hidden & Public Tests via service_role| CTC
    EF -->|Run Isolated Tests| Judge0
    EF -->|Record Verified Submission| CSUB
    CSUB -->|Atomic Trigger: +1 Solved Count| PROF
    CS -->|Load Problem by Slug (maybeSingle)| CP
```

---

## 3. Core Architectural Components

### 3.1 Editor Layer: Monaco Editor Integration
* **Package:** `@monaco-editor/react` (v4.7.0).
* **Configuration:**
  - Theme: Custom dark theme (`vs-dark`) aligned with Yogneet Edu Phoenix design tokens.
  - Typography: `JetBrains Mono, Fira Code, monospace` at 13px font size.
  - Ergonomics: Automatic layout resizing, disabled minimap, line numbers on, tabSize 4 (2 for JS), word wrap on, and formatting on paste.
  - Zero-lag loading skeleton with fallback while Monaco CDN assets initialize.

### 3.2 Execution Layer: Judge0 CE via Supabase Edge Function
* **Primary Route:** `supabase/functions/execute-code/index.ts`.
* **Execution Boundary:** All untrusted user code runs in isolated Judge0 containers.
* **Resource Controls:**
  - CPU Time Limit: 2.0 seconds.
  - Wall-clock Time Limit: 5.0 seconds.
  - Memory Limit: 256 MB (262,144 KB).
  - Max Processes: 64.
  - Network Access: Strictly disabled (`enable_network: false`).
* **Credentials:** Judge0 API tokens and Supabase `service_role` keys are stored strictly in server-side environment secrets.

### 3.3 Language Auto-Harness Engine
* **Purpose:** Allows both standard competitive programming code (`main()` with `cin`/`stdin`) and LeetCode-style method definitions (`class Solution: def twoSum(...)`) to execute seamlessly on Judge0.
* **Mechanism:**
  - Inspects user code for an entry point (`int main()`, `public static void main`, `if __name__ == '__main__':`, or top-level I/O).
  - If present: Executes code as-is.
  - If absent: Appends an auto-generated runner for the target language that parses problem inputs, instantiates `Solution`, invokes the target method, and prints standard JSON or string output.

### 3.4 Deterministic Output Evaluator
* **Comparison Principles:**
  - Exact match by default.
  - Normalizes line endings (`\r\n` -> `\n`).
  - Ignores trailing newlines (`\n+$`).
  - Does NOT alter intra-string whitespace or convert casing to lowercase.
  - Disallows arbitrary non-empty outputs from passing.

### 3.5 Database & Submission Integrity Layer
* **Catalog Seeding:** Default problems (Two Sum, Valid Parentheses, Reverse String) seeded into `public.coding_problems` and `public.coding_test_cases` with deterministic UUIDs.
* **Query Safety:** `CodingService.getProblemBySlug` uses `.maybeSingle()` to eliminate HTTP 406 / `PGRST116` errors.
* **Hidden Test Security:** Row Level Security (RLS) strictly blocks student access to `is_hidden = true` test cases.
* **Server-Authoritative Gamification:** Only the `record_verified_submission` RPC can record accepted submissions, and a PostgreSQL trigger increments `profiles.solved_problems_count` only on first-time solves.

---

## 4. Security Verification & Compliance

| Security Requirement | Status | Architecture Verification |
|---|---|---|
| **RCE Protection** | **PASSED** | Untrusted code executes solely in isolated Judge0 containers. Main server has zero execution. |
| **Secret Containment** | **PASSED** | No API keys, database credentials, or service keys exist in client bundles. |
| **Rate Limiting** | **PASSED** | Dual-tier: client sliding window (1.5s interval) + atomic PostgreSQL `FOR UPDATE` rate limit. |
| **Hidden Test Isolation** | **PASSED** | PostgREST RLS prevents reading hidden cases; server evaluates them via `service_role`. |
| **Anti-Cheat Scoring** | **PASSED** | Direct client updates to `solved_problems_count` or `coding_submissions` are rejected by triggers. |
| **Multi-Role RBAC** | **PASSED** | Admin and authorized Sub-Admins have management rights; students have practice rights only. |

---

## 5. Architectural Approval

This hybrid architecture resolves every defect identified in the audit while maintaining 100% backward compatibility with Yogneet Edu's existing RBAC, database migrations, and 400+ unit and integration tests.
