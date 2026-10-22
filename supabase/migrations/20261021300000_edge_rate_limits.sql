-- Cross-isolate rate hits, invite sendability, and group-activity notify dedupe.
-- Count-then-insert can admit one extra hit under concurrency. Abuse limits accept that.

CREATE TABLE public.edge_function_rate_limit_hits (
  bucket  text        NOT NULL,
  subject text        NOT NULL,
  hit_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_bucket_subject_time
  ON public.edge_function_rate_limit_hits (bucket, subject, hit_at);

ALTER TABLE public.edge_function_rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edge_function_rate_limit_hits FROM PUBLIC, anon, authenticated;

CREATE TABLE public.group_activity_notify_sends (
  kind            text        NOT NULL,
  prayer_id       uuid        NOT NULL,
  update_id       uuid        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  recipient_email text        NOT NULL,
  claimed_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, prayer_id, update_id, recipient_email)
);

ALTER TABLE public.group_activity_notify_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_activity_notify_sends FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_max int,
  p_window interval
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
BEGIN
  IF coalesce(auth.role(), auth.jwt() ->> 'role', '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.edge_function_rate_limit_hits
  WHERE hit_at < now() - interval '24 hours';

  SELECT count(*)::int
    INTO v_count
  FROM public.edge_function_rate_limit_hits
  WHERE bucket = p_bucket
    AND subject = p_subject
    AND hit_at >= now() - p_window;

  IF v_count >= p_max THEN
    RETURN false;
  END IF;

  INSERT INTO public.edge_function_rate_limit_hits (bucket, subject)
  VALUES (p_bucket, p_subject);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, int, interval)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, int, interval)
  TO service_role;

CREATE OR REPLACE FUNCTION public.assert_group_invite_sendable(
  p_group_id uuid,
  p_owner text,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner text := lower(trim(coalesce(p_owner, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF coalesce(auth.role(), auth.jwt() ->> 'role', '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_group_id IS NULL OR v_owner = '' OR v_email = '' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.prayer_group_members m
    WHERE m.group_id = p_group_id
      AND lower(m.user_email) = v_owner
      AND m.role = 'owner'
      AND coalesce(m.is_active, true)
      AND public.is_prayer_group_member_row(p_group_id, m.user_email)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT public.is_prayer_group_member_row(p_group_id, v_email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_group_invite_sendable(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_group_invite_sendable(uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.claim_group_activity_notify(
  p_kind text,
  p_prayer_id uuid,
  p_update_id uuid,
  p_recipient text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recipient text := lower(trim(coalesce(p_recipient, '')));
BEGIN
  IF coalesce(auth.role(), auth.jwt() ->> 'role', '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.group_activity_notify_sends (
    kind,
    prayer_id,
    update_id,
    recipient_email
  )
  VALUES (
    p_kind,
    p_prayer_id,
    coalesce(p_update_id, '00000000-0000-0000-0000-000000000000'),
    v_recipient
  )
  ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_group_activity_notify(text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_group_activity_notify(text, uuid, uuid, text)
  TO service_role;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS public.claim_group_activity_notify(text, uuid, uuid, text);
-- DROP FUNCTION IF EXISTS public.assert_group_invite_sendable(uuid, text, text);
-- DROP FUNCTION IF EXISTS public.consume_rate_limit(text, text, int, interval);
-- DROP TABLE IF EXISTS public.group_activity_notify_sends;
-- DROP TABLE IF EXISTS public.edge_function_rate_limit_hits;
