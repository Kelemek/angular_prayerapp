#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

BASE="${PRAYERAPP_VERIFY_URL}/info"
OUT_PNG="${EVIDENCE_DIR}/info-preview-groups.png"
OUT_TXT="${EVIDENCE_DIR}/info-preview-groups.txt"

# Group tab: + chip explainer modal, status chips, Larson/Care group filter chips.
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
  {"waitSelector":"button:has-text(\"Larson Family\")"},
  {"click":"button:has-text(\"Care Team\")","waitMs":400},
  {"click":"button:has-text(\"Larson Family\")","waitMs":300}
]' \
  playwright_drive

write_drive_transcript "${OUT_TXT}" \
  feature info-preview-groups \
  url "${BASE}" \
  selector "button[title=\"Show group prayers\"]" \
  screenshot "${OUT_PNG}" \
  status ok

echo "[drive-info-preview-groups] Wrote ${OUT_PNG} and ${OUT_TXT}"
