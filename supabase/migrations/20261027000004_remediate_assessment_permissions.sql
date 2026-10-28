-- ==============================================================================
-- Migration: 20261027000004_remediate_assessment_permissions.sql
-- Project: Yogneet Edu (Branded: Tech Geek Adarsh)
-- Description: Forward-only corrective remediation for assessment RPC privileges,
--              server-authoritative scoring, and question confidentiality:
--   1. Ensures public.assessment_attempts.is_verified column exists (default false).
--   2. Enforces server-authoritative submission RPC submit_assessment_attempt()
--      with exact parameter signatures and deterministic option validation.
--   3. Sets explicit least-privilege grants: REVOKE from public/anon, GRANT to authenticated.
--   4. Hardens taking RPC get_assessment_questions_for_taking() and sanitized view.
--   5. Restricts post-submission question review strictly to verified attempts.
--   6. Guards profile gamification counters against nested trigger tampering.
-- ==============================================================================

-- 1. Ensure attempt verification column exists (untrusted legacy default)
ALTER TABLE public.assessment_attempts
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Revoke direct client INSERT on assessment_attempts to block fake attempt injection
DROP POLICY IF EXISTS "assessment_attempts_insert_own" ON public.assessment_attempts;

-- 2. Hardened Profile Privileged Fields Trigger
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Internal trigger defense: pg_trigger_depth() cannot be spoofed by any client or parameter.
  -- If invoked as a secondary trigger from a verified internal table operation (e.g. attempt insertion),
  -- allow gamification counter synchronization while strictly protecting identity/role fields.
  IF pg_trigger_depth() > 1 THEN
    -- Ensure all core identity, role, status, bio, and other counters remain strictly immutable
    IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.email <> NEW.email
       OR OLD.created_at <> NEW.created_at OR OLD.solved_problems_count <> NEW.solved_problems_count
       OR OLD.name <> NEW.name OR OLD.avatar_url <> NEW.avatar_url
       OR OLD.department <> NEW.department OR OLD.bio <> NEW.bio
       OR OLD.enrolled_courses <> NEW.enrolled_courses THEN
      RAISE EXCEPTION 'Access Denied: Core identity and authorization fields cannot be modified via trigger.';
    END IF;
    -- Restrict tests_completed_count to exact sequential increment (+1) or unchanged
    IF NEW.tests_completed_count <> OLD.tests_completed_count AND NEW.tests_completed_count <> OLD.tests_completed_count + 1 THEN
      RAISE EXCEPTION 'Access Denied: tests_completed_count can only be incremented sequentially.';
    END IF;
    RETURN NEW;
  END IF;

  -- Determine requester role from public.profiles
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- If requester is super admin, allow all modifications
  IF current_user_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot alter role or account status
  IF OLD.role <> NEW.role OR OLD.status <> NEW.status THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles or account status.';
  END IF;

  -- Non-admins cannot alter authoritative email directly
  IF OLD.email <> NEW.email THEN
    RAISE EXCEPTION 'Access Denied: Email address is managed through authentication credentials.';
  END IF;

  -- Non-admins cannot modify account creation timestamp
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Access Denied: Account creation timestamp is immutable.';
  END IF;

  -- Non-admins cannot tamper with problem and test metrics directly
  IF OLD.solved_problems_count <> NEW.solved_problems_count OR OLD.tests_completed_count <> NEW.tests_completed_count THEN
    RAISE EXCEPTION 'Access Denied: Gamification counters are updated only by verified scoring events.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Dedicated internal trigger for gamification metrics sync
CREATE OR REPLACE FUNCTION public.sync_profile_test_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  UPDATE public.profiles
  SET tests_completed_count = tests_completed_count + 1,
      last_active = timezone('utc'::text, now())
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_attempts_metrics ON public.assessment_attempts;
CREATE TRIGGER trg_assessment_attempts_metrics
  AFTER INSERT ON public.assessment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_test_metrics();

