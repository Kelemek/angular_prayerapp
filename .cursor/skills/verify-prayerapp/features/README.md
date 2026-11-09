# Prayer App verification map

Read this index before driving the web app. Each feature file is a recipe for one user-visible area.

## Baseline preconditions

- Run from repo root with `PRAYERAPP_VERIFY_RUN_ID` set (or let scripts default to a timestamp).
- `scripts/verify-prayerapp/launch.sh` then `doctor.sh` must pass.
- Base URL: `http://127.0.0.1:${PRAYERAPP_VERIFY_PORT:-4321}`.
- **Test Supabase only:** dev build reads `src/environments/environment.ts` (project ref `jcdhajfqtzipltvfslhu`). **Never** point verification at production `eqiafsygvfaifhoaewxi`, the cp-church production fork, or `environment.prod.ts` unless an operator explicitly documents a one-off — agents must not do that in cloud runs.
- Never drive a dev server you did not start for this `PRAYERAPP_VERIFY_RUN_ID`, unless the operator explicitly shares their port via `PRAYERAPP_VERIFY_PORT`.

## Driving conventions

- Use Playwright drive scripts under `scripts/verify-prayerapp/` (see parent `SKILL.md`).
- Prefer stable selectors documented in each feature (`#email`, `.info-page-shell`, etc.).
- Signed-in flows require a completed MFA login; agents must not send verification codes without operator approval. Reference env **names** only (`PRAYERAPP_VERIFY_EMAIL`, `PRAYERAPP_VERIFY_RUN_ID`, `PRAYERAPP_VERIFY_PORT`, `PRAYERAPP_VERIFY_URL`) — never paste secrets, MFA codes, or service keys into recipes.

## Proof and skip reporting

- Save screenshots and `*.txt` transcripts under `/tmp/prayerapp-verify-$RUN_ID/evidence/`.
- Report **inconclusive** when JWT/RLS paths need a real session and none was provided.
- Do not claim admin, home catalog, memorization, or settings verification through public pages alone.

## Coverage tiers

| Tier | Meaning |
|------|---------|
| **Automated** | `drive-*.sh` scripts (no MFA). |
| **Operator MFA** | Documented journey; manual screenshots in `evidence/`. |
| **Inconclusive (cloud)** | JWT/RLS/admin queues without operator credentials. |

## Features

### Public / auth gates (automated helpers exist)

- [Public info page](./public-info.md) — marketing `/info` (no auth).
- [Privacy page](./privacy.md) — `/privacy` policy shell.
- [Support page](./support.md) — `/support` help shell.
- [Login email shell](./login-shell.md) — `/login` email step UI.
- [Home route gate](./home-gate.md) — `/` requires auth (login redirect).
- [Admin route gate](./admin-gate.md) — `/admin` requires auth (login redirect).

### Core product (operator MFA or inconclusive)

- [Home prayer catalog](./home-prayer-catalog.md) — view / submit prayers (JWT + RLS).
- [Prayer updates](./prayer-updates.md) — compose and moderation.
- [Verse memorization](./verse-memorization.md) — Memorize tab and practice.
- [User settings and theme](./user-settings-theme.md) — settings modal, theme.

### Admin (gate automated; queues need admin JWT)

- [Admin approvals](./admin-approvals.md) — pending prayers, updates, accounts.
- [Admin email subscribers](./admin-email-subscribers.md) — subscriber list (`is_admin` RLS).
- [Signed-in home](./home-signed-in.md) — legacy alias for catalog-load notes (see home-prayer-catalog).
