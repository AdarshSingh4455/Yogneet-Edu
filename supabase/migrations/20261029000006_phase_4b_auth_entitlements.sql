-- ==============================================================================
-- Migration: 20261029000006_phase_4b_auth_entitlements.sql
-- Project: Yogneet Edu (Branded: Tech Geek Adarsh)
-- Description: Phase 4B Real Authentication, RBAC, Staff Provisioning & Entitlements:
--   1. Adds access_category, institution, program to public.profiles.
--   2. Hardens protect_profile_privileged_fields trigger with session bypass for internal sync.
--   3. Secure lifecycle: handle_new_user() restricts unverified signups to standard student role.
--   4. Adds handle_user_email_confirmed() trigger and reconcile_verified_user_entitlements()
--      with advisory locking to prevent replay, race conditions, and unverified privilege claims.
--   5. Adds staff_invitations table with admin-only RLS and admin_provision_staff_account RPC.
--   6. Adds student entitlement management RPC and has_entitlement function.
--   7. Adds server-side content & assessment entitlement enforcement to get_assessment_questions_for_taking,
--      submit_assessment_attempt, and get_study_note_download_url.
--   8. Hardens storage RLS policies on yogneet-private for pro/managed/scholarship notes downloads.
-- ==============================================================================

-- 1. Extend Profiles Table with Access Categories & Institutional Fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_category TEXT NOT NULL DEFAULT 'standard'
  CHECK (access_category IN ('standard', 'pro', 'managed', 'scholarship')),
  ADD COLUMN IF NOT EXISTS institution TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS program TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_profiles_access_category ON public.profiles(access_category);

-- 2. Staff Invitations & Pre-Provisioning Table
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'subadmin' CHECK (role IN ('subadmin', 'admin')),
  department TEXT DEFAULT 'Curriculum & Video Authoring',
  bio TEXT DEFAULT '',
  permissions TEXT[] DEFAULT '{}',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON public.staff_invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON public.staff_invitations(status);

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_invitations_admin_all" ON public.staff_invitations;
CREATE POLICY "staff_invitations_admin_all"
  ON public.staff_invitations
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Content & Assessment Entitlement Metadata
ALTER TABLE public.study_notes
  ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_tier TEXT NOT NULL DEFAULT 'standard'
  CHECK (required_tier IN ('standard', 'pro', 'managed', 'scholarship'));

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_tier TEXT NOT NULL DEFAULT 'standard'
  CHECK (required_tier IN ('standard', 'pro', 'managed', 'scholarship'));

ALTER TABLE public.practical_assignments
  ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_tier TEXT NOT NULL DEFAULT 'standard'
  CHECK (required_tier IN ('standard', 'pro', 'managed', 'scholarship'));

