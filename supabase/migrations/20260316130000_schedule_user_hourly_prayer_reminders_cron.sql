-- Hourly invocation of Edge Function send-user-hourly-prayer-reminders via pg_cron + pg_net.
-- Replaces GitHub Action .github/workflows/send-user-hourly-prayer-reminders.yml (removed from repo).
--
-- PREREQUISITE (run in Supabase SQL Editor if these Vault secrets do not exist yet):
--   select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--   select vault.create_secret('YOUR_SERVICE_ROLE_JWT', 'service_role_key');
-- Use the same service role JWT as GitHub secret SUPABASE_SERVICE_KEY / Dashboard Settings > API.
-- See docs/SETUP.md (Supabase Vault + user hourly prayer reminders cron).

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: remove previous job when migration is re-applied
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT j.jobid INTO jid
  FROM cron.job j
  WHERE j.jobname = 'invoke-user-hourly-prayer-reminders';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'invoke-user-hourly-prayer-reminders',
  '0 * * * *', -- every hour at minute 0 (UTC)
  $$
  SELECT net.http_post(
    url := (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'project_url' LIMIT 1)
      || '/functions/v1/send-user-hourly-prayer-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
