const XIAOMUSIC_SETTINGS_KEY = 'claudio_xiaomusic_settings_v1'
const XIAOMUSIC_PROXY_BASE = '/api/xiaomusic'
const nativeTtsReadyByBaseUrl = new Map()

export const XIAOMUSIC_PLAYBACK_TARGETS = {
  browser: 'browser',
  speaker: 'speaker',
  both: 'both'
}

export const DEFAULT_XIAOMUSIC_SETTINGS = {
  baseUrl: 'http://127.0.0.1:58090',
  username: '',
  password: '',
  deviceDid: '',
  deviceName: '',
  playbackTarget: XIAOMUSIC_PLAYBACK_TARGETS.browser,
  speakDjBeforeTrack: true,
  autoPushOnTrackChange: true,
  ttsLeadMs: 350,
  volume: 60
}

function safeText(value) {
  return String(value || '').trim()
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

export function normalizeXiaoMusicSettings(settings = {}) {
  const rawSettings = settings && typeof settings === 'object' ? settings : {}
  const playbackTarget = Object.values(XIAOMUSIC_PLAYBACK_TARGETS).includes(rawSettings.playbackTarget)
    ? rawSettings.playbackTarget
    : DEFAULT_XIAOMUSIC_SETTINGS.playbackTarget
  const rawTtsLeadMs = Number(rawSettings.ttsLeadMs ?? DEFAULT_XIAOMUSIC_SETTINGS.ttsLeadMs)
  const ttsLeadMs = rawTtsLeadMs > 1500
    ? DEFAULT_XIAOMUSIC_SETTINGS.ttsLeadMs
    : Math.max(0, Math.min(1500, Math.round(rawTtsLeadMs)))

  return {
    ...DEFAULT_XIAOMUSIC_SETTINGS,
    ...rawSettings,
    baseUrl: safeText(rawSettings.baseUrl) || DEFAULT_XIAOMUSIC_SETTINGS.baseUrl,
    username: safeText(rawSettings.username),
    password: String(rawSettings.password || ''),
    deviceDid: safeText(rawSettings.deviceDid),
    deviceName: safeText(rawSettings.deviceName),
    playbackTarget,
    speakDjBeforeTrack: rawSettings.speakDjBeforeTrack !== false,
    autoPushOnTrackChange: rawSettings.autoPushOnTrackChange !== false,
    ttsLeadMs,
    volume: Math.max(0, Math.min(100, Math.round(Number(rawSettings.volume ?? DEFAULT_XIAOMUSIC_SETTINGS.volume))))
  }
}

export function loadXiaoMusicSettings() {
  if (!canUseStorage()) return DEFAULT_XIAOMUSIC_SETTINGS
  return normalizeXiaoMusicSettings(safeParse(window.localStorage.getItem(XIAOMUSIC_SETTINGS_KEY)))
}

export function saveXiaoMusicSettings(settings) {
  const nextSettings = normalizeXiaoMusicSettings(settings)
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(XIAOMUSIC_SETTINGS_KEY, JSON.stringify(nextSettings))
    } catch {
      // Settings persistence is helpful but not required for playback.
    }
  }
  return nextSettings
}

function buildProxyHeaders(settings = {}) {
  const normalized = normalizeXiaoMusicSettings(settings)
  return {
    'Content-Type': 'application/json',
    'X-XiaoMusic-Base-URL': normalized.baseUrl,
    ...(normalized.username || normalized.password ? {
      'X-XiaoMusic-Username': normalized.username,
      'X-XiaoMusic-Password': normalized.password
    } : {})
  }
}

