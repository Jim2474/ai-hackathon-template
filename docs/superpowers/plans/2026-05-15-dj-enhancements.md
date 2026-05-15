# DJ 增强 + UI 交互改进 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复 DJ 串场词功能，增强 Claude 上下文，添加简单指令分流和 UI 交互改进。

**Architecture:** 后端 `server/index.js` 新增 `speak` 动作、环境信息、品味语料、指令分流、`/api/now` 端点。前端 `src/App.jsx` 新增切歌触发串场词、队列收起、进度条拖拽。

**Tech Stack:** Node.js HTTP server, React 19, Tailwind CSS

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `server/index.js` | 修改 | speak 动作、提示词增强、指令分流、/api/now |
| `src/App.jsx` | 修改 | 自动串场词、队列收起、进度条拖拽 |
| `.claudio/taste.md` | 新增 | 用户品味语料模板 |
| `docs/agent-progress.md` | 修改 | 更新实施进度 |

---

### Task 1: 后端 — speak 动作 + 系统提示词增强

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: 在 executeActions 中新增 speak 动作处理**

在 `server/index.js` 的 `executeActions` 函数中，在 `type === 'explain_current'` 块之后、`type === 'search_music'` 块之前，插入：

```javascript
if (type === 'speak' && action.text) {
  sseSend(res, 'assistant_delta', { text: action.text })
  const speech = await createSpeech(action.text)
  sseSend(res, 'sentence_ready', speech)
  continue
}
```

- [ ] **Step 2: 更新系统提示词**

在 `buildAgentPrompt` 函数中，做两处修改：

a) 在"风格"部分末尾加入：
```
- 每次找歌或切歌时，用 speak 动作说一句简短的串场词，像深夜电台 DJ 一样自然过渡。串场词要简短（1-2句），不要重复相同的句式。
```

b) 在"允许的 action type"列表末尾加入：
```
- speak: {"type":"speak","text":"你想说的串场词或过渡语"}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add server/index.js
git commit -m "feat: add speak action type and enhance DJ system prompt"
```

---

### Task 2: 后端 — 环境信息 + 品味语料

**Files:**
- Modify: `server/index.js`
- Create: `.claudio/taste.md`

- [ ] **Step 1: 创建品味语料模板**

创建文件 `.claude/taste.md`：

```markdown
# 我的音乐品味

## 喜欢的风格
（在此填写，比如：轻音乐、钢琴、华语流行、电子）

## 不喜欢的
（在此填写，比如：重金属、说唱、过于吵闹的音乐）

## 常用场景
- 学习时：喜欢安静的纯音乐
- 睡前：喜欢舒缓的钢琴曲
- 运动时：喜欢节奏感强的歌
- 焦虑时：喜欢治愈系轻音乐

## 其他偏好
（在此填写任何想让 Claudio 知道的音乐偏好）
```

- [ ] **Step 2: 在 buildAgentPrompt 中加载 taste.md 和环境信息**

在 `buildAgentPrompt` 函数开头（`const current = stateCache.currentTrack` 之前），加入：

```javascript
let tasteText = ''
try {
  tasteText = readFileSync(path.join(runtimeDir, 'taste.md'), 'utf8').trim()
} catch {}

const now = new Date()
const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const hour = now.getHours()
let timeContext = '白天'
if (hour >= 22 || hour < 6) timeContext = '深夜'
else if (hour >= 18) timeContext = '傍晚'
else if (hour >= 12) timeContext = '下午'
else if (hour >= 6) timeContext = '早上'
```

在提示词的"当前状态"部分，在"当前心情"之前加入：
```
- 当前时间：${timeStr}（${timeContext}）
```

在"记忆摘要"之后加入：
```

用户品味：
${tasteText || '（用户还没填写品味档案。）'}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add server/index.js .claudio/taste.md
git commit -m "feat: add environment info and taste corpus to Claude prompt"
```

---

### Task 3: 后端 — 简单指令分流

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: 在 handleChat 开头添加指令分流**

在 `handleChat` 函数中，`await loadState()` 之后、`stateCache.messages.push(...)` 之前，插入：

```javascript
const quickReply = handleQuickCommand(userMessage, res)
if (quickReply) {
  sseStart(res)
  sseSend(res, 'assistant_delta', { text: quickReply })
  sseSend(res, 'sentence_ready', { text: quickReply, audioUrl: '', fallback: true })
  stateCache.messages.push({ id: randomUUID(), role: 'user', text: userMessage, at: new Date().toISOString() })
  stateCache.messages.push({ id: randomUUID(), role: 'assistant', text: quickReply, at: new Date().toISOString() })
  await saveState()
  sseSend(res, 'done', { state: publicState(), fallback: false })
  res.end()
  return
}
```

