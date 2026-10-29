#!/usr/bin/env bash
set -euo pipefail
: "${CHEAPBUDDY_API_KEY:?export CHEAPBUDDY_API_KEY first}"
TASK_ID="${1:?usage: $0 task_xxx [output.mp4]}"
OUT="${2:-output.mp4}"
while true; do
  resp=$(curl -sS "https://api.cheapbuddy.cc/v1/videos/${TASK_ID}" \
    -H "Authorization: Bearer ${CHEAPBUDDY_API_KEY}")
  echo "$resp"
  status=$(printf '%s' "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
  if [[ "$status" == "completed" ]]; then
    curl -sS "https://api.cheapbuddy.cc/v1/videos/${TASK_ID}/content" \
      -H "Authorization: Bearer ${CHEAPBUDDY_API_KEY}" \
      -o "$OUT"
    echo "saved $OUT"
    exit 0
  fi
  if [[ "$status" == "failed" ]]; then
    exit 1
  fi
  sleep 20
done
