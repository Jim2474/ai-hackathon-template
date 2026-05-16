import http from 'node:http'
import { readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const runtimeDir = path.join(rootDir, '.claudio')
const ttsDir = path.join(runtimeDir, 'tts')
const statePath = path.join(runtimeDir, 'state.json')
const libraryPath = path.join(runtimeDir, 'music-library.md')

loadDotEnv(path.join(rootDir, '.env'))
loadDotEnv(path.join(rootDir, '.env.local'))

const PORT = Number(process.env.CLAUDIO_SERVER_PORT || 8080)
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude'
const NETEASE_BASE_URL = cleanBaseUrl(process.env.NETEASE_API_BASE_URL || process.env.VITE_NETEASE_API_BASE_URL || 'http://127.0.0.1:3000')
const TTS_BASE_URL = cleanBaseUrl(process.env.TTS_BASE_URL || 'https://api.openai.com/v1')
const TTS_API_KEY = String(process.env.TTS_API_KEY || '').trim()
const TTS_MODEL = String(process.env.TTS_MODEL || 'gpt-4o-mini-tts').trim()
const TTS_VOICE = String(process.env.TTS_VOICE || 'alloy').trim()
const MINIMAX_TTS_BASE_URL = cleanBaseUrl(process.env.MINIMAX_TTS_BASE_URL || process.env.VITE_MINIMAX_TTS_BASE_URL || 'https://api.minimaxi.com/v1')
const MINIMAX_TTS_API_KEY = String(process.env.MINIMAX_TTS_API_KEY || process.env.VITE_MINIMAX_TTS_API_KEY || process.env.VITE_MINIMAX_API_KEY || '').trim()
const MINIMAX_TTS_MODEL = String(process.env.MINIMAX_TTS_MODEL || process.env.VITE_MINIMAX_TTS_MODEL || 'speech-2.8-turbo').trim()
const MINIMAX_TTS_VOICE = String(process.env.MINIMAX_TTS_VOICE || process.env.VITE_MINIMAX_TTS_VOICE_ID || 'Chinese (Mandarin)_Wise_Women').trim()

const DEFAULT_STATE = {
  summary: '',
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      text: '我是 Claudio。你不用想好要听什么，直接跟我说你现在的状态就行。',
      at: new Date().toISOString()
    }
  ],
  queue: [],
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  mood: 'calm',
  preferences: {
    voice: 'friend-dj',
    output: 'browser-audio'
  },
  updatedAt: new Date().toISOString()
}

let stateCache = null

function loadDotEnv(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return
      const index = trimmed.indexOf('=')
      const key = trimmed.slice(0, index).trim()
      const rawValue = trimmed.slice(index + 1).trim()
      if (!key || process.env[key] !== undefined) return
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
    })
  } catch {
    // Optional local env file.
  }
}

