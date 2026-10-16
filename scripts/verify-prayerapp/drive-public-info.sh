#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

OUT_PNG="${EVIDENCE_DIR}/public-info.png"
OUT_TXT="${EVIDENCE_DIR}/public-info.txt"
URL="${PRAYERAPP_VERIFY_URL}/info"

playwright_screenshot "${URL}" "${OUT_PNG}" ".info-page-shell"

{
  echo "feature=public-info"
  echo "url=${URL}"
  echo "selector=.info-page-shell"
  echo "screenshot=${OUT_PNG}"
  echo "status=ok"
} >"${OUT_TXT}"

echo "[drive-public-info] Wrote ${OUT_PNG} and ${OUT_TXT}"
