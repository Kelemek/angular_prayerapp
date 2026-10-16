-- Admin portal eligibility (check-admin-status) uses is_admin only; is_active is for email
-- subscriptions. RLS policies call public.is_admin(), which incorrectly required is_active
-- after 20260721120000, so inactive admins only saw their own email_subscribers row.

CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
      AND coalesce(es.is_blocked, false) IS NOT TRUE
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin(text) IS
  'True when email_subscribers has is_admin and the account is not blocked. is_active does not affect admin RLS.';
