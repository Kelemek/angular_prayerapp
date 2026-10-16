# Admin route gate

`/admin` is protected by `siteAuthGuard` and `adminGuard`. Unsigned users should not see admin tools.

## Sub-features

- **login-redirect** — visiting `/admin` without a session shows login with `returnUrl` containing `/admin`.

## How to get to it (user POV)

- Open `/admin` while logged out.

## Driving it with Playwright (npx)

Preconditions:

- `launch.sh` + `doctor.sh` OK.
- Clear site session (fresh browser context per Playwright run is sufficient).

Steps:

- Run `scripts/verify-prayerapp/drive-admin-gate.sh`.
- Expect `evidence/admin-gate.png` showing login `#email` (not admin chrome).

## Gotchas

- A stale MFA/local session in the operator’s normal browser is irrelevant; verification uses an isolated Playwright browser.
- Proving **admin refresh** after login needs a signed-in admin session — see admin-email-subscribers or extend with operator MFA.
