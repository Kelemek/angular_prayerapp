DO $$
DECLARE
  r record;
  fn regprocedure;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') ~* 'is_admin[[:space:]]*\('
        OR coalesce(with_check, '') ~* 'is_admin[[:space:]]*\('
      )
      AND roles && ARRAY['anon', 'public']::name[]
  ) THEN
    RAISE EXCEPTION 'is_admin policy still applies to anon or public';
  END IF;

  FOR r IN
    SELECT *
    FROM (
      VALUES
        ('service', 'public.get_user_prayer_hour_reminders_due_now()'),
        ('service', 'public.get_user_memorization_hour_reminders_due_now()'),
        ('service', 'public.get_user_prayer_item_reminders_due_now()'),
        ('service', 'public.prune_scripture_cache(integer, timestamp with time zone)'),
        ('service', 'public.trg_purge_item_reminders_on_personal_answered()'),
        ('service', 'public.trg_purge_item_reminders_on_personal_delete()'),
        ('service', 'public.trg_purge_item_reminders_on_prayer_delete()'),
        ('service', 'public.trg_purge_item_reminders_on_prayer_status()'),
        ('service', 'public.trg_purge_item_reminders_on_prompt_delete()'),
        ('revoke_callers', 'public.create_account_approval_request(text, text, text)'),
        ('signed_in', 'public.is_admin(text)'),
        ('signed_in', 'public.link_email_subscriber_auth()'),
        ('signed_in', 'public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid)'),
        ('signed_in', 'public.prayer_self_update_keeps_approval(uuid, text)'),
        ('signed_in', 'public.get_prompt_prayed_for_counts(uuid[], text)'),
        ('signed_in', 'public.increment_prayed_for_count(uuid)'),
        ('signed_in', 'public.increment_member_prayed_for_count(text)'),
        ('signed_in', 'public.increment_personal_prayed_for_count(uuid, text)'),
        ('signed_in', 'public.increment_prompt_prayed_for_count(uuid, text)'),
        ('signed_in', 'public.has_pending_account_approval(text)'),
        ('signed_in', 'public.create_account_approval_request(text, text, text, text)')
    ) AS fn_grant(mode, signature)
  LOOP
    fn := to_regprocedure(r.signature);
    IF fn IS NULL THEN
      RAISE EXCEPTION 'missing function %', r.signature;
    END IF;

    IF r.mode = 'service' OR r.mode = 'revoke_callers' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    ELSIF r.mode = 'signed_in' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    ELSE
      RAISE EXCEPTION 'unknown grant mode %', r.mode;
    END IF;
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;

-- ROLLBACK
-- GRANT EXECUTE ON FUNCTION public.get_user_prayer_hour_reminders_due_now() TO anon;
-- GRANT EXECUTE ON FUNCTION public.get_user_memorization_hour_reminders_due_now() TO anon;
-- GRANT EXECUTE ON FUNCTION public.get_user_prayer_item_reminders_due_now() TO anon;
-- GRANT EXECUTE ON FUNCTION public.prune_scripture_cache(integer, timestamp with time zone) TO anon;
-- GRANT EXECUTE ON FUNCTION public.has_pending_account_approval(text) TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.create_account_approval_request(text, text, text) TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.create_account_approval_request(text, text, text, text) TO anon;
-- GRANT EXECUTE ON FUNCTION public.is_admin(text) TO anon;
-- GRANT EXECUTE ON FUNCTION public.increment_prayed_for_count(uuid) TO anon;
-- GRANT EXECUTE ON FUNCTION public.increment_member_prayed_for_count(text) TO anon;
-- GRANT EXECUTE ON FUNCTION public.increment_personal_prayed_for_count(uuid, text) TO anon;
-- GRANT EXECUTE ON FUNCTION public.increment_prompt_prayed_for_count(uuid, text) TO anon;
-- GRANT EXECUTE ON FUNCTION public.get_prompt_prayed_for_counts(uuid[], text) TO anon;
-- GRANT EXECUTE ON FUNCTION public.trg_purge_item_reminders_on_personal_answered() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.trg_purge_item_reminders_on_personal_delete() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.trg_purge_item_reminders_on_prayer_delete() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.trg_purge_item_reminders_on_prayer_status() TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.trg_purge_item_reminders_on_prompt_delete() TO anon, authenticated;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, PUBLIC;
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
