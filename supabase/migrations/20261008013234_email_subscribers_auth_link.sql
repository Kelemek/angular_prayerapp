-- Dual-run Supabase Auth: link auth.users to email_subscribers after MFA + session mint.
-- RLS stays unchanged; anon policies remain until legacy apps are retired.

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auth_linked_at timestamptz;

COMMENT ON COLUMN public.email_subscribers.auth_user_id IS
  'Supabase Auth user linked after successful login on a client that mints a JWT (dual-run migration).';
COMMENT ON COLUMN public.email_subscribers.auth_linked_at IS
  'First time auth_user_id was linked; null means still on legacy MFA-only client.';

CREATE INDEX IF NOT EXISTS idx_email_subscribers_auth_linked_at
  ON public.email_subscribers (auth_linked_at)
  WHERE auth_linked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_subscribers_auth_user_id
  ON public.email_subscribers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.link_email_subscriber_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  caller_uid uuid := auth.uid();
BEGIN
  IF caller_uid IS NULL OR caller_email = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.email_subscribers es
  SET
    auth_user_id = caller_uid,
    auth_linked_at = coalesce(es.auth_linked_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  WHERE lower(trim(es.email)) = caller_email
    AND coalesce(es.is_blocked, false) IS NOT TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscriber not found or blocked';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.link_email_subscriber_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_email_subscriber_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_email_subscriber_auth() TO service_role;
