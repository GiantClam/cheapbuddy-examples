#!/usr/bin/env bash
set -euo pipefail
: "${CHEAPBUDDY_API_KEY:?export CHEAPBUDDY_API_KEY first}"
IMAGE_PATH="${1:-./first-frame.jpg}"
if [[ ! -f "$IMAGE_PATH" ]]; then
  echo "usage: $0 /path/to/first-frame.jpg" >&2
  exit 1
fi
IDEMPOTENCY_KEY="${IDEMPOTENCY_KEY:-i2v-$(date +%s)-$$}"
PROMPT="${PROMPT:-Character stands by a snowy riverside holding a bowl, then slips into shallow water.}"
curl -sS -X POST 'https://api.cheapbuddy.cc/v1/videos' \
  -H "Authorization: Bearer ${CHEAPBUDDY_API_KEY}" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -F 'model=MiniMax-H3' \
  --form-string "prompt=${PROMPT}" \
  -F 'seconds=15' \
  -F 'ratio=9:16' \
  -F 'resolution=768P' \
  -F "first_frame=@${IMAGE_PATH};type=image/jpeg"
echo
