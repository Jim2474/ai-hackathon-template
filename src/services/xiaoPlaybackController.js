import {
  buildXiaoMusicProxyUrl,
  ensureXiaoMusicNativeTts,
  estimateXiaoDjAudioDurationMs,
  generateXiaoDjAudio,
  getXiaoPlayableUrl,
  playXiaoMusicTts,
  playXiaoMusicUrl,
  stopXiaoMusic,
  updateXiaoMusicServerSettings,
} from './xiaoMusicService'

export const XIAO_PLAYBACK_STAGES = {
  idle: 'idle',
  stopping: 'stopping',
  generatingDj: 'generating-dj',
  pushingDj: 'pushing-dj',
  waitingDj: 'waiting-dj',
  pushingSong: 'pushing-song',
  playing: 'playing',
  error: 'error',
}

let activeJobId = 0
let lastDebugSnapshot = {
  jobId: 0,
  stage: XIAO_PLAYBACK_STAGES.idle,
  message: '尚未推送小爱播放',
  updatedAt: '',
}

function safeText(value) {
  return String(value || '').trim()
}

function nowText() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function updateDebug(patch, onDebug) {
  lastDebugSnapshot = {
    ...lastDebugSnapshot,
    ...patch,
    updatedAt: nowText(),
  }
  onDebug?.(lastDebugSnapshot)
  return lastDebugSnapshot
}

function createCancelledError(reason) {
  const error = new Error(reason || '小爱播放任务已取消')
  error.name = 'XiaoPlaybackCancelled'
  error.cancelled = true
  return error
}

function assertActive(jobId) {
  if (jobId !== activeJobId) {
    throw createCancelledError('新的小爱播放任务已经接管')
  }
}

async function waitForActiveJob(jobId, ms) {
  const endAt = Date.now() + Math.max(0, ms)
  while (Date.now() < endAt) {
    assertActive(jobId)
    await new Promise(resolve => setTimeout(resolve, Math.min(250, endAt - Date.now())))
  }
  assertActive(jobId)
}

async function applyCompatibilitySettings(settings) {
  const patch = {}
  if (settings.useMusicApiCompatibility) {
    patch.use_music_api = true
  }
  if (settings.forceStopCompatibility) {
    patch.enable_force_stop = true
  }
  if (Object.keys(patch).length > 0) {
    await updateXiaoMusicServerSettings(settings, patch)
  }
}

export function cancelXiaoJob(reason = '已取消上一条小爱播放任务', onDebug) {
  activeJobId += 1
  updateDebug({
    jobId: activeJobId,
    stage: XIAO_PLAYBACK_STAGES.idle,
    message: reason,
  }, onDebug)
  return activeJobId
}

export async function pauseXiaoPlayback(settings, onDebug) {
  const jobId = cancelXiaoJob('正在停止小爱播放', onDebug)
  if (!settings?.deviceDid) {
    return { jobId, stopped: false }
  }
  updateDebug({
    jobId,
    stage: XIAO_PLAYBACK_STAGES.stopping,
    message: '正在向 xiaomusic 发送停止命令',
  }, onDebug)
  await stopXiaoMusic(settings, settings.deviceDid)
  updateDebug({
    jobId,
    stage: XIAO_PLAYBACK_STAGES.idle,
    message: '小爱播放已停止',
  }, onDebug)
  return { jobId, stopped: true }
}

export function getLastXiaoDebugSnapshot() {
  return lastDebugSnapshot
}

export function isXiaoPlaybackCancelled(error) {
  return Boolean(error?.cancelled || error?.name === 'XiaoPlaybackCancelled')
}

