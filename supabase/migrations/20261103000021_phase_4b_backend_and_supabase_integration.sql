-- ==============================================================================
-- Migration: 20261103000021_phase_4b_backend_and_supabase_integration.sql
-- Description:
--   Phase 4B Hot-Add Complete Backend & Supabase Integration
--   1. Secure Submitter Feedback History RPC (get_my_feedback_submissions)
--      and automated notification generation on admin replies.
--   2. Persistent Notifications Data Model, RLS, and RPC operations.
--   3. Real Day Streak Tracking & Study Activity Engine (user_study_activities,
--      user_streaks, and assessment completion hooks).
--   4. Admin Icon Library Persistent Storage, CRUD, and Reference Protection.
--   5. Profile Updates Audit Logging.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURE SUBMITTER FEEDBACK HISTORY RPC
-- ------------------------------------------------------------------------------
-- Recreate get_my_feedback_submissions with strict caller-identity derivation (auth.uid()).
-- Non-admin users can view only their own submitted tickets and admin replies.
-- Direct table access via PostgREST remains strictly blocked for non-admins by RLS.

CREATE OR REPLACE FUNCTION public.get_my_feedback_submissions()
RETURNS TABLE (
  id UUID,
  category TEXT,
  title TEXT,
  description TEXT,
  attachment_url TEXT,
  status TEXT,
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to retrieve feedback submissions.';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.category,
    f.title,
    f.description,
    f.attachment_url,
    f.status,
    f.admin_reply,
    f.replied_at,
    f.created_at,
    f.updated_at
  FROM public.feedback_submissions f
  WHERE f.user_id = v_user_id
  ORDER BY f.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_feedback_submissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_feedback_submissions() TO authenticated;

-- Ensure feedback status check constraint supports standard lifecycle states
ALTER TABLE public.feedback_submissions 
  DROP CONSTRAINT IF EXISTS feedback_submissions_status_check;
ALTER TABLE public.feedback_submissions 
  ADD CONSTRAINT feedback_submissions_status_check 
  CHECK (status IN ('New', 'Pending', 'In Progress', 'Resolved'));

-- ------------------------------------------------------------------------------
-- 2. PERSISTENT NOTIFICATION SYSTEM
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('announcement', 'notes', 'video', 'test', 'feedback', 'result', 'platform')),
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 250),
  description TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_resource_type TEXT,
  related_resource_id TEXT,
  destination_route TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_admin_or_system" ON public.notifications;
