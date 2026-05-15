import { useState, useEffect, useRef } from 'react'
import NeteaseLoginPanel from './components/NeteaseLoginPanel'
import NeteaseLibraryPanel from './components/NeteaseLibraryPanel'
import GlassPanel from './components/GlassPanel'
import { GlassSettingsProvider, useGlassSettings } from './components/GlassSettings'
import GlassSettingsPanel from './components/GlassSettingsPanel'
import XiaoMusicPanel from './components/XiaoMusicPanel'
import { getSourceLabel } from './services/audioSourceService'
import { createMoodwaveSession } from './services/musicOrchestrator'
import {
  buildImmediateSongStory,
  generateSongStory,
  getCachedSongStory,
  getSongStoryCacheKey,
  prefetchSongStory,
} from './services/songStoryService'
import { recordTrackPlayback, recordUserMoment } from './services/moodProfileService'
import { speakDJLine, stopSpeaking } from './services/ttsService'
import {
  getXiaoMusicDevices,
  getXiaoMusicStatus,
  getXiaoPlayableUrl,
  ensureXiaoMusicNativeTts,
  estimateXiaoDjAudioDurationMs,
  generateXiaoDjAudio,
  loadXiaoMusicSettings,
  nextXiaoMusic,
  playXiaoMusicTts,
  playXiaoMusicUrl,
  previousXiaoMusic,
  saveXiaoMusicSettings,
  setXiaoMusicVolume,
  stopXiaoMusic,
  XIAOMUSIC_PLAYBACK_TARGETS,
} from './services/xiaoMusicService'
import { fadeVolume } from './utils/audioUtils'

const INTRO_VOLUME = 0.15
const NORMAL_VOLUME = 0.7
const INTRO_FADE_MS = 800
const NORMAL_FADE_MS = 1500
const FALLBACK_TRACK_DURATION = 150
const DJ_TTS_RATE = 1.06

function TypingDots() {
  return (
    <div className="flex h-5 items-center gap-1.5">
      {[0, 1, 2].map(index => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: '#9CA3AF',
            animation: 'pulse 1s ease-in-out infinite',
            animationDelay: `${index * 140}ms`
          }}
        />
      ))}
    </div>
  )
}

function SoundWaves({ isPlaying, isPlanning, isSpeaking }) {
  const bars = 54
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), isSpeaking ? 62 : isPlaying ? 86 : 160)
    return () => clearInterval(interval)
  }, [isPlaying, isPlanning, isSpeaking])

  return (
    <div
      className="relative flex h-12 items-center justify-center gap-[3px] overflow-hidden rounded-2xl px-4"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))',
        maskImage: 'linear-gradient(90deg, transparent, #000 13%, #000 87%, transparent)',
      }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const active = isPlaying || isPlanning || isSpeaking
        let height = 7 + Math.sin(i * 0.48) * 3
        if (isPlaying || isSpeaking) {
          height = 14 + Math.sin(i * 0.58 + tick * 0.24) * 12 + Math.sin(i * 0.19 + tick * 0.12) * 7
        } else if (isPlanning) {
          height = 11 + Math.sin(i * 0.5 + tick * 0.18) * 9
        }

        const distance = Math.abs(i - bars / 2) / (bars / 2)
        const opacity = active ? 0.92 - distance * 0.44 : 0.42 - distance * 0.18

        return (
          <div
            key={i}
            className="w-[3px] rounded-full transition-[height,opacity,background-color] duration-200"
            style={{
              height: `${Math.max(5, height)}px`,
              background: isSpeaking
                ? 'linear-gradient(180deg, #1f2330, #7C5CFF)'
                : active
                  ? 'linear-gradient(180deg, #171820, #22D3EE)'
                  : 'rgba(31,35,48,0.42)',
              opacity,
            }}
          />
        )
      })}
    </div>
  )
}

