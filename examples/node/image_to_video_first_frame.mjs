import { readFileSync } from "node:fs";
import { basename } from "node:path";

const key = process.env.CHEAPBUDDY_API_KEY;
const path = process.argv[2];
if (!key) {
  console.error("export CHEAPBUDDY_API_KEY first");
  process.exit(1);
}
if (!path) {
  console.error("usage: node image_to_video_first_frame.mjs /path/to/first-frame.jpg");
  process.exit(1);
}
const prompt =
  process.env.PROMPT ||
  "Character stands by a snowy riverside holding a bowl, then slips into shallow water.";
const buf = readFileSync(path);
const form = new FormData();
form.set("model", "MiniMax-H3");
form.set("prompt", prompt);
form.set("seconds", "15");
form.set("ratio", "9:16");
form.set("resolution", "768P");
form.set("first_frame", new Blob([buf], { type: "image/jpeg" }), basename(path));
const res = await fetch("https://api.cheapbuddy.cc/v1/videos", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Idempotency-Key": `i2v-${Date.now()}`,
  },
  body: form,
});
console.log(await res.text());
if (!res.ok) process.exit(1);
