-- Prayer groups for Cross Pointe. No tenant or plan limits.
-- Only a church member can create a group. Only the owner can invite.
-- An invite for an unknown email inserts a group-only subscriber.
-- A group-only person who leaves their last group is deleted in this transaction.

ALTER TABLE public.email_subscribers
  DROP CONSTRAINT IF EXISTS default_prayer_view_check;

ALTER TABLE public.email_subscribers
  ADD CONSTRAINT default_prayer_view_check
  CHECK (default_prayer_view IN ('current', 'personal', 'groups'));

CREATE OR REPLACE FUNCTION public.current_jwt_email()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT nullif(lower(trim(auth.jwt() ->> 'email')), '');
$$;

REVOKE ALL ON FUNCTION public.current_jwt_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_jwt_email() TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.prayer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prayer_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.prayer_groups (id) ON DELETE CASCADE,
  user_email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_by_email text,
  name text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_prayer_group_members_email
  ON public.prayer_group_members (lower(user_email));

CREATE INDEX IF NOT EXISTS idx_prayer_group_members_user_display_order
  ON public.prayer_group_members (lower(user_email), display_order);

CREATE TABLE IF NOT EXISTS public.group_prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.prayer_groups (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  prayer_for text NOT NULL DEFAULT 'General Prayer',
  status text NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'answered')),
  requester text NOT NULL,
  email text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  date_requested timestamptz NOT NULL DEFAULT now(),
  date_answered timestamptz,
  prayed_for_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_prayers_group_id
  ON public.group_prayers (group_id, date_requested DESC);

CREATE TABLE IF NOT EXISTS public.group_prayer_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_prayer_id uuid NOT NULL REFERENCES public.group_prayers (id) ON DELETE CASCADE,
  content text NOT NULL,
  author text NOT NULL,
  author_email text NOT NULL,
  mark_as_answered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_prayer_updates_prayer
  ON public.group_prayer_updates (group_prayer_id, created_at);

CREATE TABLE IF NOT EXISTS public.group_badge_read_receipts (
  user_email text NOT NULL,
  group_id uuid NOT NULL REFERENCES public.prayer_groups (id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('group_prayer', 'group_prayer_update')),
  item_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_email, item_kind, item_id)
);

ALTER TABLE public.prayer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_prayer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_badge_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_prayer_group_member(
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
      AND coalesce(m.is_active, true)
      AND NOT EXISTS (
        SELECT 1
        FROM public.email_subscribers es
        WHERE lower(es.email) = lower(m.user_email)
          AND coalesce(es.is_blocked, false)
      )
  );
$$;

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
      AND public.is_prayer_group_member(p_group_id, m.user_email)
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
      AND public.is_prayer_group_member(m.group_id, m.user_email)
  );
$$;

