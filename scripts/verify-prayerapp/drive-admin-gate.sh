#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
"${ROOT}/scripts/verify-prayerapp/doctor.sh" >/dev/null

OUT_PNG="${EVIDENCE_DIR}/admin-gate.png"
OUT_TXT="${EVIDENCE_DIR}/admin-gate.txt"
URL="${PRAYERAPP_VERIFY_URL}/admin"

# Unauthenticated users should land on login with returnUrl (may take a moment for guards).
playwright_screenshot "${URL}" "${OUT_PNG}" "#email"

if [[ "$(curl -sf -o /dev/null -w '%{url_effective}' "${PRAYERAPP_VERIFY_URL}/admin" 2>/dev/null || echo "")" == *"login"* ]]; then
  GATE_NOTE="curl suggests login redirect"
else
  GATE_NOTE="rely on screenshot URL bar / login UI"
fi

{
  echo "feature=admin-gate"
  echo "url=${URL}"
  echo "selector=#email"
  echo "screenshot=${OUT_PNG}"
  echo "note=${GATE_NOTE}"
  echo "status=ok"
} >"${OUT_TXT}"

echo "[drive-admin-gate] Wrote ${OUT_PNG} and ${OUT_TXT}"
