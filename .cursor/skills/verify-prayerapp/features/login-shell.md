# Login email shell

The church-code login screen where users enter email before MFA.

## Sub-features

- **email-field** — `#email` input with placeholder “Your email address”.
- **submit-label** — button “Send Verification Code” (do not click in automated runs unless operator approves sending email).

## How to get to it (user POV)

- Navigate to `/login`.
- Redirect from `/` or `/admin` when not authenticated.

## Driving it with Playwright (npx)

Preconditions:

- `launch.sh` + `doctor.sh` OK.

Steps:

- Run `scripts/verify-prayerapp/drive-login-shell.sh`.
- Expect `evidence/login-shell.png` with `#email` visible.

## Gotchas

- Clicking submit triggers real verification email via Supabase edge functions — **skip submit** in agent runs unless the operator opts in.
- RLS Phase 2 does not apply to this step; JWT is not required yet.
