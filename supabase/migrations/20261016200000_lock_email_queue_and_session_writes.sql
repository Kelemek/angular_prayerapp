-- Stop anonymous callers from sending church email, reading templates and
-- page-view rows, listing admin addresses, or writing another person's
-- personal prayers and badge state.
-- Apply on the test project before production. Do not use supabase db push.

-- ---------------------------------------------------------------------------
-- Session check used by the personal-prayer and badge wrappers.
-- Not granted to API roles. The wrappers are SECURITY DEFINER and call it
-- as the owner.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.require_session_email(p_email text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt text;
  v_email text;
BEGIN
  v_jwt := nullif(trim(lower(coalesce(auth.jwt() ->> 'email', ''))), '');
  v_email := nullif(trim(lower(coalesce(p_email, ''))), '');

  IF v_jwt IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_jwt <> v_email AND NOT public.is_admin(v_jwt) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.require_session_email(text) FROM PUBLIC, anon, authenticated;

-- Keep the existing bodies. Rename them out of the API, then wrap the
-- original names with the session check.

DO $rename$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'reorder_personal_prayers'
      AND position('require_session_email' in p.prosrc) = 0
  ) THEN
    ALTER FUNCTION public.reorder_personal_prayers(text, text[], text)
      RENAME TO reorder_personal_prayers_unchecked;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'reorder_personal_prayer_categories'
      AND position('require_session_email' in p.prosrc) = 0
  ) THEN
    ALTER FUNCTION public.reorder_personal_prayer_categories(text, text[])
      RENAME TO reorder_personal_prayer_categories_unchecked;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'swap_personal_prayer_categories'
      AND position('require_session_email' in p.prosrc) = 0
  ) THEN
    ALTER FUNCTION public.swap_personal_prayer_categories(text, text, text)
      RENAME TO swap_personal_prayer_categories_unchecked;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'upsert_user_badge_read_state'
      AND position('require_session_email' in p.prosrc) = 0
  ) THEN
    ALTER FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb)
      RENAME TO upsert_user_badge_read_state_unchecked;
  END IF;
END
$rename$;

