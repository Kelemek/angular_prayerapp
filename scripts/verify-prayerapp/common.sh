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

ensure_playwright_chromium() {
  npx --yes playwright@1.52.0 install chromium >/dev/null 2>&1 || true
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