在 `handleChat` 函数之前，添加 `handleQuickCommand` 函数：

```javascript
function handleQuickCommand(message, res) {
  const text = message.trim()

  if (/^(下一首|换一首|切歌|下一曲)$/.test(text)) {
    if (stateCache.queue.length > 1) {
      const currentIndex = stateCache.queue.findIndex(t => t.id === stateCache.currentTrack?.id)
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % stateCache.queue.length : 0
      stateCache.currentTrack = stateCache.queue[nextIndex]
      stateCache.isPlaying = true
      sseSend(res, 'now_playing', { track: stateCache.currentTrack, queue: stateCache.queue })
    }
    return '好，切到下一首。'
  }

  if (/^(上一首|上一曲)$/.test(text)) {
    if (stateCache.queue.length > 1) {
      const currentIndex = stateCache.queue.findIndex(t => t.id === stateCache.currentTrack?.id)
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : stateCache.queue.length - 1
      stateCache.currentTrack = stateCache.queue[prevIndex]
      stateCache.isPlaying = true
      sseSend(res, 'now_playing', { track: stateCache.currentTrack, queue: stateCache.queue })
    }
    return '好，回到上一首。'
  }

  if (/^(暂停|停一下|暂停播放)$/.test(text)) {
    stateCache.isPlaying = false
    sseSend(res, 'player_command', { action: 'pause' })
    return '好，暂停了。'
  }

  if (/^(继续|继续播放|接着放)$/.test(text)) {
    stateCache.isPlaying = true
    sseSend(res, 'player_command', { action: 'play' })
    return '好，继续播放。'
  }

  if (/^(声音小点|小声点|音量小|轻一点)$/.test(text)) {
    stateCache.volume = Math.max(0, stateCache.volume - 0.15)
    return '好，放轻一点了。'
  }

  if (/^(声音大点|大声点|音量大|响一点)$/.test(text)) {
    stateCache.volume = Math.min(1, stateCache.volume + 0.15)
    return '好，推高一点了。'
  }

  if (/^(别说话了|只放音乐|不要说话|安静)$/.test(text)) {
    return '好，我先不说话，只放音乐。'
  }

  return null
}
```

- [ ] **Step 2: 验证构建**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add server/index.js
git commit -m "feat: add quick command routing for simple DJ instructions"
```

---

### Task 4: 后端 — GET /api/now 端点

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: 添加 /api/now 路由**

在 `server/index.js` 的 HTTP server 路由中（在 `/api/state` 路由之后），添加：

```javascript
if (req.method === 'GET' && url.pathname === '/api/now') {
  await loadState()
  jsonResponse(res, 200, {
    track: stateCache.currentTrack,
    isPlaying: stateCache.isPlaying,
    volume: stateCache.volume,
    queueLength: stateCache.queue.length,
    mood: stateCache.mood
  })
  return
}
```

- [ ] **Step 2: 验证构建**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add server/index.js
git commit -m "feat: add GET /api/now endpoint for quick status"
```

---

### Task 5: 前端 — 自动串场词

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 添加 requestTransition 函数**

在 `src/App.jsx` 的 `App` 函数中，在 `startMusic` 函数之前，添加：

```javascript
const transitionAbortRef = useRef(null)

function requestTransition(track) {
  if (!track) return
  transitionAbortRef.current?.abort()
  const controller = new AbortController()
  transitionAbortRef.current = controller

  const transitionId = `transition-${Date.now()}`
  streamChatDjMessage(
    `[系统：歌曲已切换到 "${track.title}" - ${track.artist || '未知'}，请用 speak 动作说一句简短的串场词。]`,
    {
      signal: controller.signal,
      onEvent: (payload) => {
        const { event, data } = payload
        if (event === 'sentence_ready' && data?.text) {
          enqueueVoice(data)
        }
      }
    }
  ).catch(() => {})
}
```

- [ ] **Step 2: 在 startMusic 中触发串场词**

在 `startMusic` 函数中，在 `audio.play().then(...)` 的成功回调里（`setPhase('playing')` 之后），添加：

```javascript
requestTransition(track)
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add src/App.jsx
git commit -m "feat: auto-generate DJ transitions on track change"
```

---

### Task 6: 前端 — 队列收起按钮

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 添加队列展开状态**

在 `src/App.jsx` 的 `App` 函数中，与其他 `useState` 声明一起，添加：

```javascript
const [isQueueExpanded, setIsQueueExpanded] = useState(true)
```

