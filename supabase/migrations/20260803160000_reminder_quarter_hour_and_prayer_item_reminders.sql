-- Quarter-hour slots for Settings prayer/memorization reminders + per-prayer item reminders.
-- One migration: local_minute on hour tables, due-now RPC updates, */15 crons, item reminder
-- table/RPC/cron/template (includes latest-update block), purge-on-inactive triggers.
-- Idempotent: safe to re-run in the SQL editor (IF NOT EXISTS / DROP IF EXISTS /
-- CREATE OR REPLACE / ON CONFLICT DO UPDATE / unschedule-then-schedule crons).

-- ---------------------------------------------------------------------------
-- 1) Settings hour tables: add local_minute (existing rows → :00)
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_prayer_hour_reminders
  ADD COLUMN IF NOT EXISTS local_minute smallint NOT NULL DEFAULT 0;

ALTER TABLE public.user_prayer_hour_reminders
  DROP CONSTRAINT IF EXISTS user_prayer_hour_reminders_local_minute_check;

ALTER TABLE public.user_prayer_hour_reminders
  ADD CONSTRAINT user_prayer_hour_reminders_local_minute_check CHECK (
    local_minute = ANY (ARRAY[0, 15, 30, 45]::smallint[])
  );

ALTER TABLE public.user_prayer_hour_reminders
  DROP CONSTRAINT IF EXISTS user_prayer_hour_reminders_unique_slot;

ALTER TABLE public.user_prayer_hour_reminders
  ADD CONSTRAINT user_prayer_hour_reminders_unique_slot
    UNIQUE (user_email, iana_timezone, local_hour, local_minute);

COMMENT ON TABLE public.user_prayer_hour_reminders IS
  'User-chosen local clock times (IANA zone + hour + quarter-minute) for prayer self-reminders; matched in SQL for minimal egress.';

ALTER TABLE public.user_memorization_hour_reminders
  ADD COLUMN IF NOT EXISTS local_minute smallint NOT NULL DEFAULT 0;

ALTER TABLE public.user_memorization_hour_reminders
  DROP CONSTRAINT IF EXISTS user_memorization_hour_reminders_local_minute_check;

ALTER TABLE public.user_memorization_hour_reminders
  ADD CONSTRAINT user_memorization_hour_reminders_local_minute_check CHECK (
    local_minute = ANY (ARRAY[0, 15, 30, 45]::smallint[])
  );

ALTER TABLE public.user_memorization_hour_reminders
  DROP CONSTRAINT IF EXISTS user_memorization_hour_reminders_unique_slot;

ALTER TABLE public.user_memorization_hour_reminders
  ADD CONSTRAINT user_memorization_hour_reminders_unique_slot
    UNIQUE (user_email, iana_timezone, local_hour, local_minute);

COMMENT ON TABLE public.user_memorization_hour_reminders IS
  'User-chosen local clock times (IANA zone + hour + quarter-minute) for memorization self-reminders; matched in SQL for minimal egress.';

