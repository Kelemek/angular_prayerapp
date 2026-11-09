# Privacy page

Public `/privacy` policy (no auth). Useful to prove secondary public routes and scripture attribution copy.

## Sub-features

- **policy-body** — headings and memorization attribution sections render.

## How to get to it (user POV)

- Open `/privacy` from footer, support copy, or direct URL.

## Driving it with Playwright (npx)

Preconditions:

- `launch.sh` + `doctor.sh` OK.

Steps:

- Run `scripts/verify-prayerapp/drive-privacy.sh`.
- Expect `evidence/privacy.png` with **Privacy Policy** `h1`.

## Gotchas

- Does not exercise memorization data APIs.
- “Back to app” links to `/` which will redirect unauthenticated users to login.
