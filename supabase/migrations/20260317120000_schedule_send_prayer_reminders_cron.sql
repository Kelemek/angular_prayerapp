-- Daily invocation of Edge Function send-prayer-reminders (community reminder emails + auto-archive) via pg_cron + pg_net.
-- Replaces GitHub Action .github/workflows/send-prayer-reminders.yml (removed from repo).
--
-- Uses the same Vault secrets as user hourly reminders: project_url, service_role_key.
-- See docs/SETUP.md (User hourly prayer reminders + Community prayer reminders).
--
-- timeout_milliseconds: batch work can exceed 2 minutes; increase if net._http_response shows timeouts
-- or align with your Supabase Edge Function max duration.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT j.jobid INTO jid
  FROM cron.job j
  WHERE j.jobname = 'invoke-send-prayer-reminders';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'invoke-send-prayer-reminders',
  '0 10 * * *', -- daily 10:00 UTC (same as former GitHub workflow)
  $$
  SELECT net.http_post(
    url := (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'project_url' LIMIT 1)
      || '/functions/v1/send-prayer-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
