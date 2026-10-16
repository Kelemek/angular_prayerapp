---
name: verify-prayerapp
description: Drive the Prayer App web UI locally (Angular + Supabase test project) for agent proof — launch, doctor, browser screenshots, and feature-map recipes. Use when poteto-mode or the user asks to verify RLS, auth, admin, or home flows in the running app.
---

# Verify Prayer App (web)

Agents prove behavior in the **real Angular dev server** talking to the **configured Supabase project** in `src/environments/environment.ts` (dev points at test `jcdhajfqtzipltvfslhu`). This is **not** a substitute for `npm run pre-handoff`; run both when changing auth/RLS.

## Launch

From the repo root, with Node **24.x** (`nvm use` reads `.nvmrc`):

```bash
export PRAYERAPP_VERIFY_RUN_ID="${PRAYERAPP_VERIFY_RUN_ID:-$(date +%s)}"
export PRAYERAPP_VERIFY_PORT="${PRAYERAPP_VERIFY_PORT:-4321}"
scripts/verify-prayerapp/launch.sh
```

- Starts `ng serve` on `127.0.0.1:$PRAYERAPP_VERIFY_PORT` (default **4321** — avoids clobbering a developer’s `:4200`).
- State directory: `/tmp/prayerapp-verify-$PRAYERAPP_VERIFY_RUN_ID/` (`ng.log`, `ng.pid`, `evidence/`).
- **Ready** when `scripts/verify-prayerapp/doctor.sh` exits 0.
- Requires `npm install` already done. Uses the committed environment file unless you intentionally override build (not documented here).

**Do not** attach to a dev server the user already started on another port unless they set `PRAYERAPP_VERIFY_PORT` to match and confirm isolation.

## Doctor

```bash
scripts/verify-prayerapp/doctor.sh
```

Read-only. Checks:

1. PID in `/tmp/prayerapp-verify-$PRAYERAPP_VERIFY_RUN_ID/ng.pid` is alive and owns the verify port.
2. `GET http://127.0.0.1:$PRAYERAPP_VERIFY_PORT/` returns HTTP 200.
3. `GET .../index.html` body contains `app-root` (Angular shell).

If doctor fails, read `/tmp/prayerapp-verify-$PRAYERAPP_VERIFY_RUN_ID/ng.log` before retrying.

## Drive

Harness: **Playwright CLI via npx** (no repo Playwright dependency). Always set `PRAYERAPP_VERIFY_URL=http://127.0.0.1:$PRAYERAPP_VERIFY_PORT`.

Read the feature map index first: [features/README.md](./features/README.md).

**Helpers (preferred):**

| Script | Purpose |
|--------|---------|
| `scripts/verify-prayerapp/drive-public-info.sh` | Public `/info` marketing page |
| `scripts/verify-prayerapp/drive-login-shell.sh` | `/login` email step UI (no MFA send) |
| `scripts/verify-prayerapp/drive-admin-gate.sh` | `/admin` redirects unauthenticated users to login with `returnUrl` |

Example:

```bash
export PRAYERAPP_VERIFY_URL="http://127.0.0.1:${PRAYERAPP_VERIFY_PORT:-4321}"
scripts/verify-prayerapp/drive-public-info.sh
```

Signed-in flows (home prayers, admin tools, RLS reads) need a **real MFA session** and are documented under each feature’s **Gotchas**. Do not fake JWTs; use a test subscriber the operator provides via env `PRAYERAPP_VERIFY_EMAIL` only when they have approved an interactive run.

## Evidence

- Directory: `/tmp/prayerapp-verify-$PRAYERAPP_VERIFY_RUN_ID/evidence/`
- Each drive script writes PNG screenshots and a short `*.txt` transcript (URL, selector waited on, exit status).
- **Proof standards:** capture the user-visible path (navigation + selector), not internal service calls. For RLS changes, prefer a signed-in journey from the map when credentials are available; otherwise prove public/login/admin-gate behavior and state **inconclusive** for JWT-gated tables.
- **Cleanup must not delete evidence** (scripts only remove the dev server and PID file).

## Cleanup

```bash
scripts/verify-prayerapp/cleanup.sh
```

Stops only the process recorded in this run’s `ng.pid`. Does **not** remove `/tmp/prayerapp-verify-$PRAYERAPP_VERIFY_RUN_ID/evidence/`.

## Helpers

All scripts are executable bash under `scripts/verify-prayerapp/`. They honor:

- `PRAYERAPP_VERIFY_RUN_ID`
- `PRAYERAPP_VERIFY_PORT`
- `PRAYERAPP_VERIFY_URL` (drive scripts)

First Playwright run may download Chromium (`npx playwright install chromium` is invoked by drive scripts when needed).

## Maintenance

When routes, login copy, or admin guards change, update the matching file under `features/` and re-run the affected drive script. Use `/maintain-verification-skill` (pstack) for a structured pass.
