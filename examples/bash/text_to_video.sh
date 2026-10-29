#!/usr/bin/env bash
set -euo pipefail
: "${CHEAPBUDDY_API_KEY:?export CHEAPBUDDY_API_KEY first}"
IDEMPOTENCY_KEY="${IDEMPOTENCY_KEY:-t2v-$(date +%s)-$$}"
curl -sS -X POST 'https://api.cheapbuddy.cc/v1/videos' \
  -H "Authorization: Bearer ${CHEAPBUDDY_API_KEY}" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -F 'model=MiniMax-H3' \
  -F 'prompt=A paper boat floats on a blue pond at dusk.' \
  -F 'seconds=6' \
  -F 'ratio=16:9' \
  -F 'resolution=768P'
echo
