-- ==============================================================================
-- Yogneet Edu — Migration 20261101000009: Fix Credential Search Path & Inspection Column
-- ==============================================================================
-- 1. Updates admin_generate_temporary_credential to add extensions schema to search_path
--    so that pgcrypto's gen_random_bytes(integer) is resolved cleanly.
-- 2. Updates get_student_inspection_summary to reference assessment_attempts.attempt_id
--    instead of non-existent a.id.
-- ==============================================================================

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
  v_target public.profiles%ROWTYPE;
  v_random_token TEXT;
BEGIN
  -- Strict Authorization: Only admin or authorized staff can reset credentials
  IF NOT (
    public.is_admin()
    OR (v_caller_id IS NOT NULL AND (
      public.has_permission(v_caller_id, 'subadmins.manage')
      OR public.has_permission(v_caller_id, 'premium_students.manage')
    ))
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators or authorized staff can issue temporary credentials.';
  END IF;

  -- Caller identity resolution
  IF v_caller_id IS NOT NULL THEN
    SELECT name, email, role INTO v_actor_name, v_actor_email, v_actor_role
    FROM public.profiles
    WHERE id = v_caller_id;
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'User profile "%" not found.', p_user_id;
  END IF;

  -- Generate cryptographically random 16-character temporary credential (letters, digits, safe symbols)
  -- Uses encode(gen_random_bytes(...)) for non-deterministic cryptographic randomness
  v_random_token := 'Yg#' || encode(extensions.gen_random_bytes(6), 'hex') || '!9z';

  -- Mark account as requiring password reset on first login
  PERFORM set_config('yogneet.internal_auth_sync', 'on', true);

  UPDATE public.profiles
  SET must_change_password = true,
      last_active = timezone('utc'::text, now())
  WHERE id = p_user_id;

  PERFORM set_config('yogneet.internal_auth_sync', 'off', true);

  -- Append audit log WITHOUT storing the plaintext password
  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    actor_email,
    actor_role,
    action,
    resource_type,
    resource_id,
    details,
    outcome,
    changes
  ) VALUES (
    v_caller_id,
    COALESCE(v_actor_name, 'Admin'),
    COALESCE(v_actor_email, 'admin@yogneetedu.in'),
    COALESCE(v_actor_role, 'admin'),
    'ADMIN_TEMPORARY_CREDENTIAL_ISSUED',
    'profiles',
    p_user_id::TEXT,
    format('Generated secure random temporary credential for user "%s" (%s). Mandatory change on first login flagged.',
      v_target.name, v_target.email),
    'SUCCESS',
    jsonb_build_object(
      'must_change_password', true,
      'credential_policy', 'cryptographic_random_temporary'
    )
  );

  -- Return temporary token securely to authorized administrator session
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'name', v_target.name,
    'email', v_target.email,
    'temporary_credential', v_random_token,
    'must_change_password', true,
    'issued_at', timezone('utc'::text, now())
  );
END;
$$;

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
  -- Strict Authorization: Staff or Admins only
  IF NOT (
    public.is_admin()
    OR (v_caller_id IS NOT NULL AND (
      public.is_staff()
      OR public.has_permission(v_caller_id, 'students.view')
      OR public.has_permission(v_caller_id, 'premium_students.view')
    ))
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only staff and administrators may inspect student learning records.';
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
