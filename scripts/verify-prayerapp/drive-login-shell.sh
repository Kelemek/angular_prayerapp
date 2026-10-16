#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

OUT_PNG="${EVIDENCE_DIR}/login-shell.png"
OUT_TXT="${EVIDENCE_DIR}/login-shell.txt"
URL="${PRAYERAPP_VERIFY_URL}/login"

playwright_screenshot "${URL}" "${OUT_PNG}" "#email"

{
  echo "feature=login-shell"
  echo "url=${URL}"
  echo "selector=#email"
  echo "screenshot=${OUT_PNG}"
  echo "status=ok"
} >"${OUT_TXT}"

echo "[drive-login-shell] Wrote ${OUT_PNG} and ${OUT_TXT}"
