-- Membership columns change only through the admin RPCs, service_role, or an empty-JWT migration role.
-- Downgrade deletes community, pc_member, and prompt reminders at the source.

CREATE OR REPLACE FUNCTION public.email_subscribers_keep_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(auth.role(), auth.jwt() ->> 'role', '');
  v_actor text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_membership_change boolean :=
    NEW.is_church_member IS DISTINCT FROM OLD.is_church_member
    OR NEW.church_downgraded_at IS DISTINCT FROM OLD.church_downgraded_at;
  v_block_change boolean := NEW.is_blocked IS DISTINCT FROM OLD.is_blocked;
BEGIN
  IF v_membership_change THEN
    IF v_role = 'service_role'
       OR current_setting('prayerapp.membership_rpc', true) = '1'
       OR (
         current_user IN ('postgres', 'supabase_admin')
         AND coalesce(auth.jwt() ->> 'role', '') = ''
       )
    THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  IF v_block_change THEN
    IF v_role = 'service_role'
       OR (v_actor <> '' AND public.is_admin(v_actor))
    THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.email_subscribers_keep_privilege_columns()
  FROM PUBLIC, anon;

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

  PERFORM set_config('prayerapp.membership_rpc', '1', true);

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
-- Restore email_subscribers_keep_privilege_columns from 20261021200000_fix_email_subscribers_privilege_trigger.sql.
-- Restore admin_upgrade_to_church_member and admin_downgrade_to_group_only from 20261018200000_prayer_groups.sql.
