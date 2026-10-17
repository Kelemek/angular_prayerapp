-- Tester MFA codes stay on admin_settings for the service role (send-verification-code,
-- verify-code). Anonymous and signed-in table select no longer includes those columns.
-- Admins and the configured tester account read them through get_test_account_login_codes().

REVOKE SELECT ON TABLE public.admin_settings FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  created_at,
  updated_at,
  reminder_interval_days,
  require_email_verification,
  verification_code_length,
  verification_code_expiry_minutes,
  app_title,
  app_subtitle,
  enable_auto_archive,
  days_before_archive,
  enable_reminders,
  use_logo,
  light_mode_logo_blob,
  dark_mode_logo_blob,
  deletions_allowed,
  updates_allowed,
  inactivity_timeout_minutes,
  max_session_duration_minutes,
  db_heartbeat_interval_minutes,
  require_site_login,
  branding_last_modified,
  prayer_encouragement_enabled,
  prayer_encouragement_cooldown_hours,
  test_account_email,
  church_website_url,
  user_hourly_prayer_reminder_template_key,
  rich_text_editors_enabled,
  user_hourly_memorization_reminder_template_key,
  memorization_recite_enabled
) ON TABLE public.admin_settings TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_test_account_login_codes()
RETURNS TABLE (
  test_account_email text,
  test_account_code_4 text,
  test_account_code_6 text,
  test_account_code_8 text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_email text;
  v_tester_email text;
BEGIN
  v_jwt_email := nullif(trim(lower(coalesce(auth.jwt() ->> 'email', ''))), '');

  IF v_jwt_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT nullif(trim(lower(coalesce(s.test_account_email, ''))), '')
  INTO v_tester_email
  FROM public.admin_settings s
  WHERE s.id = 1;

  IF NOT public.is_admin(v_jwt_email)
     AND (v_tester_email IS NULL OR v_jwt_email <> v_tester_email) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    s.test_account_email,
    s.test_account_code_4,
    s.test_account_code_6,
    s.test_account_code_8
  FROM public.admin_settings s
  WHERE s.id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_test_account_login_codes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_test_account_login_codes() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_test_account_login_codes() TO authenticated;
