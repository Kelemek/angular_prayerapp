#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

OUT_PNG="${EVIDENCE_DIR}/verse-prayer-modal.png"
OUT_TXT="${EVIDENCE_DIR}/verse-prayer-modal.txt"
ADMIN_URL="${PRAYERAPP_VERIFY_URL}/admin"

if [[ -n "${PRAYERAPP_VERIFY_STORAGE_STATE:-}" && -f "${PRAYERAPP_VERIFY_STORAGE_STATE}" ]]; then
  PW_URL="${ADMIN_URL}" \
  PW_SCREENSHOT="${OUT_PNG}" \
  PW_STORAGE_STATE="${PRAYERAPP_VERIFY_STORAGE_STATE}" \
  PW_VIEWPORT_W=390 \
  PW_VIEWPORT_H=844 \
  PW_STEPS='[
    {"waitSelector":"#verse-memorization-prayer-manager-trigger","timeoutMs":60000},
    {"click":"#verse-memorization-prayer-manager-trigger","waitMs":400},
    {"click":"button:has-text(\"Add Verse Prayer\")","waitMs":600},
    {"waitSelector":"app-bible-passage-picker-modal"}
  ]' \
    playwright_drive
  write_drive_transcript "${OUT_TXT}" \
    feature verse-prayer-modal \
    url "${ADMIN_URL}" \
    selector "app-bible-passage-picker-modal" \
    screenshot "${OUT_PNG}" \
    status partial \
    note "Picker step only; Post verse prayer bottom sheet (#verse-send-title) needs passage confirm — finish manually for keyboard/scroll proof."
  echo "[drive-verse-prayer-modal] Wrote ${OUT_PNG} (admin storage state — partial)"
  exit 0
fi

playwright_screenshot "${ADMIN_URL}" "${OUT_PNG}" "#email"

write_drive_transcript "${OUT_TXT}" \
  feature verse-prayer-modal \
  url "${ADMIN_URL}" \
  selector "#email" \
  screenshot "${OUT_PNG}" \
  status inconclusive \
  reason "Admin Post verse prayer modal (titleId verse-send-title) requires is_admin MFA and PRAYERAPP_VERIFY_STORAGE_STATE."

echo "[drive-verse-prayer-modal] Inconclusive (no admin MFA); wrote ${OUT_PNG}"