function cleanBaseUrl(value) {
  return String(value || '').trim().replace(/[`'"]/g, '').replace(/\/+$/, '')
}

function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function copyUpstreamHeaders(source, res) {
  source.headers.forEach((value, key) => {
    if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
      res.setHeader(key, value)
    }
  })
}

async function readJsonBody(req) {
  const raw = await readBody(req)
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

async function ensureRuntime() {
  await fs.mkdir(ttsDir, { recursive: true })
}

async function loadState() {
  if (stateCache) return stateCache
  await ensureRuntime()
  try {
    const raw = await fs.readFile(statePath, 'utf8')
    stateCache = {
      ...DEFAULT_STATE,
      ...JSON.parse(raw)
    }
  } catch {
    stateCache = { ...DEFAULT_STATE }
    await saveState()
  }
  return stateCache
}

async function saveState() {
  await ensureRuntime()
  stateCache = {
    ...stateCache,
    updatedAt: new Date().toISOString()
  }
  await fs.writeFile(statePath, JSON.stringify(stateCache, null, 2), 'utf8')
}

function publicState() {
  return {
    ...stateCache,
    config: {
      claudeBin: CLAUDE_BIN,
      neteaseBaseUrl: NETEASE_BASE_URL,
      ttsConfigured: Boolean(TTS_API_KEY || MINIMAX_TTS_API_KEY),
      ttsProvider: TTS_API_KEY ? 'openai-compatible' : MINIMAX_TTS_API_KEY ? 'minimax' : 'browser-speech',
      ttsModel: TTS_API_KEY ? TTS_MODEL : MINIMAX_TTS_MODEL,
      ttsVoice: TTS_API_KEY ? TTS_VOICE : MINIMAX_TTS_VOICE
    }
  }
}

function sseStart(res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  setCors(res)
  res.write(': connected\n\n')
}

function sseSend(res, event, data = {}) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function getRecentMessagesForPrompt(messages = []) {
  return messages
    .slice(-12)
    .map(message => `${message.role === 'user' ? '用户' : 'Claudio'}：${message.text}`)
    .join('\n')
}

function buildAgentPrompt(userMessage) {
  let tasteText = ''
  try {
    tasteText = readFileSync(path.join(runtimeDir, 'taste.md'), 'utf8').trim()
  } catch {}

  let libraryText = ''
  try {
    libraryText = readFileSync(libraryPath, 'utf8').trim()
  } catch {}

  const now = new Date()
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const hour = now.getHours()
  let timeContext = '白天'
  if (hour >= 22 || hour < 6) timeContext = '深夜'
  else if (hour >= 18) timeContext = '傍晚'
  else if (hour >= 12) timeContext = '下午'
  else if (hour >= 6) timeContext = '早上'

  const current = stateCache.currentTrack
  const queuePreview = stateCache.queue.slice(0, 6).map((track, index) => `${index + 1}. ${track.title} - ${track.artist}`).join('\n')

  return `你是 Claudio，一个朋友型私人 AI DJ。你在和用户聊天，也能帮用户找歌、切歌、解释当前歌曲。

风格：
- 像朋友坐在旁边陪用户听歌，自然、松弛、少一点客服腔。
- 先回应用户的状态，再决定要不要找歌。
- 每次回复 1 到 4 句，别长篇报告。
- 不要说”根据您的需求””以下是方案””我将为您”。
- 每次找歌或切歌时，用 speak 动作说一段串场词，风格参考：
  * 像深夜一个人守着调音台的主播，在听众耳边轻声说话
  * 可以讲这首歌的故事、创作背景、或你第一次听到它的感觉
  * 可以描述声音的画面感："a song that moves with your breath"、"let every line end in a whisper"
  * 可以回应用户当下的状态："It's late on a Monday"、"After a long day, just breathe"
  * 串场词 2-5 句，最后一句自然地引出歌名
  * 不要用"为您推荐"、"接下来播放"这种播报腔
  * 不要每次都用"这首歌"开头，变化要多
  * 语言可以中英混搭，也可以全中文，看心情

当前状态：
- 当前时间：${timeStr}（${timeContext}）
- 当前心情：${stateCache.mood || 'calm'}
- 当前歌曲：${current ? `${current.title} - ${current.artist}` : '暂无'}
- 队列：
${queuePreview || '暂无队列'}
- 记忆摘要：${stateCache.summary || '还没有长期摘要。'}

用户品味：
${tasteText || '（用户还没填写品味档案。）'}

${libraryText ? `用户的音乐库（以下是用户收藏的歌曲和歌单，推荐时优先从这里挑选）：\n\`\`\`\n${libraryText.slice(0, 8000)}\n\`\`\`` : '（用户还没同步音乐库。）'}

最近对话：
${getRecentMessagesForPrompt(stateCache.messages)}

工具动作：
如果用户想听歌、换歌、找相似、调整氛围，请在回复最后追加一个隐藏动作块：
<claudio_actions>{"mood":"calm","actions":[{"type":"search_music","query":"轻松 中文 流行","count":5}]}</claudio_actions>

允许的 action type 只有：
- search_music: {"type":"search_music","query":"关键词","count":5}
- play_now: {"type":"play_now"}
- pause: {"type":"pause"}
- skip: {"type":"skip"}
- explain_current: {"type":"explain_current"}
- adjust_mood: {"type":"adjust_mood","mood":"calm"}
- speak: {"type":"speak","text":"你想说的串场词或过渡语"}
- load_favorites: {"type":"load_favorites","count":5}

如果只是普通聊天，可以不写动作块。
动作块不要解释给用户看。

用户刚说：${userMessage}`
}

function extractVisibleText(raw) {
  let output = ''
  let rest = raw
  while (rest) {
    const start = rest.indexOf('<claudio_actions>')
    if (start === -1) {
      output += rest
      break
    }
    output += rest.slice(0, start)
    const end = rest.indexOf('</claudio_actions>', start)
    if (end === -1) break
    rest = rest.slice(end + '</claudio_actions>'.length)
  }
  return sanitizeAssistantText(stripDanglingActionTag(output))
}

function sanitizeAssistantText(text) {
  const cleaned = String(text || '')
    .replace(/Permission to use [\s\S]*?Let the user decide how to proceed\./g, '')
    .replace(/<EXTREMELY_IMPORTANT>[\s\S]*?<\/EXTREMELY_IMPORTANT>/g, '')
    .replace(/```[\s\S]*?```/g, match => match.includes('digraph skill_flow') ? '' : match)
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return dedupeRepeatedSentences(cleaned)
}

function stripDanglingActionTag(text) {
  const value = String(text || '')
  const lastOpen = value.lastIndexOf('<')
  if (lastOpen === -1) return value

  const tail = value.slice(lastOpen)
  const actionTags = ['<claudio_actions>', '</claudio_actions>']
  if (actionTags.some(tag => tag.startsWith(tail))) {
    return value.slice(0, lastOpen)
  }

  return value
}

function dedupeRepeatedSentences(text) {
  const pieces = String(text || '').match(/[^。！？!?；;\n]+[。！？!?；;]?|\n+/g) || []
  const seen = new Set()
  const output = []

  for (const piece of pieces) {
    if (/^\n+$/.test(piece)) {
      if (output.length && output[output.length - 1] !== '\n') output.push('\n')
      continue
    }

    const normalized = piece.replace(/\s+/g, '').trim()
    if (!normalized) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    output.push(piece.trim())
  }

  return output.join('').replace(/\n{3,}/g, '\n\n').trim()
}

function extractActions(raw) {
  const actions = []
  const regex = /<claudio_actions>([\s\S]*?)<\/claudio_actions>/g
  let mood = ''
  let match
  while ((match = regex.exec(raw))) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.mood) mood = String(parsed.mood)
      if (Array.isArray(parsed.actions)) actions.push(...parsed.actions)
    } catch {
      // Bad action JSON should not break the conversation.
    }
  }
  return { mood, actions }
}

function looksLikeMusicRequest(text) {
  return /歌|音乐|播放|放点|来点|听|换|下一首|推荐|电台|BGM|bgm|节奏|轻松|烦|焦虑|学习|写代码|睡|运动/.test(text)
}

function fallbackActions(userMessage, actions) {
  if (actions.length > 0) return actions
  if (!looksLikeMusicRequest(userMessage)) return []
  return [{ type: 'search_music', query: userMessage.slice(0, 28), count: 5 }]
}

function extractTextFromClaudeEvent(event) {
  if (!event || typeof event !== 'object') return ''
  if (event.type === 'stream_event' && event.event?.delta?.type === 'text_delta') {
    return event.event.delta.text || ''
  }
  if (typeof event.delta?.text === 'string') return event.delta.text
  if (typeof event.content_block?.text === 'string') return event.content_block.text
  return ''
}

function extractFallbackResultFromClaudeEvent(event) {
  if (!event || typeof event !== 'object') return ''
  return event.type === 'result' && typeof event.result === 'string' ? event.result : ''
}

function fallbackAssistantText(userMessage) {
  if (looksLikeMusicRequest(userMessage)) {
    return '我懂，你现在不是想认真挑歌，是想让房间先有个合适的气氛。我先帮你找几首贴一点、不会太突兀的。'
  }
  return '我在。你可以就这样说，不用整理成命令。我会先听你说，再慢慢把音乐接上。'
}

function runClaude(userMessage, onText) {
  return new Promise((resolve) => {
    const prompt = buildAgentPrompt(userMessage)
    const quotedClaudeBin = `"${CLAUDE_BIN.replace(/"/g, '\\"')}"`
    const bareArgs = process.env.CLAUDIO_CLAUDE_BARE === 'false' ? '' : '--bare '
    const command = `${quotedClaudeBin} -p ${bareArgs}--no-session-persistence --disable-slash-commands --strict-mcp-config --mcp-config "{\\"mcpServers\\":{}}" --output-format stream-json --verbose --include-partial-messages --tools "" --permission-mode dontAsk`
    const child = spawn(command, {
      cwd: rootDir,
      windowsHide: true,
      shell: true,
      env: process.env
    })
    child.stdin.write(prompt)
    child.stdin.end()

    let stdout = ''
    let stderr = ''
    let lineBuffer = ''
    let rawAssistant = ''
    let fallbackResult = ''
    let lastVisible = ''
    let settled = false
    const timeout = setTimeout(() => {
      child.kill()
    }, Number(process.env.CLAUDIO_CLAUDE_TIMEOUT_MS || 45000))

    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
      lineBuffer += chunk.toString()
      const lines = lineBuffer.split(/\r?\n/)
      lineBuffer = lines.pop() || ''
      lines.forEach(line => {
        const trimmed = line.trim()
        if (!trimmed) return
        try {
          const event = JSON.parse(trimmed)
          const text = extractTextFromClaudeEvent(event)
          const resultText = extractFallbackResultFromClaudeEvent(event)
          if (resultText && !rawAssistant) fallbackResult = resultText
          if (!text) return
          rawAssistant += text
          const visible = extractVisibleText(rawAssistant)
          const delta = visible.slice(lastVisible.length)
          if (delta) {
            lastVisible = visible
            onText(delta, visible)
          }
        } catch {
          // Ignore non-JSON progress lines.
        }
      })
    })

    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
    })

    child.on('close', code => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (!rawAssistant) {
        const cleanFallback = sanitizeAssistantText(fallbackResult)
        const text = cleanFallback || fallbackAssistantText(userMessage)
        onText(text, text)
        resolve({ text, raw: text, fallback: true, code, stderr })
        return
      }
      const visible = extractVisibleText(rawAssistant).trim()
      resolve({ text: visible || fallbackAssistantText(userMessage), raw: rawAssistant, fallback: code !== 0, code, stderr, stdout })
    })

    child.on('error', error => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      const text = fallbackAssistantText(userMessage)
      onText(text, text)
      resolve({ text, raw: text, fallback: true, error: error.message })
    })
  })
}

