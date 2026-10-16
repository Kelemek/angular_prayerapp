#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=scripts/verify-prayerapp/common.sh
source "$(dirname "$0")/common.sh"

ROOT="$(repo_root)"
if [[ -f "${PID_FILE}" ]] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null; then
  echo "[verify-prayerapp] Server already running (pid $(cat "${PID_FILE}")) on ${PRAYERAPP_VERIFY_URL}"
  exit 0
fi

cd "$ROOT"
npx ng serve --port "${PRAYERAPP_VERIFY_PORT}" --host 127.0.0.1 >"${LOG_FILE}" 2>&1 &
echo $! >"${PID_FILE}"

echo "[verify-prayerapp] Waiting for dev server on ${PRAYERAPP_VERIFY_URL} (log: ${LOG_FILE})"
for _ in $(seq 1 120); do
  if curl -sf -o /dev/null "${PRAYERAPP_VERIFY_URL}/"; then
    if "${ROOT}/scripts/verify-prayerapp/doctor.sh"; then
      echo "[verify-prayerapp] Ready at ${PRAYERAPP_VERIFY_URL}"
      exit 0
    fi
  fi
  sleep 1
done

echo "[verify-prayerapp] Timed out starting dev server. Last log lines:"
tail -n 40 "${LOG_FILE}" || true
exit 1