REVOKE ALL ON FUNCTION public.is_prayer_group_member(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_prayer_group_owner(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_any_prayer_group_member(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_prayer_group_member(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_prayer_group_owner(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_any_prayer_group_member(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.purge_subscriber_group_data(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF v_email = '' THEN
    RETURN;
  END IF;

  DELETE FROM public.prayer_groups g
  WHERE g.id IN (
    SELECT m.group_id
    FROM public.prayer_group_members m
    WHERE lower(m.user_email) = v_email
      AND m.role = 'owner'
  );

  DELETE FROM public.group_prayer_updates u
  WHERE lower(u.author_email) = v_email;

  DELETE FROM public.group_prayers p
  WHERE lower(p.email) = v_email;

  DELETE FROM public.group_badge_read_receipts r
  WHERE lower(r.user_email) = v_email;

  DELETE FROM public.prayer_group_members m
  WHERE lower(m.user_email) = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_subscriber_group_data(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_subscriber_account(
  p_subscriber_id uuid,
  p_delete_prayers boolean,
  p_session_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_linked uuid;
  v_by_email uuid;
  v_auth_id uuid;
BEGIN
  SELECT lower(trim(email)), auth_user_id
    INTO v_email, v_linked
  FROM public.email_subscribers
  WHERE id = p_subscriber_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscriber not found';
  END IF;

  SELECT id
    INTO v_by_email
  FROM auth.users
  WHERE email IS NOT NULL
    AND lower(email) = v_email
  LIMIT 1;

  IF v_linked IS NOT NULL
     AND v_by_email IS NOT NULL
     AND v_linked IS DISTINCT FROM v_by_email THEN
    RAISE EXCEPTION 'sign-in does not match the subscriber';
  END IF;

  v_auth_id := coalesce(v_by_email, v_linked);

  IF p_session_user_id IS NOT NULL
     AND v_auth_id IS NOT NULL
     AND v_auth_id IS DISTINCT FROM p_session_user_id THEN
    RAISE EXCEPTION 'sign-in does not match the subscriber';
  END IF;

  PERFORM public.purge_subscriber_group_data(v_email);

  IF coalesce(p_delete_prayers, false) THEN
    DELETE FROM public.prayer_updates WHERE lower(trim(author_email)) = v_email;
    DELETE FROM public.prayers WHERE lower(trim(email)) = v_email;
    DELETE FROM public.personal_prayers WHERE lower(trim(user_email)) = v_email;
  END IF;

  DELETE FROM public.memorized_items WHERE lower(trim(user_email)) = v_email;
  DELETE FROM public.device_tokens WHERE lower(trim(user_email)) = v_email;
  DELETE FROM public.user_badge_read_state WHERE lower(trim(user_email)) = v_email;

  IF v_auth_id IS NOT NULL THEN
    UPDATE public.deletion_requests
      SET reviewed_by = NULL
      WHERE reviewed_by = v_auth_id;
    UPDATE public.update_deletion_requests
      SET reviewed_by = NULL
      WHERE reviewed_by = v_auth_id;
  END IF;

  DELETE FROM public.email_subscribers WHERE id = p_subscriber_id;

  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;
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

  IF public.is_any_prayer_group_member(v_email) THEN
    RETURN false;
  END IF;

  PERFORM public.delete_subscriber_account(v_id, true, p_session_user_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_group_only_account_if_last(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_prayer_group(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.current_jwt_email();
  v_name text := trim(coalesce(p_name, ''));
  v_group_id uuid;
  v_member_name text;
  v_display_order integer;
BEGIN
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;
  IF NOT public.is_church_member(v_email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT nullif(trim(es.name), '')
    INTO v_member_name
  FROM public.email_subscribers es
  WHERE lower(es.email) = v_email;

  SELECT coalesce(max(m.display_order), -1) + 1
    INTO v_display_order
  FROM public.prayer_group_members m
  WHERE lower(m.user_email) = v_email
    AND coalesce(m.is_active, true);

  INSERT INTO public.prayer_groups (name, created_by_email)
  VALUES (v_name, v_email)
  RETURNING id INTO v_group_id;

  INSERT INTO public.prayer_group_members (
    group_id, user_email, role, invited_by_email, name, is_active, display_order
  ) VALUES (
    v_group_id, v_email, 'owner', v_email, v_member_name, true, v_display_order
  );

  RETURN v_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_prayer_group_member(p_group_id uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inviter text := public.current_jwt_email();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
  v_name text;
  v_created boolean := false;
  v_church boolean;
  v_blocked boolean;
  v_display_order integer;
BEGIN
  IF v_inviter IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF NOT public.is_prayer_group_owner(p_group_id, v_inviter) THEN
    RAISE EXCEPTION 'Only the group owner can invite';
  END IF;

  SELECT es.is_church_member, coalesce(es.is_blocked, false), nullif(trim(es.name), '')
    INTO v_church, v_blocked, v_name
  FROM public.email_subscribers es
  WHERE lower(es.email) = v_email;

  IF coalesce(v_blocked, false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_church IS NULL THEN
    INSERT INTO public.email_subscribers (
      email, name, is_active, is_admin, receive_admin_emails, is_blocked, is_church_member
    ) VALUES (
      v_email, '', true, false, false, false, false
    );
    v_created := true;
    v_church := false;
  END IF;

  SELECT coalesce(max(m.display_order), -1) + 1
    INTO v_display_order
  FROM public.prayer_group_members m
  WHERE lower(m.user_email) = v_email
    AND coalesce(m.is_active, true);

  INSERT INTO public.prayer_group_members (
    group_id, user_email, role, invited_by_email, name, is_active, display_order
  ) VALUES (
    p_group_id, v_email, 'member', v_inviter, v_name, true, v_display_order
  )
  ON CONFLICT (group_id, user_email) DO UPDATE
    SET is_active = true,
        invited_by_email = EXCLUDED.invited_by_email,
        name = coalesce(public.prayer_group_members.name, EXCLUDED.name),
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'membership_id', v_id,
    'created_subscriber', v_created,
    'group_only', NOT coalesce(v_church, false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rename_prayer_group(p_group_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := trim(coalesce(p_name, ''));
BEGIN
  IF NOT public.is_prayer_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can rename the group';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;
  UPDATE public.prayer_groups
  SET name = v_name, updated_at = now()
  WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_prayer_groups(p_ordered_group_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.current_jwt_email();
  i integer;
  updated_count integer;
BEGIN
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_ordered_group_ids IS NULL THEN
    RAISE EXCEPTION 'p_ordered_group_ids must not be null';
  END IF;

  FOR i IN 1 .. coalesce(array_length(p_ordered_group_ids, 1), 0)
  LOOP
    UPDATE public.prayer_group_members
    SET display_order = i - 1, updated_at = now()
    WHERE group_id = p_ordered_group_ids[i]
      AND lower(user_email) = v_email
      AND coalesce(is_active, true);
    GET DIAGNOSTICS updated_count = row_count;
    IF updated_count = 0 THEN
      RAISE EXCEPTION 'Unknown or inaccessible group id %', p_ordered_group_ids[i];
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_prayer_group_member_name(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.current_jwt_email();
  v_name text := trim(coalesce(p_name, ''));
BEGIN
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF NOT public.is_any_prayer_group_member(v_email) THEN
    RAISE EXCEPTION 'Not a group member';
  END IF;
  UPDATE public.prayer_group_members
  SET name = v_name, updated_at = now()
  WHERE lower(user_email) = v_email;
END;
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
  IF NOT public.is_prayer_group_member(p_group_id, v_email) THEN
    RAISE EXCEPTION 'That person is not a member of this group';
  END IF;
  IF NOT public.is_church_member(v_email) THEN
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
  IF public.is_prayer_group_owner(p_group_id, v_email) THEN
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

  SELECT m.role
    INTO v_role
  FROM public.prayer_group_members m
  WHERE m.group_id = p_group_id
    AND lower(m.user_email) = v_email
    AND coalesce(m.is_active, true);

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF v_role = 'owner' THEN
    DELETE FROM public.prayer_groups WHERE id = p_group_id;
  ELSE
    DELETE FROM public.prayer_group_members
    WHERE group_id = p_group_id
      AND lower(user_email) = v_email;
  END IF;

  RETURN public.delete_group_only_account_if_last(v_email, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_prayer_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_prayer_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can delete the group';
  END IF;
  DELETE FROM public.prayer_groups WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_group_prayer_prayed_for_count(p_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_count integer;
  v_group uuid;
BEGIN
  SELECT group_id INTO v_group FROM public.group_prayers WHERE id = p_id;
  IF v_group IS NULL OR NOT public.is_prayer_group_member(v_group) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.group_prayers
  SET prayed_for_count = coalesce(prayed_for_count, 0) + 1
  WHERE id = p_id
  RETURNING prayed_for_count INTO new_count;
  RETURN coalesce(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_group_badge_read_receipts()
RETURNS TABLE (item_kind text, item_id uuid, group_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_email text := public.current_jwt_email();
BEGIN
  IF caller_email IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT r.item_kind, r.item_id, r.group_id
  FROM public.group_badge_read_receipts r
  WHERE lower(r.user_email) = caller_email
    AND public.is_prayer_group_member(r.group_id, caller_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_group_badge_read_receipts(
  p_group_ids uuid[],
  p_item_kinds text[],
  p_item_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_email text := public.current_jwt_email();
  inserted_count integer := 0;
BEGIN
  IF caller_email IS NULL THEN
    RETURN 0;
  END IF;
  IF p_group_ids IS NULL OR p_item_kinds IS NULL OR p_item_ids IS NULL
     OR cardinality(p_group_ids) = 0
     OR cardinality(p_group_ids) <> cardinality(p_item_kinds)
     OR cardinality(p_group_ids) <> cardinality(p_item_ids) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.group_badge_read_receipts (user_email, group_id, item_kind, item_id)
  SELECT caller_email, gid, kind, iid
  FROM unnest(p_group_ids, p_item_kinds, p_item_ids) AS t(gid, kind, iid)
  WHERE kind IN ('group_prayer', 'group_prayer_update')
    AND public.is_prayer_group_member(gid, caller_email)
  ON CONFLICT (user_email, item_kind, item_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = row_count;
  RETURN coalesce(inserted_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upgrade_to_church_member(p_subscriber_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor text := public.current_jwt_email();
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.email_subscribers
  SET is_church_member = true,
      church_downgraded_at = NULL
  WHERE id = p_subscriber_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscriber not found';
  END IF;
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
  IF NOT public.is_any_prayer_group_member(v_email) THEN
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

  UPDATE public.email_subscribers
  SET is_church_member = false,
      church_downgraded_at = now()
  WHERE id = p_subscriber_id;

  DELETE FROM public.user_prayer_item_reminders
  WHERE lower(user_email) = v_email
    AND prayer_kind IN ('community', 'pc_member');

  UPDATE public.user_badge_read_state
  SET prayers_data = '{"prayers":[],"updates":[]}'::jsonb,
      prompts_data = '{"prompts":[],"updates":[]}'::jsonb
  WHERE lower(user_email) = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.create_prayer_group(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.invite_prayer_group_member(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rename_prayer_group(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reorder_prayer_groups(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_prayer_group_member_name(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_prayer_group_ownership(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_prayer_group_member(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_prayer_group(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_prayer_group(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_group_prayer_prayed_for_count(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_group_badge_read_receipts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_group_badge_read_receipts(uuid[], text[], uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upgrade_to_church_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_downgrade_to_group_only(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_prayer_group(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_prayer_group_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_prayer_group(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_prayer_groups(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_prayer_group_member_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_prayer_group_ownership(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_prayer_group_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_prayer_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_prayer_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_group_prayer_prayed_for_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_badge_read_receipts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_group_badge_read_receipts(uuid[], text[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upgrade_to_church_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_downgrade_to_group_only(uuid) TO authenticated;

DROP POLICY IF EXISTS prayer_groups_select_member ON public.prayer_groups;
CREATE POLICY prayer_groups_select_member ON public.prayer_groups
  FOR SELECT TO authenticated
  USING (public.is_prayer_group_member(id));

DROP POLICY IF EXISTS prayer_groups_delete_owner ON public.prayer_groups;
CREATE POLICY prayer_groups_delete_owner ON public.prayer_groups
  FOR DELETE TO authenticated
  USING (public.is_prayer_group_owner(id));

DROP POLICY IF EXISTS prayer_group_members_select ON public.prayer_group_members;
CREATE POLICY prayer_group_members_select ON public.prayer_group_members
  FOR SELECT TO authenticated
  USING (public.is_prayer_group_member(group_id));

DROP POLICY IF EXISTS group_prayers_select_member ON public.group_prayers;
CREATE POLICY group_prayers_select_member ON public.group_prayers
  FOR SELECT TO authenticated
  USING (public.is_prayer_group_member(group_id));

DROP POLICY IF EXISTS group_prayers_insert_member ON public.group_prayers;
CREATE POLICY group_prayers_insert_member ON public.group_prayers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_prayer_group_member(group_id)
    AND lower(email) = public.current_jwt_email()
  );

DROP POLICY IF EXISTS group_prayers_update_author ON public.group_prayers;
CREATE POLICY group_prayers_update_author ON public.group_prayers
  FOR UPDATE TO authenticated
  USING (
    public.is_prayer_group_member(group_id)
    AND lower(email) = public.current_jwt_email()
  )
  WITH CHECK (
    public.is_prayer_group_member(group_id)
    AND lower(email) = public.current_jwt_email()
  );

DROP POLICY IF EXISTS group_prayers_delete_author_or_owner ON public.group_prayers;
CREATE POLICY group_prayers_delete_author_or_owner ON public.group_prayers
  FOR DELETE TO authenticated
  USING (
    lower(email) = public.current_jwt_email()
    OR public.is_prayer_group_owner(group_id)
  );

DROP POLICY IF EXISTS group_prayer_updates_select_member ON public.group_prayer_updates;
CREATE POLICY group_prayer_updates_select_member ON public.group_prayer_updates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.group_prayers gp
      WHERE gp.id = group_prayer_id
        AND public.is_prayer_group_member(gp.group_id)
    )
  );

DROP POLICY IF EXISTS group_prayer_updates_insert_member ON public.group_prayer_updates;
CREATE POLICY group_prayer_updates_insert_member ON public.group_prayer_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    lower(author_email) = public.current_jwt_email()
    AND EXISTS (
      SELECT 1
      FROM public.group_prayers gp
      WHERE gp.id = group_prayer_id
        AND public.is_prayer_group_member(gp.group_id)
    )
  );

DROP POLICY IF EXISTS group_prayer_updates_update_author ON public.group_prayer_updates;
CREATE POLICY group_prayer_updates_update_author ON public.group_prayer_updates
  FOR UPDATE TO authenticated
  USING (lower(author_email) = public.current_jwt_email())
  WITH CHECK (lower(author_email) = public.current_jwt_email());

DROP POLICY IF EXISTS group_prayer_updates_delete_author_or_owner ON public.group_prayer_updates;
CREATE POLICY group_prayer_updates_delete_author_or_owner ON public.group_prayer_updates
  FOR DELETE TO authenticated
  USING (
    lower(author_email) = public.current_jwt_email()
    OR EXISTS (
      SELECT 1
      FROM public.group_prayers gp
      WHERE gp.id = group_prayer_id
        AND public.is_prayer_group_owner(gp.group_id)
    )
  );

DROP POLICY IF EXISTS group_badge_read_receipts_select_own ON public.group_badge_read_receipts;
CREATE POLICY group_badge_read_receipts_select_own ON public.group_badge_read_receipts
  FOR SELECT TO authenticated
  USING (
    lower(user_email) = public.current_jwt_email()
    AND public.is_prayer_group_member(group_id)
  );

REVOKE ALL ON TABLE public.prayer_groups FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.prayer_group_members FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.group_prayers FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.group_prayer_updates FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.group_badge_read_receipts FROM PUBLIC, anon;

GRANT SELECT, DELETE ON TABLE public.prayer_groups TO authenticated;
GRANT SELECT ON TABLE public.prayer_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_prayers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_prayer_updates TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.group_badge_read_receipts TO authenticated;

REVOKE UPDATE ON TABLE public.prayer_group_members FROM authenticated;

CREATE OR REPLACE FUNCTION public.group_prayers_keep_group()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id
     OR lower(NEW.email) IS DISTINCT FROM lower(OLD.email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_prayers_keep_group ON public.group_prayers;
CREATE TRIGGER trg_group_prayers_keep_group
  BEFORE UPDATE ON public.group_prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.group_prayers_keep_group();

REVOKE ALL ON FUNCTION public.group_prayers_keep_group() FROM PUBLIC, anon;

INSERT INTO public.email_templates (template_key, name, subject, html_body, text_body, description)
VALUES
  (
    'group_invitation',
    'Group invitation',
    'You are invited to a prayer group',
    '<p>You have been invited to the prayer group <strong>{{groupName}}</strong>.</p><p><a href="{{appLink}}">Sign in</a></p>',
    E'You have been invited to the prayer group {{groupName}}.\n\nSign in: {{appLink}}',
    'Sent when a group owner invites an email.'
  ),
  (
    'group_prayer_added',
    'Group prayer added',
    'New prayer in {{groupName}}',
    '<p><strong>{{requester}}</strong> added a prayer in <strong>{{groupName}}</strong>: {{title}}</p><p><a href="{{appLink}}">Open the group</a></p>',
    E'{{requester}} added a prayer in {{groupName}}: {{title}}\n\n{{appLink}}',
    'Sent to other group members when a prayer is added.'
  ),
  (
    'group_prayer_update',
    'Group prayer update',
    'Update in {{groupName}}',
    '<p>There is a new update in <strong>{{groupName}}</strong> on {{title}}.</p><p><a href="{{appLink}}">Open the group</a></p>',
    E'There is a new update in {{groupName}} on {{title}}.\n\n{{appLink}}',
    'Sent to other group members when a prayer is updated.'
  )
ON CONFLICT (template_key) DO NOTHING;

-- ROLLBACK
-- DROP the group tables, functions, and policies created above.
-- Restore delete_subscriber_account from 20261017220000_delete_subscriber_account.sql.
-- Restore default_prayer_view_check to ('current', 'personal').
-- DELETE FROM email_templates WHERE template_key IN ('group_invitation', 'group_prayer_added', 'group_prayer_update');