function getCurrentTime() {
  const now = new Date()
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const fallbackAlbumTiles = [
  'linear-gradient(135deg, #f4c5a8, #c8b8e0)',
  'linear-gradient(135deg, #a7e5d3, #a8c8e8)',
  'linear-gradient(135deg, #e8b8c4, #f4c5a8)',
  'linear-gradient(135deg, #d7c5ff, #8fd8d2)',
  'linear-gradient(135deg, #f6d365, #fda085)',
  'linear-gradient(135deg, #9face6, #74ebd5)',
  'linear-gradient(135deg, #fbc2eb, #a6c1ee)',
  'linear-gradient(135deg, #ffecd2, #fcb69f)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
  'linear-gradient(135deg, #cfd9df, #e2ebf0)',
  'linear-gradient(135deg, #fad0c4, #ffd1ff)',
  'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
]

function getTrackCoverUrl(track) {
  return (
    track?.coverUrl ||
    track?.raw?.album?.picUrl ||
    track?.raw?.album?.blurPicUrl ||
    track?.raw?.al?.picUrl ||
    track?.raw?.picUrl ||
    ''
  )
}

function AlbumWallBackground({ tracks = [], currentTrack = null }) {
  const { settings } = useGlassSettings()
  const coverTracks = tracks
    .map(track => ({ ...track, coverUrl: getTrackCoverUrl(track) }))
    .filter(track => track.coverUrl)
  const singleCoverUrl = getTrackCoverUrl(currentTrack) || coverTracks[0]?.coverUrl || ''

  if (settings.albumBackgroundMode === 'single' && singleCoverUrl) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -inset-12"
          style={{
            background: `center / cover url("${singleCoverUrl}")`,
            filter: 'blur(24px) saturate(0.92) contrast(0.92)',
            opacity: 0.82,
            transform: 'scale(1.1)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(246,242,235,0.34), rgba(226,232,238,0.30)), radial-gradient(circle at 50% 22%, rgba(255,255,255,0.28), transparent 44%)',
          }}
        />
      </div>
    )
  }

  const tiles = Array.from({ length: 36 }).map((_, index) => {
    const track = coverTracks[index % Math.max(coverTracks.length, 1)]
    return {
      id: `${track?.id || 'fallback'}-${index}`,
      coverUrl: track?.coverUrl,
      gradient: fallbackAlbumTiles[index % fallbackAlbumTiles.length],
    }
  })

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -inset-16 grid grid-cols-6 gap-3 sm:grid-cols-9"
        style={{
          filter: 'blur(14px) saturate(0.92) contrast(0.94)',
          opacity: coverTracks.length > 0 ? 0.86 : 0.78,
          transform: 'scale(1.1) rotate(-3deg)',
        }}
      >
        {tiles.map(tile => (
          <div
            key={tile.id}
            className="aspect-square rounded-[28px]"
            style={{
              background: tile.coverUrl
                ? `center / cover url("${tile.coverUrl}")`
                : `
                  radial-gradient(circle at 30% 28%, rgba(255,255,255,0.42), transparent 22%),
                  radial-gradient(circle at 72% 70%, rgba(20,24,34,0.22), transparent 26%),
                  ${tile.gradient}
                `,
            }}
          />
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(246,242,235,0.32), rgba(226,232,238,0.30)), radial-gradient(circle at 50% 18%, rgba(255,255,255,0.30), transparent 45%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  )
}

function textScore(text = '') {
  return Array.from(String(text)).reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

export default function App() {
  const [phase, setPhase] = useState('idle')
  const [userInput, setUserInput] = useState('')
  const [currentPlan, setCurrentPlan] = useState(null)
  const [currentTime, setCurrentTime] = useState(getCurrentTime())
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [speechError, setSpeechError] = useState('')
  const [, setAudioElement] = useState(null)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [, setFailedTracks] = useState(new Set())
  const [musicVolume, setMusicVolume] = useState(NORMAL_VOLUME)
  const [trackTime, setTrackTime] = useState(0)
  const [trackDuration, setTrackDuration] = useState(FALLBACK_TRACK_DURATION)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      type: 'dj',
      text: '告诉我你现在的状态。我会把音乐先放低一点，陪你慢慢进入状态。'
    }
  ])
  const [activeMessageId, setActiveMessageId] = useState(null)
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false)
  const [isDjVoiceEnabled, setIsDjVoiceEnabled] = useState(true)
  const [isNeteaseLibraryOpen, setIsNeteaseLibraryOpen] = useState(false)
  const [xiaoSettings, setXiaoSettings] = useState(() => loadXiaoMusicSettings())
  const [xiaoDevices, setXiaoDevices] = useState([])
  const [xiaoBusy, setXiaoBusy] = useState(false)
  const [xiaoStatus, setXiaoStatus] = useState({
    type: 'idle',
    message: '未连接',
    detail: null
  })

  const audioRef = useRef(null)
  const planRef = useRef(null)
  const introSessionRef = useRef(0)
  const chatFeedRef = useRef(null)
  const latestUserInputRef = useRef('')
  const recentStoryTextsRef = useRef([])
  const xiaoSettingsRef = useRef(xiaoSettings)

  useEffect(() => {
    planRef.current = currentPlan
  }, [currentPlan])

  useEffect(() => {
    xiaoSettingsRef.current = xiaoSettings
  }, [xiaoSettings])

  useEffect(() => {
    return () => {
      introSessionRef.current += 1
      stopSpeaking()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onloadeddata = null
        audioRef.current.onloadedmetadata = null
        audioRef.current.ontimeupdate = null
        audioRef.current.onerror = null
        audioRef.current.onended = null
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(getCurrentTime()), 1000)
    return () => clearInterval(timeInterval)
  }, [])

  useEffect(() => {
    if (!chatFeedRef.current) return
    chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight
  }, [chatMessages, phase])

  const currentTrack = currentPlan?.tracks?.[currentTrackIndex] || null
  const progressPercent = trackDuration > 0 ? Math.min(100, (trackTime / trackDuration) * 100) : 0
  const isPlayingState = phase === 'intro' || phase === 'playing'

  const formatPlaybackTime = (seconds) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
    const mins = Math.floor(safeSeconds / 60)
    const secs = safeSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusText = () => {
    switch (phase) {
      case 'idle': return 'Ready'
      case 'planning': return 'Planning'
      case 'intro': return 'DJ Intro'
      case 'playing': return 'Playing'
      case 'paused': return 'Paused'
      default: return 'Ready'
    }
  }

  const getStatusDotColor = () => {
    switch (phase) {
      case 'idle': return '#10B981'
      case 'planning': return '#7C5CFF'
      case 'intro': return '#8B5CF6'
      case 'playing': return '#6366F1'
      case 'paused': return '#9CA3AF'
      default: return '#10B981'
    }
  }

  const addChatMessage = (message) => {
    const id = message.id || `${message.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setChatMessages(prev => [...prev, { ...message, id }])
    return id
  }

  const updateChatMessage = (id, patch) => {
    if (!id) return
    setChatMessages(prev => prev.map(message =>
      message.id === id ? { ...message, ...patch } : message
    ))
  }

  const rememberStoryText = (text) => {
    const cleaned = String(text || '').trim()
    if (!cleaned) return
    recentStoryTextsRef.current = [
      ...recentStoryTextsRef.current.filter(item => item !== cleaned),
      cleaned
    ].slice(-5)
  }

  const updateXiaoSettings = (patch) => {
    setXiaoSettings(prev => {
      const nextSettings = saveXiaoMusicSettings({ ...prev, ...patch })
      xiaoSettingsRef.current = nextSettings
      return nextSettings
    })
  }

  const setXiaoMessage = (message, type = 'idle', detail = null) => {
    setXiaoStatus({ type, message, detail })
  }

  const shouldUseXiaoSpeaker = () => {
    const target = xiaoSettingsRef.current.playbackTarget
    return target === XIAOMUSIC_PLAYBACK_TARGETS.speaker || target === XIAOMUSIC_PLAYBACK_TARGETS.both
  }

  const isXiaoOnlyMode = () => xiaoSettingsRef.current.playbackTarget === XIAOMUSIC_PLAYBACK_TARGETS.speaker

  const withXiaoBusy = async (task, busyMessage = '正在连接小爱...') => {
    setXiaoBusy(true)
    setXiaoMessage(busyMessage, 'busy')
    try {
      return await task()
    } finally {
      setXiaoBusy(false)
    }
  }

  const waitForXiaoStoryText = async (track, options = {}) => {
    const plan = options.plan || planRef.current || currentPlan
    const index = Number.isFinite(options.index) ? options.index : currentTrackIndex
    const fallbackText = getTrackStoryText(track, plan, index)
    const directText = String(options.djText || '').trim()

    if (directText) {
      return {
        text: directText,
        source: options.djTextSource || (plan?.djSource === 'minimax' && track?.songIntro ? 'minimax-plan' : 'direct')
      }
    }

    if (!track || !plan) {
      return {
        text: fallbackText,
        source: 'fallback'
      }
    }

    const timeoutMs = Number(import.meta.env.VITE_XIAOMUSIC_DJ_TEXT_TIMEOUT_MS || 9000)
    const storyPromise = generateSongStory(track, getStoryContext(plan, index))
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('DJ story timeout')), timeoutMs)
    })

    try {
      setXiaoMessage('正在生成小爱 DJ 文案...', 'busy')
      const story = await Promise.race([storyPromise, timeoutPromise])
      return {
        text: String(story?.text || fallbackText || directText).trim(),
        source: story?.source || 'fallback'
      }
    } catch {
      return {
        text: String(fallbackText || directText).trim(),
        source: 'fallback'
      }
    }
  }

  const buildXiaoDjTtsText = (text, track = null) => {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim()
    if (cleaned.length <= 16) return cleaned

    const sentences = cleaned
      .split(/(?<=[。！？!?；;])/)
      .map(sentence => sentence.trim())
      .filter(Boolean)
    const spokenSentence = sentences.find(sentence =>
      sentence.length >= 12 &&
      sentence.length <= 18 &&
      !/首先听到|接下来听到|来自|专辑|名字本身|歌名/.test(sentence)
    ) || sentences.find(sentence => sentence.length >= 8 && sentence.length <= 22)

    const title = String(track?.title || '').replace(/\s*[（(].*?[）)]/g, '').trim()
    const titleLine = title ? `先听《${title.slice(0, 8)}》。` : ''
    const compact = spokenSentence || titleLine || cleaned
    if (compact.length <= 22) return compact
    return `${compact.slice(0, 18).replace(/[，,、：:；;。！？!?]+$/g, '')}。`
  }

  const buildXiaoDjAudioText = (text, track = null) => {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim()
    if (!cleaned) return buildXiaoDjTtsText(text, track)
    if (cleaned.length <= 48) return cleaned

    const sentences = cleaned
      .split(/(?<=[。！？!?；;])/)
      .map(sentence => sentence.trim())
      .filter(Boolean)
    const spokenSentence = sentences.find(sentence =>
      sentence.length >= 16 &&
      sentence.length <= 48 &&
      !/首先听到|接下来听到|来自|专辑|名字本身|歌名/.test(sentence)
    ) || sentences.find(sentence => sentence.length >= 12 && sentence.length <= 56)

    const title = String(track?.title || '').replace(/\s*[（(].*?[）)]/g, '').trim()
    const titleLine = title ? `先听《${title.slice(0, 12)}》，让这段声音把状态接住。` : ''
    const compact = spokenSentence || titleLine || cleaned
    if (compact.length <= 56) return compact
    return `${compact.slice(0, 52).replace(/[，,、：:；;。！？!?]+$/g, '')}。`
  }

  const handleDetectXiaoDevices = async () => {
    await withXiaoBusy(async () => {
      const devices = await getXiaoMusicDevices(xiaoSettingsRef.current)
      setXiaoDevices(devices)
      if (devices.length === 0) {
        setXiaoMessage('没有发现设备', 'error')
        return
      }

      const currentDid = xiaoSettingsRef.current.deviceDid
      const selected = devices.find(device => device.did === currentDid) || devices[0]
      updateXiaoSettings({ deviceDid: selected.did, deviceName: selected.name })
      setXiaoMessage(`已连接 ${selected.name}`, 'ok', selected)
    }, '正在检测设备...')
      .catch((error) => {
        setXiaoMessage(error.message || '小爱连接失败', 'error')
      })
  }

  const handleRefreshXiaoStatus = async () => {
    await withXiaoBusy(async () => {
      const settings = xiaoSettingsRef.current
      const status = await getXiaoMusicStatus(settings, settings.deviceDid)
      const playingName = status?.cur_music || status?.music || status?.title || ''
      setXiaoMessage(playingName ? `正在播放 ${playingName}` : '状态已刷新', 'ok', status)
    }, '正在刷新状态...')
      .catch((error) => {
        setXiaoMessage(error.message || '状态刷新失败', 'error')
      })
  }

  const sendTrackToXiao = async (track, options = {}) => {
    const settings = xiaoSettingsRef.current
    if (!settings.deviceDid) {
      throw new Error('请先在小爱音箱面板选择设备')
    }

    const playableUrl = getXiaoPlayableUrl(track)
    if (!playableUrl) {
      throw new Error('这首歌的地址小爱音箱访问不到。网易云公网 URL 更适合推送，本地 /audio 或 blob 音频需要局域网地址。')
    }

    await withXiaoBusy(async () => {
      const djStory = settings.speakDjBeforeTrack
        ? await waitForXiaoStoryText(track, options)
        : { text: '', source: 'off' }
      const djText = djStory.text

      if (settings.speakDjBeforeTrack && djText) {
        try {
          await stopXiaoMusic(settings, settings.deviceDid).catch(() => {})
          await new Promise(resolve => setTimeout(resolve, 300))
          const xiaoDjAudioText = buildXiaoDjAudioText(djText, track)
          setXiaoMessage('正在生成 Claudio DJ 声音...', 'busy')
          console.info('[Claudio XiaoMusic] pushing DJ TTS ' + JSON.stringify({
            track: track.title,
            source: djStory.source,
            mode: 'minimax-audio-url',
            originalChars: djText.length,
            chars: xiaoDjAudioText.length,
            preview: xiaoDjAudioText.slice(0, 80)
          }))
          const djAudio = await generateXiaoDjAudio(settings, xiaoDjAudioText)
          console.info('[Claudio XiaoMusic] pushing DJ audio URL ' + JSON.stringify({
            track: track.title,
            url: djAudio.url,
            bytes: djAudio.bytes,
            durationMs: djAudio.durationMs,
            voiceId: djAudio.voiceId
          }))
          await playXiaoMusicUrl(settings, settings.deviceDid, djAudio.url)
          const ttsLeadMs = Math.max(0, Math.min(1500, settings.ttsLeadMs || 0))
          const sourceLabel = String(djStory.source || '').includes('minimax') ? 'AI' : '本地'
          const djWaitMs = Math.max(estimateXiaoDjAudioDurationMs(xiaoDjAudioText), Number(djAudio.durationMs || 0)) + ttsLeadMs
          setXiaoMessage(`${sourceLabel} Claudio DJ 声音已发送，${(djWaitMs / 1000).toFixed(1)} 秒后推歌...`, 'busy', djAudio)
          await new Promise(resolve => setTimeout(resolve, djWaitMs))
        } catch (error) {
          console.warn('[Claudio XiaoMusic] DJ audio failed, falling back to native TTS', error)
          try {
            const xiaoDjText = buildXiaoDjTtsText(djText, track)
            const ttsMode = await ensureXiaoMusicNativeTts(settings)
            setXiaoMessage('Claudio 声音生成失败，先用小爱朗读兜底...', 'busy')
            console.info('[Claudio XiaoMusic] pushing fallback DJ TTS ' + JSON.stringify({
              track: track.title,
              mode: ttsMode.mode,
              ttsModeChanged: ttsMode.changed,
              chars: xiaoDjText.length,
              preview: xiaoDjText.slice(0, 80)
            }))
            await playXiaoMusicTts(settings, settings.deviceDid, xiaoDjText)
            const ttsLeadMs = Math.max(0, Math.min(1500, settings.ttsLeadMs || 0))
            if (ttsLeadMs > 0) {
              await new Promise(resolve => setTimeout(resolve, ttsLeadMs))
            }
          } catch (fallbackError) {
            console.warn('[Claudio XiaoMusic] fallback DJ TTS failed', fallbackError)
            setXiaoMessage(fallbackError.message || error.message || 'DJ 文案播放失败，继续推送音乐', 'error')
          }
        }
      }

      console.info('[Claudio XiaoMusic] pushing music URL ' + JSON.stringify({
        track: track.title,
        url: playableUrl
      }))
      await playXiaoMusicUrl(settings, settings.deviceDid, playableUrl)
      setXiaoMessage(`已推送 ${track.title || '当前歌曲'}`, 'ok', { track, url: playableUrl })
    }, '正在推送到小爱...')
  }

  const handlePlayCurrentOnXiao = async () => {
    if (!currentTrack) {
      setXiaoMessage('还没有当前歌曲', 'error')
      return
    }

    try {
      await sendTrackToXiao(currentTrack, {
        djText: getTrackStoryText(currentTrack, currentPlan, currentTrackIndex),
        plan: currentPlan,
        index: currentTrackIndex
      })
    } catch (error) {
      setXiaoMessage(error.message || '推送失败', 'error')
    }
  }

  const handleStopXiao = async () => {
    await withXiaoBusy(async () => {
      await stopXiaoMusic(xiaoSettingsRef.current, xiaoSettingsRef.current.deviceDid)
      setXiaoMessage('已停止小爱播放', 'ok')
    }, '正在停止...')
      .catch((error) => setXiaoMessage(error.message || '停止失败', 'error'))
  }

  const handlePreviousXiao = async () => {
    await withXiaoBusy(async () => {
      await previousXiaoMusic(xiaoSettingsRef.current, xiaoSettingsRef.current.deviceDid)
      setXiaoMessage('已发送上一首', 'ok')
    }, '正在切到上一首...')
      .catch((error) => setXiaoMessage(error.message || '上一首失败', 'error'))
  }

  const handleNextXiao = async () => {
    await withXiaoBusy(async () => {
      await nextXiaoMusic(xiaoSettingsRef.current, xiaoSettingsRef.current.deviceDid)
      setXiaoMessage('已发送下一首', 'ok')
    }, '正在切到下一首...')
      .catch((error) => setXiaoMessage(error.message || '下一首失败', 'error'))
  }

  const handleSetXiaoVolume = async (volume) => {
    await withXiaoBusy(async () => {
      await setXiaoMusicVolume(xiaoSettingsRef.current, xiaoSettingsRef.current.deviceDid, volume)
      setXiaoMessage(`小爱音量 ${volume}`, 'ok')
    }, '正在设置音量...')
      .catch((error) => setXiaoMessage(error.message || '音量设置失败', 'error'))
  }

  const highlightKeywords = (text, highlights) => {
    if (!text || !highlights?.length) return text
    const pattern = new RegExp(`(${highlights.join('|')})`, 'g')
    return text.split(pattern).map((part, i) =>
      highlights.includes(part) ? (
        <span key={i} className="rounded-md px-1.5 py-0.5" style={{ background: 'rgba(167,243,208,0.18)', color: '#6EE7B7' }}>
          {part}
        </span>
      ) : part
    )
  }

  const buildLibraryOpeningLine = (label, count, firstTrack) => {
    const firstTitle = firstTrack?.title || '第一首歌'
    const firstArtist = firstTrack?.artist || ''
    const variants = [
      `我已经把 ${count} 首声音排好。第一首先交给 ${firstTitle}${firstArtist ? ` · ${firstArtist}` : ''}，让节奏把空间慢慢打开。`,
      `${firstTitle} 先接上来。你不用急着进入状态，我们让第一段声音先把房间铺稳。`,
      `现在从 ${firstTitle} 开始。我的声音只做轻轻的提示，剩下的交给这首歌自己展开。`,
      `Claudio 已经准备好了。先听 ${firstTitle}，后面的歌我会顺着这一首的气质接下去。`,
    ]

    return variants[textScore(`${label || 'library'}-${firstTitle}-${count}`) % variants.length]
  }

  const getStoryContext = (plan = planRef.current || currentPlan, index = currentTrackIndex) => ({
    playlistName: plan?.title || '',
    userInput: plan?.userInput || latestUserInputRef.current || '',
    mode: plan?.mode || '',
    index,
    total: plan?.tracks?.length || 0,
    recentStoryTexts: recentStoryTextsRef.current.slice(-4),
  })

  const getTrackStoryText = (track, plan = planRef.current || currentPlan, index = currentTrackIndex) => {
    if (!track) return '我会先把声音放低一点。你不用急着进入状态，我们让音乐先把房间铺开。'
    const context = getStoryContext(plan, index)
    const cached = getCachedSongStory(track, context)
    return cached?.text || buildImmediateSongStory(track, context).text
  }

  const prepareSongStory = (track, plan, index, messageId = null) => {
    if (!track) return
    const context = getStoryContext(plan, index)
    const key = getSongStoryCacheKey(track, context)

    generateSongStory(track, context).then(story => {
      if (!story?.text) return
      if (messageId) {
        updateChatMessage(messageId, {
          text: story.text,
          storySource: story.source,
          storyKey: key
        })
      }
      rememberStoryText(story.text)
    }).catch(() => {})
  }

  const prefetchNextSongStory = (plan, index) => {
    if (!plan?.tracks?.length || plan.tracks.length < 2) return
    const nextIndex = (index + 1) % plan.tracks.length
    const nextTrack = plan.tracks[nextIndex]
    prefetchSongStory(nextTrack, getStoryContext(plan, nextIndex))
  }

  const addTrackChatMessages = (track, plan = planRef.current || currentPlan, index = currentTrackIndex) => {
    if (!track) return null
    recordTrackPlayback(track, getStoryContext(plan, index))
    addChatMessage({
      type: 'system',
      text: `Now playing · ${track.title}`
    })
    const context = getStoryContext(plan, index)
    const draftText = getTrackStoryText(track, plan, index)
    const messageId = addChatMessage({
      type: 'track_story',
      text: draftText,
      storySource: getCachedSongStory(track, context)?.source || 'draft'
    })
    rememberStoryText(draftText)
    prepareSongStory(track, plan, index, messageId)
    prefetchNextSongStory(plan, index)
    return messageId
  }

  const cleanupCurrentAudio = () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.__fadeCancel) {
      audio.__fadeCancel()
    }
    audio.pause()
    audio.onloadeddata = null
    audio.onloadedmetadata = null
    audio.ontimeupdate = null
    audio.onerror = null
    audio.onended = null
    audio.src = ''
    audioRef.current = null
    setAudioElement(null)
    setTrackTime(0)
  }

  const handleXiaoSpeakerToggle = (enabled) => {
    const nextPlaybackTarget = enabled
      ? XIAOMUSIC_PLAYBACK_TARGETS.speaker
      : XIAOMUSIC_PLAYBACK_TARGETS.browser

    updateXiaoSettings({
      playbackTarget: nextPlaybackTarget,
      autoPushOnTrackChange: true,
      speakDjBeforeTrack: true
    })
    stopSpeaking()
    setIsSpeaking(false)
    setActiveMessageId(null)
    setSpeechError('')

    if (!enabled) {
      setXiaoMessage('已切回电脑播放', 'idle')
      return
    }

    cleanupCurrentAudio()
    setAudioError('')
    setXiaoMessage(
      xiaoSettingsRef.current.deviceDid
        ? '已开启小爱播放，电脑端已静音'
        : '已开启小爱播放，请先检测并选择设备',
      xiaoSettingsRef.current.deviceDid ? 'ok' : 'idle'
    )

    if (currentTrack && xiaoSettingsRef.current.deviceDid) {
      sendTrackToXiao(currentTrack, {
        djText: getTrackStoryText(currentTrack, currentPlan, currentTrackIndex)
      }).catch((error) => {
        setXiaoMessage(error.message || '小爱推送失败', 'error')
      })
    }
  }

  const finishDJIntro = async (sessionId) => {
    if (introSessionRef.current !== sessionId) return

    setIsSpeaking(false)
    setActiveMessageId(null)
    const audio = audioRef.current
    if (audio) {
      await fadeVolume(audio, audio.volume, musicVolume, NORMAL_FADE_MS)
    }

    if (introSessionRef.current === sessionId) {
      setPhase(audioRef.current ? 'playing' : 'idle')
    }
  }

  const speakOpeningLine = async (text, sessionId = introSessionRef.current, messageId = null) => {
    if (isXiaoOnlyMode()) {
      setIsSpeaking(false)
      setActiveMessageId(null)
      setPhase('playing')
      return
    }

    setIsSpeaking(true)
    setActiveMessageId(messageId)
    setPhase('intro')

    try {
      const result = await speakDJLine(text, { rate: DJ_TTS_RATE })
      if (result?.stopped) return
      if (result?.success === false) {
        setSpeechError('语音朗读没有成功。音乐会继续播放。')
      } else {
        setSpeechError('')
      }
    } catch (error) {
      console.error('TTS failed:', error)
      setSpeechError('语音朗读暂时不可用。音乐会继续播放。')
    } finally {
      await finishDJIntro(sessionId)
    }
  }

  const speakTrackStory = (track, sessionId, messageId = null, plan = planRef.current || currentPlan, index = currentTrackIndex) => {
    if (!track) return

    if (!isDjVoiceEnabled) {
      finishDJIntro(sessionId)
      return
    }

    speakOpeningLine(getTrackStoryText(track, plan, index), sessionId, messageId)
  }

  const replayDJ = async () => {
    if (!currentPlan) return

    setIsDjVoiceEnabled(true)
    const sessionId = introSessionRef.current + 1
    introSessionRef.current = sessionId
    stopSpeaking()
    setSpeechError('')
    setPhase('intro')

    const audio = audioRef.current
    if (audio) {
      if (audio.paused) {
        try {
          await audio.play()
        } catch (error) {
          console.error('Audio resume failed before replay DJ:', error)
        }
      }
      await fadeVolume(audio, audio.volume, INTRO_VOLUME, 500)
    }

    const replayText = currentTrack ? getTrackStoryText(currentTrack, currentPlan, currentTrackIndex) : currentPlan.openingLine
    const replayId = addChatMessage({
      type: 'dj',
      text: replayText
    })
    speakOpeningLine(replayText, sessionId, replayId)
  }

  const handleStopSpeaking = () => {
    const sessionId = introSessionRef.current + 1
    introSessionRef.current = sessionId
    stopSpeaking()
    setIsSpeaking(false)
    setActiveMessageId(null)

    const audio = audioRef.current
    if (audio) {
      fadeVolume(audio, audio.volume, musicVolume, 700).then(() => {
        if (introSessionRef.current === sessionId) {
          setPhase('playing')
        }
      })
    } else {
      setPhase('idle')
    }
  }

  const pausePlayback = () => {
    introSessionRef.current += 1
    stopSpeaking()
    setIsSpeaking(false)
    setActiveMessageId(null)
    if (audioRef.current) {
      audioRef.current.pause()
    }
    if (shouldUseXiaoSpeaker() && xiaoSettingsRef.current.deviceDid) {
      stopXiaoMusic(xiaoSettingsRef.current, xiaoSettingsRef.current.deviceDid)
        .then(() => setXiaoMessage('已停止小爱播放', 'ok'))
        .catch((error) => setXiaoMessage(error.message || '小爱停止失败', 'error'))
    }
    setPhase('paused')
  }

  const resumePlayback = () => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
          setAudioError('')
          fadeVolume(audioRef.current, audioRef.current.volume, musicVolume, 700)
          setPhase('playing')
        })
        .catch((error) => {
          console.error('Audio play failed:', error)
          setAudioError('音乐播放失败。请检查浏览器音量，或刷新页面后再试。')
          setPhase('paused')
        })
    } else if (currentPlan?.tracks?.length) {
      playTrack(currentTrackIndex, {
        startVolume: 0,
        targetVolume: musicVolume,
        fadeDuration: 700,
        phaseAfterStart: 'playing'
      }).catch(() => {})
    }
  }

  const setVolumeSafely = (nextVolume) => {
    const clampedVolume = Math.min(1, Math.max(0, nextVolume))
    setMusicVolume(clampedVolume)
    if (audioRef.current && phase !== 'intro') {
      audioRef.current.volume = clampedVolume
    }
    return clampedVolume
  }

  const handleLocalControlIntent = (input) => {
    if (!currentPlan) return false

    const text = input.trim()
    const reply = (message) => addChatMessage({ type: 'dj', text: message })

    if (/下一首|换一首|切歌/.test(text)) {
      playNextTrack()
      reply('好，我切到下一首。')
      return true
    }

    if (/上一首|上一曲/.test(text)) {
      playPreviousTrack()
      reply('好，我回到上一首。')
      return true
    }

    if (/暂停|停一下/.test(text)) {
      pausePlayback()
      reply('好，我先暂停一下。')
      return true
    }

    if (/继续播放|接着放|继续/.test(text)) {
      resumePlayback()
      reply('好，我继续播放。')
      return true
    }

    if (/声音小点|小声点|音量小|轻一点/.test(text)) {
      setVolumeSafely(musicVolume - 0.1)
      reply('好，我把音量放轻一点。')
      return true
    }

    if (/声音大点|大声点|音量大/.test(text)) {
      setVolumeSafely(musicVolume + 0.1)
      reply('好，我把音量推高一点。')
      return true
    }

    if (/别说话了|只放音乐|不要说话/.test(text)) {
      setIsDjVoiceEnabled(false)
      stopSpeaking()
      setIsSpeaking(false)
      setActiveMessageId(null)
      if (audioRef.current) {
        fadeVolume(audioRef.current, audioRef.current.volume, musicVolume, 700)
        setPhase('playing')
      }
      reply('好，我先不说话，只放音乐。')
      return true
    }

    if (/重新介绍一下|再介绍一下|介绍这首/.test(text)) {
      replayDJ()
      reply('好，我重新介绍一下现在这首。')
      return true
    }

    return false
  }

  const handleGenerate = async (input) => {
    const cleanedInput = input.trim()
    if (!cleanedInput) return
    latestUserInputRef.current = cleanedInput

    addChatMessage({
      type: 'user',
      text: cleanedInput
    })
    setUserInput('')

    if (handleLocalControlIntent(cleanedInput)) {
      return
    }

    const sessionId = introSessionRef.current + 1
    introSessionRef.current = sessionId
    setPhase('planning')
    setAudioError('')
    setSpeechError('')
    setActiveMessageId(null)
    setIsDjVoiceEnabled(true)

    stopSpeaking()
    cleanupCurrentAudio()

    try {
      addChatMessage({
        type: 'system',
        text: 'Claudio 正在理解你的状态...'
      })
      addChatMessage({
        type: 'system',
        text: 'Claudio 正在网易云中寻找适合的声音...'
      })

      const generatedPlan = await createMoodwaveSession(cleanedInput)
      if (introSessionRef.current !== sessionId) return
      const plan = {
        ...generatedPlan,
        userInput: cleanedInput
      }
      recordUserMoment(cleanedInput, plan.mode)

      setCurrentPlan(plan)
      planRef.current = plan
      setTrackTime(0)
      setTrackDuration(FALLBACK_TRACK_DURATION)
      setCurrentTrackIndex(0)
      setFailedTracks(new Set())
      setIsPlaylistOpen(false)

      ;(plan.chatMessages || []).forEach(message => addChatMessage(message))

      const firstTrack = plan.tracks?.[0]
      const openingId = addChatMessage({
        type: 'dj',
        text: plan.openingLine
      })
      addTrackChatMessages(firstTrack, plan, 0)

      try {
        const firstStoryText = getTrackStoryText(firstTrack, plan, 0)
        await playTrack(0, {
          plan,
          startVolume: 0,
          targetVolume: INTRO_VOLUME,
          fadeDuration: INTRO_FADE_MS,
          phaseAfterStart: 'intro',
          xiaoIntroText: firstStoryText
        })
      } catch (error) {
        console.error('Intro music failed:', error)
        if (plan.source?.includes('netease')) {
          setAudioError('网易云歌单已生成，但浏览器没有自动播放。请点底部播放按钮继续。')
          setPhase('paused')
        } else {
          setAudioError('背景音乐暂时没有自动播放成功，请点底部播放按钮继续。')
          setPhase('intro')
        }
      }

      if (introSessionRef.current === sessionId) {
        speakOpeningLine(plan.openingLine, sessionId, openingId)
      }
    } catch (error) {
      console.error('Generate plan failed:', error)
      addChatMessage({
        type: 'system',
        text: 'Claudio 暂时没有生成成功，请稍后再试一次。'
      })
      setPhase('idle')
    }
  }

  const playTrack = (index, options = {}) => {
    const plan = options.plan || planRef.current
    const startVolume = options.startVolume ?? NORMAL_VOLUME
    const targetVolume = options.targetVolume ?? musicVolume
    const fadeDuration = options.fadeDuration ?? 0
    const phaseAfterStart = options.phaseAfterStart ?? 'playing'

    return new Promise((resolve, reject) => {
      if (!plan || !plan.tracks || index >= plan.tracks.length) {
        reject(new Error('No playable track'))
        return
      }

      const track = plan.tracks[index]
      if (!track) {
        reject(new Error('Track not found'))
        return
      }

      if (shouldUseXiaoSpeaker() && xiaoSettingsRef.current.autoPushOnTrackChange) {
        if (isXiaoOnlyMode()) {
          cleanupCurrentAudio()
          setCurrentTrackIndex(index)
          setTrackTime(0)
          setTrackDuration(track.duration || FALLBACK_TRACK_DURATION)
          setPhase(phaseAfterStart)

          sendTrackToXiao(track, {
            djText: options.xiaoIntroText || '',
            djTextSource: plan?.djSource === 'minimax' && track?.songIntro ? 'minimax-plan' : '',
            plan,
            index
          }).then(() => {
            resolve({ provider: 'xiaomusic', track })
          }).catch((error) => {
            setAudioError(error.message || '小爱音箱播放失败。')
            setPhase('paused')
            reject(error)
          })
          return
        }

        sendTrackToXiao(track, {
          djText: options.xiaoIntroText || '',
          djTextSource: plan?.djSource === 'minimax' && track?.songIntro ? 'minimax-plan' : '',
          plan,
          index
        }).catch((error) => {
          setXiaoMessage(error.message || '小爱推送失败', 'error')
        })
      }

      cleanupCurrentAudio()

      const audio = new Audio(track.audioUrl)
      audio.volume = startVolume
      audioRef.current = audio
      setAudioElement(audio)
      setCurrentTrackIndex(index)
      setTrackTime(0)
      setTrackDuration(FALLBACK_TRACK_DURATION)

      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setTrackDuration(audio.duration)
        }
      }

      audio.ontimeupdate = () => {
        setTrackTime(audio.currentTime || 0)
      }

      audio.onloadeddata = () => {
        audio.play()
          .then(() => {
            setAudioError('')
            setPhase(phaseAfterStart)
            if (fadeDuration > 0) {
              fadeVolume(audio, audio.volume, targetVolume, fadeDuration)
            } else {
              audio.volume = targetVolume
            }
            resolve(audio)
          })
          .catch((error) => {
            console.error('Audio play failed:', error)
            setAudioError('浏览器没有允许自动播放。请点击底部播放按钮，或检查浏览器音量。')
            setPhase('paused')
            if (audioRef.current === audio) {
              cleanupCurrentAudio()
            }
            reject(error)
          })
      }

      audio.onerror = () => {
        console.error(`Failed to play track ${track.id}`)
        setFailedTracks(prev => {
          const next = new Set(prev)
          next.add(track.id)
          return next
        })

        const nextIndex = index + 1
        const totalTracks = plan.tracks.length

        if (nextIndex < totalTracks) {
          setAudioError(`这首音频暂时播不了，已自动切到下一首。`)
          playTrack(nextIndex, {
            ...options,
            plan,
            startVolume,
            targetVolume,
            fadeDuration,
            phaseAfterStart
          }).then(resolve).catch(reject)
        } else {
          setAudioError('没有找到可播放的 demo 音频，请检查 public/audio 文件夹。')
          reject(new Error('No playable demo audio found'))
        }
      }

      audio.onended = () => {
        const latestPlan = planRef.current || plan
        if (latestPlan?.tracks?.length) {
          const nextIndex = (index + 1) % latestPlan.tracks.length
          const nextTrack = latestPlan.tracks[nextIndex]
          const sessionId = introSessionRef.current + 1
          introSessionRef.current = sessionId
          setIsSpeaking(false)
          setActiveMessageId(null)
          setSpeechError('')
          const nextStoryText = getTrackStoryText(nextTrack, latestPlan, nextIndex)
          const storyId = addTrackChatMessages(nextTrack, latestPlan, nextIndex)
          playTrack(nextIndex, {
            plan: latestPlan,
            startVolume: 0,
            targetVolume: INTRO_VOLUME,
            fadeDuration: INTRO_FADE_MS,
            phaseAfterStart: 'intro',
            xiaoIntroText: nextStoryText
          }).then(() => {
            if (introSessionRef.current === sessionId) {
              speakTrackStory(nextTrack, sessionId, storyId, latestPlan, nextIndex)
            }
          }).catch(() => {})
        }
      }
    })
  }

  const handlePlayPause = () => {
    if (phase === 'paused') {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setAudioError('')
            fadeVolume(audioRef.current, audioRef.current.volume, musicVolume, 700)
            setPhase('playing')
          })
          .catch((error) => {
            console.error('Audio play failed:', error)
            setAudioError('音乐播放失败。请检查浏览器音量，或刷新页面后再试。')
            setPhase('paused')
          })
      } else if (currentPlan?.tracks?.length) {
        playTrack(currentTrackIndex, {
          startVolume: 0,
          targetVolume: musicVolume,
          fadeDuration: 700,
          phaseAfterStart: 'playing'
        }).catch(() => {})
      }
    } else if (phase === 'playing' || phase === 'intro') {
      pausePlayback()
    } else if (currentPlan?.tracks?.length) {
      playTrack(currentTrackIndex, {
        startVolume: 0,
        targetVolume: musicVolume,
        fadeDuration: 700,
        phaseAfterStart: 'playing'
      }).catch(() => {})
    }
  }

  const playTrackByIndex = (index) => {
    const plan = planRef.current
    if (!plan?.tracks?.length) return

    const nextIndex = (index + plan.tracks.length) % plan.tracks.length
    const sessionId = introSessionRef.current + 1
    introSessionRef.current = sessionId
    stopSpeaking()
    setIsSpeaking(false)
    setActiveMessageId(null)
    setSpeechError('')
    const nextTrack = plan.tracks[nextIndex]
    const storyText = getTrackStoryText(nextTrack, plan, nextIndex)
    const storyId = addTrackChatMessages(nextTrack, plan, nextIndex)
    playTrack(nextIndex, {
      plan,
      startVolume: 0,
      targetVolume: INTRO_VOLUME,
      fadeDuration: INTRO_FADE_MS,
      phaseAfterStart: 'intro',
      xiaoIntroText: storyText
    }).then(() => {
      if (introSessionRef.current === sessionId) {
        speakTrackStory(nextTrack, sessionId, storyId, plan, nextIndex)
      }
    }).catch(() => {})
  }

  const playNextTrack = () => {
    const plan = planRef.current
    if (!plan?.tracks?.length) return
    playTrackByIndex((currentTrackIndex + 1) % plan.tracks.length)
  }

  const playPreviousTrack = () => {
    const plan = planRef.current
    if (!plan?.tracks?.length) return
    playTrackByIndex((currentTrackIndex - 1 + plan.tracks.length) % plan.tracks.length)
  }

  const handlePlayNeteaseLibrary = async ({ tracks, label }) => {
    const playableTracks = Array.isArray(tracks)
      ? tracks.filter(track => track?.audioUrl)
      : []

    if (playableTracks.length === 0) {
      setAudioError('这组网易云歌曲暂时没有可播放地址。')
      return
    }

    const sessionId = introSessionRef.current + 1
    introSessionRef.current = sessionId
    stopSpeaking()
    cleanupCurrentAudio()
    setSpeechError('')
    setAudioError('')
    setIsDjVoiceEnabled(true)
    setIsPlaylistOpen(false)
    latestUserInputRef.current = ''

    const plan = {
      sessionId: `session-netease-library-${Date.now()}`,
      id: `session-netease-library-${Date.now()}`,
      source: 'netease-library',
      sourceType: 'netease',
      djSource: 'local',
      searchPlanSource: 'netease-account',
      mode: 'personal',
      userInput: '',
      title: label || '我的网易云',
      subtitle: 'NetEase · Claudio Player',
      openingLine: buildLibraryOpeningLine(label, playableTracks.length, playableTracks[0]),
      tracks: playableTracks,
      reason: '来自你的网易云账号曲库。',
      highlights: ['网易云', '歌单', '收藏', '私人电台'],
    }

    setCurrentPlan(plan)
    planRef.current = plan
    setCurrentTrackIndex(0)
    setTrackTime(0)
    setTrackDuration(FALLBACK_TRACK_DURATION)
    setFailedTracks(new Set())

    addChatMessage({
      type: 'system',
      text: `网易云曲库已接入 · ${plan.title} · ${playableTracks.length} 首`
    })
    const openingId = addChatMessage({
      type: 'dj',
      text: plan.openingLine
    })
    addTrackChatMessages(playableTracks[0], plan, 0)

    try {
      const firstStoryText = getTrackStoryText(playableTracks[0], plan, 0)
      await playTrack(0, {
        plan,
        startVolume: 0,
        targetVolume: INTRO_VOLUME,
        fadeDuration: INTRO_FADE_MS,
        phaseAfterStart: 'intro',
        xiaoIntroText: firstStoryText
      })

      if (introSessionRef.current === sessionId) {
        speakOpeningLine(plan.openingLine, sessionId, openingId)
      }
    } catch (error) {
      console.error('Netease library playback failed:', error)
      setAudioError('网易云歌曲已接入，但浏览器没有自动播放。请点底部播放按钮继续。')
      setPhase('paused')
    }
  }

  const handleVolumeChange = (event) => {
    const nextVolume = Number(event.target.value)
    setMusicVolume(nextVolume)

    if (audioRef.current && phase !== 'intro') {
      audioRef.current.volume = nextVolume
    }
  }

  const handleReset = () => {
    introSessionRef.current += 1
    stopSpeaking()
    cleanupCurrentAudio()
    setPhase('idle')
    setUserInput('')
    setCurrentPlan(null)
    setIsSpeaking(false)
    setAudioError('')
    setSpeechError('')
    setCurrentTrackIndex(0)
    setFailedTracks(new Set())
    setActiveMessageId(null)
    setIsPlaylistOpen(false)
    setChatMessages([
      {
        id: 'welcome',
        type: 'dj',
        text: '告诉我你现在的状态。我会把音乐先放低一点，陪你慢慢进入状态。'
      }
    ])
  }

  const renderChatMessage = (message) => {
    if (message.type === 'user') {
      return (
        <div key={message.id} className="flex justify-end">
          <GlassPanel
            preset="bubble"
            className="max-w-[82%] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed"
            style={{ background: 'rgba(74, 49, 142, 0.26)', border: '1px solid rgba(255,255,255,0.20)' }}
          >
            <span style={{ color: '#FFFFFF' }}>{message.text}</span>
          </GlassPanel>
        </div>
      )
    }

    if (message.type === 'system') {
      return (
        <div key={message.id} className="flex justify-center">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ background: 'rgba(255,255,255,0.42)', color: '#5f6470', border: '1px solid rgba(255,255,255,0.28)' }}
          >
            {message.text}
          </span>
        </div>
      )
    }

    const isActive = message.id === activeMessageId
    const isTrackStory = message.type === 'track_story'

    return (
      <div key={message.id} className="flex justify-start">
        <GlassPanel
          preset="bubble"
          className="max-w-[88%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed transition-all"
          style={{
            background: isTrackStory ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.34)',
            border: isActive ? '1px solid rgba(255,255,255,0.62)' : '1px solid rgba(255,255,255,0.20)',
            boxShadow: isActive ? '0 12px 30px rgba(255,255,255,0.20)' : 'none',
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: '#30323a' }}>
              Claudio
            </span>
            {isTrackStory && (
              <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(255,255,255,0.46)', color: '#6c6f78' }}>
                Song Story
              </span>
            )}
            {isActive && (
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#7C5CFF' }} />
            )}
          </div>
          <span style={{ color: '#171820' }}>
            {highlightKeywords(message.text, currentPlan?.highlights || [])}
          </span>
        </GlassPanel>
      </div>
    )
  }

  return (
    <GlassSettingsProvider>
      <div className="relative h-screen w-full overflow-hidden font-sans">
        <AlbumWallBackground tracks={currentPlan?.tracks || []} currentTrack={currentTrack} />
        <GlassSettingsPanel
          xiaoSettings={xiaoSettings}
          xiaoDevices={xiaoDevices}
          xiaoStatus={xiaoStatus}
          xiaoBusy={xiaoBusy}
          currentTrack={currentTrack}
          onXiaoSettingsChange={updateXiaoSettings}
          onDetectXiaoDevices={handleDetectXiaoDevices}
          onRefreshXiaoStatus={handleRefreshXiaoStatus}
          onPlayCurrentOnXiao={handlePlayCurrentOnXiao}
          onStopXiao={handleStopXiao}
          onPreviousXiao={handlePreviousXiao}
          onNextXiao={handleNextXiao}
          onSetXiaoVolume={handleSetXiaoVolume}
          onXiaoSpeakerToggle={handleXiaoSpeakerToggle}
        />

        <div className="relative z-10 flex h-full w-full items-center justify-center p-3 sm:p-4">
          <GlassPanel
            preset="card"
            className="flex h-[min(790px,calc(100vh-24px))] w-[460px] max-w-[calc(100vw-18px)] flex-col overflow-hidden"
            contentClassName="relative z-10 flex h-full w-full flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.30), rgba(235,239,245,0.18))',
              border: '1px solid rgba(255,255,255,0.50)',
              boxShadow: '0 30px 90px rgba(55,62,82,0.30), inset 0 1px 0 rgba(255,255,255,0.78)',
            }}
          >
            <header className="shrink-0 px-6 pb-3 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-end gap-2">
                    <p className="text-[26px] font-semibold leading-none tracking-[-0.01em]" style={{ color: '#171820' }}>
                      Claudio
                    </p>
                    <span className="pb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#6c6f78' }}>
                      radio
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: getStatusDotColor() }} />
                    <span className="text-[11px] font-medium" style={{ color: '#5f6470' }}>
                      {getStatusText()} · Private AI DJ
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <XiaoMusicPanel
                    settings={xiaoSettings}
                    devices={xiaoDevices}
                    status={xiaoStatus}
                    busy={xiaoBusy}
                    onSpeakerToggle={handleXiaoSpeakerToggle}
                  />
                  <span className="text-xs font-mono font-semibold" style={{ color: '#30323a' }}>
                    {currentTime}
                  </span>
                </div>
              </div>

              <GlassPanel
                preset="bubble"
                className="rounded-[22px] px-3 py-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.38), rgba(224,235,247,0.22))',
                  border: '1px solid rgba(255,255,255,0.38)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.62), 0 16px 34px rgba(55,62,82,0.12)',
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold" style={{ color: '#30323a' }}>
                      {currentTrack ? currentTrack.title : 'Claudio is listening'}
                    </p>
                    <p className="truncate text-[10px]" style={{ color: '#6c6f78' }}>
                      {currentTrack ? `${currentTrack.artist} · ${getSourceLabel(currentTrack)}` : 'Tell Claudio how you feel'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNeteaseLibraryOpen(prev => !prev)}
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: 'rgba(255,255,255,0.48)', color: '#4a318e' }}
                  >
                    我的网易云
                  </button>
                </div>
                <SoundWaves isPlaying={phase === 'playing'} isPlanning={phase === 'planning'} isSpeaking={phase === 'intro'} />
              </GlassPanel>
            </header>

            <main
              ref={chatFeedRef}
              className="flex-1 space-y-3 overflow-y-auto px-5 pb-4 pt-2 sm:px-6"
            >
              {isNeteaseLibraryOpen && (
                <NeteaseLibraryPanel
                  isOpen={isNeteaseLibraryOpen}
                  onClose={() => setIsNeteaseLibraryOpen(false)}
                  onPlayTracks={handlePlayNeteaseLibrary}
                />
              )}

              {chatMessages.map(renderChatMessage)}

              {!currentPlan && phase === 'idle' && !isNeteaseLibraryOpen && (
                <NeteaseLoginPanel />
              )}

              {phase === 'planning' && (
                <div className="flex justify-start">
                  <GlassPanel
                    preset="bubble"
                    className="rounded-2xl rounded-tl-md px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.34)', border: '1px solid rgba(255,255,255,0.20)' }}
                  >
                    <TypingDots />
                  </GlassPanel>
                </div>
              )}

              {(audioError || speechError) && (
                <div className="flex justify-center">
                  <span
                    className="max-w-[88%] rounded-full px-3 py-1 text-[11px]"
                    style={{ background: 'rgba(255,247,237,0.72)', color: '#92400E', border: '1px solid rgba(251,146,60,0.16)' }}
                  >
                    {audioError || speechError}
                  </span>
                </div>
              )}
            </main>

            <footer
              className="shrink-0 px-4 pb-4 pt-3 sm:px-5"
              style={{
                background: 'rgba(255,255,255,0.20)',
                borderTop: '1px solid rgba(255,255,255,0.26)',
              }}
            >
              {currentPlan?.tracks?.length > 0 && (
                <div className="mb-2">
                  <button
                    onClick={() => setIsPlaylistOpen(prev => !prev)}
                    className="mb-2 flex w-full items-center justify-between rounded-2xl px-3.5 py-2 text-left text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.34)', color: '#30323a', border: '1px solid rgba(255,255,255,0.22)' }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#7C5CFF' }} />
                      <span>Up next · {currentPlan.tracks.length} tracks · {currentPlan.sourceType === 'netease' ? 'NetEase' : 'Local'}</span>
                    </span>
                    <span className="text-[10px]" style={{ color: '#6c6f78' }}>
                      {isPlaylistOpen ? 'Hide' : 'Show'}
                    </span>
                  </button>

                  {isPlaylistOpen && (
                    <div
                      className="mb-2 max-h-36 space-y-1.5 overflow-y-auto rounded-2xl p-1.5"
                      style={{ background: 'rgba(255,255,255,0.24)', border: '1px solid rgba(255,255,255,0.20)' }}
                    >
                      {currentPlan.tracks.map((track, index) => (
                        <button
                          key={track.id || index}
                          onClick={() => playTrackByIndex(index)}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all"
                          style={{
                            background: index === currentTrackIndex ? 'rgba(255,255,255,0.50)' : 'transparent',
                          }}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                            style={{
                              background: index === currentTrackIndex ? 'rgba(124,92,255,0.78)' : 'rgba(255,255,255,0.34)',
                              color: index === currentTrackIndex ? '#FFFFFF' : '#6c6f78'
                            }}
                          >
                            {index === currentTrackIndex ? 'Now' : index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold" style={{ color: '#1f2330' }}>
                              {track.title}
                            </p>
                            <p className="truncate text-[11px]" style={{ color: '#6c6f78' }}>
                              {track.artist} · {track.phase || track.mode || getSourceLabel(track)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <GlassPanel
                preset="player"
                className="rounded-[24px] px-3.5 py-3"
                style={{ background: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,255,255,0.36)', boxShadow: '0 18px 34px rgba(55,62,82,0.18)' }}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isPlayingState ? 'animate-pulse' : ''}`}
                        style={{ background: currentTrack ? '#4a318e' : '#8d93a1' }}
                      />
                      <span className="text-[10px] font-semibold tracking-[0.16em]" style={{ color: '#4a318e' }}>
                        {isPlayingState ? 'ON AIR' : phase === 'paused' ? 'PAUSED' : 'READY'}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold" style={{ color: '#171820' }}>
                      {currentTrack?.title || 'Claudio is waiting'}
                    </p>
                    <p className="truncate text-[11px]" style={{ color: '#5f6470' }}>
                      {currentTrack ? `${currentTrack.artist} · ${getSourceLabel(currentTrack)}` : 'Tell Claudio how you feel'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={playPreviousTrack} disabled={!currentPlan} className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-30" style={{ color: '#1f2330', background: 'rgba(255,255,255,0.48)' }} aria-label="Previous track">‹</button>
                    <button onClick={handlePlayPause} disabled={!currentPlan} className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-30" style={{ background: '#4a318e', boxShadow: '0 10px 22px rgba(74,49,142,0.26)' }} aria-label={isPlayingState ? 'Pause' : 'Play'}>
                      {isPlayingState ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4.5A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h.5A1.5 1.5 0 008 14V6a1.5 1.5 0 00-1.5-1.5H6zm7.5 0A1.5 1.5 0 0012 6v8a1.5 1.5 0 001.5 1.5h.5a1.5 1.5 0 001.5-1.5V6A1.5 1.5 0 0014 4.5h-.5z" /></svg>
                      ) : (
                        <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.34-5.89a1.5 1.5 0 000-2.54L6.3 2.84z" /></svg>
                      )}
                    </button>
                    <button onClick={playNextTrack} disabled={!currentPlan} className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-30" style={{ color: '#1f2330', background: 'rgba(255,255,255,0.48)' }} aria-label="Next track">›</button>
                  </div>
                </div>

                <div className="mb-2.5 flex items-center gap-2">
                  <span className="w-8 text-[10px] font-mono" style={{ color: '#5f6470' }}>{formatPlaybackTime(trackTime)}</span>
                  <div className="flex h-8 flex-1 items-center gap-0.5 overflow-hidden rounded-full px-2" style={{ background: 'rgba(255,255,255,0.36)' }}>
                    {Array.from({ length: 44 }).map((_, index) => {
                      const isActive = progressPercent >= (index / 43) * 100
                      const height = 5 + Math.abs(Math.sin(index * 0.54)) * 13
                      return <span key={index} className="flex-1 rounded-full transition-colors" style={{ height: `${height}px`, background: isActive ? '#4a318e' : 'rgba(77,82,94,0.20)', opacity: isActive ? 0.88 : 0.70 }} />
                    })}
                  </div>
                  <span className="w-8 text-right text-[10px] font-mono" style={{ color: '#5f6470' }}>{formatPlaybackTime(trackDuration)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: '#5f6470' }}>Vol</span>
                  <input type="range" min="0" max="1" step="0.01" value={musicVolume} onChange={handleVolumeChange} className="h-1 flex-1 accent-[#4a318e]" />
                  <span className="w-7 text-right text-[10px] font-mono" style={{ color: '#5f6470' }}>{Math.round(musicVolume * 100)}</span>
                  {currentPlan && <button onClick={replayDJ} className="rounded-full px-2 py-1 text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.42)', color: '#4a318e' }}>Replay</button>}
                  {phase === 'intro' && isSpeaking && <button onClick={handleStopSpeaking} className="rounded-full px-2 py-1 text-[10px] font-medium" style={{ background: 'rgba(239,68,68,0.14)', color: '#BE123C' }}>Stop</button>}
                </div>
              </GlassPanel>

              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="告诉 Claudio 你现在的状态，或直接调整音乐..."
                  className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs shadow-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,255,255,0.26)', color: '#171820' }}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate(userInput)}
                />
                <button
                  onClick={() => handleGenerate(userInput)}
                  disabled={!userInput.trim() || phase === 'planning'}
                  className="rounded-xl px-3 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-45"
                  style={{ background: '#4a318e' }}
                >
                  Send
                </button>
              </div>

              {currentPlan && (
                <div className="mt-2 flex items-center justify-between px-1">
                  <p className="truncate text-[10px]" style={{ color: '#5f6470' }}>
                    {currentPlan.reason}
                  </p>
                  <button onClick={handleReset} className="ml-3 shrink-0 text-[10px] font-medium" style={{ color: '#4a318e' }}>
                    New wave
                  </button>
                </div>
              )}
            </footer>
          </GlassPanel>
        </div>
      </div>
    </GlassSettingsProvider>
  )
}
