-- Run on TEST jcdhajfqtzipltvfslhu after applying 20261021140000-20261021170000.
-- Do not run against production eqiafsygvfaifhoaewxi.
--
-- Replace the emails below with disposable TEST accounts, then:
--   supabase db query --project-ref jcdhajfqtzipltvfslhu -f scripts/sql/prayer-groups-security-checks.sql
--
-- Schema checks below run as the SQL editor role. JWT impersonation needs
-- a signed-in group-only JWT (or set_config of request.jwt.claims plus
-- SET ROLE authenticated) before the DML probes.

-- Schema: church-mail trigger and privilege-column freeze exist.
SELECT
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_email_queue_reject_group_only_church_mail') AS church_mail_trigger,
  (SELECT count(*) FROM pg_proc WHERE proname = 'email_queue_reject_group_only_church_mail') AS church_mail_fn,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_email_subscribers_keep_privilege_columns') AS privilege_trigger,
  (SELECT count(*) FROM pg_proc WHERE proname = 'email_subscribers_keep_privilege_columns') AS privilege_fn,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_group_prayer_updates_keep_identity') AS update_identity_trigger,
  (SELECT count(*) FROM pg_proc WHERE proname = 'group_prayer_updates_keep_identity') AS update_identity_fn;
-- Expected: all counts are 1.

-- Schema: self-delete and self-insert policies are gone.
SELECT polname
FROM pg_policies
WHERE tablename = 'email_subscribers'
  AND polname IN (
    'email_subscribers_delete_own',
    'email_subscribers_insert_own'
  );
-- Expected: 0 rows.

-- Schema: group_prayer_updates author UPDATE has a membership WITH CHECK.
SELECT pg_get_expr(polwithcheck, polrelid) AS with_check
FROM pg_policy
WHERE polname = 'group_prayer_updates_update_author';
-- Expected: includes is_prayer_group_member.

-- Impersonation (replace emails, then run as that JWT):
-- SET LOCAL ROLE authenticated;
-- SELECT set_config('request.jwt.claims', json_build_object(
--   'role', 'authenticated',
--   'email', 'GROUP_ONLY_TEST@example.com',
--   'sub', 'GROUP_ONLY_AUTH_USER_UUID'
-- )::text, true);
--
-- Church catalog is empty for group-only:
--   SELECT count(*) FROM public.prayer_requests;
--   SELECT count(*) FROM public.prayer_prompts;
-- Expected: 0 (unless the row is their own authored prayer).
--
-- Self-delete fails:
--   DELETE FROM public.email_subscribers
--   WHERE lower(email) = lower('GROUP_ONLY_TEST@example.com');
-- Expected: 0 rows, or RLS denies.
--
-- Privilege freeze fails:
--   UPDATE public.email_subscribers
--   SET is_church_member = true
--   WHERE lower(email) = lower('GROUP_ONLY_TEST@example.com');
-- Expected: exception 'Not authorized'.
--
-- Self-insert fails:
--   INSERT INTO public.email_subscribers (email, name, is_church_member)
--   VALUES ('GROUP_ONLY_TEST@example.com', 'Nope', false);
-- Expected: RLS denies.
--
-- Church blast to a group-only subscriber is skipped (no exception, no row):
--   INSERT INTO public.email_queue (recipient, template_key, template_variables, status)
--   VALUES (
--     'GROUP_ONLY_TEST@example.com',
--     'admin_subscriber_manual_broadcast',
--     '{}'::jsonb,
--     'pending'
--   );
-- Expected: 0 rows. The rest of a multi-row insert still commits.
--
-- approved_prayer to that group-only address is also skipped.
-- The same template to an address with no subscriber row is queued.
-- A group template (email_templates.is_group) still inserts.
