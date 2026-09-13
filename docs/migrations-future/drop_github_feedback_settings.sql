-- DEFERRED — do not run until native store builds that still call getGitHubConfig()
-- are negligible (see docs/SETUP.md § In-app feedback).
--
-- Prerequisite: migration 20260912180000_disable_github_feedback_legacy.sql should
-- already be applied so feedback is off and github_token is cleared.
--
-- Dropping columns breaks any old client that still SELECTs these fields together.

ALTER TABLE public.admin_settings
  DROP COLUMN IF EXISTS github_token,
  DROP COLUMN IF EXISTS github_repo_owner,
  DROP COLUMN IF EXISTS github_repo_name,
  DROP COLUMN IF EXISTS enabled;