-- 4. Server-Authoritative Scoring and Attempt Creation Function
CREATE OR REPLACE FUNCTION public.submit_assessment_attempt(
  p_test_id TEXT,
  p_time_spent_seconds INTEGER,
  p_user_answers JSONB,
  p_question_statuses JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_test RECORD;
  v_q RECORD;
  v_total_questions INTEGER := 0;
  v_answered_count INTEGER := 0;
  v_correct_count INTEGER := 0;
  v_incorrect_count INTEGER := 0;
  v_unanswered_count INTEGER := 0;
  v_marked_count INTEGER := 0;
  v_score_obtained NUMERIC := 0;
  v_max_score NUMERIC := 0;
  v_percentage NUMERIC := 0;
  v_passed BOOLEAN := false;
  v_selected_opt TEXT;
  v_clean_user_answers JSONB := '{}'::jsonb;
  v_clean_question_statuses JSONB := '{}'::jsonb;
  v_attempt_id UUID := gen_random_uuid();
BEGIN
  -- A. Verify requester authentication and account status
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Access Denied: You must be an active, authenticated user to submit an assessment.';
  END IF;

  -- B. Concurrency control: Transaction-level advisory lock prevents race conditions
  IF NOT pg_try_advisory_xact_lock(hashtext(v_user_id::text || ':' || p_test_id)) THEN
    RAISE EXCEPTION 'A submission for this assessment is currently in progress. Please wait.';
  END IF;

  -- C. Validate parameters
  IF p_time_spent_seconds IS NULL OR p_time_spent_seconds < 0 THEN
    RAISE EXCEPTION 'Invalid time: time_spent_seconds cannot be negative.';
  END IF;

  IF p_user_answers IS NULL OR jsonb_typeof(p_user_answers) <> 'object' THEN
    RAISE EXCEPTION 'Invalid answers payload: must be a JSON object of questionId -> optionId.';
  END IF;

  -- D. Validate assessment existence and published status
  SELECT * INTO v_test FROM public.assessments WHERE id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found: %', p_test_id;
  END IF;

  IF v_test.status <> 'available' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Assessment is not currently open for submission (status: %).', v_test.status;
  END IF;

  -- Reject extraneous question keys that do not belong to this assessment
  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_user_answers) AS k
    WHERE NOT EXISTS (
      SELECT 1 FROM public.assessment_questions q
      WHERE q.test_id = p_test_id AND q.id = k
    )
  ) THEN
    RAISE EXCEPTION 'Invalid answers payload: contains question keys not belonging to this assessment.';
  END IF;

  -- E. Server-side deterministic scoring with option validation and sanitized state construction
  FOR v_q IN (
    SELECT id, marks, negative_marks, correct_answer_id, options
    FROM public.assessment_questions
    WHERE test_id = p_test_id
    ORDER BY question_number ASC
  ) LOOP
    v_total_questions := v_total_questions + 1;
    v_max_score := v_max_score + v_q.marks;
    v_selected_opt := p_user_answers->>v_q.id;

    IF v_selected_opt IS NOT NULL AND v_selected_opt <> '' THEN
      -- Validate that the submitted option ID is actually in the question options
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_q.options) opt
        WHERE opt->>'id' = v_selected_opt
      ) THEN
        RAISE EXCEPTION 'Invalid option ID % for question %', v_selected_opt, v_q.id;
      END IF;

      -- Persist strictly verified question options into clean user answers (filters extra keys)
      v_clean_user_answers := jsonb_set(v_clean_user_answers, ARRAY[v_q.id], to_jsonb(v_selected_opt));

      v_answered_count := v_answered_count + 1;
      IF v_selected_opt = v_q.correct_answer_id THEN
        v_score_obtained := v_score_obtained + v_q.marks;
        v_correct_count := v_correct_count + 1;
      ELSE
        v_score_obtained := v_score_obtained - v_q.negative_marks;
        v_incorrect_count := v_incorrect_count + 1;
      END IF;
    ELSE
      v_unanswered_count := v_unanswered_count + 1;
    END IF;

    -- Validate and sanitize question status for this legitimate question
    IF p_question_statuses ? v_q.id THEN
      DECLARE
        v_status TEXT := p_question_statuses->>v_q.id;
      BEGIN
        IF v_status IN ('answered', 'unanswered', 'marked', 'marked_answered') THEN
          v_clean_question_statuses := jsonb_set(v_clean_question_statuses, ARRAY[v_q.id], to_jsonb(v_status));
          IF v_status IN ('marked', 'marked_answered') THEN
            v_marked_count := v_marked_count + 1;
          END IF;
        ELSE
          v_clean_question_statuses := jsonb_set(v_clean_question_statuses, ARRAY[v_q.id], '"unanswered"'::jsonb);
        END IF;
      END;
    END IF;
  END LOOP;

  -- Prevent scoring division by zero on misconfigured tests
  IF v_total_questions = 0 OR v_max_score <= 0 THEN
    RAISE EXCEPTION 'Assessment configuration error: test has no valid questions or maximum marks.';
  END IF;

  v_score_obtained := GREATEST(0, v_score_obtained);
  v_percentage := ROUND((v_score_obtained / v_max_score) * 100);
  v_passed := v_percentage >= v_test.pass_percentage;

  -- F. Write authoritative attempt with sanitized payload and verified flag
  INSERT INTO public.assessment_attempts (
    attempt_id, test_id, user_id, submitted_at, time_spent_seconds,
    total_questions, answered_count, unanswered_count, marked_count,
    correct_count, incorrect_count, score_obtained, max_score,
    percentage, passed, user_answers, question_statuses, is_verified
  ) VALUES (
    v_attempt_id, p_test_id, v_user_id, timezone('utc'::text, now()), p_time_spent_seconds,
    v_total_questions, v_answered_count, v_unanswered_count, v_marked_count,
    v_correct_count, v_incorrect_count, v_score_obtained, v_max_score,
    v_percentage, v_passed, v_clean_user_answers, v_clean_question_statuses, true
  );

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'test_id', p_test_id,
    'score_obtained', v_score_obtained,
    'max_score', v_max_score,
    'percentage', v_percentage,
    'passed', v_passed,
    'correct_count', v_correct_count,
    'incorrect_count', v_incorrect_count,
    'answered_count', v_answered_count,
    'unanswered_count', v_unanswered_count
  );
