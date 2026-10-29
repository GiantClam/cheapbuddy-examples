# cheapbuddy-examples

Copy-paste examples for [CheapBuddy](https://cheapbuddy.cc) — an OpenAI-compatible image & video API.

- Docs: https://cheapbuddy.cc/api-docs/
- Base URL: `https://api.cheapbuddy.cc`

## Setup

```bash
cp .env.example .env
# put your key in CHEAPBUDDY_API_KEY, or:
export CHEAPBUDDY_API_KEY='your_key'
```

## Quickstart

- [English](docs/quickstart.md)
- [中文](docs/quickstart.zh.md)

## Examples

| Path | What it does |
|---|---|
| `examples/bash/text_to_video.sh` | Text → video task |
| `examples/bash/image_to_video_first_frame.sh` | First-frame image → video |
| `examples/bash/poll_and_download.sh` | Poll + download MP4 |
| `examples/python/` | Same flows in Python (`requests`) |
| `examples/node/` | Same flows in Node (native `fetch`) |

## Honest limitations (MiniMax-H3)

- Public field is **`ratio`**, not `aspect_ratio`.
- Do **not** mix `first_frame` / `last_frame` with `reference_image` (`frame and reference roles cannot be mixed`).
- This route may reject an `images` field — use documented fields.
- If you see `upstream prompt optimization failed` on I2V, re-encode the first frame to about **720×1280 JPEG** and retry.
- After `completed`, download via `GET /v1/videos/{id}/content` (no upstream URL in the status JSON).
- Prefer a unique `Idempotency-Key` on multipart uploads.

## License

MIT

## Community
- Discord: https://discord.gg/YWRu7UeaXn
- V2EX promo: https://www.v2ex.com/t/1252941
