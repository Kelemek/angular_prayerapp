-- Add unsubscribe links to mass email templates for better compliance and UX

-- Update approved_prayer template with unsubscribe link
UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Prayer Request</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
    </div>
    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <h2 style="color: #1f2937; margin-top: 0;">{{prayerTitle}}</h2>
      <div style="margin-bottom: 15px;">
        <p style="margin: 5px 0;"><strong>For:</strong> {{prayerFor}}</p>
        <p style="margin: 5px 0;"><strong>Requested by:</strong> {{requesterName}}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> {{status}}</p>
      </div>
      <p><strong>Description:</strong></p>
      <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">{{prayerDescription}}</p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="{{appLink}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
      </div>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
      <p>This prayer has been approved and is now active. Join us in prayer!</p>
      <p style="margin-top: 15px; font-size: 12px;">
        To unsubscribe from emails, <a href="{{appLink}}" style="color: #6b7280; text-decoration: underline;">visit the app and open the Settings menu (⚙️ gear icon)</a>
      </p>
    </div>
  </body>
</html>',
    text_body = 'New Prayer Request: {{prayerTitle}}

For: {{prayerFor}}
Requested by: {{requesterName}}

{{prayerDescription}}

This prayer has been approved and is now active. Join us in prayer!

---
To unsubscribe from emails, visit the app and open the Settings menu (⚙️ gear icon)'
WHERE template_key = 'approved_prayer';

-- Update approved_update template with unsubscribe link
UPDATE email_templates
SET html_body = '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prayer Update</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">💬 Prayer Update</h1>
    </div>
    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <h2 style="color: #1f2937; margin-top: 0;">Update for: {{prayerTitle}}</h2>
      <p style="margin: 5px 0 15px 0;"><strong>Posted by:</strong> {{authorName}}</p>
      <p><strong>Update:</strong></p>
      <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">{{updateContent}}</p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="{{appLink}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
      </div>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
      <p>Let''s continue to lift this prayer up together.</p>
      <p style="margin-top: 15px; font-size: 12px;">
        To unsubscribe from emails, <a href="{{appLink}}" style="color: #6b7280; text-decoration: underline;">visit the app and open the Settings menu (⚙️ gear icon)</a>
      </p>
    </div>
  </body>
</html>',
    text_body = 'Prayer Update: {{prayerTitle}}

Posted by: {{authorName}}

{{updateContent}}

Let''s continue to lift this prayer up together.

---
To unsubscribe from emails, visit the app and open the Settings menu (⚙️ gear icon)'
WHERE template_key = 'approved_update';