END;
$$;

-- Explicit least-privilege execution grants on submit_assessment_attempt
-- Service role does NOT have a valid auth.uid() context to submit student attempts,
-- so granting EXECUTE to service_role is superfluous. Only genuine authenticated users can submit.
REVOKE EXECUTE ON FUNCTION public.submit_assessment_attempt(TEXT, INTEGER, JSONB, JSONB) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_assessment_attempt(TEXT, INTEGER, JSONB, JSONB) TO authenticated;

-- 5. Hardened question fetching RPC (strictly withholds solutions)
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
  JOIN public.assessments a ON a.id = q.test_id
  WHERE q.test_id = p_test_id
    AND public.is_active_user()
    AND (a.status = 'available' OR public.is_staff());
$$;

-- Explicit least-privilege execution grants on get_assessment_questions_for_taking
REVOKE EXECUTE ON FUNCTION public.get_assessment_questions_for_taking(TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_questions_for_taking(TEXT) TO authenticated;

-- 6. Hardened sanitized student view
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
  JOIN public.assessments a ON a.id = q.test_id
  WHERE public.is_active_user()
    AND (a.status = 'available' OR public.is_staff());

REVOKE ALL ON public.student_assessment_questions FROM PUBLIC, anon, service_role;
GRANT SELECT ON public.student_assessment_questions TO authenticated;

-- 7. Ensure post-submission solution review requires a verified attempt
DROP POLICY IF EXISTS "assessment_questions_select_active" ON public.assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_select_staff" ON public.assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_select_post_submission" ON public.assessment_questions;

CREATE POLICY "assessment_questions_select_staff"
  ON public.assessment_questions
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

CREATE POLICY "assessment_questions_select_post_submission"
  ON public.assessment_questions
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user() AND EXISTS (
      SELECT 1 FROM public.assessment_attempts
      WHERE assessment_attempts.test_id = assessment_questions.test_id
        AND assessment_attempts.user_id = auth.uid()
        AND assessment_attempts.is_verified = true
    )
  );

