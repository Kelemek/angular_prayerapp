-- Ownership changes by promoting a member. Transfer is no longer a path.
-- The old transfer function demoted the caller before it promoted anyone, so a
-- caller who was the only owner could leave the group with no owner if the
-- second update did not count. It now refuses and does not write.
-- Leave, demote, and remove still refuse while one owner would remain.

CREATE OR REPLACE FUNCTION public.transfer_prayer_group_ownership(
  p_group_id uuid,
  p_new_owner_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Make another member an owner before you leave this group';
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
    RAISE EXCEPTION 'Make another member an owner before you leave this group';
  END IF;

  DELETE FROM public.prayer_group_members
  WHERE group_id = p_group_id
    AND lower(user_email) = v_email;

  RETURN public.delete_group_only_account_if_last(v_email, auth.uid());
END;
$$;

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
    RAISE EXCEPTION 'Make another member an owner before removing an owner';
  END IF;

  UPDATE public.prayer_group_members
  SET role = v_role, updated_at = now()
  WHERE group_id = p_group_id
    AND lower(user_email) = v_email
    AND coalesce(is_active, true);
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
    RAISE EXCEPTION 'Make another member an owner before removing an owner';
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

CREATE OR REPLACE FUNCTION public.prayer_group_members_keep_an_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
    RAISE EXCEPTION 'Make another member an owner before removing an owner';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.prayer_group_members_keep_an_owner() FROM PUBLIC, anon, authenticated;
