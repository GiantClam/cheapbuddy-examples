# V2EX · 推广节点发帖草稿

**节点：推广**（不要发到「分享创造」当硬广，也不要在别人主题下评论贴链）

## 标题（选一）
1. CheapBuddy：OpenAI 兼容的图/视频 API（MiniMax-H3 等），文档与异步协议开箱即用
2. [推广] CheapBuddy.cc —— 便宜的 OpenAI 兼容媒体 API（视频异步任务 + 图生）

## 正文

大家好，做了一个面向开发者的媒体 API 站：**CheapBuddy**  
站点：https://cheapbuddy.cc  
文档：https://cheapbuddy.cc/api-docs/

### 它是什么
- OpenAI 兼容风格的鉴权与调用习惯（Bearer Key）
- 视频走异步协议：`POST /v1/videos` → 轮询 `GET /v1/videos/{id}` → `GET /v1/videos/{id}/content` 下载 MP4
- 当前公开视频模型含 **MiniMax-H3**（文生 / 首帧图生 / 参考图等，字段见文档）
- 也有图片生成接口；定价可只读查询 `/v1/pricing`

### 设计取舍（实话）
- 公开字段是 **`ratio`**，不是 `aspect_ratio`
- **首帧（first_frame）和参考图（reference_image）不能混用**，否则上游 400
- 图生视频若遇 `prompt optimization failed`，可先把首帧压到约 720×1280 再试（我们实战里这样更稳）
- 计费按成功用量结算；询价接口本身不计费

### 试用
注册后在控制台拿 Key（按你站点实际流程改一句）。欢迎用文档里的 curl 直接打通。

### 我会在帖下做什么
优先答技术问题：字段、报错、轮询下载、和 OpenAI SDK 改 base_url 的接法。  
不搞互刷、不私信塞二维码。

有对接问题直接回帖；若节点/版规有要求我也可以按版主指示调整。

谢谢。
