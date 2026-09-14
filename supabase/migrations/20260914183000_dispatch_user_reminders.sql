-- Single cron dispatcher for Settings + per-item reminder Edge Functions (sequential invoke).
-- Replaces three parallel */15 jobs that stamped PostgREST at :00/:15/:30/:45.
-- Idempotent: unschedule old jobs, schedule invoke-dispatch-user-reminders.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  jid bigint;
  reminder_cron_name text;
BEGIN
  FOREACH reminder_cron_name IN ARRAY ARRAY[
    'invoke-user-hourly-prayer-reminders',
    'invoke-user-hourly-memorization-reminders',
    'invoke-user-prayer-item-reminders'
  ]
  LOOP
    SELECT j.jobid INTO jid FROM cron.job j WHERE j.jobname = reminder_cron_name;
    IF jid IS NOT NULL THEN
      PERFORM cron.unschedule(jid);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT j.jobid INTO jid
  FROM cron.job j
  WHERE j.jobname = 'invoke-dispatch-user-reminders';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'invoke-dispatch-user-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'project_url' LIMIT 1)
      || '/functions/v1/dispatch-user-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 360000
  );
  $$
);