function popCompleteSentences(pending) {
  const sentences = []
  let rest = pending
  const regex = /(.+?[。！？!?；;])(\s|$)/
  let match = rest.match(regex)
  while (match) {
    const sentence = match[1].trim()
    if (sentence) sentences.push(sentence)
    rest = rest.slice(match.index + match[0].length)
    match = rest.match(regex)
  }
  return { sentences, rest }
}

async function createSpeech(text, overrides = {}) {
  const cleanText = String(text || '').trim()
  if (!cleanText) return { text: cleanText, audioUrl: '', fallback: true }
  if (TTS_API_KEY) {
    return createOpenAiCompatibleSpeech(cleanText)
  }
  if (MINIMAX_TTS_API_KEY) {
    return createMiniMaxSpeech(cleanText, overrides)
  }

  return { text: cleanText, audioUrl: '', fallback: true, error: 'TTS_API_KEY or MINIMAX_TTS_API_KEY is not configured' }
}

async function createOpenAiCompatibleSpeech(cleanText) {
  const response = await fetch(`${TTS_BASE_URL}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TTS_API_KEY}`
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: cleanText,
      response_format: 'mp3'
    })
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    return { text: cleanText, audioUrl: '', fallback: true, error: errorText || `TTS failed ${response.status}` }
  }

  const audio = Buffer.from(await response.arrayBuffer())
  await ensureRuntime()
  const id = `${Date.now()}-${randomUUID()}.mp3`
  await fs.writeFile(path.join(ttsDir, id), audio)
  return {
    text: cleanText,
    id,
    audioUrl: `/api/tts/${encodeURIComponent(id)}`,
    bytes: audio.length,
    fallback: false
  }
}

