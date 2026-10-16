#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "[cleanup] No pid file — nothing to stop"
  exit 0
fi

PID="$(cat "${PID_FILE}")"
if kill -0 "${PID}" 2>/dev/null; then
  kill "${PID}" 2>/dev/null || true
  wait "${PID}" 2>/dev/null || true
  echo "[cleanup] Stopped ng serve pid ${PID}"
else
  echo "[cleanup] pid ${PID} already stopped"
fi

rm -f "${PID_FILE}"
echo "[cleanup] Evidence preserved at ${EVIDENCE_DIR}"
