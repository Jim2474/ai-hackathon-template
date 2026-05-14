const PROFILE_STORAGE_KEY = 'claudio_mood_profile_v1'
const MAX_RECENT_MOMENTS = 24
const MAX_TRACK_STATS = 160

const DEFAULT_PROFILE = {
  version: 1,
  taste: {
    preferredEnergy: 'low_to_mid',
    preferredScenes: ['focus', 'calm', 'sleep'],
    avoid: ['overexplaining', '客服腔', '鸡血感']
  },
  voice: {
    persona: 'private-radio-dj',
    tone: '温柔、克制、有画面感',
    pace: 'slightly_faster',
    language: 'zh-CN'
  },
  recentMoments: [],
  trackStats: {},
  playlistNotes: {}
}

function nowIso() {
  return new Date().toISOString()
}

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function mergeProfile(profile) {
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    taste: { ...DEFAULT_PROFILE.taste, ...(profile?.taste || {}) },
    voice: { ...DEFAULT_PROFILE.voice, ...(profile?.voice || {}) },
    recentMoments: Array.isArray(profile?.recentMoments) ? profile.recentMoments : [],
    trackStats: profile?.trackStats && typeof profile.trackStats === 'object' ? profile.trackStats : {},
    playlistNotes: profile?.playlistNotes && typeof profile.playlistNotes === 'object' ? profile.playlistNotes : {}
  }
}

export function getMoodProfile() {
  if (!canUseStorage()) return DEFAULT_PROFILE
  const stored = safeParse(window.localStorage.getItem(PROFILE_STORAGE_KEY))
  return mergeProfile(stored)
}

function saveMoodProfile(profile) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Memory is helpful, not mission critical.
  }
}

export function getTrackMemoryKey(track) {
  return String(track?.neteaseId || track?.id || `${track?.title || 'unknown'}-${track?.artist || ''}`)
}

export function recordUserMoment(input, mode = '') {
  const text = String(input || '').trim()
  if (!text) return getMoodProfile()

  const profile = getMoodProfile()
  const recentMoments = [
    { input: text, mode, at: nowIso() },
    ...profile.recentMoments.filter(item => item.input !== text)
  ].slice(0, MAX_RECENT_MOMENTS)

  const nextProfile = { ...profile, recentMoments }
  saveMoodProfile(nextProfile)
  return nextProfile
}

export function recordTrackPlayback(track, context = {}) {
  if (!track) return getMoodProfile()

  const profile = getMoodProfile()
  const key = getTrackMemoryKey(track)
  const current = profile.trackStats[key] || {}
  const playCount = Number(current.playCount || track.playCount || 0) + 1
  const trackStats = {
    ...profile.trackStats,
    [key]: {
      title: track.title,
      artist: track.artist,
      album: track.album,
      playlistName: context.playlistName || current.playlistName || '',
      userNote: track.userNote || current.userNote || '',
      likedAt: track.likedAt || current.likedAt || '',
      firstPlayedAt: current.firstPlayedAt || nowIso(),
      lastPlayedAt: nowIso(),
      playCount
    }
  }

  const trimmedStats = Object.fromEntries(Object.entries(trackStats).slice(-MAX_TRACK_STATS))
  const nextProfile = { ...profile, trackStats: trimmedStats }
  saveMoodProfile(nextProfile)
  return nextProfile
}

export function getTrackMemory(track) {
  const profile = getMoodProfile()
  return profile.trackStats[getTrackMemoryKey(track)] || null
}

export function summarizeMoodMemory(track, context = {}) {
  const profile = getMoodProfile()
  const memory = getTrackMemory(track)
  const recentMoment = profile.recentMoments[0]
  const playlistName = context.playlistName || memory?.playlistName || ''

  return {
    voice: profile.voice,
    taste: profile.taste,
    playlistName,
    recentMoment: recentMoment?.input || '',
    playCount: memory?.playCount || track?.playCount || 0,
    likedAt: memory?.likedAt || track?.likedAt || '',
    lastPlayedAt: memory?.lastPlayedAt || track?.lastPlayedAt || '',
    userNote: memory?.userNote || track?.userNote || '',
    hasHistory: Boolean(memory || track?.playCount || track?.likedAt || track?.userNote)
  }
}
