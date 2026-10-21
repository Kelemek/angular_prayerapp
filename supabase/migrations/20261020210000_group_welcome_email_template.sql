-- Group invite welcome email; remove unused sparse group template keys.

DELETE FROM public.email_queue
WHERE template_key IN ('group_invitation', 'group_prayer_added', 'group_prayer_update');

DELETE FROM public.email_templates
WHERE template_key IN ('group_invitation', 'group_prayer_added', 'group_prayer_update');

INSERT INTO public.email_templates (template_key, name, subject, html_body, text_body, description)
VALUES (
  'group_welcome',
  'Welcome to the Group - New Member',
  'Welcome to {{groupName}}!',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F8F7F5;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F8F7F5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;">
          <tr>
            <td bgcolor="#39704D" style="background-color:#39704D;padding:30px 20px;border-radius:8px 8px 0 0;">
              <h1 style="color:#F8F7F5;margin:0;font-size:26px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;text-align:center;">
                Welcome to {{groupName}}!
              </h1>
            </td>
          </tr>
          <tr>
            <td bgcolor="#E8E5E1" style="background-color:#E8E5E1;padding:20px;border:1px solid #D1CCC4;border-top:none;border-radius:0 0 8px 8px;">
              <p style="font-size:16px;margin-bottom:20px;">Hello,</p>
              <p style="margin-bottom:20px;color:#3E5266;font-size:15px;line-height:1.6;">
                <strong>{{inviterName}}</strong> invited you to join a private prayer group.
                Prayers here are visible only to people invited to <strong>{{groupName}}</strong>, not the church-wide prayer list.
              </p>
              <div style="background-color:#D1CCC4;border-left:4px solid #39704D;padding:20px;border-radius:6px;margin:25px 0;">
                <h3 style="margin-top:0;color:#004B3D;">What You Can Do:</h3>
                <ul style="margin:10px 0;padding-left:20px;color:#3E5266;">
                  <li style="margin:8px 0;"><strong>Open the Group tab</strong> – See prayers shared with your group.</li>
                  <li style="margin:8px 0;"><strong>Add a group prayer</strong> – Use Request → Group Prayer when you have something to share.</li>
                  <li style="margin:8px 0;"><strong>Share updates</strong> – Keep the group informed and mark prayers answered when God moves.</li>
                  <li style="margin:8px 0;"><strong>Use Pray</strong> – Focus on one request at a time.</li>
                  <li style="margin:8px 0;"><strong>Stay notified</strong> – Get email or push when others add prayers or updates (you can adjust this in Settings).</li>
                  <li style="margin:8px 0;"><strong>Keep a personal list</strong> – Your own prayers stay separate from the group.</li>
                </ul>
              </div>
              <h3 style="margin-top:25px;margin-bottom:10px;color:#3E5266;">Have Feedback or Questions?</h3>
              <p style="margin-bottom:15px;color:#3E5266;">
                Use <strong>Send Feedback</strong> in the Settings menu once you are signed in.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:30px auto 0;">
                <tr>
                  <td bgcolor="#39704D" style="background-color:#39704D;border-radius:6px;">
                    <a href="{{appLink}}" style="display:inline-block;padding:12px 24px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Open the Group</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;color:#6b7280;font-size:14px;">
              <p style="margin:10px 0;"><strong>Blessings,</strong><br />Your Prayer Community Team</p>
              <p style="margin:10px 0;font-size:12px;">
                You are receiving this because you were invited to a prayer group. This is a one-time welcome message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  E'Welcome to {{groupName}}!

Hello,

{{inviterName}} invited you to join a private prayer group. Prayers in this group are visible only to invited members, not the church-wide prayer list.

What you can do:
- Open the Group tab to see shared prayers
- Add a group prayer from Request
- Share updates and mark prayers answered
- Use Pray for focused prayer time
- Adjust email and push notifications in Settings
- Keep your own personal prayer list

Sign in with this email address to join:
{{appLink}}

Blessings,
Your Prayer Community Team',
  'Sent when a group owner invites someone. Variables: {{groupName}}, {{inviterName}}, {{appLink}} (deep link with filter=groups and groupId).'
)
ON CONFLICT (template_key) DO NOTHING;
