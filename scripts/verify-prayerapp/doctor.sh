#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "[doctor] Missing pid file ${PID_FILE} — run launch.sh first"
  exit 1
fi

PID="$(cat "${PID_FILE}")"
if ! kill -0 "${PID}" 2>/dev/null; then
  echo "[doctor] Process ${PID} is not running"
  exit 1
fi

CODE="$(curl -sf -o /dev/null -w '%{http_code}' "${PRAYERAPP_VERIFY_URL}/" || echo 000)"
if [[ "${CODE}" != "200" ]]; then
  echo "[doctor] GET / returned ${CODE}"
  exit 1
fi

BODY="$(curl -sf "${PRAYERAPP_VERIFY_URL}/index.html" || true)"
if [[ "${BODY}" != *"app-root"* ]]; then
  echo "[doctor] index.html missing app-root bootstrap"
  exit 1
fi

echo "[doctor] OK pid=${PID} url=${PRAYERAPP_VERIFY_URL} run_id=${PRAYERAPP_VERIFY_RUN_ID}"
