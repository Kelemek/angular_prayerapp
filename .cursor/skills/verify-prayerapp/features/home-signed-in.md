# Signed-in home

Home (`/`) shows community and personal prayer catalogs when authenticated with a Supabase JWT (RLS Phase 2).

## Sub-features

- **catalog-load** — prayer lists load without RLS/toast errors after JWT gate is ready.

## How to get to it (user POV)

- Complete MFA login at `/login`, then land on `/`.

## Driving it with Playwright (npx)

Preconditions:

- Operator completes MFA manually **or** provides an approved test account flow.
- `waitForDataAccessReady()` must succeed (subscriber auth link on load).

Steps:

- **Not scripted** in helpers yet — mark **inconclusive** unless operator drives interactively and captures screenshot of prayer cards without “Failed to load prayers”.
- Automated gate: after login, network tab should show PostgREST calls with `Authorization: Bearer <user JWT>`, not anon-only failures.

## Gotchas

- `PrayerService` skips loads when logged out; do not verify home catalogs on `/login`.
- Test DB must have migrations `20261015180000` and `20261016100000` applied for admin/subscriber RLS parity.
