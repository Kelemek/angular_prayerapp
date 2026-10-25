-- Dual-run: link email_subscribers to existing auth.users by email (no client re-login).
-- Safe to re-run; only fills rows where auth_user_id IS NULL.

UPDATE public.email_subscribers es
SET
  auth_user_id = u.id,
  auth_linked_at = coalesce(es.auth_linked_at, timezone('utc', now())),
  updated_at = timezone('utc', now())
FROM auth.users u
WHERE lower(trim(es.email)) = lower(trim(u.email))
  AND es.auth_user_id IS NULL
  AND coalesce(es.is_blocked, false) IS NOT TRUE;
