-- Hourly user prayer reminders: optional "spotlight" email (random recent prayer).
-- Admins pick template via admin_settings; Edge fills {{spotlight*}}, {{updateContent}}, {{spotlightUpdateBlockHtml}}, etc.
-- Template layout matches Prayer Update emails: gray shell, green original-request container; Update block is {{spotlightUpdateBlockHtml}} only when an update exists.

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS user_hourly_prayer_reminder_template_key text
    NOT NULL DEFAULT 'user_hourly_prayer_reminder';

ALTER TABLE public.admin_settings
  DROP CONSTRAINT IF EXISTS admin_settings_user_hourly_reminder_template_key_check;

ALTER TABLE public.admin_settings
  ADD CONSTRAINT admin_settings_user_hourly_reminder_template_key_check CHECK (
    user_hourly_prayer_reminder_template_key = ANY (
      ARRAY[
        'user_hourly_prayer_reminder'::text,
        'user_hourly_prayer_reminder_with_spotlight'::text
      ]
    )
  );

COMMENT ON COLUMN public.admin_settings.user_hourly_prayer_reminder_template_key IS
  'Which email_templates.template_key send-user-hourly-prayer-reminders uses (simple nudge vs spotlight random prayer).';

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS hourly_reminder_last_spotlight_key text;

COMMENT ON COLUMN public.email_subscribers.hourly_reminder_last_spotlight_key IS
  'Last hourly reminder spotlight pick (c:uuid or p:uuid) so the next email can prefer a different prayer when the pool has more than one.';

INSERT INTO public.email_templates (template_key, name, subject, html_body, text_body, description)
VALUES (
  'user_hourly_prayer_reminder_with_spotlight',
  'User hourly prayer reminder (random recent prayer)',
  'Time to pray',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🙏 Prayer spotlight</h1>
  </div>
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">{{spotlightPrayerTitle}}</h2>
    <p style="margin: 5px 0 15px 0;"><strong>{{spotlightPrayerKind}}</strong></p>
    <p style="margin: 0 0 10px 0;"><strong>Original prayer request</strong></p>
    <div style="background: #ecfdf5; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981; margin-bottom: 20px;">
      <p style="margin: 0; white-space: pre-wrap;">{{spotlightPrayerDescription}}</p>
      {{spotlightUpdateBlockHtml}}
    </div>

    <div style="margin-top: 30px; text-align: center;">
      <a href="{{appLink}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Open prayer app</a>
    </div>
  </div>
  <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>Take a moment to pray. Spotlight items are current community or personal prayers from the last two weeks.</p>
    <p style="margin-top: 15px; font-size: 12px;">
      To change hourly reminders, <a href="{{appLink}}" style="color: #6b7280; text-decoration: underline;">open the app</a> and go to <strong>Settings</strong> → <strong>Prayer reminders</strong> (gear icon).
    </p>
  </div>
</body>
</html>$html$,
  E'Time to pray — prayer spotlight\n\n{{spotlightPrayerTitle}}\n{{spotlightPrayerKind}}\n\nOriginal prayer request:\n{{spotlightPrayerDescription}}{{spotlightUpdateTextSection}}\n\nOpen the app:\n{{appLink}}\n\nSettings → Prayer reminders to turn off hourly reminders.\n',
  'Hourly spotlight email: random current community or personal prayer (activity in the last 14 days). Variables: {{appLink}}, {{spotlightPrayerKind}}, {{spotlightPrayerTitle}}, {{spotlightPrayerFor}}, {{spotlightPrayerDescription}}, {{updateContent}}, {{spotlightUpdateBlockHtml}} (Update subsection HTML; empty when no update), {{spotlightLatestUpdateHtml}} (legacy alias), {{spotlightUpdateTextSection}}.'
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  description = EXCLUDED.description,
  updated_at = now();
