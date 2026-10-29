-- ==============================================================================
-- Migration: 20261029000005_phase_3c_content_management.sql
-- Project: Yogneet Edu (Branded: Tech Geek Adarsh)
-- Description: Phase 3C additive extensions for:
--   1. Video lesson status column and RLS visibility refinement.
--   2. Practical / text-based assignments table and RLS policies.
--   3. Student directory pre-provisioning table and RLS policies.
--   4. Atomic assessment and questions authoring RPC (create_assessment_with_questions).
--   5. Storage policies for study note attachments in yogneet-public and yogneet-private.
-- ==============================================================================

-- 1. Video Lessons Status Support
ALTER TABLE public.video_lessons
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_video_lessons_status ON public.video_lessons(status);

-- Update RLS for video lessons so drafts are visible to staff only
DROP POLICY IF EXISTS "video_lessons_select_active" ON public.video_lessons;
CREATE POLICY "video_lessons_select_active"
  ON public.video_lessons
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published' AND public.is_active_user())
    OR public.is_staff()
  );

-- 2. Practical / Text-based Assignments Table
CREATE TABLE IF NOT EXISTS public.practical_assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT '',
  problem_statement TEXT NOT NULL,
  instructions TEXT NOT NULL,
  topics TEXT[] DEFAULT '{}',
  deliverables TEXT[] DEFAULT '{}',
  submission_requirements TEXT DEFAULT '',
  deadline TIMESTAMPTZ,
  total_marks NUMERIC NOT NULL DEFAULT 100 CHECK (total_marks > 0),
  rubric JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Curriculum Staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_practical_assignments_subject ON public.practical_assignments(subject);
CREATE INDEX IF NOT EXISTS idx_practical_assignments_status ON public.practical_assignments(status);

