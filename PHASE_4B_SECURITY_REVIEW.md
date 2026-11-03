# YOGNEET EDU — PHASE 4B SECURITY REVIEW & DEPLOYMENT-READINESS AUDIT

- **Repository:** `Yogneet-Edu`
- **Current Branch:** `security/phase-3b-remediation`
- **Latest Commit (HEAD):** `743be71` (`feat(workspace): integrate unified workspace, platform analytics, and e2e test suite`)
- **Audit Timestamp:** October 29, 2026 (Local: 12:08 IST)
- **Audit Mode:** READ-ONLY Verification & Forensic Code Review
- **Target Components:**
  - `supabase/migrations/20261029000006_phase_4b_auth_entitlements.sql`
  - `supabase/functions/admin-provision-staff/index.ts`
  - `src/context/AuthContext.tsx`
  - `src/components/common/AccessGate.tsx`
  - `src/services/staffAdminService.ts`
  - `src/services/studentDirectoryService.ts`
  - `src/pages/auth/StudentLoginPage.tsx`, `StudentSignupPage.tsx`, `PlatformLoginPage.tsx`
  - Relevant RLS policies, PostgreSQL triggers, and secure assessment RPCs

---

## 1. Executive Summary

This security and deployment-readiness audit examines the Phase 4B implementation for Yogneet Edu. The objective of Phase 4B is to replace prototype-only authentication with real Supabase Auth, enforce server-authoritative role-based access control (RBAC), enable admin-only staff account provisioning via Supabase Edge Functions, and introduce a student entitlement tier model (`standard`, `pro`, `managed`, `scholarship`).

### Overall Security Status: **CONDITIONAL PASS / ACTION REQUIRED BEFORE PRODUCTION**
The authentication architecture and client role isolation are well-designed and strictly adhere to the rule of zero client trust. However, our forensic audit identified **2 HIGH-severity server-side security vulnerabilities** and **2 MEDIUM-severity concerns** that must be addressed prior to deploying to live staging or production:
1. **Unconfirmed Email Claiming Privileged Invitations & Entitlements (HIGH):** The PostgreSQL trigger `handle_new_user()` runs on `AFTER INSERT ON auth.users` without checking whether `NEW.email_confirmed_at IS NOT NULL`. An unverified public signup with a target email immediately redeems pending staff invitations or student directory scholarship/managed entitlements.
2. **Server-Side Storage and Content Entitlement Enforcement Gap (HIGH):** Content tier gating is enforced strictly in the React frontend (`<AccessGate>` and `checkStudentEntitlement`), but is **not** enforced in Supabase RLS policies (`public.study_notes`, `public.assessments`), Storage bucket policies (`yogneet-public`), or assessment RPCs (`get_assessment_questions_for_taking`, `submit_assessment_attempt`). Direct API calls can bypass tier gates.
3. **Partial Failure Orphaned Invitations in Edge Function (MEDIUM):** If `inviteUserByEmail` fails in `admin-provision-staff`, the preceding database upsert in `staff_invitations` is not rolled back.
4. **Silent Mock Fallback in Production (MEDIUM):** Dual-mode configuration falls back to in-memory mock mode if environment variables are missing, which could allow arbitrary persona switching if environment variables fail to load in production.

---

## 2. Verification Checklist & Detailed Findings

| # | Audit Item | Verification Status | Finding Level | Summary |
|---|---|---|---|---|
| **1** | Staff provisioning authorization & partial failures | **Verified with Concern** | **MEDIUM** | Only admins can provision; partial failure in Edge Function leaves orphaned pending invite. |
| **2** | Role, status, and tier database authorization | **VERIFIED SOLID** | **PASS** | Trigger `protect_profile_privileged_fields` strictly prevents non-admins from changing privileged fields. |
| **3** | Server-side entitlement enforcement (API & Storage) | **UNENFORCED ON BACKEND** | **HIGH** | Tier gating is UI-only. Backend RLS policies, storage bucket, and assessment RPCs allow any active user. |
| **4** | Student directory matching on unverified emails | **VULNERABLE** | **HIGH** | `handle_new_user()` grants elevated staff roles and directory tiers on unconfirmed email signups. |
| **5** | OAuth callback & password recovery safety | **VERIFIED SOLID** | **LOW (UX)** | Clean `window.location.origin` redirects; no open redirects; safe session handling. |
| **6** | Additive migration safety & Phase 3B/3C integrity | **VERIFIED SOLID** | **PASS** | Migration 6 is purely additive; preserves least-privilege grants and scoring invariants. |
| **7** | Git branch & working tree integrity | **VERIFIED RECORDED** | **PASS** | Branch `security/phase-3b-remediation` at commit `743be71`. |

