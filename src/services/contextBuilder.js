import { getSourceLabel } from './audioSourceService'
import { summarizeMoodMemory } from './moodProfileService'

const EMOTION_KEYWORDS = [
  { keyword: '夜', mood: 'night', image: '夜色' },
  { keyword: '梦', mood: 'dreamy', image: '梦境' },
  { keyword: '雨', mood: 'rainy', image: '雨声' },
  { keyword: '海', mood: 'open', image: '海面' },
  { keyword: '风', mood: 'airy', image: '风' },
  { keyword: '光', mood: 'bright', image: '光线' },
  { keyword: '离开', mood: 'moving_on', image: '告别' },
  { keyword: '想你', mood: 'longing', image: '想念' },
  { keyword: '孤独', mood: 'quiet', image: '独处' },
  { keyword: '自由', mood: 'release', image: '松开' },
  { keyword: '爱', mood: 'warm', image: '靠近' }
]

const LIBRARY_LABEL_PATTERN = /^(apple music|APPLE MUSIC|网易云|我的网易云|qq音乐|spotify|歌单|收藏|喜欢的音乐)$/i

function safeText(value) {
  return String(value || '').trim()
}

function compactList(items, max = 6) {
  const list = Array.isArray(items) ? items : [items]
  return Array.from(new Set(list.map(safeText).filter(Boolean))).slice(0, max)
}

function durationText(seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return ''
  const minutes = Math.floor(value / 60)
  const rest = Math.round(value % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

function positionText(index, total) {
  if (!Number.isFinite(index) || !Number.isFinite(total) || total <= 1) return '当前这首'
  if (index === 0) return '开场第一首'
  if (index === total - 1) return '收尾最后一首'
  return `第 ${index + 1} 首`
}

function inferLyricMood(lyricHint = '') {
  const matched = EMOTION_KEYWORDS.filter(item => lyricHint.includes(item.keyword))
  return {
    keywords: compactList(matched.map(item => item.keyword)),
    imagery: compactList(matched.map(item => item.image), 4),
    moods: compactList(matched.map(item => item.mood), 4)
  }
}

function styleAngle(track, context) {
  const title = safeText(track?.title)
  const artist = safeText(track?.artist)
  const album = safeText(track?.album)
  const seedText = `${title}-${artist}-${album}-${context.index || 0}`
  const score = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const angles = [
    '从歌名里的画面切入，不急着解释背景',
    '从声音质感切入，像电台主播轻轻接歌',
    '从用户此刻状态切入，把歌曲当作当下的支撑',
    '从专辑名或歌曲位置切入，但不要机械报信息',
    '从歌词意象切入，只概括画面，不逐字引用',
    '从上一首到这一首的情绪转场切入'
  ]
  return angles[score % angles.length]
}

function normalizeUserMoment(input = '', mode = '') {
  const text = safeText(input)
  if (!text || mode === 'personal' || LIBRARY_LABEL_PATTERN.test(text)) {
    return {
      rawInput: '',
      mode: safeText(mode),
      intent: '用户从个人音乐库启动播放，串场重点放在歌曲、情绪走向和电台节奏'
    }
  }

  return {
    rawInput: text,
    mode: safeText(mode),
    intent: '回应用户刚才说出的状态'
  }
}

export function buildSongStoryContext({ track, context = {}, lyricInfo = {}, fallbackText = '' }) {
  const memory = summarizeMoodMemory(track, context)
  const lyricMood = inferLyricMood(lyricInfo.lyricHint || '')
  const userMoment = normalizeUserMoment(context.userInput, context.mode)
  const playlistName = safeText(context.playlistName || memory.playlistName)
  const artist = safeText(track?.artist)
  const album = safeText(track?.album)

  return {
    persona: {
      name: 'Claudio',
      role: '私人电台 DJ',
      style: '像真实电台主播接歌，短、有画面感、有陪伴感；每首换一个入口，不要机械报幕',
      avoid: ['客服腔', '报告腔', '套模板', '编造音乐史']
    },
    userMoment,
    track: {
      title: safeText(track?.title) || '这首歌',
      artist,
      album,
      source: getSourceLabel(track),
      duration: durationText(track?.duration),
      position: positionText(context.index, context.total),
      tags: compactList(track?.tags || [])
    },
    sourceContext: {
      playlistName,
      source: getSourceLabel(track),
      usage: '只用于理解来源和编排，不要把歌单名当成串场核心，不要反复念出 APPLE MUSIC、我的网易云、NetEase 这类来源词'
    },
    lyricInsight: {
      available: Boolean(lyricInfo.hasLyric && lyricInfo.lyricHint),
      summary: lyricInfo.lyricHint || '',
      keywords: lyricMood.keywords,
      imagery: lyricMood.imagery,
      mood: lyricMood.moods
    },
    memory: {
      hasHistory: memory.hasHistory,
      playCount: memory.playCount,
      likedAt: memory.likedAt,
      lastPlayedAt: memory.lastPlayedAt,
      userNote: memory.userNote,
      voicePreference: memory.voice,
      tastePreference: memory.taste
    },
    task: {
      type: context.taskType || 'song_story',
      instruction: '写一段播放前或切歌时可直接念出的串场词',
      length: '2 到 3 句',
      styleAngle: styleAngle(track, context),
      mustUse: compactList([
        track?.title,
        artist,
        album,
        userMoment.rawInput,
        lyricMood.imagery[0]
      ], 5),
      avoid: [
        '不要强调歌单名或来源平台',
        '不要说“我从某某歌单里接出来”',
        '不要把 APPLE MUSIC、我的网易云、NetEase 当成用户状态',
        '不要连续两首使用同一个句式',
        '不要反复使用“电台的呼吸”“换一口气”“把状态稳住”这类固定句'
      ],
      recentStoriesToAvoid: compactList(context.recentStoryTexts || [], 4),
      fallbackDraft: fallbackText
    }
  }
}
