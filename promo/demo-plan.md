# 可玩 Demo 规划（本周可缩小版）

## MVP（优先）
单页：上传一张图 + 填 prompt + 选秒数 → 调 `POST /v1/videos`（first_frame）→ 轮询 → 播放/下载。

约束：
- Key 由用户自填（存在浏览器 localStorage，或你提供限流演示 Key）
- 明确提示：不要同时开参考图模式
- 上传前可选「自动压到 720×1280」

## 放置位置
1. Hugging Face Space（Gradio）——获客友好  
2. 或 `cheapbuddy-examples` 里的 `demo/` 静态页 + 说明

## 本周不做
完整账号体系、多模型切换 UI、支付页嵌入。
