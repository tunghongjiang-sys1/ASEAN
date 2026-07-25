#!/usr/bin/env bash




set -euo pipefail

PORT="${PORT:-8765}"
BASE="http://127.0.0.1:${PORT}"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${BACKEND_DIR}/.venv"

echo "==> backend dir: ${BACKEND_DIR}"
echo "==> venv: ${VENV_DIR}"
echo "==> port: ${PORT}"


if [ ! -d "${VENV_DIR}" ]; then
  python3 -m venv "${VENV_DIR}"
fi

source "${VENV_DIR}/bin/activate"

echo "==> installing python deps"
python -m pip install -q --upgrade pip
python -m pip install -q -r "${BACKEND_DIR}/requirements.txt"


echo "==> booting uvicorn on port ${PORT}"
(cd "${BACKEND_DIR}" && PORT="${PORT}" python -m uvicorn main:app --host 127.0.0.1 --port "${PORT}" --log-level warning) &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null || true; wait "${SERVER_PID}" 2>/dev/null || true' EXIT


echo "==> waiting for /health"
for i in $(seq 1 25); do
  if curl -sf "${BASE}/health" >/dev/null 2>&1; then
    echo "    reached /health after ${i} attempts"
    break
  fi
  sleep 0.4
done

HEALTH="$(curl -sf "${BASE}/health")"
if [ -z "${HEALTH}" ]; then
  echo "!! /health never responded"
  exit 1
fi
echo "==> /health: ${HEALTH}"


echo "==> fixture /chat (no openrouter key -> local_fallback expected)"
CHAT="$(curl -sf -X POST "${BASE}/chat" \
  -H "Content-Type: application/json" \
  -d '{"question":"plan bali 3 days","saved_place_ids":["indonesia-bali"],"preferred_categories":["Coastline/islands"]}')"
if [ -z "${CHAT}" ] || ! echo "${CHAT}" | grep -q '"reply"'; then
  echo "!! /chat did not return a reply envelope"
  echo "${CHAT}"
  exit 1
fi
echo "==> /chat reply: $(echo "${CHAT}" | head -c 120)…"


echo "==> fixture /flights?to=DPS (no aviationstack key -> synthetic expected)"
FLIGHT="$(curl -sf "${BASE}/flights?to=DPS")"
if [ -z "${FLIGHT}" ] || ! echo "${FLIGHT}" | grep -q '"flights"'; then
  echo "!! /flights did not return a flights envelope"
  echo "${FLIGHT}"
  exit 1
fi
COUNT="$(echo "${FLIGHT}" | grep -o '"flightNumber"' | wc -l | tr -d ' ')"
LIVE="$(echo "${FLIGHT}" | grep -o '"live":[a-z]*' | head -1)"
echo "==> /flights: ${COUNT} synthetic seats, ${LIVE}"

if [ "${COUNT}" -lt 1 ]; then
  echo "!! /flights returned 0 flights"
  exit 1
fi

echo "==> okay. backend wired end-to-end."
