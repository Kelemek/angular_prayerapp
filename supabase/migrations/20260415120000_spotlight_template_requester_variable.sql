-- Hourly spotlight template `email_templates.description`: documents variables filled by
-- `send-user-hourly-prayer-reminders` — {{spotlightPrayerRequester}} is Anonymous when
-- prayers.is_anonymous, else prayers.requester; personal spotlight: Me.
UPDATE public.email_templates
SET description = E'Hourly spotlight email: random pick from all approved current community prayers plus that subscriber''s personal prayers (excluding Answered). Variables: {{appLink}}, {{spotlightPrayerKind}}, {{spotlightPrayerTitle}}, {{spotlightPrayerFor}}, {{spotlightPrayerRequester}} (community: Anonymous when anonymous, else prayers.requester; personal spotlight: Me), {{spotlightPrayerDescription}}, {{updateContent}}, {{spotlightUpdateBlockHtml}} (Update subsection HTML; empty when no update), {{spotlightLatestUpdateHtml}} (legacy alias), {{spotlightUpdateTextSection}}.'
WHERE template_key = 'user_hourly_prayer_reminder_with_spotlight';
