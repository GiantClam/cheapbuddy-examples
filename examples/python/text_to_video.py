#!/usr/bin/env python3
import os, time, uuid, requests

API = "https://api.cheapbuddy.cc"
KEY = os.environ.get("CHEAPBUDDY_API_KEY")
if not KEY:
    raise SystemExit("export CHEAPBUDDY_API_KEY first")

headers = {
    "Authorization": f"Bearer {KEY}",
    "Idempotency-Key": f"t2v-{uuid.uuid4()}",
}
files = {
    "model": (None, "MiniMax-H3"),
    "prompt": (None, "A paper boat floats on a blue pond at dusk."),
    "seconds": (None, "6"),
    "ratio": (None, "16:9"),
    "resolution": (None, "768P"),
}
r = requests.post(f"{API}/v1/videos", headers=headers, files=files, timeout=120)
r.raise_for_status()
print(r.json())
