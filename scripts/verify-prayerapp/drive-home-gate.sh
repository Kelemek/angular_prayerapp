#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

OUT_PNG="${EVIDENCE_DIR}/home-gate.png"
OUT_TXT="${EVIDENCE_DIR}/home-gate.txt"
URL="${PRAYERAPP_VERIFY_URL}/"

# Unauthenticated users should land on login with returnUrl for home.
playwright_screenshot "${URL}" "${OUT_PNG}" "#email"

{
  echo "feature=home-gate"
  echo "url=${URL}"
  echo "selector=#email"
  echo "screenshot=${OUT_PNG}"
  echo "status=ok"
} >"${OUT_TXT}"

echo "[drive-home-gate] Wrote ${OUT_PNG} and ${OUT_TXT}"
