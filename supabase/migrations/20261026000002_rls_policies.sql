-- ==============================================================================
-- Migration: 20261026000002_rls_policies.sql
-- Project: Yogneet Edu (Branded: Tech Geek Adarsh)
-- Description: Row-Level Security (RLS) policies and Storage authorization rules.
-- ==============================================================================

-- 1. Helper Functions for Security Checks (Fixed Search Path & Safe Execution)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'subadmin')
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'active'
  );
END;
$$;

-- 2. Enable RLS on All Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Profiles Policies
-- All authenticated users can view active profiles (e.g. for student directory, forums, instructors)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own profile details (bio, avatar, department)
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND public.is_active_user())
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (e.g. suspend user, assign department)
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. User Permissions Policies
CREATE POLICY "user_permissions_select_own_or_admin"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_permissions_manage_admin"
  ON public.user_permissions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Courses & Video Lessons Policies
CREATE POLICY "courses_select_active"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "courses_manage_staff"
  ON public.courses
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "video_lessons_select_active"
  ON public.video_lessons
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "video_lessons_manage_staff"
  ON public.video_lessons
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 6. Study Notes Policies
CREATE POLICY "study_notes_select_published_or_staff"
  ON public.study_notes
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published' AND public.is_active_user())
    OR (auth.uid() = author_id)
    OR public.is_staff()
  );

CREATE POLICY "study_notes_insert_staff"
  ON public.study_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

CREATE POLICY "study_notes_update_author_or_staff"
  ON public.study_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_staff())
  WITH CHECK (auth.uid() = author_id OR public.is_staff());

CREATE POLICY "study_notes_delete_admin"
  ON public.study_notes
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 7. Assessments & Questions Policies
CREATE POLICY "assessments_select_active"
  ON public.assessments
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "assessments_manage_staff"
  ON public.assessments
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "assessment_questions_select_active"
  ON public.assessment_questions
  FOR SELECT
  TO authenticated
  USING (public.is_active_user());

CREATE POLICY "assessment_questions_manage_staff"
  ON public.assessment_questions
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 8. Assessment Attempts Policies (Private to Student & Admin)
CREATE POLICY "assessment_attempts_select_own_or_admin"
  ON public.assessment_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "assessment_attempts_insert_own"
  ON public.assessment_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

-- Assessment attempts are strictly immutable: no UPDATE or DELETE policies are granted!

-- 9. Audit Logs Policies (Append-Only & Admin-Readable)
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "audit_logs_insert_authenticated"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Audit logs are strictly append-only: no UPDATE or DELETE policies are granted!

-- 10. Storage Bucket Setup & Policies
-- Create dedicated public and private storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('yogneet-public', 'yogneet-public', true),
  ('yogneet-private', 'yogneet-private', false)
ON CONFLICT (id) DO NOTHING;

-- Public Storage Policy: Anyone authenticated can view public assets (avatars, thumbnails)
CREATE POLICY "storage_public_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'yogneet-public');

-- Public Storage Policy: Staff/Admin or profile owner can upload public assets to their own subfolder
CREATE POLICY "storage_public_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'yogneet-public'
    AND (
      public.is_staff()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Private Storage Policy: Only the owner or Admin can read private resources
CREATE POLICY "storage_private_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'yogneet-private'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- Private Storage Policy: Authenticated users can upload to private bucket under their own path
CREATE POLICY "storage_private_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'yogneet-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
