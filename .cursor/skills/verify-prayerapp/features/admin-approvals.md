# Admin approvals

Church admins review pending prayers, updates, deletions, and account requests from the admin console.

## Sub-features

- **pending-prayers** — new community prayers awaiting approval.
- **pending-updates** — text updates awaiting approval.
- **account-requests** — subscriber registration / affiliation decisions.

## How to get to it (user POV)

- Sign in as admin → `/admin` → Approvals (default tab when work exists).

## Driving it with Playwright (npx)

Preconditions:

- `siteAuthGuard`, `adminGuard`, and `churchMemberGuard` satisfied.
- Test DB admin user; env hints only: `PRAYERAPP_VERIFY_EMAIL` when operator supplies credentials.

Steps:

- Baseline without secrets: [Admin route gate](./admin-gate.md) proves unsigned users cannot open admin.
- Full queue proof: **operator MFA as admin**, screenshot `app-admin-approvals-panel` or tab chrome; save to `evidence/admin-approvals.png`.

## Gotchas

- Cloud agents must not claim approval workflow verified from login redirect alone.
- Never run verification against production `eqiafsygvfaifhoaewxi` or cp-church production fork.
