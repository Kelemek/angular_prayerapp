-- Personal prayer Pray For: prayed_for_count, per-user cooldown, increment RPC.
-- Idempotent — safe to re-run with: supabase db execute -f supabase/migrations/20260726120000_personal_prayer_prayed_for_count.sql
--
-- Replaces incremental migrations 20260727120000–20260727150000 (consolidated here).
-- If those versions were already applied, mark them reverted before db push:
--   supabase migration repair --status reverted 20260727120000 20260727130000 20260727140000 20260727150000

ALTER TABLE public.personal_prayers
  ADD COLUMN IF NOT EXISTS prayed_for_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS personal_prayer_cooldown_hours integer NOT NULL DEFAULT 4;

COMMENT ON COLUMN public.email_subscribers.personal_prayer_cooldown_hours IS
  'Hours before this user can tap Pray For again on the same personal prayer (1–168). Community prayers use admin_settings.prayer_encouragement_cooldown_hours.';

DROP FUNCTION IF EXISTS public.increment_personal_prayed_for_count(uuid);

CREATE OR REPLACE FUNCTION public.increment_personal_prayed_for_count(
  personal_prayer_id uuid,
  p_user_email text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
  caller_email text;
BEGIN
  caller_email := lower(
    nullif(trim(coalesce(auth.jwt() ->> 'email', p_user_email)), '')
  );
  IF caller_email IS NULL THEN
    RETURN NULL;
  END IF;

  -- MFA (anon) callers must be active subscribers; JWT callers are already authenticated.
  IF auth.jwt() ->> 'email' IS NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM email_subscribers es
      WHERE lower(es.email) = caller_email
        AND es.is_active = true
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  UPDATE personal_prayers
  SET prayed_for_count = COALESCE(prayed_for_count, 0) + 1
  WHERE id = personal_prayer_id
    AND lower(user_email) = caller_email
  RETURNING prayed_for_count INTO new_count;

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_personal_prayed_for_count(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_personal_prayed_for_count(uuid, text) TO authenticated;
