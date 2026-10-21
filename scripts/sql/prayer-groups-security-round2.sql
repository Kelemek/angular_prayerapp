-- Round 2 security probes for TEST jcdhajfqtzipltvfslhu only.
-- Apply migrations 20261021200000 through 20261021250000 first.
-- Run: supabase db query --project-ref jcdhajfqtzipltvfslhu -f scripts/sql/prayer-groups-security-round2.sql
--
-- Full JWT impersonation belongs in integration tests with disposable accounts.
-- This file checks schema objects exist after migrate.

SELECT
  (SELECT count(*) FROM pg_proc WHERE proname = 'email_subscribers_keep_privilege_columns') AS privilege_fn,
  (SELECT count(*) FROM pg_proc WHERE proname = 'upsert_email_subscriber_privilege_tombstone') AS tombstone_fn,
  (SELECT count(*) FROM pg_class WHERE relname = 'email_subscriber_privilege_tombstones') AS tombstone_table,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'is_group') AS is_group_column,
  (SELECT count(*) FROM pg_proc WHERE proname = 'set_group_prayer_status') AS set_status_fn;

SELECT polname
FROM pg_policies
WHERE tablename = 'email_templates'
  AND polname IN ('email_templates_select_authenticated', 'Allow authenticated users to read templates');
-- Expected: 0 rows after 20261021230000.

SELECT template_key, is_group
FROM public.email_templates
WHERE template_key IN (
  'group_welcome',
  'group_prayer_added',
  'group_prayer_update',
  'group_prayer_answered',
  'approved_prayer'
)
ORDER BY template_key;
