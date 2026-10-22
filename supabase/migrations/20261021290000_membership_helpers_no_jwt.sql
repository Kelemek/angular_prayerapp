-- Un-granted row lookups for SECURITY DEFINER RPCs. Granted wrappers fail closed with no JWT.

CREATE OR REPLACE FUNCTION public.is_church_member_row(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(trim(es.email)) = lower(trim(coalesce(p_email, '')))
      AND es.is_church_member IS TRUE
      AND coalesce(es.is_blocked, false) IS NOT TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_church_member_row(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_prayer_group_member_row(p_group_id uuid, p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_group_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.prayer_group_members m
      WHERE m.group_id = p_group_id
        AND lower(m.user_email) = lower(trim(coalesce(p_email, '')))
        AND coalesce(m.is_active, true)
        AND public.prayer_groups_enabled(m.user_email)
        AND NOT EXISTS (
          SELECT 1
          FROM public.email_subscribers es
          WHERE lower(es.email) = lower(m.user_email)
            AND coalesce(es.is_blocked, false)
        )
    );
$$;

REVOKE ALL ON FUNCTION public.is_prayer_group_member_row(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_church_member(p_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role', '');
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

  RETURN public.is_church_member_row(v_target);
END;
$$;

COMMENT ON FUNCTION public.is_church_member(text) IS
  'True for an unblocked church-member row. Non-admins may only query their own email. No JWT returns false.';

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

  RETURN public.is_prayer_group_member_row(p_group_id, v_target);
END;
$$;

REVOKE ALL ON FUNCTION public.is_church_member(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_church_member(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_prayer_group_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_prayer_group_member(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_prayer_group_owner(
  p_group_id uuid,
  email_to_check text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE m.group_id = p_group_id
      AND lower(m.user_email) = lower(trim(coalesce(email_to_check, public.current_jwt_email())))
      AND m.role = 'owner'
      AND coalesce(m.is_active, true)
      AND public.is_prayer_group_member_row(p_group_id, m.user_email)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_any_prayer_group_member(email_to_check text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE lower(m.user_email) = lower(trim(coalesce(email_to_check, public.current_jwt_email())))
      AND coalesce(m.is_active, true)
      AND public.is_prayer_group_member_row(m.group_id, m.user_email)
  );
$$;

CREATE OR REPLACE FUNCTION public.transfer_prayer_group_ownership(
  p_group_id uuid,
  p_new_owner_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor text := public.current_jwt_email();
  v_email text := lower(trim(coalesce(p_new_owner_email, '')));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_prayer_group_owner(p_group_id, v_actor) THEN
    RAISE EXCEPTION 'Only the group owner can transfer ownership';
  END IF;
  IF NOT public.is_prayer_group_member_row(p_group_id, v_email) THEN
    RAISE EXCEPTION 'That person is not a member of this group';
  END IF;
  IF NOT public.is_church_member_row(v_email) THEN
    RAISE EXCEPTION 'Ownership can only move to a church member';
  END IF;

  UPDATE public.prayer_group_members
  SET role = 'member', updated_at = now()
  WHERE group_id = p_group_id
    AND lower(user_email) = v_actor;

  UPDATE public.prayer_group_members
  SET role = 'owner', updated_at = now()
  WHERE group_id = p_group_id
    AND lower(user_email) = v_email;

  UPDATE public.prayer_groups
  SET created_by_email = v_email, updated_at = now()
  WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_prayer_group_member(
  p_group_id uuid,
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor text := public.current_jwt_email();
  v_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_email = '' OR v_email = v_actor THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT public.is_prayer_group_owner(p_group_id, v_actor) THEN
    RAISE EXCEPTION 'Only the group owner can remove members';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE m.group_id = p_group_id
      AND lower(m.user_email) = v_email
      AND m.role = 'owner'
      AND coalesce(m.is_active, true)
      AND public.is_prayer_group_member_row(p_group_id, m.user_email)
  ) THEN
    RAISE EXCEPTION 'Transfer ownership before removing an owner';
  END IF;

  DELETE FROM public.prayer_group_members
  WHERE group_id = p_group_id
    AND lower(user_email) = v_email
    AND coalesce(is_active, true);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found in this group';
  END IF;

  RETURN public.delete_group_only_account_if_last(v_email, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_group_only_account_if_last(
  p_email text,
  p_session_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
  v_church boolean;
BEGIN
  SELECT id, is_church_member
    INTO v_id, v_church
  FROM public.email_subscribers
  WHERE lower(email) = v_email;

  IF v_id IS NULL OR coalesce(v_church, true) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE lower(m.user_email) = v_email
      AND coalesce(m.is_active, true)
      AND public.is_prayer_group_member_row(m.group_id, m.user_email)
  ) THEN
    RETURN false;
  END IF;

  PERFORM public.delete_subscriber_account(v_id, true, p_session_user_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_downgrade_to_group_only(p_subscriber_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor text := public.current_jwt_email();
  v_email text;
  v_is_admin boolean;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT lower(email), coalesce(is_admin, false)
    INTO v_email, v_is_admin
  FROM public.email_subscribers
  WHERE id = p_subscriber_id
  FOR UPDATE;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Subscriber not found';
  END IF;
  IF v_is_admin THEN
    RAISE EXCEPTION 'Transfer admin access before downgrading';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE lower(m.user_email) = v_email
      AND coalesce(m.is_active, true)
      AND public.is_prayer_group_member_row(m.group_id, m.user_email)
  ) THEN
    RAISE EXCEPTION 'Add this person to a group before downgrading';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE lower(m.user_email) = v_email
      AND m.role = 'owner'
      AND coalesce(m.is_active, true)
  ) THEN
    RAISE EXCEPTION 'Transfer group ownership before downgrading';
  END IF;

  PERFORM set_config('prayerapp.membership_rpc', '1', true);

  UPDATE public.email_subscribers
  SET is_church_member = false,
      church_downgraded_at = now()
  WHERE id = p_subscriber_id;

  DELETE FROM public.user_prayer_item_reminders
  WHERE lower(user_email) = v_email
    AND prayer_kind IN ('community', 'pc_member', 'prompt');

  UPDATE public.user_badge_read_state
  SET prayers_data = '{"prayers":[],"updates":[]}'::jsonb,
      prompts_data = '{"prompts":[],"updates":[]}'::jsonb
  WHERE lower(user_email) = v_email;
END;
$$;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS public.is_church_member_row(text);
-- DROP FUNCTION IF EXISTS public.is_prayer_group_member_row(uuid, text);
-- Restore is_church_member and is_prayer_group_member from 20261021240000_membership_helpers_caller_email.sql.
-- Restore is_prayer_group_owner, is_any_prayer_group_member, transfer_prayer_group_ownership,
-- remove_prayer_group_member, and delete_group_only_account_if_last from 20261018200000_prayer_groups.sql.
-- Restore admin_downgrade_to_group_only from 20261021270000_membership_rpc_gate_and_prompt_reminders.sql.