---

## 3. In-Depth Vulnerability Analysis & Remediation Steps

---

### Finding 1 [HIGH]: Unconfirmed Email Redemption of Staff Invitations and Directory Entitlements

- **Component:** `supabase/migrations/20261029000006_phase_4b_auth_entitlements.sql`
- **Location:** Function `public.handle_new_user()`, lines 177–280
- **CWE:** CWE-287 (Improper Authentication), CWE-306 (Missing Authentication for Critical Function)

#### Technical Mechanism:
`handle_new_user()` is bound to `AFTER INSERT ON auth.users`.
When an attacker visits the public `/signup` page and submits `alice.admin@yogneet.edu` (an email for which an admin has generated a pending staff invite) or `student.scholarship@univ.edu` (an email in `student_directory` with `access_category = 'scholarship'`), Supabase Auth inserts an unconfirmed row into `auth.users` with `email_confirmed_at = NULL`.

The trigger executes immediately:
```sql
-- 1. Check if pre-invited as Staff by Administrator
SELECT name, role, department, bio, permissions
INTO v_inv_name, v_inv_role, v_inv_department, v_inv_bio, v_inv_permissions
FROM public.staff_invitations
WHERE lower(email) = lower(NEW.email)
  AND status = 'pending'
LIMIT 1;

IF v_inv_role IS NOT NULL THEN
  -- Provision authorized staff profile
  INSERT INTO public.profiles (..., role, status, ...)
  VALUES (..., v_inv_role, 'active', ...);
  ...
  UPDATE public.staff_invitations
  SET status = 'accepted', updated_at = timezone('utc'::text, now())
  WHERE lower(email) = lower(NEW.email);

  RETURN NEW;
END IF;
```
#### Impact:
1. **Pre-emption & Denial of Service:** The pending invitation is marked `'accepted'` immediately. When the legitimate staff member or student attempts to use their invitation link, the system will consider the invite already redeemed.
2. **Account Takeover / Privilege Escalation:** If Supabase project settings have email confirmation disabled (common in local or dev setups), or if the attacker gains access to any session, the attacker's account is immediately recognized by the platform as `subadmin` or `admin`.

#### Exact Remediation:
1. Split user lifecycle handling: On `INSERT ON auth.users`, only provision a standard unprivileged student profile **unless** `NEW.email_confirmed_at IS NOT NULL` OR `NEW.confirmed_at IS NOT NULL` OR `NEW.invited_at IS NOT NULL` (which Supabase sets during `auth.admin.inviteUserByEmail`).
2. Add an `AFTER UPDATE OF email_confirmed_at ON auth.users` trigger that elevates the profile and redeems the `staff_invitations` or `student_directory` entry **only after email ownership has been mathematically verified**.

```sql
-- Remediation SQL Pattern:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_is_email_verified BOOLEAN;
BEGIN
  v_is_email_verified := (NEW.email_confirmed_at IS NOT NULL)
                      OR (NEW.confirmed_at IS NOT NULL)
                      OR (NEW.invited_at IS NOT NULL);

  -- Only check privileged staff_invitations if email is verified/invited
  IF v_is_email_verified THEN
    -- Check staff_invitations and student_directory...
  ELSE
    -- Default to basic unverified student profile without elevated role or tier
    INSERT INTO public.profiles (id, name, email, role, status, access_category)
    VALUES (NEW.id, split_part(NEW.email, '@', 1), NEW.email, 'student', 'active', 'standard')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
```

---

### Finding 2 [HIGH]: Entitlement Tiers Unenforced at Database RLS, RPC, and Storage Layer

- **Component:** `supabase/migrations/20261026000002_rls_policies.sql`, `20261027000004_remediate_assessment_permissions.sql`, `20261029000006_phase_4b_auth_entitlements.sql`
- **Location:** Policies on `public.study_notes`, `public.assessments`, `storage.objects`, and RPC `get_assessment_questions_for_taking`
- **CWE:** CWE-285 (Improper Authorization), CWE-602 (Client-Side Enforcement of Server-Side Security)