CREATE POLICY "notifications_insert_admin_or_system"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- RPC: Get My Notifications
CREATE OR REPLACE FUNCTION public.get_my_notifications(
  p_filter_unread BOOLEAN DEFAULT false,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  title TEXT,
  description TEXT,
  is_read BOOLEAN,
  related_resource_type TEXT,
  related_resource_id TEXT,
  destination_route TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.category,
    n.title,
    n.description,
    n.is_read,
    n.related_resource_type,
    n.related_resource_id,
    n.destination_route,
    n.created_at,
    n.read_at
  FROM public.notifications n
  WHERE n.user_id = v_user_id
    AND (NOT p_filter_unread OR n.is_read = false)
  ORDER BY n.created_at DESC
  LIMIT LEAST(p_limit, 100);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_notifications(BOOLEAN, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_notifications(BOOLEAN, INTEGER) TO authenticated;

-- RPC: Mark Notification as Read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.notifications
  SET is_read = true,
      read_at = timezone('utc'::text, now())
  WHERE id = p_notification_id
    AND user_id = v_user_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

-- RPC: Mark All Notifications as Read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  WITH updated AS (
    UPDATE public.notifications
    SET is_read = true,
        read_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id
      AND is_read = false
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- RPC: System/Admin Notification Creation Helper
CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id UUID,
  p_category TEXT,
  p_title TEXT,
  p_description TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Strict Authorization Guard: Only Platform Administrators or internal system/trigger execution may dispatch notifications
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators or internal triggers may dispatch notifications.';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    category,
    title,
    description,
    related_resource_type,
    related_resource_id,
    destination_route
  ) VALUES (
    p_user_id,
    p_category,
    p_title,
    p_description,
    p_resource_type,
    p_resource_id,
    p_route
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_user_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Update admin_reply_feedback to dispatch notification to the feedback submitter
CREATE OR REPLACE FUNCTION public.admin_reply_feedback(
  p_feedback_id UUID,
  p_reply_text TEXT,
  p_new_status TEXT DEFAULT 'In Progress'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_feedback RECORD;
  v_resolved_at TIMESTAMPTZ := NULL;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Administrators can reply to feedback.';
  END IF;

  SELECT * INTO v_feedback
  FROM public.feedback_submissions
  WHERE id = p_feedback_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback record not found: %', p_feedback_id;
  END IF;

  IF p_new_status NOT IN ('New', 'Pending', 'In Progress', 'Resolved') THEN
    RAISE EXCEPTION 'Invalid status. Must be Pending, In Progress, or Resolved.';
  END IF;

  IF p_new_status = 'Resolved' THEN
    v_resolved_at := v_now;
  END IF;

  UPDATE public.feedback_submissions
  SET admin_reply = p_reply_text,
      admin_replied_by = v_admin_id,
      replied_at = v_now,
      status = p_new_status,
      resolved_at = v_resolved_at,
      updated_at = v_now
  WHERE id = p_feedback_id;

  -- Dispatch notification to the original submitter
  PERFORM public.create_user_notification(
    v_feedback.user_id,
    'feedback',
    'Admin Responded to Your Feedback',
    'Your inquiry "' || v_feedback.title || '" has received an official response (Status: ' || p_new_status || ').',
    'feedback_submissions',
    p_feedback_id::text,
    '/feedback'
  );

  -- Record audit log
  PERFORM public.log_audit_event(
    v_admin_id,
    'FEEDBACK_REPLY_SUBMITTED',
    'SUCCESS',
    jsonb_build_object(
      'feedback_id', p_feedback_id,
      'submitter_id', v_feedback.user_id,
      'new_status', p_new_status
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', p_feedback_id,
    'status', p_new_status,
    'replied_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reply_feedback(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reply_feedback(UUID, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. DAY STREAK & STUDY ACTIVITY TRACKING ENGINE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_study_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('assessment_completion', 'lesson_completion', 'practical_challenge', 'notes_study')),
  activity_id TEXT NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT unique_user_daily_activity UNIQUE (user_id, activity_type, activity_date, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_study_activities_user_date ON public.user_study_activities(user_id, activity_date DESC);
ALTER TABLE public.user_study_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_activities" ON public.user_study_activities;
CREATE POLICY "users_select_own_activities"
  ON public.user_study_activities
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  total_active_days INTEGER NOT NULL DEFAULT 0 CHECK (total_active_days >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_streak" ON public.user_streaks;
CREATE POLICY "users_select_own_streak"
  ON public.user_streaks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Study Streak Synchronization Trigger: Updates user_streaks automatically on valid activity insertion
CREATE OR REPLACE FUNCTION public.trg_study_activity_sync_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_streak RECORD;
  v_current_streak INTEGER := 1;
  v_longest_streak INTEGER := 1;
  v_total_days INTEGER := 1;
BEGIN
  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (
      user_id,
      current_streak,
      longest_streak,
      last_activity_date,
      total_active_days,
      updated_at
    ) VALUES (
      NEW.user_id,
      1,
      1,
      NEW.activity_date,
      1,
      timezone('utc'::text, now())
    );
  ELSE
    IF v_streak.last_activity_date = NEW.activity_date THEN
      -- Same day activity: maintain current streak without artificial inflation
      NULL;
    ELSIF v_streak.last_activity_date = (NEW.activity_date - INTERVAL '1 day')::date THEN
      -- Consecutive day: increment streak
      v_current_streak := v_streak.current_streak + 1;
      v_longest_streak := GREATEST(v_streak.longest_streak, v_current_streak);
      v_total_days := v_streak.total_active_days + 1;
      UPDATE public.user_streaks
      SET current_streak = v_current_streak,
          longest_streak = v_longest_streak,
          last_activity_date = NEW.activity_date,
          total_active_days = v_total_days,
          updated_at = timezone('utc'::text, now())
      WHERE user_id = NEW.user_id;
    ELSIF v_streak.last_activity_date < (NEW.activity_date - INTERVAL '1 day')::date THEN
      -- Lapsed streak (missed day): reset current streak to 1
      v_current_streak := 1;
      v_longest_streak := GREATEST(v_streak.longest_streak, 1);
      v_total_days := v_streak.total_active_days + 1;
      UPDATE public.user_streaks
      SET current_streak = v_current_streak,
          longest_streak = v_longest_streak,
          last_activity_date = NEW.activity_date,
          total_active_days = v_total_days,
          updated_at = timezone('utc'::text, now())
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_study_activity_streak ON public.user_study_activities;
CREATE TRIGGER trg_study_activity_streak
  AFTER INSERT ON public.user_study_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_study_activity_sync_streak();

-- ------------------------------------------------------------------------------
-- DEPRECATED & LOCKED: Direct client invocation of record_qualifying_study_activity
-- ------------------------------------------------------------------------------
-- Client-side invocation is permanently disabled to prevent streak spoofing.
-- Qualifying study activities are awarded EXCLUSIVELY by trusted database triggers
-- upon verified assessment submissions (trg_assessment_attempt_study_activity).
CREATE OR REPLACE FUNCTION public.record_qualifying_study_activity(
  p_activity_type TEXT,
  p_activity_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Access Denied: Direct client invocation of record_qualifying_study_activity is disabled for security. Study activities are awarded exclusively via verified server triggers.';
END;
$$;

-- Revoke all execution grants: No client (anon, authenticated, public) can invoke this RPC
REVOKE ALL ON FUNCTION public.record_qualifying_study_activity(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- RPC: Get My Streak Summary
CREATE OR REPLACE FUNCTION public.get_my_streak_summary()
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  last_activity_date DATE,
  total_active_days INTEGER,
  has_activity_today BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
  v_streak RECORD;
  v_effective_streak INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, NULL::DATE, 0, false;
    RETURN;
  END IF;

  -- Check if streak has lapsed (last activity was before yesterday)
  IF v_streak.last_activity_date >= (v_today - INTERVAL '1 day')::date THEN
    v_effective_streak := v_streak.current_streak;
  ELSE
    v_effective_streak := 0;
  END IF;

  RETURN QUERY
  SELECT
    v_effective_streak,
    v_streak.longest_streak,
    v_streak.last_activity_date,
    v_streak.total_active_days,
    (v_streak.last_activity_date = v_today);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_streak_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_streak_summary() TO authenticated;

-- Trigger: When an assessment attempt is submitted, automatically record study activity
CREATE OR REPLACE FUNCTION public.trg_record_assessment_streak_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL THEN
    INSERT INTO public.user_study_activities (
      user_id,
      activity_type,
      activity_id,
      activity_date,
      metadata
    ) VALUES (
      NEW.user_id,
      'assessment_completion',
      NEW.test_id::text,
      (NEW.submitted_at AT TIME ZONE 'UTC')::date,
      jsonb_build_object('percentage', NEW.percentage, 'passed', NEW.passed, 'attempt_id', NEW.attempt_id)
    ) ON CONFLICT (user_id, activity_type, activity_date, activity_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_record_assessment_streak_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_assessment_attempt_study_activity ON public.assessment_attempts;
CREATE TRIGGER trg_assessment_attempt_study_activity
  AFTER INSERT OR UPDATE OF submitted_at ON public.assessment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_assessment_streak_activity();

-- ------------------------------------------------------------------------------
-- 4. ADMIN ICON LIBRARY PERSISTENCE & CRUD
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.icon_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  category TEXT NOT NULL CHECK (category IN ('Subjects', 'Micro Subjects', 'Technology', 'General')),
  source_type TEXT NOT NULL CHECK (source_type IN ('lucide', 'url', 'upload')),
  icon_key TEXT,
  image_url TEXT,
  storage_path TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_icon_name_category UNIQUE (name, category)
);

CREATE INDEX IF NOT EXISTS idx_icon_library_category ON public.icon_library(category);
CREATE INDEX IF NOT EXISTS idx_icon_library_source ON public.icon_library(source_type);

ALTER TABLE public.icon_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_icons" ON public.icon_library;
CREATE POLICY "authenticated_select_icons"
  ON public.icon_library
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_manage_icons" ON public.icon_library;
CREATE POLICY "admin_manage_icons"
  ON public.icon_library
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RPC: Reference-aware Icon Deletion
CREATE OR REPLACE FUNCTION public.admin_delete_icon(p_icon_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_icon RECORD;
  v_subjects_count INTEGER := 0;
  v_micro_count INTEGER := 0;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Administrators can delete icon library assets.';
  END IF;

  SELECT * INTO v_icon
  FROM public.icon_library
  WHERE id = p_icon_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Icon not found: %', p_icon_id;
  END IF;

  IF v_icon.is_system THEN
    RAISE EXCEPTION 'Built-in system icons cannot be deleted.';
  END IF;

  -- Check usage in public.subjects
  SELECT count(*) INTO v_subjects_count
  FROM public.subjects
  WHERE lower(icon) = lower(v_icon.name)
     OR (v_icon.icon_key IS NOT NULL AND lower(icon) = lower(v_icon.icon_key));

  -- Check usage in public.micro_subjects
  SELECT count(*) INTO v_micro_count
  FROM public.micro_subjects
  WHERE lower(cover_image) = lower(v_icon.name)
     OR (v_icon.icon_key IS NOT NULL AND lower(cover_image) = lower(v_icon.icon_key))
     OR (v_icon.image_url IS NOT NULL AND cover_image = v_icon.image_url);

  IF v_subjects_count > 0 OR v_micro_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'in_use', true,
      'message', 'Icon is currently assigned to active curriculum content (' || (v_subjects_count + v_micro_count) || ' references). Remove assignments before deleting.'
    );
  END IF;

  DELETE FROM public.icon_library WHERE id = p_icon_id;

  PERFORM public.log_audit_event(
    v_admin_id,
    'ICON_DELETED',
    'SUCCESS',
    jsonb_build_object('icon_id', p_icon_id, 'icon_name', v_icon.name)
  );

  RETURN jsonb_build_object('success', true, 'in_use', false, 'message', 'Icon deleted successfully.');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_icon(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_icon(UUID) TO authenticated;

-- Seed Standard System Icons into icon_library (idempotent)
INSERT INTO public.icon_library (name, category, source_type, icon_key, is_system, display_order)
VALUES
  ('Code & Algorithms', 'Subjects', 'lucide', 'Code', true, 1),
  ('Database Systems', 'Subjects', 'lucide', 'Database', true, 2),
  ('Web Architecture', 'Subjects', 'lucide', 'Globe', true, 3),
  ('Artificial Intelligence', 'Subjects', 'lucide', 'Brain', true, 4),
  ('Computer Systems & Hardware', 'Subjects', 'lucide', 'Cpu', true, 5),
  ('Cloud & DevOps', 'Subjects', 'lucide', 'Server', true, 6),
  ('Terminal & Shell', 'Subjects', 'lucide', 'Terminal', true, 7),
  ('Software Patterns', 'Subjects', 'lucide', 'Layers', true, 8),
  ('Foundational Syllabus', 'Subjects', 'lucide', 'BookOpen', true, 9),
  ('Shorts & Media', 'Micro Subjects', 'lucide', 'Film', true, 10),
  ('Quick Hacks', 'Micro Subjects', 'lucide', 'Zap', true, 11),
  ('Cyber Security', 'Technology', 'lucide', 'Shield', true, 12),
  ('Microservices', 'Technology', 'lucide', 'Boxes', true, 13),
  ('Git & Version Control', 'Technology', 'lucide', 'GitBranch', true, 14),
  ('Frontend Frameworks', 'Technology', 'lucide', 'Code2', true, 15)
ON CONFLICT (name, category) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. AUDIT LOGGING FOR PROFILE MUTATIONS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_audit_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF (OLD.name IS DISTINCT FROM NEW.name) OR
     (OLD.bio IS DISTINCT FROM NEW.bio) OR
     (OLD.department IS DISTINCT FROM NEW.department) OR
     (OLD.institution IS DISTINCT FROM NEW.institution) OR
     (OLD.program IS DISTINCT FROM NEW.program) OR
     (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url) THEN
    PERFORM public.log_audit_event(
      auth.uid(),
      'PROFILE_UPDATED',
      'SUCCESS',
      jsonb_build_object(
        'profile_id', NEW.id,
        'name_changed', (OLD.name IS DISTINCT FROM NEW.name),
        'avatar_changed', (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url),
        'department_changed', (OLD.department IS DISTINCT FROM NEW.department),
        'institution_changed', (OLD.institution IS DISTINCT FROM NEW.institution)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_profile_changes ON public.profiles;
CREATE TRIGGER trg_audit_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_audit_profile_update();

-- ------------------------------------------------------------------------------
-- 6. HARDENED PROFILE PRIVILEGED FIELDS TRIGGER WITH SECONDARY DEPTH DEFENSE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := false;
  v_can_manage_premium BOOLEAN := false;
  v_can_manage_subadmins BOOLEAN := false;
BEGIN
  -- 1. Trusted server-side operations: service_role key or postgres database session user
  IF auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- 2. Internal secondary trigger defense (e.g. sync_profile_test_metrics triggered by attempt insertion)
  -- pg_trigger_depth() is built into PostgreSQL and cannot be spoofed by any client parameter.
  IF pg_trigger_depth() > 1 THEN
    -- Ensure core identity, role, and status remain strictly immutable during secondary trigger execution
    IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.email <> NEW.email OR OLD.created_at <> NEW.created_at THEN
      RAISE EXCEPTION 'Access Denied: Role and status cannot be modified via trigger.';
    END IF;
    -- Restrict tests_completed_count to exact sequential increment (+1) or unchanged
    IF NEW.tests_completed_count <> OLD.tests_completed_count AND NEW.tests_completed_count <> OLD.tests_completed_count + 1 THEN
      RAISE EXCEPTION 'Access Denied: tests_completed_count can only be incremented sequentially by verified scoring events.';
    END IF;
    RETURN NEW;
  END IF;

  -- 3. Caller resolution
  IF v_caller_id IS NOT NULL THEN
    SELECT (role = 'admin' AND status = 'active') INTO v_is_admin
    FROM public.profiles
    WHERE id = v_caller_id;

    -- Super Admin can modify all fields
    IF v_is_admin THEN
      RETURN NEW;
    END IF;

    v_can_manage_premium := public.has_permission(v_caller_id, 'premium_students.manage');
    v_can_manage_subadmins := public.has_permission(v_caller_id, 'subadmins.manage');
  END IF;

  -- 4. Non-admins cannot alter role or account status
  IF OLD.role <> NEW.role OR OLD.status <> NEW.status THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles or account status.';
  END IF;

  -- 5. Non-admins cannot alter authoritative email directly
  IF OLD.email <> NEW.email THEN
    RAISE EXCEPTION 'Access Denied: Email address is managed through authentication credentials.';
  END IF;

  -- 6. Non-admins cannot modify account creation timestamp
  IF OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Access Denied: Account creation timestamp is immutable.';
  END IF;

  -- 7. Access category and premium student fields can ONLY be modified by Admin or Staff with premium_students.manage
  IF (OLD.access_category IS DISTINCT FROM NEW.access_category)
     OR (OLD.is_premium IS DISTINCT FROM NEW.is_premium)
     OR (OLD.enrollment_number IS DISTINCT FROM NEW.enrollment_number)
     OR (OLD.admission_year IS DISTINCT FROM NEW.admission_year)
     OR (OLD.sequential_number IS DISTINCT FROM NEW.sequential_number)
     OR (OLD.yogneet_email IS DISTINCT FROM NEW.yogneet_email) THEN
    IF NOT v_can_manage_premium THEN
      RAISE EXCEPTION 'Access Denied: Only administrators or staff with premium_students.manage can modify premium student entitlements.';
    END IF;
  END IF;

  -- 8. Password reset flag: Strict Bypass Prevention
  IF (OLD.must_change_password IS DISTINCT FROM NEW.must_change_password) THEN
    IF NEW.must_change_password = false THEN
      IF v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins THEN
        NULL;
      ELSIF v_caller_id = OLD.id THEN
        IF current_setting('private.trusted_password_change_in_progress', true) = 'true' THEN
          NULL;
        ELSE
          RAISE EXCEPTION 'Access Denied: Mandatory password flag cannot be cleared directly. Complete the password reset workflow.';
        END IF;
      ELSE
        RAISE EXCEPTION 'Access Denied: Unauthorized attempt to modify credential flags.';
      END IF;
    ELSIF NOT (v_is_admin OR v_can_manage_premium OR v_can_manage_subadmins) THEN
      RAISE EXCEPTION 'Access Denied: Only authorized staff or administrators can modify credential flags.';
    END IF;
  END IF;

  -- 9. Direct client modification of gamification counters is strictly blocked
  IF OLD.solved_problems_count <> NEW.solved_problems_count OR OLD.tests_completed_count <> NEW.tests_completed_count THEN
    RAISE EXCEPTION 'Access Denied: Gamification counters are updated only by verified scoring events.';
  END IF;

  RETURN NEW;
END;
$$;