-- 8. Storage Policy Hardening & Completeness
-- Canonical 20261026000002 policies: storage_public_select, storage_public_insert,
--                                   storage_private_select, storage_private_insert.
-- These 4 canonical policies remain active and are NOT dropped.
-- The drops below ensure no un-scoped test/boilerplate policies (e.g. storage_objects_select_all,
-- storage_objects_insert_all) exist on the hosted database that could OR-bypass folder isolation.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('yogneet-public', 'yogneet-public', true),
  ('yogneet-private', 'yogneet-private', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_objects_select_all" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_all" ON storage.objects;

-- Ensure scoped UPDATE and DELETE policies exist for owner folder isolation with active-user guard
DROP POLICY IF EXISTS "storage_public_update" ON storage.objects;
CREATE POLICY "storage_public_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'yogneet-public'
    AND public.is_active_user()
    AND (public.is_staff() OR (storage.foldername(name))[1] = auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'yogneet-public'
    AND public.is_active_user()
    AND (public.is_staff() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

DROP POLICY IF EXISTS "storage_public_delete" ON storage.objects;
CREATE POLICY "storage_public_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'yogneet-public'
    AND public.is_active_user()
    AND (public.is_staff() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

DROP POLICY IF EXISTS "storage_private_update" ON storage.objects;
CREATE POLICY "storage_private_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'yogneet-private'
    AND public.is_active_user()
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'yogneet-private'
    AND public.is_active_user()
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "storage_private_delete" ON storage.objects;
CREATE POLICY "storage_private_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'yogneet-private'
    AND public.is_active_user()
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- ==============================================================================
-- Read-Only Verification SQL Queries (Run in Supabase SQL Editor to verify ACLs):
--
-- 1. Check RPC execution privileges:
--    SELECT routine_name, grantee, privilege_type
--    FROM information_schema.routine_privileges
--    WHERE routine_schema = 'public'
--      AND routine_name IN ('get_assessment_questions_for_taking', 'submit_assessment_attempt');
--
-- 2. Check active RLS policies on tables:
--    SELECT tablename, policyname, roles, cmd, qual
--    FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename IN ('assessment_questions', 'assessment_attempts');
--
-- 3. Check active storage object policies:
--    SELECT policyname, roles, cmd, qual
--    FROM pg_policies
--    WHERE schemaname = 'storage'
--      AND tablename = 'objects';
--
-- ==============================================================================
-- Non-Destructive Rollback Plan (If required to revert migration 20261027000004):
--
-- 1. DROP POLICY IF EXISTS "storage_public_update" ON storage.objects;
--    DROP POLICY IF EXISTS "storage_public_delete" ON storage.objects;
--    DROP POLICY IF EXISTS "storage_private_update" ON storage.objects;
--    DROP POLICY IF EXISTS "storage_private_delete" ON storage.objects;
--    (NOTE: Do NOT delete storage buckets yogneet-public or yogneet-private as they may hold user data)
--
-- 2. CREATE POLICY "assessment_questions_select_post_submission" ON public.assessment_questions
--      FOR SELECT TO authenticated
--      USING (public.is_active_user() AND EXISTS (
--        SELECT 1 FROM public.assessment_attempts
--        WHERE assessment_attempts.test_id = assessment_questions.test_id
--          AND assessment_attempts.user_id = auth.uid()
--      ));
--
-- 3. DROP TRIGGER IF EXISTS trg_assessment_attempts_metrics ON public.assessment_attempts;
--    DROP FUNCTION IF EXISTS public.sync_profile_test_metrics();
--    DROP FUNCTION IF EXISTS public.submit_assessment_attempt(TEXT, INTEGER, JSONB, JSONB);
--    (assessment_attempts.is_verified column can remain safely as nullable or default false)
-- ==============================================================================
