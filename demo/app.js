(function () {
  const API = "https://api.cheapbuddy.cc";
  const MODEL = "MiniMax-H3";
  const RATIO = "9:16";
  const RESOLUTION = "768P";
  const KEY_STORAGE = "cheapbuddy.apiKey";
  const JOB_STORAGE = "cheapbuddy.i2v.job";
  const FRAME_W = 720;
  const FRAME_H = 1280;
  const POLL_MS = 5000;
  const MAX_POLL_MS = 30 * 60 * 1000;

  const form = document.querySelector("#composer");
  const keyInput = document.querySelector("#api-key");
  const showKey = document.querySelector("#show-key");
  const forgetKey = document.querySelector("#forget-key");
  const fileInput = document.querySelector("#image");
  const drop = document.querySelector("#drop");
  const fileMeta = document.querySelector("#file-meta");
  const resizeInput = document.querySelector("#resize");
  const promptInput = document.querySelector("#prompt");
  const secondsInput = document.querySelector("#seconds");
  const createButton = document.querySelector("#create");
  const stopButton = document.querySelector("#stop");
  const resumeButton = document.querySelector("#resume");
  const downloadLink = document.querySelector("#download");
  const frameEmpty = document.querySelector("#frame-empty");
  const frameImage = document.querySelector("#frame-image");
  const frameVideo = document.querySelector("#frame-video");
  const frameMeta = document.querySelector("#frame-meta");
  const statusEl = document.querySelector("#status");
  const meter = document.querySelector("#meter");
  const meterBar = document.querySelector("#meter-bar");
  const taskLine = document.querySelector("#task-line");
  const logEl = document.querySelector("#log");
  const rawEl = document.querySelector("#raw");

  let selectedFile = null;
  let assigningFile = false;
  let prepared = null;
  let prepareSeq = 0;
  let previewUrl = "";
  let videoUrl = "";
  let abortController = new AbortController();
  let busy = false;

  for (let seconds = 4; seconds <= 15; seconds += 1) {
    const option = document.createElement("option");
    option.value = String(seconds);
    option.textContent = String(seconds);
    if (seconds === 15) option.selected = true;
    secondsInput.append(option);
  }

  keyInput.value = readStorage(KEY_STORAGE) || "";
  keyInput.addEventListener("change", saveKey);
  keyInput.addEventListener("blur", saveKey);
  showKey.addEventListener("change", () => {
    keyInput.type = showKey.checked ? "text" : "password";
  });
  forgetKey.addEventListener("click", () => {
    keyInput.value = "";
    removeStorage(KEY_STORAGE);
    log("Forgot the saved API key on this browser.");
  });

  fileInput.addEventListener("change", () => {
    if (assigningFile) return;
    const file = fileInput.files && fileInput.files[0];
    if (file) takeFile(file);
  });
  ["dragenter", "dragover"].forEach((name) => {
    drop.addEventListener(name, (event) => {
      event.preventDefault();
      drop.classList.add("is-drag");
    });
  });
  ["dragleave", "drop"].forEach((name) => {
    drop.addEventListener(name, (event) => {
      event.preventDefault();
      drop.classList.remove("is-drag");
    });
  });
  drop.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) return;
    takeFile(file);
  });
  resizeInput.addEventListener("change", () => {
    if (selectedFile) refreshPrepared();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy) return;
    startCreate();
  });
  stopButton.addEventListener("click", () => {
    abortController.abort();
    setBusy(false);
    const job = storedJob();
    resumeButton.hidden = !job || job.status === "completed" || job.status === "failed";
    setStatus("Stopped polling in this tab. The task can still finish on the API.", "");
    log("Stopped polling. The accepted task was not cancelled.");
  });
  resumeButton.addEventListener("click", () => {
    const job = storedJob();
    if (!job || busy) return;
    resume(job);
  });

  const existing = storedJob();
  if (existing && existing.status !== "completed" && existing.status !== "failed") {
    resumeButton.hidden = false;
    taskLine.hidden = false;
    taskLine.textContent = existing.id;
    setStatus(`Task ${existing.id} is still in this tab. Resume polling when you want to check it.`, "");
  } else if (existing && existing.status === "completed") {
    taskLine.hidden = false;
    taskLine.textContent = existing.id;
    setStatus("The last task in this tab completed. Create a video to run another one.", "");
  } else if (existing && existing.status === "failed") {
    taskLine.hidden = false;
    taskLine.textContent = existing.id;
    setStatus(`Task ${existing.id} failed. Adjust the image or prompt and create another video.`, "is-error");
  } else {
    setStatus("Paste a key, add one image, then create a video.", "");
  }

  function takeFile(file) {
    if (!file || file === selectedFile) return;
    if (file.type && !file.type.startsWith("image/")) {
      setStatus("Choose an image file.", "is-error");
      return;
    }
    selectedFile = file;
    if (!fileInput.files || fileInput.files[0] !== file) {
      assigningFile = true;
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        fileInput.files = transfer.files;
      } catch {
        /* The selected file stays in memory even if the input cannot be rewritten. */
      } finally {
        assigningFile = false;
      }
    }
    fileMeta.textContent = `${file.name} · ${formatBytes(file.size)}`;
    refreshPrepared();
  }

  async function refreshPrepared() {
    const seq = ++prepareSeq;
    const file = selectedFile;
    if (!file) return;
    frameMeta.textContent = resizeInput.checked ? "Encoding 720×1280 JPEG…" : "Reading the original image…";
    try {
      const next = resizeInput.checked ? await encodeFirstFrame(file) : await describeOriginal(file);
      if (seq !== prepareSeq) return;
      prepared = next;
      showStill(next);
    } catch (error) {
      if (seq !== prepareSeq) return;
      prepared = null;
      setStatus(error.message || "Could not read that image.", "is-error");
    }
  }

  function showStill(next) {
    revokePreview();
    previewUrl = URL.createObjectURL(next.file);
    frameImage.src = previewUrl;
    frameImage.alt = "Prepared first frame";
    frameImage.hidden = false;
    frameVideo.hidden = true;
    frameEmpty.hidden = true;
    downloadLink.hidden = true;
    const kind = next.resized ? "720×1280 JPEG" : `${next.width}×${next.height} ${next.file.type || "image"}`;
    frameMeta.textContent = `Will send ${kind} · ${formatBytes(next.file.size)}`;
    if (!busy) setStatus("First frame is ready to send.", "");
  }

  async function startCreate() {
    saveKey();
    const key = currentKey();
    const prompt = promptInput.value.trim();
    const seconds = Number(secondsInput.value);
    if (!key) {
      setStatus("Paste an API key first.", "is-error");
      keyInput.focus();
      return;
    }
    if (!selectedFile || !prepared) {
      setStatus("Choose one image first.", "is-error");
      fileInput.focus();
      return;
    }
    if (!prompt) {
      setStatus("Enter a prompt.", "is-error");
      promptInput.focus();
      return;
    }
    if (!Number.isInteger(seconds) || seconds < 4 || seconds > 15) {
      setStatus("Seconds must be an integer from 4 to 15.", "is-error");
      return;
    }

    const previous = storedJob();
    resetAbort();
    setBusy(true);
    clearVideo();
    meter.hidden = true;
    meterBar.style.width = "0";
    setStatus("Uploading the first frame…", "");
    setRaw("Waiting for a task.");
    if (previous && previous.id) {
      log(`Starting a new task. Previous id ${previous.id} may still be running.`);
    }
    try {
      await createAndPoll({
        key,
        prompt,
        seconds,
        file: prepared.file,
        signal: abortController.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") return;
      setStatus(error.message || "The request failed.", "is-error");
      if (error.payload) setRaw(error.payload);
      log(error.network ? "Browser blocked the API response." : error.message || "The request failed.");
    } finally {
      setBusy(false);
      const job = storedJob();
      resumeButton.hidden = !job || job.status === "completed" || job.status === "failed";
    }
  }

  async function resume(job) {
    const key = currentKey();
    if (!key) {
      setStatus("Paste the API key to resume polling.", "is-error");
      keyInput.focus();
      return;
    }
    resetAbort();
    setBusy(true);
    setStatus(`Resuming ${job.id}…`, "");
    log(`Resume GET /v1/videos/${job.id}`);
    try {
    await pollAndFinish({
      key,
      id: job.id,
      signal: abortController.signal,
      immediate: true,
    });
    } catch (error) {
      if (error.name === "AbortError") return;
      setStatus(error.message || "Polling failed.", "is-error");
      if (error.payload) setRaw(error.payload);
      log(error.network ? "Browser blocked the API response." : error.message || "Polling failed.");
    } finally {
      setBusy(false);
      const stored = storedJob();
      resumeButton.hidden = !stored || stored.status === "completed" || stored.status === "failed";
    }
  }

  async function createAndPoll({ key, prompt, seconds, file, signal }) {
    const idempotencyKey = newIdempotencyKey();
    const body = new FormData();
    body.set("model", MODEL);
    body.set("prompt", prompt);
    body.set("seconds", String(seconds));
    body.set("ratio", RATIO);
    body.set("resolution", RESOLUTION);
    body.set("first_frame", file, file.name || "first-frame.jpg");

    log(`POST /v1/videos · ${idempotencyKey}`);
    const created = await requestJson(`${API}/v1/videos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Idempotency-Key": idempotencyKey,
      },
      body,
      signal,
    });
    if (!created.id) {
      throw apiError("The create response did not include an id.", created);
    }
    rememberJob({ id: created.id, status: created.status || "queued", startedAt: Date.now() });
    showTask(created);
    if (created.status === "failed") throw failedError(created);
    if (created.status === "completed") {
      await downloadContent(created.id, key, signal);
      return;
    }
    await pollAndFinish({
      key,
      id: created.id,
      signal,
      immediate: false,
    });
  }

  async function pollAndFinish({ key, id, signal, immediate }) {
    const deadline = Date.now() + MAX_POLL_MS;
    let misses = 0;
    let wait = !immediate;
    while (Date.now() < deadline) {
      if (wait) await sleep(POLL_MS, signal);
      wait = true;
      let snapshot;
      try {
        snapshot = await requestJson(`${API}/v1/videos/${encodeURIComponent(id)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${key}` },
          signal,
        });
        misses = 0;
      } catch (error) {
        if (error.name === "AbortError") throw error;
        if (error.network) throw error;
        misses += 1;
        log(`Poll error ${misses}/3: ${error.message}`);
        if (misses >= 3) throw error;
        continue;
      }
      showTask(snapshot);
      rememberJob({ id, status: snapshot.status || "queued", startedAt: Date.now() });
      if (snapshot.status === "completed") {
        await downloadContent(id, key, signal);
        return;
      }
      if (snapshot.status === "failed") throw failedError(snapshot);
    }
    resumeButton.hidden = false;
    throw apiError(`Still running after 30 minutes. Task ${id} is saved in this tab — use Resume polling.`, { id });
  }

  async function downloadContent(id, key, signal) {
    log(`GET /v1/videos/${id}/content`);
    setStatus("Downloading the MP4…", "");
    let response;
    try {
      response = await fetch(`${API}/v1/videos/${encodeURIComponent(id)}/content`, {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
        signal,
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw networkError(error);
    }
    const buffer = await response.arrayBuffer();
    const payload = sniffPayload(buffer, response);
    if (!response.ok || payload.json) {
      const data = payload.json || { raw: payload.text };
      throw apiError(messageFrom(data, response.status), data);
    }
    if (!buffer.byteLength) {
      throw apiError("The content response was empty.", null);
    }
    const blob = new Blob([buffer], { type: "video/mp4" });
    clearVideo();
    videoUrl = URL.createObjectURL(blob);
    frameVideo.src = videoUrl;
    frameVideo.hidden = false;
    frameImage.hidden = true;
    frameEmpty.hidden = true;
    downloadLink.href = videoUrl;
    downloadLink.download = `${id}.mp4`;
    downloadLink.hidden = false;
    downloadLink.textContent = `Download ${formatBytes(blob.size)}`;
    frameMeta.textContent = `MP4 ready · ${formatBytes(blob.size)}`;
    rememberJob({ id, status: "completed", startedAt: Date.now() });
    setStatus("Video is ready.", "is-ok");
    log(`Saved playback for ${id} (${formatBytes(blob.size)}).`);
  }

  async function requestJson(url, options) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw networkError(error);
    }
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!response.ok) {
      throw apiError(messageFrom(data, response.status), data);
    }
    setRaw(data);
    return data || {};
  }

  function showTask(snapshot) {
    setRaw(snapshot);
    taskLine.hidden = false;
    taskLine.textContent = snapshot.id || "";
    const progress = Number(snapshot.progress);
    if (Number.isFinite(progress)) {
      meter.hidden = false;
      meterBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
    const label = snapshot.status || "unknown";
    setStatus(`Task ${snapshot.id || ""} · ${label}${Number.isFinite(progress) ? ` · ${progress}%` : ""}`, "");
    log(`Status ${label}${Number.isFinite(progress) ? ` · ${progress}%` : ""}`);
  }

  function networkError(error) {
    const origin = location.origin && location.origin !== "null" ? location.origin : "a local file";
    const wrapped = apiError(
      `The browser could not read a response from api.cheapbuddy.cc (${origin}). ` +
        "That host currently echoes Access-Control-Allow-Origin for https://cheapbuddy.cc only, " +
        "so a page opened from disk, localhost, or GitHub Pages is blocked. " +
        "The key is not sent to any host other than api.cheapbuddy.cc. " +
        (error && error.message ? `(${error.message})` : ""),
      null
    );
    wrapped.cause = error;
    wrapped.network = true;
    return wrapped;
  }

  function failedError(snapshot) {
    rememberJob({
      id: snapshot.id,
      status: "failed",
      startedAt: Date.now(),
    });
    const base = messageFrom(snapshot, 200);
    const extra = explainFailure(base);
    return apiError(extra ? `${base} ${extra}` : base, snapshot);
  }

  function explainFailure(message) {
    const text = message || "";
    if (/prompt optimization failed/i.test(text)) {
      return "Turn Resize to 720×1280 JPEG back on and submit the image again.";
    }
    if (/frame and reference roles cannot be mixed/i.test(text)) {
      return "Send first_frame only. This page does not add reference_image.";
    }
    if (/unsupported media field:\s*images/i.test(text)) {
      return "This route wants first_frame, not images.";
    }
    return "";
  }

  function messageFrom(data, status) {
    if (!data) return `HTTP ${status}`;
    const error = data.error;
    if (error && typeof error === "object") {
      const code = error.code || error.type;
      return [code, error.message].filter(Boolean).join(": ") || `HTTP ${status}`;
    }
    if (typeof error === "string") return error;
    if (typeof data.message === "string") return data.message;
    if (typeof data.raw === "string" && data.raw) return data.raw;
    return `HTTP ${status}`;
  }

  function sniffPayload(buffer, response) {
    const type = (response.headers.get("content-type") || "").toLowerCase();
    const bytes = new Uint8Array(buffer.slice(0, 64));
    let text = "";
    const looksText = type.includes("json") || type.startsWith("text/") || bytes[0] === 0x7b || bytes[0] === 0x5b;
    if (looksText) {
      text = new TextDecoder().decode(buffer);
      try {
        return { json: JSON.parse(text), text };
      } catch {
        return { json: type.includes("json") ? { raw: text } : null, text };
      }
    }
    return { json: null, text: "" };
  }

  function setBusy(value) {
    busy = value;
    createButton.disabled = value;
    stopButton.hidden = !value;
    if (value) resumeButton.hidden = true;
  }

  function resetAbort() {
    abortController.abort();
    abortController = new AbortController();
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-error", kind === "is-error");
    statusEl.classList.toggle("is-ok", kind === "is-ok");
  }

  function setRaw(value) {
    rawEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }

  function log(text) {
    const item = document.createElement("li");
    item.textContent = text;
    logEl.append(item);
    while (logEl.children.length > 12) logEl.firstChild.remove();
  }

  function rememberJob(job) {
    writeStorage(JOB_STORAGE, JSON.stringify(job));
  }

  function storedJob() {
    const raw = readStorage(JOB_STORAGE);
    if (!raw) return null;
    try {
      const job = JSON.parse(raw);
      return job && job.id ? job : null;
    } catch {
      return null;
    }
  }

  function currentKey() {
    return keyInput.value.trim();
  }

  function saveKey() {
    const key = currentKey();
    if (key) writeStorage(KEY_STORAGE, key);
    else removeStorage(KEY_STORAGE);
  }

  function clearVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = "";
    frameVideo.removeAttribute("src");
    frameVideo.hidden = true;
    downloadLink.hidden = true;
    downloadLink.removeAttribute("href");
  }

  function revokePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  async function encodeFirstFrame(file) {
    const bitmap = await loadBitmap(file);
    if (!bitmap.width || !bitmap.height) {
      bitmap.close();
      throw new Error("That image has no pixels.");
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W;
      canvas.height = FRAME_H;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Could not prepare a canvas.");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, FRAME_W, FRAME_H);
      const scale = Math.max(FRAME_W / bitmap.width, FRAME_H / bitmap.height);
      const width = bitmap.width * scale;
      const height = bitmap.height * scale;
      ctx.drawImage(bitmap, (FRAME_W - width) / 2, (FRAME_H - height) / 2, width, height);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error("Could not encode a JPEG."))),
          "image/jpeg",
          0.92
        );
      });
      return {
        file: new File([blob], "first-frame.jpg", { type: "image/jpeg" }),
        width: FRAME_W,
        height: FRAME_H,
        resized: true,
      };
    } finally {
      bitmap.close();
    }
  }

  async function describeOriginal(file) {
    const bitmap = await loadBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    const safeName = (file.name || "first-frame").split(/[/\\]/).pop();
    const typed = file.type
      ? file
      : new File([file], safeName, { type: "application/octet-stream" });
    if (typed.name !== safeName) {
      return {
        file: new File([typed], safeName, { type: typed.type }),
        width,
        height,
        resized: false,
      };
    }
    return { file: typed, width, height, resized: false };
  }

  async function loadBitmap(file) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      return createImageBitmap(file);
    }
  }

  function newIdempotencyKey() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `i2v-${Date.now()}-${suffix}`;
  }

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  function apiError(message, payload) {
    const error = new Error(message);
    error.payload = payload;
    return error;
  }

  function formatBytes(size) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function readStorage(name) {
    try {
      return localStorage.getItem(name) || sessionStorage.getItem(name);
    } catch {
      return null;
    }
  }

  function writeStorage(name, value) {
    try {
      if (name === KEY_STORAGE) localStorage.setItem(name, value);
      else sessionStorage.setItem(name, value);
    } catch {
      /* Private mode can reject storage; the form still works for this load. */
    }
  }

  function removeStorage(name) {
    try {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    } catch {
      /* Ignore storage failures. */
    }
  }
})();
