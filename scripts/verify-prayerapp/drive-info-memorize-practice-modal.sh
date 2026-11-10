#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

BASE="${PRAYERAPP_VERIFY_URL}/info"
OUT_PNG="${EVIDENCE_DIR}/info-memorize-practice-modal.png"
OUT_TXT="${EVIDENCE_DIR}/info-memorize-practice-modal.txt"

# Public info preview: Memorize tab → sample verse card → practice carousel modal.
PW_URL="${BASE}" \
PW_SCREENSHOT="${OUT_PNG}" \
PW_WAIT_SELECTOR=".info-page-feature-overview" \
PW_VIEWPORT_W=390 \
PW_VIEWPORT_H=844 \
PW_STEPS='[
  {"scrollIntoView":".info-page-feature-overview"},
  {"click":"#tour-filter-memorize","waitMs":400},
  {"click":"button[aria-label=\"See how verse practice works\"]","waitMs":600},
  {"waitSelector":"[aria-label=\"How verse practice works\"]"}
]' \
  playwright_drive

write_drive_transcript "${OUT_TXT}" \
  feature info-memorize-practice-modal \
  url "${BASE}" \
  selector "[aria-label=\"How verse practice works\"]" \
  screenshot "${OUT_PNG}" \
  status ok

echo "[drive-info-memorize-practice-modal] Wrote ${OUT_PNG} and ${OUT_TXT}"
