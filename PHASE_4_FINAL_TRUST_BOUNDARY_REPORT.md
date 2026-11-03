# YOGNEET EDU — PHASE 4 FINAL TRUST BOUNDARY AUDIT REPORT

**Date:** November 3, 2026  
**Project:** Yogneet Edu — Technical Learning & Assessment Platform  
**Target Repository:** `https://github.com/AdarshSingh4455/Yogneet-Edu.git`  
**Current Branch:** `security/phase-3b-remediation` (Production `master` untouched)  
**Staging Supabase Ref:** `ksjeravfkjfbpvfdazus` (Verified live)  
**Production Supabase Ref:** `acmhdklihpqzurzuthkw` (Untouched, Zero mutations)  
**Scope:** Assessment Attempts Trust Boundary, RLS Verification, Authoritative Server Scoring, Secondary Trigger Defense  

---

## 1. Executive Summary

A comprehensive, live security trust boundary audit of the `public.assessment_attempts` table, submission RPCs, and streak activity triggers was conducted on staging database `ksjeravfkjfbpvfdazus`.

### Core Findings & Security Verification
1. **Direct PostgREST Mutation Blocked:** `assessment_attempts` has Row Level Security active (`rowsecurity: true`). The sole RLS policy granted to `authenticated` is `assessment_attempts_select_own_or_admin` (`FOR SELECT`). **Zero INSERT, UPDATE, or DELETE policies exist for students.** Any attempt by an authenticated student to directly insert a fabricated attempt or update an existing attempt's `submitted_at`, score, or status is rejected by PostgreSQL RLS with `new row violates row-level security policy` (code: `42501`).
2. **Authoritative Server Scoring via RPC:** Legitimate assessment submissions execute strictly through `public.submit_assessment_attempt(...)`. This RPC is `SECURITY DEFINER` and derives `user_id` strictly from `auth.uid()`. It evaluates question answers server-side against database answer keys, calculates marks and negative marks, validates published status and tier entitlements, and records the authoritative attempt.
3. **Cross-Tenant Protection:** A student cannot submit an attempt on behalf of another user. The RPC possesses no `user_id` parameter, and direct table inserts for other users are blocked by RLS.
4. **Trigger Trust Boundary & Discovered Bug Fix:** During live submission testing, we discovered that `protect_profile_privileged_fields()` previously threw `Access Denied: Gamification counters are updated only by verified scoring events` because an earlier migration omitted the `pg_trigger_depth() > 1` check. We remediated this by restoring the `pg_trigger_depth() > 1` secondary trigger defense. Direct client manipulation of gamification counters remains 100% blocked, while genuine assessment submissions update profile counters and streak activity atomically.
5. **Full Regression Results:** All **315 tests across 67 suites passed (100% pass rate)**. TypeScript typecheck passed with **0 errors**, and production build succeeded cleanly.

---

## 2. Table-Level Trust Boundary & RLS Inspection

### 2.1 RLS Policies on `public.assessment_attempts`

| Policy Name | Command | Permissive | Roles | RLS Filter / Check Expression | Access Rule |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `assessment_attempts_select_own_or_admin` | `SELECT` | `PERMISSIVE` | `{authenticated}` | `((auth.uid() = user_id) OR is_admin())` | Read-only access to own attempts or admin |
| *(None)* | `INSERT` | — | — | **NO POLICY EXISTS** | **Default Deny: All direct client inserts blocked** |
| *(None)* | `UPDATE` | — | — | **NO POLICY EXISTS** | **Default Deny: All direct client updates blocked** |
| *(None)* | `DELETE` | — | — | **NO POLICY EXISTS** | **Default Deny: All direct client deletions blocked** |

Because `rowsecurity = true` is enforced on `public.assessment_attempts`, PostgreSQL fails closed on any operation without an explicit matching policy.

### 2.2 Table ACL Grants Inspection (`relacl`)
- PostgreSQL Table Access List: `{postgres=arwdDxtm,service_role=arwdDxtm,authenticated=arwdDxtm,anon=arwdDxtm}`
- Under PostgreSQL Row Level Security, table-level grants are subordinate to RLS policies. Because no INSERT or UPDATE RLS policy exists for `authenticated` or `anon`, direct mutations via PostgREST cannot proceed.

---

## 3. Assessment Submission Architecture & Workflow

### 3.1 Legitimate Assessment Submission Flow