function audioHexToBuffer(value) {
  const cleanHex = String(value || '').trim().replace(/^0x/i, '')
  if (!cleanHex || cleanHex.length % 2 !== 0 || /[^0-9a-f]/i.test(cleanHex)) {
    throw new Error('MiniMax TTS response has invalid audio hex')
  }
  return Buffer.from(cleanHex, 'hex')
}

async function createMiniMaxSpeech(cleanText, overrides = {}) {
  const voiceId = String(overrides.voiceId || MINIMAX_TTS_VOICE).trim()
  const speed = Math.min(2, Math.max(0.5, Number(overrides.speed ?? process.env.MINIMAX_TTS_SPEED ?? process.env.VITE_MINIMAX_TTS_SPEED ?? 1.04)))
  const volume = Number(process.env.MINIMAX_TTS_VOLUME || process.env.VITE_MINIMAX_TTS_VOLUME || 1)
  const pitch = Math.min(12, Math.max(-12, Number(overrides.pitch ?? process.env.MINIMAX_TTS_PITCH ?? process.env.VITE_MINIMAX_TTS_PITCH ?? -1)))
  console.log('[TTS DEBUG] createMiniMaxSpeech:', cleanText.slice(0, 30), '| voiceId:', voiceId, '| overrides:', JSON.stringify(overrides))

  const response = await fetch(`${MINIMAX_TTS_BASE_URL}/t2a_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MINIMAX_TTS_API_KEY}`
    },
    body: JSON.stringify({
      model: MINIMAX_TTS_MODEL,
      text: cleanText,
      stream: false,
      output_format: 'hex',
      voice_setting: {
        voice_id: voiceId,
        speed,
        vol: volume,
        pitch
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1
      },
      subtitle_enable: false
    })
  })

  const responseText = await response.text()
  if (!response.ok) {
    return { text: cleanText, audioUrl: '', fallback: true, error: responseText || `MiniMax TTS failed ${response.status}` }
  }

  const data = JSON.parse(responseText)
  const statusCode = data?.base_resp?.status_code
  if (statusCode !== undefined && statusCode !== 0) {
    return { text: cleanText, audioUrl: '', fallback: true, error: data?.base_resp?.status_msg || `MiniMax TTS error ${statusCode}` }
  }

  const audio = audioHexToBuffer(data?.data?.audio)
  await ensureRuntime()
  const id = `${Date.now()}-${randomUUID()}.mp3`
  await fs.writeFile(path.join(ttsDir, id), audio)
  return {
    text: cleanText,
    id,
    audioUrl: `/api/tts/${encodeURIComponent(id)}`,
    bytes: audio.length,
    durationMs: Number(data?.extra_info?.audio_length || data?.data?.audio_length || 0),
    fallback: false,
    provider: 'minimax'
  }
}

