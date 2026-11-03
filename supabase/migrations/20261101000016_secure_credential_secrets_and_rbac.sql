-- ==============================================================================
-- Yogneet Edu — Migration 20261101000016: Secure Credential Secrets & Target RBAC
-- ==============================================================================
-- 1. Creates restricted `private.user_temporary_credentials` table inaccessible
--    via PostgREST or client APIs (REVOKE ALL FROM PUBLIC, anon, authenticated).
-- 2. Drops `temporary_password_hash` and `temporary_credential_created_at` from
--    `public.profiles` to eliminate column-level leakage via profile SELECTs.
-- 3. Hardens `admin_generate_temporary_credential` with target-account RBAC:
--    - Target is admin: ONLY admin can reset.
--    - Target is subadmin: ONLY admin or staff with `subadmins.manage` can reset.
--      Staff with only `premium_students.manage` are strictly forbidden.
--    - Target is student: Admin or staff with `premium_students.manage` / `subadmins.manage`.
-- 4. Hardens `complete_mandatory_password_change`:
--    - Enforces 8+ character length, uppercase, lowercase, and number complexity.
--    - Verifies new password is distinct from the temporary credential.
--    - Cleanses temporary credential secrets upon completion.
-- 5. Hardens `protect_profile_privileged_fields` trigger to eliminate any
--    direct PostgREST clearing of `must_change_password`.
-- 6. Hardens `get_student_inspection_summary` so non-admin staff can only inspect
--    student accounts (`role = 'student'`).
-- ==============================================================================

-- 1. Restricted Private Schema & Table
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT ALL ON SCHEMA private TO postgres, service_role;

CREATE TABLE IF NOT EXISTS private.user_temporary_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  temporary_password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

REVOKE ALL ON TABLE private.user_temporary_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.user_temporary_credentials TO postgres, service_role;

-- 2. Drop sensitive credential metadata columns from public.profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS temporary_password_hash,
  DROP COLUMN IF EXISTS temporary_credential_created_at;

