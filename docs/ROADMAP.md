# Moodwave 后续升级路线图

## 项目背景

Moodwave 目前已经是一个可运行的黑客松 Demo，核心功能包括：

- 用户输入当前状态
- MiniMax 生成私人 DJ 播放计划
- 本地 localAudioLibrary 音源库
- AI 语音 / 浏览器语音朗读
- DJ Intro：音乐低音量铺底，AI 开场白压在音乐上说话
- 本地音频播放
- API 失败 fallback 到 mock plan

下一阶段目标是把 Moodwave 从“黑客松 Demo”升级成一个真正可长期维护、可扩展的私人 AI 音乐软件。

## 1. 产品长期定位

Moodwave 不是普通音乐播放器，而是一个会学习用户情绪、歌单和生活节奏的私人 AI DJ。

它不只是播放音乐，而是把用户此刻的状态、用户喜欢过的歌，以及每首歌背后的记忆，重新编排成一段专属声音场景。

核心差异：

- 普通播放器解决“听什么歌”
- Moodwave 解决“此刻我需要什么声音环境”
- 普通 AI 推荐歌曲
- Moodwave 生成私人电台体验

## 2. 未来系统模块

### 2.1 私人画像系统 Mood Profile

目标：让 Moodwave 不只理解用户这一次输入，还能理解用户长期状态、偏好和习惯。

功能设想：

- 从聊天记录、日记、笔记或历史使用记录中蒸馏用户画像
- 生成 `userMoodProfile.json`
- 记录用户常见状态，比如焦虑、困倦、备考压力、睡前思绪多等
- 记录音乐偏好，比如学习时少人声、焦虑时低能量、睡前自然声
- 记录 DJ 语气偏好，比如温柔、理性、像朋友，不要客服腔和鸡血语气
- 提供“我的声音画像”页面，让用户可查看、编辑、删除画像内容

隐私和控制原则：

- 画像必须用户可控，不能黑箱分析用户
- 用户应该知道 Moodwave 记住了什么
- 用户可以修改、删除画像内容
- 原始记录不应长期保存，优先只保留用户确认后的画像摘要

### 2.2 音乐库系统 Music Library

目标：让 Moodwave 拥有真正的个人音乐库，而不是只依赖本地 mock 音源。

功能设想：

- 本地音源管理
- 查看所有歌曲
- 按 focus / calm / sleep / energy / nature 分类
- 支持手动修改歌曲标签
- 支持设置 energy、valence、bpm、vocal 等字段
- 支持标记喜欢 / 不喜欢
- 记录播放次数、最近播放时间、加入时间
- 支持 CSV 歌单导入，比如 Apple Music / Spotify 导出的歌单
- 后续再考虑 Apple Music / Spotify / 网易云等真实平台接入

### 2.3 AI DJ 系统 DJ Engine

目标：让 AI 不只是生成播放计划，而是像真正的私人电台 DJ 一样说话、串场、介绍歌曲。

功能设想：

- 根据用户输入状态生成播放计划
- 结合 `userMoodProfile` 调整选歌和语气
- 生成 `openingLine`、`transition`、`closingLine`
- 结合 Song Story 介绍当前歌曲
- 生成更自然的电台转录稿 transcript
- 支持温柔女主播 / 私人电台 DJ 声音风格
- 避免客服腔、说明书腔、鸡血语气
- 支持 MiniMax 失败时 fallback 到 mock DJ plan

### 2.4 播放器系统 Player Engine

目标：把 Moodwave 从“AI 方案展示页”变成真正可用的音乐播放器。

功能设想：

- 上一首 / 下一首
- 播放 / 暂停
- 播放进度条
- 音量控制
- 歌曲列表高亮当前播放歌曲
- 点击 playlist 中某首歌可切换播放
- DJ over music：AI 开场白时音乐低音量铺底
- 语音结束后音乐自然升到正常音量
- Replay DJ 时音乐自动降低，朗读结束后恢复
- 支持歌曲切换时 DJ 短串场
- 避免多个 Audio 实例同时播放
- 处理音频文件不存在或播放失败的 fallback

