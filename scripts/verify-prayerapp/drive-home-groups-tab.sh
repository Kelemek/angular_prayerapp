#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

OUT_PNG="${EVIDENCE_DIR}/home-groups-tab.png"
OUT_TXT="${EVIDENCE_DIR}/home-groups-tab.txt"
URL="${PRAYERAPP_VERIFY_URL}/"

if [[ -n "${PRAYERAPP_VERIFY_STORAGE_STATE:-}" && -f "${PRAYERAPP_VERIFY_STORAGE_STATE}" ]]; then
  PW_URL="${URL}" \
  PW_SCREENSHOT="${OUT_PNG}" \
  PW_STORAGE_STATE="${PRAYERAPP_VERIFY_STORAGE_STATE}" \
  PW_WAIT_SELECTOR="app-home" \
  PW_VIEWPORT_W=390 \
  PW_VIEWPORT_H=844 \
  PW_STEPS='[
    {"click":"#tour-filter-groups","waitMs":800},
    {"waitSelector":"#tour-filter-groups"}
  ]' \
    playwright_drive
  write_drive_transcript "${OUT_TXT}" \
    feature home-groups-tab \
    url "${URL}" \
    selector "#tour-filter-groups" \
    screenshot "${OUT_PNG}" \
    status ok
  echo "[drive-home-groups-tab] Wrote ${OUT_PNG} (signed-in storage state)"
  exit 0
fi

# Unauthenticated: prove home gate only; real Group tab needs MFA.
playwright_screenshot "${URL}" "${OUT_PNG}" "#email"

write_drive_transcript "${OUT_TXT}" \
  feature home-groups-tab \
  url "${URL}" \
  selector "#email" \
  screenshot "${OUT_PNG}" \
  status inconclusive \
  reason "Home Group tab requires MFA session; set PRAYERAPP_VERIFY_STORAGE_STATE after operator login, or use drive-info-preview-groups.sh for public mock."

echo "[drive-home-groups-tab] Inconclusive (no MFA); wrote gate screenshot ${OUT_PNG}"
