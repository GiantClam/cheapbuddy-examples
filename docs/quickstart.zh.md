# 5 分钟 Quickstart（视频）

目标：用同一把 CheapBuddy API Key，在约 5 分钟内跑通 **文生视频** 和 **首帧图生视频**，并下载 MP4。

文档全文：[API Docs](https://cheapbuddy.cc/api-docs/) · Base URL：`https://api.cheapbuddy.cc`

## 准备

```bash
export CHEAPBUDDY_API_KEY='你的_key'
# 大文件上传建议带幂等键，避免重试重复建任务
export IDEMPOTENCY_KEY="demo-$(date +%s)-$$"
```

鉴权：`Authorization: Bearer $CHEAPBUDDY_API_KEY`

公开字段是 **`ratio`**，不是 `aspect_ratio`。当前公开视频模型：`MiniMax-H3`；分辨率目前仅 **`768P`**；时长 **`seconds` 4–15**（与 `duration` 同义）。

---

## 1）文生视频（约 1 分钟提交）

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

成功时返回类似：

```json
{"id":"task_...","object":"video","model":"MiniMax-H3","status":"queued","progress":0}
```

记下 `id`，进入轮询。

---

## 2）首帧图生视频（Image-to-video）

只使用 **`first_frame`**（或 `last_frame`）。**不要**同时传 `reference_image`：上游会报  
`frame and reference roles cannot be mixed`。

图生视频可用 `ratio=9:16` 或 `adaptive`。若原图偏大或预处理失败，可先压成约 **720×1280（9:16）** 的干净 JPEG 再传。

```bash
curl -sS -X POST 'https://api.cheapbuddy.cc/v1/videos' \
  -H "Authorization: Bearer $CHEAPBUDDY_API_KEY" \
  -H "Idempotency-Key: i2v-$(date +%s)-$$" \
  -F 'model=MiniMax-H3' \
  -F 'prompt=Anime character holds a bowl by a snowy riverside, then slips into shallow water. Vertical shot with dialogue audio.' \
  -F 'seconds=15' \
  -F 'ratio=9:16' \
  -F 'resolution=768P' \
  -F 'first_frame=@./first-frame.jpg;type=image/jpeg'
```

身份锁定若要用 **`reference_image`**，请走参考图模式，且**不要**再带 `first_frame` / `last_frame`。

JSON 方式（图片需为可访问的 HTTPS URL）示例见 [API Docs · Image-to-video](https://cheapbuddy.cc/api-docs/)。

---

## 3）轮询状态

```bash
TASK_ID='task_你的id'
curl -sS "https://api.cheapbuddy.cc/v1/videos/${TASK_ID}" \
  -H "Authorization: Bearer $CHEAPBUDDY_API_KEY"
```

`status` 为 `queued` → `in_progress` → `completed` 或 `failed`。完成响应**不会**直接给出上游播放 URL。

---

## 4）下载成片

```bash
curl -sS "https://api.cheapbuddy.cc/v1/videos/${TASK_ID}/content" \
  -H "Authorization: Bearer $CHEAPBUDDY_API_KEY" \
  -o output.mp4
```

---

## 常见失败（实战）

| 现象 | 可能原因 | 建议 |
|---|---|---|
| `frame and reference roles cannot be mixed` | 同时传了首帧类字段与 `reference_image` | 二选一：要么 I2V（`first_frame`），要么参考图模式 |
| `upstream prompt optimization failed` | 首帧图预处理/优化失败（常见于尺寸或封装不稳） | 重编码为 720×1280 JPEG 再试；提示词过长时可略整理结构 |
| `unsupported media field: images` | MiniMax-H3 通道不认 `images` 字段 | 用 `first_frame` / `reference_image` 等文档字段 |
| 上传后客户端断开 | POST 需等 body 收完才返回 task id | 加 `Idempotency-Key`，成功后继续轮询，勿重复盲提 |

只读询价（不计费）：

```bash
curl -sS -G 'https://api.cheapbuddy.cc/v1/pricing' \
  --data-urlencode 'model=MiniMax-H3' \
  -H "Authorization: Bearer $CHEAPBUDDY_API_KEY"
```

结算以**实际成功用量**为准，详见定价接口说明。

---

## 下一步

- 完整协议与字段：[https://cheapbuddy.cc/api-docs/](https://cheapbuddy.cc/api-docs/)
- 可复制脚本与 Python/JS 示例：见本仓库 `examples/`（发布后更新链接）
