# 5-minute Quickstart (video)

Goal: with one CheapBuddy API key, run **text-to-video** and **first-frame image-to-video**, then download an MP4.

Docs: [API Docs](https://cheapbuddy.cc/api-docs/) · Base URL: `https://api.cheapbuddy.cc`

## Setup

```bash
export CHEAPBUDDY_API_KEY='your_key'
export IDEMPOTENCY_KEY="demo-$(date +%s)-$$"
```

Auth: `Authorization: Bearer $CHEAPBUDDY_API_KEY`

Public field is **`ratio`** (not `aspect_ratio`). Public video model: `MiniMax-H3`. Resolution: **`768P`**. Duration: **`seconds` 4–15** (alias `duration`).

## 1) Text-to-video

```bash
curl -sS -X POST 'https://api.cheapbuddy.cc/v1/videos' \
  -H "Authorization: Bearer $CHEAPBUDDY_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -F 'model=MiniMax-H3' \
  -F 'prompt=A paper boat floats on a blue pond at dusk.' \
  -F 'seconds=6' \
  -F 'ratio=16:9' \
  -F 'resolution=768P'
```

Save the returned `id`.

## 2) First-frame image-to-video

Use **`first_frame` only**. Do **not** also send `reference_image` — upstream returns `frame and reference roles cannot be mixed`.

```bash
curl -sS -X POST 'https://api.cheapbuddy.cc/v1/videos' \
  -H "Authorization: Bearer $CHEAPBUDDY_API_KEY" \
  -H "Idempotency-Key: i2v-$(date +%s)-$$" \
  -F 'model=MiniMax-H3' \
  -F 'prompt=Character stands by a snowy riverside holding a bowl, then slips into shallow water.' \
  -F 'seconds=15' \
  -F 'ratio=9:16' \
  -F 'resolution=768P' \
  -F 'first_frame=@./first-frame.jpg;type=image/jpeg'
```

For identity lock via `reference_image`, use reference mode **without** `first_frame` / `last_frame`.

## 3) Poll

```bash
curl -sS "https://api.cheapbuddy.cc/v1/videos/${TASK_ID}" \
  -H "Authorization: Bearer $CHEAPBUDDY_API_KEY"
```

## 4) Download

```bash
curl -sS "https://api.cheapbuddy.cc/v1/videos/${TASK_ID}/content" \
  -H "Authorization: Bearer $CHEAPBUDDY_API_KEY" \
  -o output.mp4
```

## Common failures

| Symptom | Likely cause | Fix |
|---|---|---|
| `frame and reference roles cannot be mixed` | Mixed I2V + reference fields | Pick one mode |
| `upstream prompt optimization failed` | First-frame preprocess failed | Re-encode to ~720×1280 JPEG |
| `unsupported media field: images` | Field not accepted on this route | Use `first_frame` / `reference_image` |
