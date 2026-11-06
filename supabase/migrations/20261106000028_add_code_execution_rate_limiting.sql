-- ==============================================================================
-- Migration: 20261106000028_add_code_execution_rate_limiting.sql
-- Description: Server-authoritative atomic rate limiting for isolated code execution.
--              Guarantees concurrency safety across all serverless Edge Function isolates.
-- ==============================================================================

-- 1. Create table for tracking execution rate limits
CREATE TABLE IF NOT EXISTS public.code_execution_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.code_execution_rate_limits ENABLE ROW LEVEL SECURITY;

-- Block client direct access; only service_role and security definer functions can manage
DROP POLICY IF EXISTS "code_execution_rate_limits_admin_only" ON public.code_execution_rate_limits;
CREATE POLICY "code_execution_rate_limits_admin_only"
  ON public.code_execution_rate_limits
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Server-Authoritative Atomic Rate Limiter Function
CREATE OR REPLACE FUNCTION public.check_code_execution_rate_limit(
  p_user_id UUID,
  p_min_interval_ms INTEGER DEFAULT 1500,
  p_max_per_minute INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_rec RECORD;
  v_time_since_last_ms NUMERIC;
  v_time_since_window_sec NUMERIC;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User ID required');
  END IF;

  SELECT * INTO v_rec
  FROM public.code_execution_rate_limits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.code_execution_rate_limits (user_id, last_request_at, request_count, window_start_at)
    VALUES (p_user_id, v_now, 1, v_now);
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Check minimum interval between requests (default 1.5 seconds)
  v_time_since_last_ms := EXTRACT(EPOCH FROM (v_now - v_rec.last_request_at)) * 1000;
  IF v_time_since_last_ms < p_min_interval_ms THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'min_interval_exceeded',
      'message', 'Please wait at least 1.5s between code executions.',
      'retry_after_ms', CEIL(p_min_interval_ms - v_time_since_last_ms)
    );
  END IF;

  -- Check sliding 60-second window
  v_time_since_window_sec := EXTRACT(EPOCH FROM (v_now - v_rec.window_start_at));
  IF v_time_since_window_sec >= 60 THEN
    -- Window expired, reset window
    UPDATE public.code_execution_rate_limits
    SET window_start_at = v_now,
        request_count = 1,
        last_request_at = v_now
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true);
  ELSE
    IF v_rec.request_count >= p_max_per_minute THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'max_requests_exceeded',
        'message', 'Rate limit exceeded: Maximum 15 executions per minute. Please try again shortly.',
        'retry_after_sec', CEIL(60 - v_time_since_window_sec)
      );
    END IF;

    UPDATE public.code_execution_rate_limits
    SET request_count = request_count + 1,
        last_request_at = v_now
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_code_execution_rate_limit(UUID, INTEGER, INTEGER) TO authenticated, service_role;