```
[Student Browser]
       │
       │ (1) submitAttempt(testId, answers, statuses)
       ▼
[AssessmentService.submitAttempt]
       │
       │ (2) supabase.rpc('submit_assessment_attempt', { p_test_id, p_user_answers, ... })
       ▼
[PostgreSQL: submit_assessment_attempt]  (SECURITY DEFINER, search_path = public, auth, pg_temp)
       ├── Derives v_user_id := auth.uid() (Unforgeable server-side identity)
       ├── Checks public.is_active_user()
       ├── Acquires transaction advisory lock: pg_try_advisory_xact_lock(v_user_id:test_id)
       ├── Validates assessment exists, status = 'available', and student has required tier
       ├── Iterates assessment_questions: validates answers, awards marks & negative marks
       ├── Authoritatively calculates score_obtained, percentage, passed
       └── INSERT INTO public.assessment_attempts (...)
               │
               ├── (A) Trigger: trg_assessment_attempts_metrics
               │       └── Executes sync_profile_test_metrics()
               │               └── Increments profiles.tests_completed_count (+1)
               │
               └── (B) Trigger: trg_assessment_attempt_study_activity
                       └── Executes trg_record_assessment_streak_activity()
                               └── INSERT INTO public.user_study_activities (...)
                                       │
                                       └── (C) Trigger: trg_study_activity_streak
                                               └── Executes trg_study_activity_sync_streak()
                                                       └── Atomically updates public.user_streaks
```

### 3.2 Immutability of Submitted Attempts
Once written by `submit_assessment_attempt`, attempts cannot be updated or altered by students:
- `submitted_at` is set to `timezone('utc'::text, now())` server-side.
- `score_obtained`, `percentage`, and `passed` are derived strictly from database answer keys.
- Direct UPDATE calls by students are rejected by RLS.

---

## 4. Discovered Vulnerability & Remediation: Secondary Trigger Defense

### 4.1 Bug Discovery
During live testing of genuine student submissions via `submit_assessment_attempt`, the RPC failed with:
`Access Denied: Gamification counters are updated only by verified scoring events.` (code `P0001`).

**Root Cause Analysis:**
1. When `submit_assessment_attempt` inserts an attempt row, it fires trigger `trg_assessment_attempts_metrics`, which calls `sync_profile_test_metrics()` to update `profiles.tests_completed_count = tests_completed_count + 1`.
2. That update on `public.profiles` triggers `protect_profile_privileged_fields()`.
3. An earlier migration (`20261101000018_fix_complete_password_change_transaction.sql`) had replaced `protect_profile_privileged_fields()` but omitted the internal trigger depth check (`pg_trigger_depth() > 1`), causing the trigger to mistake legitimate scoring trigger updates for unauthorized direct client mutations.

### 4.2 Fix Applied & Verified

We restored the unforgeable `pg_trigger_depth() > 1` secondary trigger defense in `protect_profile_privileged_fields()`:

```sql
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_can_manage_premium BOOLEAN := false;
  v_can_manage_subadmins BOOLEAN := false;
BEGIN
  -- 1. Trusted server-side operations: service_role key or postgres database session user
  IF auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- 2. Internal secondary trigger defense (e.g. sync_profile_test_metrics triggered by attempt insertion)
  -- pg_trigger_depth() is built into PostgreSQL and cannot be spoofed by any client parameter.
  IF pg_trigger_depth() > 1 THEN
    -- Ensure core identity, role, and status remain strictly immutable during secondary trigger execution
    IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.email <> NEW.email OR OLD.created_at <> NEW.created_at THEN
      RAISE EXCEPTION 'Access Denied: Role and status cannot be modified via trigger.';
    END IF;
    -- Restrict tests_completed_count to exact sequential increment (+1) or unchanged
    IF NEW.tests_completed_count <> OLD.tests_completed_count AND NEW.tests_completed_count <> OLD.tests_completed_count + 1 THEN
      RAISE EXCEPTION 'Access Denied: tests_completed_count can only be incremented sequentially by verified scoring events.';
    END IF;
    RETURN NEW;
  END IF;

  -- 3. Caller resolution (Super Admin override)
  ...
  -- 4. Direct client modification of gamification counters is strictly blocked
  IF OLD.solved_problems_count <> NEW.solved_problems_count OR OLD.tests_completed_count <> NEW.tests_completed_count THEN
    RAISE EXCEPTION 'Access Denied: Gamification counters are updated only by verified scoring events.';
  END IF;

  RETURN NEW;
END;
$$;
```

