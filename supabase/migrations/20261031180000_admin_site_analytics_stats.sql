CREATE OR REPLACE FUNCTION public.admin_site_analytics_stats(
  p_today timestamptz,
  p_week timestamptz,
  p_month timestamptz,
  p_year timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor text := public.current_jwt_email();
  v_stats jsonb := '{}'::jsonb;
  v_n bigint;
  v_current bigint;
  v_answered bigint;
  v_total bigint;
  v_learning bigint;
  v_practicing bigint;
  v_mastered bigint;
  v_members bigint;
  v_non_members bigint;
BEGIN
  -- Keep this check outside EXCEPTION WHEN OTHERS. A handler here would swallow Not authorized.
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  BEGIN
    SELECT count(*)::bigint
      INTO v_n
    FROM public.analytics
    WHERE event_type = 'page_view'
      AND created_at >= p_today;
    v_stats := v_stats || jsonb_build_object('todayPageViews', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats todayPageViews: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint
      INTO v_n
    FROM public.analytics
    WHERE event_type = 'page_view'
      AND created_at >= p_week;
    v_stats := v_stats || jsonb_build_object('weekPageViews', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats weekPageViews: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint
      INTO v_n
    FROM public.analytics
    WHERE event_type = 'page_view'
      AND created_at >= p_month;
    v_stats := v_stats || jsonb_build_object('monthPageViews', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats monthPageViews: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint
      INTO v_n
    FROM public.analytics
    WHERE event_type = 'page_view'
      AND created_at >= p_year;
    v_stats := v_stats || jsonb_build_object('yearPageViews', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats yearPageViews: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint
      INTO v_n
    FROM public.analytics
    WHERE event_type = 'page_view';
    v_stats := v_stats || jsonb_build_object('totalPageViews', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats totalPageViews: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint INTO v_n FROM public.prayers;
    v_stats := v_stats || jsonb_build_object('totalPrayers', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats totalPrayers: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint
      INTO v_n
    FROM public.prayers
    WHERE status = 'current';
    v_stats := v_stats || jsonb_build_object('currentPrayers', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats currentPrayers: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint
      INTO v_n
    FROM public.prayers
    WHERE status = 'answered';
    v_stats := v_stats || jsonb_build_object('answeredPrayers', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats answeredPrayers: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint
      INTO v_n
    FROM public.prayers
    WHERE status = 'archived';
    v_stats := v_stats || jsonb_build_object('archivedPrayers', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats archivedPrayers: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint INTO v_n FROM public.email_subscribers;
    v_stats := v_stats || jsonb_build_object('totalSubscribers', v_n);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats totalSubscribers: %', SQLERRM;
  END;

  -- Scalar subquery so an empty practice_sessions array still counts the row.
  -- A join to jsonb_array_elements would drop that row.
  BEGIN
    SELECT
      count(*)::bigint,
      count(*) FILTER (WHERE completed_count < 3)::bigint,
      count(*) FILTER (WHERE completed_count >= 3 AND completed_count < 9)::bigint,
      count(*) FILTER (WHERE completed_count >= 9)::bigint
      INTO v_total, v_learning, v_practicing, v_mastered
    FROM (
      SELECT CASE
        WHEN mi.practice_sessions IS NULL
          OR jsonb_typeof(mi.practice_sessions) IS DISTINCT FROM 'array'
        THEN 0::bigint
        ELSE (
          SELECT count(*)::bigint
          FROM jsonb_array_elements(mi.practice_sessions) AS elem
          WHERE jsonb_typeof(elem) = 'object'
            AND elem->'completed' = 'true'::jsonb
        )
      END AS completed_count
      FROM public.memorized_items mi
    ) mastery;
    v_stats := v_stats || jsonb_build_object(
      'memorizationTotal', v_total,
      'memorizationLearning', v_learning,
      'memorizationPracticing', v_practicing,
      'memorizationMastered', v_mastered
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats memorization: %', SQLERRM;
  END;

  BEGIN
    SELECT count(*)::bigint INTO v_n FROM public.prayer_groups;
    SELECT count(*)::bigint
      INTO v_current
    FROM public.group_prayers
    WHERE status = 'current';
    SELECT count(*)::bigint
      INTO v_answered
    FROM public.group_prayers
    WHERE status = 'answered';
    SELECT count(*)::bigint INTO v_total FROM public.group_prayers;
    v_stats := v_stats || jsonb_build_object(
      'prayerGroups', v_n,
      'currentGroupPrayers', v_current,
      'answeredGroupPrayers', v_answered,
      'totalGroupPrayers', v_total
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats group prayers: %', SQLERRM;
  END;

  BEGIN
    SELECT
      count(*) FILTER (WHERE is_member)::bigint,
      count(*) FILTER (WHERE NOT is_member)::bigint
      INTO v_members, v_non_members
    FROM (
      SELECT public.is_church_member_row(people.email) AS is_member
      FROM (
        SELECT DISTINCT lower(trim(m.user_email)) AS email
        FROM public.prayer_group_members m
        WHERE public.is_prayer_group_member_row(m.group_id, m.user_email)
      ) people
    ) classified;
    v_stats := v_stats || jsonb_build_object(
      'groupMembers', v_members,
      'groupNonMembers', v_non_members
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_site_analytics_stats group people: %', SQLERRM;
  END;

  RETURN v_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_site_analytics_stats(timestamptz, timestamptz, timestamptz, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_site_analytics_stats(timestamptz, timestamptz, timestamptz, timestamptz)
  TO authenticated;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS public.admin_site_analytics_stats(timestamptz, timestamptz, timestamptz, timestamptz);
