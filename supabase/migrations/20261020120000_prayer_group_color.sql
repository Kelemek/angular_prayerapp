-- Per-group accent color (visible to all members on cards and filter chips).

ALTER TABLE public.prayer_groups
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#2563EB';

ALTER TABLE public.prayer_groups
  DROP CONSTRAINT IF EXISTS prayer_groups_color_check;

ALTER TABLE public.prayer_groups
  ADD CONSTRAINT prayer_groups_color_check CHECK (
    color ~ '^#[0-9A-Fa-f]{6}$'
  );

COMMENT ON COLUMN public.prayer_groups.color IS
  'Hex accent (#RRGGBB) for group label styling; owner may change via rename RPC.';

CREATE OR REPLACE FUNCTION public.normalize_prayer_group_hex_color(p_color text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trimmed text := upper(trim(coalesce(p_color, '')));
  v_match text[];
BEGIN
  IF v_trimmed = '' THEN
    RETURN '#2563EB';
  END IF;
  v_match := regexp_match(v_trimmed, '^#?([0-9A-F]{6})$');
  IF v_match IS NULL THEN
    RETURN '#2563EB';
  END IF;
  RETURN '#' || v_match[1];
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_prayer_group_hex_color(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_prayer_group_hex_color(text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.create_prayer_group(text);

CREATE OR REPLACE FUNCTION public.create_prayer_group(p_name text, p_color text DEFAULT '#2563EB')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.current_jwt_email();
  v_name text := trim(coalesce(p_name, ''));
  v_color text := public.normalize_prayer_group_hex_color(p_color);
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

  INSERT INTO public.prayer_groups (name, created_by_email, color)
  VALUES (v_name, v_email, v_color)
  RETURNING id INTO v_group_id;

  INSERT INTO public.prayer_group_members (
    group_id, user_email, role, invited_by_email, name, is_active, display_order
  ) VALUES (
    v_group_id, v_email, 'owner', v_email, v_member_name, true, v_display_order
  );

  RETURN v_group_id;
END;
$$;

DROP FUNCTION IF EXISTS public.rename_prayer_group(uuid, text);

CREATE OR REPLACE FUNCTION public.rename_prayer_group(
  p_group_id uuid,
  p_name text,
  p_color text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := trim(coalesce(p_name, ''));
  v_color text;
BEGIN
  IF NOT public.is_prayer_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can rename the group';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;
  IF p_color IS NULL THEN
    UPDATE public.prayer_groups
    SET name = v_name, updated_at = now()
    WHERE id = p_group_id;
    RETURN;
  END IF;
  v_color := public.normalize_prayer_group_hex_color(p_color);
  UPDATE public.prayer_groups
  SET name = v_name, color = v_color, updated_at = now()
  WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_prayer_group_color(
  p_group_id uuid,
  p_color text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_color text := public.normalize_prayer_group_hex_color(p_color);
BEGIN
  IF NOT public.is_prayer_group_owner(p_group_id) THEN
    RAISE EXCEPTION 'Only the group owner can change the group color';
  END IF;
  UPDATE public.prayer_groups
  SET color = v_color, updated_at = now()
  WHERE id = p_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_prayer_group(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rename_prayer_group(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_prayer_group_color(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_prayer_group(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_prayer_group(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_prayer_group_color(uuid, text) TO authenticated;
