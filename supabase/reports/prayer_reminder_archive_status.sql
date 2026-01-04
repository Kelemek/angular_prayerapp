-- Prayer Reminder & Archive Status Report
-- =====================================================
-- This report shows the status of prayers regarding:
--   1. When reminders will be sent (based on reminder_interval_days)
--   2. When prayers will be archived (based on days_before_archive)
--
-- Run this query to see which prayers are:
--   - Due for a reminder
--   - Ready to be archived
--   - Waiting (not yet due)
--   - Exempt from archiving (have updates since reminder)
--
-- Configuration comes from admin_settings table:
--   - enable_reminders: whether reminder emails are enabled
--   - reminder_interval_days: days between reminders
--   - enable_auto_archive: whether auto-archiving is enabled
--   - days_before_archive: days before archiving (if no updates)

WITH settings AS (
  SELECT 
    enable_reminders,
    reminder_interval_days,
    enable_auto_archive,
    days_before_archive
  FROM admin_settings
  WHERE id = 1
),
prayer_status AS (
  SELECT 
    p.id,
    p.title,
    p.requester,
    p.email,
    p.status,
    p.approval_status,
    p.created_at,
    p.last_reminder_sent,
    COALESCE(p.last_reminder_sent, p.created_at) as reference_date,
    -- Calculate days since last reminder (or creation if never reminded)
    FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(p.last_reminder_sent, p.created_at))) / 86400) as days_since_reference,
    -- Get most recent update after last reminder was sent
    (SELECT created_at 
     FROM prayer_updates 
     WHERE prayer_id = p.id 
     AND created_at >= COALESCE(p.last_reminder_sent, p.created_at)
     ORDER BY created_at DESC 
     LIMIT 1) as last_update_after_reminder,
    s.reminder_interval_days,
    s.days_before_archive,
    s.enable_reminders,
    s.enable_auto_archive
  FROM prayers p
  CROSS JOIN settings s
  WHERE p.status = 'current'
    AND p.approval_status = 'approved'
)
SELECT 
  id as prayer_id,
  title as prayer_title,
  requester,
  email,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
  TO_CHAR(last_reminder_sent, 'YYYY-MM-DD HH24:MI:SS') as last_reminder_sent,
  days_since_reference,
  reminder_interval_days,
  days_before_archive,
  CASE 
    WHEN last_update_after_reminder IS NOT NULL 
      THEN TO_CHAR(last_update_after_reminder, 'YYYY-MM-DD HH24:MI:SS')
    ELSE 'No updates since reminder'
  END as last_update_after_reminder,
  -- Determine if reminder should be sent
  CASE 
    WHEN enable_reminders = false THEN '❌ Reminders disabled'
    WHEN last_reminder_sent IS NULL THEN '🔔 SEND REMINDER (never sent)'
    WHEN days_since_reference >= reminder_interval_days THEN '🔔 SEND REMINDER (due now)'
    ELSE '⏳ No reminder needed yet (' || (reminder_interval_days - days_since_reference) || ' days to go)'
  END as reminder_status,
  -- Determine if should be archived
  CASE 
    WHEN enable_auto_archive = false THEN '❌ Auto-archive disabled'
    WHEN last_reminder_sent IS NULL THEN '⏳ Not archived (never reminded)'
    WHEN days_since_reference < days_before_archive THEN 
      '⏳ Not archived yet (' || days_since_reference || '/' || days_before_archive || ' days)'
    WHEN last_update_after_reminder IS NOT NULL THEN '⏳ Not archived (has updates since reminder)'
    ELSE '🗑️  ARCHIVE NOW (' || days_since_reference || ' days since reminder, threshold: ' || days_before_archive || ')'
  END as archive_status
FROM prayer_status
ORDER BY 
  CASE 
    WHEN last_update_after_reminder IS NOT NULL THEN 3
    WHEN days_since_reference >= days_before_archive THEN 1
    ELSE 2
  END,
  days_since_reference DESC;