CREATE OR REPLACE FUNCTION public.get_user_prayer_hour_reminders_due_now()
RETURNS SETOF public.user_prayer_hour_reminders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.user_prayer_hour_reminders r
  WHERE EXTRACT(HOUR FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_hour
    AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_minute;
$$;

CREATE OR REPLACE FUNCTION public.get_user_memorization_hour_reminders_due_now()
RETURNS SETOF public.user_memorization_hour_reminders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.user_memorization_hour_reminders r
  WHERE EXTRACT(HOUR FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_hour
    AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_minute;
$$;

-- Reschedule Settings reminder crons from hourly to every 15 minutes (UTC)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT j.jobid INTO jid
  FROM cron.job j
  WHERE j.jobname = 'invoke-user-hourly-prayer-reminders';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'invoke-user-hourly-prayer-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'project_url' LIMIT 1)
      || '/functions/v1/send-user-hourly-prayer-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT j.jobid INTO jid
  FROM cron.job j
  WHERE j.jobname = 'invoke-user-hourly-memorization-reminders';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'invoke-user-hourly-memorization-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'project_url' LIMIT 1)
      || '/functions/v1/send-user-hourly-memorization-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- 2) Per-prayer item reminders
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_prayer_item_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  prayer_kind text NOT NULL,
  prayer_id text NOT NULL,
  title_snapshot text NOT NULL DEFAULT '',
  prayer_for_snapshot text NOT NULL DEFAULT '',
  mode text NOT NULL,
  iana_timezone text NOT NULL,
  local_hour smallint NOT NULL,
  local_minute smallint NOT NULL DEFAULT 0,
  local_date date NULL,
  local_weekday smallint NULL,
  last_sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_prayer_item_reminders_user_email_fkey
    FOREIGN KEY (user_email) REFERENCES public.email_subscribers (email) ON DELETE CASCADE,
  CONSTRAINT user_prayer_item_reminders_prayer_kind_check CHECK (
    prayer_kind = ANY (ARRAY['community'::text, 'personal'::text, 'pc_member'::text])
  ),
  CONSTRAINT user_prayer_item_reminders_mode_check CHECK (
    mode = ANY (ARRAY['once'::text, 'daily'::text, 'weekly'::text])
  ),
  CONSTRAINT user_prayer_item_reminders_local_hour_check CHECK (
    local_hour >= 0 AND local_hour <= 23
  ),
  CONSTRAINT user_prayer_item_reminders_local_minute_check CHECK (
    local_minute = ANY (ARRAY[0, 15, 30, 45]::smallint[])
  ),
  CONSTRAINT user_prayer_item_reminders_local_weekday_check CHECK (
    local_weekday IS NULL OR (local_weekday >= 0 AND local_weekday <= 6)
  ),
  CONSTRAINT user_prayer_item_reminders_mode_fields_check CHECK (
    (mode = 'once' AND local_date IS NOT NULL AND local_weekday IS NULL)
    OR (mode = 'daily' AND local_date IS NULL AND local_weekday IS NULL)
    OR (mode = 'weekly' AND local_date IS NULL AND local_weekday IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_prayer_item_reminders_user_email
  ON public.user_prayer_item_reminders (user_email);

CREATE INDEX IF NOT EXISTS idx_user_prayer_item_reminders_prayer
  ON public.user_prayer_item_reminders (user_email, prayer_kind, prayer_id);

COMMENT ON TABLE public.user_prayer_item_reminders IS
  'Per-prayer one-time/daily/weekly reminders at quarter-hour local times; snapshots keep PC-member titles deliverable.';

ALTER TABLE public.user_prayer_item_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_prayer_item_reminders_select_own" ON public.user_prayer_item_reminders;
CREATE POLICY "user_prayer_item_reminders_select_own"
  ON public.user_prayer_item_reminders FOR SELECT TO authenticated
  USING (lower(user_email) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "user_prayer_item_reminders_insert_own" ON public.user_prayer_item_reminders;
CREATE POLICY "user_prayer_item_reminders_insert_own"
  ON public.user_prayer_item_reminders FOR INSERT TO authenticated
  WITH CHECK (lower(user_email) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "user_prayer_item_reminders_update_own" ON public.user_prayer_item_reminders;
CREATE POLICY "user_prayer_item_reminders_update_own"
  ON public.user_prayer_item_reminders FOR UPDATE TO authenticated
  USING (lower(user_email) = lower((auth.jwt() ->> 'email')))
  WITH CHECK (lower(user_email) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "user_prayer_item_reminders_delete_own" ON public.user_prayer_item_reminders;
CREATE POLICY "user_prayer_item_reminders_delete_own"
  ON public.user_prayer_item_reminders FOR DELETE TO authenticated
  USING (lower(user_email) = lower((auth.jwt() ->> 'email')));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_prayer_item_reminders TO authenticated;
GRANT ALL ON TABLE public.user_prayer_item_reminders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_prayer_item_reminders TO anon;

DROP POLICY IF EXISTS "anon_user_prayer_item_reminders_mfa_access" ON public.user_prayer_item_reminders;
CREATE POLICY "anon_user_prayer_item_reminders_mfa_access"
  ON public.user_prayer_item_reminders
  AS PERMISSIVE
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "anon_user_prayer_item_reminders_mfa_access" ON public.user_prayer_item_reminders IS
  'MFA/localStorage clients use the anon API key (no user JWT). Scoped to role anon so authenticated users use JWT policies above.';

CREATE OR REPLACE FUNCTION public.get_user_prayer_item_reminders_due_now()
RETURNS SETOF public.user_prayer_item_reminders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.user_prayer_item_reminders r
  WHERE EXTRACT(HOUR FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_hour
    AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_minute
    AND (
      (
        r.mode = 'once'
        AND r.local_date = ((NOW() AT TIME ZONE r.iana_timezone)::date)
        AND r.last_sent_at IS NULL
      )
      OR (
        r.mode = 'daily'
        AND (
          r.last_sent_at IS NULL
          OR (r.last_sent_at AT TIME ZONE r.iana_timezone)::date
            < ((NOW() AT TIME ZONE r.iana_timezone)::date)
        )
      )
      OR (
        r.mode = 'weekly'
        AND EXTRACT(DOW FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_weekday
        AND (
          r.last_sent_at IS NULL
          OR (r.last_sent_at AT TIME ZONE r.iana_timezone)::date
            < ((NOW() AT TIME ZONE r.iana_timezone)::date)
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_user_prayer_item_reminders_due_now() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_prayer_item_reminders_due_now() TO service_role;

INSERT INTO public.email_templates (template_key, name, subject, html_body, text_body, description)
VALUES (
  'user_prayer_item_reminder',
  'Per-prayer reminder',
  'Prayer reminder: {{prayerFor}}',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;">
          <tr>
            <td bgcolor="#10b981" style="background-color:#10b981;background-image:linear-gradient(to right,#10b981,#059669);padding:20px;border-radius:8px 8px 0 0;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">🙏 Prayer reminder</h1>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="background-color:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">{{modeLabel}} · {{scheduledTime}}</p>
              <h2 style="color:#1f2937;margin-top:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Prayer for {{prayerFor}}</h2>
              <p style="margin:0 0 8px 0;"><strong>Description:</strong></p>
              <div bgcolor="#ecfdf5" style="background-color:#ecfdf5;padding:16px 16px 16px 22px;border-radius:6px;border-left:4px solid #10b981;margin-bottom:20px;">{{prayerDescriptionHtml}}{{updateBlockHtml}}</div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:30px auto 0;">
                <tr>
                  <td bgcolor="#10b981" style="background-color:#10b981;border-radius:6px;">
                    <a href="{{appLink}}" style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Open prayer</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Manage reminders from the bell icon on a prayer card.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  E'Prayer reminder\n\n{{modeLabel}} · {{scheduledTime}}\n\nPrayer for {{prayerFor}}\n{{prayerDescriptionText}}{{updateTextSection}}\nOpen the app:\n{{appLink}}\n\nManage reminders from the bell icon on a prayer card.\n',
  'Per-prayer reminder (once/daily/weekly). Variables: {{appLink}}, {{prayerFor}}, {{prayerTitle}}, {{prayerDescriptionText}}, {{prayerDescriptionHtml}}, {{modeLabel}}, {{scheduledTime}}, {{prayerId}}, {{prayerKind}}, {{updateContentText}}, {{updateContentHtml}}, {{updateBlockHtml}} (Update card; empty when none), {{spotlightUpdateBlockHtml}} (alias), {{updateTextSection}}.'
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  description = EXCLUDED.description,
  updated_at = now();

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT j.jobid INTO jid
  FROM cron.job j
  WHERE j.jobname = 'invoke-user-prayer-item-reminders';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'invoke-user-prayer-item-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'project_url' LIMIT 1)
      || '/functions/v1/send-user-prayer-item-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- Stop per-prayer item reminders when the underlying prayer is deleted or
-- no longer active. Community: delete/archive/answered. Personal: delete or
-- category Answered.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_user_prayer_item_reminders(
  p_prayer_kind text,
  p_prayer_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_prayer_item_reminders
  WHERE prayer_kind = p_prayer_kind
    AND prayer_id = p_prayer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_user_prayer_item_reminders(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_user_prayer_item_reminders(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_user_prayer_item_reminders(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_prayer_item_reminders(text, text) TO anon;

COMMENT ON FUNCTION public.purge_user_prayer_item_reminders(text, text) IS
  'Removes all per-prayer reminders for a prayer id/kind (called from triggers and Edge).';

CREATE OR REPLACE FUNCTION public.trg_purge_item_reminders_on_prayer_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.purge_user_prayer_item_reminders('community', OLD.id::text);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_item_reminders_on_prayer_delete ON public.prayers;
CREATE TRIGGER trg_purge_item_reminders_on_prayer_delete
  AFTER DELETE ON public.prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purge_item_reminders_on_prayer_delete();

CREATE OR REPLACE FUNCTION public.trg_purge_item_reminders_on_prayer_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NEW.status IN ('archived', 'answered')
  THEN
    PERFORM public.purge_user_prayer_item_reminders('community', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_item_reminders_on_prayer_status ON public.prayers;
CREATE TRIGGER trg_purge_item_reminders_on_prayer_status
  AFTER UPDATE OF status ON public.prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purge_item_reminders_on_prayer_status();

CREATE OR REPLACE FUNCTION public.trg_purge_item_reminders_on_personal_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.purge_user_prayer_item_reminders('personal', OLD.id::text);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_item_reminders_on_personal_delete ON public.personal_prayers;
CREATE TRIGGER trg_purge_item_reminders_on_personal_delete
  AFTER DELETE ON public.personal_prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purge_item_reminders_on_personal_delete();

CREATE OR REPLACE FUNCTION public.trg_purge_item_reminders_on_personal_answered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category IS DISTINCT FROM OLD.category
    AND NEW.category = 'Answered'
  THEN
    PERFORM public.purge_user_prayer_item_reminders('personal', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_item_reminders_on_personal_answered ON public.personal_prayers;
CREATE TRIGGER trg_purge_item_reminders_on_personal_answered
  AFTER UPDATE OF category ON public.personal_prayers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purge_item_reminders_on_personal_answered();
