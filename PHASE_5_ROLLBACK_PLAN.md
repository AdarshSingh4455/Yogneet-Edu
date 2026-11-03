# YOGNEET EDU — PHASE 5: PRODUCTION ROLLBACK PLAN & DISASTER RUNBOOK

**Production Project Ref:** `acmhdklihpqzurzuthkw` (`https://acmhdklihpqzurzuthkw.supabase.co`)  
**Production Vercel Canonical:** `https://yogneet-edu-yogneetedu-4013.vercel.app`  

---

## 1. ROLLBACK TRIGGER CRITERIA

Initiate an immediate rollback if ANY of the following occur during or immediately following deployment:

1. **Database Migration Failure:** Any of migrations `00022`, `00023`, or `00024` throws a fatal SQL error or fails to apply during `supabase db push`.
2. **Authentication / Session Outage:** Production users are unable to authenticate, receive 500 errors from Supabase Auth, or suffer authorization token rejection.
3. **Severe Application Regressions:** Key user journeys (student examination taking, video lesson playback, admin feedback review) fail due to runtime exceptions.
4. **Data Corruption or Permission Escalation:** RLS policies reject legitimate user queries or grant unintended privilege access.

---

## 2. DOMAIN-BY-DOMAIN ROLLBACK PROCEDURES

### 2.1 Database Migration Surgical Rollback
If migrations `00022`, `00023`, or `00024` introduce an unanticipated issue in production, apply the surgical rollback script below to revert schema and trigger state to migration `00021` parity:

```sql
-- ==============================================================================
-- SURGICAL ROLLBACK SCRIPT: MIGRATIONS 00024, 00023, 00022
-- Target: acmhdklihpqzurzuthkw (Production)
-- ==============================================================================

BEGIN;

-- 1. Revert Migration 00024 & 00022: Drop hardened log_audit_event function
DROP FUNCTION IF EXISTS public.log_audit_event(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT);

-- 2. Revert Migration 00023: Restore protect_profile_privileged_fields to migration 00021 definition
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
  -- Trusted server-side operations: service_role key or postgres database session user
  IF auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- Secondary trigger defense
  IF pg_trigger_depth() > 1 THEN
    IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.email <> NEW.email OR OLD.created_at <> NEW.created_at THEN
      RAISE EXCEPTION 'Access Denied: Role and status cannot be modified via trigger.';
    END IF;
    IF NEW.tests_completed_count <> OLD.tests_completed_count AND NEW.tests_completed_count <> OLD.tests_completed_count + 1 THEN
      RAISE EXCEPTION 'Access Denied: tests_completed_count can only be incremented sequentially by verified scoring events.';
    END IF;
    RETURN NEW;
  END IF;

  IF v_caller_id IS NOT NULL THEN
    SELECT (role = 'admin' AND status = 'active') INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_is_admin THEN
      RETURN NEW;
    END IF;

    v_can_manage_premium := public.has_permission(v_caller_id, 'premium_students.manage');
    v_can_manage_subadmins := public.has_permission(v_caller_id, 'subadmins.manage');
  END IF;

  IF OLD.role <> NEW.role OR OLD.status <> NEW.status THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles or account status.';
  END IF;

  IF OLD.email <> NEW.email THEN
    RAISE EXCEPTION 'Access Denied: Email address is managed through authentication credentials.';
  END IF;

  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Access Denied: Account creation timestamp is immutable.';
  END IF;

  IF (OLD.access_category IS DISTINCT FROM NEW.access_category)
     OR (OLD.is_premium IS DISTINCT FROM NEW.is_premium)
     OR (OLD.enrollment_number IS DISTINCT FROM NEW.enrollment_number)
     OR (OLD.admission_year IS DISTINCT FROM NEW.admission_year)
     OR (OLD.sequential_number IS DISTINCT FROM NEW.sequential_number)
     OR (OLD.yogneet_email IS DISTINCT FROM NEW.yogneet_email) THEN
    IF NOT v_can_manage_premium THEN
      RAISE EXCEPTION 'Access Denied: Only administrators or staff with premium_students.manage can modify premium student entitlements.';
    END IF;
  END IF;

  IF (OLD.must_change_password IS DISTINCT FROM NEW.must_change_password) THEN
    IF NEW.must_change_password = false THEN
      IF v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins THEN
        NULL;
      ELSIF v_caller_id = OLD.id THEN
        IF current_setting('private.trusted_password_change_in_progress', true) = 'true' THEN
          NULL;
        ELSE
          RAISE EXCEPTION 'Access Denied: Mandatory password flag cannot be cleared directly. Complete the password reset workflow.';
        END IF;
      ELSE
        RAISE EXCEPTION 'Access Denied: Unauthorized attempt to modify credential flags.';
      END IF;
    ELSIF NOT (v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins) THEN
      RAISE EXCEPTION 'Access Denied: Only authorized administrators can set mandatory password reset flags.';
    END IF;
  END IF;

  IF OLD.solved_problems_count <> NEW.solved_problems_count OR OLD.tests_completed_count <> NEW.tests_completed_count THEN
    RAISE EXCEPTION 'Access Denied: Gamification counters are updated only by verified scoring events.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Synchronize migration tracking table
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN ('20261103000022', '20261103000023', '20261103000024');

COMMIT;
```

---

### 2.2 Full Database Restore from Pre-Release Snapshot
If database corruption occurs or the surgical script is insufficient, restore the full pre-release database dump taken in Phase 1:

```bash
# 1. Restore public schema and table records from pre-release dump
pg_restore -h db.acmhdklihpqzurzuthkw.supabase.co -U postgres -d postgres --clean --if-exists -n public -v "yogneet_prod_public_<timestamp>.dump"

# 2. Verify schema integrity
npx supabase migration list --remote=acmhdklihpqzurzuthkw
```

---

### 2.3 Vercel Frontend Instant Rollback
Vercel maintains immutable build deployments. If the frontend build is broken:

```bash
# Option A: Instant CLI Rollback to previous deployment ID
npx vercel rollback <PREVIOUS_STABLE_DEPLOYMENT_URL_OR_ID>

# Option B: Vercel Dashboard
# 1. Go to Vercel Dashboard -> Project: yogneet-edu -> Deployments
# 2. Locate the previous stable production deployment
# 3. Click the "..." action menu -> Select "Promote to Production"
# Immediate recovery time: < 30 seconds
```

---

### 2.4 Git Rollback Procedure
If the merged PR on `master` must be reverted:

```bash
git checkout master
git pull origin master

# Create revert commit
git revert -m 1 HEAD -m "revert: rollback release to previous stable state"
git push origin master
```

---

## 3. INCIDENT COMMUNICATION & POST-MORTEM TEMPLATE

In the event of an aborted release:
1. **Status Notification:** Notify stakeholders that release was paused and previous stable state restored.
2. **Log Collection:** Capture error logs from Supabase Dashboard (Database -> Logs) and Vercel Runtime Logs.
3. **Root Cause Analysis:** Document specific failure mode, reproduction script, and missing validation.
