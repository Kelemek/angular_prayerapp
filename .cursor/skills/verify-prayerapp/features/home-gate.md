# Home route gate

`/` is protected by `siteAuthGuard`. Unsigned users should not see prayer catalogs.

## Sub-features

- **login-redirect** — visiting `/` without a session shows login with `returnUrl` for home.

## How to get to it (user POV)

- Open the app root URL while logged out (bookmark, deep link, or default route).

## Driving it with Playwright (npx)

Preconditions:

- `launch.sh` + `doctor.sh` OK.
- Fresh Playwright context (no persisted MFA session).

Steps:

- Run `scripts/verify-prayerapp/drive-home-gate.sh`.
- Expect `evidence/home-gate.png` showing login `#email`, not prayer cards.

## Gotchas

- Does not prove catalog load or RLS; pair with [Signed-in home](./home-signed-in.md) when an operator supplies MFA.
- Do not use production Supabase or the cp-church fork; dev `ng serve` must use test project `jcdhajfqtzipltvfslhu` only.
