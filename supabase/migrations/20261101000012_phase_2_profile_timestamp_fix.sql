-- ==============================================================================
-- Yogneet Edu — Migration 20261101000012: Fix Profile Timestamp Reference
-- ==============================================================================
-- Public profiles table uses `last_active` for activity timestamp (not `updated_at`).
-- This migration updates `admin_generate_temporary_credential` and
-- `upgrade_student_to_premium` to update `last_active`.
-- ==============================================================================

-- 1. UPDATE ADMIN_GENERATE_TEMPORARY_CREDENTIAL
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
BEGIN
  -- Strict Caller Authorization Check: Must be admin or staff with credentials/subadmins manage permission
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
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authentication identity for student "%" does not exist in auth.users.', p_user_id;
  END IF;

  -- Enforce mandatory password change flag on profile using last_active
  UPDATE public.profiles
  SET
    must_change_password = true,
    last_active = timezone('utc'::text, now())
  WHERE id = p_user_id;

  -- Write audit log (Strictly ZERO PLAINTEXT logging)
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
    COALESCE(v_actor_email, 'staff@yogneetedu.in'),
    COALESCE(v_actor_role, 'admin'),
    'USER_PASSWORD_RESET',
    'profiles',
    p_user_id::TEXT,
    format('Generated 128-bit temporary credential and enforced mandatory password change for student "%s" (%s). Plaintext credentials omitted.',
      v_target_profile.name, v_target_profile.email),
    'SUCCESS'
  );

  -- Return temporary credential ONLY ONCE to authorized caller
  RETURN jsonb_build_object(
    'temporary_credential', v_random_token,
    'entropy_bits', 128,
    'must_change_password', true,
    'user_id', p_user_id,
    'issued_at', timezone('utc'::text, now())
  );
END;
$$;

-- 2. UPDATE UPGRADE_STUDENT_TO_PREMIUM
CREATE OR REPLACE FUNCTION public.upgrade_student_to_premium(
  p_user_id UUID,
  p_year INTEGER DEFAULT 2026,
  p_phone TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_actor_name TEXT := 'System Admin';
  v_actor_email TEXT := 'admin@yogneetedu.in';
  v_actor_role TEXT := 'admin';
  v_target_profile public.profiles%ROWTYPE;
  v_enrollment_num TEXT;
  v_seq INTEGER;
  v_proposed_email TEXT;
  v_base_username TEXT;
  v_counter INTEGER := 1;
BEGIN
  -- Strict Authorization: Admin or staff with premium_students.manage
  IF NOT (
    public.is_admin()
    OR (v_caller_id IS NOT NULL AND public.has_permission(v_caller_id, 'premium_students.manage'))
    OR auth.role() = 'service_role'
    OR session_user = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators or authorized staff can upgrade students to premium status.';
  END IF;

  -- Resolve caller metadata for audit logging
  IF v_caller_id IS NOT NULL THEN
    SELECT name, email, role INTO v_actor_name, v_actor_email, v_actor_role
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  -- Validate target profile
  SELECT * INTO v_target_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_profile.id IS NULL THEN
    RAISE EXCEPTION 'Target student profile "%" not found.', p_user_id;
  END IF;

  IF v_target_profile.is_premium = true AND v_target_profile.enrollment_number IS NOT NULL THEN
    RAISE EXCEPTION 'Student "%" is already a registered Premium Student with Enrollment Number %.',
      v_target_profile.name, v_target_profile.enrollment_number;
  END IF;

  -- Generate atomic sequential enrollment number
  SELECT enrollment_number, seq_num INTO v_enrollment_num, v_seq
  FROM public.generate_next_enrollment_number(COALESCE(p_year, 2026));

  -- Generate proposed email under username@yogneet.edu convention
  v_base_username := lower(regexp_replace(v_target_profile.name, '[^a-zA-Z0-9]+', '.', 'g'));
  v_base_username := trim(both '.' from v_base_username);
  IF v_base_username = '' THEN
    v_base_username := 'student';
  END IF;

  v_proposed_email := v_base_username || '@yogneet.edu';

  -- Ensure uniqueness of yogneet_email
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE yogneet_email = v_proposed_email AND id <> p_user_id) LOOP
    v_counter := v_counter + 1;
    v_proposed_email := v_base_username || '.' || v_counter::TEXT || '@yogneet.edu';
  END LOOP;

  -- Update profile using last_active
  UPDATE public.profiles
  SET
    is_premium = true,
    access_category = 'pro',
    enrollment_number = v_enrollment_num,
    sequential_number = v_seq,
    admission_year = COALESCE(p_year, 2026),
    yogneet_email = v_proposed_email,
    phone = COALESCE(p_phone, phone),
    department = COALESCE(p_department, department),
    last_active = timezone('utc'::text, now())
  WHERE id = p_user_id;

  -- Write immutable audit record
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
    COALESCE(v_actor_name, 'System Administrator'),
    COALESCE(v_actor_email, 'admin@yogneetedu.in'),
    COALESCE(v_actor_role, 'admin'),
    'STUDENT_PREMIUM_UPGRADE',
    'profiles',
    p_user_id::TEXT,
    format('Upgraded student "%s" (Auth UUID %s) to Premium. Assigned Enrollment: %s, Yogneet Email: %s, Year: %s, Seq: %s.',
      v_target_profile.name, p_user_id, v_enrollment_num, v_proposed_email, COALESCE(p_year, 2026), v_seq),
    'SUCCESS'
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'name', v_target_profile.name,
    'email', v_target_profile.email,
    'is_premium', true,
    'access_category', 'pro',
    'enrollment_number', v_enrollment_num,
    'sequential_number', v_seq,
    'admission_year', COALESCE(p_year, 2026),
    'yogneet_email', v_proposed_email,
    'converted_at', timezone('utc'::text, now())
  );
END;
$$;
