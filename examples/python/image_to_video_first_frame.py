#!/usr/bin/env python3
import os, sys, uuid, requests

API = "https://api.cheapbuddy.cc"
KEY = os.environ.get("CHEAPBUDDY_API_KEY")
if not KEY:
    raise SystemExit("export CHEAPBUDDY_API_KEY first")
if len(sys.argv) < 2:
    raise SystemExit(f"usage: {sys.argv[0]} /path/to/first-frame.jpg")

path = sys.argv[1]
prompt = os.environ.get(
    "PROMPT",
    "Character stands by a snowy riverside holding a bowl, then slips into shallow water.",
)
headers = {
    "Authorization": f"Bearer {KEY}",
    "Idempotency-Key": f"i2v-{uuid.uuid4()}",
}
with open(path, "rb") as f:
    files = {
        "model": (None, "MiniMax-H3"),
        "prompt": (None, prompt),
        "seconds": (None, "15"),
        "ratio": (None, "9:16"),
        "resolution": (None, "768P"),
        "first_frame": ("first-frame.jpg", f, "image/jpeg"),
    }
    r = requests.post(f"{API}/v1/videos", headers=headers, files=files, timeout=300)
r.raise_for_status()
print(r.json())
