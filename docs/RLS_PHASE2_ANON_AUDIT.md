# RLS Phase 2 — anon policy audit

Phase 2 removes MFA/anon PostgREST access for signed-in flows. Clients must send a Supabase JWT ([`SupabaseDataAccessGateService`](src/app/services/supabase-data-access-gate.service.ts); `AdminAuthService.waitForDataAccessReady()` delegates to it).

## Unchanged (service role or Edge)

- Nightly backup: GitHub Actions `SUPABASE_SERVICE_KEY` ([`.github/workflows/backup-database-api.yml`](../.github/workflows/backup-database-api.yml))
- Login codes: [`20260926170000_lock_verification_codes.sql`](../supabase/migrations/20260926170000_lock_verification_codes.sql) + `send-verification-code` / `verify-code`
- Reminder cron and most Edge Functions

## Intentional anon (logged-out)

- `admin_settings` row `id = 1` **SELECT** only — church MFA length on `/login` ([`login-auth.coordinator.ts`](../src/app/services/login-auth.coordinator.ts))
- Public routes `/info`, `/privacy`, `/support` — no Supabase reads today

## Client: JWT instead of anon key

| Area | Path |
|------|------|
| Manual backup / backup log | [`backup-status.component.ts`](../src/app/components/backup-status/backup-status.component.ts) → `getRestAuthorizationBearer()` |
| Prayer Editor list search | [`admin-prayer-editor-facade-run.ts`](../src/app/lib/admin-prayer-editor-facade-run.ts) → `getRestAuthorizationBearer()` |
| Backup log list / manual backup REST | [`backup-status.component.ts`](../src/app/components/backup-status/backup-status.component.ts) → anon `apikey` + JWT bearer |
| Prompt / prayer-type admin lists | [`SupabaseService.directQuery`](../src/app/services/supabase.service.ts) → JWT bearer |
| Planning Center cache + Edge calls | [`PlanningCenterRestService`](../src/app/services/planning-center-rest.service.ts) → [`planning-center.ts`](../src/lib/planning-center.ts); login PC check skips DB cache (`skipCache`) |

## Tables touched by [`20261015180000_rls_phase2_jwt_lockdown.sql`](../supabase/migrations/20261015180000_rls_phase2_jwt_lockdown.sql) (idempotent; safe to re-run)

User-owned (anon MFA policies dropped; JWT email or `is_admin()`):

- `user_prayer_hour_reminders`, `user_memorization_hour_reminders`, `user_prayer_item_reminders`
- `memorized_items`, `memorization_recite_usage`
- `user_badge_read_state`, `personal_prayer_category_colors`
- `device_tokens`, `push_notification_log`
- `personal_prayers`, `personal_prayer_updates`
- `email_subscribers` (own row + admin)
- `backup_logs` (admin)

Community (authenticated members; anon revoked):

- `prayers` — approved SELECT; member INSERT (pending) / UPDATE own row (same migration)
- `prayer_updates`, `prayer_prompts`, `prayer_types` (approved/active reads)
- `member_prayed_for_counts`, prompt prayed-for RPCs

Admin / catalog:

- `admin_settings` (anon login read; authenticated read; admin write)
- `memorization_recommendations`, `memorization_recommendation_categories`, `booklet_insert_pages`

Apply on test (`jcdhajfqtzipltvfslhu`) before production (`eqiafsygvfaifhoaewxi`).

## Leftover allow-all policies ([`20261016140000_rls_lockdown_leftover_policies.sql`](../supabase/migrations/20261016140000_rls_lockdown_leftover_policies.sql))

Applied on the test project and, on October 17, 2026, on production. That production apply is recorded in [SETUP.md](SETUP.md). The lists under this heading are the Phase 2 leftover record. [RLS_PHASE3.md](RLS_PHASE3.md) is the current anonymous-grant record.

Anon still allowed:

- `admin_settings` row `id = 1` **SELECT** of the login columns (code length, titles, and the other non-secret settings). `test_account_code_4`, `test_account_code_6`, and `test_account_code_8` are omitted from that grant. Insert, update, and delete are revoked. `github_token`, `github_repo_owner`, `github_repo_name`, and `enabled` are dropped. `get_test_account_login_codes()` is executable by signed-in users and returns the codes only for an admin or the configured tester email.
- `email_templates` **SELECT** for a signed-in user. Anonymous select is revoked. Writes are admin-only.

`get_memorization_recite_usage_summary` is executable by signed-in users and returns rows only when `is_admin()` is true for the session email. Anonymous execute is revoked. `get-openai-org-usage` uses that same session check.

Anon functions:

- `has_pending_account_approval(email)` — login, before a subscriber JWT exists. Returns a boolean.
- Account-approval mail is [`notify-account-approval`](../supabase/functions/notify-account-approval/index.ts). `enqueue_account_approval_admin_emails(...)` is service-role only. It queues the template and returns push addresses from the same admin query. A second call within an hour does neither, because `account_approval_requests.admin_notified_at` is claimed first. The browser receives a queue count.

`admin_notification_recipients()` is executable by a signed-in subscriber or admin. Anonymous execute is revoked.

`email_queue` insert is a signed-in admin. `analytics` insert is a signed-in page view. Analytics select is admin-only. Anonymous grants on both tables are revoked.

[`send-email`](../supabase/functions/send-email/index.ts) sends caller-supplied content for the service role or a signed-in admin. Member approval notices use `notify_admins` and do not choose the recipient.

`member_prayer_updates` stores `author_email`. Signed-in members can read every row and insert their own. Update and delete require that email or `is_admin()`. Rows with a null author (created before the column) are admin-only. Anon cannot access the table. `updates_allowed` and `deletions_allowed` are still enforced in the prayer card, not in these policies.
