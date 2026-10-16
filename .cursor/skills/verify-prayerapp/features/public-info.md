# Public info page

Visitors can open the marketing/info experience without signing in. Proves the Angular app boots and public routing works.

## Sub-features

- **info-shell** — `/info` renders the hero and page chrome.

## How to get to it (user POV)

- Open `/info` directly (bookmark, email link, or type URL).

## Driving it with Playwright (npx)

Preconditions:

- `launch.sh` + `doctor.sh` OK.

Steps:

- Run `scripts/verify-prayerapp/drive-public-info.sh`.
- Expect `evidence/public-info.png` showing `.info-page-shell` and hero title text **Cross Pointe** / **Prayer Community**.

## Gotchas

- Does not exercise Supabase RLS or prayer data.
- Branding images load from `/CrossPointPrayer.jpg`; offline CDN issues can break hero image but shell should still appear.