export async function playOnXiao({
  settings,
  track,
  djText = '',
  djSource = '',
  reason = 'auto',
  reservedJobId = 0,
  buildAudioText,
  buildTtsText,
  onStatus,
  onDebug,
}) {
  const jobId = reservedJobId || activeJobId + 1
  if (reservedJobId && activeJobId !== reservedJobId) {
    throw createCancelledError('新的小爱播放任务已经接管')
  }
  activeJobId = jobId

  const deviceDid = safeText(settings?.deviceDid)
  if (!deviceDid) {
    throw new Error('请先在小爱音箱面板选择设备')
  }

  const playableUrl = getXiaoPlayableUrl(track)
  if (!playableUrl) {
    throw new Error('这首歌的地址小爱音箱访问不到。网易云公网 URL 更适合推送，本地 /audio 或 blob 音频需要局域网地址。')
  }

  const trackTitle = safeText(track?.title) || '当前歌曲'
  const cleanDjText = safeText(djText)
  const baseDebug = {
    jobId,
    reason,
    trackTitle,
    trackArtist: safeText(track?.artist),
    songUrl: playableUrl,
    djSource: cleanDjText ? (djSource || 'direct') : 'off',
    originalDjChars: cleanDjText.length,
  }

  try {
    updateDebug({
      ...baseDebug,
      stage: XIAO_PLAYBACK_STAGES.stopping,
      message: `准备推送 ${trackTitle}，先清理旧播放`,
      djAudioUrl: '',
      djAudioBytes: 0,
      djAudioDurationMs: 0,
      pushedDjAt: '',
      pushedSongAt: '',
    }, onDebug)
    onStatus?.('正在停止小爱当前播放...', 'busy', getLastXiaoDebugSnapshot())
    await applyCompatibilitySettings(settings)
    await stopXiaoMusic(settings, deviceDid).catch(() => {})
    await waitForActiveJob(jobId, 300)

    if (settings.speakDjBeforeTrack !== false && cleanDjText) {
      const audioText = safeText(buildAudioText?.(cleanDjText, track)) || cleanDjText
      updateDebug({
        ...baseDebug,
        stage: XIAO_PLAYBACK_STAGES.generatingDj,
        message: '正在生成 Claudio DJ 音频',
        spokenDjText: audioText,
        spokenDjChars: audioText.length,
      }, onDebug)
      onStatus?.('正在生成 Claudio DJ 声音...', 'busy', getLastXiaoDebugSnapshot())

      try {
        const djAudio = await generateXiaoDjAudio(settings, audioText)
        const djAudioPushUrl = await buildXiaoMusicProxyUrl(settings, djAudio.url)
        assertActive(jobId)

        updateDebug({
          ...baseDebug,
          stage: XIAO_PLAYBACK_STAGES.pushingDj,
          message: '正在把 Claudio DJ 音频推给小爱',
          spokenDjText: audioText,
          spokenDjChars: audioText.length,
          djAudioUrl: djAudio.url,
          djAudioPushUrl,
          djAudioBytes: djAudio.bytes || 0,
          djAudioDurationMs: djAudio.durationMs || estimateXiaoDjAudioDurationMs(audioText),
          voiceId: djAudio.voiceId || '',
        }, onDebug)
        console.info('[Claudio XiaoMusic] queue pushing DJ audio URL ' + JSON.stringify({
          jobId,
          track: trackTitle,
          source: baseDebug.djSource,
          url: djAudio.url,
          pushUrl: djAudioPushUrl,
          proxied: djAudioPushUrl !== djAudio.url,
          bytes: djAudio.bytes,
          durationMs: djAudio.durationMs,
          preview: audioText.slice(0, 80),
        }))
        await playXiaoMusicUrl(settings, deviceDid, djAudioPushUrl)
        assertActive(jobId)

        const ttsLeadMs = Math.max(0, Math.min(1500, Number(settings.ttsLeadMs || 0)))
        const waitMs = Math.max(
          estimateXiaoDjAudioDurationMs(audioText),
          Number(djAudio.durationMs || 0),
        ) + ttsLeadMs
        updateDebug({
          stage: XIAO_PLAYBACK_STAGES.waitingDj,
          message: `Claudio DJ 已推送，等待 ${(waitMs / 1000).toFixed(1)} 秒后播歌`,
          pushedDjAt: nowText(),
          waitMs,
        }, onDebug)
        onStatus?.(`Claudio DJ 已发送，${(waitMs / 1000).toFixed(1)} 秒后推歌...`, 'busy', getLastXiaoDebugSnapshot())
        await waitForActiveJob(jobId, waitMs)
      } catch (error) {
        if (isXiaoPlaybackCancelled(error)) throw error
        console.warn('[Claudio XiaoMusic] DJ audio failed, falling back to native TTS', error)
        const ttsText = safeText(buildTtsText?.(cleanDjText, track)) || audioText
        updateDebug({
          ...baseDebug,
          stage: XIAO_PLAYBACK_STAGES.pushingDj,
          message: 'Claudio 声音失败，改用小爱原生 TTS 兜底',
          fallbackError: error.message || String(error),
          spokenDjText: ttsText,
          spokenDjChars: ttsText.length,
          djAudioUrl: '',
        }, onDebug)
        await ensureXiaoMusicNativeTts(settings)
        await playXiaoMusicTts(settings, deviceDid, ttsText)
        await waitForActiveJob(jobId, Math.max(0, Math.min(1500, Number(settings.ttsLeadMs || 0))))
      }
    }

    updateDebug({
      ...baseDebug,
      stage: XIAO_PLAYBACK_STAGES.pushingSong,
      message: `正在推送歌曲 ${trackTitle}`,
      pushedSongAt: '',
    }, onDebug)
    onStatus?.(`正在推送 ${trackTitle}...`, 'busy', getLastXiaoDebugSnapshot())
    console.info('[Claudio XiaoMusic] queue pushing music URL ' + JSON.stringify({
      jobId,
      track: trackTitle,
      url: playableUrl,
    }))
    await playXiaoMusicUrl(settings, deviceDid, playableUrl)
    assertActive(jobId)

    updateDebug({
      ...baseDebug,
      stage: XIAO_PLAYBACK_STAGES.playing,
      message: `小爱正在播放 ${trackTitle}`,
      pushedSongAt: nowText(),
    }, onDebug)
    onStatus?.(`已推送 ${trackTitle}`, 'ok', getLastXiaoDebugSnapshot())
    return { jobId, track, url: playableUrl, debug: getLastXiaoDebugSnapshot() }
  } catch (error) {
    if (isXiaoPlaybackCancelled(error)) {
      updateDebug({
        ...baseDebug,
        jobId,
        stage: XIAO_PLAYBACK_STAGES.idle,
        message: error.message,
      }, onDebug)
      throw error
    }

    updateDebug({
      ...baseDebug,
      jobId,
      stage: XIAO_PLAYBACK_STAGES.error,
      message: error.message || '小爱播放失败',
      error: error.message || String(error),
    }, onDebug)
    onStatus?.(error.message || '小爱播放失败', 'error', getLastXiaoDebugSnapshot())
    throw error
  }
}
