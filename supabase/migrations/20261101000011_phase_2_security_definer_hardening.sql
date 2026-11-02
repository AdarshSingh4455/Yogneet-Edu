-- ==============================================================================
-- Yogneet Edu — Migration 20261101000011: Phase 2 Security Definer Hardening
-- ==============================================================================
-- Fixes PostgreSQL SECURITY DEFINER execution context:
-- In PostgreSQL, `current_user` inside a SECURITY DEFINER function resolves to the
-- function's definer/owner ('postgres') rather than the connecting client.
-- Evaluating `current_user = 'postgres'` inadvertently causes authorization to pass
-- for all unprivileged callers connecting via PostgREST.
--
-- This migration updates all Phase 2 privileged SECURITY DEFINER functions to use:
--   1. `session_user = 'postgres'` (for direct database connections)
--   2. `auth.role() = 'service_role'` (for trusted server-side API clients)
--   3. `public.is_admin()` and explicit `has_permission()` checks for authenticated users.
-- ==============================================================================

-- 1. HARDEN HAS_PERMISSION PRIVACY BOUNDARY
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id UUID,
  p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  -- Strict Privacy Boundary:
  -- A user can only inspect their own permissions (p_user_id = auth.uid())
  -- Only active staff/admin, service_role, or direct postgres superuser session may query other users' permissions.
  IF auth.role() <> 'service_role' AND session_user <> 'postgres' AND (v_caller IS NULL OR v_caller IS DISTINCT FROM p_user_id) THEN
    IF NOT (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_caller AND role IN ('admin', 'subadmin') AND status = 'active'
      )
    ) THEN
      RAISE EXCEPTION 'Access Denied: You cannot query authorization permissions for other user accounts.';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'admin' AND status = 'active'
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.profiles p ON p.id = up.user_id
    WHERE up.user_id = p_user_id
      AND up.permission_key = p_permission_key
      AND p.status = 'active'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated, service_role;

-- 2. HARDEN ADMIN_GENERATE_TEMPORARY_CREDENTIAL
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

  -- Enforce mandatory password change flag on profile
  UPDATE public.profiles
  SET
    must_change_password = true,
    updated_at = timezone('utc'::text, now())
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

