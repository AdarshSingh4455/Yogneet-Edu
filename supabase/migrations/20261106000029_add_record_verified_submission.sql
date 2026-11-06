-- ==============================================================================
-- Migration: 20261106000029_add_record_verified_submission.sql
-- Description: Server-authoritative submission recording restricted strictly to service_role.
--              Enforces that accepted submissions can ONLY originate from the trusted execution proxy.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_verified_submission(
  p_user_id UUID,
  p_problem_id UUID,
  p_language TEXT,
  p_code TEXT,
  p_status TEXT,
  p_test_cases_passed INTEGER,
  p_total_test_cases INTEGER,
  p_runtime_ms INTEGER,
  p_memory_mb NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_submission_id UUID;
  v_already_solved BOOLEAN := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required.';
  END IF;

  IF p_status NOT IN ('accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compile_error') THEN
    RAISE EXCEPTION 'Invalid submission status.';
  END IF;

  -- Check if user already had an accepted submission prior to this
  SELECT EXISTS (
    SELECT 1 FROM public.coding_submissions
    WHERE user_id = p_user_id
      AND problem_id = p_problem_id
      AND status = 'accepted'
  ) INTO v_already_solved;

  -- Insert submission (fires trg_coding_submissions_metrics -> sync_profile_coding_metrics)
  INSERT INTO public.coding_submissions (
    user_id, problem_id, language, code, status,
    test_cases_passed, total_test_cases, runtime_ms, memory_mb
  ) VALUES (
    p_user_id, p_problem_id, p_language, p_code, p_status,
    p_test_cases_passed, p_total_test_cases, p_runtime_ms, p_memory_mb
  )
  RETURNING id INTO v_submission_id;

  -- Update problem statistics atomically
  UPDATE public.coding_problems
  SET total_submissions = total_submissions + 1,
      total_accepted = CASE WHEN p_status = 'accepted' THEN total_accepted + 1 ELSE total_accepted END,
      acceptance_rate = ROUND(((total_accepted + CASE WHEN p_status = 'accepted' THEN 1 ELSE 0 END)::numeric / (total_submissions + 1)::numeric) * 100, 1) || '%'
  WHERE id = p_problem_id;

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'status', p_status,
    'test_cases_passed', p_test_cases_passed,
    'total_test_cases', p_total_test_cases,
    'runtime_ms', p_runtime_ms,
    'memory_mb', p_memory_mb,
    'is_first_solve', (p_status = 'accepted' AND NOT v_already_solved)
  );
END;
$$;

-- Critical security boundary: Revoke execution from public, anon, and authenticated.
-- ONLY service_role (the trusted Edge Function) and postgres can execute this function.
REVOKE ALL ON FUNCTION public.record_verified_submission(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_verified_submission(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC) FROM authenticated;
REVOKE ALL ON FUNCTION public.record_verified_submission(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_verified_submission(UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, NUMERIC) TO service_role;
