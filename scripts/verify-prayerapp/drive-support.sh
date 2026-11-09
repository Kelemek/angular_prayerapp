#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

OUT_PNG="${EVIDENCE_DIR}/support.png"
OUT_TXT="${EVIDENCE_DIR}/support.txt"
URL="${PRAYERAPP_VERIFY_URL}/support"

playwright_screenshot "${URL}" "${OUT_PNG}" "h1"

{
  echo "feature=support"
  echo "url=${URL}"
  echo "selector=h1"
  echo "screenshot=${OUT_PNG}"
  echo "status=ok"
} >"${OUT_TXT}"

echo "[drive-support] Wrote ${OUT_PNG} and ${OUT_TXT}"
