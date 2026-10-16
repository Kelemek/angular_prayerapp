# Admin email subscribers

Admin portal section listing `email_subscribers` rows (RLS via `public.is_admin()`).

## Sub-features

- **list-rows** — admin sees full list (not only own row when `is_admin` true).
- **refresh-stay** — browser refresh on `/admin` stays on admin routes (no bounce to `/`).

## How to get to it (user POV)

- Sign in as admin → Admin → Email Subscribers (exact menu label in UI).

## Driving it with Playwright (npx)

Preconditions:

- Signed-in admin with `is_admin` on test `email_subscribers` row.
- Migration `20261016100000_is_admin_ignore_is_active.sql` applied on the linked project.

Steps:

- **Not fully scripted** — operator or future helper must complete MFA, open admin subscribers, capture screenshot showing multiple rows.
- For **refresh**: hard-refresh on an admin URL; expect same admin route (see CHANGELOG admin refresh fix).

## Gotchas

- `check-admin-status` edge function can return admin while old `is_admin()` SQL required `is_active` — keep DB function aligned with migration.
- Block/unblock icons need list refresh after confirmation (`loadPageData`).
