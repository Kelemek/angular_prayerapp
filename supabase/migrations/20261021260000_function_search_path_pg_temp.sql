-- Pin search_path on timestamp and reminder-purge functions advisors still flag.

DO $$
DECLARE
  r record;
  fn regprocedure;
BEGIN
  FOR r IN
    SELECT signature
    FROM (
      VALUES
        ('public.update_email_subscribers_updated_at()'),
        ('public.update_prayers_updated_at_skip_prayed_for()'),
        ('public.link_email_subscriber_auth()'),
        ('public.trg_purge_item_reminders_on_prayer_delete()'),
        ('public.trg_purge_item_reminders_on_prayer_status()'),
        ('public.trg_purge_item_reminders_on_personal_delete()'),
        ('public.trg_purge_item_reminders_on_personal_answered()'),
        ('public.trg_purge_item_reminders_on_prompt_delete()'),
        ('public.trg_purge_item_reminders_on_group_prayer_delete()'),
        ('public.trg_purge_item_reminders_on_group_prayer_answered()'),
        ('public.purge_user_prayer_item_reminders(text, text)')
    ) AS fns(signature)
  LOOP
    fn := to_regprocedure(r.signature);
    IF fn IS NULL THEN
      RAISE EXCEPTION 'missing function %', r.signature;
    END IF;

    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
  END LOOP;
END $$;

-- ROLLBACK
-- ALTER FUNCTION public.update_email_subscribers_updated_at() RESET search_path;
-- ALTER FUNCTION public.update_prayers_updated_at_skip_prayed_for() RESET search_path;
-- ALTER FUNCTION public.link_email_subscriber_auth() RESET search_path;
-- ALTER FUNCTION public.trg_purge_item_reminders_on_prayer_delete() RESET search_path;
-- ALTER FUNCTION public.trg_purge_item_reminders_on_prayer_status() RESET search_path;
-- ALTER FUNCTION public.trg_purge_item_reminders_on_personal_delete() RESET search_path;
-- ALTER FUNCTION public.trg_purge_item_reminders_on_personal_answered() RESET search_path;
-- ALTER FUNCTION public.trg_purge_item_reminders_on_prompt_delete() RESET search_path;
-- ALTER FUNCTION public.trg_purge_item_reminders_on_group_prayer_delete() RESET search_path;
-- ALTER FUNCTION public.trg_purge_item_reminders_on_group_prayer_answered() RESET search_path;
-- ALTER FUNCTION public.purge_user_prayer_item_reminders(text, text) RESET search_path;
