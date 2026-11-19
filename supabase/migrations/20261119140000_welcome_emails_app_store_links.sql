-- Add Get the app (Web Site, iOS, and Android) links to subscriber and group welcome emails.
-- URLs must match src/lib/app-store-links.ts (enforced by welcome-emails-app-store-links.migration.spec.ts).
-- Subscriber plain text appends after "Visit the app to get started: {{appLink}}/info"
-- (and the production line without the extra slash) so a bare {{appLink}} replace
-- cannot split the /info path. Web Site uses {{appLink}}: subscriber_welcome's
-- value is the public site root (same target as the /info page Web Site button);
-- group_welcome's value is that template's group link. Do not append "info" onto
-- group {{appLink}} — it already contains a query string.

UPDATE public.email_templates
SET
  html_body = replace(
    html_body,
    '<a href="{{appLink}}info" style="display:inline-block;padding:12px 24px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Enter the Prayer Site</a>
                  </td>
                </tr>
              </table>',
    '<a href="{{appLink}}info" style="display:inline-block;padding:12px 24px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Enter the Prayer Site</a>
                  </td>
                </tr>
              </table>
              <h3 style="margin-top:28px;margin-bottom:12px;color:#3E5266;font-size:18px;">Get the app</h3>
              <p style="margin:0 0 16px;color:#3E5266;font-size:15px;line-height:1.6;">
                Install Cross Pointe Prayer on your phone for notifications and prayer on the go.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td colspan="2" align="center" style="padding:6px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#3E5266" style="background-color:#3E5266;border-radius:6px;">
                          <a href="{{appLink}}" style="display:inline-block;padding:10px 18px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Web Site</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#1a1a1a" style="background-color:#1a1a1a;border-radius:6px;">
                          <a href="https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929" style="display:inline-block;padding:10px 18px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">App Store (iOS)</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding:6px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#39704D" style="background-color:#39704D;border-radius:6px;">
                          <a href="https://play.google.com/store/apps/details?id=com.prayerapp.mobile" style="display:inline-block;padding:10px 18px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Google Play (Android)</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>'
  ),
  text_body = CASE
    WHEN text_body IS NULL OR text_body = '' THEN NULL
    WHEN text_body LIKE '%id6759469929%' THEN text_body
    ELSE replace(
      replace(
        text_body,
        E'Visit the app to get started: {{appLink}}/info',
        E'Visit the app to get started: {{appLink}}/info

Get the app:
Web Site: {{appLink}}
iOS (App Store): https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929
Android (Google Play): https://play.google.com/store/apps/details?id=com.prayerapp.mobile'
      ),
      E'Visit the app to get started: {{appLink}}info',
      E'Visit the app to get started: {{appLink}}info

Get the app:
Web Site: {{appLink}}
iOS (App Store): https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929
Android (Google Play): https://play.google.com/store/apps/details?id=com.prayerapp.mobile'
    )
  END,
  updated_at = now()
WHERE template_key = 'subscriber_welcome'
  AND html_body LIKE '%Enter the Prayer Site%'
  AND html_body NOT LIKE '%Get the app%'
  AND html_body NOT LIKE '%id6759469929%';

UPDATE public.email_templates
SET
  html_body = replace(
    html_body,
    '<a href="{{appLink}}" style="display:inline-block;padding:12px 24px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Open the Group</a>
                  </td>
                </tr>
              </table>',
    '<a href="{{appLink}}" style="display:inline-block;padding:12px 24px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Open the Group</a>
                  </td>
                </tr>
              </table>
              <h3 style="margin-top:28px;margin-bottom:12px;color:#3E5266;font-size:18px;">Get the app</h3>
              <p style="margin:0 0 16px;color:#3E5266;font-size:15px;line-height:1.6;">
                Install Cross Pointe Prayer on your phone for notifications and prayer on the go.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td colspan="2" align="center" style="padding:6px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#3E5266" style="background-color:#3E5266;border-radius:6px;">
                          <a href="{{appLink}}" style="display:inline-block;padding:10px 18px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Web Site</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#1a1a1a" style="background-color:#1a1a1a;border-radius:6px;">
                          <a href="https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929" style="display:inline-block;padding:10px 18px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">App Store (iOS)</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding:6px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#39704D" style="background-color:#39704D;border-radius:6px;">
                          <a href="https://play.google.com/store/apps/details?id=com.prayerapp.mobile" style="display:inline-block;padding:10px 18px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Arial, sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Google Play (Android)</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>'
  ),
  text_body = replace(
    text_body,
    E'{{appLink}}',
    E'{{appLink}}

Get the app:
Web Site: {{appLink}}
iOS (App Store): https://apps.apple.com/us/app/cross-pointe-prayer/id6759469929
Android (Google Play): https://play.google.com/store/apps/details?id=com.prayerapp.mobile'
  ),
  updated_at = now()
WHERE template_key = 'group_welcome'
  AND html_body LIKE '%Open the Group%'
  AND html_body NOT LIKE '%Get the app%'
  AND html_body NOT LIKE '%id6759469929%'
  AND COALESCE(text_body, '') NOT LIKE '%id6759469929%';