### 2.5 播放终端系统 Output Devices

目标：让 Moodwave 不只在浏览器里播放，而是能输出到真实设备。

功能设想：

- 浏览器播放
- 蓝牙音箱播放
- 本地小爱音箱作为播放终端
- 后续探索 DLNA / UPnP 推送
- 后续探索 xiaomusic 等本地小爱音箱项目集成
- 第一阶段先支持用户手动连接蓝牙音箱
- 小爱音箱深度控制放到后期，不作为短期核心功能

## 3. Song Story 歌曲故事系统

目标：Moodwave 不只根据用户状态选歌，还能根据这首歌本身、用户与这首歌的关系、歌曲的声音特点来介绍歌曲。

每首歌除了 `title`、`artist`、`audioUrl`、`mode`、`tags` 外，还可以增加：

- `addedAt`：加入歌单时间
- `likedAt`：喜欢时间
- `lastPlayedAt`：最近播放时间
- `playCount`：播放次数
- `userNote`：用户备注
- `songBackground`：歌曲声音背景

`songBackground` 示例：

```json
{
  "mood": "slow, soft, minimal",
  "texture": "piano / ambient / rain / lofi / electronic",
  "story": "这首歌以缓慢的铺底音色为主，适合作为睡前或放松场景的背景音乐。",
  "whyItFits": "低能量、无人声、节奏稳定，不会打断思绪。"
}
```

DJ 可以生成：

- `songIntro`：当前歌曲介绍
- `personalReason`：为什么这首歌适合当前用户
- `transitionIn`：进入这首歌前的串场词
- `transitionOut`：这首歌结束后的过渡词

注意：

- 当前阶段不要编造真实歌曲发行背景、歌手故事或专辑历史
- 如果没有真实数据，只介绍声音特点、用户关系和场景匹配原因
- Song Story 应该短、轻、适合 TTS 朗读，不要变成歌曲百科

## 4. 聊天记录蒸馏与用户画像

目标：使用类似 profile distiller / memory skill 的方法，从用户聊天记录、日记或笔记中提炼 Moodwave 所需的音乐画像。

推荐流程：

```text
原始聊天记录 / 日记 / 个人笔记
→ 本地 profile distiller 脚本
→ 生成 userMoodProfile.json
→ Moodwave 在生成 DJ Plan 时读取该 profile
```

`userMoodProfile` 示例字段：

```json
{
  "currentLifeStage": "大学生，准备考研，项目和学习压力较大",
  "commonStates": [
    "睡眠不足时焦虑",
    "任务多时容易纠结先做什么",
    "临近考试时需要低阻力启动",
    "晚上容易想太多"
  ],
  "musicPreferences": {
    "focus": "低干扰、少人声、稳定节奏",
    "calm": "柔和、不要太悲伤、能让情绪慢下来",
    "sleep": "自然声、低频、轻音乐",
    "energy": "提神但不要太吵"
  },
  "djTone": {
    "style": "温柔、理性、像朋友和私人电台 DJ",
    "avoid": ["客服腔", "鸡血鼓励", "命令式语气", "太甜腻"]
  },
  "behaviorHints": [
    "当用户说很困但还要学习时，先降低启动阻力，再安排专注音乐",
    "当用户焦虑时，不要直接催效率，先帮助稳定情绪",
    "当用户深夜使用时，语气要更轻、更慢"
  ]
}
```

隐私原则：

- 原始聊天记录不应该长期保存
- 用户可以选择是否导入记录
- 用户可以查看最终画像
- 用户可以修改或删除画像
- 不要把用户画像做成黑箱

## 5. 功能优先级

### P0：当前必须先完善

