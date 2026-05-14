import { getLyrics } from './neteaseApi'
import { generateSongStoryWithMiniMax } from './minimaxService'
import { buildSongStoryContext } from './contextBuilder'

const STORY_CACHE_KEY = 'claudio_song_story_cache_v3'
const memoryCache = new Map()
const pendingStories = new Map()

function canUseMiniMaxStory() {
  return import.meta.env.VITE_USE_MINIMAX === 'true'
}

function getTrackSourceId(track) {
  return String(track?.neteaseId || track?.id || track?.title || 'unknown')
}

function safeText(value) {
  return String(value || '').trim()
}

function readStoredCache() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORY_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    Object.entries(parsed).forEach(([key, value]) => {
      if (value?.text) memoryCache.set(key, value)
    })
  } catch {
    // Cache is optional. Ignore unreadable data.
  }
}

function writeStoredCache() {
  if (typeof window === 'undefined') return
  try {
    const entries = Array.from(memoryCache.entries()).slice(-80)
    window.localStorage.setItem(STORY_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Local storage can be full or unavailable. Runtime cache still works.
  }
}

readStoredCache()

export function getSongStoryCacheKey(track, context = {}) {
  return [
    getTrackSourceId(track),
    safeText(track?.title),
    safeText(track?.artist),
    safeText(track?.album),
    safeText(context.playlistName),
    safeText(context.userInput || context.mode),
  ].join('|')
}

function extractLyricLines(lyric = '') {
  return lyric
    .split('\n')
    .map(line => line.replace(/\[[^\]]+\]/g, '').trim())
    .filter(Boolean)
    .filter(line => !/作词|作曲|编曲|制作人|出品|发行|版权|翻译/.test(line))
    .slice(0, 8)
}

async function loadLyricSummary(track) {
  const songId = track?.neteaseId || String(track?.id || '').replace(/^netease-/, '')
  if (!songId || track?.sourceType !== 'netease') {
    return { hasLyric: false, lyricHint: '' }
  }

  try {
    const lyricData = await getLyrics(songId)
    const lines = extractLyricLines(lyricData.lyric)
    return {
      hasLyric: lyricData.hasLyric && lines.length > 0,
      lyricHint: lines.join(' / ').slice(0, 260)
    }
  } catch {
    return { hasLyric: false, lyricHint: '' }
  }
}

function getPositionText(index, total) {
  if (!Number.isFinite(index) || !Number.isFinite(total) || total <= 1) return '这一段'
  if (index === 0) return '开场的位置'
  if (index === total - 1) return '收尾的位置'
  return '这一段中间'
}

