# Home groups tab

Signed-in **church members** open **Group** on Home (`#tour-filter-groups`) to browse group prayer catalogs, use the **+** chip (add choice / explainer), and filter with **Current / Answered / Total** plus named group chips.

## Sub-features

- **groups-tab** — `activeFilter === 'groups'`, panel `app-home-groups-panel`.
- **groups-add-chip** — **+** opens add flow or explainer when no groups.
- **groups-filter-chips** — status chips and `selectedId` group chip filter the list.

## How to get to it (user POV)

- MFA login → Home → **Group** tab → tap status or group chips.

## Driving it with Playwright (npx)

Preconditions:

- Test Supabase `jcdhajfqtzipltvfslhu` with group data for the test member.
- MFA session; optional `PRAYERAPP_VERIFY_STORAGE_STATE` (Playwright storage export path).

Steps:

- `scripts/verify-prayerapp/drive-home-groups-tab.sh`
- **With storage state:** screenshot shows `#tour-filter-groups` selected and group chips.
- **Without MFA:** script saves login gate screenshot and marks **inconclusive** (see transcript).
- Public stand-in: [Info interactive preview](./info-interactive-preview.md) → `drive-info-preview-groups.sh`.

## Gotchas

- Group-only subscribers may not see Church tabs; verify account type matches intent.
- Submitting group prayers mutates test data — use disposable test accounts.
