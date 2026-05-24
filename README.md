# Claudio - AI 私人电台 DJ

一个 AI 驱动的情境音乐电台。用自然语言描述你的状态，Claudio 会理解你的情绪和需求，自动搜索音乐、编排歌单，像深夜电台 DJ 一样用温柔的声音陪伴你。

## 功能

- **对话式 DJ** - 用自然语言和 Claudio 聊天，它会理解你的状态并推荐音乐
- **小爱音箱模式** - 一键将音乐推送到小爱音箱播放，浏览器化身为控制台
- **网易云音乐** - AI 自动生成搜索策略，从网易云获取歌曲和播放链接
- **可插拔 TTS** - 支持 MiniMax TTS、OpenAI 兼容 TTS、浏览器原生语音（自动降级）
- **自然语言控制** - "下一首"、"声音小点"、"只放音乐" 等快捷指令
- **液态玻璃 UI** - 专辑拼贴背景 + 液态玻璃手机收音机界面
- **智能降级** - API 不可用时自动切换到本地 Demo 音源，保证体验不中断

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite 6 + Tailwind CSS 3.4 |
| AI 后端 | Claude Code CLI（子进程调用） |
| TTS | MiniMax TTS / OpenAI 兼容 TTS / 浏览器 SpeechSynthesis |
| 音乐源 | 网易云音乐 API（Docker 本地部署） |
| 服务端 | Node.js 原生 HTTP（无框架） |
| UI 特效 | liquid-glass-react |

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.local` 并按需配置：

```bash
# TTS 语音配置
VITE_TTS_PROVIDER=browser        # browser / minimax_tts / openai_tts

# MiniMax TTS（可选）
VITE_MINIMAX_TTS_API_KEY=
VITE_MINIMAX_TTS_VOICE_ID=

# OpenAI 兼容 TTS（可选）
VITE_OPENAI_TTS_API_KEY=
VITE_OPENAI_TTS_BASE_URL=
VITE_OPENAI_TTS_MODEL=
VITE_OPENAI_TTS_VOICE=
```

### 启动网易云音乐 API（可选）

```bash
docker run -d --name netease-api -p 3000:3000 binaryify/netease_cloud_music_api
```

验证：浏览器打开 `http://localhost:3000/search?keywords=周杰伦`，看到 JSON 数据即成功。

### 启动服务

需要同时启动两个进程：

```bash
# 终端 1：启动后端服务（端口 8080）
npm run server

# 终端 2：启动前端开发服务器（端口 5173）
npm run dev
```

打开浏览器访问 `http://localhost:5173/`。

### 生产构建

```bash
npm run build
npm run preview
```

## 使用方式

在输入框描述你的状态，例如：

- "我要学习 2 小时"
- "我现在有点焦虑，想安静下来"
- "睡前想放松一下"
- "运动前需要点能量"

也可以使用快速按钮（学习、睡觉、运动、安抚）。

Claudio 会理解你的情绪，自动搜索合适的音乐，用 DJ 的口吻解释选曲理由，然后开始播放。

## 项目结构

```
server/
└── index.js              # 后端服务（Claude CLI 调用、SSE 流、网易云搜索、TTS）

src/
├── App.jsx               # 主应用（聊天 + 播放器 + 队列）
├── components/
│   ├── NeteaseCenter.jsx     # 网易云音乐库浏览
│   ├── NeteaseLoginPanel.jsx # 网易云登录
│   ├── GlassPanel.jsx        # 液态玻璃面板
│   ├── GlassSettings.jsx     # 玻璃效果设置（React Context）
│   └── ...
├── services/
│   ├── chatDjClient.js       # SSE 客户端
│   ├── musicOrchestrator.js  # 音乐编排（模式检测 + 网易云集成）
│   ├── neteaseApi.js         # 网易云 API 封装
│   ├── ttsService.js         # 可插拔 TTS 服务
│   └── ...
├── data/
│   ├── localAudioLibrary.js  # 本地 Demo 音频库（11 首）
│   └── mockPlans.js          # Mock 方案数据
└── utils/
    └── audioUtils.js         # 音频工具函数

public/
└── audio/                # 本地 MP3 文件
```

## 数据流

```
用户输入消息
  → 前端 POST /api/chat（SSE 流）
  → 后端 spawn Claude CLI
  → Claude 流式输出 + 隐藏的 <claudio_actions> 标签
  → 后端提取动作（搜索、播放、跳过等）
  → 后端搜索网易云获取歌曲
  → 后端生成 TTS 语音
  → SSE 事件流回前端：消息、语音、队列更新、当前播放
  → 前端渲染聊天气泡、播放语音、播放音乐
```

## 降级策略

| 场景 | 降级方案 |
|------|---------|
| Claude CLI 不可用 | 使用本地 DJ 文案 |
| 网易云 API 不可用 | 使用本地 Demo 音频库（11 首） |
| TTS 失败 | 使用浏览器 SpeechSynthesis |
| 浏览器阻止自动播放 | 显示提示，等待用户点击 |

## 预设模式

| 模式 | 触发词 | 搜索关键词 |
|------|--------|-----------|
| 专注 | 学习、写代码 | piano, instrumental, focus |
| 放松 | 焦虑、压力 | healing, piano, quiet |
| 睡眠 | 睡觉、晚安 | sleep aid, white noise, nature |
| 活力 | 运动、提神 | rhythm, electronic, dynamic |
| 自然 | 雨声、自然 | rain, white noise, nature |

## 开发

```bash
npm run lint      # ESLint 检查
npm run build     # 生产构建
npm run preview   # 预览构建结果
```

## 设计方向

详见 [DESIGN.md](./DESIGN.md) — 液态玻璃 + 手机收音机外壳 + 专辑拼贴背景。

## 架构

详见 [ARCHITECTURE.md](./ARCHITECTURE.md)。
