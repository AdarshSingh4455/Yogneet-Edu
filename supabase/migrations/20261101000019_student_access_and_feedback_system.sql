-- ==============================================================================
-- Migration: 20261101000019_student_access_and_feedback_system.sql
-- Description:
--   1. Student Access Management: Admin-configurable tab/module access for
--      Normal vs Premium Students with default modules, RLS, and access check RPC.
--   2. Private Feedback Management System: Secure feedback submissions,
--      admin-only PostgREST access, verified server-side identity capture,
--      private submitter ticket tracking, and audited admin reply/resolution workflow.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Overload is_admin(UUID) for flexible security verification
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND role = 'admin'
      AND status = 'active'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 1. Student Module Access Management Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_module_access (
  module_key TEXT PRIMARY KEY,
  module_name TEXT NOT NULL,
  module_route TEXT NOT NULL,
  description TEXT,
  normal_enabled BOOLEAN NOT NULL DEFAULT true,
  premium_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.student_module_access ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "authenticated_read_student_module_access" ON public.student_module_access;
DROP POLICY IF EXISTS "admin_manage_student_module_access" ON public.student_module_access;

-- All authenticated users can read tab access configuration
CREATE POLICY "authenticated_read_student_module_access"
  ON public.student_module_access
  FOR SELECT
  TO authenticated
  USING (true);

-- Only Super Admins can insert, update, or delete tab access settings
CREATE POLICY "admin_manage_student_module_access"
  ON public.student_module_access
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Initialize default platform module records
INSERT INTO public.student_module_access (
  module_key, module_name, module_route, description, normal_enabled, premium_enabled, display_order
) VALUES
  ('dashboard', 'Student Dashboard', '/dashboard', 'Overview, recent activity, and learning hub', true, true, 1),
  ('videos', 'Video Lessons', '/videos', 'Curated YouTube lecture modules & playlists', true, true, 2),
  ('notes', 'Study Notes & PDFs', '/notes', 'Downloadable revision notes, PDF summaries, and architecture diagrams', true, true, 3),
  ('practical', 'Practical Assignments', '/practical', 'Hands-on project assignments and architecture challenges', true, true, 4),
  ('tests', 'Test Series & Mocks', '/tests', 'Timed competitive mock examinations and algorithmic quizzes', true, true, 5),
  ('micro_lessons', 'Micro Lessons', '/micro-lessons', 'Bite-sized vertical video concepts and interactive player', true, true, 6),
  ('coding', 'Coding Practice Arena', '/coding', 'Algorithmic challenge runner and problem solver', true, true, 7),
  ('community', 'Community Forum', '/community', 'Peer discussions, Q&A, and technical threads', true, true, 8),
  ('progress', 'My Learning Progress', '/progress', 'Personal mastery metrics, scores, and completion tracking', true, true, 9),
  ('feedback', 'Feedback & Support', '/feedback', 'Private bug reporting and feature requests directly to administration', true, true, 10)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  module_route = EXCLUDED.module_route,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- ------------------------------------------------------------------------------
-- RPC: Check Student Module Access (Server-side Enforcement)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_student_module_access(
  p_module_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := COALESCE(p_user_id, auth.uid());
  v_role TEXT;
  v_category TEXT;
  v_normal_enabled BOOLEAN;
  v_premium_enabled BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN false;
  END IF;

  -- Admin and sub-admin staff always have access
  SELECT role, COALESCE(access_category, 'standard')
  INTO v_role, v_category
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_role IN ('admin', 'subadmin') THEN
    RETURN true;
  END IF;

  -- Fetch module configuration
  SELECT normal_enabled, premium_enabled
  INTO v_normal_enabled, v_premium_enabled
  FROM public.student_module_access
  WHERE module_key = p_module_key;

  IF NOT FOUND THEN
    -- If module not registered, default to allowed
    RETURN true;
  END IF;

  -- Check tier
  IF v_category = 'pro' THEN
    RETURN COALESCE(v_premium_enabled, true);
  ELSE
    RETURN COALESCE(v_normal_enabled, true);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_student_module_access(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_student_module_access(TEXT, UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC: Admin Update Student Module Access
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_student_module_access(
  p_module_key TEXT,
  p_normal_enabled BOOLEAN,
  p_premium_enabled BOOLEAN
)
RETURNS public.student_module_access
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_actor_name TEXT;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_updated_row public.student_module_access;
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify module access settings.';
  END IF;

  SELECT name, email, role
  INTO v_actor_name, v_actor_email, v_actor_role
  FROM public.profiles
  WHERE id = v_caller_id;

  UPDATE public.student_module_access
  SET
    normal_enabled = p_normal_enabled,
    premium_enabled = p_premium_enabled,
    updated_at = timezone('utc'::text, now()),
    updated_by = v_caller_id
  WHERE module_key = p_module_key
  RETURNING * INTO v_updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Module key % not found in configuration.', p_module_key;
  END IF;

  -- Compliance Audit Log
  INSERT INTO public.audit_logs (
    timestamp, actor_id, actor_name, actor_email, actor_role,
    action, resource_type, resource_id, details, outcome, ip_address, changes
  ) VALUES (
    timezone('utc'::text, now()), v_caller_id, v_actor_name, v_actor_email, v_actor_role,
    'UPDATE_MODULE_ACCESS', 'student_module_access', p_module_key,
    'Updated module access for ' || p_module_key || ' (Normal: ' || p_normal_enabled || ', Premium: ' || p_premium_enabled || ')',
    'SUCCESS', '127.0.0.1',
    jsonb_build_object(
      'module_key', p_module_key,
      'normal_enabled', p_normal_enabled,
      'premium_enabled', p_premium_enabled
    )
  );

  RETURN v_updated_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_student_module_access(TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_student_module_access(TEXT, BOOLEAN, BOOLEAN) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Private Feedback Management Submissions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('student', 'subadmin', 'admin')),
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  access_category TEXT NOT NULL DEFAULT 'standard' CHECK (access_category IN ('standard', 'pro')),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT NOT NULL CHECK (char_length(description) >= 10),
  category TEXT NOT NULL CHECK (category IN ('Bug', 'UI Issue', 'Content Issue', 'Account Issue', 'Other')),
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved')),
  admin_reply TEXT,
  admin_replied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  replied_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_role ON public.feedback_submissions(user_role);

-- Enable RLS
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_feedback_access" ON public.feedback_submissions;
DROP POLICY IF EXISTS "non_admin_deny_direct_access" ON public.feedback_submissions;

-- STRICT PRIVACY POLICY:
-- ONLY Super Admins can query or mutate feedback records through PostgREST.
-- Non-admin users cannot query the feedback table through PostgREST (returns 0 rows).
CREATE POLICY "admin_full_feedback_access"
  ON public.feedback_submissions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- RPC: Submit User Feedback (Trusted Server-Side Session Capture)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_user_feedback(
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_attachment_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_profile RECORD;
  v_feedback_id UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit feedback.';
  END IF;

  -- Capture trusted user details directly from database profiles
  SELECT id, name, email, role, COALESCE(access_category, 'standard') as access_category
  INTO v_profile
  FROM public.profiles
  WHERE id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- Validate inputs
  IF p_title IS NULL OR char_length(trim(p_title)) < 3 THEN
    RAISE EXCEPTION 'Feedback title must be at least 3 characters long.';
  END IF;

  IF p_description IS NULL OR char_length(trim(p_description)) < 10 THEN
    RAISE EXCEPTION 'Feedback description must be at least 10 characters long.';
  END IF;

  IF p_category NOT IN ('Bug', 'UI Issue', 'Content Issue', 'Account Issue', 'Other') THEN
    RAISE EXCEPTION 'Invalid feedback category: %', p_category;
  END IF;

  -- Insert submission with verified server-side identity
  INSERT INTO public.feedback_submissions (
    user_id,
    user_role,
    user_name,
    user_email,
    access_category,
    title,
    description,
    category,
    attachment_url,
    status
  ) VALUES (
    v_profile.id,
    v_profile.role,
    v_profile.name,
    v_profile.email,
    v_profile.access_category,
    trim(p_title),
    trim(p_description),
    p_category,
    p_attachment_url,
    'New'
  )
  RETURNING id INTO v_feedback_id;

  -- Audit log entry
  INSERT INTO public.audit_logs (
    timestamp, actor_id, actor_name, actor_email, actor_role,
    action, resource_type, resource_id, details, outcome, ip_address, changes
  ) VALUES (
    timezone('utc'::text, now()), v_profile.id, v_profile.name, v_profile.email, v_profile.role,
    'SUBMIT_FEEDBACK', 'feedback_submissions', v_feedback_id::text,
    'Submitted ' || p_category || ' feedback: ' || trim(p_title),
    'SUCCESS', '127.0.0.1',
    jsonb_build_object(
      'title', trim(p_title),
      'category', p_category,
      'has_attachment', (p_attachment_url IS NOT NULL)
    )
  );

  RETURN v_feedback_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_user_feedback(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_user_feedback(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC: Get My Feedback Submissions (Strict Submitter Privacy)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_feedback_submissions()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  attachment_url TEXT,
  status TEXT,
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.description,
    f.category,
    f.attachment_url,
    f.status,
    f.admin_reply,
    f.replied_at,
    f.resolved_at,
    f.created_at
  FROM public.feedback_submissions f
  WHERE f.user_id = v_caller_id
  ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_feedback_submissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_feedback_submissions() TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC: Admin Update Feedback Status & Reply (Admin Authority & Audit Trail)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_feedback_status(
  p_feedback_id UUID,
  p_status TEXT,
  p_admin_reply TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_actor_name TEXT;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_old_status TEXT;
  v_resolved_at TIMESTAMPTZ := NULL;
  v_replied_at TIMESTAMPTZ := NULL;
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can reply to or update feedback tickets.';
  END IF;

  IF p_status NOT IN ('New', 'In Progress', 'Resolved') THEN
    RAISE EXCEPTION 'Invalid status: %. Allowed values: New, In Progress, Resolved.', p_status;
  END IF;

  SELECT name, email, role
  INTO v_actor_name, v_actor_email, v_actor_role
  FROM public.profiles
  WHERE id = v_caller_id;

  SELECT status INTO v_old_status
  FROM public.feedback_submissions
  WHERE id = p_feedback_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback record % not found.', p_feedback_id;
  END IF;

  IF p_status = 'Resolved' THEN
    v_resolved_at := timezone('utc'::text, now());
  END IF;

  IF p_admin_reply IS NOT NULL AND char_length(trim(p_admin_reply)) > 0 THEN
    v_replied_at := timezone('utc'::text, now());
  END IF;

  UPDATE public.feedback_submissions
  SET
    status = p_status,
    admin_reply = CASE
      WHEN p_admin_reply IS NOT NULL AND char_length(trim(p_admin_reply)) > 0 THEN trim(p_admin_reply)
      ELSE admin_reply
    END,
    admin_replied_by = CASE
      WHEN p_admin_reply IS NOT NULL AND char_length(trim(p_admin_reply)) > 0 THEN v_caller_id
      ELSE admin_replied_by
    END,
    replied_at = CASE
      WHEN v_replied_at IS NOT NULL THEN v_replied_at
      ELSE replied_at
    END,
    resolved_at = CASE
      WHEN p_status = 'Resolved' THEN COALESCE(resolved_at, v_resolved_at)
      ELSE NULL
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_feedback_id;

  -- Compliance Audit Log
  INSERT INTO public.audit_logs (
    timestamp, actor_id, actor_name, actor_email, actor_role,
    action, resource_type, resource_id, details, outcome, ip_address, changes
  ) VALUES (
    timezone('utc'::text, now()), v_caller_id, v_actor_name, v_actor_email, v_actor_role,
    'UPDATE_FEEDBACK_STATUS', 'feedback_submissions', p_feedback_id::text,
    'Updated feedback ticket status from ' || v_old_status || ' to ' || p_status ||
      CASE WHEN p_admin_reply IS NOT NULL THEN ' with admin reply.' ELSE '.' END,
    'SUCCESS', '127.0.0.1',
    jsonb_build_object(
      'feedback_id', p_feedback_id,
      'old_status', v_old_status,
      'new_status', p_status,
      'has_reply', (p_admin_reply IS NOT NULL AND char_length(trim(p_admin_reply)) > 0)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', p_feedback_id,
    'status', p_status,
    'replied_at', v_replied_at,
    'resolved_at', v_resolved_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_feedback_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_feedback_status(UUID, TEXT, TEXT) TO authenticated;
