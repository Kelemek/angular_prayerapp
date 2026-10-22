-- Granted owner and any-member helpers were answering for another email after
-- 20261021290000 pointed their inner lookups at *_row. Keep *_row for DEFINER
-- RPCs. These wrappers fail closed like is_prayer_group_member.

CREATE OR REPLACE FUNCTION public.is_prayer_group_owner(
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
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role', '');
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
      AND m.role = 'owner'
      AND coalesce(m.is_active, true)
      AND public.is_prayer_group_member_row(p_group_id, m.user_email)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_any_prayer_group_member(email_to_check text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role', '');
  v_jwt text := lower(trim(coalesce(public.current_jwt_email(), '')));
  v_target text := lower(trim(coalesce(email_to_check, public.current_jwt_email())));
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
    FROM public.prayer_group_members m
    WHERE lower(m.user_email) = v_target
      AND coalesce(m.is_active, true)
      AND public.is_prayer_group_member_row(m.group_id, m.user_email)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_prayer_group_owner(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_any_prayer_group_member(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_prayer_group_owner(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_any_prayer_group_member(text) TO authenticated, service_role;

-- ROLLBACK
-- Restore is_prayer_group_owner and is_any_prayer_group_member from
-- 20261021290000_membership_helpers_no_jwt.sql.
