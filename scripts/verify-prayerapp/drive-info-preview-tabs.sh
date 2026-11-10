#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

BASE="${PRAYERAPP_VERIFY_URL}/info"
OUT_PNG="${EVIDENCE_DIR}/info-preview-tabs.png"
OUT_TXT="${EVIDENCE_DIR}/info-preview-tabs.txt"

# Exercise Church (default), Group, Personal, Memorize preview tabs on /info.
PW_URL="${BASE}" \
PW_SCREENSHOT="${OUT_PNG}" \
PW_WAIT_SELECTOR=".info-page-feature-overview" \
PW_VIEWPORT_W=390 \
PW_VIEWPORT_H=844 \
PW_STEPS='[
  {"scrollIntoView":".info-page-feature-overview"},
  {"click":"button[title=\"Show group prayers\"]","waitMs":600},
  {"waitSelector":"[aria-label=\"About prayer groups\"]"},
  {"click":"[aria-label=\"About prayer groups\"] [aria-label=\"Close dialog\"]","waitMs":400},
  {"click":"button[title=\"Show your personal prayers\"]","waitMs":400},
  {"click":"#tour-filter-memorize","waitMs":400},
  {"click":"button[title=\"Show church prayers\"]","waitMs":400},
  {"waitSelector":"#tour-filter-memorize"}
]' \
  playwright_drive

write_drive_transcript "${OUT_TXT}" \
  feature info-preview-tabs \
  url "${BASE}" \
  selector ".info-page-feature-overview" \
  screenshot "${OUT_PNG}" \
  status ok

echo "[drive-info-preview-tabs] Wrote ${OUT_PNG} and ${OUT_TXT}"