#### Technical Mechanism:
Migration 6 defines `public.has_entitlement(p_user_id UUID, p_required_tier TEXT) RETURNS BOOLEAN` and adds `is_restricted` and `required_tier` columns. The React frontend implements `<AccessGate>` and `checkStudentEntitlement`.
However:
1. **Study Notes Table:** Policy `study_notes_select_published_or_staff` only checks:
   `status = 'published' AND public.is_active_user()`
   It does **not** evaluate `public.has_entitlement(auth.uid(), required_tier)`.
   Any authenticated student issuing `supabase.from('study_notes').select('*')` receives all notes, including `file_url`.
2. **Storage Bucket `yogneet-public`:** Policy `storage_public_select` allows:
   `bucket_id = 'yogneet-public' AND auth.role() = 'authenticated'`
   Any authenticated user who obtains the storage path (which is stored in `study_notes.file_url`) can download the PDF directly from Supabase Storage without being on the `pro` tier.
3. **Assessment RPCs:** `get_assessment_questions_for_taking(p_test_id)` only checks:
   `public.is_active_user() AND (a.status = 'available' OR public.is_staff())`
   It does not verify whether `a.is_restricted` requires `pro` or `managed` entitlement.
   `submit_assessment_attempt(...)` also omits tier validation.

#### Impact:
A student with a free `standard` account can easily bypass UI gating using browser devtools or standard curl/Supabase API clients to read premium study note URLs, download offline PDFs, and fetch questions for restricted assessments.

#### Exact Remediation:
1. **Restrict Storage Downloads:** Store restricted notes PDFs in `yogneet-private` (or a dedicated `restricted-notes` bucket), and enforce an RLS policy on `storage.objects`:
```sql
CREATE POLICY "storage_restricted_notes_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'yogneet-private'
    AND (
      public.is_staff()
      OR public.has_entitlement(auth.uid(), 'pro')
    )
  );
```
2. **Enforce Entitlement in Assessment RPCs:**
In `get_assessment_questions_for_taking` and `submit_assessment_attempt`:
```sql
IF v_test.is_restricted AND NOT public.has_entitlement(v_user_id, v_test.required_tier) THEN
  RAISE EXCEPTION 'Access Denied: Your account tier (%) does not have entitlement for this assessment (requires %).',
    v_user_tier, v_test.required_tier;
END IF;
```

---

### Finding 3 [MEDIUM]: Partial Failure in `admin-provision-staff` Leaves Orphaned Pending Invitation

- **Component:** `supabase/functions/admin-provision-staff/index.ts`
- **Location:** Lines 122–154
- **CWE:** CWE-404 (Improper Resource Shutdown or Release)

#### Technical Mechanism:
In `admin-provision-staff`:
1. Line 122: Inserts a row into `staff_invitations` with `status: 'pending'`.
2. Line 145: Calls `adminClient.auth.admin.inviteUserByEmail(...)`.
3. If `inviteUserByEmail` returns an unexpected error (e.g. SMTP server timeout, invalid email domain, or Supabase Auth rate limit), the Edge Function catches the error at line 201 and returns HTTP 500.
4. **However**, the record in `staff_invitations` remains in the database with `status: 'pending'`.

#### Impact:
The administrator is told the operation failed. If the target email is later registered, the system will honor the pending invitation and grant elevated staff privileges.

#### Exact Remediation:
In `supabase/functions/admin-provision-staff/index.ts`, when `inviteErr` is not an "already registered" condition, execute a compensating deletion before returning the 500 response:
```typescript
if (inviteErr) {
  if (inviteErr.message.includes('already registered') || inviteErr.status === 422) {
    // Elevate account...
  } else {
    // Compensating cleanup
    await adminClient
      .from('staff_invitations')
      .delete()
      .eq('email', normalizedEmail)
      .eq('status', 'pending');

    return new Response(
      JSON.stringify({ error: `Auth invitation failed: ${inviteErr.message}. Invitation discarded.` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
```

---

### Finding 4 [MEDIUM]: Silent Mock Fallback in Production Builds

- **Component:** `src/context/AuthContext.tsx`
- **Location:** Lines 274–309
- **CWE:** CWE-1188 (Insecure Default Initialization of Resource)

#### Technical Mechanism:
`AuthContext` provides dual-mode operation:
If `isSupabaseConfigured() && supabase` is false, it executes mock authentication where `switchUser(...)` allows switching to `admin`, `subadmin`, or any persona.
If environment variables `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` fail to load in a production deployment (e.g. build environment misconfiguration), the client silently degrades to `local-mock` mode.

#### Impact:
A misconfigured production deployment could expose the prototype persona switcher to public users.

