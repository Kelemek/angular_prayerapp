-- Service-only lookup so account deletion can find a sign-in that was never linked.

CREATE OR REPLACE FUNCTION public.lookup_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, pg_temp
AS $$
  SELECT id
  FROM users
  WHERE email IS NOT NULL
    AND lower(email) = lower(btrim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id_by_email(text) TO service_role;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS public.lookup_auth_user_id_by_email(text);
