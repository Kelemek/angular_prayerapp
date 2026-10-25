# Migration history (Cross Pointe Prayer)

This repo’s **TEST** database (`jcdhajfqtzipltvfslhu`) was advanced for years with `supabase db query -f …` plus `supabase migration repair`, not `supabase db push`. Production (`eqiafsygvfaifhoaewxi`) follows the same pattern for many landings.

## Operator rules

- **Do not** run `supabase db push` against TEST or prod unless you intentionally apply **PENDING** migrations after a dry-run review.
- **`migration repair`** only updates `supabase_migrations.schema_migrations`; it does not run SQL. Never stamp a version whose effects are not already on the target database.
- Link TEST before remote commands: `supabase link --project-ref jcdhajfqtzipltvfslhu` (confirm ref).
- **Supabase GitHub Integration** is not enabled from this doc; connect only after local/remote parity is verified.

## Odd filenames (leave as-is unless CLI/preview errors)

- **8-digit versions** (e.g. `20260125_…`) — CLI compares version strings lexicographically; renaming applied versions forces extra repairs on prod.
- **Hour > 23** in timestamps (e.g. `20261021240000` … `20261021320000`) — already applied on TEST and prod; do not rename without a dedicated plan.

## Re-stamped versions (TEST history vs older repo names)

TEST history uses these versions; repo files were renamed to match (no DB write):

| TEST version | Former repo version |
|--------------|---------------------|
| `20260926220642` | `20260926170000` |
| `20261008013234` | `20261007200000` |
| `20261008040221` | `20261008030000` |
| `20261011165902` | `20261011120000` |

**Production history repair (October 24, 2026):** On `eqiafsygvfaifhoaewxi`, history-only `migration repair` aligned 116 local files with `schema_migrations` (no migration SQL executed). **Applied** 64 repo-only versions (pre–Oct-15 gap, `20260204000001`, TEST-aligned rename targets, and `20261008040221` backfill stamp). **Reverted** obsolete prod-only stamps `20260926233850`, `20261008034810`, `20261011175422` (same logical migrations as the four TEST-aligned files above). Verified: `supabase migration list --linked` (0 LOCAL≠REMOTE), `supabase db push --dry-run --linked` → remote up to date. Supabase GitHub Integration not connected. CLI re-linked to TEST `jcdhajfqtzipltvfslhu` after prod work.

## Placeholder files

- `20260123135839_remote_schema.sql` — history row exists on TEST; baseline SQL is `20260123140820_remote_schema.sql`.
- `20260712191829_memorization_recommendations_tenant.sql` — prod history-only placeholder; no schema effect on TEST.

## Duplicate version fix

`20260204` was split: `20260204_add_email_queue_processing_lock.sql` and `20260205000001_fix_email_queue_status_constraint.sql` (renamed from `20260204000001` on 2026-10-25 so the 8-digit / 14-digit prefix does not break hosted GitHub `db push`; history repaired on TEST and prod).
