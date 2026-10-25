-- TEST: Supabase GitHub Integration smoke test (not used by the app).
-- Pair with comment-only change in supabase/functions/verify-code/index.ts on the same commit.
-- After merge to main and a successful integration deploy, verify in SQL editor (TEST jcdhajfqtzipltvfslhu):
--
--   select public.test_github_integration_deploy_probe();
--   -- expected: github-integration-deploy-ok-20261025180000
--
--   select version, name
--   from supabase_migrations.schema_migrations
--   where version = '20261025180000';
--
-- Or: supabase link --project-ref jcdhajfqtzipltvfslhu && supabase migration list --linked

CREATE OR REPLACE FUNCTION public.test_github_integration_deploy_probe()
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT 'github-integration-deploy-ok-20261025180000'::text;
$$;

COMMENT ON FUNCTION public.test_github_integration_deploy_probe() IS
  'Smoke probe for Supabase GitHub Integration on TEST; safe to leave in place.';

REVOKE ALL ON FUNCTION public.test_github_integration_deploy_probe() FROM PUBLIC;
