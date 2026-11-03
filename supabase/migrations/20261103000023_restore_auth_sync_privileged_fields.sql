-- ==============================================================================
-- Migration: 20261103000023_restore_auth_sync_privileged_fields.sql
-- Description: Restore yogneet.internal_auth_sync check in protect_profile_privileged_fields()
--              so verified staff invitation acceptance does not get blocked by depth check.
-- ==============================================================================

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
  -- 1. Allow verified internal auth synchronization (e.g. staff invitation redemption)
  IF current_setting('yogneet.internal_auth_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- 2. Trusted server-side operations: service_role key or postgres database session user
  IF auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- 3. Internal secondary trigger defense (e.g. sync_profile_test_metrics triggered by attempt insertion)
  IF pg_trigger_depth() > 1 THEN
    IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.email <> NEW.email OR OLD.created_at <> NEW.created_at THEN
      RAISE EXCEPTION 'Access Denied: Role and status cannot be modified via trigger.';
    END IF;
    IF NEW.tests_completed_count <> OLD.tests_completed_count AND NEW.tests_completed_count <> OLD.tests_completed_count + 1 THEN
      RAISE EXCEPTION 'Access Denied: tests_completed_count can only be incremented sequentially by verified scoring events.';
    END IF;
    RETURN NEW;
  END IF;

  -- 4. Caller resolution
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

  -- 5. Non-admins cannot alter role or account status
  IF OLD.role <> NEW.role OR OLD.status <> NEW.status THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles or account status.';
  END IF;

  -- 6. Non-admins cannot alter authoritative email directly
  IF OLD.email <> NEW.email THEN
    RAISE EXCEPTION 'Access Denied: Email address is managed through authentication credentials.';
  END IF;

  -- 7. Non-admins cannot modify account creation timestamp
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Access Denied: Account creation timestamp is immutable.';
  END IF;

  -- 8. Access category and premium student fields can ONLY be modified by Admin or Staff with premium_students.manage
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

  -- 9. Password reset flag: Strict Bypass Prevention
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

  -- 10. Non-admins cannot tamper with problem and test metrics directly
  IF OLD.solved_problems_count <> NEW.solved_problems_count OR OLD.tests_completed_count <> NEW.tests_completed_count THEN
    RAISE EXCEPTION 'Access Denied: Gamification counters are updated only by verified scoring events.';
  END IF;

  RETURN NEW;
END;
$$;
