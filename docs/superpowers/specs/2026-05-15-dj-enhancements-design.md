# DJ 增强 + UI 交互改进设计

## 概述

6 个改进：
1. `speak` 动作类型 + 歌曲切换自动生成串场词（Claude 实时生成）
2. 提示词加入环境信息（当前时间）
3. 用户品味语料文件（`taste.md`）
4. 简单指令分流（跳过 Claude 直接执行）
5. 播放队列收起按钮
6. 进度条点击 + 拖拽跳转

---

## 改进 1：`speak` 动作 + 自动串场词

### 后端改动（`server/index.js`）

**新增 `speak` 动作处理：**
在 `executeActions` 函数中，新增对 `type === 'speak'` 的处理：
```javascript
if (type === 'speak' && action.text) {
  const speech = await createSpeech(action.text)
  sseSend(res, 'sentence_ready', speech)
  continue
}
```

**系统提示词更新：**
在 `buildAgentPrompt` 的允许动作列表中加入：
```
- speak: {"type":"speak","text":"你想说的串场词或过渡语"}
```

并在风格说明中加入：
```
- 每次找歌或切歌时，用 speak 动作说一句简短的串场词，像电台 DJ 一样自然过渡。
```

### 前端改动（`src/App.jsx`）

**歌曲切换时请求串场词：**
在 `audio.onended` 回调中（`playNextTrack` 函数），切歌后向后端发一个特殊请求，触发 Claude 为新歌曲生成串场词：

```javascript
function requestTransition(nextTrack) {
  // 向后端发一条系统消息，触发 Claude 生成串场词
  streamChatDjMessage(`[系统：歌曲已切换到 ${nextTrack.title} - ${nextTrack.artist}，请说一句简短的串场词。]`, {
    onEvent: payload => handleServerEvent(assistantId, payload)
  })
}
```

在 `startMusic` 函数中，当歌曲开始播放后，调用 `requestTransition(track)`。

**新增 `GET /api/now` 端点：**
返回当前播放状态快照（歌曲、状态、音量、队列长度），供未来使用。

---

## 改进 2：提示词加入环境信息

### 后端改动（`server/index.js`）

在 `buildAgentPrompt` 函数中，"当前状态"部分加入当前时间：

```javascript
const now = new Date()
const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const hour = now.getHours()
let timeContext = '白天'
if (hour >= 22 || hour < 6) timeContext = '深夜'
else if (hour >= 18) timeContext = '傍晚'
else if (hour >= 12) timeContext = '下午'
else if (hour >= 6) timeContext = '早上'
```

在提示词中加入：
```
- 当前时间：${timeStr}（${timeContext}）
```

让 Claude 根据时间自动调整推荐风格（深夜推舒缓、早上推轻快）。

---

## 改进 3：用户品味语料文件

### 新增文件（`.claudio/taste.md`）

创建默认模板：
```markdown
# 我的音乐品味

## 喜欢的风格
（用户自行填写，比如：轻音乐、钢琴、华语流行）

## 不喜欢的
（用户自行填写，比如：重金属、说唱）

## 常用场景
- 学习时：喜欢安静的纯音乐
- 睡前：喜欢舒缓的钢琴曲
- 运动时：喜欢节奏感强的歌

## 其他偏好
（用户自行填写）
```

### 后端改动（`server/index.js`）

在 `buildAgentPrompt` 中，加载 `taste.md` 并拼入提示词：

```javascript
let tasteText = ''
try {
  tasteText = readFileSync(path.join(runtimeDir, 'taste.md'), 'utf8').trim()
} catch {}
```

在提示词中加入：
```
用户品味：
${tasteText || '（用户还没填写品味档案。）'}
```

---

## 改进 4：简单指令分流

### 后端改动（`server/index.js`）

在 `handleChat` 函数开头，新增关键词匹配。匹配到简单指令时直接执行，不调 Claude：

```javascript
const QUICK_COMMANDS = {
  '下一首': () => { /* skip 动作 */ },
  '换一首': () => { /* skip 动作 */ },
  '切歌': () => { /* skip 动作 */ },
  '上一首': () => { /* previous 动作 */ },
  '暂停': () => { /* pause 动作 */ },
  '停一下': () => { /* pause 动作 */ },
  '继续': () => { /* play 动作 */ },
  '继续播放': () => { /* play 动作 */ },
  '声音小点': () => { /* volume down */ },
  '声音大点': () => { /* volume up */ },
}
```

匹配到时，执行对应动作 + 返回一句简短确认文字（如"好，切到下一首。"），跳过 Claude 调用。

---

## 改进 5：播放队列收起按钮

### 前端改动（`src/App.jsx`）

在队列区域标题旁加一个收起/展开按钮：

```jsx
const [isQueueExpanded, setIsQueueExpanded] = useState(true)

// 队列标题区域
<div className="mb-2 flex items-center justify-between">
  <span>Queue · {queue.length} tracks</span>
  <button onClick={() => setIsQueueExpanded(prev => !prev)}>
    {isQueueExpanded ? '收起' : '展开'}
  </button>
</div>

// 队列内容（条件渲染）
{isQueueExpanded && (
  <div className="max-h-28 space-y-1 overflow-y-auto ...">
    {queue.slice(0, 8).map(...)}
  </div>
)}
```

收起时只显示 "Queue · 5 tracks ▸"，展开时显示完整列表。

---

## 改进 6：进度条点击 + 拖拽跳转

### 前端改动（`src/App.jsx`）

当前进度条是纯展示的条形图，不能交互。改成可点击 + 可拖拽：

**核心逻辑：**
```jsx
const [isDragging, setIsDragging] = useState(false)
const progressRef = useRef(null)

function handleSeek(clientX) {
  const rect = progressRef.current.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const seekTime = percent * trackDuration
  if (audioRef.current) {
    audioRef.current.currentTime = seekTime
    setTrackTime(seekTime)
  }
}

function handlePointerDown(e) {
  setIsDragging(true)
  handleSeek(e.clientX)
}

function handlePointerMove(e) {
  if (!isDragging) return
  handleSeek(e.clientX)
}

function handlePointerUp() {
  setIsDragging(false)
}
```

**UI 改动：**
把当前的纯展示进度条改成一个可交互区域：
```jsx
<div
  ref={progressRef}
  className="flex h-8 flex-1 cursor-pointer items-center gap-0.5 overflow-hidden rounded-full px-2"
  style={{ background: 'rgba(255,255,255,0.36)' }}
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
  onPointerLeave={handlePointerUp}
>
  {Array.from({ length: 44 }).map((_, index) => {
    const isActive = progress >= (index / 43) * 100
    const height = 5 + Math.abs(Math.sin(index * 0.54)) * 13
    return <span key={index} ... />
  })}
</div>
```

加 `cursor-pointer` 和 `onPointerDown/Move/Up` 事件，用户可以点击或拖拽跳转。

---

## 文件改动汇总

| 文件 | 改动 |
|------|------|
| `server/index.js` | 加 `speak` 动作、提示词加时间+taste.md、简单指令分流、`GET /api/now` |
| `src/App.jsx` | 切歌触发串场词、队列收起按钮、进度条拖拽 |
| `.claudio/taste.md` | 新增品味语料模板 |
