-- Drop legacy GitHub feedback columns. Current apps use submit-feedback.
-- Older binaries that still SELECT github_token, github_repo_owner,
-- github_repo_name, and enabled are no longer supported.

ALTER TABLE public.admin_settings
  DROP COLUMN IF EXISTS github_token,
  DROP COLUMN IF EXISTS github_repo_owner,
  DROP COLUMN IF EXISTS github_repo_name,
  DROP COLUMN IF EXISTS enabled;
