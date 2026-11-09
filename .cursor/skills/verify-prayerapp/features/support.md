# Support page

Public `/support` help copy (no auth).

## Sub-features

- **help-copy** — static support and contact guidance.

## How to get to it (user POV)

- Open `/support` directly or from app links.

## Driving it with Playwright (npx)

Preconditions:

- `launch.sh` + `doctor.sh` OK.

Steps:

- Run `scripts/verify-prayerapp/drive-support.sh`.
- Expect `evidence/support.png` with **Support** `h1`.

## Gotchas

- No ticket system in-page; operational contact is via church staff.
