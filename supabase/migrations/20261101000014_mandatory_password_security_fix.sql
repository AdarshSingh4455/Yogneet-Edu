-- ==============================================================================
-- Yogneet Edu — Migration 20261101000014: Mandatory Password Security Fix &
-- Permission Standardization
-- ==============================================================================
-- 1. Adds `temporary_credential_created_at` and `temporary_password_hash`
--    columns to `public.profiles` for cryptographic verification of password changes.
-- 2. Updates `public.admin_generate_temporary_credential` to track issuance timestamp
--    and temporary password hash, while strictly checking registered permissions
--    (`subadmins.manage` or `premium_students.manage`).
-- 3. Implements atomic RPC `public.complete_mandatory_password_change(p_new_password TEXT)`
--    that verifies password criteria, updates `auth.users`, and clears the flag.
-- 4. Hardens `protect_profile_privileged_fields` trigger to eliminate direct client
--    bypasses: direct PostgREST updates cannot clear `must_change_password` unless
--    an actual password update occurred in `auth.users` after credential issuance.
-- 5. Standardizes all permission checks to registered granular keys:
--    `subadmins.manage`, `premium_students.manage`, `students.suspend`, `students.view`.
-- ==============================================================================

-- 1. Schema Extensions on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS temporary_credential_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS temporary_password_hash TEXT;