async function requestXiaoMusic(path, options = {}) {
  const response = await fetch(`${XIAOMUSIC_PROXY_BASE}${path}`, {
    method: options.method || 'GET',
    headers: buildProxyHeaders(options.settings),
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.error || data?.detail || `XiaoMusic request failed: ${response.status}`
    throw new Error(message)
  }

  return data
}

export function normalizeXiaoMusicDevice(device = {}) {
  const did = safeText(device.did || device.miotDID || device.mi_did || device.device_id || device.deviceID || device.id)
  const name = safeText(device.name || device.device_name || device.alias || device.desc || device.model || did)
  const model = safeText(device.model || device.hardware || device.device_model)
  return {
    ...device,
    did,
    name: name || did || '小爱音箱',
    model
  }
}

export async function getXiaoMusicDevices(settings) {
  const data = await requestXiaoMusic('/getsetting?need_device_list=true', { settings })
  const devices = Array.isArray(data?.device_list)
    ? data.device_list
    : Array.isArray(data?.devices)
      ? data.devices
      : []
  return devices.map(normalizeXiaoMusicDevice).filter(device => device.did)
}

export async function getXiaoMusicServerSettings(settings) {
  return requestXiaoMusic('/getsetting?need_device_list=false', { settings })
}

export async function updateXiaoMusicServerSettings(settings, patch) {
  return requestXiaoMusic('/api/system/modifiysetting', {
    method: 'POST',
    settings,
    body: patch
  })
}

export async function ensureXiaoMusicNativeTts(settings) {
  const normalized = normalizeXiaoMusicSettings(settings)
  const cacheKey = `${normalized.baseUrl}|${normalized.username}`
  if (nativeTtsReadyByBaseUrl.get(cacheKey)) {
    return { changed: false, mode: 'cached-native' }
  }

  const serverSettings = await getXiaoMusicServerSettings(normalized)
  if (safeText(serverSettings?.edge_tts_voice)) {
    await updateXiaoMusicServerSettings(normalized, { edge_tts_voice: '' })
    nativeTtsReadyByBaseUrl.set(cacheKey, true)
    return { changed: true, mode: 'native' }
  }

  nativeTtsReadyByBaseUrl.set(cacheKey, true)
  return { changed: false, mode: 'native' }
}

function isLocalhostName(hostname) {
  return /^(localhost|127\.0\.0\.1|::1)$/i.test(String(hostname || ''))
}

function buildClaudioPublicBaseUrl(serverSettings = {}) {
  if (typeof window === 'undefined') return ''

  const currentUrl = new URL(window.location.href)
  if (!isLocalhostName(currentUrl.hostname)) {
    return window.location.origin
  }

  try {
    const xiaoHostname = safeText(serverSettings.hostname)
    if (xiaoHostname) {
      const xiaoUrl = new URL(xiaoHostname)
      return `${xiaoUrl.protocol}//${xiaoUrl.hostname}:${currentUrl.port || '5173'}`
    }
  } catch {
    // Fall back to the current origin below.
  }

  return window.location.origin
}

export function estimateXiaoDjAudioDurationMs(text, fallbackMs = 4500) {
  const chars = safeText(text).length
  if (!chars) return fallbackMs
  return Math.min(9000, Math.max(2600, chars * 190 + 900))
}

export async function generateXiaoDjAudio(settings, text, options = {}) {
  const safeMessage = safeText(text)
  if (!safeMessage) throw new Error('没有可生成的 DJ 文案')

  const serverSettings = options.serverSettings || await getXiaoMusicServerSettings(settings)
  const publicBaseUrl = options.publicBaseUrl || buildClaudioPublicBaseUrl(serverSettings)
  const response = await fetch('/api/minimax/xiao-dj-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: safeMessage,
      publicBaseUrl,
      voiceId: options.voiceId,
      speed: options.speed,
      volume: options.volume,
      pitch: options.pitch,
      emotion: options.emotion
    })
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || `MiniMax DJ audio failed: ${response.status}`)
  }

  if (!data.url) {
    throw new Error('MiniMax DJ audio response has no URL')
  }

  return {
    ...data,
    durationMs: Number(data.durationMs) > 0
      ? Number(data.durationMs)
      : estimateXiaoDjAudioDurationMs(safeMessage)
  }
}

export async function getXiaoMusicStatus(settings, did) {
  const safeDid = safeText(did)
  if (!safeDid) throw new Error('未选择小爱设备')
  return requestXiaoMusic(`/playingmusic?did=${encodeURIComponent(safeDid)}`, { settings })
}

export async function playXiaoMusicUrl(settings, did, url) {
  const safeDid = safeText(did)
  const safeUrl = safeText(url)
  if (!safeDid) throw new Error('未选择小爱设备')
  if (!safeUrl) throw new Error('没有可推送给小爱音箱的音频 URL')
  return requestXiaoMusic(`/playurl?did=${encodeURIComponent(safeDid)}&url=${encodeURIComponent(safeUrl)}`, { settings })
}

export async function playXiaoMusicTts(settings, did, text) {
  const safeDid = safeText(did)
  const safeMessage = safeText(text)
  if (!safeDid) throw new Error('未选择小爱设备')
  if (!safeMessage) return { ret: 'SKIP' }
  return requestXiaoMusic(`/playtts?did=${encodeURIComponent(safeDid)}&text=${encodeURIComponent(safeMessage)}`, { settings })
}

export async function sendXiaoMusicCommand(settings, did, cmd) {
  const safeDid = safeText(did)
  const safeCmd = safeText(cmd)
  if (!safeDid) throw new Error('未选择小爱设备')
  if (!safeCmd) return { ret: 'SKIP' }
  return requestXiaoMusic('/cmd', {
    method: 'POST',
    settings,
    body: { did: safeDid, cmd: safeCmd }
  })
}

export function stopXiaoMusic(settings, did) {
  const safeDid = safeText(did)
  if (!safeDid) throw new Error('未选择小爱设备')
  return requestXiaoMusic('/device/stop', {
    method: 'POST',
    settings,
    body: { did: safeDid }
  })
}

export function nextXiaoMusic(settings, did) {
  return sendXiaoMusicCommand(settings, did, '下一首')
}

export function previousXiaoMusic(settings, did) {
  return sendXiaoMusicCommand(settings, did, '上一首')
}

export async function setXiaoMusicVolume(settings, did, volume) {
  const safeDid = safeText(did)
  if (!safeDid) throw new Error('未选择小爱设备')
  const safeVolume = Math.max(0, Math.min(100, Math.round(Number(volume) || 0)))
  return requestXiaoMusic('/setvolume', {
    method: 'POST',
    settings,
    body: { did: safeDid, volume: safeVolume }
  })
}

export function getXiaoPlayableUrl(track) {
  const audioUrl = safeText(track?.audioUrl || track?.url)
  if (!audioUrl || audioUrl.startsWith('blob:') || audioUrl.startsWith('data:')) return ''
  if (/^https?:\/\//i.test(audioUrl)) return audioUrl

  if (typeof window === 'undefined') return ''
  const { protocol, hostname, port } = window.location
  if (/^(localhost|127\.0\.0\.1|::1)$/i.test(hostname)) return ''
  return new URL(audioUrl, `${protocol}//${hostname}${port ? `:${port}` : ''}`).toString()
}

export function estimateXiaoTtsDurationMs(text) {
  const chars = safeText(text).length
  return Math.min(5500, Math.max(2600, chars * 120))
}
