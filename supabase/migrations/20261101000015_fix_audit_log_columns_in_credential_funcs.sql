-- ==============================================================================
-- Yogneet Edu — Migration 20261101000015: Fix Audit Log Columns in Credential RPCs
-- ==============================================================================
-- Aligns audit log columns (actor_id, actor_name, actor_email, actor_role,
-- action, resource_type, resource_id, details, outcome) in credential RPCs.
-- ==============================================================================

-- 1. Hardened admin_generate_temporary_credential
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
    COALESCE(v_actor_name, 'Staff Administrator'),
    COALESCE(v_actor_email, 'admin@yogneetedu.in'),
    COALESCE(v_actor_role, 'admin'),
    'USER_PASSWORD_RESET',
    'profiles',
    p_user_id::text,
    format('Generated 128-bit temporary credential and enforced mandatory password change for student "%s" (%s). Plaintext credentials omitted.', v_target_profile.name, v_target_profile.email),
    'SUCCESS'
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

-- 2. Atomic Trusted Mandatory Password Change RPC
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
    'Mandatory password change successfully completed and verified by authentication system.',
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