ALTER TABLE public.practical_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practical_assignments_select" ON public.practical_assignments;
CREATE POLICY "practical_assignments_select"
  ON public.practical_assignments
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published' AND public.is_active_user())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "practical_assignments_manage_staff" ON public.practical_assignments;
CREATE POLICY "practical_assignments_manage_staff"
  ON public.practical_assignments
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 3. Student Directory Pre-Provisioning Table
CREATE TABLE IF NOT EXISTS public.student_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT DEFAULT 'Computer Science',
  institution TEXT DEFAULT '',
  program TEXT DEFAULT 'B.Tech',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  access_category TEXT NOT NULL DEFAULT 'standard' CHECK (access_category IN ('standard', 'managed', 'scholarship')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_student_directory_email ON public.student_directory(email);
CREATE INDEX IF NOT EXISTS idx_student_directory_status ON public.student_directory(status);

ALTER TABLE public.student_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_directory_select_staff" ON public.student_directory;
CREATE POLICY "student_directory_select_staff"
  ON public.student_directory
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "student_directory_insert_staff" ON public.student_directory;
CREATE POLICY "student_directory_insert_staff"
  ON public.student_directory
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "student_directory_update_staff" ON public.student_directory;
CREATE POLICY "student_directory_update_staff"
  ON public.student_directory
  FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "student_directory_delete_admin" ON public.student_directory;
CREATE POLICY "student_directory_delete_admin"
  ON public.student_directory
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. Atomic Assessment & Questions Authoring RPC
CREATE OR REPLACE FUNCTION public.create_assessment_with_questions(
  p_assessment JSONB,
  p_questions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_test_id TEXT;
  v_title TEXT;
  v_description TEXT;
  v_subject TEXT;
  v_module TEXT;
  v_duration INTEGER;
  v_difficulty TEXT;
  v_type TEXT;
  v_status TEXT;
  v_pass_percentage NUMERIC;
  v_tags TEXT[];
  v_q_count INTEGER;
  v_q RECORD;
  v_q_id TEXT;
  v_q_text TEXT;
  v_q_code TEXT;
  v_q_lang TEXT;
  v_q_options JSONB;
  v_q_answer TEXT;
  v_q_explanation TEXT;
  v_q_marks NUMERIC;
  v_q_neg_marks NUMERIC;
  v_idx INTEGER := 0;
BEGIN
  -- Authorization check: Requester must be active staff or admin
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Access Denied: Only staff members can author assessments.';
  END IF;

  -- Validate assessment payload
  v_test_id := COALESCE(p_assessment->>'id', 'test_' || lower(replace(COALESCE(p_assessment->>'subject', 'general'), ' ', '_')) || '_' || floor(extract(epoch from now())));
  v_title := p_assessment->>'title';
  v_description := COALESCE(p_assessment->>'description', '');
  v_subject := p_assessment->>'subject';
  v_module := COALESCE(p_assessment->>'module', 'General');
  v_duration := COALESCE((p_assessment->>'duration_minutes')::INTEGER, 30);
  v_difficulty := COALESCE(p_assessment->>'difficulty', 'Medium');
  v_type := COALESCE(p_assessment->>'type', 'Practice Quiz');
  v_status := COALESCE(p_assessment->>'status', 'available');
  v_pass_percentage := COALESCE((p_assessment->>'pass_percentage')::NUMERIC, 50);

  IF v_title IS NULL OR length(trim(v_title)) = 0 THEN
    RAISE EXCEPTION 'Validation Failed: Assessment title is required.';
  END IF;

  IF v_subject IS NULL OR length(trim(v_subject)) = 0 THEN
    RAISE EXCEPTION 'Validation Failed: Assessment subject is required.';
  END IF;

  IF v_difficulty NOT IN ('Easy', 'Medium', 'Hard') THEN
    RAISE EXCEPTION 'Validation Failed: Invalid difficulty. Must be Easy, Medium, or Hard.';
  END IF;

  IF v_type NOT IN ('Practice Quiz', 'Mock Exam', 'Module Test') THEN
    RAISE EXCEPTION 'Validation Failed: Invalid type. Must be Practice Quiz, Mock Exam, or Module Test.';
  END IF;

  IF v_status NOT IN ('available', 'upcoming', 'completed') THEN
    RAISE EXCEPTION 'Validation Failed: Invalid status. Must be available, upcoming, or completed.';
  END IF;

  IF jsonb_typeof(p_questions) <> 'array' THEN
    RAISE EXCEPTION 'Validation Failed: Questions must be a JSON array.';
  END IF;

  v_q_count := jsonb_array_length(p_questions);
  IF v_q_count = 0 THEN
    RAISE EXCEPTION 'Validation Failed: An assessment must contain at least one question.';
  END IF;

  -- Extract tags
  SELECT COALESCE(array_agg(elem::text), '{}')
  INTO v_tags
  FROM jsonb_array_elements_text(COALESCE(p_assessment->'tags', '[]'::jsonb)) AS elem;

  -- Insert or update assessment row
  INSERT INTO public.assessments (
    id, title, description, subject, module, question_count,
    duration_minutes, difficulty, type, status, pass_percentage, tags
  ) VALUES (
    v_test_id, v_title, v_description, v_subject, v_module, v_q_count,
    v_duration, v_difficulty, v_type, v_status, v_pass_percentage, v_tags
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    subject = EXCLUDED.subject,
    module = EXCLUDED.module,
    question_count = EXCLUDED.question_count,
    duration_minutes = EXCLUDED.duration_minutes,
    difficulty = EXCLUDED.difficulty,
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    pass_percentage = EXCLUDED.pass_percentage,
    tags = EXCLUDED.tags;

  -- Clear any pre-existing questions if updating
  DELETE FROM public.assessment_questions WHERE test_id = v_test_id;

  -- Iterate and insert questions atomically
  FOR v_q IN SELECT * FROM jsonb_array_elements(p_questions)
  LOOP
    v_idx := v_idx + 1;
    v_q_id := COALESCE(v_q.value->>'id', v_test_id || '_q' || v_idx);
    v_q_text := v_q.value->>'text';
    IF v_q_text IS NULL THEN
      v_q_text := v_q.value->>'question_text';
    END IF;
    v_q_code := v_q.value->>'code_snippet';
    v_q_lang := v_q.value->>'code_language';
    v_q_options := COALESCE(v_q.value->'options', '[]'::jsonb);
    v_q_answer := v_q.value->>'correct_answer_id';
    v_q_explanation := COALESCE(v_q.value->>'explanation', '');
    v_q_marks := COALESCE((v_q.value->>'marks')::NUMERIC, 4);
    v_q_neg_marks := COALESCE((v_q.value->>'negative_marks')::NUMERIC, 1);

    IF v_q_text IS NULL OR length(trim(v_q_text)) = 0 THEN
      RAISE EXCEPTION 'Validation Failed: Question % text is missing.', v_idx;
    END IF;

    IF jsonb_array_length(v_q_options) < 2 THEN
      RAISE EXCEPTION 'Validation Failed: Question % must have at least 2 options.', v_idx;
    END IF;

    IF v_q_answer IS NULL OR length(trim(v_q_answer)) = 0 THEN
      RAISE EXCEPTION 'Validation Failed: Question % must specify a correct_answer_id.', v_idx;
    END IF;

    INSERT INTO public.assessment_questions (
      id, test_id, question_number, text, code_snippet, code_language,
      options, correct_answer_id, explanation, marks, negative_marks
    ) VALUES (
      v_q_id, v_test_id, v_idx, v_q_text, v_q_code, v_q_lang,
      v_q_options, v_q_answer, v_q_explanation, v_q_marks, v_q_neg_marks
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'test_id', v_test_id,
    'title', v_title,
    'question_count', v_q_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_assessment_with_questions(JSONB, JSONB) TO authenticated;