function textScore(text) {
  return Array.from(String(text || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function getTitleImage(title = '') {
  const lowerTitle = title.toLowerCase()
  const hints = [
    { test: /镜|mirror/, text: '歌名像是把镜头推到很近的地方，适合把注意力收回来' },
    { test: /stand|停|站/, text: '歌名里有一种先站住、先别急着往前跑的感觉' },
    { test: /sky|city|城|空/, text: '名字里有开阔的城市感，会把空间稍微拉大一点' },
    { test: /rain|雨/, text: '它带着一点雨天的轮廓，适合把声音压低' },
    { test: /night|夜/, text: '它更像夜里亮着的一小块灯，不急着把情绪说透' },
    { test: /day|days|日|天/, text: '它有时间被慢慢摊开的感觉，适合接在一段过渡里' },
    { test: /love|爱|喜欢/, text: '它带着一点靠近的温度，但不需要说得太满' },
    { test: /瘦|thin/, text: '这个名字有一点自我审视的意味，声音可以放得更轻一点' }
  ]
  return hints.find(item => item.test.test(lowerTitle))?.text || ''
}

function getPositionCue(index, total) {
  if (!Number.isFinite(index) || !Number.isFinite(total) || total <= 1) {
    return '先让它把这段时间铺开'
  }
  if (index === 0) return '开场不需要太用力，先让它把空气定下来'
  if (index === total - 1) return '放到最后，更像给这段声音留一个柔和的句点'

  const cues = [
    '放在这里，是把刚才的情绪稍微换一个角度',
    '这一段需要一点新的纹理，让注意力不至于塌下去',
    '它接在中间，像把窗户打开一点，让声音重新流动',
    '这里不急着推进，只需要让节奏轻轻托住你'
  ]
  return cues[index % cues.length]
}

function getStateCue(userInput) {
  if (!userInput) return ''
  const text = userInput.length > 22 ? `${userInput.slice(0, 22)}...` : userInput
  const cues = [
    `你刚才说「${text}」，这首不负责催你，只负责把状态慢慢接住`,
    `如果现在的关键词是「${text}」，那这里先不要太满，留一点空间给你缓过来`,
    `我记得你说的是「${text}」，所以这首会更像一段低声的陪跑`
  ]
  return cues[textScore(userInput) % cues.length]
}

function joinSentences(parts) {
  return parts
    .map(part => safeText(part).replace(/[，。；,.]+$/g, ''))
    .filter(Boolean)
    .map(part => `${part}。`)
    .join('')
}

export function buildImmediateSongStory(track, context = {}) {
  if (!track) {
    return {
      text: '我会先把声音放低一点。你不用急着进入状态，我们让音乐先把房间铺开。',
      source: 'local'
    }
  }

  const title = safeText(track.title) || '这首歌'
  const artist = safeText(track.artist)
  const album = safeText(track.album)
  const userInput = safeText(context.userInput)
  const positionText = getPositionText(context.index, context.total)
  const titleImage = getTitleImage(title)
  const stateCue = getStateCue(userInput)
  const positionCue = getPositionCue(context.index, context.total)

  if (track.songIntro) {
    return {
      text: [track.songIntro, track.personalReason].filter(Boolean).join(' '),
      source: 'plan'
    }
  }

  const artistText = artist ? `${artist} 的` : ''
  const albumText = album && album !== '未知专辑' ? `它来自《${album}》` : ''
  const seed = textScore(`${title}-${artist}-${album}-${context.index}`)
  const variants = [
    () => joinSentences([
      `${artistText}《${title}》先进来`,
      titleImage || albumText || positionCue,
      stateCue || positionCue
    ]),
    () => joinSentences([
      `这一首换成《${title}》`,
      albumText || (artist ? `${artist} 的声音会把边缘磨得柔一点` : titleImage),
      stateCue || `放在${positionText}，不是为了加速，而是让这一段重新有一点重心`
    ]),
    () => joinSentences([
      titleImage || `《${title}》这个名字先把气氛带出来`,
      artist ? `${artist} 在这里不急着把话说满` : albumText,
      stateCue || positionCue
    ]),
    () => joinSentences([
      `现在不用介绍太多背景，先听《${title}》`,
      albumText || titleImage || '它留出的空白比情绪本身更重要',
      stateCue || '让它把这几分钟轻轻托住'
    ]),
    () => joinSentences([
      `${artist ? `${artist} 把` : ''}《${title}》放到这里会更像一次转场`,
      titleImage || albumText || '声音不用太靠前，气氛会自己浮起来',
      stateCue || positionCue
    ]),
    () => joinSentences([
      `下一段先给《${title}》`,
      albumText || (artist ? `${artist} 的质感适合把节奏放松一点` : titleImage),
      stateCue || '我们不急着解释，让歌曲自己把画面补上'
    ])
  ]

  return {
    text: variants[seed % variants.length](),
    source: 'local'
  }
}

export function getCachedSongStory(track, context = {}) {
  const cached = memoryCache.get(getSongStoryCacheKey(track, context)) || null
  if (canUseMiniMaxStory() && cached?.source && cached.source !== 'minimax') {
    return null
  }
  return cached
}

export async function generateSongStory(track, context = {}) {
  const key = getSongStoryCacheKey(track, context)
  const cached = memoryCache.get(key)
  if (cached && (!canUseMiniMaxStory() || cached.source === 'minimax')) return cached

  const pending = pendingStories.get(key)
  if (pending) return pending

  const task = (async () => {
    const fallback = buildImmediateSongStory(track, context)
    const lyricInfo = await loadLyricSummary(track)
    const contextWindow = buildSongStoryContext({
      track,
      context,
      lyricInfo,
      fallbackText: fallback.text
    })

    if (!canUseMiniMaxStory()) {
      const value = { ...fallback, key, lyricInfo, contextWindow }
      memoryCache.set(key, value)
      writeStoredCache()
      return value
    }

    try {
      const story = await generateSongStoryWithMiniMax(contextWindow)
      const value = {
        text: story || fallback.text,
        source: story ? 'minimax' : 'local',
        key,
        lyricInfo,
        contextWindow
      }
      memoryCache.set(key, value)
      writeStoredCache()
      return value
    } catch {
      const value = { ...fallback, key, lyricInfo, contextWindow }
      memoryCache.set(key, value)
      writeStoredCache()
      return value
    }
  })()

  pendingStories.set(key, task)
  try {
    return await task
  } finally {
    pendingStories.delete(key)
  }
}

export function prefetchSongStory(track, context = {}) {
  generateSongStory(track, context).catch(() => {})
}
