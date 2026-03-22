-- Per-user hourly prayer reminders (self nudges), anon access for MFA clients, and default email template.
-- Queried by Edge Function send-user-hourly-prayer-reminders (SQL-side hour match).

CREATE TABLE IF NOT EXISTS public.user_prayer_hour_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  iana_timezone text NOT NULL,
  local_hour smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_prayer_hour_reminders_local_hour_check CHECK (
    local_hour >= 0 AND local_hour <= 23
  ),
  CONSTRAINT user_prayer_hour_reminders_user_email_fkey
    FOREIGN KEY (user_email) REFERENCES public.email_subscribers (email) ON DELETE CASCADE,
  CONSTRAINT user_prayer_hour_reminders_unique_slot UNIQUE (user_email, iana_timezone, local_hour)
);

CREATE INDEX IF NOT EXISTS idx_user_prayer_hour_reminders_user_email
  ON public.user_prayer_hour_reminders (user_email);

COMMENT ON TABLE public.user_prayer_hour_reminders IS
  'User-chosen local clock hours (per IANA timezone) for hourly prayer self-reminders; matched in SQL for minimal egress.';

ALTER TABLE public.user_prayer_hour_reminders ENABLE ROW LEVEL SECURITY;

-- Authenticated users: own rows only (match JWT email case-insensitively)
-- DROP first so re-runs after a partial migration do not fail (42710 policy already exists).
DROP POLICY IF EXISTS "user_prayer_hour_reminders_select_own" ON public.user_prayer_hour_reminders;
CREATE POLICY "user_prayer_hour_reminders_select_own"
  ON public.user_prayer_hour_reminders FOR SELECT TO authenticated
  USING (lower(user_email) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "user_prayer_hour_reminders_insert_own" ON public.user_prayer_hour_reminders;
CREATE POLICY "user_prayer_hour_reminders_insert_own"
  ON public.user_prayer_hour_reminders FOR INSERT TO authenticated
  WITH CHECK (lower(user_email) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "user_prayer_hour_reminders_delete_own" ON public.user_prayer_hour_reminders;
CREATE POLICY "user_prayer_hour_reminders_delete_own"
  ON public.user_prayer_hour_reminders FOR DELETE TO authenticated
  USING (lower(user_email) = lower((auth.jwt() ->> 'email')));

GRANT SELECT, INSERT, DELETE ON TABLE public.user_prayer_hour_reminders TO authenticated;
GRANT ALL ON TABLE public.user_prayer_hour_reminders TO service_role;

-- MFA / localStorage auth: browser uses anon key without Supabase JWT, same as personal_prayers.
GRANT SELECT, INSERT, DELETE ON TABLE public.user_prayer_hour_reminders TO anon;

DROP POLICY IF EXISTS "Allow all user_prayer_hour_reminders access" ON public.user_prayer_hour_reminders;
CREATE POLICY "Allow all user_prayer_hour_reminders access"
  ON public.user_prayer_hour_reminders
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Returns only rows whose local wall hour in iana_timezone equals local_hour right now (server UTC "now").
CREATE OR REPLACE FUNCTION public.get_user_prayer_hour_reminders_due_now()
RETURNS SETOF public.user_prayer_hour_reminders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.user_prayer_hour_reminders r
  WHERE EXTRACT(HOUR FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_hour;
$$;

REVOKE ALL ON FUNCTION public.get_user_prayer_hour_reminders_due_now() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_prayer_hour_reminders_due_now() TO service_role;

-- Email template: {{appLink}} from Edge Function secret APP_URL (match environment.appUrl in prod).
INSERT INTO public.email_templates (template_key, name, subject, html_body, text_body, description)
VALUES (
  'user_hourly_prayer_reminder',
  'User hourly prayer reminder',
  'Time to pray',
  $html$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:20px 24px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">Time to pray</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 20px;">
              <p style="margin:0 0 20px;color:#1f2937;font-size:16px;line-height:1.5;">Take a moment to pray.</p>
              <div style="text-align:center;margin:8px 0 24px;">
                <a href="{{appLink}}" style="background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:15px;">Open prayer app</a>
              </div>
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">You can turn off these reminders anytime in <strong style="color:#4b5563;">Settings</strong> → <strong style="color:#4b5563;">Prayer reminders</strong> in the app.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  E'Time to pray\n\nTake a moment to pray.\n\nOpen the app:\n{{appLink}}\n\nTo stop these reminders: Settings → Prayer reminders in the app.\n',
  'Hourly self-nudge from user settings. Uses {{appLink}} (Edge APP_URL / environment.appUrl).'
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  description = EXCLUDED.description,
  updated_at = now();
