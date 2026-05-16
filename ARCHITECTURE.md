# Claudio 架构设计

## 系统概览

Claudio 是一个前后端分离的 AI 电台应用。前端负责 UI 和播放，后端负责 AI 对话、音乐搜索和语音合成。

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  React 19 + Vite + Tailwind CSS             │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Chat UI │ │ Player   │ │ Queue Panel  │  │
│  └────┬────┘ └────▲─────┘ └──────────────┘  │
│       │           │                          │
│       │    SSE    │    Player Control         │
└───────┼───────────┼──────────────────────────┘
        │           │
┌───────▼───────────┴──────────────────────────┐
│                  Backend                      │
│  Node.js HTTP (port 8080)                     │
│  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Claude CLI   │  │ NetEase API Client  │   │
│  │ (child proc) │  │ (search + play URL) │   │
│  └──────┬───────┘  └──────────┬──────────┘   │
│         │                     │               │
│  ┌──────▼───────┐  ┌──────────▼──────────┐   │
│  │ Action       │  │ TTS Service         │   │
│  │ Extractor    │  │ (MiniMax/OpenAI/    │   │
│  │              │  │  Browser)           │   │
│  └──────────────┘  └─────────────────────┘   │
│                                               │
│  ┌──────────────────────────────────────────┐ │
│  │ State: .claudio/state.json               │ │
│  └──────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

## 前端

### 技术选型

- **React 19** - UI 框架
- **Vite 6** - 构建工具 + 开发代理
- **Tailwind CSS 3.4** - 样式
- **liquid-glass-react** - 液态玻璃视觉效果

### 核心组件

| 组件                  | 职责                                 |
| --------------------- | ------------------------------------ |
| `App.jsx`           | 主应用：聊天流、播放器、队列、设置   |
| `NeteaseCenter.jsx` | 网易云音乐库浏览（歌单、搜索、收藏） |
| `GlassPanel.jsx`    | 液态玻璃 UI 面板                     |
| `GlassSettings.jsx` | 玻璃效果参数（React Context）        |

### 状态管理

使用 React 原生 `useState` / `useRef`，无外部状态库。

关键状态：

- `messages` - 聊天消息列表
- `queue` - 播放队列
- `currentTrack` - 当前播放曲目
- `phase` - 播放阶段（idle / thinking / playing / paused / loading / queued）
- `volume` - 音量

### 通信协议

前端通过 `chatDjClient.js` 与后端通信：

| 端点                    | 方法 | 用途                            |
| ----------------------- | ---- | ------------------------------- |
| `/api/state`          | GET  | 加载初始状态                    |
| `/api/chat`           | POST | 发送消息，SSE 流式返回          |
| `/api/player/control` | POST | 播放控制（播放/暂停/跳过/音量） |
| `/api/tts/*`          | GET  | TTS 音频文件                    |
| `/api/netease/*`      | *    | 网易云 API 代理                 |

### Vite 代理/

开发环境下，Vite 通过自定义插件将 `/api/*` 请求代理到后端 `localhost:8080`。

## 后端

### 技术选型

- **Node.js 原生 HTTP** - 无框架依赖
- **Claude Code CLI** - AI 对话引擎（子进程调用）
- **网易云音乐 API** - 音乐搜索和播放 URL（Docker 部署）

### 核心流程

1. 接收 `POST /api/chat`
2. Spawn Claude CLI 子进程，传入精心设计的系统提示词（定义 Claudio DJ 人设）
3. 流式读取 Claude 输出，提取隐藏的 `<claudio_actions>` JSON 标签
4. 根据动作类型执行：搜索网易云、调整播放队列、切换心情模式
5. 为每句 DJ 台词生成 TTS 音频
6. 通过 SSE 将事件流式返回前端

### SSE 事件类型

| 事件                | 内容                               |
| ------------------- | ---------------------------------- |
| `assistant_delta` | Claude 输出的文本片段              |
| `sentence_ready`  | 一句 DJ 台词 + 对应的 TTS 音频 URL |
| `tool_start`      | 开始执行动作（搜索、播放等）       |
| `queue_update`    | 播放队列更新                       |
| `now_playing`     | 当前播放曲目变更                   |
| `done`            | 流结束                             |

### 动作系统

Claude 在对话中插入隐藏的 `<claudio_actions>` 标签，后端解析后执行：

```json
{
  "actions": [
    { "type": "search_music", "query": "轻柔钢琴 学习" },
    { "type": "play_now", "index": 0 },
    { "type": "set_mood", "mood": "focus" }
  ]
}
```

### 状态持久化

运行时状态保存在 `.claudio/state.json`：

- 聊天历史
- 播放队列
- 当前曲目
- 心情模式

### TTS 服务

可插拔架构，支持三种后端：

1. **MiniMax TTS** - 高质量中文语音
2. **OpenAI 兼容 TTS** - 支持任何 OpenAI TTS 兼容 API
3. **浏览器 SpeechSynthesis** - 零配置降级方案

## 数据流

```
用户输入："我要学习 2 小时"
  │
  ▼
Frontend: POST /api/chat (SSE)
  │
  ▼
Backend: spawn Claude CLI
  │
  ├── Claude 输出: "好的，为你准备专注学习的音乐..."
  │   └── <claudio_actions>{"actions":[{"type":"search_music","query":"piano focus study"}]}</claudio_actions>
  │
  ├── 解析动作 → 搜索网易云 "piano focus study"
  │   └── 返回 5 首匹配歌曲
  │
  ├── 为每句台词生成 TTS 音频
  │
  └── SSE 事件流:
      ├── sentence_ready { text, audioUrl }
      ├── queue_update { tracks: [...] }
      ├── now_playing { track }
      └── done
  │
  ▼
Frontend:
  ├── 渲染聊天气泡
  ├── 播放 TTS 语音
  ├── 更新播放队列
  └── 开始播放音乐
```

## 降级策略

| 层级   | 主方案               | 降级方案                  |
| ------ | -------------------- | ------------------------- |
| AI     | Claude CLI           | 本地 DJ 文案模板          |
| 音乐源 | 网易云 API           | 本地 Demo 音频库（11 首） |
| TTS    | MiniMax / OpenAI TTS | 浏览器 SpeechSynthesis    |
| 播放   | HTMLAudioElement     | 显示错误提示              |

## 部署

### 开发环境

```bash
npm run server   # 后端 :8080
npm run dev      # 前端 :5173（代理 /api → :8080）
```

### 生产环境

```bash
npm run build    # 构建到 dist/
# 后端需要自行部署 server/index.js
# 前端 dist/ 可部署到任何静态文件服务器
```

### 依赖服务

- **网易云音乐 API** - Docker 容器，端口 3000
- **Claude Code CLI** - 需要在 PATH 中可用
- **MiniMax TTS**（可选）- 需要 API Key
