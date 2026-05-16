import { useEffect, useMemo, useRef, useState } from 'react'
import { getChatDjState, sendPlayerControl, streamChatDjMessage } from './services/chatDjClient'
import { getSourceLabel } from './services/audioSourceService'
import NeteaseCenter from './components/NeteaseCenter'
import NeteaseLoginPanel from './components/NeteaseLoginPanel'
import GlassPanel from './components/GlassPanel'
import { GlassSettingsProvider, useGlassSettings } from './components/GlassSettings'
import GlassSettingsPanel from './components/GlassSettingsPanel'
import { loadXiaoMusicSettings, saveXiaoMusicSettings } from './services/xiaoMusicService'
import { loadTtsSettings, saveTtsSettings, testTtsVoice, getTtsSettings } from './services/ttsService'

const NORMAL_VOLUME = 0.7
const DUCK_VOLUME = 0.18
const FALLBACK_DURATION = 180

function formatTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function makeMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    at: new Date().toISOString(),
    ...extra
  }
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

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

function MessageBubble({ message, isActive }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span
          className="rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ background: 'rgba(255,255,255,0.42)', color: '#5f6470', border: '1px solid rgba(255,255,255,0.28)' }}
        >
          {message.text}
        </span>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
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

  return (
    <div className="flex justify-start">
      <GlassPanel
        preset="bubble"
        className="max-w-[88%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed transition-all"
        style={{
          background: 'rgba(255,255,255,0.34)',
          border: isActive ? '1px solid rgba(255,255,255,0.62)' : '1px solid rgba(255,255,255,0.20)',
          boxShadow: isActive ? '0 12px 30px rgba(255,255,255,0.20)' : 'none',
        }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11px] font-semibold" style={{ color: '#30323a' }}>Claudio</span>
          {isActive && (
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#7C5CFF' }} />
          )}
        </div>
        <span style={{ color: '#171820' }}>{message.text || '...'}</span>
      </GlassPanel>
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([
    makeMessage('assistant', '我是 Claudio。你不用想好要听什么，直接跟我说你现在的状态就行。')
  ])
  const [input, setInput] = useState('')
  const [queue, setQueue] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [status, setStatus] = useState('正在连接 Claudio 后端...')
  const [serverConfig, setServerConfig] = useState(null)
  const [isNeteaseLibraryOpen, setIsNeteaseLibraryOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVoicePlaying, setIsVoicePlaying] = useState(false)
  const [activeVoice, setActiveVoice] = useState(null)
  const [volume, setVolume] = useState(NORMAL_VOLUME)
  const [trackTime, setTrackTime] = useState(0)
  const [trackDuration, setTrackDuration] = useState(FALLBACK_DURATION)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(getCurrentTime())
  const [xiaoSettings, setXiaoSettings] = useState(() => loadXiaoMusicSettings())
  const [xiaoDevices, setXiaoDevices] = useState([])
  const [xiaoStatus, setXiaoStatus] = useState({ type: 'idle', message: '' })
  const [xiaoDebug, setXiaoDebug] = useState(null)
  const [xiaoBusy, setXiaoBusy] = useState(false)
  const [ttsSettings, setTtsSettings] = useState(() => loadTtsSettings())
  const [isQueueExpanded, setIsQueueExpanded] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  const audioRef = useRef(null)
  const voiceAudioRef = useRef(null)
  const voiceQueueRef = useRef([])
  const isVoicePlayingRef = useRef(false)
  const pendingTrackRef = useRef(null)
  const chatRef = useRef(null)
  const abortRef = useRef(null)
  const transitionAbortRef = useRef(null)
  const progressRef = useRef(null)
  const skipNextTransitionRef = useRef(false)

  const isPlaying = phase === 'playing'
  const isThinking = phase === 'thinking'
  const progress = trackDuration > 0 ? Math.min(100, (trackTime / trackDuration) * 100) : 0

  const nowSubtitle = useMemo(() => {
    if (!currentTrack) return 'Tell Claudio how you feel'
    return `${currentTrack.artist || 'Unknown'} · ${getSourceLabel(currentTrack)}`
  }, [currentTrack])

  const getStatusText = () => {
    switch (phase) {
      case 'idle': return 'Ready'
      case 'thinking': return 'Planning'
      case 'playing': return 'Playing'
      case 'paused': return 'Paused'
      case 'loading': return 'Loading'
      case 'queued': return 'DJ Intro'
      default: return 'Ready'
    }
  }

  const getStatusDotColor = () => {
    switch (phase) {
      case 'idle': return '#10B981'
      case 'thinking': return '#7C5CFF'
      case 'playing': return '#6366F1'
      case 'paused': return '#9CA3AF'
      case 'loading': return '#F59E0B'
      case 'queued': return '#8B5CF6'
      default: return '#10B981'
    }
  }

  useEffect(() => {
    getChatDjState()
      .then(state => {
        if (Array.isArray(state.messages) && state.messages.length > 0) {
          setMessages(state.messages.map(item => ({
            id: item.id || `${item.role}-${item.at}`,
            role: item.role,
            text: item.text,
            at: item.at
          })))
        }
        setQueue(state.queue || [])
        setCurrentTrack(state.currentTrack || null)
        setVolume(Number(state.volume || NORMAL_VOLUME))
        setServerConfig(state.config || null)
        setStatus('Connected to Claudio server')
      })
      .catch(() => {
        setStatus('后端未连接：请先运行 npm run server')
        setError('Claudio 后端没有连上。请打开一个终端运行 npm run server。')
      })
  }, [])

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(getCurrentTime()), 1000)
    return () => clearInterval(timeInterval)
  }, [])

  useEffect(() => {
    if (!chatRef.current) return
    chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, phase])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined
    const tick = () => setTrackTime(audio.currentTime || 0)
    const meta = () => setTrackDuration(Number.isFinite(audio.duration) ? audio.duration : FALLBACK_DURATION)
    audio.addEventListener('timeupdate', tick)
    audio.addEventListener('loadedmetadata', meta)
    return () => {
      audio.removeEventListener('timeupdate', tick)
      audio.removeEventListener('loadedmetadata', meta)
    }
  }, [currentTrack])

  function updateAssistantMessage(id, delta) {
    setMessages(prev => prev.map(message => (
      message.id === id ? { ...message, text: `${message.text || ''}${delta}` } : message
    )))
  }

  function duckMusic() {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.volume = Math.min(audioRef.current.volume, DUCK_VOLUME)
    }
  }

  function restoreMusic() {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.volume = volume
    }
  }

  function handleSeek(clientX) {
    if (!progressRef.current || !audioRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const seekTime = percent * trackDuration
    audioRef.current.currentTime = seekTime
    setTrackTime(seekTime)
  }

  const preloadedTransitionRef = useRef(null)

  function requestTransition(track) {
    if (!track) return
    transitionAbortRef.current?.abort()
    const controller = new AbortController()
    transitionAbortRef.current = controller

    streamChatDjMessage(
      `[系统：歌曲已切换到 "${track.title}" - ${track.artist || '未知'}。请用 speak 动作说一段串场词，风格像深夜电台主播在听众耳边轻声说话：讲讲这首歌的故事或画面感，回应用户的状态，最后一句自然引出歌名。2-5句，不要播报腔。]`,
      {
        signal: controller.signal,
        ttsSettings: getTtsSettings(),
        onEvent: (payload) => {
          const { event, data } = payload
          if (event === 'sentence_ready' && data?.text) {
            setMessages(prev => [...prev, makeMessage('assistant', data.text)])
            enqueueVoice(data)
          }
        }
      }
    ).catch(() => {})
  }

  function preloadNextTransition() {
    if (queue.length === 0) return
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % queue.length : 0
    const nextTrack = queue[nextIndex]
    if (!nextTrack) return

    preloadedTransitionRef.current?.abort()
    const controller = new AbortController()
    preloadedTransitionRef.current = { track: nextTrack, controller }

    streamChatDjMessage(
      `[系统：下一首歌是 "${nextTrack.title}" - ${nextTrack.artist || '未知'}。请提前准备好一段串场词，风格像深夜电台主播在听众耳边轻声说话：讲讲这首歌的故事或画面感，最后一句自然引出歌名。2-5句，用 speak 动作输出。]`,
      {
        signal: controller.signal,
        ttsSettings: getTtsSettings(),
        onEvent: (payload) => {
          const { event, data } = payload
          if (event === 'sentence_ready' && data?.text) {
            preloadedTransitionRef.current = { ...preloadedTransitionRef.current, ready: data }
          }
        }
      }
    ).catch(() => {})
  }

  function startMusic(track) {
    if (!track?.audioUrl) {
      setError('这首歌暂时没有可播放地址。')
      return
    }

    transitionAbortRef.current?.abort()
    preloadedTransitionRef.current?.abort()

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(track.audioUrl)
    audio.volume = isVoicePlayingRef.current ? DUCK_VOLUME : volume
    audioRef.current = audio
    setCurrentTrack(track)
    setTrackTime(0)
    setTrackDuration(track.duration || FALLBACK_DURATION)
    setPhase('loading')

    audio.play()
      .then(() => {
        setError('')
        setPhase('playing')

        const skipTransition = skipNextTransitionRef.current
        skipNextTransitionRef.current = false

        const preloaded = preloadedTransitionRef.current
        if (skipTransition) {
          preloadedTransitionRef.current = null
        } else if (preloaded?.ready && preloaded.track?.id === track.id) {
          setMessages(prev => [...prev, makeMessage('assistant', preloaded.ready.text)])
          enqueueVoice(preloaded.ready)
          preloadedTransitionRef.current = null
        } else {
          requestTransition(track)
        }

        setTimeout(() => preloadNextTransition(), 2000)
      })
      .catch(() => {
        setPhase('paused')
        setError('浏览器拦截了自动播放。请点播放按钮继续。')
      })

    audio.onended = () => {
      playNextTrack()
    }
  }

  function maybeStartPendingTrack() {
    if (isVoicePlayingRef.current || voiceQueueRef.current.length > 0) return
    if (!pendingTrackRef.current) return
    const track = pendingTrackRef.current
    pendingTrackRef.current = null
    startMusic(track)
  }

  function finishVoiceItem() {
    isVoicePlayingRef.current = false
    setIsVoicePlaying(false)
    setActiveVoice(null)
    if (voiceQueueRef.current.length > 0) {
      playNextVoice()
      return
    }
    restoreMusic()
    maybeStartPendingTrack()
  }

  function playBrowserSpeech(item) {
    if (!window.speechSynthesis) {
      finishVoiceItem()
      return
    }
    const settings = getTtsSettings()
    const utterance = new SpeechSynthesisUtterance(item.text)
    utterance.lang = settings.language === 'en' ? 'en-US' : 'zh-CN'
    utterance.rate = settings.speed || 1.10
    utterance.pitch = settings.pitch || 1.02
    utterance.onend = finishVoiceItem
    utterance.onerror = finishVoiceItem
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  function playNextVoice() {
    if (isVoicePlayingRef.current) return
    const item = voiceQueueRef.current.shift()
    if (!item) {
      maybeStartPendingTrack()
      return
    }

    isVoicePlayingRef.current = true
    setIsVoicePlaying(true)
    setActiveVoice(item)
    duckMusic()

    if (!item.audioUrl) {
      playBrowserSpeech(item)
      return
    }

    const audio = new Audio(item.audioUrl)
    voiceAudioRef.current = audio
    audio.volume = 1
    audio.onended = finishVoiceItem
    audio.onerror = () => {
      playBrowserSpeech(item)
    }
    audio.play().catch(() => {
      playBrowserSpeech(item)
    })
  }

  function enqueueVoice(item) {
    if (!item?.text) return
    voiceQueueRef.current.push(item)
    playNextVoice()
  }

  function handleNowPlaying(track, nextQueue = queue) {
    setCurrentTrack(track)
    if (Array.isArray(nextQueue)) setQueue(nextQueue)
    if (isVoicePlayingRef.current || voiceQueueRef.current.length > 0) {
      pendingTrackRef.current = track
      setPhase('queued')
      return
    }
    startMusic(track)
  }

  function playNextTrack() {
    if (queue.length === 0) return
    const index = queue.findIndex(track => track.id === currentTrack?.id)
    const next = queue[index >= 0 ? (index + 1) % queue.length : 0]
    if (next) {
      startMusic(next)
      sendPlayerControl('skip').catch(() => {})
    }
  }

  function playPreviousTrack() {
    if (queue.length === 0) return
    const index = queue.findIndex(track => track.id === currentTrack?.id)
    const prev = queue[index > 0 ? index - 1 : queue.length - 1]
    if (prev) startMusic(prev)
  }

  function togglePlayback() {
    const audio = audioRef.current
    if (!audio && currentTrack) {
      startMusic(currentTrack)
      return
    }
    if (!audio) return
    if (audio.paused) {
      audio.play().then(() => {
        setPhase('playing')
        sendPlayerControl('play').catch(() => {})
      }).catch(() => setError('浏览器没有允许继续播放，请再点一次。'))
    } else {
      audio.pause()
      setPhase('paused')
      sendPlayerControl('pause').catch(() => {})
    }
  }

  function changeVolume(value) {
    const nextVolume = Number(value)
    setVolume(nextVolume)
    if (audioRef.current && !isVoicePlayingRef.current) {
      audioRef.current.volume = nextVolume
    }
    sendPlayerControl('volume', nextVolume).catch(() => {})
  }

  function handleServerEvent(assistantId, event) {
    const { event: eventName, data } = event
    if (eventName === 'assistant_delta') {
      updateAssistantMessage(assistantId, data.text || '')
      return
    }
    if (eventName === 'sentence_ready') {
      skipNextTransitionRef.current = true
      enqueueVoice(data)
      return
    }
    if (eventName === 'tool_start') {
      setStatus(data.query ? `正在找：${data.query}` : data.message || 'Claudio 正在调用工具')
      return
    }
    if (eventName === 'queue_update') {
      setQueue(data.queue || [])
      return
    }
    if (eventName === 'now_playing') {
      handleNowPlaying(data.track, data.queue || queue)
      return
    }
    if (eventName === 'player_command') {
      if (data.action === 'pause' && audioRef.current) {
        audioRef.current.pause()
        setPhase('paused')
      }
      if (data.action === 'skip') playNextTrack()
      return
    }
    if (eventName === 'error') {
      setError(data.error || 'Claudio 后端出错了。')
      return
    }
    if (eventName === 'done') {
      setStatus(data.fallback ? 'Claude Code 暂不可用，已用本地 DJ 兜底' : 'Connected to Claudio server')
      if (data.state?.config) setServerConfig(data.state.config)
      setIsSending(false)
      setPhase(prev => (prev === 'thinking' ? 'idle' : prev))
    }
  }

  function handleNeteaseLibraryTracks({ tracks, label }) {
    if (!Array.isArray(tracks) || tracks.length === 0) {
      setError('网易云没有返回可播放歌曲。')
      return
    }

    voiceQueueRef.current = []
    isVoicePlayingRef.current = false
    transitionAbortRef.current?.abort()
    preloadedTransitionRef.current = null
    pendingTrackRef.current = null

    setQueue(tracks)
    setMessages(prev => [
      ...prev,
      makeMessage('system', `网易云已接入：${label || '网易云歌曲'} · ${tracks.length} tracks`)
    ])
    startMusic(tracks[0])
  }

  function handleXiaoSettingsChange(partial) {
    const next = { ...xiaoSettings, ...partial }
    setXiaoSettings(next)
    saveXiaoMusicSettings(next)
  }

  function handleTtsSettingsChange(partial) {
    const next = { ...ttsSettings, ...partial }
    setTtsSettings(next)
    saveTtsSettings(next)
  }

  function handleTestTtsVoice() {
    testTtsVoice()
  }

  function handleDetectXiaoDevices() {
    setXiaoBusy(true)
    setXiaoStatus({ type: 'idle', message: '正在检测设备...' })
    setTimeout(() => {
      setXiaoBusy(false)
      setXiaoStatus({ type: 'idle', message: '检测完成' })
    }, 1000)
  }

  function handleXiaoSpeakerToggle(enabled) {
    handleXiaoSettingsChange({ playbackTarget: enabled ? 'speaker' : 'browser' })
  }

  async function sendMessage(event) {
    event?.preventDefault()
    const text = input.trim()
    if (!text || isSending) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const assistantId = `assistant-${Date.now()}`
    setMessages(prev => [
      ...prev,
      makeMessage('user', text),
      { id: assistantId, role: 'assistant', text: '', at: new Date().toISOString() }
    ])
    setInput('')
    setError('')
    setStatus('Claudio 正在听你说')
    setPhase('thinking')
    setIsSending(true)

    try {
      await streamChatDjMessage(text, {
        signal: controller.signal,
        ttsSettings: getTtsSettings(),
        onEvent: payload => handleServerEvent(assistantId, payload)
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Claudio 聊天失败。')
        setStatus('后端连接失败')
        setMessages(prev => prev.map(message => (
          message.id === assistantId
            ? { ...message, text: '我这边刚刚断了一下。请确认后端 npm run server 还在运行。' }
            : message
        )))
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <GlassSettingsProvider>
      <div className="relative h-screen w-full overflow-hidden font-sans">
        <AlbumWallBackground tracks={queue} currentTrack={currentTrack} />
        <GlassSettingsPanel
          xiaoSettings={xiaoSettings}
          xiaoDevices={xiaoDevices}
          xiaoStatus={xiaoStatus}
          xiaoDebug={xiaoDebug}
          xiaoBusy={xiaoBusy}
          currentTrack={currentTrack}
          onXiaoSettingsChange={handleXiaoSettingsChange}
          onDetectXiaoDevices={handleDetectXiaoDevices}
          onRefreshXiaoStatus={() => {}}
          onPlayCurrentOnXiao={() => {}}
          onStopXiao={() => {}}
          onPreviousXiao={() => {}}
          onNextXiao={() => {}}
          onSetXiaoVolume={() => {}}
          onXiaoSpeakerToggle={handleXiaoSpeakerToggle}
          ttsSettings={ttsSettings}
          onTtsSettingsChange={handleTtsSettingsChange}
          onTestTtsVoice={handleTestTtsVoice}
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
                      {getStatusText()} · {status}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: '#30323a' }}>
                  {currentTime}
                </span>
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
                      {nowSubtitle}
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
                <SoundWaves isPlaying={isPlaying} isPlanning={isThinking} isSpeaking={isVoicePlaying} />
              </GlassPanel>
            </header>

            <main
              ref={chatRef}
              className="flex-1 space-y-3 overflow-y-auto px-5 pb-4 pt-2 sm:px-6"
            >

              {messages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isActive={isVoicePlaying && activeVoice?.text && message.role === 'assistant' && message.text?.includes(activeVoice.text)}
                />
              ))}

              {!currentTrack && phase === 'idle' && !isNeteaseLibraryOpen && (
                <NeteaseLoginPanel />
              )}

              {isSending && (
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

              {isVoicePlaying && activeVoice && (
                <div className="flex justify-start">
                  <GlassPanel
                    preset="bubble"
                    className="rounded-2xl rounded-tl-md px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.48)', border: '1px solid rgba(255,255,255,0.38)' }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[11px] font-semibold" style={{ color: '#30323a' }}>Claudio</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(255,255,255,0.46)', color: '#6c6f78' }}>
                        Speaking
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#7C5CFF' }} />
                    </div>
                    <span style={{ color: '#171820' }}>{activeVoice.text}</span>
                  </GlassPanel>
                </div>
              )}

              {error && (
                <div className="flex justify-center">
                  <span
                    className="max-w-[88%] rounded-full px-3 py-1 text-[11px]"
                    style={{ background: 'rgba(255,247,237,0.72)', color: '#92400E', border: '1px solid rgba(251,146,60,0.16)' }}
                  >
                    {error}
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
              {queue.length > 0 && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setIsQueueExpanded(prev => !prev)}
                    className="mb-2 flex w-full items-center justify-between rounded-2xl px-3.5 py-2 text-left text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.34)', color: '#30323a', border: '1px solid rgba(255,255,255,0.22)' }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#7C5CFF' }} />
                      Queue · {queue.length} tracks
                    </span>
                    <span className="text-[10px]" style={{ color: '#6c6f78' }}>
                      {isQueueExpanded ? '收起 ▾' : '展开 ▸'}
                    </span>
                  </button>
                  {isQueueExpanded && (
                    <div className="max-h-28 space-y-1 overflow-y-auto rounded-2xl p-1.5" style={{ background: 'rgba(255,255,255,0.24)', border: '1px solid rgba(255,255,255,0.20)' }}>
                      {queue.slice(0, 8).map((track, index) => {
                        const active = currentTrack?.id === track.id
                        return (
                          <button
                            key={`${track.id}-${index}`}
                            type="button"
                            onClick={() => startMusic(track)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-all"
                            style={{
                              background: active ? 'rgba(255,255,255,0.50)' : 'transparent',
                            }}
                          >
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                              style={{
                                background: active ? 'rgba(124,92,255,0.78)' : 'rgba(255,255,255,0.34)',
                                color: active ? '#FFFFFF' : '#6c6f78',
                              }}
                            >
                              {active ? 'Now' : index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[11px] font-semibold" style={{ color: '#1f2330' }}>{track.title}</span>
                              <span className="block truncate text-[10px]" style={{ color: '#6c6f78' }}>{track.artist}</span>
                            </span>
                          </button>
                        )
                      })}
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
                        className={`h-1.5 w-1.5 rounded-full ${isPlaying || isVoicePlaying ? 'animate-pulse' : ''}`}
                        style={{ background: currentTrack ? '#4a318e' : '#8d93a1' }}
                      />
                      <span className="text-[10px] font-semibold tracking-[0.16em]" style={{ color: '#4a318e' }}>
                        {isPlaying ? 'ON AIR' : isVoicePlaying ? 'DJ INTRO' : phase === 'paused' ? 'PAUSED' : 'READY'}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold" style={{ color: '#171820' }}>
                      {currentTrack?.title || 'Claudio is waiting'}
                    </p>
                    <p className="truncate text-[11px]" style={{ color: '#5f6470' }}>
                      {nowSubtitle}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={playPreviousTrack} className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ color: '#1f2330', background: 'rgba(255,255,255,0.48)' }} aria-label="Previous track">&#8249;</button>
                    <button onClick={togglePlayback} className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-105" style={{ background: '#4a318e', boxShadow: '0 10px 22px rgba(74,49,142,0.26)' }} aria-label={isPlaying ? 'Pause' : 'Play'}>
                      {isPlaying ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4.5A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h.5A1.5 1.5 0 008 14V6a1.5 1.5 0 00-1.5-1.5H6zm7.5 0A1.5 1.5 0 0012 6v8a1.5 1.5 0 001.5 1.5h.5a1.5 1.5 0 001.5-1.5V6A1.5 1.5 0 0014 4.5h-.5z" /></svg>
                      ) : (
                        <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.34-5.89a1.5 1.5 0 000-2.54L6.3 2.84z" /></svg>
                      )}
                    </button>
                    <button onClick={playNextTrack} className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ color: '#1f2330', background: 'rgba(255,255,255,0.48)' }} aria-label="Next track">&#8250;</button>
                  </div>
                </div>

                <div className="mb-2.5 flex items-center gap-2">
                  <span className="w-8 text-[10px] font-mono" style={{ color: '#5f6470' }}>{formatTime(trackTime)}</span>
                  <div
                    ref={progressRef}
                    className="flex h-8 flex-1 cursor-pointer items-center gap-0.5 overflow-hidden rounded-full px-2"
                    style={{ background: 'rgba(255,255,255,0.36)', userSelect: 'none' }}
                    onPointerDown={(e) => { setIsDragging(true); handleSeek(e.clientX) }}
                    onPointerMove={(e) => { if (isDragging) handleSeek(e.clientX) }}
                    onPointerUp={() => setIsDragging(false)}
                    onPointerLeave={() => setIsDragging(false)}
                  >
                    {Array.from({ length: 44 }).map((_, index) => {
                      const isActive = progress >= (index / 43) * 100
                      const height = 5 + Math.abs(Math.sin(index * 0.54)) * 13
                      return <span key={index} className="flex-1 rounded-full transition-colors" style={{ height: `${height}px`, background: isActive ? '#4a318e' : 'rgba(77,82,94,0.20)', opacity: isActive ? 0.88 : 0.70 }} />
                    })}
                  </div>
                  <span className="w-8 text-right text-[10px] font-mono" style={{ color: '#5f6470' }}>{formatTime(trackDuration)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: '#5f6470' }}>Vol</span>
                  <input
                    aria-label="volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={event => changeVolume(event.target.value)}
                    className="h-1 flex-1 accent-[#4a318e]"
                  />
                  <span className="w-7 text-right text-[10px] font-mono" style={{ color: '#5f6470' }}>{Math.round(volume * 100)}</span>
                </div>
              </GlassPanel>

              <form onSubmit={sendMessage} className="mt-2 flex gap-2">
                <input
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  placeholder="告诉 Claudio 你现在的状态..."
                  className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs shadow-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,255,255,0.26)', color: '#171820' }}
                />
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="rounded-xl px-3 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-45"
                  style={{ background: '#4a318e' }}
                >
                  {isSending ? '听着' : 'Send'}
                </button>
              </form>

              {serverConfig && (
                <div className="mt-1 flex items-center justify-between px-1">
                  <p className="truncate text-[10px]" style={{ color: '#5f6470' }}>
                    TTS: {serverConfig.ttsConfigured ? `${serverConfig.ttsProvider || 'tts'}` : 'browser'} · NetEase: {serverConfig.neteaseBaseUrl || 'local'}
                  </p>
                </div>
              )}
            </footer>
          </GlassPanel>
        </div>

        {isNeteaseLibraryOpen && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsNeteaseLibraryOpen(false)}
          >
            <div
              className="h-[min(790px,calc(100vh-24px))] w-[460px] max-w-[calc(100vw-18px)]"
              onClick={e => e.stopPropagation()}
            >
              <NeteaseCenter
                isOpen={isNeteaseLibraryOpen}
                onClose={() => setIsNeteaseLibraryOpen(false)}
                onPlayTracks={handleNeteaseLibraryTracks}
              />
            </div>
          </div>
        )}
      </div>
    </GlassSettingsProvider>
  )
}