async function requestNetease(pathname, params = {}) {
  const url = new URL(`${NETEASE_BASE_URL}${pathname}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url)
  if (!response.ok) throw new Error(`NetEase HTTP ${response.status}`)
  const data = await response.json()
  if (data?.code !== undefined && ![200].includes(data.code)) {
    throw new Error(data.message || data.msg || `NetEase code ${data.code}`)
  }
  return data
}

async function proxyNeteaseRequest(req, res, url) {
  const strippedPath = url.pathname.replace(/^\/api\/netease/, '') || '/'
  const targetUrl = new URL(`${NETEASE_BASE_URL}${strippedPath}`)
  url.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value)
  })

  const method = req.method || 'GET'
  const headers = {
    Accept: req.headers.accept || 'application/json'
  }
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type']
  }

  const response = await fetch(targetUrl, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : await readBody(req)
  })

  res.statusCode = response.status
  copyUpstreamHeaders(response, res)
  res.end(Buffer.from(await response.arrayBuffer()))
}

function artistText(song) {
  const artists = song?.artists || song?.ar || []
  return Array.isArray(artists) && artists.length
    ? artists.map(artist => artist.name).filter(Boolean).join(' / ')
    : '未知歌手'
}

function coverUrl(song) {
  return song?.album?.picUrl || song?.album?.blurPicUrl || song?.al?.picUrl || song?.picUrl || ''
}

async function searchMusic(query, count = 5, cookie = '') {
  const data = await requestNetease('/search', {
    keywords: query,
    type: 1,
    limit: Math.max(8, count * 4),
    cookie
  })
  const songs = Array.isArray(data?.result?.songs) ? data.result.songs : []
  const tracks = []
  const seen = new Set()

  for (const song of songs) {
    if (tracks.length >= count) break
    if (!song?.id || seen.has(song.id)) continue
    seen.add(song.id)
    try {
      const urlData = await requestNetease('/song/url', {
        id: song.id,
        br: 320000,
        cookie
      })
      const item = Array.isArray(urlData?.data) ? urlData.data[0] : null
      if (!item?.url) continue
      tracks.push({
        id: `netease-${song.id}`,
        neteaseId: song.id,
        title: song.name || '未知歌曲',
        artist: artistText(song),
        album: song?.album?.name || song?.al?.name || '',
        duration: Math.round((song.duration || song.dt || 0) / 1000),
        sourceType: 'netease',
        source: 'NetEase',
        audioUrl: item.url,
        coverUrl: coverUrl(song),
        raw: song
      })
    } catch {
      // Try the next song; copyrighted tracks often fail here.
    }
  }

  if (tracks.length === 0) throw new Error('网易云没有返回可播放歌曲')
  return tracks
}

async function syncMusicLibrary(cookie) {
  const lines = ['# 我的音乐库\n']
  lines.push(`> 同步时间：${new Date().toLocaleString('zh-CN')}\n`)

  const seenSongIds = new Set()
  const formatSong = (song) => {
    const artists = (song.ar || song.artists || []).map(a => a.name).filter(Boolean).join(' / ')
    const album = song.al?.name || song.album?.name || ''
    const duration = Math.round((song.dt || song.duration || 0) / 1000)
    const mins = Math.floor(duration / 60)
    const secs = String(duration % 60).padStart(2, '0')
    return `${song.name} | ${artists} | ${album} | ${mins}:${secs}`
  }

  const fetchSongDetails = async (ids) => {
    const songs = []
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)
      try {
        const detailData = await requestNetease('/song/detail', { ids: batch.join(','), cookie })
        for (const song of (detailData?.songs || [])) {
          if (!seenSongIds.has(song.id)) {
            seenSongIds.add(song.id)
            songs.push(formatSong(song))
          }
        }
      } catch {}
    }
    return songs
  }

  // Get user ID from cookie
  let userId = ''
  try {
    const accountData = await requestNetease('/user/account', { cookie })
    userId = accountData?.account?.id || accountData?.profile?.userId || ''
  } catch {}

  // Fetch playlists and their songs
  try {
    const playlistData = await requestNetease('/user/playlist', { uid: userId, cookie, limit: 50 })
    const playlists = playlistData?.playlist || []
    if (playlists.length > 0) {
      lines.push(`## 我的歌单（${playlists.length} 个）\n`)
      for (const pl of playlists) {
        const trackCount = pl.trackCount || 0
        const playCount = pl.playCount || 0
        const playCountText = playCount >= 10000 ? `${(playCount / 10000).toFixed(1)}万` : String(playCount)
        lines.push(`- **${pl.name}**（${trackCount}首，播放${playCountText}）`)
      }
      lines.push('')

      // Fetch songs from each playlist
      for (const pl of playlists) {
        try {
          const detailData = await requestNetease('/playlist/detail', { id: pl.id, cookie })
          const trackIds = (detailData?.playlist?.trackIds || detailData?.trackIds || []).map(t => t.id || t)
          if (trackIds.length === 0) continue

          lines.push(`### ${pl.name}（${trackIds.length}首）\n`)
          const songs = await fetchSongDetails(trackIds)
          if (songs.length > 0) {
            lines.push('```')
            songs.forEach((line, i) => {
              lines.push(`${i + 1}. ${line}`)
            })
            lines.push('```\n')
          }
        } catch {}
      }
    }
  } catch (e) {
    lines.push(`## 歌单获取失败：${e.message}\n`)
  }

  // Fetch liked songs (收藏歌曲)
  try {
    const likedData = await requestNetease('/likelist', { uid: userId, cookie })
    const likedIds = likedData?.ids || []
    lines.push(`## 收藏歌曲（共 ${likedIds.length} 首）\n`)

    const allSongs = await fetchSongDetails(likedIds)

    if (allSongs.length > 0) {
      lines.push('```')
      allSongs.forEach((line, i) => {
        lines.push(`${i + 1}. ${line}`)
      })
      lines.push('```')
    }
    lines.push('')
  } catch (e) {
    lines.push(`## 收藏歌曲获取失败：${e.message}\n`)
  }

  const content = lines.join('\n')
  await fs.writeFile(libraryPath, content, 'utf8')
  return { songs: content.includes('\n1. ') ? content.split('\n').filter(l => /^\d+\./.test(l.trim())).length : 0 }
}

