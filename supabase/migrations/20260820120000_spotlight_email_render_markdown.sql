-- Prayer spotlight hourly email: render TipTap markdown as HTML (paragraphs, not literal `\` hard breaks).
-- Deploy send-user-hourly-prayer-reminders before applying (fills {{spotlightPrayerDescriptionHtml}}).
-- {{spotlightPrayerDescription}} stays plain text for text_body and legacy html placeholders.

UPDATE public.email_templates
SET html_body = replace(
      replace(
        html_body,
        '<p style="margin:0;white-space:pre-wrap;">{{spotlightPrayerDescription}}</p>',
        '<div style="margin:0;">{{spotlightPrayerDescriptionHtml}}</div>'
      ),
      '<p style="margin: 0; white-space: pre-wrap;">{{spotlightPrayerDescription}}</p>',
      '<div style="margin:0;">{{spotlightPrayerDescriptionHtml}}</div>'
    ),
    description = replace(
      description,
      '{{spotlightPrayerDescription}}, {{updateContent}}',
      '{{spotlightPrayerDescription}} (plain text), {{spotlightPrayerDescriptionHtml}} (rendered markdown HTML), {{updateContent}}'
    ),
    updated_at = now()
WHERE template_key = 'user_hourly_prayer_reminder_with_spotlight';
