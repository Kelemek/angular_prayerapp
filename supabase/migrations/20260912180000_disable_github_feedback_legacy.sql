-- Turn off legacy in-app GitHub feedback for older native/web builds that still
-- read admin_settings (getGitHubConfig). New builds use submit-feedback + Notion.
--
-- Keep all four columns: legacy clients SELECT github_token, github_repo_owner,
-- github_repo_name, and enabled in one query; dropping any column fails the request.

UPDATE public.admin_settings
SET
  enabled = false,
  github_token = NULL,
  github_repo_owner = '',
  github_repo_name = ''
WHERE id = 1;
