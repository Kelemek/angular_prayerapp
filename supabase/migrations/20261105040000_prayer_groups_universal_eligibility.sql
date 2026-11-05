-- Retire per-account Groups rollout: any unblocked subscriber may use prayer groups.
-- App no longer reads email_subscribers.prayer_groups_enabled for UI (Nov 2025).
-- Column kept for subscriber_self_update_keeps_privileges and invite backfills; DROP deferred.

COMMENT ON COLUMN public.email_subscribers.prayer_groups_enabled IS
  'Deprecated 2026-11-05: rollout complete. RLS uses prayer_groups_enabled() (unblocked subscriber). Column retained for privilege tombstones until a follow-up migration drops it.';

ALTER TABLE public.email_subscribers
  ALTER COLUMN prayer_groups_enabled SET DEFAULT true;

UPDATE public.email_subscribers
SET prayer_groups_enabled = true
WHERE prayer_groups_enabled IS NOT TRUE;

CREATE OR REPLACE FUNCTION public.prayer_groups_enabled(p_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.email_subscribers es
    WHERE lower(trim(es.email)) = lower(trim(coalesce(p_email, public.current_jwt_email())))
      AND coalesce(es.is_blocked, false) IS NOT TRUE
  );
$$;

COMMENT ON FUNCTION public.prayer_groups_enabled(text) IS
  'True when that email has an unblocked email_subscribers row. Defaults to the JWT email.';
