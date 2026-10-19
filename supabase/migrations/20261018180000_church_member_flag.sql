-- Phase 4 / Phase A: church-member flag.
-- Existing rows stay church members (DEFAULT true). A signed-in user cannot
-- set the flag or the downgrade timestamp. Planning Center registration does
-- not use this insert policy. It goes through register-planning-center-member,
-- which inserts with the service role after a server-side Planning Center check.
-- Self-insert stays false so a JWT cannot promote itself.

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS is_church_member boolean NOT NULL DEFAULT true;

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS church_downgraded_at timestamptz;

COMMENT ON COLUMN public.email_subscribers.is_church_member IS
  'True for church members. False for people who only belong to a prayer group. Users cannot set this.';

COMMENT ON COLUMN public.email_subscribers.church_downgraded_at IS
  'Set when an admin downgrades a church member. Blocks Planning Center auto-upgrade. Users cannot set this.';

UPDATE public.email_subscribers
SET is_church_member = true
WHERE is_church_member IS DISTINCT FROM true;

CREATE OR REPLACE FUNCTION public.is_church_member(p_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(trim(es.email)) = lower(trim(coalesce(p_email, auth.jwt() ->> 'email')))
      AND es.is_church_member IS TRUE
      AND coalesce(es.is_blocked, false) IS NOT TRUE
  );
$$;

COMMENT ON FUNCTION public.is_church_member(text) IS
  'True when that email has an unblocked email_subscribers row with is_church_member. Defaults to the JWT email.';

REVOKE ALL ON FUNCTION public.is_church_member(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_church_member(text) TO authenticated, service_role;

-- Admins are church members. A group-only row cannot pass is_admin even if is_admin is true.
CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF user_email IS NULL OR trim(user_email) = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(trim(es.email)) = lower(trim(user_email))
      AND es.is_admin IS TRUE
      AND es.is_church_member IS TRUE
      AND coalesce(es.is_blocked, false) IS NOT TRUE
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin(text) IS
  'True when email_subscribers has is_admin, is_church_member, and the account is not blocked. is_active does not affect admin RLS.';

CREATE OR REPLACE FUNCTION public.subscriber_self_update_keeps_privileges(
  p_email text,
  p_is_admin boolean,
  p_is_blocked boolean,
  p_auth_user_id uuid,
  p_is_church_member boolean,
  p_church_downgraded_at timestamptz
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(es.email) = lower(p_email)
      AND es.is_admin IS NOT DISTINCT FROM p_is_admin
      AND coalesce(es.is_blocked, false) IS NOT DISTINCT FROM coalesce(p_is_blocked, false)
      AND es.auth_user_id IS NOT DISTINCT FROM p_auth_user_id
      AND es.is_church_member IS NOT DISTINCT FROM p_is_church_member
      AND es.church_downgraded_at IS NOT DISTINCT FROM p_church_downgraded_at
  );
$$;

REVOKE ALL ON FUNCTION public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid, boolean, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid, boolean, timestamptz) TO authenticated, service_role;

DROP POLICY IF EXISTS "email_subscribers_update_own" ON public.email_subscribers;
CREATE POLICY "email_subscribers_update_own"
  ON public.email_subscribers
  FOR UPDATE
  TO authenticated
  USING (lower(email) = lower((auth.jwt() ->> 'email')))
  WITH CHECK (
    lower(email) = lower((auth.jwt() ->> 'email'))
    AND public.subscriber_self_update_keeps_privileges(
      email,
      is_admin,
      is_blocked,
      auth_user_id,
      is_church_member,
      church_downgraded_at
    )
  );

DROP POLICY IF EXISTS "email_subscribers_insert_own" ON public.email_subscribers;
CREATE POLICY "email_subscribers_insert_own"
  ON public.email_subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lower(email) = lower((auth.jwt() ->> 'email'))
    AND coalesce(is_admin, false) = false
    AND coalesce(is_blocked, false) = false
    AND auth_user_id IS NULL
    AND is_church_member = false
    AND church_downgraded_at IS NULL
  );

DROP FUNCTION IF EXISTS public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid);

-- ROLLBACK
-- DROP POLICY IF EXISTS "email_subscribers_insert_own" ON public.email_subscribers;
-- CREATE POLICY "email_subscribers_insert_own"
--   ON public.email_subscribers
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     lower(email) = lower((auth.jwt() ->> 'email'))
--     AND coalesce(is_admin, false) = false
--     AND coalesce(is_blocked, false) = false
--     AND auth_user_id IS NULL
--   );
-- DROP POLICY IF EXISTS "email_subscribers_update_own" ON public.email_subscribers;
-- Recreate subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid) from
-- 20261016140000_rls_lockdown_leftover_policies.sql and point email_subscribers_update_own at it.
-- Recreate is_admin(text) from 20261016100000_is_admin_ignore_is_active.sql.
-- DROP FUNCTION IF EXISTS public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid, boolean, timestamptz);
-- DROP FUNCTION IF EXISTS public.is_church_member(text);
-- ALTER TABLE public.email_subscribers DROP COLUMN IF EXISTS church_downgraded_at;
-- ALTER TABLE public.email_subscribers DROP COLUMN IF EXISTS is_church_member;
