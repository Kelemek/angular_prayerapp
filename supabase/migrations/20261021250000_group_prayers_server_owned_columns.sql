-- Authors may edit text fields only; counts, status, and dates are server-owned.

REVOKE UPDATE ON TABLE public.group_prayers FROM authenticated;
GRANT UPDATE (title, description, prayer_for)
  ON TABLE public.group_prayers TO authenticated;

CREATE OR REPLACE FUNCTION public.set_group_prayer_status(p_id uuid, p_answered boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := public.current_jwt_email();
  v_group uuid;
BEGIN
  IF v_email IS NULL OR p_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT gp.group_id
    INTO v_group
  FROM public.group_prayers gp
  WHERE gp.id = p_id
    AND lower(gp.email) = v_email;

  IF v_group IS NULL OR NOT public.is_prayer_group_member(v_group, v_email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.group_prayers
  SET status = CASE WHEN coalesce(p_answered, false) THEN 'answered' ELSE 'current' END,
      date_answered = CASE WHEN coalesce(p_answered, false) THEN now() ELSE NULL END
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_group_prayer_status(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_group_prayer_status(uuid, boolean) TO authenticated;

-- ROLLBACK
-- DROP FUNCTION public.set_group_prayer_status(uuid, boolean);
-- REVOKE UPDATE ON TABLE public.group_prayers FROM authenticated;
-- GRANT UPDATE ON TABLE public.group_prayers TO authenticated;
