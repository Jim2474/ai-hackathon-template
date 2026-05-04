const DEFAULT_NETEASE_BASE_URL = 'http://localhost:3000'
const NETEASE_COOKIE_STORAGE_KEY = 'moodwave_netease_cookie'

function getNeteaseBaseUrl() {
  return (import.meta.env.VITE_NETEASE_API_BASE_URL || DEFAULT_NETEASE_BASE_URL).replace(/\/+$/, '')
}

function buildUrl(path, params = {}) {
  const safePath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${getNeteaseBaseUrl()}${safePath}`)

  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'allowedCodes' && value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  return url
}

export function getStoredNeteaseCookie() {
  return window.localStorage.getItem(NETEASE_COOKIE_STORAGE_KEY) || ''
}

export function saveNeteaseCookie(cookie) {
  const cleanedCookie = String(cookie || '').trim()
  if (!cleanedCookie) return

  const normalizedCookie = cleanedCookie.includes('=')
    ? cleanedCookie
    : `MUSIC_U=${cleanedCookie}`

  window.localStorage.setItem(NETEASE_COOKIE_STORAGE_KEY, normalizedCookie)
}

export function clearNeteaseCookie() {
  window.localStorage.removeItem(NETEASE_COOKIE_STORAGE_KEY)
}

function getArtistText(song) {
  const artists = song?.artists || song?.ar || []
  if (!Array.isArray(artists) || artists.length === 0) return '未知歌手'
  return artists.map(artist => artist.name).filter(Boolean).join(' / ') || '未知歌手'
}

function getAlbumName(song) {
  return song?.album?.name || song?.al?.name || '未知专辑'
}

function normalizeSong(song) {
  return {
    id: song?.id,
    name: song?.name || '未知歌曲',
    artistsText: getArtistText(song),
    albumName: getAlbumName(song),
    duration: song?.duration || song?.dt || 0,
    fee: song?.fee,
    status: song?.status,
    albumId: song?.album?.id || song?.al?.id,
    raw: song
  }
}

export async function requestNetease(path, params = {}) {
  const cookie = getStoredNeteaseCookie()
  const url = buildUrl(path, {
    ...params,
    cookie: params.cookie || cookie || undefined
  })

  let response
  try {
    response = await fetch(url)
  } catch {
    throw new Error(`网易云 API 没连上。请先启动 Docker，并检查 ${DEFAULT_NETEASE_BASE_URL}/search?keywords=周杰伦`)
  }

  if (!response.ok) {
    throw new Error(`网易云 API 请求失败：${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const allowedCodes = params.allowedCodes || [200]
  if (data?.code !== undefined && !allowedCodes.includes(data.code)) {
    throw new Error(data.message || data.msg || `网易云 API 返回异常：${data.code}`)
  }

  return data
}

export async function searchSongs(keywords, options = {}) {
  const cleanedKeywords = keywords.trim()
  if (!cleanedKeywords) {
    return []
  }

  const data = await requestNetease('/search', {
    keywords: cleanedKeywords,
    type: options.type || 1,
    limit: options.limit || 10,
    offset: options.offset || 0
  })

  const songs = data?.result?.songs || []
  return Array.isArray(songs) ? songs.map(normalizeSong).filter(song => song.id) : []
}

export async function getSongDetail(ids) {
  const normalizedIds = Array.isArray(ids) ? ids.join(',') : String(ids || '')
  if (!normalizedIds) return []

  const data = await requestNetease('/song/detail', {
    ids: normalizedIds
  })

  const songs = data?.songs || []
  return Array.isArray(songs) ? songs.map(normalizeSong).filter(song => song.id) : []
}

export async function getLyrics(id) {
  if (!id) {
    return {
      id,
      lyric: '',
      translatedLyric: '',
      hasLyric: false,
      reason: '缺少歌曲 ID'
    }
  }

  const data = await requestNetease('/lyric', { id })
  const lyric = data?.lrc?.lyric || ''
  const translatedLyric = data?.tlyric?.lyric || ''

  return {
    id,
    lyric,
    translatedLyric,
    hasLyric: Boolean(lyric),
    reason: lyric ? '' : '这首歌暂时没有返回歌词'
  }
}

export async function getPlaylistDetail(id) {
  if (!id) {
    return {
      id,
      name: '',
      coverUrl: '',
      tracks: [],
      trackIds: [],
      raw: null
    }
  }

  const data = await requestNetease('/playlist/detail', { id })
  const playlist = data?.playlist || {}
  const tracks = Array.isArray(playlist.tracks) ? playlist.tracks.map(normalizeSong).filter(song => song.id) : []
  const trackIds = Array.isArray(playlist.trackIds)
    ? playlist.trackIds.map(track => track.id).filter(Boolean)
    : []

  return {
    id: playlist.id || id,
    name: playlist.name || '未命名歌单',
    coverUrl: playlist.coverImgUrl || '',
    description: playlist.description || '',
    trackCount: playlist.trackCount || tracks.length || trackIds.length,
    tracks,
    trackIds,
    raw: playlist
  }
}

export async function getSongUrl(id, options = {}) {
  if (!id) {
    return {
      id,
      url: '',
      playable: false,
      reason: '缺少歌曲 ID',
      raw: null
    }
  }

  const data = await requestNetease('/song/url', {
    id,
    br: options.br || 320000,
    cookie: options.cookie
  })

  const songUrl = Array.isArray(data?.data) ? data.data[0] : null
  const url = songUrl?.url || ''

  return {
    id: songUrl?.id || id,
    url,
    playable: Boolean(url),
    reason: url ? '' : '可能版权受限、需要登录或会员，暂时拿不到播放 URL',
    raw: songUrl
  }
}

export async function createQrLogin() {
  const timestamp = Date.now()
  const keyData = await requestNetease('/login/qr/key', { timestamp })
  const unikey = keyData?.data?.unikey

  if (!unikey) {
    throw new Error('没有拿到二维码登录 key，请稍后再试。')
  }

  const qrData = await requestNetease('/login/qr/create', {
    key: unikey,
    qrimg: true,
    timestamp: Date.now()
  })

  const qrImage = qrData?.data?.qrimg || ''
  if (!qrImage) {
    throw new Error('没有生成二维码图片。')
  }

  return {
    key: unikey,
    qrImage
  }
}

export async function checkQrLogin(key) {
  if (!key) {
    return {
      code: 800,
      message: '缺少二维码 key',
      cookie: ''
    }
  }

  const data = await requestNetease('/login/qr/check', {
    key,
    timestamp: Date.now(),
    allowedCodes: [200, 800, 801, 802, 803]
  })

  const cookie = data.cookie || ''
  if (data.code === 803 && cookie) {
    saveNeteaseCookie(cookie)
  }

  return {
    code: data.code,
    message: data.message || '',
    cookie
  }
}

export async function getLoginStatus() {
  const cookie = getStoredNeteaseCookie()
  if (!cookie) {
    return {
      loggedIn: false,
      profile: null
    }
  }

  const data = await requestNetease('/login/status', {
    cookie,
    timestamp: Date.now()
  })

  const profile = data?.data?.profile || data?.profile || null
  return {
    loggedIn: Boolean(profile),
    profile
  }
}