-- 4. Entitlement Verification Function
CREATE OR REPLACE FUNCTION public.has_entitlement(p_user_id UUID, p_required_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_role TEXT;
  v_user_tier TEXT;
  v_user_status TEXT;
BEGIN
  IF p_required_tier = 'standard' OR p_required_tier IS NULL THEN
    RETURN true;
  END IF;

  SELECT role, access_category, status
  INTO v_user_role, v_user_tier, v_user_status
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_user_status <> 'active' THEN
    RETURN false;
  END IF;

  -- Admins and staff have unrestricted platform access
  IF v_user_role IN ('admin', 'subadmin') THEN
    RETURN true;
  END IF;

  -- Pro tier students have access to Pro and Standard content
  IF v_user_tier = 'pro' AND p_required_tier IN ('standard', 'pro') THEN
    RETURN true;
  END IF;

  -- Managed and Scholarship cohorts receive full platform entitlement
  IF v_user_tier IN ('managed', 'scholarship') THEN
    RETURN true;
  END IF;

  -- Exact tier match
  IF v_user_tier = p_required_tier THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 5. Hardened Profile Privileged Fields Trigger (Guards Role, Status & Access Category)
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Allow verified internal auth synchronization (e.g. from post-verification trigger)
  IF current_setting('yogneet.internal_auth_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Defense-in-depth: If secondary trigger depth > 1 (e.g. from internal scoring trigger)
  IF pg_trigger_depth() > 1 THEN
    IF OLD.role <> NEW.role OR OLD.status <> NEW.status OR OLD.email <> NEW.email
       OR OLD.created_at <> NEW.created_at OR OLD.solved_problems_count <> NEW.solved_problems_count
       OR OLD.name <> NEW.name OR OLD.avatar_url <> NEW.avatar_url
       OR OLD.department <> NEW.department OR OLD.bio <> NEW.bio
       OR OLD.enrolled_courses <> NEW.enrolled_courses
       OR OLD.access_category <> NEW.access_category THEN
      RAISE EXCEPTION 'Access Denied: Core identity, authorization, and entitlement fields cannot be modified via trigger.';
    END IF;

    IF NEW.tests_completed_count <> OLD.tests_completed_count AND NEW.tests_completed_count <> OLD.tests_completed_count + 1 THEN
      RAISE EXCEPTION 'Access Denied: tests_completed_count can only be incremented sequentially.';
    END IF;
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

-- 6. Core Reconciliation Function for Verified Users
CREATE OR REPLACE FUNCTION public.reconcile_verified_user_entitlements(
  p_user_id UUID,
  p_email TEXT,
  p_user_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_inv_id UUID;
  v_inv_name TEXT;
  v_inv_role TEXT;
  v_inv_department TEXT;
  v_inv_bio TEXT;
  v_inv_permissions TEXT[];
  v_dir_name TEXT;
  v_dir_department TEXT;
  v_dir_institution TEXT;
  v_dir_program TEXT;
  v_dir_access TEXT;
  v_perm TEXT;
  v_display_name TEXT;
BEGIN
  -- Concurrency control: Lock on email hash prevents race conditions and duplicate claims
  IF NOT pg_try_advisory_xact_lock(hashtext('entitlement_reconcile:' || lower(trim(p_email)))) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'concurrent_request');
  END IF;

  -- Temporarily enable internal sync setting for profile update
  PERFORM set_config('yogneet.internal_auth_sync', 'on', true);

  v_display_name := COALESCE(p_user_name, split_part(p_email, '@', 1));

  -- Step 1: Check pending staff invitations
  SELECT id, name, role, department, bio, permissions
  INTO v_inv_id, v_inv_name, v_inv_role, v_inv_department, v_inv_bio, v_inv_permissions
  FROM public.staff_invitations
  WHERE lower(email) = lower(trim(p_email))
    AND status = 'pending'
  FOR UPDATE;

  IF v_inv_role IS NOT NULL THEN
    -- Elevate to authorized staff profile
    UPDATE public.profiles
    SET role = v_inv_role,
        name = COALESCE(v_inv_name, name, v_display_name),
        department = COALESCE(v_inv_department, 'Curriculum & Video Authoring'),
        bio = COALESCE(v_inv_bio, ''),
        status = 'active',
        last_active = timezone('utc'::text, now())
    WHERE id = p_user_id;

    -- Assign pre-configured permissions
    IF v_inv_permissions IS NOT NULL AND array_length(v_inv_permissions, 1) > 0 THEN
      FOREACH v_perm IN ARRAY v_inv_permissions LOOP
        INSERT INTO public.user_permissions (user_id, permission_key)
        VALUES (p_user_id, v_perm)
        ON CONFLICT (user_id, permission_key) DO NOTHING;
      END LOOP;
    END IF;

    -- Mark invitation accepted atomically
    UPDATE public.staff_invitations
    SET status = 'accepted', updated_at = timezone('utc'::text, now())
    WHERE id = v_inv_id;

    -- Emit audit log
    INSERT INTO public.audit_logs (
      actor_id, actor_name, actor_role, action, resource_type, resource_id, details, outcome
    ) VALUES (
      p_user_id,
      COALESCE(v_inv_name, v_display_name),
      v_inv_role,
      'subadmins.invitation_accepted',
      'StaffInvitation',
      p_email,
      format('Verified email %s redeemed staff invitation as %s.', p_email, v_inv_role),
      'SUCCESS'
    );

    RETURN jsonb_build_object('success', true, 'type', 'staff', 'role', v_inv_role);
  END IF;

  -- Step 2: Check student directory pre-enrollment
  SELECT name, department, institution, program, access_category
  INTO v_dir_name, v_dir_department, v_dir_institution, v_dir_program, v_dir_access
  FROM public.student_directory
  WHERE lower(email) = lower(trim(p_email))
  FOR UPDATE;

  IF v_dir_access IS NOT NULL THEN
    UPDATE public.profiles
    SET access_category = v_dir_access,
        name = COALESCE(v_dir_name, name, v_display_name),
        department = COALESCE(v_dir_department, department, 'Enrolled Student'),
        institution = COALESCE(v_dir_institution, institution, ''),
        program = COALESCE(v_dir_program, program, 'B.Tech'),
        status = 'active',
        last_active = timezone('utc'::text, now())
    WHERE id = p_user_id;

    UPDATE public.student_directory
    SET status = 'active', updated_at = timezone('utc'::text, now())
    WHERE lower(email) = lower(trim(p_email));

    RETURN jsonb_build_object('success', true, 'type', 'student_directory', 'accessCategory', v_dir_access);
  END IF;

  RETURN jsonb_build_object('success', true, 'type', 'standard_student');
END;
$$;

-- 7. User Registration Trigger (handle_new_user)
-- Restricts unverified signups strictly to standard student access.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_name TEXT;
  v_is_email_verified BOOLEAN;
BEGIN
  v_user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Check if user's email is verified at registration time (e.g. Google OAuth or Admin Invite)
  v_is_email_verified := (NEW.email_confirmed_at IS NOT NULL)
                      OR (NEW.confirmed_at IS NOT NULL)
                      OR (COALESCE(NEW.raw_app_meta_data->>'provider', '') IN ('google', 'oauth'))
                      OR (NEW.invited_at IS NOT NULL);

  -- 1. Always create base profile with strict student role and standard tier initially
  INSERT INTO public.profiles (
    id, name, email, avatar_url, role, status, department, institution, program, access_category
  )
  VALUES (
    NEW.id,
    v_user_name,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'),
    'student',
    'active',
    'Enrolled Student',
    '',
    'B.Tech',
    'standard'
  )
  ON CONFLICT (id) DO UPDATE SET
    last_active = timezone('utc'::text, now());

  -- 2. ONLY if email is verified at creation time, reconcile staff/directory entitlements
  IF v_is_email_verified THEN
    PERFORM public.reconcile_verified_user_entitlements(NEW.id, NEW.email, v_user_name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Post-Verification Trigger (handle_user_email_confirmed)
-- Fires when an unverified user completes email confirmation.
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Only execute when confirmation timestamp transitions from NULL to NOT NULL
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
     OR (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) THEN
    PERFORM public.reconcile_verified_user_entitlements(
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'name'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at, confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_confirmed();

-- 9. Self-Service Entitlement Synchronization RPC
CREATE OR REPLACE FUNCTION public.sync_verified_user_entitlements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_user_name TEXT;
  v_confirmed TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: You must be authenticated to sync entitlements.';
  END IF;

  SELECT email, email_confirmed_at, raw_user_meta_data->>'name'
  INTO v_user_email, v_confirmed, v_user_name
  FROM auth.users
  WHERE id = v_user_id;

  IF v_confirmed IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'verified', false,
      'message', 'Email address is not yet verified.'
    );
  END IF;

  RETURN public.reconcile_verified_user_entitlements(v_user_id, v_user_email, v_user_name);
END;
$$;

-- 10. Server-Side Entitlement Checks on Assessment Taking & Submission RPCs

-- A. get_assessment_questions_for_taking
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_test RECORD;
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Access Denied: You must be an active, authenticated user to access assessment questions.';
  END IF;

  SELECT * INTO v_test FROM public.assessments WHERE id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found: %', p_test_id;
  END IF;

  IF v_test.status <> 'available' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Assessment is not currently open for taking (status: %).', v_test.status;
  END IF;

  -- Server-side entitlement check for restricted assessments
  IF (v_test.is_restricted OR v_test.required_tier <> 'standard')
     AND NOT (public.is_staff() OR public.has_entitlement(v_caller_id, v_test.required_tier)) THEN
    RAISE EXCEPTION 'Access Denied: This assessment requires "%" entitlement tier.', v_test.required_tier;
  END IF;

  RETURN QUERY
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
  ORDER BY q.question_number ASC;
END;
$$;

-- B. submit_assessment_attempt (Hardened with Entitlement Validation)
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
  v_unanswered_count INTEGER := 0;
  v_marked_count INTEGER := 0;
  v_correct_count INTEGER := 0;
  v_incorrect_count INTEGER := 0;
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

  -- D. Validate assessment existence, published status, and entitlement tier
  SELECT * INTO v_test FROM public.assessments WHERE id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found: %', p_test_id;
  END IF;

  IF v_test.status <> 'available' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Assessment is not currently open for submission (status: %).', v_test.status;
  END IF;

  -- Server-side entitlement check for restricted assessments
  IF (v_test.is_restricted OR v_test.required_tier <> 'standard')
     AND NOT (public.is_staff() OR public.has_entitlement(v_user_id, v_test.required_tier)) THEN
    RAISE EXCEPTION 'Access Denied: Your account does not have the required "%" entitlement tier to submit this assessment.', v_test.required_tier;
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
    RAISE EXCEPTION 'Validation Failed: Payload contains questions not belonging to this assessment.';
  END IF;

  -- E. Authoritative server-side evaluation
  FOR v_q IN
    SELECT id, marks, negative_marks, correct_answer_id
    FROM public.assessment_questions
    WHERE test_id = p_test_id
    ORDER BY question_number ASC
  LOOP
    v_total_questions := v_total_questions + 1;
    v_max_score := v_max_score + v_q.marks;

    IF p_user_answers ? v_q.id THEN
      v_selected_opt := p_user_answers->>v_q.id;
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

  IF v_total_questions = 0 OR v_max_score <= 0 THEN
    RAISE EXCEPTION 'Assessment configuration error: test has no valid questions or maximum marks.';
  END IF;

  v_score_obtained := GREATEST(0, v_score_obtained);
  v_percentage := ROUND((v_score_obtained / v_max_score) * 100);
  v_passed := v_percentage >= v_test.pass_percentage;

  -- F. Write authoritative attempt
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

-- 11. Study Notes Download Authorization RPC
CREATE OR REPLACE FUNCTION public.get_study_note_download_url(p_note_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_note RECORD;
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Access Denied: You must be an active, authenticated user to access study notes.';
  END IF;

  SELECT * INTO v_note FROM public.study_notes WHERE id = p_note_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Study note not found.';
  END IF;

  IF v_note.status <> 'published' AND NOT public.is_staff() AND v_note.author_id <> v_caller_id THEN
    RAISE EXCEPTION 'Study note is not published.';
  END IF;

  -- Server-side entitlement check for restricted study notes
  IF (v_note.is_restricted OR v_note.required_tier <> 'standard')
     AND NOT (public.is_staff() OR public.has_entitlement(v_caller_id, v_note.required_tier)) THEN
    RAISE EXCEPTION 'Access Denied: This study note requires "%" entitlement tier.', v_note.required_tier;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'noteId', v_note.id,
    'title', v_note.title,
    'fileUrl', v_note.file_url,
    'isRestricted', v_note.is_restricted,
    'requiredTier', v_note.required_tier
  );
END;
$$;

-- 12. Storage RLS Policies for Private Entitled Downloads
DROP POLICY IF EXISTS "storage_private_select" ON storage.objects;
CREATE POLICY "storage_private_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'yogneet-private'
    AND (
      -- Staff and Admins always have access
      public.is_staff()
      -- Uploader has access to their own folder
      OR (storage.foldername(name))[1] = auth.uid()::text
      -- Entitled students can access notes folder if they hold Pro or higher entitlement
      OR (
        (storage.foldername(name))[1] = 'notes'
        AND public.has_entitlement(auth.uid(), 'pro')
      )
    )
  );

-- 13. Admin Staff Provisioning RPC
CREATE OR REPLACE FUNCTION public.admin_provision_staff_account(
  p_email TEXT,
  p_name TEXT,
  p_role TEXT,
  p_department TEXT DEFAULT 'Curriculum & Video Authoring',
  p_bio TEXT DEFAULT '',
  p_permissions TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor_role TEXT;
  v_existing_profile_id UUID;
  v_perm TEXT;
BEGIN
  -- Authorization: Only active Super Admins can provision staff
  SELECT role INTO v_actor_role
  FROM public.profiles
  WHERE id = auth.uid() AND status = 'active';

  IF v_actor_role <> 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only platform administrators can provision staff accounts.';
  END IF;

  -- Validate role
  IF p_role NOT IN ('subadmin', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: Staff role must be subadmin or admin.';
  END IF;

  -- Upsert into staff_invitations
  INSERT INTO public.staff_invitations (
    email, name, role, department, bio, permissions, invited_by, status, updated_at
  )
  VALUES (
    lower(trim(p_email)),
    trim(p_name),
    p_role,
    trim(p_department),
    trim(p_bio),
    p_permissions,
    auth.uid(),
    'pending',
    timezone('utc'::text, now())
  )
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    bio = EXCLUDED.bio,
    permissions = EXCLUDED.permissions,
    invited_by = EXCLUDED.invited_by,
    status = 'pending',
    updated_at = timezone('utc'::text, now())
  WHERE staff_invitations.status <> 'accepted'; -- Never overwrite already accepted staff accounts

  -- Check if user profile already exists
  SELECT id INTO v_existing_profile_id
  FROM public.profiles
  WHERE lower(email) = lower(trim(p_email));

  IF v_existing_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role = p_role,
        department = trim(p_department),
        bio = trim(p_bio),
        status = 'active'
    WHERE id = v_existing_profile_id;

    IF p_permissions IS NOT NULL AND array_length(p_permissions, 1) > 0 THEN
      FOREACH v_perm IN ARRAY p_permissions LOOP
        INSERT INTO public.user_permissions (user_id, permission_key)
        VALUES (v_existing_profile_id, v_perm)
        ON CONFLICT (user_id, permission_key) DO NOTHING;
      END LOOP;
    END IF;

    UPDATE public.staff_invitations
    SET status = 'accepted'
    WHERE lower(email) = lower(trim(p_email));

    RETURN jsonb_build_object(
      'success', true,
      'status', 'activated',
      'email', lower(trim(p_email)),
      'userId', v_existing_profile_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'invited',
    'email', lower(trim(p_email))
  );
END;
$$;

-- 14. Admin Student Entitlement RPC
CREATE OR REPLACE FUNCTION public.admin_update_student_entitlement(
  p_student_id UUID,
  p_access_category TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_actor_role TEXT;
BEGIN
  SELECT role INTO v_actor_role
  FROM public.profiles
  WHERE id = auth.uid() AND status = 'active';

  IF v_actor_role <> 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can grant or revoke student access tiers.';
  END IF;

  IF p_access_category NOT IN ('standard', 'pro', 'managed', 'scholarship') THEN
    RAISE EXCEPTION 'Invalid access category.';
  END IF;

  UPDATE public.profiles
  SET access_category = p_access_category,
      last_active = timezone('utc'::text, now())
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'studentId', p_student_id,
    'accessCategory', p_access_category
  );
END;
$$;

-- 15. Explicit Least-Privilege Grants
REVOKE EXECUTE ON FUNCTION public.admin_provision_staff_account FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_provision_staff_account TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_student_entitlement FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_student_entitlement TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_entitlement FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_entitlement TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_study_note_download_url FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_study_note_download_url TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_verified_user_entitlements FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.sync_verified_user_entitlements TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_assessment_questions_for_taking FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_questions_for_taking TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_assessment_attempt FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_assessment_attempt TO authenticated;
