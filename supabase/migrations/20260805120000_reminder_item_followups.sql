-- Per-prayer reminder follow-ups after 20260803160000 (idempotent / safe to re-run).
-- 1) prompt kind + purge trigger + email template
-- 2) purge RPC lockdown (service_role only)
-- 3) unique schedule indexes
-- 4) per-channel delivery columns
-- 5) due-now RPC with partial push/email retry

-- ---------------------------------------------------------------------------
-- 1) Prompt per-item reminders
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_prayer_item_reminders
  DROP CONSTRAINT IF EXISTS user_prayer_item_reminders_prayer_kind_check;

ALTER TABLE public.user_prayer_item_reminders
  ADD CONSTRAINT user_prayer_item_reminders_prayer_kind_check CHECK (
    prayer_kind = ANY (
      ARRAY['community'::text, 'personal'::text, 'pc_member'::text, 'prompt'::text]
    )
  );

COMMENT ON TABLE public.user_prayer_item_reminders IS
  'Per-user reminders for community prayers, personal prayers, Planning Center member cards, and prayer prompts.';

CREATE OR REPLACE FUNCTION public.trg_purge_item_reminders_on_prompt_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.purge_user_prayer_item_reminders('prompt', OLD.id::text);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_item_reminders_on_prompt_delete ON public.prayer_prompts;
CREATE TRIGGER trg_purge_item_reminders_on_prompt_delete
  AFTER DELETE ON public.prayer_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purge_item_reminders_on_prompt_delete();

INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  description
) VALUES (
  'user_prayer_item_reminder',
  'Per-prayer item reminder',
  'Prayer reminder: {{prayerTitle}}',
  $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prayer reminder</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;">
          <tr>
            <td bgcolor="#10b981" style="background-color:#10b981;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">🙏 Prayer Reminder</h1>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="background-color:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">{{modeLabel}} · {{scheduledTime}}</p>
              <h2 style="color:#1f2937;margin-top:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">{{emailHeading}}</h2>
              <p style="margin:0 0 8px 0;"><strong>Description:</strong></p>
              <div bgcolor="#ecfdf5" style="background-color:#ecfdf5;padding:16px 16px 16px 22px;border-radius:6px;border-left:4px solid #10b981;margin-bottom:20px;">{{prayerDescriptionHtml}}{{updateBlockHtml}}</div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:30px auto 0;">
                <tr>
                  <td bgcolor="#10b981" style="background-color:#10b981;border-radius:6px;">
                    <a href="{{appLink}}" style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Open in app</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Manage reminders from the bell icon on a prayer or prompt card.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  E'Prayer reminder\n\n{{modeLabel}} · {{scheduledTime}}\n\n{{emailHeading}}\n{{prayerDescriptionText}}{{updateTextSection}}\nOpen the app:\n{{appLink}}\n\nManage reminders from the bell icon on a prayer or prompt card.\n',
  'Per-prayer/prompt reminder (once/daily/weekly). Variables: {{appLink}}, {{emailHeading}}, {{prayerFor}}, {{prayerTitle}}, {{prayerDescriptionText}}, {{prayerDescriptionHtml}}, {{modeLabel}}, {{scheduledTime}}, {{prayerId}}, {{prayerKind}}, {{updateContentText}}, {{updateContentHtml}}, {{updateBlockHtml}}, {{spotlightUpdateBlockHtml}}, {{updateTextSection}}.'
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- 2) Lock down purge_user_prayer_item_reminders (triggers/Edge only)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.purge_user_prayer_item_reminders(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_user_prayer_item_reminders(text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_user_prayer_item_reminders(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.purge_user_prayer_item_reminders(text, text) TO service_role;

COMMENT ON FUNCTION public.purge_user_prayer_item_reminders(text, text) IS
  'Removes all per-prayer reminders for a prayer id/kind. SECURITY DEFINER; callable only by service_role (Postgres triggers run as definer). Not exposed to authenticated/anon clients.';

-- ---------------------------------------------------------------------------
-- 3) Prevent duplicate per-prayer reminder schedules
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS user_prayer_item_reminders_unique_once
  ON public.user_prayer_item_reminders (
    user_email, prayer_kind, prayer_id, local_date, local_hour, local_minute
  )
  WHERE mode = 'once';

CREATE UNIQUE INDEX IF NOT EXISTS user_prayer_item_reminders_unique_daily
  ON public.user_prayer_item_reminders (
    user_email, prayer_kind, prayer_id, local_hour, local_minute
  )
  WHERE mode = 'daily';

CREATE UNIQUE INDEX IF NOT EXISTS user_prayer_item_reminders_unique_weekly
  ON public.user_prayer_item_reminders (
    user_email, prayer_kind, prayer_id, local_weekday, local_hour, local_minute
  )
  WHERE mode = 'weekly';

COMMENT ON INDEX public.user_prayer_item_reminders_unique_once IS
  'One once-mode row per prayer + local date/time slot.';
COMMENT ON INDEX public.user_prayer_item_reminders_unique_daily IS
  'One daily row per prayer + local time slot.';
COMMENT ON INDEX public.user_prayer_item_reminders_unique_weekly IS
  'One weekly row per prayer + weekday + local time slot.';

-- ---------------------------------------------------------------------------
-- 4) Per-channel delivery tracking
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_prayer_item_reminders
  ADD COLUMN IF NOT EXISTS last_push_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz NULL;

COMMENT ON COLUMN public.user_prayer_item_reminders.last_push_sent_at IS
  'Last successful push for this reminder row (partial multi-channel delivery).';
COMMENT ON COLUMN public.user_prayer_item_reminders.last_email_sent_at IS
  'Last successful email for this reminder row (partial multi-channel delivery).';

-- ---------------------------------------------------------------------------
-- 5) Due-now RPC (scheduled slot + partial channel retry same day)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_prayer_item_reminders_due_now()
RETURNS SETOF public.user_prayer_item_reminders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.user_prayer_item_reminders r
  WHERE (
      EXTRACT(HOUR FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_hour
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
      )
    )
    OR (
      r.mode = 'once'
      AND r.last_sent_at IS NULL
      AND r.local_date = ((NOW() AT TIME ZONE r.iana_timezone)::date)
      AND (
        (r.last_push_sent_at IS NOT NULL AND r.last_email_sent_at IS NULL)
        OR (r.last_push_sent_at IS NULL AND r.last_email_sent_at IS NOT NULL)
      )
    )
    OR (
      r.mode = 'daily'
      AND (
        (r.last_push_sent_at IS NOT NULL AND r.last_email_sent_at IS NULL)
        OR (r.last_push_sent_at IS NULL AND r.last_email_sent_at IS NOT NULL)
      )
      AND (
        (r.last_push_sent_at AT TIME ZONE r.iana_timezone)::date =
          ((NOW() AT TIME ZONE r.iana_timezone)::date)
        OR (r.last_email_sent_at AT TIME ZONE r.iana_timezone)::date =
          ((NOW() AT TIME ZONE r.iana_timezone)::date)
      )
    )
    OR (
      r.mode = 'weekly'
      AND EXTRACT(DOW FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_weekday
      AND (
        (r.last_push_sent_at IS NOT NULL AND r.last_email_sent_at IS NULL)
        OR (r.last_push_sent_at IS NULL AND r.last_email_sent_at IS NOT NULL)
      )
      AND (
        (r.last_push_sent_at AT TIME ZONE r.iana_timezone)::date =
          ((NOW() AT TIME ZONE r.iana_timezone)::date)
        OR (r.last_email_sent_at AT TIME ZONE r.iana_timezone)::date =
          ((NOW() AT TIME ZONE r.iana_timezone)::date)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_user_prayer_item_reminders_due_now() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_prayer_item_reminders_due_now() TO service_role;
