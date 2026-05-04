# 🎵 Moodwave - AI 情境音乐播放器

一个能根据你的状态、情绪、目标和时间，自动生成音乐场景方案的 AI 音乐规划师。

## ✨ 功能特点

- 🎵 **智能音乐规划**：告诉 AI 你现在的状态，自动生成专属音乐方案
- 🤖 **私人 AI DJ**：像深夜电台一样，用温柔的声音陪伴你
- 🎤 **可插拔的 TTS 服务**：支持浏览器原生语音、Fish Audio、MiniMax TTS（自动降级）
- ☁️ **网易云主音源**：AI 自动生成搜索策略，自动从网易云寻找可播放歌曲
- 🔊 **本地音频播放**：完整的播放列表、自动续播、当前歌曲高亮
- 📱 **手机端优化**：一体化浅色 UI，优雅、简洁
- 🛡️ **智能降级**：MiniMax / 网易云失败时自动切换到本地 Demo 音源

## 🛠️ 技术栈

- React 19 + Vite
- Tailwind CSS
- MiniMax API (可选，用于智能 DJ)
- NeteaseCloudMusicApi（本地 Docker，用于网易云搜索和播放 URL）
- 可插拔 TTS 服务：浏览器原生语音 / Fish Audio / MiniMax TTS
- 本地音频库（无需后端）

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量（可选）

复制 `.env.local` 并按需配置：

```bash
# MiniMax AI DJ 配置
VITE_USE_MINIMAX=true
VITE_MINIMAX_API_KEY=你的APIKey
VITE_MINIMAX_BASE_URL=https://api.minimaxi.com/v1
VITE_MINIMAX_MODEL=MiniMax-M2.7

# TTS 语音配置
VITE_TTS_PROVIDER=browser
# VITE_TTS_PROVIDER=fish
# VITE_TTS_PROVIDER=minimax_tts

# Fish Audio 配置
VITE_FISH_AUDIO_API_KEY=
VITE_FISH_AUDIO_VOICE_ID=

# MiniMax TTS 配置
VITE_MINIMAX_TTS_API_KEY=
VITE_MINIMAX_TTS_VOICE_ID=
```

如果不配置 MiniMax，会自动使用本地 Demo 模式，功能一样完整，最适合黑客松现场稳定演示。

### 启动网易云音乐 API（可选）

如果你想让 Moodwave 自动使用网易云作为主音源，请先打开 Docker Desktop，然后在终端运行：

```bash
docker run -d --name netease-api -p 3000:3000 binaryify/netease_cloud_music_api
```

启动后，打开浏览器访问：

```text
http://localhost:3000/search?keywords=周杰伦
```

如果页面显示一大段 JSON 数据，说明网易云 API 已经启动成功。Moodwave 会自动调用它，不需要你手动搜索歌曲。

前端默认会请求：

```text
http://localhost:3000
```

如果你以后换了端口，可以在 `.env.local` 里加：

```bash
VITE_NETEASE_API_BASE_URL=http://localhost:3000
```

### 启动开发服务器

```bash
npm run dev
```

启动后，终端会显示一个本地地址，通常是：

```bash
http://localhost:5173/
```

如果 5173 被占用，Vite 会自动换成 5174、5175 等地址。以终端显示的地址为准。

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

如果浏览器语音没有成功，页面仍然会展示完整方案，可以继续点击播放音乐。

### 3. 播放音乐

点击底部圆形播放按钮，开始享受你的专属音乐时光
- 自动播放下一首
- 当前歌曲高亮显示
- 可以暂停和继续

### 验证成功

看到下面这些结果，就说明项目跑通了：

1. 页面出现 Moodwave 输入框。
2. 点击「学习 / 睡眠 / 运动 / 安抚」任意按钮后，会出现音乐方案。
3. 页面出现 DJ 开场白、推荐理由、歌曲列表和播放阶段。
4. 点击底部圆形播放按钮后，能听到本地音乐，当前歌曲会高亮。
5. 如果语音或音乐失败，页面会显示提示，不会白屏。
6. 如果已启动网易云 API，输入「我想睡前放松 30 分钟」后，会看到系统提示正在网易云寻找声音，并自动生成播放列表。
7. 页面不会显示搜索工具或试听按钮，只显示电台聊天、当前播放歌曲和 Up next。
8. 如果网易云不可用，会看到 fallback 提示，并自动切回本地 Demo 音源继续播放。
9. 输入「下一首」「声音小点」「别说话了」这类简单控制语句，会直接控制播放器，不会重新生成一套歌单。
10. 会员登录后也只能播放你的账号有权限的歌曲；如果版权受限或网易云没有返回完整 URL，页面会显示提示或 fallback。

## 📁 项目结构

```
src/
├── components/
│   ├── InputArea.jsx       # 输入区组件
│   ├── NeteaseSearchPanel.jsx # 网易云搜索验证组件
│   ├── PlanDisplay.jsx     # 方案展示组件
│   └── ParticleCanvas.jsx  # 粒子效果组件
├── data/
│   ├── localAudioLibrary.js  # 本地音频库
│   ├── mockPlans.js        # Mock 方案（备用）
│   └── mockSongs.js        # Mock 歌曲（备用）
├── services/
│   ├── djPlanner.js        # DJ 方案生成器
│   ├── minimaxService.js   # MiniMax API 集成
│   ├── musicOrchestrator.js # 网易云主音源 + AI DJ 编排层
│   ├── neteaseApi.js       # 网易云音乐 API 封装
│   ├── neteaseService.js   # 网易云 playlist 构建服务
│   ├── planNormalizer.js   # 统一整理 AI / Mock 方案格式
│   ├── ttsService.js       # 可插拔的 TTS 语音服务
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

- [x] 接入网易云 API 主流程：AI 自动生成搜索词，系统自动搜歌并组成播放列表
- [x] Chat + Radio Player：用对话流呈现 DJ 消息、系统状态和当前播放
- [x] 自然语言控制雏形：支持「下一首」「声音小点」「只放音乐」等本地快速控制
- [ ] 强化 Song Story：结合歌词、收藏时间、播放次数和备注生成更像电台的单曲故事
- [ ] Mood Profile：从使用历史中总结长期音乐偏好和 DJ 语气偏好
- [ ] 歌单导入和播放终端：支持 Apple Music / Spotify / 网易云 CSV，后续探索音箱和 DLNA/UPnP

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

打开浏览器访问终端显示的本地地址，享受你的私人 AI 电台！🎵