-- 2. Hardened admin_generate_temporary_credential
CREATE OR REPLACE FUNCTION public.admin_generate_temporary_credential(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_actor_name TEXT := 'System Admin';
  v_actor_email TEXT := 'admin@yogneetedu.in';
  v_actor_role TEXT := 'admin';
  v_target_profile public.profiles%ROWTYPE;
  v_random_token TEXT;
  v_raw_hex TEXT;
  v_hashed_pw TEXT;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Strict Caller Authorization Check: Must be admin or staff with granular manage permissions
  IF NOT (
    public.is_admin()
    OR (v_caller_id IS NOT NULL AND (
      public.has_permission(v_caller_id, 'subadmins.manage')
      OR public.has_permission(v_caller_id, 'premium_students.manage')
    ))
    OR auth.role() = 'service_role'
    OR session_user = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators or authorized staff can generate temporary credentials.';
  END IF;

  -- Caller identity resolution
  IF v_caller_id IS NOT NULL THEN
    SELECT name, email, role INTO v_actor_name, v_actor_email, v_actor_role
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  -- Verify target student profile
  SELECT * INTO v_target_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_profile.id IS NULL THEN
    RAISE EXCEPTION 'User profile "%" not found.', p_user_id;
  END IF;

  -- Cryptographically Secure Random Password Generation:
  -- 16 bytes = 128 bits of cryptographic entropy via extensions.gen_random_bytes
  v_raw_hex := encode(extensions.gen_random_bytes(16), 'hex');
  v_random_token := 'Yg#' || v_raw_hex || '!9Z';

  -- Hash password with Blowfish (bcrypt) work factor 10
  v_hashed_pw := extensions.crypt(v_random_token, extensions.gen_salt('bf', 10));

  -- Apply directly to auth.users server-side
  UPDATE auth.users
  SET
    encrypted_password = v_hashed_pw,
    updated_at = v_now
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authentication identity for student "%" does not exist in auth.users.', p_user_id;
  END IF;

  -- Enforce mandatory password change flag and store issuance metadata on profile
  UPDATE public.profiles
  SET
    must_change_password = true,
    temporary_credential_created_at = v_now,
    temporary_password_hash = v_hashed_pw,
    last_active = v_now
  WHERE id = p_user_id;

  -- Security Audit Logging: Log action metadata ONLY, never plaintext password
  INSERT INTO public.audit_logs (
    action,
    actor_id,
    actor_name,
    actor_email,
    actor_role,
    target_id,
    target_type,
    details,
    created_at
  ) VALUES (
    'admin_generated_temporary_credential',
    v_caller_id,
    v_actor_name,
    v_actor_email,
    v_actor_role,
    p_user_id::text,
    'user_credentials',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', v_target_profile.email,
      'must_change_password', true,
      'entropy_bits', 128,
      'issued_at', v_now
    ),
    v_now
  );

  -- Return single-use response payload to the authorized administrator
  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'email', v_target_profile.email,
    'temporary_credential', v_random_token,
    'must_change_password', true,
    'entropy_bits', 128,
    'note', 'This temporary credential has been securely applied to Supabase Auth. It is displayed only once and never persisted in plaintext.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_generate_temporary_credential(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generate_temporary_credential(UUID) TO authenticated, service_role;

-- 3. Atomic Trusted Mandatory Password Change RPC
CREATE OR REPLACE FUNCTION public.complete_mandatory_password_change(p_new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_name TEXT := 'Student';
  v_caller_email TEXT;
  v_caller_role TEXT := 'student';
  v_target_profile public.profiles%ROWTYPE;
  v_hashed_pw TEXT;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- 1. Must be authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: You must be logged in to change your password.';
  END IF;

  -- 2. Validate password requirements
  IF p_new_password IS NULL OR length(trim(p_new_password)) < 6 THEN
    RAISE EXCEPTION 'Validation Error: Password must be at least 6 characters long.';
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

  -- 4. Hash new password securely with bcrypt
  v_hashed_pw := extensions.crypt(trim(p_new_password), extensions.gen_salt('bf', 10));

  -- 5. Update auth.users atomically
  UPDATE auth.users
  SET
    encrypted_password = v_hashed_pw,
    updated_at = v_now
  WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authentication identity not found in auth.users.';
  END IF;

  -- 6. Clear must_change_password flag on public.profiles and wipe temporary token metadata
  UPDATE public.profiles
  SET
    must_change_password = false,
    temporary_credential_created_at = NULL,
    temporary_password_hash = NULL,
    last_active = v_now
  WHERE id = v_caller_id;

  -- 7. Audit log the password change
  INSERT INTO public.audit_logs (
    action,
    actor_id,
    actor_name,
    actor_email,
    actor_role,
    target_id,
    target_type,
    details,
    created_at
  ) VALUES (
    'mandatory_password_changed',
    v_caller_id,
    v_caller_name,
    v_caller_email,
    v_caller_role,
    v_caller_id::text,
    'user_credentials',
    jsonb_build_object(
      'target_user_id', v_caller_id,
      'must_change_password', false,
      'status', 'completed',
      'completed_at', v_now
    ),
    v_now
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

-- 4. Hardened protect_profile_privileged_fields Trigger
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_can_manage_premium BOOLEAN := false;
  v_can_manage_subadmins BOOLEAN := false;
  v_auth_updated_at TIMESTAMPTZ;
  v_auth_encrypted_pw TEXT;
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

  -- 7. Password reset flag: Strict Verification & Bypass Prevention
  -- Ordinary PostgREST profile updates CANNOT clear must_change_password without
  -- a cryptographically verified update in auth.users that took place AFTER issuance.
  IF (OLD.must_change_password IS DISTINCT FROM NEW.must_change_password) THEN
    IF NEW.must_change_password = false THEN
      -- Case A: Authorized administrator or staff override
      IF v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins THEN
        NEW.temporary_credential_created_at := NULL;
        NEW.temporary_password_hash := NULL;
      -- Case B: Student clearing their own flag — MUST verify auth.users was updated!
      ELSIF v_caller_id = OLD.id THEN
        SELECT updated_at, encrypted_password INTO v_auth_updated_at, v_auth_encrypted_pw
        FROM auth.users
        WHERE id = OLD.id;

        -- Verify that auth.users was updated AFTER the temporary credential was issued
        -- AND the password hash is no longer the temporary password hash
        IF v_auth_updated_at IS NULL
           OR (OLD.temporary_credential_created_at IS NOT NULL AND v_auth_updated_at <= OLD.temporary_credential_created_at)
           OR (OLD.temporary_password_hash IS NOT NULL AND v_auth_encrypted_pw = OLD.temporary_password_hash) THEN
          RAISE EXCEPTION 'Access Denied: Mandatory password flag cannot be cleared without completing a verified password change in the authentication system.';
        END IF;

        -- Verified: Clean up temporary credential metadata on profile
        NEW.temporary_credential_created_at := NULL;
        NEW.temporary_password_hash := NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Unauthorized attempt to modify credential flags.';
      END IF;
    ELSIF NOT (v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins) THEN
      RAISE EXCEPTION 'Access Denied: Only authorized staff or administrators can modify credential flags.';
    END IF;
  END IF;

  -- 8. Temporary credential metadata columns are strictly immutable by clients
  IF (OLD.temporary_credential_created_at IS DISTINCT FROM NEW.temporary_credential_created_at AND NEW.temporary_credential_created_at IS NOT NULL)
     OR (OLD.temporary_password_hash IS DISTINCT FROM NEW.temporary_password_hash AND NEW.temporary_password_hash IS NOT NULL) THEN
    IF NOT (v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins) THEN
      RAISE EXCEPTION 'Access Denied: Temporary credential metadata cannot be modified directly.';
    END IF;
  END IF;

  -- 9. Gamification counters cannot be modified directly
  IF OLD.solved_problems_count <> NEW.solved_problems_count OR OLD.tests_completed_count <> NEW.tests_completed_count THEN
    RAISE EXCEPTION 'Access Denied: Gamification counters are updated only by verified scoring events.';
  END IF;

  RETURN NEW;
END;
$$;
