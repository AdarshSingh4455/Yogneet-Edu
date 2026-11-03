-- ==============================================================================
-- Migration: 20261103000024_harden_audit_logging_fail_closed.sql
-- Description:
--   Hardens public.log_audit_event() to enforce strict fail-closed audit integrity:
--   1. Replaces exception-swallowing block with fail-closed RAISE EXCEPTION so
--      privileged operations CANNOT silently bypass mandatory audit logging.
--   2. Prevents actor spoofing by binding non-admin callers to auth.uid().
--   3. Guarantees transactional atomicity between business operations and audit logs.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_actor_id UUID,
  p_action TEXT,
  p_outcome TEXT DEFAULT 'SUCCESS',
  p_changes JSONB DEFAULT '{}'::jsonb,
  p_details TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_log_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_role TEXT;
  v_res_type TEXT;
  v_res_id TEXT;
  v_details TEXT;
  v_effective_actor_id UUID;
BEGIN
  -- Strict Input Validation
  IF p_action IS NULL OR trim(p_action) = '' THEN
    RAISE EXCEPTION 'Mandatory audit logging failed: action cannot be null or empty.';
  END IF;

  -- 1. Anti-Spoofing & Actor Resolution
  -- Distinguish trusted internal trigger execution from direct client RPC execution
  IF auth.uid() IS NOT NULL AND pg_trigger_depth() = 0 THEN
    -- Direct client RPC execution by ANY authenticated user (student, subadmin, superadmin):
    -- Neither students, sub-admins, nor superadmins may forge arbitrary actor identities.
    -- Actor is strictly bound to caller's authentic auth.uid().
    v_effective_actor_id := auth.uid();
  ELSIF pg_trigger_depth() > 0 THEN
    -- Trusted internal trigger execution: allow trigger-specified actor, fallback to auth.uid()
    v_effective_actor_id := COALESCE(p_actor_id, auth.uid());
  ELSE
    -- Trusted service execution / system-generated events (auth.uid() is NULL):
    -- Preserve legitimate system-generated or service-managed actor attribution
    v_effective_actor_id := p_actor_id;
  END IF;

  -- Resolve actor metadata from profiles table
  IF v_effective_actor_id IS NOT NULL THEN
    SELECT name, email, role
    INTO v_name, v_email, v_role
    FROM public.profiles
    WHERE id = v_effective_actor_id;
  END IF;

  v_name := COALESCE(v_name, 'System');
  v_email := COALESCE(v_email, 'system@yogneet.internal');
  v_role := COALESCE(v_role, 'system');

  v_res_type := COALESCE(
    p_resource_type,
    CASE 
      WHEN p_action LIKE 'PROFILE%' THEN 'profiles'
      WHEN p_action LIKE 'ICON%' THEN 'icon_library'
      WHEN p_action LIKE 'FEEDBACK%' THEN 'feedback_submissions'
      ELSE 'system'
    END
  );

  v_res_id := COALESCE(
    p_resource_id,
    COALESCE(
      p_changes->>'id',
      p_changes->>'profile_id',
      p_changes->>'icon_id',
      p_changes->>'feedback_id',
      v_effective_actor_id::text,
      'global'
    )
  );

  v_details := COALESCE(
    p_details,
    format('%s performed %s with outcome %s', v_name, p_action, p_outcome)
  );

  -- 2. Transactional Insertion
  -- If this insert fails, it MUST raise an exception and roll back the outer transaction
  INSERT INTO public.audit_logs (
    timestamp,
    actor_id,
    actor_name,
    actor_email,
    actor_role,
    action,
    resource_type,
    resource_id,
    details,
    outcome,
    ip_address,
    changes
  ) VALUES (
    timezone('utc'::text, now()),
    v_effective_actor_id,
    v_name,
    v_email,
    v_role,
    p_action,
    v_res_type,
    v_res_id,
    v_details,
    COALESCE(p_outcome, 'SUCCESS'),
    '127.0.0.1',
    COALESCE(p_changes, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail-closed: Never allow privileged operations to succeed silently without an audit log
    RAISE EXCEPTION 'Mandatory audit logging failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated, service_role;
