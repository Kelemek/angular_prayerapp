-- Recite usage totals are for a signed-in admin. An email argument is not a session.

CREATE OR REPLACE FUNCTION public.get_memorization_recite_usage_summary(
  p_start timestamptz DEFAULT date_trunc('month', now()),
  p_end timestamptz DEFAULT now(),
  p_email text DEFAULT NULL
)
RETURNS TABLE (
  attempt_count bigint,
  billable_audio_seconds numeric,
  estimated_cost_usd numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_email text;
  v_p_email text;
BEGIN
  v_jwt_email := nullif(trim(lower(coalesce(auth.jwt() ->> 'email', ''))), '');
  v_p_email := nullif(trim(lower(coalesce(p_email, ''))), '');

  IF v_jwt_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_p_email IS NOT NULL AND v_p_email <> v_jwt_email THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT public.is_admin(v_jwt_email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    count(*)::bigint,
    coalesce(sum(u.audio_seconds), 0),
    coalesce(sum(u.estimated_cost_usd), 0)
  FROM public.memorization_recite_usage u
  WHERE u.created_at >= coalesce(p_start, '-infinity'::timestamptz)
    AND u.created_at < coalesce(p_end, 'infinity'::timestamptz);
END;
$$;

REVOKE ALL ON FUNCTION public.get_memorization_recite_usage_summary(timestamptz, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_memorization_recite_usage_summary(timestamptz, timestamptz, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_memorization_recite_usage_summary(timestamptz, timestamptz, text) TO authenticated;

REVOKE SELECT ON TABLE public.memorization_recite_usage FROM anon;
