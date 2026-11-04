-- A group can have more than one owner. Ownership is prayer_group_members.role,
-- not prayer_groups.created_by_email. created_by_email stays the creator, and
-- transfer still rewrites it to the person who received ownership.
-- Existing owner rows already use role = 'owner', so this backfill only
-- repairs a group that has members and no active owner.
-- A group that still exists cannot drop to zero active owners. Deleting the
-- group removes the row first, so the deferred check allows that.
-- The last owner is not removed or demoted here. They use
-- transfer_prayer_group_ownership, which still steps the caller down and
-- makes the chosen member an owner.

CREATE OR REPLACE FUNCTION public.prayer_group_active_owner_count(p_group_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer
  FROM public.prayer_group_members m
  WHERE m.group_id = p_group_id
    AND m.role = 'owner'
    AND coalesce(m.is_active, true)
    AND public.is_prayer_group_member_row(p_group_id, m.user_email);
$$;

REVOKE ALL ON FUNCTION public.prayer_group_active_owner_count(uuid) FROM PUBLIC, anon, authenticated;

WITH needy AS (
  SELECT g.id, lower(g.created_by_email) AS created_by_email
  FROM public.prayer_groups g
  WHERE public.prayer_group_active_owner_count(g.id) = 0
),
pick AS (
  SELECT DISTINCT ON (n.id)
    m.id AS member_id
  FROM needy n
  JOIN public.prayer_group_members m ON m.group_id = n.id
  WHERE public.is_prayer_group_member_row(n.id, m.user_email)
  ORDER BY n.id,
    CASE WHEN lower(m.user_email) = n.created_by_email THEN 0 ELSE 1 END,
    m.created_at
)
UPDATE public.prayer_group_members m
SET role = 'owner', updated_at = now()
FROM pick
WHERE m.id = pick.member_id
  AND m.role IS DISTINCT FROM 'owner';

CREATE OR REPLACE FUNCTION public.prayer_group_members_keep_an_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group uuid := OLD.group_id;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role = 'owner'
     AND coalesce(NEW.is_active, true)
     AND NEW.group_id IS NOT DISTINCT FROM OLD.group_id
     AND public.is_prayer_group_member_row(NEW.group_id, NEW.user_email) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.prayer_groups g WHERE g.id = v_group) THEN
    RETURN NULL;
  END IF;

  IF public.prayer_group_active_owner_count(v_group) < 1 THEN
    RAISE EXCEPTION 'Transfer ownership before removing an owner';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.prayer_group_members_keep_an_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prayer_group_members_keep_an_owner ON public.prayer_group_members;
CREATE CONSTRAINT TRIGGER prayer_group_members_keep_an_owner
  AFTER DELETE OR UPDATE OF role, is_active, user_email
  ON public.prayer_group_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.prayer_group_members_keep_an_owner();

DROP FUNCTION IF EXISTS public.invite_prayer_group_member(uuid, text);

CREATE FUNCTION public.invite_prayer_group_member(
  p_group_id uuid,
  p_email text,
  p_role text DEFAULT 'member'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inviter text := public.current_jwt_email();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, 'member')));
  v_id uuid;
  v_name text;
  v_created boolean := false;
  v_church boolean;
  v_blocked boolean;
  v_display_order integer;
  v_was_member boolean := false;
  v_already_owner boolean := false;
