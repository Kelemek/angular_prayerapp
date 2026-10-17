# RLS Phase 3 — leftover anon access

Phase 3 removes the anonymous grants Phase 2 left behind. Migrations `20261017140000` through `20261017200000` are applied on test `jcdhajfqtzipltvfslhu` and, as of October 17, 2026, on production `eqiafsygvfaifhoaewxi`. See [SETUP.md](SETUP.md).

## Catalog policies dropped

[`20261017140000_rls_phase3_drop_catalog_public_reads.sql`](../supabase/migrations/20261017140000_rls_phase3_drop_catalog_public_reads.sql) drops these policies.

- `Allow public reads on memorization_recommendations`
- `Allow public reads on memorization_recommendation_categories`
- `Allow public reads on booklet_insert_pages`

Signed-in reads stay on `memorization_recommendations_select_authenticated`, `memorization_recommendation_categories_select_authenticated`, and `booklet_insert_pages_authenticated_read`.

## Table grants revoked

[`20261017150000_rls_phase3_revoke_anon_table_grants.sql`](../supabase/migrations/20261017150000_rls_phase3_revoke_anon_table_grants.sql) revokes anon on `scripture_cache`, `memorization_recite_usage`, and `backup_tables`, including column grants. `memorization_recite_usage_admin_select` applies to signed-in users only.

## Admin policies narrowed

[`20261017160000_rls_phase3_is_admin_policy_roles.sql`](../supabase/migrations/20261017160000_rls_phase3_is_admin_policy_roles.sql) limits these policies to signed-in users. The `USING` expressions stay.

- `Admins can manage deletion_requests` on `deletion_requests`
- `Admins can manage prayer_updates` on `prayer_updates`
- `Admins can modify all prayers` on `prayers`
- `Admins can view all prayers` on `prayers`

## Function execute revoked

[`20261017170000_rls_phase3_function_execute.sql`](../supabase/migrations/20261017170000_rls_phase3_function_execute.sql) removes anon and `PUBLIC` execute from the reminder due-now reads, `prune_scripture_cache`, `is_admin`, login linking, the prayed-for counters, both approval functions, and the five prayer-reminder purge triggers. Reminder reads, cache prune, purge triggers, and the unused three-argument `create_account_approval_request` stay on the service role. Signed-in members keep `is_admin`, login linking, prayed-for counts, and the four-argument approval request.

[`20261017190000_rls_phase3_restore_anon_login_functions.sql`](../supabase/migrations/20261017190000_rls_phase3_restore_anon_login_functions.sql) grants anon execute back on `has_pending_account_approval(text)` and `create_account_approval_request(text, text, text, text)`. `/login` calls both before a subscriber session exists. The three-argument approval function stays service-role only. On test and production, those two are the only `SECURITY DEFINER` functions in `public` that anon can execute.

The schema-scoped default revoke in `20261017170000` does not remove the built-in `PUBLIC` execute grant. [`20261017200000_rls_phase3_default_function_privileges.sql`](../supabase/migrations/20261017200000_rls_phase3_default_function_privileges.sql) revokes that grant for every function `postgres` creates, and revokes a schema-scoped anon execute grant if one is added later. Every new function migration must `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon` and then `GRANT EXECUTE` only to the roles that need it. `supabase_admin` defaults are unchanged. Production already had a `public` schema default that still grants execute to `authenticated` and `service_role`. Test has no `public` schema function default, so a new function there is owner-only until a migration grants it.

## Function search_path

[`20261017180000_rls_phase3_function_search_path.sql`](../supabase/migrations/20261017180000_rls_phase3_function_search_path.sql) sets `search_path` to `public, pg_temp` on the three personal-prayer reorder helpers, `jsonb_union_string_arrays`, both badge-read merge helpers, `touch_memorized_items_updated_at`, `update_branding_last_modified`, and `update_member_prayer_updates_timestamp`.

## Anonymous access this phase keeps

The only anonymous table privilege kept on test and production is `SELECT` on the `admin_settings` login columns. That is the Phase 2 grant used by `/login`. The test-account code columns stay excluded. See [RLS_PHASE2_ANON_AUDIT.md](RLS_PHASE2_ANON_AUDIT.md).

Anon can execute these two `SECURITY DEFINER` functions. Both run on `/login` before a subscriber session exists.

- `has_pending_account_approval(text)`
- `create_account_approval_request(text, text, text, text)`

Anon can still execute these `SECURITY INVOKER` functions. They run as the caller, so table access still follows row security. This phase did not revoke them.

- `analytics_approval_buckets(timestamp with time zone, timestamp with time zone, text)`
- `analytics_page_view_buckets(timestamp with time zone, timestamp with time zone, text)`
- `apply_memorization_recommendation_placements(jsonb)`
- `jsonb_union_string_arrays(jsonb, jsonb)`
- `merge_badge_read_prayers_data(jsonb, jsonb)`
- `merge_badge_read_prompts_data(jsonb, jsonb)`
- `reorder_memorization_recommendation_categories(uuid[])`
- `touch_memorized_items_updated_at()`
- `update_account_approval_requests_updated_at()`
- `update_admin_settings_updated_at()`
- `update_branding_last_modified()`
- `update_email_subscribers_updated_at()`
- `update_email_templates_updated_at()`
- `update_member_prayer_updates_timestamp()`
- `update_pending_preference_changes_updated_at()`
- `update_prayer_types_updated_at()`
- `update_prayers_updated_at_skip_prayed_for()`
- `update_updated_at_column()`
- `update_user_preferences_updated_at()`

Logged-out routes `/login`, `/info`, `/privacy`, and `/support` stay public. `/login` is the route that reads `admin_settings`.

Allow new users to sign up is still on for test (`disable_signup` is false) and for production. Turn it off on test in the project Auth settings when login checks are done. Leave production on until you turn that project off. A self-registered `authenticated` user still passes the Phase 2 read policies. A later phase may require an active `email_subscribers` row on those reads. This phase does not add that check.
