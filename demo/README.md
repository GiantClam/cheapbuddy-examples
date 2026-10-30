# MiniMax-H3 first-frame demo

One static page: upload an image, write a prompt, pick a duration, then play or download the MP4.

It follows `examples/bash/image_to_video_first_frame.sh` and `examples/bash/poll_and_download.sh`.

## Open it

No install and no server-side key.

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/demo/`. Opening `demo/index.html` directly, or publishing the repo on GitHub Pages and visiting `/demo/`, is the same page.

## Bring your own key

Paste a CheapBuddy API key into the form. The page saves it in `localStorage` under `cheapbuddy.apiKey`. Requests use `Authorization: Bearer …` and go only to `https://api.cheapbuddy.cc`. **Forget key** removes it from this browser. The page has no account system and no backend of its own.

A finished video is billed to that key. Stopping the poll only stops this tab; a task the API already accepted can still finish.

## Resize

Leave **Resize to 720×1280 JPEG** on (it starts checked). Before upload, the page redraws the image on a canvas to 720×1280 and encodes a JPEG named `first-frame.jpg`.

That matches the known image-to-video failure: a large or awkwardly encoded first frame often returns `upstream prompt optimization failed`. Text-to-video on the same key can still succeed. Re-encoding to about 720×1280 JPEG is the fix that has been reliable.

There is no reference-image control. The multipart body is `first_frame` only. Mixing in `reference_image` returns `frame and reference roles cannot be mixed`.

## What it sends

`POST /v1/videos` as `multipart/form-data`, with a new `Idempotency-Key` (`i2v-…`) on each submit:

| Field | Value |
|---|---|
| `model` | `MiniMax-H3` |
| `prompt` | the text you enter |
| `seconds` | integer 4–15 (default 15) |
| `ratio` | `9:16` |
| `resolution` | `768P` |
| `first_frame` | the JPEG, or the original file if resize is off |

The page then polls `GET /v1/videos/{id}` about every 5 seconds until `completed` or `failed`, and downloads `GET /v1/videos/{id}/content`.

## Browser origin

Checked on 2026-10-30: `api.cheapbuddy.cc` answers browser preflight with `Access-Control-Allow-Origin: https://cheapbuddy.cc` and does not allow `localhost`, `file://`, or GitHub Pages. From those origins the button still builds the same request, and the status line explains the block. The key is not sent to any other host. Serving this folder on `https://cheapbuddy.cc`, or allowlisting the page origin on the API, is what lets Generate run.
