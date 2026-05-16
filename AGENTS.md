# 开发指南

## 项目概述

Claudio 是一个 AI 私人电台 DJ 应用。用户用自然语言描述状态，AI 理解情绪并自动编排音乐播放。

## 技术栈

- 前端：React 19 + Vite 6 + Tailwind CSS 3.4
- 后端：Node.js 原生 HTTP（`server/index.js`）
- AI：Claude Code CLI（子进程调用）
- 音乐：网易云音乐 API（Docker）
- TTS：MiniMax / OpenAI 兼容 / 浏览器 SpeechSynthesis

## 开发原则

1. 先理解现有代码再修改
2. 每次只完成一个明确目标
3. 修改前先查看相关文件的上下文
4. 新增依赖前说明理由
5. 遇到报错做最小修复，不随意重构

## 项目结构

```
server/
  index.js              # 后端主文件（Claude CLI、SSE、网易云、TTS）

src/
  App.jsx               # 主应用组件
  components/           # UI 组件
  services/             # 业务逻辑和 API 客户端
  data/                 # Mock 数据和本地音频库
  utils/                # 工具函数

.claudio/               # 运行时数据（state.json、TTS 缓存）
```

## 常用命令

```bash
npm run dev          # 启动前端（:5173）
npm run server       # 启动后端（:8080）
npm run build        # 生产构建
npm run lint         # ESLint 检查
```

## 前后端通信

前端通过 SSE 与后端通信，核心端点：

- `POST /api/chat` - 发送消息，SSE 流式返回
- `GET /api/state` - 获取当前状态
- `POST /api/player/control` - 播放控制

Vite 开发环境下通过 `vite.config.js` 中的代理插件将 `/api/*` 转发到后端。

## AI 对话机制

后端 spawn Claude CLI 子进程，Claude 在输出中插入隐藏的 `<claudio_actions>` JSON 标签。后端解析这些标签来执行搜索、播放等动作。

修改 DJ 行为需要编辑 `server/index.js` 中的系统提示词。

## 降级策略

- Claude CLI 不可用 → 本地 DJ 文案
- 网易云 API 不可用 → 本地 Demo 音频库
- TTS 失败 → 浏览器 SpeechSynthesis

修改降级逻辑时确保每一层都有兜底方案。
