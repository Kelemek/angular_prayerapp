-- Per-account gate for prayer groups (default off). Admins enable via email_subscribers.

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS prayer_groups_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.email_subscribers.prayer_groups_enabled IS
  'When true, the account may use prayer groups (UI and RLS). Users cannot set this themselves.';

CREATE OR REPLACE FUNCTION public.prayer_groups_enabled(p_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(trim(es.email)) = lower(trim(coalesce(p_email, public.current_jwt_email())))
      AND es.prayer_groups_enabled IS TRUE
      AND coalesce(es.is_blocked, false) IS NOT TRUE
  );
$$;

COMMENT ON FUNCTION public.prayer_groups_enabled(text) IS
  'True when that email has prayer_groups_enabled on an unblocked subscriber row. Defaults to the JWT email.';

REVOKE ALL ON FUNCTION public.prayer_groups_enabled(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prayer_groups_enabled(text) TO authenticated, service_role;

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
      AND public.prayer_groups_enabled(m.user_email)
      AND NOT EXISTS (
        SELECT 1
        FROM public.email_subscribers es
        WHERE lower(es.email) = lower(m.user_email)
          AND coalesce(es.is_blocked, false)
      )
  );
$$;

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
  IF NOT public.prayer_groups_enabled(v_email) THEN
    RAISE EXCEPTION 'Prayer groups are not enabled for this account';
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

CREATE OR REPLACE FUNCTION public.subscriber_self_update_keeps_privileges(
  p_email text,
  p_is_admin boolean,
  p_is_blocked boolean,
  p_auth_user_id uuid,
  p_is_church_member boolean,
  p_church_downgraded_at timestamptz,
  p_prayer_groups_enabled boolean
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(es.email) = lower(p_email)
      AND es.is_admin IS NOT DISTINCT FROM p_is_admin
      AND coalesce(es.is_blocked, false) IS NOT DISTINCT FROM coalesce(p_is_blocked, false)
      AND es.auth_user_id IS NOT DISTINCT FROM p_auth_user_id
      AND es.is_church_member IS NOT DISTINCT FROM p_is_church_member
      AND es.church_downgraded_at IS NOT DISTINCT FROM p_church_downgraded_at
      AND es.prayer_groups_enabled IS NOT DISTINCT FROM p_prayer_groups_enabled
  );
$$;

REVOKE ALL ON FUNCTION public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid, boolean, timestamptz, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid, boolean, timestamptz, boolean) TO authenticated, service_role;

DROP POLICY IF EXISTS "email_subscribers_update_own" ON public.email_subscribers;
DROP POLICY IF EXISTS "email_subscribers_insert_own" ON public.email_subscribers;

DROP FUNCTION IF EXISTS public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid, boolean, timestamptz);

CREATE POLICY "email_subscribers_update_own"
  ON public.email_subscribers
  FOR UPDATE
  TO authenticated
  USING (lower(email) = lower((auth.jwt() ->> 'email')))
  WITH CHECK (
    lower(email) = lower((auth.jwt() ->> 'email'))
    AND public.subscriber_self_update_keeps_privileges(
      email,
      is_admin,
      is_blocked,
      auth_user_id,
      is_church_member,
      church_downgraded_at,
      prayer_groups_enabled
    )
  );

CREATE POLICY "email_subscribers_insert_own"
  ON public.email_subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lower(email) = lower((auth.jwt() ->> 'email'))
    AND coalesce(is_admin, false) = false
    AND coalesce(is_blocked, false) = false
    AND auth_user_id IS NULL
    AND is_church_member = false
    AND church_downgraded_at IS NULL
    AND coalesce(prayer_groups_enabled, false) = false
  );
