# Public info page (shell)

Visitors open `/info` without signing in. Quick smoke that the Angular app boots and the marketing shell renders.

## Sub-features

- **info-shell** — `.info-page-shell`, hero **Cross Pointe** / **Prayer Community**.

## How to get to it (user POV)

- Open `/info` directly.

## Driving it with Playwright (npx)

Preconditions:

- `launch.sh` + `doctor.sh` OK.

Steps:

- `scripts/verify-prayerapp/drive-public-info.sh` → `evidence/public-info.png`.
- For tabs, groups mock, and memorize preview modals see [Info interactive preview](./info-interactive-preview.md).

## Gotchas

- Does not exercise Supabase RLS or interactive tab flows (use info preview drives).
