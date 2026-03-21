-- Per-user hourly prayer reminders (self nudges). Queried by Edge Function with SQL-side hour match.

CREATE TABLE IF NOT EXISTS public.user_prayer_hour_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  iana_timezone text NOT NULL,
  local_hour smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_prayer_hour_reminders_local_hour_check CHECK (
    local_hour >= 0 AND local_hour <= 23
  ),
  CONSTRAINT user_prayer_hour_reminders_user_email_fkey
    FOREIGN KEY (user_email) REFERENCES public.email_subscribers (email) ON DELETE CASCADE,
  CONSTRAINT user_prayer_hour_reminders_unique_slot UNIQUE (user_email, iana_timezone, local_hour)
);

CREATE INDEX IF NOT EXISTS idx_user_prayer_hour_reminders_user_email
  ON public.user_prayer_hour_reminders (user_email);

COMMENT ON TABLE public.user_prayer_hour_reminders IS
  'User-chosen local clock hours (per IANA timezone) for hourly prayer self-reminders; matched in SQL for minimal egress.';

ALTER TABLE public.user_prayer_hour_reminders ENABLE ROW LEVEL SECURITY;

-- Authenticated users: own rows only (match JWT email case-insensitively)
CREATE POLICY "user_prayer_hour_reminders_select_own"
  ON public.user_prayer_hour_reminders FOR SELECT TO authenticated
  USING (lower(user_email) = lower((auth.jwt() ->> 'email')));

CREATE POLICY "user_prayer_hour_reminders_insert_own"
  ON public.user_prayer_hour_reminders FOR INSERT TO authenticated
  WITH CHECK (lower(user_email) = lower((auth.jwt() ->> 'email')));

CREATE POLICY "user_prayer_hour_reminders_delete_own"
  ON public.user_prayer_hour_reminders FOR DELETE TO authenticated
  USING (lower(user_email) = lower((auth.jwt() ->> 'email')));

GRANT SELECT, INSERT, DELETE ON TABLE public.user_prayer_hour_reminders TO authenticated;
GRANT ALL ON TABLE public.user_prayer_hour_reminders TO service_role;

-- Returns only rows whose local wall hour in iana_timezone equals local_hour right now (server UTC "now").
CREATE OR REPLACE FUNCTION public.get_user_prayer_hour_reminders_due_now()
RETURNS SETOF public.user_prayer_hour_reminders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.user_prayer_hour_reminders r
  WHERE EXTRACT(HOUR FROM (NOW() AT TIME ZONE r.iana_timezone))::integer = r.local_hour;
$$;

REVOKE ALL ON FUNCTION public.get_user_prayer_hour_reminders_due_now() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_prayer_hour_reminders_due_now() TO service_role;
