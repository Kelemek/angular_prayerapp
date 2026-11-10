# Admin — Post verse prayer modal

Admins post **Verse Memorization of the Week** from **Admin → Settings → Content**: passage picker → **Post verse prayer** bottom sheet (`app-modal-shell`, `titleId="verse-send-title"`) with optional message textarea `#verse-send-admin-message` and **Post** footer. Uses `visualViewport` shrink + scroll so keyboard does not hide **Post** on mobile.

## Sub-features

- **manager-section** — `#verse-memorization-prayer-manager-trigger`, **Add Verse Prayer**.
- **passage-picker** — `app-bible-passage-picker-modal` (continue → send panel).
- **send-panel** — bottom sheet with scripture preview + `#verse-send-admin-message` + Post control in `modal-chrome-footer`.

## How to get to it (user POV)

- Admin MFA → `/admin` → Settings → expand **Verse Memorization of the Week** → **Add Verse Prayer** → confirm passage → optional message → **Post**.

## Driving it with Playwright (npx)

Preconditions:

- `is_admin` test account on `jcdhajfqtzipltvfslhu` only — never production.
- `PRAYERAPP_VERIFY_STORAGE_STATE` after operator completes admin MFA (optional for partial automation).

Steps:

- `scripts/verify-prayerapp/drive-verse-prayer-modal.sh`
- **With admin storage state:** may stop at Bible picker (partial); operator must confirm a passage and capture **Post verse prayer** sheet + keyboard overlap manually.
- **Without MFA:** admin login gate screenshot, **inconclusive**.

## Gotchas

- Publishing is immediate (no approvals queue); do not run against prod.
- Send-notification dialog after Post is a separate modal — not covered by the gate script.
- Distinct from `/info` memorize **practice** preview ([Info interactive preview](./info-interactive-preview.md)).