BEGIN
  IF v_inviter IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_email = '' OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF v_role NOT IN ('member', 'owner') THEN
    RAISE EXCEPTION 'Role must be owner or member';
  END IF;
  IF NOT public.is_prayer_group_owner(p_group_id, v_inviter) THEN
    RAISE EXCEPTION 'Only a group owner can invite';
  END IF;

  -- is_prayer_group_owner refuses to answer for another email. This function
  -- is security definer, so it reads the membership row itself.
  SELECT
    EXISTS (
      SELECT 1
      FROM public.prayer_group_members m
      WHERE m.group_id = p_group_id
        AND lower(m.user_email) = v_email
        AND coalesce(m.is_active, true)
        AND public.is_prayer_group_member_row(p_group_id, m.user_email)
    ),
    EXISTS (
      SELECT 1
      FROM public.prayer_group_members m
      WHERE m.group_id = p_group_id
        AND lower(m.user_email) = v_email
        AND m.role = 'owner'
        AND coalesce(m.is_active, true)
        AND public.is_prayer_group_member_row(p_group_id, m.user_email)
    )
  INTO v_was_member, v_already_owner;

  SELECT es.is_church_member, coalesce(es.is_blocked, false), nullif(trim(es.name), '')
    INTO v_church, v_blocked, v_name
  FROM public.email_subscribers es
  WHERE lower(es.email) = v_email;

  IF coalesce(v_blocked, false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_church IS NULL THEN
    INSERT INTO public.email_subscribers (
      email,
      name,
      is_active,
      is_admin,
      receive_admin_emails,
      is_blocked,
      is_church_member,
      prayer_groups_enabled
    ) VALUES (
      v_email, '', true, false, false, false, false, true
    );
    v_created := true;
    v_church := false;

    SELECT coalesce(es.is_blocked, false)
      INTO v_blocked
    FROM public.email_subscribers es
    WHERE lower(es.email) = v_email;

    IF coalesce(v_blocked, false) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSE
    UPDATE public.email_subscribers es
    SET prayer_groups_enabled = true
    WHERE lower(es.email) = v_email
      AND es.prayer_groups_enabled IS NOT TRUE;
  END IF;

  SELECT coalesce(max(m.display_order), -1) + 1
    INTO v_display_order
  FROM public.prayer_group_members m
  WHERE lower(m.user_email) = v_email
    AND coalesce(m.is_active, true);

  INSERT INTO public.prayer_group_members (
    group_id, user_email, role, invited_by_email, name, is_active, display_order
  ) VALUES (
    p_group_id, v_email, v_role, v_inviter, v_name, true, v_display_order
  )
  ON CONFLICT (group_id, user_email) DO UPDATE
    SET is_active = true,
        invited_by_email = EXCLUDED.invited_by_email,
        name = coalesce(public.prayer_group_members.name, EXCLUDED.name),
        role = CASE
          WHEN v_role = 'owner' THEN 'owner'
          ELSE public.prayer_group_members.role
        END,
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'membership_id', v_id,
    'created_subscriber', v_created,
    'group_only', NOT coalesce(v_church, false),
    'was_member', v_was_member,
    'already_owner', v_already_owner,
    'role', v_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invite_prayer_group_member(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_prayer_group_member(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_prayer_group_member_role(
  p_group_id uuid,
  p_email text,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor text := public.current_jwt_email();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_current text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_email = '' OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF v_role NOT IN ('member', 'owner') THEN
    RAISE EXCEPTION 'Role must be owner or member';
  END IF;
  IF NOT public.is_prayer_group_owner(p_group_id, v_actor) THEN
    RAISE EXCEPTION 'Only a group owner can change roles';
  END IF;

  PERFORM 1
  FROM public.prayer_group_members
  WHERE group_id = p_group_id
  FOR UPDATE;

  SELECT m.role
    INTO v_current
  FROM public.prayer_group_members m
  WHERE m.group_id = p_group_id
    AND lower(m.user_email) = v_email
    AND coalesce(m.is_active, true)
    AND public.is_prayer_group_member_row(p_group_id, m.user_email);

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'That person is not a member of this group';
  END IF;

  IF v_role = 'member'
     AND v_current = 'owner'
     AND public.prayer_group_active_owner_count(p_group_id) <= 1 THEN
    RAISE EXCEPTION 'Transfer ownership before removing an owner';
  END IF;

  UPDATE public.prayer_group_members
  SET role = v_role, updated_at = now()
  WHERE group_id = p_group_id
    AND lower(user_email) = v_email
    AND coalesce(is_active, true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_prayer_group_member_role(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_prayer_group_member_role(uuid, text, text) TO authenticated;

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
  v_is_owner boolean := false;
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

  PERFORM 1
  FROM public.prayer_group_members
  WHERE group_id = p_group_id
  FOR UPDATE;

  SELECT m.role = 'owner'
    INTO v_is_owner
  FROM public.prayer_group_members m
  WHERE m.group_id = p_group_id
    AND lower(m.user_email) = v_email
    AND coalesce(m.is_active, true)
    AND public.is_prayer_group_member_row(p_group_id, m.user_email);

  IF coalesce(v_is_owner, false)
     AND public.prayer_group_active_owner_count(p_group_id) <= 1 THEN
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

CREATE OR REPLACE FUNCTION public.leave_prayer_group(p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.current_jwt_email();
  v_role text;
BEGIN
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM 1
  FROM public.prayer_group_members
  WHERE group_id = p_group_id
  FOR UPDATE;

  SELECT m.role
    INTO v_role
  FROM public.prayer_group_members m
  WHERE m.group_id = p_group_id
    AND lower(m.user_email) = v_email
    AND coalesce(m.is_active, true);

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF v_role = 'owner' AND public.prayer_group_active_owner_count(p_group_id) <= 1 THEN
    RAISE EXCEPTION 'Transfer ownership before leaving this group';
  END IF;

  DELETE FROM public.prayer_group_members
  WHERE group_id = p_group_id
    AND lower(user_email) = v_email;

  RETURN public.delete_group_only_account_if_last(v_email, auth.uid());
END;
$$;

-- ROLLBACK
-- DROP TRIGGER IF EXISTS prayer_group_members_keep_an_owner ON public.prayer_group_members;
-- DROP FUNCTION IF EXISTS public.prayer_group_members_keep_an_owner();
-- DROP FUNCTION IF EXISTS public.set_prayer_group_member_role(uuid, text, text);
-- DROP FUNCTION IF EXISTS public.prayer_group_active_owner_count(uuid);
-- Restore invite_prayer_group_member(uuid, text) from
-- 20261021210000_email_subscriber_privilege_tombstones.sql.
-- Restore remove_prayer_group_member from 20261021290000_membership_helpers_no_jwt.sql.
-- Restore leave_prayer_group from 20261018200000_prayer_groups.sql.
