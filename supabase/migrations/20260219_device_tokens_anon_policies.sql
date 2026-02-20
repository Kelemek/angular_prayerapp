-- Allow anon to SELECT, INSERT, UPDATE, DELETE on device_tokens so the app can register
-- devices without a Supabase Auth session (e.g. MFA-only login). FK still requires
-- user_email to exist in email_subscribers. Keeps original pre-RLS behavior for registration.
-- Safe to re-run: policies are dropped then recreated.

DROP POLICY IF EXISTS "device_tokens_anon_all" ON public.device_tokens;
CREATE POLICY "device_tokens_anon_all"
  ON public.device_tokens FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