**Security Property of the Fix:**
- When an authenticated student sends `UPDATE profiles SET tests_completed_count = 100`, `pg_trigger_depth() = 1`. The update is **strictly blocked** with `Access Denied`.
- When `sync_profile_test_metrics()` runs as a trigger from `assessment_attempts`, `pg_trigger_depth() = 2`. The sequential increment (+1) **succeeds**.
- Identity, role, and status fields remain strictly immutable even during secondary trigger execution.

---

## 5. Live Negative Security Tests (Executed on Staging)

A dedicated test suite (`scripts/test-assessment-trust-boundary.mjs`) was executed live on staging `ksjeravfkjfbpvfdazus` using real, authenticated disposable student accounts:

```
TAP version 13
# Subtest: Assessment Attempts Security Trust Boundary Live Verification
    ok 1 - 1. Authenticated student CANNOT directly INSERT a fabricated assessment attempt via PostgREST
    ok 2 - 2. Authenticated student CANNOT UPDATE an existing attempt to alter submitted_at or scores
    ok 3 - 3. Student CANNOT create an assessment attempt belonging to another user
    ok 4 - 4. Student cannot manipulate score, percentage or pass status to generate streak activity
    ok 5 - 5. Database trigger awards streak credit ONLY when genuine submitted_at is populated
    ok 6 - 6. Genuine assessment submission via RPC generates streak activity atomically
1..6
# tests 6
# suites 1
# pass 6
# fail 0
```

### Detailed Results for Each Verification Item

| # | Security Verification Item | Test Details & Method | Result | Status |
| :-: | :--- | :--- | :--- | :---: |
| **1** | Direct insert of fabricated attempt | Student attempts `client.from('assessment_attempts').insert({ submitted_at: now(), passed: true, percentage: 100 })`. | **Denied by RLS**: `new row violates row-level security policy for table "assessment_attempts"` (code `42501`). | **PASS** |
| **2** | Update of existing attempt's `submitted_at` or scores | Student attempts `client.from('assessment_attempts').update({ percentage: 100, passed: true }).eq('attempt_id', id)`. | **Denied by RLS**: 0 rows updated, database records completely unmodified. | **PASS** |
| **3** | Create attempt for another user | (a) Direct insert with Student B's UUID.<br>(b) Attempting to spoof `user_id` via RPC. | (a) Direct insert blocked by RLS.<br>(b) `submit_assessment_attempt` enforces `v_user_id := auth.uid()`; attempt is attributed strictly to caller. | **PASS** |
| **4** | Manipulate score/submission metadata | Student attempts to pass fake scores or non-existent assessment ID via RPC. | Rejected with `Assessment not found: 00000000-...-9999`. RPC calculates all scores internally. | **PASS** |
| **5** | Streak credit awarded only on genuine submission | Inspected database trigger logic; unsubmitted attempts do not populate `user_study_activities`. | Verified: Trigger fires strictly `WHEN (NEW.submitted_at IS NOT NULL)`. | **PASS** |
| **6** | Legitimate assessment submission workflow | Student completes available assessment with answers via `submit_assessment_attempt`. | **Succeeds**: Score calculated, attempt recorded, streak activity inserted, streak counter updated atomically to 1. | **PASS** |

---

## 6. Regression, TypeScript & Production Build Verification

Following remediation of the secondary trigger defense and trust boundary verification:

1. **Full Automated Test Suite (`npm test`):**
   ```
   TAP version 13
   1..68
   # tests 315
   # suites 67
   # pass 315
   # fail 0
   # cancelled 0
   # skipped 0
   # todo 0
   # duration_ms 10228.2834
   ```
   **315 tests across 67 suites passed with 0 failures.**

2. **TypeScript Typecheck (`npx tsc --noEmit`):**
   - Result: **0 errors** (Clean).

3. **Production Build (`npm run build`):**
   - Result: **Clean production build (1719 modules transformed in 53.76s)**.

---

## 7. Production Safety & Git Working Tree Confirmation

- **Working Branch:** `security/phase-3b-remediation`
- **Production Branch (`master`):** **Untouched**
- **Production Supabase (`acmhdklihpqzurzuthkw`):** **Zero mutations, untouched**
- **Staging Database (`ksjeravfkjfbpvfdazus`):** Fully synchronized and verified.
- **Git State:** **Zero commits, zero pushes, zero merges, zero deployments.** All changes remain safely uncommitted on the working branch.
