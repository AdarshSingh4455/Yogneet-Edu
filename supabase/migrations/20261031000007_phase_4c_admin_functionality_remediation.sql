-- ==============================================================================
-- Migration: 20261031000007_phase_4c_admin_functionality_remediation.sql
-- Description: Consolidates and version-controls all database remediations
--              for Admin & Sub-Admin functionality and student entitlements.
-- ==============================================================================

-- 1. Student Directory Access Category Constraint
-- Support all 4 entitlement tiers: standard, pro, managed, scholarship
ALTER TABLE public.student_directory
  DROP CONSTRAINT IF EXISTS student_directory_access_category_check;

ALTER TABLE public.student_directory
  ADD CONSTRAINT student_directory_access_category_check
  CHECK (access_category IN ('standard', 'pro', 'managed', 'scholarship'));

-- 2. Hardened Profile Privileged Fields Trigger Function
-- Allows service_role key (server-side admin operations & background jobs) and super admin role
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

  -- Allow service_role key (server-side admin operations & automated tests)
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

-- 3. Masked Assessment Questions for Taking (Eliminate Column Reference Ambiguity)
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
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_test RECORD;
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Access Denied: You must be an active, authenticated user to take assessments.';
  END IF;

  -- Query assessment using alias 'a' to avoid ambiguity with output column 'id'
  SELECT * INTO v_test FROM public.assessments a WHERE a.id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found.';
  END IF;

  IF v_test.status <> 'available' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Assessment is not currently available.';
  END IF;

  -- Enforce server-side entitlement tier
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

-- 4. Study Notes Download Authorization RPC (Accepts TEXT id)
DROP FUNCTION IF EXISTS public.get_study_note_download_url(UUID);
DROP FUNCTION IF EXISTS public.get_study_note_download_url(TEXT);

CREATE OR REPLACE FUNCTION public.get_study_note_download_url(p_note_id TEXT)
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

-- 5. Student Entitlement Update RPC (Updates Profile and/or Student Directory)
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
  v_rows_affected INTEGER;
BEGIN
  -- Allow service_role key or active super admin
  IF auth.role() <> 'service_role' AND (auth.jwt() ->> 'role') <> 'service_role' THEN
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = auth.uid() AND status = 'active';

    IF v_actor_role <> 'admin' THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can grant or revoke student access tiers.';
    END IF;
  END IF;

  IF p_access_category NOT IN ('standard', 'pro', 'managed', 'scholarship') THEN
    RAISE EXCEPTION 'Invalid access category.';
  END IF;

  -- 1. Try updating public.profiles (for active registered students)
  UPDATE public.profiles
  SET access_category = p_access_category,
      last_active = timezone('utc'::text, now())
  WHERE id = p_student_id;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  -- 2. If no profile matched, update public.student_directory (for pre-enrolled students)
  IF v_rows_affected = 0 THEN
    UPDATE public.student_directory
    SET access_category = p_access_category,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_student_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'studentId', p_student_id,
    'accessCategory', p_access_category
  );
END;
$$;

-- 6. Core Reconciliation Function for Verified Users
-- Fixes missing actor_email column in audit_logs insertion upon staff invitation acceptance
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

    -- Emit audit log (includes actor_email)
    INSERT INTO public.audit_logs (
      actor_id, actor_name, actor_email, actor_role, action, resource_type, resource_id, details, outcome
    ) VALUES (
      p_user_id,
      COALESCE(v_inv_name, v_display_name),
      p_email,
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

-- 7. Permissions and Execution Grants
REVOKE EXECUTE ON FUNCTION public.get_assessment_questions_for_taking FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_assessment_questions_for_taking TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_study_note_download_url FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_study_note_download_url TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_student_entitlement FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_student_entitlement TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reconcile_verified_user_entitlements FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_verified_user_entitlements TO authenticated, service_role;
