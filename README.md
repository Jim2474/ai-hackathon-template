# 🎵 Moodwave - AI 情境音乐播放器

一个能根据你的状态、情绪、目标和时间，自动生成音乐场景方案的 AI 音乐规划师。

## ✨ 功能特点

- 🎵 **智能音乐规划**：告诉 AI 你现在的状态，自动生成专属音乐方案
- 🤖 **私人 AI DJ**：像深夜电台一样，用温柔的声音陪伴你
- 🔊 **本地音频播放**：完整的播放列表、自动续播、当前歌曲高亮
- 📱 **手机端优化**：一体化浅色 UI，优雅、简洁
- 🛡️ **智能降级**：MiniMax API 失败时自动切换到 Mock 模式

## 🛠️ 技术栈

- React 19 + Vite
- Tailwind CSS
- MiniMax API (可选，用于智能 DJ)
- 浏览器原生 Speech Synthesis
- 本地音频库（无需后端）

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量（可选）

复制 `.env.local` 并填写你的 MiniMax API Key：

```bash
# .env.local
VITE_USE_MINIMAX=true
VITE_MINIMAX_API_KEY=你的APIKey
VITE_MINIMAX_BASE_URL=https://api.minimaxi.com/v1
VITE_MINIMAX_MODEL=MiniMax-M2.7
```

如果不配置 MiniMax，会自动使用 Mock 模式，功能一样完整！

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5175/

## 📖 使用说明

### 1. 输入你的状态

在输入框中描述你现在的状态，比如：
- 「我要学习 2 小时」
- 「我现在有点焦虑，想安静下来」
- 「睡前想放松一下」
- 「运动前需要点能量」

或点击快速按钮（学习、睡觉、运动、安抚）

### 2. 听私人 DJ 说话

AI 会像深夜电台主播一样，用温柔的声音解释为什么选这些歌

### 3. 播放音乐

点击播放按钮，开始享受你的专属音乐时光
- 自动播放下一首
- 当前歌曲高亮显示
- 可以暂停和继续

## 📁 项目结构

```
src/
├── components/
│   ├── InputArea.jsx       # 输入区组件
│   ├── PlanDisplay.jsx     # 方案展示组件
│   └── ParticleCanvas.jsx  # 粒子效果组件
├── data/
│   ├── localAudioLibrary.js  # 本地音频库
│   ├── mockPlans.js        # Mock 方案（备用）
│   └── mockSongs.js        # Mock 歌曲（备用）
├── services/
│   ├── djPlanner.js        # DJ 方案生成器
│   ├── minimaxService.js   # MiniMax API 集成
│   └── apiService.js       # 通用 API 服务
├── App.jsx                 # 主应用
├── main.jsx                # 入口文件
└── index.css               # 全局样式

public/
└── audio/                  # 本地音频文件
```

## 🎭 预设模式

- 📚 **专注模式** - 学习/写代码/写作业
- 😴 **睡眠模式** - 睡前放松/入眠
- 🧘 **安抚模式** - 缓解焦虑/压力
- 🏃 **运动模式** - 健身/提神/燃起来
- 🌿 **白噪音模式** - 雨声/自然声/环境音

## 🎯 Hackathon Demo 亮点

### ✅ 完整的 MVP 流程
1. 用户输入 → AI 规划 → DJ 说话 → 播放音乐
2. 全程闭环，无需后端

### ✅ 优雅的降级策略
- MiniMax API 失败 → 自动用 Mock
- 音频播放失败 → 自动下一首
- 页面永远不会崩溃

### ✅ 精心设计的 UI
- 一体化浅色卡片设计
- 手机端优先布局
- 清晰的信息层级

### ✅ 本地优先
- 所有音频在本地
- 可以离线演示
- 加载速度快

## 📝 演示脚本

快速演示请看 [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)

快速演示 PPT 请看 [PPT_SLIDES.md](./PPT_SLIDES.md) 和 [Moodwave_Presentation.pptx](./Moodwave_Presentation.pptx)

## 🔧 本地音频库

项目包含完整的本地音频库：
- focus-01/02.mp3
- calm-01/02.mp3
- sleep-01.mp3
- energy-01/02/03/04.mp3
- nature-01/02.mp3

你可以用自己的音频替换它们！

## 📋 下一步计划（可选）

- [ ] 接入真实音乐 API（网易云、Spotify 等）
- [ ] 用户历史记录
- [ ] 分享功能
- [ ] 音量控制和进度条
- [ ] 自定义音频上传

## 👥 开发者

AI Hackathon 项目 - Moodwave 团队

---

## 🎉 立即开始

```bash
git clone https://github.com/Jim2474/ai-hackathon-template.git
cd ai-hackathon-template
npm install
npm run dev
```

打开浏览器访问 http://localhost:5175/，享受你的私人 AI 电台！🎵
