#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

OUT_PNG="${EVIDENCE_DIR}/theme-picker.png"
OUT_TXT="${EVIDENCE_DIR}/theme-picker.txt"
URL="${PRAYERAPP_VERIFY_URL}/"

if [[ -n "${PRAYERAPP_VERIFY_STORAGE_STATE:-}" && -f "${PRAYERAPP_VERIFY_STORAGE_STATE}" ]]; then
  PW_URL="${URL}" \
  PW_SCREENSHOT="${OUT_PNG}" \
  PW_STORAGE_STATE="${PRAYERAPP_VERIFY_STORAGE_STATE}" \
  PW_VIEWPORT_W=390 \
  PW_VIEWPORT_H=844 \
  PW_STEPS='[
    {"click":"#tour-btn-settings","waitMs":800},
    {"waitSelector":"#tour-settings-theme"},
    {"click":"[data-settings-dropdown-trigger=\"user-settings-theme-family\"]","waitMs":400},
    {"waitSelector":"#user-settings-theme-family-listbox"},
    {"click":"[data-settings-dropdown-trigger=\"user-settings-theme-family\"]","waitMs":200},
    {"click":"[data-settings-dropdown-trigger=\"user-settings-theme-mode\"]","waitMs":400},
    {"waitSelector":"#user-settings-theme-mode-listbox"}
  ]' \
    playwright_drive
  write_drive_transcript "${OUT_TXT}" \
    feature theme-picker \
    url "${URL}" \
    selector "#tour-settings-theme" \
    screenshot "${OUT_PNG}" \
    status ok \
    note "Family listbox should show 4 options; mode listbox 3 — all visible without scroll at 390px width."
  echo "[drive-theme-picker] Wrote ${OUT_PNG} (signed-in)"
  exit 0
fi

playwright_screenshot "${URL}" "${OUT_PNG}" "#email"

write_drive_transcript "${OUT_TXT}" \
  feature theme-picker \
  url "${URL}" \
  selector "#email" \
  screenshot "${OUT_PNG}" \
  status inconclusive \
  reason "Settings theme picker (#tour-settings-theme) requires MFA; export Playwright storage to PRAYERAPP_VERIFY_STORAGE_STATE after login."

echo "[drive-theme-picker] Inconclusive (no MFA); wrote ${OUT_PNG}"
