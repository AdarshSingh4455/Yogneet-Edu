-- ==============================================================================
-- Yogneet Edu — Migration 20261101000018: Fix Complete Password Change Transaction
-- ==============================================================================
-- Ensures trusted complete_mandatory_password_change RPC sets a local transaction-scoped
-- flag that protect_profile_privileged_fields checks, preventing direct PostgREST bypasses
-- while allowing the atomic RPC to successfully clear must_change_password.
-- ==============================================================================

-- 1. Hardened complete_mandatory_password_change
CREATE OR REPLACE FUNCTION public.complete_mandatory_password_change(p_new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_name TEXT := 'Student';
  v_caller_email TEXT;
  v_caller_role TEXT := 'student';
  v_target_profile public.profiles%ROWTYPE;
  v_old_temp_hash TEXT;
  v_hashed_pw TEXT;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- 1. Must be authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: You must be logged in to change your password.';
  END IF;

  -- 2. Validate password requirements (consistent with frontend policy: 8+ chars, uppercase, lowercase, number)
  IF p_new_password IS NULL OR length(trim(p_new_password)) < 8 THEN
    RAISE EXCEPTION 'Validation Error: Password must be at least 8 characters long.';
  END IF;

  IF p_new_password !~ '[A-Z]' OR p_new_password !~ '[a-z]' OR p_new_password !~ '[0-9]' THEN
    RAISE EXCEPTION 'Validation Error: Password must include at least one uppercase letter, one lowercase letter, and one number.';
  END IF;

  -- 3. Fetch current profile
  SELECT * INTO v_target_profile
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_target_profile.id IS NULL THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  IF NOT v_target_profile.must_change_password THEN
    RAISE EXCEPTION 'No mandatory password change is currently pending for this account.';
  END IF;

  v_caller_name := COALESCE(v_target_profile.name, 'Student');
  v_caller_email := v_target_profile.email;
  v_caller_role := v_target_profile.role;

  -- 4. Verify new password is distinct from the temporary password
  SELECT temporary_password_hash INTO v_old_temp_hash
  FROM private.user_temporary_credentials
  WHERE user_id = v_caller_id;

  IF v_old_temp_hash IS NOT NULL AND extensions.crypt(trim(p_new_password), v_old_temp_hash) = v_old_temp_hash THEN
    RAISE EXCEPTION 'Validation Error: New password must be different from the temporary password.';
  END IF;

  -- 5. Hash new password securely with bcrypt
  v_hashed_pw := extensions.crypt(trim(p_new_password), extensions.gen_salt('bf', 10));

  -- 6. Update auth.users atomically
  UPDATE auth.users
  SET
    encrypted_password = v_hashed_pw,
    updated_at = v_now
  WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authentication identity not found in auth.users.';
  END IF;

  -- 7. Purge temporary credential secret from private table
  DELETE FROM private.user_temporary_credentials
  WHERE user_id = v_caller_id;

  -- Set transaction-local marker for trigger verification
  PERFORM set_config('private.trusted_password_change_in_progress', 'true', true);

  -- 8. Clear must_change_password flag on public.profiles
  UPDATE public.profiles
  SET
    must_change_password = false,
    last_active = v_now
  WHERE id = v_caller_id;

  -- 9. Audit log the password change
  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    actor_email,
    actor_role,
    action,
    resource_type,
    resource_id,
    details,
    outcome
  ) VALUES (
    v_caller_id,
    COALESCE(v_caller_name, 'Student'),
    COALESCE(v_caller_email, 'student@yogneetedu.in'),
    COALESCE(v_caller_role, 'student'),
    'MANDATORY_PASSWORD_CHANGED',
    'profiles',
    v_caller_id::text,
    'Mandatory password change successfully completed and verified by authentication system. Temporary credentials purged.',
    'SUCCESS'
  );

  RETURN jsonb_build_object(
    'success', true,
    'must_change_password', false,
    'message', 'Password successfully changed and mandatory reset flag cleared.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_mandatory_password_change(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_mandatory_password_change(TEXT) TO authenticated, service_role;

-- 2. Hardened protect_profile_privileged_fields Trigger
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

  -- 2. Caller resolution
  IF v_caller_id IS NOT NULL THEN
    SELECT (role = 'admin' AND status = 'active') INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;

    -- Super Admin can modify all fields
    IF v_is_admin THEN
      RETURN NEW;
    END IF;

    v_can_manage_premium := public.has_permission(v_caller_id, 'premium_students.manage');
    v_can_manage_subadmins := public.has_permission(v_caller_id, 'subadmins.manage');
  END IF;

  -- 3. Non-admins cannot alter role or account status
  IF OLD.role <> NEW.role OR OLD.status <> NEW.status THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles or account status.';
  END IF;

  -- 4. Non-admins cannot alter authoritative email directly
  IF OLD.email <> NEW.email THEN
    RAISE EXCEPTION 'Access Denied: Email address is managed through authentication credentials.';
  END IF;

  -- 5. Non-admins cannot modify account creation timestamp
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Access Denied: Account creation timestamp is immutable.';
  END IF;

  -- 6. Access category and premium student fields can ONLY be modified by Admin or Staff with premium_students.manage
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

  -- 7. Password reset flag: Strict Bypass Prevention
  -- Ordinary PostgREST profile updates CANNOT clear must_change_password.
  -- Only trusted complete_mandatory_password_change RPC or admin override can clear it.
  IF (OLD.must_change_password IS DISTINCT FROM NEW.must_change_password) THEN
    IF NEW.must_change_password = false THEN
      -- Case A: Authorized administrator override
      IF v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins THEN
        NULL;
      -- Case B: Student attempting to clear flag
      ELSIF v_caller_id = OLD.id THEN
        -- Only permitted if executing within trusted complete_mandatory_password_change RPC transaction
        IF current_setting('private.trusted_password_change_in_progress', true) = 'true' THEN
          NULL;
        ELSE
          RAISE EXCEPTION 'Access Denied: Mandatory password flag cannot be cleared directly. Complete the password reset workflow.';
        END IF;
      ELSE
        RAISE EXCEPTION 'Access Denied: Unauthorized attempt to modify credential flags.';
      END IF;
    ELSIF NOT (v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins) THEN
      RAISE EXCEPTION 'Access Denied: Only authorized staff or administrators can modify credential flags.';
    END IF;
  END IF;

  -- 8. Gamification counters cannot be modified directly
  IF OLD.solved_problems_count <> NEW.solved_problems_count OR OLD.tests_completed_count <> NEW.tests_completed_count THEN
    RAISE EXCEPTION 'Access Denied: Gamification counters are updated only by verified scoring events.';
  END IF;

  RETURN NEW;
END;
$$;