async function loadUserFavorites(cookie, count = 5) {
  const likedData = await requestNetease('/likelist', { cookie })
  const likedIds = (likedData?.ids || []).slice(0, count * 2)
  if (likedIds.length === 0) throw Error('没有收藏歌曲')

  const detailData = await requestNetease('/song/detail', { ids: likedIds.join(','), cookie })
  const songs = detailData?.songs || []
  const tracks = []

  for (const song of songs) {
    if (tracks.length >= count) break
    try {
      const urlData = await requestNetease('/song/url', { id: song.id, br: 320000, cookie })
      const item = Array.isArray(urlData?.data) ? urlData.data[0] : null
      if (!item?.url) continue
      tracks.push({
        id: `netease-${song.id}`,
        neteaseId: song.id,
        title: song.name || '未知歌曲',
        artist: artistText(song),
        album: song?.al?.name || song?.album?.name || '',
        duration: Math.round((song.dt || song.duration || 0) / 1000),
        sourceType: 'netease',
        source: 'NetEase',
        audioUrl: item.url,
        coverUrl: coverUrl(song),
        raw: song
      })
    } catch {}
  }

  if (tracks.length === 0) throw new Error('收藏歌曲暂时拿不到播放地址')
  return tracks
}

async function fallbackLocalTracks(count = 5) {
  const module = await import('../src/data/localAudioLibrary.js')
  return module.localAudioLibrary.slice(0, count).map(track => ({
    ...track,
    duration: track.duration || 150,
    sourceType: 'local',
    source: 'Local Demo'
  }))
}

