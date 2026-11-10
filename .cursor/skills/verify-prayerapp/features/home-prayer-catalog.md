# Home prayer catalog (view / submit)

After MFA, home shows community and personal prayer lists. Users browse cards, open detail, add prayers, and mark prayed.

## Sub-features

- **catalog-load** — lists render without “Failed to load prayers” toasts.
- **view-card** — open a prayer and see title, body, and update thread.
- **submit-prayer** — create a new request via the add flow (category filters vary by tab).

## How to get to it (user POV)

- Sign in at `/login`, land on `/`.
- Switch **Church** / **Group** / **Personal** / **Memorize** tabs and category chips as applicable.
- Use **Add prayer** (or group equivalent) from the active tab.

## Driving it with Playwright (npx)

Preconditions:

- Test Supabase (`jcdhajfqtzipltvfslhu`) with migrations applied; never prod `eqiafsygvfaifhoaewxi` or cp-church fork deploys.
- Completed MFA for a church member or approved subscriber.
- Optional operator env: `PRAYERAPP_VERIFY_EMAIL` (address only; do not commit codes or tokens).

Steps:

- **Not automated** in repo helpers — requires JWT + RLS. Operator drives interactively after login and saves screenshots under `evidence/`.
- Automated baseline only: [Home route gate](./home-gate.md) proves unsigned users cannot reach catalogs.

## Gotchas

- `PrayerService` skips loads while logged out; gate scripts must not be mistaken for catalog proof.
- Submitting mutates test data; prefer disposable test accounts the operator owns.
- Cloud agents cannot complete MFA without an operator (no unsupervised `send-verification-code`).
