-- Daily invocation of Edge Function cleanup-device-tokens via pg_cron + pg_net.
-- Replaces GitHub Action .github/workflows/cleanup-device-tokens.yml (removed from repo).
--
-- Same Vault secrets as other scheduled Edge invokes: project_url, service_role_key.
-- See docs/SETUP.md (Device token cleanup).

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT j.jobid INTO jid
  FROM cron.job j
  WHERE j.jobname = 'invoke-cleanup-device-tokens';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'invoke-cleanup-device-tokens',
  '0 3 * * *', -- daily 03:00 UTC (same as former GitHub workflow)
  $$
  SELECT net.http_post(
    url := (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name = 'project_url' LIMIT 1)
      || '/functions/v1/cleanup-device-tokens',
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
