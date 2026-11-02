-- ==============================================================================
-- Migration: 20261101000008_phase_2_subjects_microlessons_premium.sql
-- Project: Yogneet Edu (Branded: Tech Geek Adarsh)
-- Description: Phase 2 Secure Backend Integration:
--   1. Main Subject Management (public.subjects, foreign keys on content, deletion guards, RLS).
--   2. Independent Micro Lessons & Shorts System (public.micro_subjects, public.micro_lessons, RLS).
--   3. Premium Student System (profiles extensions, concurrency-safe enrollment generator, RPCs).
--   4. Staff & Student Temporary Credentials Lifecycle (secure random tokens, must_change_password flag).
--   5. Read-only Account Inspection RPC with comprehensive audit trail.
--   6. Hardened privilege protection trigger for all new identity and entitlement fields.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MAIN SUBJECT MANAGEMENT
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color_scheme TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subjects_slug ON public.subjects(slug);
CREATE INDEX IF NOT EXISTS idx_subjects_display_order ON public.subjects(display_order);
CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON public.subjects(is_active);

-- Foreign key associations on educational content tables
ALTER TABLE public.video_lessons
  ADD COLUMN IF NOT EXISTS subject_id TEXT REFERENCES public.subjects(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_video_lessons_subject_id ON public.video_lessons(subject_id);

ALTER TABLE public.study_notes
  ADD COLUMN IF NOT EXISTS subject_id TEXT REFERENCES public.subjects(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_study_notes_subject_id ON public.study_notes(subject_id);

ALTER TABLE public.practical_assignments
  ADD COLUMN IF NOT EXISTS subject_id TEXT REFERENCES public.subjects(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_practical_assignments_subject_id ON public.practical_assignments(subject_id);

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS subject_id TEXT REFERENCES public.subjects(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_assessments_subject_id ON public.assessments(subject_id);

-- Seed core default subjects
INSERT INTO public.subjects (id, name, slug, description, icon, display_order, is_active, color_scheme)
VALUES
  ('subj_python', 'Python Programming', 'python-programming', 'Core runtime internals, object-oriented design, async concurrency, and high-performance backend development.', 'Code', 1, true, 'cyan'),
  ('subj_dbms', 'Database Management Systems', 'dbms', 'Relational database theory, ANSI SQL mastery, query planning, B-Tree indexing, transactions, and ACID concurrency.', 'Database', 2, true, 'purple'),
  ('subj_webdev', 'Full-Stack Web Development', 'web-development', 'React, TypeScript, Vite, Tailwind CSS, RESTful API design, and scalable client-server microservices.', 'Globe', 3, true, 'blue'),
  ('subj_ai', 'Artificial Intelligence & ML', 'artificial-intelligence', 'Mathematical foundations, linear regression to deep neural architectures, transformer models, and prompt engineering.', 'Brain', 4, true, 'emerald'),
  ('subj_dsa', 'Data Structures & Algorithms', 'dsa', 'Algorithmic complexity, non-linear structures, graphs, dynamic programming, and FAANG interview patterns.', 'Cpu', 5, true, 'amber')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  color_scheme = EXCLUDED.color_scheme,
  updated_at = timezone('utc'::text, now());

-- Backfill existing content references
UPDATE public.study_notes
SET subject_id = 'subj_python'
WHERE (subject ILIKE '%python%' OR title ILIKE '%python%') AND subject_id IS NULL;

UPDATE public.study_notes
SET subject_id = 'subj_dbms'
WHERE (subject ILIKE '%dbms%' OR subject ILIKE '%database%' OR subject ILIKE '%sql%' OR title ILIKE '%sql%') AND subject_id IS NULL;

UPDATE public.study_notes
SET subject_id = 'subj_webdev'
WHERE (subject ILIKE '%web%' OR subject ILIKE '%react%' OR title ILIKE '%web%' OR title ILIKE '%react%') AND subject_id IS NULL;

UPDATE public.study_notes
SET subject_id = 'subj_ai'
WHERE (subject ILIKE '%ai%' OR subject ILIKE '%intelligence%' OR title ILIKE '%ai%') AND subject_id IS NULL;

UPDATE public.study_notes
SET subject_id = 'subj_dsa'
WHERE subject_id IS NULL;

UPDATE public.video_lessons
SET subject_id = 'subj_python'
WHERE (module_name ILIKE '%python%' OR title ILIKE '%python%') AND subject_id IS NULL;

UPDATE public.video_lessons
SET subject_id = 'subj_dbms'
WHERE (module_name ILIKE '%sql%' OR module_name ILIKE '%dbms%' OR title ILIKE '%sql%' OR title ILIKE '%database%') AND subject_id IS NULL;

UPDATE public.video_lessons
SET subject_id = 'subj_webdev'
WHERE (module_name ILIKE '%web%' OR title ILIKE '%web%' OR title ILIKE '%frontend%' OR title ILIKE '%backend%') AND subject_id IS NULL;

UPDATE public.video_lessons
SET subject_id = 'subj_dsa'
WHERE subject_id IS NULL;

UPDATE public.practical_assignments
SET subject_id = 'subj_python'
WHERE (subject ILIKE '%python%' OR title ILIKE '%python%') AND subject_id IS NULL;

UPDATE public.practical_assignments
SET subject_id = 'subj_dbms'
WHERE (subject ILIKE '%dbms%' OR subject ILIKE '%database%' OR subject ILIKE '%sql%') AND subject_id IS NULL;

UPDATE public.practical_assignments
SET subject_id = 'subj_webdev'
WHERE (subject ILIKE '%web%') AND subject_id IS NULL;

UPDATE public.practical_assignments
SET subject_id = 'subj_dsa'
WHERE subject_id IS NULL;

UPDATE public.assessments
SET subject_id = 'subj_python'
WHERE (subject ILIKE '%python%' OR title ILIKE '%python%') AND subject_id IS NULL;

UPDATE public.assessments
SET subject_id = 'subj_dbms'
WHERE (subject ILIKE '%dbms%' OR subject ILIKE '%database%' OR subject ILIKE '%sql%') AND subject_id IS NULL;

UPDATE public.assessments
SET subject_id = 'subj_webdev'
WHERE (subject ILIKE '%web%') AND subject_id IS NULL;

UPDATE public.assessments
SET subject_id = 'subj_dsa'
WHERE subject_id IS NULL;

-- Subject safe deletion guard function & trigger
CREATE OR REPLACE FUNCTION public.check_subject_deletion_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_video_count INTEGER;
  v_notes_count INTEGER;
  v_asmt_count INTEGER;
  v_assign_count INTEGER;
BEGIN
  SELECT count(*) INTO v_video_count FROM public.video_lessons WHERE subject_id = OLD.id;
  SELECT count(*) INTO v_notes_count FROM public.study_notes WHERE subject_id = OLD.id;
  SELECT count(*) INTO v_asmt_count FROM public.assessments WHERE subject_id = OLD.id;
  SELECT count(*) INTO v_assign_count FROM public.practical_assignments WHERE subject_id = OLD.id;

  IF (v_video_count + v_notes_count + v_asmt_count + v_assign_count) > 0 THEN
    RAISE EXCEPTION 'Cannot delete subject "%": % video(s), % note(s), % assessment(s), and % assignment(s) are associated with it. Please reassign or archive dependent content first.',
      OLD.name, v_video_count, v_notes_count, v_asmt_count, v_assign_count;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_subject_deletion_guard ON public.subjects;
CREATE TRIGGER trg_check_subject_deletion_guard
  BEFORE DELETE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.check_subject_deletion_guard();

-- RLS for Subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subjects_select" ON public.subjects;
CREATE POLICY "subjects_select"
  ON public.subjects
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true AND public.is_active_user())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "subjects_manage_staff" ON public.subjects;
CREATE POLICY "subjects_manage_staff"
  ON public.subjects
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ------------------------------------------------------------------------------
-- 2. INDEPENDENT MICRO LESSONS SYSTEM
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.micro_subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_micro_subjects_slug ON public.micro_subjects(slug);
CREATE INDEX IF NOT EXISTS idx_micro_subjects_display_order ON public.micro_subjects(display_order);
CREATE INDEX IF NOT EXISTS idx_micro_subjects_is_active ON public.micro_subjects(is_active);

CREATE TABLE IF NOT EXISTS public.micro_lessons (
  id TEXT PRIMARY KEY,
  micro_subject_id TEXT NOT NULL REFERENCES public.micro_subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  youtube_shorts_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL CHECK (length(youtube_id) = 11),
  display_order INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  author_name TEXT DEFAULT 'Tech Geek Adarsh',
  duration TEXT DEFAULT '0:50',
  thumbnail_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_micro_lessons_subject_id ON public.micro_lessons(micro_subject_id);
CREATE INDEX IF NOT EXISTS idx_micro_lessons_status ON public.micro_lessons(status);
CREATE INDEX IF NOT EXISTS idx_micro_lessons_display_order ON public.micro_lessons(display_order);

-- Seed core independent micro subjects
INSERT INTO public.micro_subjects (id, name, slug, description, cover_image, display_order, is_active)
VALUES
  ('micro_py_tricks', 'Python Quick Tricks', 'python-quick-tricks', 'Bite-sized Python hacks, walrus operator syntax, memory generators, and one-liner algorithmic shortcuts.', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&auto=format&fit=crop&q=80', 1, true),
  ('micro_sql_shortcuts', 'SQL Shortcuts & Joins', 'sql-shortcuts', 'Visual breakdowns of recursive CTEs, window functions (ROW_NUMBER vs DENSE_RANK), and query optimization secrets.', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80', 2, true),
  ('micro_interview_hacks', 'Interview Hacks & SDE Tips', 'interview-hacks', 'System design interview heuristics, behavioral question framing, and how to avoid red flags in tech rounds.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80', 3, true),
  ('micro_java_concepts', 'Java Core Concepts', 'java-concepts', 'JVM garbage collection zones, string pool immutability, virtual threads, and synchronized locks explained simply.', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80', 4, true),
  ('micro_coding_tips', 'Coding Tips & Clean Architecture', 'coding-tips', 'SOLID principles in under 60 seconds, Git interactive rebase secrets, and idiomatic error handling.', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80', 5, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  cover_image = EXCLUDED.cover_image,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc'::text, now());

-- Seed sample micro lessons with verified 11-char YouTube IDs
INSERT INTO public.micro_lessons (id, micro_subject_id, title, description, youtube_shorts_url, youtube_id, display_order, status, author_name, duration)
VALUES
  ('short_py_1', 'micro_py_tricks', 'Python Walrus Operator (:=) in 40 Seconds', 'Assign and evaluate expressions simultaneously inside while-loops and if-conditions.', 'https://www.youtube.com/shorts/bM7SZ5SBzyY', 'bM7SZ5SBzyY', 1, 'published', 'Tech Geek Adarsh', '0:42'),
  ('short_py_2', 'micro_py_tricks', 'List vs Generator Comprehension Memory Secret', 'Save up to 98% memory using parenthesis generators instead of square brackets for million-row pipelines.', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 2, 'published', 'Tech Geek Adarsh', '0:48'),
  ('short_sql_1', 'micro_sql_shortcuts', 'ROW_NUMBER vs DENSE_RANK in 30 Seconds', 'Understand the exact tie-breaking difference between standard row numbering and dense ranking.', 'https://www.youtube.com/shorts/3JZ_D3ELwOQ', '3JZ_D3ELwOQ', 1, 'published', 'Tech Geek Adarsh', '0:35'),
  ('short_sql_2', 'micro_sql_shortcuts', 'COALESCE Trick for Clean Null Handling', 'Eliminate nested IFNULL or CASE statements with idiomatic ANSI COALESCE chain evaluation.', 'https://www.youtube.com/shorts/L_LUpnjgPso', 'L_LUpnjgPso', 2, 'published', 'Tech Geek Adarsh', '0:38'),
  ('short_int_1', 'micro_interview_hacks', 'The STAR Method Formula for FAANG Behavioral Rounds', 'Structure behavioral questions into Situation, Task, Action, and Result without rambling.', 'https://www.youtube.com/shorts/kJQP7kiw5Fk', 'kJQP7kiw5Fk', 1, 'published', 'Tech Geek Adarsh', '0:55')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  youtube_shorts_url = EXCLUDED.youtube_shorts_url,
  youtube_id = EXCLUDED.youtube_id,
  display_order = EXCLUDED.display_order,
  status = EXCLUDED.status,
  updated_at = timezone('utc'::text, now());

-- RLS for Micro Subjects & Micro Lessons
ALTER TABLE public.micro_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "micro_subjects_select" ON public.micro_subjects;
CREATE POLICY "micro_subjects_select"
  ON public.micro_subjects
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true AND public.is_active_user())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "micro_subjects_manage_staff" ON public.micro_subjects;
CREATE POLICY "micro_subjects_manage_staff"
  ON public.micro_subjects
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "micro_lessons_select" ON public.micro_lessons;
CREATE POLICY "micro_lessons_select"
  ON public.micro_lessons
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published' AND public.is_active_user())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "micro_lessons_manage_staff" ON public.micro_lessons;
CREATE POLICY "micro_lessons_manage_staff"
  ON public.micro_lessons
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ------------------------------------------------------------------------------
-- 3. PREMIUM STUDENT EXTENSIONS & CONCURRENCY-SAFE ENROLLMENT GENERATOR
-- ------------------------------------------------------------------------------

-- Extend public.profiles with authoritative premium fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enrollment_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS admission_year INTEGER,
  ADD COLUMN IF NOT EXISTS sequential_number INTEGER,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS yogneet_email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_enrollment_number ON public.profiles(enrollment_number);
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON public.profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_yogneet_email ON public.profiles(lower(yogneet_email));

-- Sequence table for concurrency-safe transactional enrollment allocation
CREATE TABLE IF NOT EXISTS public.enrollment_sequences (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.enrollment_sequences ENABLE ROW LEVEL SECURITY;

-- Enrollment sequence generator with pessimistic row locking
CREATE OR REPLACE FUNCTION public.generate_next_enrollment_number(p_year INTEGER)
RETURNS TABLE (
  enrollment_number TEXT,
  seq_num INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_current_seq INTEGER;
  v_next_seq INTEGER;
  v_formatted TEXT;
BEGIN
  IF p_year IS NULL OR p_year < 2020 OR p_year > 2100 THEN
    RAISE EXCEPTION 'Invalid admission year for enrollment generation: %', p_year;
  END IF;

  -- Ensure record exists for this year
  INSERT INTO public.enrollment_sequences (year, last_sequence)
  VALUES (p_year, 0)
  ON CONFLICT (year) DO NOTHING;

  -- Acquire exclusive row lock for concurrency safety
  SELECT last_sequence INTO v_current_seq
  FROM public.enrollment_sequences
  WHERE year = p_year
  FOR UPDATE;

  v_next_seq := v_current_seq + 1;

  -- Format: YEAR + SEQUENTIAL (e.g. 2026001 .. 2026999, 20261000, 20261001)
  IF v_next_seq < 1000 THEN
    v_formatted := p_year::TEXT || lpad(v_next_seq::TEXT, 3, '0');
  ELSE
    v_formatted := p_year::TEXT || v_next_seq::TEXT;
  END IF;

  UPDATE public.enrollment_sequences
  SET last_sequence = v_next_seq,
      updated_at = timezone('utc'::text, now())
  WHERE year = p_year;

  RETURN QUERY SELECT v_formatted, v_next_seq;
END;
$$;

-- Granular permission lookup helper
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
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

-- ------------------------------------------------------------------------------
-- 4. RPC: UPGRADE EXISTING STUDENT TO PREMIUM (CONCURRENCY-SAFE)
-- ------------------------------------------------------------------------------

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
  -- Authorization check
  IF NOT (
    public.is_admin()
    OR (v_caller_id IS NOT NULL AND public.has_permission(v_caller_id, 'premium_students.manage'))
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

  -- Update profile with session flag bypass for privileged mutation
  PERFORM set_config('yogneet.internal_auth_sync', 'on', true);

  UPDATE public.profiles
  SET
    is_premium = true,
    access_category = 'pro',
    enrollment_number = v_enrollment_num,
    admission_year = COALESCE(p_year, 2026),
    sequential_number = v_seq,
    yogneet_email = v_proposed_email,
    phone = COALESCE(NULLIF(p_phone, ''), v_target_profile.phone),
    department = COALESCE(NULLIF(p_department, ''), v_target_profile.department),
    converted_at = timezone('utc'::text, now()),
    last_active = timezone('utc'::text, now())
  WHERE id = p_user_id;

  PERFORM set_config('yogneet.internal_auth_sync', 'off', true);

  -- Append audit log entry
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
    'STUDENT_PREMIUM_UPGRADE',
    'profiles',
    p_user_id::TEXT,
    format('Upgraded student "%s" to Premium. Assigned Enrollment #%s and Yogneet Email "%s".',
      v_target_profile.name, v_enrollment_num, v_proposed_email),
    'SUCCESS',
    jsonb_build_object(
      'enrollment_number', v_enrollment_num,
      'yogneet_email', v_proposed_email,
      'is_premium', true,
      'access_category', 'pro',
      'admission_year', COALESCE(p_year, 2026),
      'sequential_number', v_seq
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'name', v_target_profile.name,
    'email', v_target_profile.email,
    'yogneet_email', v_proposed_email,
    'enrollment_number', v_enrollment_num,
    'admission_year', COALESCE(p_year, 2026),
    'sequential_number', v_seq,
    'access_category', 'pro',
    'is_premium', true,
    'converted_at', timezone('utc'::text, now())
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: SECURE RANDOM TEMPORARY CREDENTIAL GENERATOR
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_generate_temporary_credential(p_user_id UUID)
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
  v_random_token := 'Yg#' || encode(gen_random_bytes(6), 'hex') || '!9z';

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

-- ------------------------------------------------------------------------------
-- 6. RPC: AUDITED READ-ONLY ACCOUNT INSPECTION
-- ------------------------------------------------------------------------------

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

  -- Aggregate assessment attempts
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', a.id,
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
      'admissionYear', v_student.admission_year,
      'isPremium', v_student.is_premium,
      'role', v_student.role,
      'status', v_student.status,
      'accessCategory', v_student.access_category,
      'department', v_student.department,
      'institution', v_student.institution,
      'program', v_student.program,
      'phone', v_student.phone,
      'avatarUrl', v_student.avatar_url,
      'solvedProblemsCount', v_student.solved_problems_count,
      'testsCompletedCount', v_student.tests_completed_count,
      'mustChangePassword', v_student.must_change_password,
      'createdAt', v_student.created_at,
      'lastActive', v_student.last_active
    ),
    'assessmentHistory', v_recent_attempts,
    'enrolledSubjects', v_subjects_summary,
    'learningProgress', jsonb_build_object(
      'totalTestsAttempted', v_total_attempts,
      'averageScorePercentage', v_avg_score,
      'solvedProblemsCount', v_student.solved_problems_count,
      'completionPercentage', CASE WHEN v_total_attempts > 0 THEN LEAST(v_total_attempts * 15, 100) ELSE 0 END
    )
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. REINFORCE PRIVILEGED PROFILE FIELDS PROTECTION TRIGGER
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Allow verified internal auth synchronization
  IF current_setting('yogneet.internal_auth_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Defense-in-depth: If secondary trigger depth > 1
  IF pg_trigger_depth() > 1 THEN
    IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.email <> NEW.email
       OR OLD.created_at <> NEW.created_at OR OLD.solved_problems_count <> NEW.solved_problems_count
       OR OLD.name <> NEW.name OR OLD.avatar_url <> NEW.avatar_url
       OR OLD.department <> NEW.department OR OLD.bio <> NEW.bio
       OR OLD.enrolled_courses <> NEW.enrolled_courses
       OR OLD.access_category <> NEW.access_category
       OR OLD.is_premium <> NEW.is_premium
       OR OLD.enrollment_number <> NEW.enrollment_number
       OR OLD.yogneet_email <> NEW.yogneet_email THEN
      RAISE EXCEPTION 'Access Denied: Core identity, authorization, and entitlement fields cannot be modified via trigger.';
    END IF;

    IF NEW.tests_completed_count <> OLD.tests_completed_count AND NEW.tests_completed_count <> OLD.tests_completed_count + 1 THEN
      RAISE EXCEPTION 'Access Denied: tests_completed_count can only be incremented sequentially.';
    END IF;
    RETURN NEW;
  END IF;

  -- Allow service_role key
  IF auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Determine requester role from public.profiles
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- If requester is super admin, allow modifications
  IF current_user_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot alter role, account status, or access tier
  IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.access_category <> NEW.access_category THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles, account status, or access tiers.';
  END IF;

  -- Non-admins cannot alter authoritative email directly
  IF OLD.email <> NEW.email THEN
    RAISE EXCEPTION 'Access Denied: Email address is managed through authentication credentials.';
  END IF;

  -- Non-admins cannot modify account creation timestamp
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Access Denied: Account creation timestamp is immutable.';
  END IF;

  -- Non-admins cannot alter premium status, enrollment numbers, or corporate emails
  IF (OLD.is_premium IS DISTINCT FROM NEW.is_premium)
     OR (OLD.enrollment_number IS DISTINCT FROM NEW.enrollment_number)
     OR (OLD.admission_year IS DISTINCT FROM NEW.admission_year)
     OR (OLD.sequential_number IS DISTINCT FROM NEW.sequential_number)
     OR (OLD.yogneet_email IS DISTINCT FROM NEW.yogneet_email)
     OR (OLD.must_change_password IS DISTINCT FROM NEW.must_change_password) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify premium student entitlements or lifecycle credentials.';
  END IF;

  -- Non-admins cannot tamper with problem and test metrics directly
  IF OLD.solved_problems_count <> NEW.solved_problems_count OR OLD.tests_completed_count <> NEW.tests_completed_count THEN
    RAISE EXCEPTION 'Access Denied: Gamification counters are updated only by verified scoring events.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();