-- 3. Hardened admin_generate_temporary_credential with Target-Aware RBAC
CREATE OR REPLACE FUNCTION public.admin_generate_temporary_credential(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_actor_name TEXT := 'System Admin';
  v_actor_email TEXT := 'admin@yogneetedu.in';
  v_actor_role TEXT := 'admin';
  v_target_profile public.profiles%ROWTYPE;
  v_is_superadmin BOOLEAN := false;
  v_can_manage_subadmins BOOLEAN := false;
  v_can_manage_premium BOOLEAN := false;
  v_random_token TEXT;
  v_raw_hex TEXT;
  v_hashed_pw TEXT;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Trusted session overrides (postgres superuser or service_role key)
  IF session_user = 'postgres' OR auth.role() = 'service_role' THEN
    v_is_superadmin := true;
  END IF;

  -- Caller identity and privilege resolution
  IF v_caller_id IS NOT NULL THEN
    SELECT name, email, role INTO v_actor_name, v_actor_email, v_actor_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_actor_role = 'admin' OR public.is_admin() THEN
      v_is_superadmin := true;
    END IF;

    v_can_manage_subadmins := public.has_permission(v_caller_id, 'subadmins.manage');
    v_can_manage_premium := public.has_permission(v_caller_id, 'premium_students.manage');
  END IF;

  -- Base authentication requirement
  IF NOT (v_is_superadmin OR v_can_manage_subadmins OR v_can_manage_premium) THEN
    RAISE EXCEPTION 'Access Denied: Caller is not authorized to generate temporary credentials.';
  END IF;

  -- Verify target user profile exists
  SELECT * INTO v_target_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_profile.id IS NULL THEN
    RAISE EXCEPTION 'User profile "%" not found.', p_user_id;
  END IF;

  -- TARGET-AWARE RBAC AUTHORIZATION:
  -- Target is Admin: ONLY superadmin can reset credentials
  IF v_target_profile.role = 'admin' THEN
    IF NOT v_is_superadmin THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can reset administrator credentials.';
    END IF;
  -- Target is Sub-Admin (Staff): ONLY superadmin or staff with subadmins.manage can reset
  ELSIF v_target_profile.role = 'subadmin' THEN
    IF NOT (v_is_superadmin OR v_can_manage_subadmins) THEN
      RAISE EXCEPTION 'Access Denied: Only administrators or staff with subadmins.manage can reset staff credentials.';
    END IF;
  -- Target is Student: superadmin, staff with premium_students.manage, or staff with subadmins.manage
  ELSIF v_target_profile.role = 'student' THEN
    IF NOT (v_is_superadmin OR v_can_manage_premium OR v_can_manage_subadmins) THEN
      RAISE EXCEPTION 'Access Denied: You do not have permission to reset student credentials.';
    END IF;
  -- Any other target role
  ELSE
    IF NOT v_is_superadmin THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can reset credentials for this account type.';
    END IF;
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
    RAISE EXCEPTION 'Authentication identity for user "%" does not exist in auth.users.', p_user_id;
  END IF;

  -- Store credential hash ONLY in restricted private table (inaccessible via PostgREST)
  INSERT INTO private.user_temporary_credentials (
    user_id,
    temporary_password_hash,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_hashed_pw,
    v_now,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    temporary_password_hash = EXCLUDED.temporary_password_hash,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  -- Enforce mandatory password change flag on public.profiles (NO plaintext or hash stored here)
  UPDATE public.profiles
  SET
    must_change_password = true,
    last_active = v_now
  WHERE id = p_user_id;

  -- Security Audit Logging: Log operation metadata ONLY, never plaintext password
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
    format('Generated 128-bit temporary credential and enforced mandatory password change for account "%s" (%s, role: %s). Plaintext credentials omitted.',
      v_target_profile.name, v_target_profile.email, v_target_profile.role),
    'SUCCESS'
  );

  -- Return single-use response payload to the authorized caller
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

-- 4. Hardened complete_mandatory_password_change with Policy Consistency & Reuse Check
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

-- 5. Hardened protect_profile_privileged_fields Trigger
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
      -- Case B: Student attempting direct PostgREST update
      ELSIF v_caller_id = OLD.id THEN
        -- If temporary credential record exists, direct PostgREST bypass is strictly blocked!
        IF EXISTS (SELECT 1 FROM private.user_temporary_credentials WHERE user_id = OLD.id) THEN
          RAISE EXCEPTION 'Access Denied: Mandatory password flag cannot be cleared directly. Complete the password reset workflow.';
        END IF;

        -- Even if no record in private table, students cannot clear must_change_password via PostgREST
        RAISE EXCEPTION 'Access Denied: Mandatory password flag must be completed via the password change service.';
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

-- 6. Hardened get_student_inspection_summary: Restrict Staff to Inspecting Students Only
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
  v_is_superadmin BOOLEAN := false;
BEGIN
  -- Resolve superadmin status
  IF session_user = 'postgres' OR auth.role() = 'service_role' OR public.is_admin() THEN
    v_is_superadmin := true;
  END IF;

  -- Strict Granular Authorization
  IF NOT (
    v_is_superadmin
    OR (v_caller_id IS NOT NULL AND (
      public.has_permission(v_caller_id, 'students.view')
      OR public.has_permission(v_caller_id, 'premium_students.view')
      OR public.has_permission(v_caller_id, 'premium_students.manage')
    ))
  ) THEN
    RAISE EXCEPTION 'Access Denied: Requires students.view, premium_students.view, or administrator privileges.';
  END IF;

  -- Caller identity resolution
  IF v_caller_id IS NOT NULL THEN
    SELECT name, email, role INTO v_actor_name, v_actor_email, v_actor_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_actor_role = 'admin' THEN
      v_is_superadmin := true;
    END IF;
  END IF;

  -- Retrieve student profile
  SELECT * INTO v_student
  FROM public.profiles
  WHERE id = p_student_id;

  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'Student with ID "%" not found.', p_student_id;
  END IF;

  -- TARGET ACCOUNT RESTRICTION: Non-admin staff cannot inspect staff or admin accounts
  IF v_student.role <> 'student' AND NOT v_is_superadmin THEN
    RAISE EXCEPTION 'Access Denied: Staff members can only inspect student accounts.';
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
