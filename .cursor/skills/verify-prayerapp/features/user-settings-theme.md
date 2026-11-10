# User settings and theme picker

Signed-in users open Settings (`#tour-btn-settings`) to manage profile, notifications, and **Theme Preference** (`#tour-settings-theme`): two dropdowns — **Family** (Default, High Contrast, Blossom, Christmas) and **Mode** (Light, Dark, System). **Seven** selectable rows across both open listboxes (4 + 3); icons use `app-theme-select-dropdown` with tour ids such as `#tour-settings-theme-high-contrast`, `#tour-settings-theme-blossom`, `#tour-settings-theme-christmas`, and `#tour-settings-theme-mode-system`.

## Sub-features

- **settings-modal** — `app-user-settings`, `settings-modal-panel`.
- **theme-family-dropdown** — `[data-settings-dropdown-trigger="user-settings-theme-family"]`, listbox `#user-settings-theme-family-listbox`.
- **theme-mode-dropdown** — `[data-settings-dropdown-trigger="user-settings-theme-mode"]`, listbox `#user-settings-theme-mode-listbox`.
- **notification-toggles** — email preferences where exposed to the member.

## How to get to it (user POV)

- Home (signed in) → Settings → **Theme Preference** → open Family and Mode lists; at phone width (~390px) all options should appear without scrolling the listbox.

## Driving it with Playwright (npx)

Preconditions:

- MFA session on test Supabase only (`jcdhajfqtzipltvfslhu`).
- Optional: `PRAYERAPP_VERIFY_STORAGE_STATE` path to a saved Playwright session after operator login.

Steps:

- `scripts/verify-prayerapp/drive-theme-picker.sh`
- **With storage state:** opens both dropdowns at 390×844; evidence should show four family + three mode rows with icons.
- **Without MFA:** **inconclusive** (login gate screenshot only).
- `/info` **theme toggle** is light/dark only — not the seven-option picker.

## Gotchas

- **System** is mode-only (follows OS within the selected family).
- Theme persists via `themeFamily` + `themeMode` in localStorage; each drive uses a fresh context unless storage state is provided.
- Capacitor/iOS layout differs; this skill targets `ng serve` web unless operator records native separately.
