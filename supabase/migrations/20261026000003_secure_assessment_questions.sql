-- ==============================================================================
-- Migration: 20261026000003_secure_assessment_questions.sql
-- Project: Yogneet Edu (Branded: Tech Geek Adarsh)
-- Description: Hardens assessment question visibility to eliminate answer leakage:
--   1. Restricts full table access on public.assessment_questions to staff and
--      students who have already submitted an assessment attempt.
--   2. Provides a dedicated SECURITY DEFINER RPC function and sanitized view
--      (public.student_assessment_questions) that strictly exclude solutions.
-- ==============================================================================

-- 1. Replace overly permissive SELECT policy on public.assessment_questions
DROP POLICY IF EXISTS "assessment_questions_select_active" ON public.assessment_questions;

-- Policy A: Staff / Instructors / Admins have unrestricted access to full questions & explanations
CREATE POLICY "assessment_questions_select_staff"
  ON public.assessment_questions
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- Policy B: Students can only view full questions & explanations AFTER submitting an attempt
CREATE POLICY "assessment_questions_select_post_submission"
  ON public.assessment_questions
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user() AND EXISTS (
      SELECT 1 FROM public.assessment_attempts
      WHERE assessment_attempts.test_id = assessment_questions.test_id
        AND assessment_attempts.user_id = auth.uid()
    )
  );

-- 2. Create RPC function for active test taking (omits correct_answer_id and explanation)
CREATE OR REPLACE FUNCTION public.get_assessment_questions_for_taking(p_test_id TEXT)
RETURNS TABLE (
  id TEXT,
  test_id TEXT,
  question_number INTEGER,
  text TEXT,
  code_snippet TEXT,
  code_language TEXT,
  options JSONB,
  marks NUMERIC,
  negative_marks NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    q.id,
    q.test_id,
    q.question_number,
    q.text,
    q.code_snippet,
    q.code_language,
    q.options,
    q.marks,
    q.negative_marks
  FROM public.assessment_questions q
  WHERE q.test_id = p_test_id
    AND public.is_active_user();
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_assessment_questions_for_taking(TEXT) TO authenticated;

-- 3. Create sanitized view for test-taking clients
CREATE OR REPLACE VIEW public.student_assessment_questions AS
  SELECT
    q.id,
    q.test_id,
    q.question_number,
    q.text,
    q.code_snippet,
    q.code_language,
    q.options,
    q.marks,
    q.negative_marks
  FROM public.assessment_questions q
  WHERE public.is_active_user();

-- Grant read-only access to view for authenticated users
GRANT SELECT ON public.student_assessment_questions TO authenticated;