#### Exact Remediation:
In `src/services/supabaseClient.ts` and `src/context/AuthContext.tsx`, enforce a hard failure if `import.meta.env.PROD` is true and Supabase credentials are missing:
```typescript
if (import.meta.env.PROD && !isSupabaseConfigured()) {
  throw new Error('Fatal Configuration Error: Supabase credentials are required in production mode.');
}
```

---

### Finding 5 [LOW]: `ResetPasswordPage` Missing Pre-Submit Recovery Session Alert

- **Component:** `src/pages/auth/ResetPasswordPage.tsx`
- **Location:** Line 76–120
- **CWE:** CWE-384 (Session Fixation / Misleading State)

#### Technical Mechanism:
`isRecoverySession` is tracked in `AuthContext` via Supabase `onAuthStateChange` (`event === 'PASSWORD_RECOVERY'`).
However, `ResetPasswordPage` renders the password input form even if `isRecoverySession` is `false` and no active recovery session exists. The user only discovers that the link has expired or is invalid upon submitting the form and receiving a generic API error.

#### Exact Remediation:
Display an informative state if neither `isRecoverySession` nor an active session is detected:
```tsx
if (!isRecoverySession && !currentUser) {
  return (
    <AuthLayout ...>
      <div className="p-4 text-center">
        <p className="text-xs text-slate-500">No active password recovery session detected. Please request a new reset link.</p>
        <Link to="/forgot-password" className="...">Request Reset Link</Link>
      </div>
    </AuthLayout>
  );
}
```

---

## 4. Solid & Verified Security Invariants

The following security properties have been verified:
1. **Client Role Isolation:** `StudentSignupPage.tsx` contains 0 role dropdowns or role parameters. Public signup passes only `{ name }` in metadata.
2. **Platform Portal Guard:** `PlatformLoginPage.tsx` strictly rejects ordinary students. Calling `signInWithEmail('platform')` with a student account immediately triggers `signOut()` and raises an explicit access denied exception.
3. **Trigger Defense-in-Depth:** `protect_profile_privileged_fields` checks `pg_trigger_depth() > 1` to prevent secondary triggers or compromised procedures from mutating `role`, `status`, or `access_category`.
4. **Least-Privilege RPC Grants:** `admin_provision_staff_account` and `admin_update_student_entitlement` revoke execute from `PUBLIC` and `anon`, granting access strictly to `authenticated`. Both RPCs verify `v_actor_role = 'admin'` at runtime.
5. **No Open Redirects:** Google OAuth redirects strictly to `${window.location.origin}/login?oauth_callback=true`, preventing external redirection attacks.
6. **No Client Secrets:** Zero service-role keys exist in frontend code, client assets, or `.env` templates.

---

## 5. Deployment Readiness Assessment

| Deployment Phase | Action Item | Status | Prerequisite / Blocker |
|---|---|---|---|
| **Local Working Tree** | All 175 tests passing, TypeScript 0 errors, build passes | **READY** | Clean working tree; no uncommitted conflicts. |
| **Database Staging** | Apply migration `20261029000006_phase_4b_auth_entitlements.sql` | **ACTION REQUIRED** | Patch `handle_new_user()` to verify `email_confirmed_at` before applying to staging. |
| **Edge Function Deployment** | Deploy `admin-provision-staff` to project `ksjeravfkjfbpvfdazus` | **ACTION REQUIRED** | Add compensating cleanup on invite failure; configure `SUPABASE_SERVICE_ROLE_KEY` in Supabase Secrets. |
| **Supabase Auth Config** | Enable Google OAuth provider in Supabase Dashboard | **PENDING DASHBOARD SETUP** | Requires Google Cloud Console OAuth Client ID & Secret. |
| **Storage RLS** | Harden private bucket policy for study notes PDFs | **ACTION REQUIRED** | Wire `public.has_entitlement` into private storage RLS. |

---

## 6. Summary of Action Items for Production Hardening

1. **Patch `handle_new_user()` trigger:** Require verified email before granting staff roles or directory entitlements.
2. **Harden Storage & RPC Entitlement Checks:** Wire `public.has_entitlement` into `study_notes`, assessment RPCs, and storage download policies.
3. **Add Compensating Cleanup to Edge Function:** Roll back pending `staff_invitations` if `inviteUserByEmail` fails.
4. **Fail-Closed Production Mode:** Forbid silent mock fallback when `import.meta.env.PROD` is true.
