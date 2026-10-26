-- ==============================================================================
-- Migration: 20261026000001_initial_schema.sql
-- Project: Yogneet Edu (Branded: Tech Geek Adarsh)
-- Description: Core relational schema with foreign keys, constraints, and audit trails.
-- ==============================================================================

-- 1. Profiles Table (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'subadmin', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  department TEXT DEFAULT 'Enrolled Student',
  bio TEXT DEFAULT '',
  enrolled_courses TEXT[] DEFAULT '{}',
  solved_problems_count INTEGER DEFAULT 0 CHECK (solved_problems_count >= 0),
  tests_completed_count INTEGER DEFAULT 0 CHECK (tests_completed_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_active TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. User Granular Permissions Table (Sub-Admin RBAC)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_permission UNIQUE (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Video Lessons Table
CREATE TABLE IF NOT EXISTS public.video_lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE SET NULL,
  course_title TEXT NOT NULL,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  duration TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  lesson_order INTEGER NOT NULL DEFAULT 1,
  module_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  overview TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  resources JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_video_lessons_course_id ON public.video_lessons(course_id);

-- 5. Study Notes Table
CREATE TABLE IF NOT EXISTS public.study_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'subadmin',
  author_avatar TEXT DEFAULT '',
  read_time TEXT DEFAULT '5 min',
  pages INTEGER DEFAULT 1 CHECK (pages >= 1),
  excerpt TEXT NOT NULL,
  full_markdown TEXT NOT NULL,
  file_url TEXT,
  file_size TEXT,
  download_available BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  downloads INTEGER DEFAULT 0 CHECK (downloads >= 0),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'in_review', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_study_notes_subject ON public.study_notes(subject);
CREATE INDEX IF NOT EXISTS idx_study_notes_status ON public.study_notes(status);

-- 6. Assessments Table
CREATE TABLE IF NOT EXISTS public.assessments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL,
  module TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  type TEXT NOT NULL CHECK (type IN ('Practice Quiz', 'Mock Exam', 'Module Test')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'upcoming', 'completed')),
  pass_percentage NUMERIC NOT NULL DEFAULT 40 CHECK (pass_percentage >= 0 AND pass_percentage <= 100),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Assessment Questions Table
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  code_snippet TEXT,
  code_language TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer_id TEXT NOT NULL,
  explanation TEXT NOT NULL,
  marks NUMERIC NOT NULL DEFAULT 4,
  negative_marks NUMERIC NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_test_id ON public.assessment_questions(test_id);

-- 8. Assessment Attempts Table (Immutable Student Test Results)
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id TEXT NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  time_spent_seconds INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
  answered_count INTEGER NOT NULL CHECK (answered_count >= 0),
  unanswered_count INTEGER NOT NULL CHECK (unanswered_count >= 0),
  marked_count INTEGER NOT NULL CHECK (marked_count >= 0),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  incorrect_count INTEGER NOT NULL CHECK (incorrect_count >= 0),
  score_obtained NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  percentage NUMERIC NOT NULL,
  passed BOOLEAN NOT NULL,
  user_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  question_statuses JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_id ON public.assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_test_id ON public.assessment_attempts(test_id);

-- 9. Append-Only Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
  ip_address TEXT,
  changes JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);

-- 10. Database Functions & Triggers for Identity & Role Integrity

-- Trigger: Automatically provision public profile upon new auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'),
    'student', -- Always default new signups to student role
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Defense-in-depth preventing non-admins from changing role or status
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- If role or status is not being altered, permit update
  IF OLD.role = NEW.role AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine requester role from public.profiles
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Only super admin is allowed to alter user role or status
  IF current_user_role <> 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles or account status.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();
