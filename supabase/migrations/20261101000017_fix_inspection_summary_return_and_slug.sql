-- ==============================================================================
-- Yogneet Edu — Migration 20261101000017: Fix Inspection Summary Return and Slug
-- ==============================================================================
-- Updates get_student_inspection_summary to use s.slug (not s.code) and maintain
-- backwards compatibility with { student, academicSnapshot, enrolledSubjects }.
-- ==============================================================================

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

  -- Aggregate enrolled subjects using valid columns (id, name, slug, icon, color_scheme)
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
