#!/usr/bin/env bash
set -euo pipefail

export PRAYERAPP_VERIFY_RUN_ID="${PRAYERAPP_VERIFY_RUN_ID:-$(date +%s)}"
export PRAYERAPP_VERIFY_PORT="${PRAYERAPP_VERIFY_PORT:-4321}"
VERIFY_DIR="/tmp/prayerapp-verify-${PRAYERAPP_VERIFY_RUN_ID}"
export PRAYERAPP_VERIFY_DIR="$VERIFY_DIR"
export PRAYERAPP_VERIFY_URL="${PRAYERAPP_VERIFY_URL:-http://127.0.0.1:${PRAYERAPP_VERIFY_PORT}}"
PID_FILE="${VERIFY_DIR}/ng.pid"
LOG_FILE="${VERIFY_DIR}/ng.log"
EVIDENCE_DIR="${VERIFY_DIR}/evidence"

mkdir -p "$VERIFY_DIR" "$EVIDENCE_DIR"

repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

PW_MODULE_ROOT="${PW_MODULE_ROOT:-/tmp/prayerapp-verify-playwright}"

ensure_playwright_chromium() {
  npx --yes playwright@1.52.0 install chromium >/dev/null 2>&1 || true
}

ensure_playwright_module() {
  if [[ ! -d "${PW_MODULE_ROOT}/node_modules/playwright" ]]; then
    mkdir -p "${PW_MODULE_ROOT}"
    npm install --prefix "${PW_MODULE_ROOT}" --no-save playwright@1.52.0 >/dev/null
  fi
  export NODE_PATH="${PW_MODULE_ROOT}/node_modules${NODE_PATH:+:${NODE_PATH}}"
}

playwright_screenshot() {
  local url="$1"
  local outfile="$2"
  local selector="${3:-}"
  ensure_playwright_chromium
  if [[ -n "$selector" ]]; then
    npx --yes playwright@1.52.0 screenshot "$url" "$outfile" \
      --wait-for-selector "$selector" \
      --wait-for-timeout 60000
  else
    npx --yes playwright@1.52.0 screenshot "$url" "$outfile" \
      --wait-for-timeout 60000
  fi
}

# Interactive drive: PW_URL, PW_SCREENSHOT, optional PW_STEPS (JSON), PW_WAIT_SELECTOR, viewport, PW_FULL_PAGE.
playwright_drive() {
  local drive_script
  drive_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/playwright-drive.cjs"
  ensure_playwright_module
  ensure_playwright_chromium
  export PW_MODULE_ROOT
  PW_URL="${PW_URL:?playwright_drive requires PW_URL}" \
  PW_SCREENSHOT="${PW_SCREENSHOT:?playwright_drive requires PW_SCREENSHOT}" \
    node "$drive_script"
}

write_drive_transcript() {
  local outfile="$1"
  shift
  {
    while [[ $# -ge 2 ]]; do
      echo "$1=$2"
      shift 2
    done
  } >"$outfile"
}