- 播放器交互完善
  - 上一首 / 下一首
  - 音量控制
  - 播放进度条
  - Playlist 当前歌曲高亮
  - 点击歌曲切换播放
- DJ Transcript 改成电台转录稿风格
- 保证 MiniMax / TTS / 本地音频 fallback 稳定
- 避免多个音频或多个 TTS 同时播放

### P1：下一阶段核心差异化

- Mood Profile 用户声音画像
- Song Story 歌曲介绍系统
- DJ 根据用户画像调整语气
- 每首歌支持 `songIntro` / `transitionIn` / `transitionOut`
- Replay DJ 可朗读当前歌曲介绍

### P2：音乐库增强

- CSV 歌单导入
- 本地音乐库管理页面
- 手动编辑歌曲标签
- 播放次数、收藏时间、最近播放时间记录
- 喜欢 / 不喜欢反馈

### P3：真实音乐平台与设备

- Apple Music / MusicKit 接入
- Spotify / 网易云等平台探索
- 小爱音箱蓝牙播放说明
- DLNA / UPnP / xiaomusic 集成研究

### P4：高级体验

- 更自然的 TTS / 女主播声音
- 自动 DJ 串场
- 长期偏好学习
- 完整私人电台节目生成
- 移动端适配
- 账号与云端同步

## 6. 下一步开发建议

### 第一阶段：播放器交互重构

目标：先让 Moodwave 像真正播放器。

建议任务：

- 完成上一首 / 下一首 / 播放暂停 / 音量控制
- 完成进度条和当前播放时间
- 优化 playlist 高亮和点击切歌
- 把 DJ 文稿改成 transcript 风格
- 验证 TTS、音乐播放、fallback 不互相打架

### 第二阶段：Mood Profile

目标：让 AI 更懂用户。

建议任务：

- 设计 `userMoodProfile.json` 数据结构
- 做一个本地 mock profile
- 让 DJ Engine 在生成计划时读取 profile
- 提供用户可查看、可编辑、可删除画像内容的入口

### 第三阶段：Song Story

目标：让 AI 更懂歌，也懂用户和歌之间的关系。

建议任务：

- 扩展 localAudioLibrary 的 mock metadata
- 为每首 track 生成 `songIntro`、`personalReason`、`transitionIn`、`transitionOut`
- 在 transcript 中展示当前歌曲故事
- 让 Replay DJ 可以朗读当前歌曲介绍

### 第四阶段：Music Library

目标：让用户能导入、管理和标注自己的歌单。

建议任务：

- 建立音乐库管理页面
- 支持 CSV 导入
- 支持标签、能量、情绪、是否人声等字段编辑
- 记录播放次数、最近播放时间、喜欢 / 不喜欢反馈

### 第五阶段：Output Devices

目标：让 Moodwave 从浏览器走向真实播放设备。

建议任务：

- 先写清楚蓝牙音箱连接说明
- 调研 DLNA / UPnP 可行性
- 调研 xiaomusic 等本地小爱音箱方案
- 小爱音箱深度控制放到后期，不作为短期主线

## 7. 当前不要立刻做的事情

- 不要马上接 Apple Music 真 API
- 不要马上深度控制小爱音箱
- 不要马上做复杂账号系统
- 不要马上做云同步
- 不要先做大规模 UI 改版
- 不要在播放器交互没稳定前继续堆 AI 功能
- 不要让 AI 编造真实歌曲背景

## 8. 文档维护建议

这份路线图用于记录方向和优先级，不等于每个阶段的详细实现方案。

维护方式：

- 每完成一个阶段，在对应章节补充完成状态和遗留问题
- 每次新增大功能前，先确认它属于 P0-P4 哪一层
- 如果某个功能会影响播放器稳定性，优先放慢节奏，先补验收标准
- AI 能力的扩展必须服务于播放体验，不能让页面重新变成 AI 报告页
- 涉及用户画像、聊天记录、日记或笔记时，必须先写清楚隐私和用户控制策略
