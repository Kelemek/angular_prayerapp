-- Persist block/downgrade across account deletion and re-registration.

CREATE TABLE IF NOT EXISTS public.email_subscriber_privilege_tombstones (
  email text PRIMARY KEY,
  is_blocked boolean NOT NULL DEFAULT false,
  church_downgraded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_subscriber_privilege_tombstones_email_lower CHECK (email = lower(trim(email)))
);

COMMENT ON TABLE public.email_subscriber_privilege_tombstones IS
  'Email-keyed block/downgrade state surviving subscriber row deletion. No client access.';

ALTER TABLE public.email_subscriber_privilege_tombstones ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_subscriber_privilege_tombstones
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_email_subscriber_privilege_tombstone(
  p_email text,
  p_is_blocked boolean,
  p_church_downgraded_at timestamptz
)
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
  IF coalesce(p_is_blocked, false) OR p_church_downgraded_at IS NOT NULL THEN
    INSERT INTO public.email_subscriber_privilege_tombstones (
      email,
      is_blocked,
      church_downgraded_at
    ) VALUES (
      v_email,
      coalesce(p_is_blocked, false),
      p_church_downgraded_at
    )
    ON CONFLICT (email) DO UPDATE
      SET is_blocked = EXCLUDED.is_blocked,
          church_downgraded_at = EXCLUDED.church_downgraded_at;
  ELSE
    DELETE FROM public.email_subscriber_privilege_tombstones t
    WHERE t.email = v_email;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_email_subscriber_privilege_tombstone(text, boolean, timestamptz)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.email_subscribers_apply_privilege_tombstone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(NEW.email));
  v_blocked boolean;
  v_downgraded timestamptz;
BEGIN
  SELECT t.is_blocked, t.church_downgraded_at
    INTO v_blocked, v_downgraded
  FROM public.email_subscriber_privilege_tombstones t
  WHERE t.email = v_email;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF coalesce(v_blocked, false) THEN
    NEW.is_blocked := true;
  END IF;

  IF v_downgraded IS NOT NULL THEN
    NEW.church_downgraded_at := v_downgraded;
    NEW.is_church_member := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_subscribers_apply_privilege_tombstone
  ON public.email_subscribers;
CREATE TRIGGER trg_email_subscribers_apply_privilege_tombstone
  BEFORE INSERT ON public.email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.email_subscribers_apply_privilege_tombstone();

CREATE OR REPLACE FUNCTION public.email_subscribers_sync_privilege_tombstone_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked
     OR NEW.church_downgraded_at IS DISTINCT FROM OLD.church_downgraded_at THEN
    PERFORM public.upsert_email_subscriber_privilege_tombstone(
      NEW.email,
      NEW.is_blocked,
      NEW.church_downgraded_at
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_subscribers_sync_privilege_tombstone_on_update
  ON public.email_subscribers;
CREATE TRIGGER trg_email_subscribers_sync_privilege_tombstone_on_update
  AFTER UPDATE ON public.email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.email_subscribers_sync_privilege_tombstone_on_update();

CREATE OR REPLACE FUNCTION public.email_subscribers_snapshot_privilege_tombstone_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(OLD.is_blocked, false) OR OLD.church_downgraded_at IS NOT NULL THEN
    PERFORM public.upsert_email_subscriber_privilege_tombstone(
      OLD.email,
      OLD.is_blocked,
      OLD.church_downgraded_at
    );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_subscribers_snapshot_privilege_tombstone_on_delete
  ON public.email_subscribers;
CREATE TRIGGER trg_email_subscribers_snapshot_privilege_tombstone_on_delete
  BEFORE DELETE ON public.email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.email_subscribers_snapshot_privilege_tombstone_on_delete();

REVOKE ALL ON FUNCTION public.email_subscribers_apply_privilege_tombstone()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.email_subscribers_sync_privilege_tombstone_on_update()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.email_subscribers_snapshot_privilege_tombstone_on_delete()
  FROM PUBLIC, anon;

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

-- ROLLBACK
-- DROP TRIGGER trg_email_subscribers_snapshot_privilege_tombstone_on_delete ON public.email_subscribers;
-- DROP FUNCTION public.email_subscribers_snapshot_privilege_tombstone_on_delete();
-- DROP TRIGGER trg_email_subscribers_sync_privilege_tombstone_on_update ON public.email_subscribers;
-- DROP FUNCTION public.email_subscribers_sync_privilege_tombstone_on_update();
-- DROP TRIGGER trg_email_subscribers_apply_privilege_tombstone ON public.email_subscribers;
-- DROP FUNCTION public.email_subscribers_apply_privilege_tombstone();
-- DROP FUNCTION public.upsert_email_subscriber_privilege_tombstone(text, boolean, timestamptz);
-- DROP TABLE public.email_subscriber_privilege_tombstones;
-- Restore invite_prayer_group_member from 20261020000100_invite_enables_prayer_groups.sql.
