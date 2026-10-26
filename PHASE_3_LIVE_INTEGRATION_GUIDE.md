# Yogneet Edu — Phase 3: Supabase Live Integration & Security Runbook

**Project:** Yogneet Edu (Branded: *Tech Geek Adarsh*)
**Canonical Repository:** `https://github.com/AdarshSingh4455/Yogneet-Edu.git`
**Current Synchronized Commit:** `83e1f584ecb9973e2f68abe0d00b518d4368f07b`
**Branch:** `master`
**Quality Status:** 39 Static/Simulated Tests Passing | Clean TypeScript Build | 0 Whitespace Errors

---

## 1. Executive Summary & Repository Status

Yogneet Edu is fully staged for live Supabase PostgreSQL backend integration. The dual-mode architecture allows the frontend to operate seamlessly in offline mock mode during local development while providing end-to-end typed Supabase client integration when credentials are provided.

### Environment & Project Discovery Audit
- **Local Environment:** No `.env` or `.env.local` files containing live credentials exist in the workspace.
- **Supabase CLI Audit (`supabase projects list`):**
  - Project `ueultpmimwmfkpcnlsmv` (`AdarshSingh4455's Project`, region `ap-northeast-1`): **Status `INACTIVE`** (paused due to free-tier inactivity).
  - Project `gpsermizvzdrpouyjrrx` (`JobFinder`, region `ap-southeast-1`): **Status `INACTIVE`** (paused).
  - Docker Engine is not installed on this Windows environment, meaning local Dockerized container emulation (`supabase start`) is not available.
- **Current Operational Mode:** `local-mock` (fallback mode). All frontend UI views, theme switching, assessment workflows, and mock RBAC remain 100% operational and interactive.

---

## 2. Distinction: Static / Simulated Tests vs. Live PostgreSQL Tests

To ensure complete transparency and zero ambiguity regarding test validity:

| Category | Test File | Execution Command | Scope & What It Proves |
|---|---|---|---|
| **Static Schema & Trigger Validation** | `scripts/test-supabase-schema.mjs` | `npm test` | Verifies that all 9 tables, indexes, triggers, `SECURITY DEFINER` fixed search paths, and immutable policies are declared in the SQL files. |
| **Simulated Authorization Verification** | `scripts/test-supabase-schema.mjs` | `npm test` | Unit tests simulated policy algorithms in JavaScript to prove that logic rules reject role escalation, metric tampering, and cross-student access. |
| **Real PostgreSQL Database Integration** | `scripts/test-supabase-live.mjs` | `npm run test:live` | Connects over HTTPS/WSS to an active Supabase project, registers real auth users, executes actual SQL transactions, and asserts that PostgreSQL RLS and trigger engines physically block unauthorized operations. |

---

## 3. Migration Ordering & Hosted Schema Architecture

When deployment to an isolated project is approved, migrations must be executed strictly in the following sequential order:

```
1. supabase/migrations/20261026000001_initial_schema.sql
   └── Creates tables: public.profiles, user_permissions, courses, video_lessons,
       study_notes, assessments, assessment_questions, assessment_attempts, audit_logs.
   └── Creates trigger: handle_new_user() [SECURITY DEFINER, search_path = public, auth, pg_temp]
   └── Creates trigger: protect_profile_privileged_fields() [blocks role/status/email/metric tampering]

2. supabase/migrations/20261026000002_rls_policies.sql
   └── Creates helper functions: is_admin(), is_staff(), is_active_user() [fixed search_path]
   └── Enables ROW LEVEL SECURITY on all 9 tables (default deny)
   └── Creates granular RLS policies for profiles, content, immutable attempts, and append-only audit logs
   └── Creates storage buckets: 'yogneet-public' and 'yogneet-private' with folder isolation
```

> **CRITICAL DEPLOYMENT RULE:** Do not apply migrations to a shared or production database without prior database backup and explicit project owner authorization.

---

## 4. Owner Action Checklist: Activating Supabase

To proceed with live PostgreSQL verification, the project owner should execute the following steps:

### Option A: Unpause Existing Project (Recommended)
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select **AdarshSingh4455's Project** (`ueultpmimwmfkpcnlsmv`).
3. Click the **"Restore project"** button and wait for the database compute to provision (~1-2 minutes).
4. Navigate to **Project Settings -> API**.
5. Copy the **Project URL** and the **anon public API key**.

### Option B: Create a Fresh Isolated Project
1. In the Supabase Dashboard, click **"New Project"**.
2. Name the project `yogneet-edu-dev` and choose your preferred region.
3. Once initialized, navigate to **Project Settings -> API** and copy the **Project URL** and **anon public API key**.

### Applying Migrations & Configuring Local Workspace
1. In the workspace root, create `.env.local` (this file is already strictly gitignored):
   ```ini
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```
   *(Never store or provide the `service_role` key).*
2. Apply the schema migrations via either:
   - **Supabase CLI:** Run `supabase link --project-ref <your-project-ref>` followed by `supabase db push`.
   - **Supabase SQL Editor:** Paste the full contents of `supabase/migrations/20261026000001_initial_schema.sql` into the SQL editor and execute, followed by `supabase/migrations/20261026000002_rls_policies.sql`.
3. Verify live integration:
   ```bash
   npm run test:live
   ```

---

## 5. Security Safeguards Verified

1. **Non-Admin Role Escalation Blocked:**
   The `protect_profile_privileged_fields()` trigger strictly inspects `auth.uid()` role in `public.profiles`. If a student attempts an `UPDATE public.profiles SET role = 'admin'`, the database aborts the transaction with an exception.
2. **Authoritative Email Protection:**
   Students cannot modify their `email` field in `public.profiles` directly; email changes must be processed through Supabase Auth confirmation flows.
3. **Gamification Metrics Integrity:**
   `solved_problems_count` and `tests_completed_count` are protected from direct student client mutation.
4. **Immutable Assessment Attempts:**
   `public.assessment_attempts` contains only `SELECT` and `INSERT` policies. No `UPDATE` or `DELETE` policies exist.
5. **Append-Only Audit Logs:**
   `public.audit_logs` accepts only `INSERT` from authenticated users and `SELECT` by administrators.
6. **Isolated Storage:**
   Storage rules mandate `(storage.foldername(name))[1] = auth.uid()::text` for private user storage.
