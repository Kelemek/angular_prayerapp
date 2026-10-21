# RLS Phase 4 — church-member gate

Phase 4 adds `email_subscribers.is_church_member` and requires it for church data. Migrations [`20261018180000_church_member_flag.sql`](../supabase/migrations/20261018180000_church_member_flag.sql), [`20261018190000_church_member_rls.sql`](../supabase/migrations/20261018190000_church_member_rls.sql), and [`20261018200000_prayer_groups.sql`](../supabase/migrations/20261018200000_prayer_groups.sql) were applied on test `jcdhajfqtzipltvfslhu` on October 18, 2026 with `supabase db query --linked`. Production `eqiafsygvfaifhoaewxi` does not have them.

## Why the flag cannot default through self-insert

`verify-code` mints a Supabase session only when `email_subscribers` already has an unblocked row ([`mint-subscriber-magic-link.ts`](../supabase/functions/shared/mint-subscriber-magic-link.ts)). A new Planning Center person verifies the email code, stores `auth_resume_token`, and has no JWT. The old registration insert posted `email_subscribers` with that anon bearer. `email_subscribers_insert_own` is `TO authenticated`, so the insert cannot succeed.

Phase 4 does not reopen that insert as a church member. `email_subscribers_insert_own` requires `is_church_member = false` and `church_downgraded_at IS NULL`. A self-update cannot change either column. [`register-planning-center-member`](../supabase/functions/register-planning-center-member/index.ts) checks the resume token, looks the email up in Planning Center with the server credentials, and inserts `is_church_member = true` with the service role. The exact email must match `login_identifier` or the person's primary email. A name-only search hit does not count. An existing group-only row is not upgraded here.

Deploy that function on test with JWT verification off, the same way as `resume-auth-link`:

```bash
supabase functions deploy register-planning-center-member --project-ref jcdhajfqtzipltvfslhu --no-verify-jwt
supabase functions deploy upgrade-planning-center-member notify-group-activity --project-ref jcdhajfqtzipltvfslhu
```

Those three functions are deployed on test. `register-planning-center-member` has JWT verification off. The other two require a signed-in JWT. Production functions were not deployed.

## What a church member must pass

`is_church_member(text)` is true when the email (or the JWT email) has an unblocked row with `is_church_member`. `is_admin(text)` now also requires that flag, so a group-only row cannot act as an admin. Existing rows are backfilled to true, so current admins stay admins.

These policies require `is_church_member()`. Own-row policies are unchanged, so a person can still read a church prayer they authored after a later downgrade. Admin policies still call `is_admin()`.

- `prayers_select_approved_authenticated`, `prayers_insert_member`
- `prayer_updates_select_approved`, `prayer_updates_insert_pending`
- `prayer_prompts_select_authenticated`, `prayer_types_select_authenticated`
- `member_prayer_updates` select, insert, update, and delete
- `Allow select on member_prayed_for_counts`
- `Allow select own prompt prayed counts`
- `booklet_insert_pages_authenticated_read`

`email_templates` SELECT is limited to admins (`email_templates_admin_write` FOR ALL) and `service_role` after migration `20261021230000_email_templates_admin_read.sql`. Subscriber welcome mail loads templates in the `send-email` edge function. Group activity templates use `email_templates.is_group` (migration `20261021220000_email_queue_group_template_marker.sql`).

These functions raise `Not authorized` unless `is_church_member()` is true. They are called with the signed-in JWT. A service-role call with no email fails the same check.

- `increment_prayed_for_count(uuid)`
- `increment_member_prayed_for_count(text)`
- `increment_prompt_prayed_for_count(uuid, text)`
- `get_prompt_prayed_for_counts(uuid[], text)`
- `upsert_user_badge_read_state(text, jsonb, jsonb)`

Anon grants from [RLS_PHASE3.md](RLS_PHASE3.md) are unchanged. No new function is granted to anon.

## Acceptance still open on test

After the two migrations and the function deploy, an existing subscriber should see the same Church tab, prompts, counts, and booklet. A row with `is_church_member = false`, set with the service role, should get zero rows from the policies above and `Not authorized` from the counters. A self-insert or self-update should not be able to set the flag to true. That smoke test has not been run yet.