- [ ] **Step 2: 修改队列区域 UI**

找到队列区域的代码（在 `<footer>` 中，`Queue · {queue.length} tracks` 那一段），把：

```jsx
<span className="flex items-center gap-2 text-xs font-medium" style={{ color: '#30323a' }}>
  <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#7C5CFF' }} />
  Queue · {queue.length} tracks
</span>
```

改成：

```jsx
<button
  type="button"
  onClick={() => setIsQueueExpanded(prev => !prev)}
  className="flex items-center gap-2 text-xs font-medium"
  style={{ color: '#30323a' }}
>
  <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#7C5CFF' }} />
  Queue · {queue.length} tracks
  <span className="text-[10px]" style={{ color: '#6c6f78' }}>
    {isQueueExpanded ? '▾' : '▸'}
  </span>
</button>
```

然后把队列列表的 `<div className="max-h-28 space-y-1 overflow-y-auto ...">` 包裹在条件渲染中：

```jsx
{isQueueExpanded && (
  <div className="max-h-28 space-y-1 overflow-y-auto rounded-2xl p-1.5" style={{ background: 'rgba(255,255,255,0.24)', border: '1px solid rgba(255,255,255,0.20)' }}>
    {queue.slice(0, 8).map((track, index) => {
      // ... 原有代码不变
    })}
  </div>
)}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add src/App.jsx
git commit -m "feat: add queue collapse/expand toggle button"
```

---

### Task 7: 前端 — 进度条点击 + 拖拽

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 添加拖拽状态和 ref**

在 `src/App.jsx` 的 `App` 函数中，添加：

```javascript
const [isDragging, setIsDragging] = useState(false)
const progressRef = useRef(null)

function handleSeek(clientX) {
  if (!progressRef.current || !audioRef.current) return
  const rect = progressRef.current.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const seekTime = percent * trackDuration
  audioRef.current.currentTime = seekTime
  setTrackTime(seekTime)
}
```

- [ ] **Step 2: 修改进度条 JSX**

找到播放器中的进度条 `<div>`（包含 44 个小条的那一个），把：

```jsx
<div className="flex h-8 flex-1 items-center gap-0.5 overflow-hidden rounded-full px-2" style={{ background: 'rgba(255,255,255,0.36)' }}>
```

改成：

```jsx
<div
  ref={progressRef}
  className="flex h-8 flex-1 cursor-pointer items-center gap-0.5 overflow-hidden rounded-full px-2"
  style={{ background: 'rgba(255,255,255,0.36)' }}
  onPointerDown={(e) => { setIsDragging(true); handleSeek(e.clientX) }}
  onPointerMove={(e) => { if (isDragging) handleSeek(e.clientX) }}
  onPointerUp={() => setIsDragging(false)}
  onPointerLeave={() => setIsDragging(false)}
>
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add src/App.jsx
git commit -m "feat: add progress bar click and drag seeking"
```

---

### Task 8: 更新进度文档 + 推送

**Files:**
- Modify: `docs/agent-progress.md`

- [ ] **Step 1: 更新 agent-progress.md**

在 `docs/agent-progress.md` 文件开头（在第一个 `##` 之前），添加新的进度条目：

```markdown
## 2026-05-15 DJ 增强 + UI 交互改进

### Completed Work

- 已新增 `speak` 动作类型，Claude 可以通过 `{"type":"speak","text":"串场词"}` 请求朗读串场词。
- 已更新系统提示词，要求 Claude 在找歌或切歌时用 speak 动作说简短串场词。
- 已在提示词中加入当前时间和时段判断（深夜/早上/下午/傍晚/白天），Claude 会根据时间调整推荐风格。
- 已创建 `.claudio/taste.md` 用户品味语料模板，内容会拼入 Claude 提示词。
- 已新增简单指令分流：下一首、上一首、暂停、继续、声音大/小点等指令直接执行，不调 Claude。
- 已新增 `GET /api/now` 端点，返回当前播放状态快照。
- 已新增切歌时自动请求 Claude 生成串场词并 TTS 播放。
- 已新增播放队列收起/展开按钮。
- 已新增进度条点击和拖拽跳转功能。

### Changed Files

- `server/index.js`：speak 动作、环境信息、品味语料、指令分流、/api/now 端点。
- `src/App.jsx`：自动串场词、队列收起按钮、进度条拖拽。
- `.claudio/taste.md`：新增品味语料模板。
```

- [ ] **Step 2: 提交并推送**

```bash
git add docs/agent-progress.md
git commit -m "docs: update agent-progress with DJ enhancements"
git push origin codex/xiao-dj-queue-netease-center
```
