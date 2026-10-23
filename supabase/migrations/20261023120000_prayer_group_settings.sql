-- Per-group prayer behavior flags (owner-configurable via update_prayer_group_settings).

ALTER TABLE public.prayer_groups
  ADD COLUMN IF NOT EXISTS updates_requester_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answered_requester_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pray_for_disabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.prayer_groups.updates_requester_only IS
  'When true, only the prayer requester (group_prayers.email) may add updates.';
COMMENT ON COLUMN public.prayer_groups.answered_requester_only IS
  'When true, only the prayer requester may mark the prayer answered or unanswered.';
COMMENT ON COLUMN public.prayer_groups.pray_for_disabled IS
  'When true, members cannot use Pray For on prayers in this group.';

CREATE OR REPLACE FUNCTION public.update_prayer_group_settings(
  p_group_id uuid,
  p_updates_requester_only boolean,
  p_answered_requester_only boolean,
  p_pray_for_disabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_prayer_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can change group settings';
  END IF;

  UPDATE public.prayer_groups
  SET
    updates_requester_only = coalesce(p_updates_requester_only, false),
    answered_requester_only = coalesce(p_answered_requester_only, false),
    pray_for_disabled = coalesce(p_pray_for_disabled, false),
    updated_at = now()
  WHERE id = p_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_prayer_group_settings(uuid, boolean, boolean, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_prayer_group_settings(uuid, boolean, boolean, boolean)
  TO authenticated;

DROP POLICY IF EXISTS group_prayer_updates_insert_member ON public.group_prayer_updates;
CREATE POLICY group_prayer_updates_insert_member ON public.group_prayer_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    lower(author_email) = public.current_jwt_email()
    AND EXISTS (
      SELECT 1
      FROM public.group_prayers gp
      JOIN public.prayer_groups pg ON pg.id = gp.group_id
      WHERE gp.id = group_prayer_id
        AND public.is_prayer_group_member(gp.group_id)
        AND (
          NOT coalesce(pg.updates_requester_only, false)
          OR lower(gp.email) = public.current_jwt_email()
        )
        AND (
          NOT coalesce(mark_as_answered, false)
          OR NOT coalesce(pg.answered_requester_only, false)
          OR lower(gp.email) = public.current_jwt_email()
        )
    )
  );

CREATE OR REPLACE FUNCTION public.set_group_prayer_status(p_id uuid, p_answered boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.current_jwt_email();
  v_group uuid;
  v_requester_email text;
  v_answered_requester_only boolean;
BEGIN
  IF v_email IS NULL OR p_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT gp.group_id, gp.email, coalesce(pg.answered_requester_only, false)
    INTO v_group, v_requester_email, v_answered_requester_only
  FROM public.group_prayers gp
  JOIN public.prayer_groups pg ON pg.id = gp.group_id
  WHERE gp.id = p_id;

  IF v_group IS NULL OR NOT public.is_prayer_group_member(v_group, v_email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_answered_requester_only AND lower(v_requester_email) <> v_email THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.group_prayers
  SET status = CASE WHEN coalesce(p_answered, false) THEN 'answered' ELSE 'current' END,
      date_answered = CASE WHEN coalesce(p_answered, false) THEN now() ELSE NULL END
  WHERE id = p_id;
END;
$$;

DROP POLICY IF EXISTS group_prayer_updates_update_author ON public.group_prayer_updates;
CREATE POLICY group_prayer_updates_update_author ON public.group_prayer_updates
  FOR UPDATE TO authenticated
  USING (
    lower(author_email) = public.current_jwt_email()
    AND EXISTS (
      SELECT 1
      FROM public.group_prayers gp
      JOIN public.prayer_groups pg ON pg.id = gp.group_id
      WHERE gp.id = group_prayer_id
        AND public.is_prayer_group_member(gp.group_id)
    )
  )
  WITH CHECK (
    lower(author_email) = public.current_jwt_email()
    AND EXISTS (
      SELECT 1
      FROM public.group_prayers gp
      JOIN public.prayer_groups pg ON pg.id = gp.group_id
      WHERE gp.id = group_prayer_id
        AND public.is_prayer_group_member(gp.group_id)
        AND (
          NOT coalesce(mark_as_answered, false)
          OR NOT coalesce(pg.answered_requester_only, false)
          OR lower(gp.email) = public.current_jwt_email()
        )
    )
  );

CREATE OR REPLACE FUNCTION public.increment_group_prayer_prayed_for_count(p_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_count integer;
  v_group uuid;
  v_pray_for_disabled boolean;
BEGIN
  SELECT gp.group_id, coalesce(pg.pray_for_disabled, false)
    INTO v_group, v_pray_for_disabled
  FROM public.group_prayers gp
  JOIN public.prayer_groups pg ON pg.id = gp.group_id
  WHERE gp.id = p_id;

  IF v_group IS NULL OR NOT public.is_prayer_group_member(v_group) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_pray_for_disabled THEN
    RAISE EXCEPTION 'Pray For is disabled for this group';
  END IF;

  UPDATE public.group_prayers
  SET prayed_for_count = coalesce(prayed_for_count, 0) + 1
  WHERE id = p_id
  RETURNING prayed_for_count INTO new_count;
  RETURN coalesce(new_count, 0);
END;
$$;
