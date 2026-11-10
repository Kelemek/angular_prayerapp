# Info interactive preview (`/info`)

Public marketing page with a **mock Home** that mirrors main tabs **Church → Group → Personal → Memorize** (PR #160). No auth required; proves layout parity and preview modals.

## Sub-features

- **info-shell** — hero, CTAs, `.info-page-shell`.
- **preview-tabs** — four equal-width folder tabs in `.info-page-feature-overview`.
- **preview-groups** — Group tab **+**, status chips, **Larson Family** / **Care Team** filters.
- **preview-memorize** — Memorize chips and sample verse card → practice carousel modal.

## How to get to it (user POV)

- Open `/info`, scroll to **Feature overview**.

## Driving it with Playwright (npx)

Preconditions:

- `launch.sh` + `doctor.sh` OK.

Steps:

| Script | Proves |
|--------|--------|
| `drive-public-info.sh` | Shell + hero (quick smoke). |
| `drive-info-preview-tabs.sh` | All four main tabs at 390×844. |
| `drive-info-preview-groups.sh` | Group chips and group filter toggle. |
| `drive-info-memorize-practice-modal.sh` | Memorize practice carousel overlay. |

Selectors:

- Overview: `.info-page-feature-overview`
- Group tab: `button[title="Show group prayers"]`
- Memorize tab: `#tour-filter-memorize`
- Practice entry: `button[aria-label="See how verse practice works"]`
- Practice modal: `[aria-label="How verse practice works"]`

## Gotchas

- Group explainer modal opens on **first** Group tab visit in a fresh session; `drive-info-preview-groups.sh` may not capture it unless steps are extended.
- This is **not** live Supabase data; use [Home groups tab](./home-groups-tab.md) for real JWT flows.
- Replaces the older “Church → Personal → Memorize only” map — always include **Group** when describing `/info`.
