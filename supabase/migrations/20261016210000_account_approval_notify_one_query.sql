-- Account-approval mail and push share one admin query.
-- Only the notify-account-approval edge function (service role) may call this.
-- The browser receives a queue count from that function, never these addresses.
-- admin_notified_at is the one-hour lock. It stays after the queue processor
-- deletes a sent row, and it is set even when no admin receives email.

ALTER TABLE public.account_approval_requests
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamp with time zone;

DROP FUNCTION IF EXISTS public.enqueue_account_approval_admin_emails(text, text, text, text, text, text);

CREATE FUNCTION public.enqueue_account_approval_admin_emails(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_affiliation_reason text,
  p_admin_link text,
  p_requested_date text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_first text;
  v_last text;
  v_request_email text;
  v_result jsonb;
BEGIN
  v_email := nullif(trim(lower(coalesce(p_email, ''))), '');

  IF v_email IS NULL
     OR p_admin_link IS NULL
     OR p_admin_link NOT IN (
       'https://cpprayer.cp-church.org/admin',
       'http://localhost:4200/admin'
     ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.account_approval_requests AS r
  SET admin_notified_at = now()
  WHERE r.id = (
    SELECT pending.id
    FROM public.account_approval_requests AS pending
    WHERE lower(pending.email) = v_email
      AND pending.approval_status = 'pending'
    ORDER BY pending.created_at DESC
    LIMIT 1
  )
  AND (
    r.admin_notified_at IS NULL
    OR r.admin_notified_at <= now() - interval '1 hour'
  )
  RETURNING r.first_name, r.last_name, r.email
  INTO v_first, v_last, v_request_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'queued', 0,
      'pushEmails', '[]'::jsonb,
      'pushBody', ''
    );
  END IF;

  WITH admins AS (
    SELECT
      es.email,
      coalesce(es.receive_admin_emails, false) AS send_email,
      coalesce(es.receive_admin_push, false) AS send_push
    FROM public.email_subscribers es
    WHERE es.is_admin IS TRUE
      AND coalesce(es.is_blocked, false) IS NOT TRUE
  ),
  inserted AS (
    INSERT INTO public.email_queue (
      recipient,
      template_key,
      template_variables,
      status,
      attempts
    )
    SELECT
      admins.email,
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
    FROM admins
    WHERE admins.send_email
    RETURNING 1
  )
  SELECT jsonb_build_object(
    'queued', (SELECT count(*)::int FROM inserted),
    'pushEmails', COALESCE(
      (SELECT jsonb_agg(admins.email) FROM admins WHERE admins.send_push),
      '[]'::jsonb
    ),
    'pushBody', coalesce(v_first, '') || ' ' || coalesce(v_last, '') || ' (' || v_request_email || ')'
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_account_approval_admin_emails(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_account_approval_admin_emails(text, text, text, text, text, text) TO service_role;
