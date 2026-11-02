-- Migration: 20261101000020_restrict_feedback_strictly_to_admin.sql
-- Restrict feedback inspection strictly to Admin
-- Non-admin users are strictly forbidden from viewing any feedback records, submitter details,
-- descriptions, or replies via UI, RPC, PostgREST, or direct API.

-- 1. Drop get_my_feedback_submissions to completely eliminate non-admin RPC retrieval
DROP FUNCTION IF EXISTS public.get_my_feedback_submissions();

-- 2. Enforce strict Admin-Only RLS on feedback_submissions
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_feedback_access" ON public.feedback_submissions;
CREATE POLICY "admin_full_feedback_access"
  ON public.feedback_submissions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