async function executeActions(actions, context, res) {
  for (const action of actions) {
    const type = String(action?.type || '')
    if (type === 'adjust_mood' && action.mood) {
      stateCache.mood = String(action.mood)
      continue
    }
    if (type === 'pause') {
      stateCache.isPlaying = false
      sseSend(res, 'player_command', { action: 'pause' })
      continue
    }
    if (type === 'skip') {
      sseSend(res, 'player_command', { action: 'skip' })
      continue
    }
    if (type === 'play_now') {
      if (stateCache.currentTrack) {
        stateCache.isPlaying = true
        sseSend(res, 'now_playing', { track: stateCache.currentTrack, queue: stateCache.queue })
      }
      continue
    }
    if (type === 'explain_current') {
      const track = stateCache.currentTrack
      if (track) {
        const text = `这首是 ${track.artist} 的《${track.title}》。我把它放在这里，是想让现在的气氛继续贴着你，不突然用力。`
        sseSend(res, 'assistant_delta', { text })
        const speech = await createSpeech(text, context.ttsSettings || {})
        sseSend(res, 'sentence_ready', speech)
      }
      continue
    }
    if (type === 'speak' && action.text) {
      const normalized = action.text.replace(/\s+/g, '').toLowerCase()
      const alreadySpoken = context.spokenTexts?.has(normalized)
      console.log('[TTS DEBUG] speak action:', action.text.slice(0, 40), '| alreadySpoken:', alreadySpoken, '| ttsSettings:', JSON.stringify(context.ttsSettings))
      if (!alreadySpoken) {
        sseSend(res, 'assistant_delta', { text: action.text })
        const speech = await createSpeech(action.text, context.ttsSettings || {})
        sseSend(res, 'sentence_ready', speech)
      }
      continue
    }
    if (type === 'load_favorites') {
      const cookie = context.neteaseCookie || stateCache.neteaseCookie || ''
      if (!cookie) {
        sseSend(res, 'assistant_delta', { text: '（需要先登录网易云才能播放收藏歌曲。）' })
        continue
      }
      const count = Math.max(1, Math.min(12, Number(action.count || 5)))
      sseSend(res, 'tool_start', { tool: 'load_favorites', query: `收藏歌曲 前${count}首` })
      try {
        const tracks = await loadUserFavorites(cookie, count)
        stateCache.queue = tracks
        stateCache.currentTrack = tracks[0] || null
        stateCache.isPlaying = Boolean(stateCache.currentTrack)
        sseSend(res, 'queue_update', { queue: stateCache.queue })
        if (stateCache.currentTrack) {
          sseSend(res, 'now_playing', { track: stateCache.currentTrack, queue: stateCache.queue })
        }
      } catch (error) {
        sseSend(res, 'tool_start', { tool: 'load_favorites_error', message: error.message })
      }
      continue
    }
    if (type === 'search_music') {
      const query = String(action.query || context.userMessage || '').trim()
      if (!query) continue
      const count = Math.max(1, Math.min(8, Number(action.count || 5)))
      sseSend(res, 'tool_start', { tool: 'search_music', query })
      let tracks
      try {
        tracks = await searchMusic(query, count, context.neteaseCookie)
      } catch (error) {
        sseSend(res, 'tool_start', { tool: 'local_fallback', message: error.message })
        tracks = await fallbackLocalTracks(count)
      }
      stateCache.queue = tracks
      stateCache.currentTrack = tracks[0] || null
      stateCache.isPlaying = Boolean(stateCache.currentTrack)
      sseSend(res, 'queue_update', { queue: stateCache.queue })
      if (stateCache.currentTrack) {
        sseSend(res, 'now_playing', { track: stateCache.currentTrack, queue: stateCache.queue })
      }
    }
  }
}

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

