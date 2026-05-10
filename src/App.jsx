import { useState, useEffect, useRef } from 'react'
import NeteaseLoginPanel from './components/NeteaseLoginPanel'
import NeteaseLibraryPanel from './components/NeteaseLibraryPanel'
import GlassPanel from './components/GlassPanel'
import { GlassSettingsProvider, useGlassSettings } from './components/GlassSettings'
import GlassSettingsPanel from './components/GlassSettingsPanel'
import { getSourceLabel } from './services/audioSourceService'
import { createMoodwaveSession } from './services/musicOrchestrator'
import { speakDJLine, stopSpeaking } from './services/ttsService'
import { fadeVolume } from './utils/audioUtils'

const INTRO_VOLUME = 0.15
const NORMAL_VOLUME = 0.7
const INTRO_FADE_MS = 800
const NORMAL_FADE_MS = 1500
const FALLBACK_TRACK_DURATION = 150

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

  const audioRef = useRef(null)
  const planRef = useRef(null)
  const introSessionRef = useRef(0)
  const chatFeedRef = useRef(null)

  useEffect(() => {
    planRef.current = currentPlan
  }, [currentPlan])

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

  const buildLocalSongStory = (track) => {
    const title = track.title || '这首歌'
    const artist = track.artist || '这位歌手'
    const album = track.album && track.album !== '未知专辑' ? track.album : ''
    const position = currentTrackIndex + 1
    const sourceLabel = getSourceLabel(track)
    const variants = [
      `现在接进来的是 ${title}${artist ? `，${artist}` : ''}。我把它放在第 ${position} 首，是想让这段声音换一个角度贴近你。`,
      `${title} 这一首会更像一段留白。${artist} 的声音不急着解释什么，只是把房间里的情绪轻轻托起来。`,
      `我们换到 ${title}。${album ? `它来自「${album}」，` : ''}我想让它在这里把刚才那段节奏稍微展开一点。`,
      `这一首是 ${title}。我从 ${sourceLabel} 里把它挑出来，不是为了打断你，而是让电台的呼吸换一口气。`,
      `${artist} 的 ${title} 适合放在这一刻。它不会把注意力抢走，只会在背景里慢慢把状态铺平。`,
    ]
    return variants[textScore(`${title}-${artist}`) % variants.length]
  }

  const buildLibraryOpeningLine = (label, count, firstTrack) => {
    const playlistName = label || '这组歌'
    const firstTitle = firstTrack?.title || '第一首歌'
    const firstArtist = firstTrack?.artist || ''
    const variants = [
      `「${playlistName}」已经排好，先从 ${firstTitle}${firstArtist ? ` · ${firstArtist}` : ''} 开始。音乐会先靠前一点，我的声音只做轻轻的提示。`,
      `我把「${playlistName}」整理成 ${count} 首可以直接播放的声音。第一首交给 ${firstTitle}，先让节奏把空间打开。`,
      `现在切到你的「${playlistName}」。${firstTitle} 先接上来，像电台开机前的一口呼吸，慢一点，不抢你。`,
      `Claudio 已经准备好这组网易云歌曲。我们先听 ${firstTitle}，其余的我会顺着这一首的气质接下去。`,
    ]

    return variants[textScore(`${playlistName}-${firstTitle}-${count}`) % variants.length]
  }

  const getTrackStoryText = (track) => {
    if (!track) return '我会先把声音放低一点。你不用急着进入状态，我们让音乐先把房间铺开。'
    const tagText = Array.isArray(track.tags) ? track.tags.join('、') : ''
    const mode = track.mode || track.phase || ''

    if (track.songIntro) {
      return [track.songIntro, track.personalReason].filter(Boolean).join(' ')
    }
    if (track.sourceType === 'netease' || track.source === 'netease') {
      return buildLocalSongStory(track)
    }
    if (mode.includes('sleep') || tagText.includes('sleep')) {
      return `现在这首是 ${track.title}。它很轻，速度不急，我把它放在这里，是想让你的思绪一点点降下来。`
    }
    if (mode.includes('calm') || tagText.includes('calm')) {
      return `现在这首是 ${track.title}。它的声音比较柔和，不会催你马上好起来，只是先把情绪稳稳接住。`
    }
    if (mode.includes('energy') || tagText.includes('energy')) {
      return `现在这首是 ${track.title}。它会稍微把节奏往前推一点，提神，但不会一下子把你拽得太猛。`
    }
    if (mode.includes('nature') || tagText.includes('nature')) {
      return `现在这首是 ${track.title}。它留了很多空间，你可以先不用想太多，让呼吸跟着环境声慢下来。`
    }
    return `现在这首是 ${track.title}。它的节奏比较稳定，我把它放在开头，是想先把注意力慢慢拉回来。`
  }

  const addTrackChatMessages = (track) => {
    if (!track) return null
    addChatMessage({
      type: 'system',
      text: `Now playing · ${track.title}`
    })
    return addChatMessage({
      type: 'track_story',
      text: getTrackStoryText(track)
    })
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
    setIsSpeaking(true)
    setActiveMessageId(messageId)
    setPhase('intro')

    try {
      const result = await speakDJLine(text, { rate: 0.92 })
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

  const speakTrackStory = (track, sessionId, messageId = null) => {
    if (!track) return

    if (!isDjVoiceEnabled) {
      finishDJIntro(sessionId)
      return
    }

    speakOpeningLine(getTrackStoryText(track), sessionId, messageId)
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

    const replayText = currentTrack ? getTrackStoryText(currentTrack) : currentPlan.openingLine
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

      const plan = await createMoodwaveSession(cleanedInput)
      if (introSessionRef.current !== sessionId) return

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
      addTrackChatMessages(firstTrack)

      try {
        await playTrack(0, {
          plan,
          startVolume: 0,
          targetVolume: INTRO_VOLUME,
          fadeDuration: INTRO_FADE_MS,
          phaseAfterStart: 'intro'
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
          const storyId = addTrackChatMessages(nextTrack)
          playTrack(nextIndex, {
            plan: latestPlan,
            startVolume: 0,
            targetVolume: INTRO_VOLUME,
            fadeDuration: INTRO_FADE_MS,
            phaseAfterStart: 'intro'
          }).then(() => {
            if (introSessionRef.current === sessionId) {
              speakTrackStory(nextTrack, sessionId, storyId)
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
      introSessionRef.current += 1
      stopSpeaking()
      setIsSpeaking(false)
      setActiveMessageId(null)
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setPhase('paused')
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
    const storyId = addTrackChatMessages(nextTrack)
    playTrack(nextIndex, {
      plan,
      startVolume: 0,
      targetVolume: INTRO_VOLUME,
      fadeDuration: INTRO_FADE_MS,
      phaseAfterStart: 'intro'
    }).then(() => {
      if (introSessionRef.current === sessionId) {
        speakTrackStory(nextTrack, sessionId, storyId)
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

    const plan = {
      sessionId: `session-netease-library-${Date.now()}`,
      id: `session-netease-library-${Date.now()}`,
      source: 'netease-library',
      sourceType: 'netease',
      djSource: 'local',
      searchPlanSource: 'netease-account',
      mode: 'personal',
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
    addTrackChatMessages(playableTracks[0])

    try {
      await playTrack(0, {
        plan,
        startVolume: 0,
        targetVolume: INTRO_VOLUME,
        fadeDuration: INTRO_FADE_MS,
        phaseAfterStart: 'intro'
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
        <GlassSettingsPanel />

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
