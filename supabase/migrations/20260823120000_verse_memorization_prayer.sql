-- Verse memorization of the week: community prayers with verse metadata + dedicated email template.

ALTER TABLE public.prayers
  ADD COLUMN IF NOT EXISTS content_kind text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS verse_reference text,
  ADD COLUMN IF NOT EXISTS verse_translation text,
  ADD COLUMN IF NOT EXISTS admin_message text;

ALTER TABLE public.prayers
  DROP CONSTRAINT IF EXISTS prayers_content_kind_check;

ALTER TABLE public.prayers
  ADD CONSTRAINT prayers_content_kind_check CHECK (
    content_kind = ANY (ARRAY['standard'::text, 'verse_memorization'::text])
  );

COMMENT ON COLUMN public.prayers.content_kind IS 'standard community prayer vs admin-sent verse memorization prayer';
COMMENT ON COLUMN public.prayers.verse_reference IS 'Bible reference when content_kind = verse_memorization';
COMMENT ON COLUMN public.prayers.verse_translation IS 'Translation code (esv, niv, etc.) when content_kind = verse_memorization';
COMMENT ON COLUMN public.prayers.admin_message IS 'Optional admin message shown above the verse';

INSERT INTO public.email_templates (template_key, name, subject, html_body, text_body, description)
VALUES (
  'verse_memorization_prayer',
  'Verse memorization prayer broadcast',
  'Memorize this week: {{verseReference}}',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;">
          <tr>
            <td bgcolor="#39704D" style="background-color:#39704D;background-image:linear-gradient(to right,#39704D,#2d5a3d);padding:20px;border-radius:8px 8px 0 0;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">📖 Verse to Memorize</h1>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="background-color:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p style="color:#4b5563;margin:0 0 16px;font-size:15px;line-height:1.6;">This week we invite you to memorize a passage of Scripture together. Use the Memorize button below to add this verse to your list and start practicing.</p>
              {{adminMessageBlock}}
              <h2 style="color:#1f2937;margin:16px 0 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">{{verseReference}}</h2>
              <div style="background-color:#ffffff;padding:15px;border-radius:6px;border-left:4px solid #39704D;font-style:italic;color:#374151;line-height:1.7;">{{verseTextHtml}}</div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:30px auto 0;">
                <tr>
                  <td bgcolor="#39704D" style="background-color:#39704D;border-radius:6px;">
                    <a href="{{memorizeAppLink}}" style="display:inline-block;padding:12px 24px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Memorize</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;text-align:center;font-size:14px;color:#6b7280;">
                <a href="{{viewPrayerAppLink}}" style="color:#39704D;text-decoration:underline;">View in the prayer app</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;color:#6b7280;font-size:14px;">
              <p style="margin:0;font-size:12px;">
                To unsubscribe from emails, <a href="{{viewPrayerAppLink}}" style="color:#6b7280;text-decoration:underline;">visit the app and open the Settings menu (⚙️ gear icon)</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  E'Verse to memorize this week: {{verseReference}}

{{verseTextText}}

Open the app to memorize: {{memorizeAppLink}}',
  'Admin Content → Verse Memorization of the Week. Variables: verseReference, verseTextHtml, verseTextText, adminMessageBlock (HTML), memorizeAppLink, viewPrayerAppLink.'
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  description = EXCLUDED.description,
  updated_at = now();
