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
