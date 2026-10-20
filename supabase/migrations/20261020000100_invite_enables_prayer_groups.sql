-- Group invites must turn on prayer_groups_enabled; otherwise is_prayer_group_member() denies access.

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

-- Existing members invited before the feature flag gate.
UPDATE public.email_subscribers es
SET prayer_groups_enabled = true
WHERE es.prayer_groups_enabled IS NOT TRUE
  AND EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE lower(m.user_email) = lower(es.email)
      AND coalesce(m.is_active, true)
  );
