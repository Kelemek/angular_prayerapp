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
- Static screenshots: `playwright_screenshot` in `common.sh`. Multi-step UI: `playwright-drive.mjs` via `playwright_drive`.
- Prefer stable selectors documented in each feature (`#email`, `.info-page-shell`, `#tour-filter-groups`, etc.).
- Signed-in flows require a completed MFA session. Optional: export Playwright storage to `PRAYERAPP_VERIFY_STORAGE_STATE` after operator login. Reference env **names** only — never paste secrets or MFA codes into recipes.

## Proof and skip reporting

- Save screenshots and `*.txt` transcripts under `/tmp/prayerapp-verify-$RUN_ID/evidence/`.
- Report **inconclusive** when JWT/RLS/admin paths need a real session and none was provided.
- Do not claim admin, home catalog, theme picker, or verse-prayer verification through public pages alone (except where a feature explicitly allows a public mock).

## Coverage tiers

| Tier | Meaning |
|------|---------|
| **Automated** | `drive-*.sh` scripts (no MFA), or inconclusive transcript when MFA missing. |
| **Operator MFA** | Documented journey; `PRAYERAPP_VERIFY_STORAGE_STATE` or manual screenshots in `evidence/`. |
| **Inconclusive (cloud)** | JWT/RLS/admin queues without operator credentials. |

## Features

### Public / auth gates (automated helpers exist)

- [Public info shell](./public-info.md) — `/info` hero smoke (`drive-public-info.sh`).
- [Info interactive preview](./info-interactive-preview.md) — `/info` mock tabs Group/Church/Personal/Memorize (`drive-info-preview-*.sh`).
- [Privacy page](./privacy.md) — `/privacy` policy shell.
- [Support page](./support.md) — `/support` help shell.
- [Login email shell](./login-shell.md) — `/login` email step UI.
- [Home route gate](./home-gate.md) — `/` requires auth (login redirect).
- [Admin route gate](./admin-gate.md) — `/admin` requires auth (login redirect).

### Core product (operator MFA or inconclusive)

- [Home prayer catalog](./home-prayer-catalog.md) — view / submit prayers (JWT + RLS).
- [Home groups tab](./home-groups-tab.md) — Group tab, + chip, group filters (`drive-home-groups-tab.sh`).
- [Prayer updates](./prayer-updates.md) — compose and moderation.
- [Verse memorization](./verse-memorization.md) — Memorize tab and practice.
- [User settings and theme](./user-settings-theme.md) — seven-option theme picker (`drive-theme-picker.sh`).

### Admin (gate automated; queues need admin JWT)

- [Verse prayer modal](./verse-prayer-modal.md) — Post verse prayer bottom sheet (`drive-verse-prayer-modal.sh`).
- [Admin approvals](./admin-approvals.md) — pending prayers, updates, accounts.
- [Admin email subscribers](./admin-email-subscribers.md) — subscriber list (`is_admin` RLS).
- [Signed-in home](./home-signed-in.md) — legacy alias for catalog-load notes (see home-prayer-catalog).
