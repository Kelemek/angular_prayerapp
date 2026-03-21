-- MFA / localStorage auth: browser uses anon key without Supabase JWT, same as personal_prayers.
-- Without GRANT + permissive policy, PostgREST returns "permission denied for table user_prayer_hour_reminders".

GRANT SELECT, INSERT, DELETE ON TABLE public.user_prayer_hour_reminders TO anon;

CREATE POLICY "Allow all user_prayer_hour_reminders access"
  ON public.user_prayer_hour_reminders
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
