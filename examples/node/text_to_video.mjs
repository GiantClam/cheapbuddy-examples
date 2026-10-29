const key = process.env.CHEAPBUDDY_API_KEY;
if (!key) {
  console.error("export CHEAPBUDDY_API_KEY first");
  process.exit(1);
}
const form = new FormData();
form.set("model", "MiniMax-H3");
form.set("prompt", "A paper boat floats on a blue pond at dusk.");
form.set("seconds", "6");
form.set("ratio", "16:9");
form.set("resolution", "768P");
const res = await fetch("https://api.cheapbuddy.cc/v1/videos", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Idempotency-Key": `t2v-${Date.now()}`,
  },
  body: form,
});
console.log(await res.text());
if (!res.ok) process.exit(1);