REVOKE ALL ON FUNCTION public.admin_generate_temporary_credential(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generate_temporary_credential(UUID) TO authenticated, service_role;

-- 3. HARDEN GENERATE_NEXT_ENROLLMENT_NUMBER
CREATE OR REPLACE FUNCTION public.generate_next_enrollment_number(p_year INTEGER DEFAULT 2026)
RETURNS TABLE (
  enrollment_number TEXT,
  seq_num INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_next_seq INTEGER;
  v_caller UUID := auth.uid();
BEGIN
  -- Strict Caller Authorization: Only Admin, staff with premium_students.manage, or backend service_role
  IF NOT (
    public.is_admin()
    OR (v_caller IS NOT NULL AND public.has_permission(v_caller, 'premium_students.manage'))
    OR auth.role() = 'service_role'
    OR session_user = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Caller is not authorized to generate enrollment numbers.';
  END IF;

  INSERT INTO public.enrollment_sequences (year, last_sequence, updated_at)
  VALUES (p_year, 1, timezone('utc'::text, now()))
  ON CONFLICT (year) DO UPDATE
    SET last_sequence = public.enrollment_sequences.last_sequence + 1,
        updated_at = timezone('utc'::text, now())
  RETURNING public.enrollment_sequences.last_sequence INTO v_next_seq;

  IF v_next_seq < 1000 THEN
    RETURN QUERY SELECT p_year::TEXT || lpad(v_next_seq::TEXT, 3, '0'), v_next_seq;
  ELSE
    RETURN QUERY SELECT p_year::TEXT || v_next_seq::TEXT, v_next_seq;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_next_enrollment_number(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_next_enrollment_number(INTEGER) TO authenticated, service_role;

-- 4. HARDEN GET_STUDENT_INSPECTION_SUMMARY
CREATE OR REPLACE FUNCTION public.get_student_inspection_summary(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_actor_name TEXT := 'Staff';
  v_actor_email TEXT := 'staff@yogneetedu.in';
  v_actor_role TEXT := 'subadmin';
  v_student public.profiles%ROWTYPE;
  v_recent_attempts JSONB;
  v_total_attempts INTEGER;
  v_avg_score NUMERIC;
  v_subjects_summary JSONB;
BEGIN
  -- Strict Granular Authorization: Must have students.view or premium_students.view (no broad is_staff)
  IF NOT (
    public.is_admin()
    OR (v_caller_id IS NOT NULL AND (
      public.has_permission(v_caller_id, 'students.view')
      OR public.has_permission(v_caller_id, 'premium_students.view')
      OR public.has_permission(v_caller_id, 'premium_students.manage')
    ))
    OR auth.role() = 'service_role'
    OR session_user = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Requires students.view, premium_students.view, or administrator privileges.';
  END IF;

  -- Caller identity resolution
  IF v_caller_id IS NOT NULL THEN
    SELECT name, email, role INTO v_actor_name, v_actor_email, v_actor_role
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  -- Retrieve student profile
  SELECT * INTO v_student
  FROM public.profiles
  WHERE id = p_student_id;

  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'Student with ID "%" not found.', p_student_id;
  END IF;

  -- Append audit log for read-only inspection access
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
    COALESCE(v_actor_name, 'Staff'),
    COALESCE(v_actor_email, 'staff@yogneetedu.in'),
    COALESCE(v_actor_role, 'subadmin'),
    'ACCOUNT_INSPECTION_ACCESSED',
    'profiles',
    p_student_id::TEXT,
    format('Inspected academic snapshot and assessment records for student "%s" (%s).',
      v_student.name, v_student.email),
    'SUCCESS'
  );

  -- Aggregate assessment attempts using attempt_id primary key
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.attempt_id,
        'title', COALESCE(asm.title, 'Assessment Quiz'),
        'score', a.score_obtained,
        'maxScore', a.max_score,
        'percentage', a.percentage,
        'passed', a.passed,
        'submittedAt', a.submitted_at
      ) ORDER BY a.submitted_at DESC
    ), '[]'::jsonb),
    COUNT(*),
    COALESCE(ROUND(AVG(a.percentage), 1), 0)
  INTO v_recent_attempts, v_total_attempts, v_avg_score
  FROM public.assessment_attempts a
  LEFT JOIN public.assessments asm ON asm.id = a.test_id
  WHERE a.user_id = p_student_id;

  -- Aggregate enrolled subjects
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'slug', s.slug,
      'icon', s.icon,
      'colorScheme', s.color_scheme
    ) ORDER BY s.display_order ASC
  ), '[]'::jsonb)
  INTO v_subjects_summary
  FROM public.subjects s
  WHERE s.is_active = true;

  RETURN jsonb_build_object(
    'student', jsonb_build_object(
      'id', v_student.id,
      'name', v_student.name,
      'email', v_student.email,
      'yogneetEmail', v_student.yogneet_email,
      'enrollmentNumber', v_student.enrollment_number,
      'isPremium', v_student.is_premium,
      'accessCategory', v_student.access_category,
      'admissionYear', v_student.admission_year,
      'sequentialNumber', v_student.sequential_number,
      'department', v_student.department,
      'phone', v_student.phone,
      'status', v_student.status,
      'createdAt', v_student.created_at,
      'lastActive', v_student.last_active
    ),
    'academicSnapshot', jsonb_build_object(
      'totalAssessmentAttempts', v_total_attempts,
      'averageScorePercentage', v_avg_score,
      'recentAttempts', v_recent_attempts
    ),
    'enrolledSubjects', v_subjects_summary,
    'inspectedAt', timezone('utc'::text, now()),
    'inspectedBy', jsonb_build_object(
      'actorId', v_caller_id,
      'actorName', v_actor_name,
      'actorRole', v_actor_role
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_inspection_summary(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_inspection_summary(UUID) TO authenticated, service_role;

-- 5. HARDEN PROTECT_PROFILE_PRIVILEGED_FIELDS TRIGGER
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
  END IF;

  -- 3. Non-admins cannot alter role, account status, or access tier
  IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.access_category <> NEW.access_category THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles, account status, or access tiers.';
  END IF;

  -- 4. Non-admins cannot alter authoritative email directly
  IF OLD.email <> NEW.email THEN
    RAISE EXCEPTION 'Access Denied: Email address is managed through authentication credentials.';
  END IF;

  -- 5. Non-admins cannot modify account creation timestamp
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Access Denied: Account creation timestamp is immutable.';
  END IF;

  -- 6. Premium student fields can ONLY be modified by Admin or Staff with premium_students.manage
  IF (OLD.is_premium IS DISTINCT FROM NEW.is_premium)
     OR (OLD.enrollment_number IS DISTINCT FROM NEW.enrollment_number)
     OR (OLD.admission_year IS DISTINCT FROM NEW.admission_year)
     OR (OLD.sequential_number IS DISTINCT FROM NEW.sequential_number)
     OR (OLD.yogneet_email IS DISTINCT FROM NEW.yogneet_email) THEN
    IF NOT v_can_manage_premium THEN
      RAISE EXCEPTION 'Access Denied: Only administrators or staff with premium_students.manage can modify premium student entitlements.';
    END IF;
  END IF;

  -- 7. Password reset flag: can only be set to true by staff with manage permissions,
  -- or set to false by the user themselves upon completing mandatory password change
  IF (OLD.must_change_password IS DISTINCT FROM NEW.must_change_password) THEN
    IF NEW.must_change_password = false AND v_caller_id = OLD.id THEN
      -- User clearing their own must_change_password flag: allowed
      NULL;
    ELSIF NOT (v_can_manage_premium OR public.has_permission(v_caller_id, 'subadmins.manage')) THEN
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

-- 6. HARDEN UPGRADE_STUDENT_TO_PREMIUM
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

  -- Update profile (authorized directly via RBAC permissions in trigger)
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
    updated_at = timezone('utc'::text, now())
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

REVOKE ALL ON FUNCTION public.upgrade_student_to_premium(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upgrade_student_to_premium(UUID, INTEGER, TEXT, TEXT) TO authenticated, service_role;