CREATE OR REPLACE FUNCTION public.reorder_personal_prayers(
  p_user_email text,
  p_ordered_prayer_ids text[],
  p_category text DEFAULT NULL
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_session_email(p_user_email);
  RETURN QUERY
  SELECT *
  FROM public.reorder_personal_prayers_unchecked(
    p_user_email,
    p_ordered_prayer_ids,
    p_category
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_personal_prayer_categories(
  p_user_email text,
  p_ordered_categories text[]
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_session_email(p_user_email);
  RETURN QUERY
  SELECT *
  FROM public.reorder_personal_prayer_categories_unchecked(
    p_user_email,
    p_ordered_categories
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.swap_personal_prayer_categories(
  p_user_email text,
  p_category_a text,
  p_category_b text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_session_email(p_user_email);
  RETURN QUERY
  SELECT *
  FROM public.swap_personal_prayer_categories_unchecked(
    p_user_email,
    p_category_a,
    p_category_b
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_user_badge_read_state(
  p_user_email text,
  p_prayers_data jsonb,
  p_prompts_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_session_email(p_user_email);
  PERFORM public.upsert_user_badge_read_state_unchecked(
    p_user_email,
    p_prayers_data,
    p_prompts_data
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_personal_prayers_unchecked(text, text[], text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reorder_personal_prayer_categories_unchecked(text, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.swap_personal_prayer_categories_unchecked(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_user_badge_read_state_unchecked(text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.reorder_personal_prayers(text, text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reorder_personal_prayer_categories(text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.swap_personal_prayer_categories(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.reorder_personal_prayers(text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_personal_prayer_categories(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.swap_personal_prayer_categories(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_badge_read_state(text, jsonb, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- email_queue: only a signed-in admin may insert. The processor uses the
-- service role. Logged-out account approval uses the function below.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can enqueue emails" ON public.email_queue;

DROP POLICY IF EXISTS email_queue_admin_insert ON public.email_queue;
CREATE POLICY email_queue_admin_insert
  ON public.email_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin((auth.jwt() ->> 'email')));

REVOKE ALL ON TABLE public.email_queue FROM PUBLIC, anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.email_queue FROM authenticated;

-- Queues the account-approval template for each admin. Returns a count, not
-- addresses. A pending request must already exist, and a second call within
-- an hour does not add another batch.
CREATE OR REPLACE FUNCTION public.enqueue_account_approval_admin_emails(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_affiliation_reason text,
  p_admin_link text,
  p_requested_date text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_count integer := 0;
BEGIN
  v_email := nullif(trim(lower(coalesce(p_email, ''))), '');

  IF v_email IS NULL
     OR p_admin_link IS NULL
     OR p_admin_link !~ '^https?://[^[:space:]]+/admin$' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.account_approval_requests r
    WHERE lower(r.email) = v_email
      AND r.approval_status = 'pending'
  ) THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.email_queue q
    WHERE q.template_key = 'account_approval_request'
      AND lower(q.template_variables ->> 'email') = v_email
      AND q.created_at > now() - interval '1 hour'
      AND q.status IN ('pending', 'processing')
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.email_queue (
    recipient,
    template_key,
    template_variables,
    status,
    attempts
  )
  SELECT
    es.email,
    'account_approval_request',
    jsonb_build_object(
      'firstName', coalesce(p_first_name, ''),
      'lastName', coalesce(p_last_name, ''),
      'email', v_email,
      'affiliationReason', coalesce(p_affiliation_reason, ''),
      'requestedDate', coalesce(p_requested_date, ''),
      'adminLink', p_admin_link
    ),
    'pending',
    0
  FROM public.email_subscribers es
  WHERE es.is_admin IS TRUE
    AND coalesce(es.is_blocked, false) IS NOT TRUE
    AND coalesce(es.receive_admin_emails, false) IS TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_account_approval_admin_emails(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_account_approval_admin_emails(text, text, text, text, text, text) TO anon, authenticated;

-- Admin addresses stay available to a signed-in subscriber or admin.
-- Anonymous callers and a verified email with no subscriber row get nothing.
CREATE OR REPLACE FUNCTION public.admin_notification_recipients()
RETURNS TABLE (
  email text,
  receive_admin_emails boolean,
  receive_admin_push boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    es.email,
    coalesce(es.receive_admin_emails, false),
    coalesce(es.receive_admin_push, false)
  FROM public.email_subscribers es
  WHERE es.is_admin IS TRUE
    AND coalesce(es.is_blocked, false) IS NOT TRUE
    AND (
      public.is_admin((auth.jwt() ->> 'email'))
      OR EXISTS (
        SELECT 1
        FROM public.email_subscribers me
        WHERE lower(me.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND coalesce(me.is_blocked, false) IS NOT TRUE
      )
    );
$$;

REVOKE ALL ON FUNCTION public.admin_notification_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_notification_recipients() TO authenticated;

-- ---------------------------------------------------------------------------
-- email_templates: signed-in reads stay (member and admin mail). Anon does not.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all to read templates" ON public.email_templates;
DROP POLICY IF EXISTS "Allow public reads" ON public.email_templates;

DROP POLICY IF EXISTS email_templates_select_authenticated ON public.email_templates;
CREATE POLICY email_templates_select_authenticated
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON TABLE public.email_templates FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- analytics: page views are recorded for a signed-in user. Reads are admin.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.analytics;
DROP POLICY IF EXISTS "Allow public reads" ON public.analytics;

DROP POLICY IF EXISTS analytics_insert_authenticated ON public.analytics;
CREATE POLICY analytics_insert_authenticated
  ON public.analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (event_type = 'page_view');

DROP POLICY IF EXISTS analytics_select_admin ON public.analytics;
CREATE POLICY analytics_select_admin
  ON public.analytics
  FOR SELECT
  TO authenticated
  USING (public.is_admin((auth.jwt() ->> 'email')));

REVOKE ALL ON TABLE public.analytics FROM PUBLIC, anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.analytics FROM authenticated;
