# 图生视频踩坑复盘（Linux.do / 技术帖草稿）

标题建议：MiniMax-H3 图生视频实战：不能混首帧与参考图，以及 prompt optimization failed

## 背景
用 OpenAI 兼容网关调 MiniMax-H3 做 15s 9:16 有声动画（首帧 + 长分镜提示词）。

## 坑 1：frame 与 reference 不能混
同时传 `first_frame` + `reference_image` →  
`frame and reference roles cannot be mixed`  
结论：要么首帧 I2V，要么身份参考图模式，二选一。

## 坑 2：`images` 字段
传 `images=@...` → 通道报 unsupported / unexpected file field。  
按文档用 `first_frame` / `reference_image`。

## 坑 3：prompt optimization failed
原图约 1008×1792 时，短英文提示词也会失败；纯文生视频同账号可成功。  
把首帧重编码为 **720×1280 JPEG** 后，同参数可稳定完成（我们连续两次成功）。

## 可复现参数组合（脱敏）
- model: MiniMax-H3
- seconds: 15
- ratio: 9:16
- resolution: 768P
- first_frame: 重编码后的竖图
- 仅首帧，不带 reference_image

## 文档
https://cheapbuddy.cc/api-docs/
示例仓库：https://github.com/GiantClam/cheapbuddy-examples
V2EX 活动（Opus 5.5 3 折）：https://www.v2ex.com/t/1252941

（文末可轻描一句：示例与 Quickstart 在仓库/文档；全文以排障为主，避免硬广口吻。）
