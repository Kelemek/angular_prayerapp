-- Membership helpers answer for the caller's email unless admin or service_role.

CREATE OR REPLACE FUNCTION public.is_church_member(p_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role');
  v_jwt text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_target text := lower(trim(coalesce(p_email, auth.jwt() ->> 'email')));
BEGIN
  IF v_target IS NULL OR v_target = '' THEN
    RETURN false;
  END IF;

  IF v_role <> 'service_role'
     AND (v_jwt = '' OR NOT public.is_admin(v_jwt))
     AND v_target IS DISTINCT FROM v_jwt THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(trim(es.email)) = v_target
      AND es.is_church_member IS TRUE
      AND coalesce(es.is_blocked, false) IS NOT TRUE
  );
END;
$$;

COMMENT ON FUNCTION public.is_church_member(text) IS
  'True for an unblocked church-member row. Non-admins may only query their own email.';

CREATE OR REPLACE FUNCTION public.is_prayer_group_member(
  p_group_id uuid,
  email_to_check text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role');
  v_jwt text := lower(trim(coalesce(public.current_jwt_email(), '')));
  v_target text := lower(trim(coalesce(email_to_check, public.current_jwt_email())));
BEGIN
  IF p_group_id IS NULL OR v_target IS NULL OR v_target = '' THEN
    RETURN false;
  END IF;

  IF v_role <> 'service_role'
     AND (v_jwt = '' OR NOT public.is_admin(v_jwt))
     AND v_target IS DISTINCT FROM v_jwt THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE m.group_id = p_group_id
      AND lower(m.user_email) = v_target
      AND coalesce(m.is_active, true)
      AND public.prayer_groups_enabled(m.user_email)
      AND NOT EXISTS (
        SELECT 1
        FROM public.email_subscribers es
        WHERE lower(es.email) = lower(m.user_email)
          AND coalesce(es.is_blocked, false)
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_church_member(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_church_member(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_prayer_group_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_prayer_group_member(uuid, text) TO authenticated, service_role;

-- ROLLBACK
-- Restore is_church_member and is_prayer_group_member from 20261019220000_prayer_groups_feature_flag.sql.
