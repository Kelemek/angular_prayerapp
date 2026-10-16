# Prayer App verification map

Read this index before driving the web app. Each feature file is a recipe for one user-visible area.

## Baseline preconditions

- Run from repo root with `PRAYERAPP_VERIFY_RUN_ID` set (or let scripts default to a timestamp).
- `scripts/verify-prayerapp/launch.sh` then `doctor.sh` must pass.
- Base URL: `http://127.0.0.1:${PRAYERAPP_VERIFY_PORT:-4321}`.
- Dev build uses `src/environments/environment.ts` (test Supabase). Production is **not** targeted unless the operator changes env and confirms.
- Never drive a dev server you did not start for this `PRAYERAPP_VERIFY_RUN_ID`, unless the operator explicitly shares their port via `PRAYERAPP_VERIFY_PORT`.

## Driving conventions

- Use Playwright drive scripts under `scripts/verify-prayerapp/` (see parent `SKILL.md`).
- Prefer stable selectors documented in each feature (`#email`, `.info-page-shell`, etc.).
- Signed-in flows require a completed MFA login; agents must not send verification codes without operator approval.

## Proof and skip reporting

- Save screenshots and `*.txt` transcripts under `/tmp/prayerapp-verify-$RUN_ID/evidence/`.
- Report **inconclusive** when JWT/RLS paths need a real session and none was provided.
- Do not claim admin or home prayer list verification through `/info` alone.

## Features

- [Public info page](./public-info.md) — marketing `/info` (no auth).
- [Login email shell](./login-shell.md) — `/login` email step UI.
- [Admin route gate](./admin-gate.md) — `/admin` requires auth (login redirect).
- [Signed-in home](./home-signed-in.md) — community/personal prayer lists (JWT + RLS).
- [Admin email subscribers](./admin-email-subscribers.md) — admin list (JWT + `is_admin` RLS).
