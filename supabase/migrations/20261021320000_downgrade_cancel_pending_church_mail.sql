-- Pending church queue rows were inserted while the person was still a church
-- member. The INSERT trigger cannot skip them later. Downgrade deletes those
-- pending rows and leaves group templates. In-flight processing rows are left
-- alone because the processor already loaded them.

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

  DELETE FROM public.email_queue q
  WHERE lower(q.recipient) = v_email
    AND q.status = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM public.email_templates t
      WHERE t.template_key = q.template_key
        AND coalesce(t.is_group, false) = true
    );

  UPDATE public.user_badge_read_state
  SET prayers_data = '{"prayers":[],"updates":[]}'::jsonb,
      prompts_data = '{"prompts":[],"updates":[]}'::jsonb
  WHERE lower(user_email) = v_email;
END;
$$;

-- ROLLBACK
-- Restore admin_downgrade_to_group_only from 20261021290000_membership_helpers_no_jwt.sql.
