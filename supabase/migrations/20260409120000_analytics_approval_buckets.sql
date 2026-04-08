-- Time-bucketed prayer/update approvals for Site Analytics chart (subscriber bulk-send timing).

CREATE OR REPLACE FUNCTION public.analytics_approval_buckets(
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text
)
RETURNS TABLE(bucket_start timestamptz, approval_count bigint, approval_labels text)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_bucket IS NULL OR p_bucket NOT IN ('hour', 'day') THEN
    RAISE EXCEPTION 'invalid p_bucket: must be hour or day';
  END IF;

  IF p_start >= p_end THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH events AS (
    SELECT
      date_trunc(p_bucket, pr.approved_at) AS bs,
      pr.title::text AS lbl,
      pr.approved_at AS ts
    FROM public.prayers pr
    WHERE pr.approval_status::text = 'approved'
      AND pr.approved_at IS NOT NULL
      AND pr.approved_at >= p_start
      AND pr.approved_at < p_end
      AND COALESCE(pr.is_seed_data, false) = false
    UNION ALL
    SELECT
      date_trunc(p_bucket, u.approved_at),
      (parent.title || ' (update)')::text,
      u.approved_at
    FROM public.prayer_updates u
    INNER JOIN public.prayers parent ON parent.id = u.prayer_id
    WHERE u.approval_status::text = 'approved'
      AND u.approved_at IS NOT NULL
      AND u.approved_at >= p_start
      AND u.approved_at < p_end
      AND COALESCE(u.is_seed_data, false) = false
  ),
  per_bucket AS (
    SELECT e.bs AS bk, COUNT(*)::bigint AS cnt
    FROM events e
    GROUP BY e.bs
  )
  SELECT
    pb.bk AS bucket_start,
    pb.cnt AS approval_count,
    TRIM(
      COALESCE(
        (
          SELECT string_agg(sub.lbl, E'\n' ORDER BY sub.ts)
          FROM (
            SELECT e2.lbl, e2.ts, ROW_NUMBER() OVER (ORDER BY e2.ts) AS rn
            FROM events e2
            WHERE e2.bs = pb.bk
          ) sub
          WHERE sub.rn <= 8
        ),
        ''
      )
    ) ||
    CASE
      WHEN pb.cnt > 8 THEN E'\n+ ' || (pb.cnt - 8)::text || ' more'
      ELSE ''
    END AS approval_labels
  FROM per_bucket pb
  ORDER BY 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_approval_buckets(timestamptz, timestamptz, text) TO authenticated;