async function handleChat(req, res) {
  const body = await readJsonBody(req)
  const userMessage = String(body.message || '').trim()
  const neteaseCookie = String(body.neteaseCookie || '').trim()
  const ttsSettings = body.ttsSettings || null
  console.log('[TTS DEBUG] Received ttsSettings:', JSON.stringify(ttsSettings))
  if (!userMessage) {
    jsonResponse(res, 400, { error: 'message is required' })
    return
  }

  await loadState()

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

  stateCache.messages.push({ id: randomUUID(), role: 'user', text: userMessage, at: new Date().toISOString() })
  stateCache.messages = stateCache.messages.slice(-80)
  await saveState()

  sseStart(res)
  let pendingSentence = ''
  const ttsPromises = []
  let ttsChain = Promise.resolve()
  const spokenTexts = new Set()

  const queueSentence = (sentence) => {
    const normalized = sentence.replace(/\s+/g, '').toLowerCase()
    if (spokenTexts.has(normalized)) {
      console.log('[TTS DEBUG] Skipping duplicate sentence:', sentence.slice(0, 40))
      return
    }
    spokenTexts.add(normalized)
    console.log('[TTS DEBUG] queueSentence:', sentence.slice(0, 40), '| ttsSettings:', JSON.stringify(ttsSettings))
    const promise = ttsChain
      .then(() => createSpeech(sentence, ttsSettings || {}))
      .then(result => sseSend(res, 'sentence_ready', result))
      .catch(error => sseSend(res, 'sentence_ready', { text: sentence, audioUrl: '', fallback: true, error: error.message }))
    ttsChain = promise.catch(() => {})
    ttsPromises.push(promise)
  }

  const result = await runClaude(userMessage, (delta) => {
    sseSend(res, 'assistant_delta', { text: delta })
    pendingSentence += delta
    const popped = popCompleteSentences(pendingSentence)
    pendingSentence = popped.rest
    popped.sentences.forEach(queueSentence)
  })

  const finalText = result.text.trim()
  if (pendingSentence.trim()) {
    queueSentence(pendingSentence.trim())
    pendingSentence = ''
  }

  const parsed = extractActions(result.raw)
  if (parsed.mood) stateCache.mood = parsed.mood
  const actions = fallbackActions(userMessage, parsed.actions)

  stateCache.messages.push({ id: randomUUID(), role: 'assistant', text: finalText, at: new Date().toISOString() })
  stateCache.messages = stateCache.messages.slice(-80)
  await Promise.allSettled(ttsPromises)
  await executeActions(actions, { userMessage, neteaseCookie, ttsSettings, spokenTexts }, res)
  await saveState()
  sseSend(res, 'done', { state: publicState(), fallback: result.fallback || false })
  res.end()
}

async function handlePlayerControl(req, res) {
  const body = await readJsonBody(req)
  await loadState()
  const action = String(body.action || '')
  if (action === 'pause') stateCache.isPlaying = false
  if (action === 'play') stateCache.isPlaying = Boolean(stateCache.currentTrack)
  if (action === 'volume') stateCache.volume = Math.max(0, Math.min(1, Number(body.value ?? stateCache.volume)))
  if (action === 'skip' && stateCache.queue.length > 1) {
    const currentIndex = stateCache.queue.findIndex(track => track.id === stateCache.currentTrack?.id)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % stateCache.queue.length : 0
    stateCache.currentTrack = stateCache.queue[nextIndex]
    stateCache.isPlaying = true
  }
  await saveState()
  jsonResponse(res, 200, publicState())
}

async function serveTts(req, res, pathname) {
  const fileName = path.basename(decodeURIComponent(pathname.replace('/api/tts/', '')))
  if (!fileName.endsWith('.mp3')) {
    jsonResponse(res, 404, { error: 'audio not found' })
    return
  }
  try {
    const audio = await fs.readFile(path.join(ttsDir, fileName))
    res.statusCode = 200
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.end(audio)
  } catch {
    jsonResponse(res, 404, { error: 'audio not found' })
  }
}

const server = http.createServer(async (req, res) => {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  try {
    await loadState()
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    if (req.method === 'GET' && url.pathname === '/api/health') {
      jsonResponse(res, 200, { ok: true, port: PORT })
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      jsonResponse(res, 200, publicState())
      return
    }
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
    if (req.method === 'POST' && url.pathname === '/api/sync-library') {
      const body = await readJsonBody(req)
      const cookie = String(body.cookie || '').trim()
      if (!cookie) {
        jsonResponse(res, 400, { error: 'cookie is required' })
        return
      }
      try {
        stateCache.neteaseCookie = cookie
        const result = await syncMusicLibrary(cookie)
        jsonResponse(res, 200, { ok: true, ...result })
      } catch (error) {
        jsonResponse(res, 500, { error: error.message })
      }
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      await handleChat(req, res)
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/player/control') {
      await handlePlayerControl(req, res)
      return
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/tts/')) {
      await serveTts(req, res, url.pathname)
      return
    }
    if (url.pathname === '/api/netease' || url.pathname.startsWith('/api/netease/')) {
      await proxyNeteaseRequest(req, res, url)
      return
    }
    jsonResponse(res, 404, { error: 'not found' })
  } catch (error) {
    jsonResponse(res, 500, { error: error.message || 'Claudio server failed' })
  }
})

server.listen(PORT, () => {
  console.log(`Claudio Chat DJ backend listening on http://127.0.0.1:${PORT}`)
})
