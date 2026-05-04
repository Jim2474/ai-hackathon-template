import { useState, useEffect, useRef } from 'react'
import NeteaseLoginPanel from './components/NeteaseLoginPanel'
import ParticleCanvas from './components/ParticleCanvas'
import { getSourceLabel } from './services/audioSourceService'
import { createLocalFallbackSession, createMoodwaveSession } from './services/musicOrchestrator'
import { speakDJLine, stopSpeaking } from './services/ttsService'
import { fadeVolume } from './utils/audioUtils'

const quickInputs = [
  { text: '学习', input: '我要学习 2 小时' },
  { text: '睡眠', input: '我要睡前放松 30 分钟' },
  { text: '运动', input: '我要运动 1 小时' },
  { text: '安抚', input: '我现在有点焦虑' }
]

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
  const bars = 28
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isPlaying && !isPlanning && !isSpeaking) return
    const interval = setInterval(() => setTick(t => t + 1), isSpeaking ? 70 : 120)
    return () => clearInterval(interval)
  }, [isPlaying, isPlanning, isSpeaking])

  return (
    <div className="flex h-7 items-end justify-center gap-0.5">
      {Array.from({ length: bars }).map((_, i) => {
        let height = 4
        if (isPlaying || isSpeaking) {
          height = 9 + Math.sin(i * 0.6 + tick * 0.3) * 7 + Math.sin(i * 0.2) * 5
        } else if (isPlanning) {
          height = 5 + Math.sin(Date.now() / 300 + i) * 4
        }
        return (
          <div
            key={i}
            className="w-0.5 rounded-full"
            style={{
              height: `${Math.max(3, height)}px`,
              background: isSpeaking ? '#7C5CFF' : '#111217',
              opacity: isPlaying || isSpeaking ? 0.72 : 0.24
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

  const getSourceBadges = () => {
    if (!currentPlan) return ['MiniMax', 'NetEase', 'Local fallback']

    const badges = []
    if (currentPlan.djSource === 'minimax') badges.push('MiniMax DJ')
    if (currentPlan.searchPlanSource === 'minimax') badges.push('MiniMax Search')
    if (currentPlan.djSource === 'mock') badges.push('Mock DJ')
    if (currentPlan.source?.includes('netease')) badges.push('NetEase')
    if (currentPlan.source?.includes('local')) badges.push('Local fallback')
    if (!isDjVoiceEnabled) badges.push('Voice off')
    if (badges.length === 0) badges.push('Demo Audio')
    return badges
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
        <span key={i} className="rounded-md bg-[#A7F3D0] px-1.5 py-0.5 text-[#065F46]">
          {part}
        </span>
      ) : part
    )
  }

  const getTrackStoryText = (track) => {
    if (!track) return '我会先把声音放低一点。你不用急着进入状态，我们让音乐先把房间铺开。'
    const tagText = Array.isArray(track.tags) ? track.tags.join('、') : ''
    const mode = track.mode || track.phase || ''

    if (track.songIntro) {
      return [track.songIntro, track.personalReason].filter(Boolean).join(' ')
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
    if (!track) return
    addChatMessage({
      type: 'system',
      text: `Now playing · ${track.title}`
    })
    addChatMessage({
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
        text: 'Moodwave 正在理解你的状态...'
      })
      addChatMessage({
        type: 'system',
        text: '正在网易云中寻找适合的声音...'
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
          const fallbackPlan = createLocalFallbackSession(cleanedInput, 'NetEase audio playback failed, switching to local library.')
          setCurrentPlan(fallbackPlan)
          planRef.current = fallbackPlan
          setTrackTime(0)
          setTrackDuration(FALLBACK_TRACK_DURATION)
          setCurrentTrackIndex(0)
          setFailedTracks(new Set())
          ;(fallbackPlan.chatMessages || []).forEach(message => addChatMessage(message))

          const fallbackTrack = fallbackPlan.tracks?.[0]
          const fallbackOpeningId = addChatMessage({
            type: 'dj',
            text: fallbackPlan.openingLine
          })
          addTrackChatMessages(fallbackTrack)

          await playTrack(0, {
            plan: fallbackPlan,
            startVolume: 0,
            targetVolume: INTRO_VOLUME,
            fadeDuration: INTRO_FADE_MS,
            phaseAfterStart: 'intro'
          })

          if (introSessionRef.current === sessionId) {
            speakOpeningLine(fallbackPlan.openingLine, sessionId, fallbackOpeningId)
          }
          return
        }

        setAudioError('背景音乐暂时没有自动播放成功，请点底部播放按钮继续。')
        setPhase('intro')
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
          playTrack(nextIndex, {
            plan: latestPlan,
            startVolume: musicVolume,
            targetVolume: musicVolume,
            phaseAfterStart: 'playing'
          })
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
    introSessionRef.current += 1
    stopSpeaking()
    setIsSpeaking(false)
    setActiveMessageId(null)
    setSpeechError('')
    addTrackChatMessages(plan.tracks[nextIndex])
    playTrack(nextIndex, {
      plan,
      startVolume: 0,
      targetVolume: musicVolume,
      fadeDuration: 450,
      phaseAfterStart: 'playing'
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
          <div
            className="max-w-[82%] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed"
            style={{ background: '#EDE9FE', color: '#312E81' }}
          >
            {message.text}
          </div>
        </div>
      )
    }

    if (message.type === 'system') {
      return (
        <div key={message.id} className="flex justify-center">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ background: 'rgba(17,24,39,0.06)', color: '#7A7F89' }}
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
        <div
          className="max-w-[88%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed transition-all"
          style={{
            background: isTrackStory ? '#F3F0E8' : '#FFFFFF',
            color: '#1F2937',
            border: isActive ? '1px solid rgba(124,92,255,0.36)' : '1px solid rgba(17,24,39,0.05)',
            boxShadow: isActive ? '0 10px 24px rgba(124,92,255,0.14)' : '0 4px 14px rgba(17,24,39,0.04)'
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>
              Claudio
            </span>
            {isTrackStory && (
              <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: '#FFFFFF', color: '#8A8D95' }}>
                Track note
              </span>
            )}
            {isActive && (
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#7C5CFF' }} />
            )}
          </div>
          {highlightKeywords(message.text, currentPlan?.highlights || [])}
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans" style={{ background: '#05070F' }}>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 12% 12%, rgba(34, 211, 238, 0.18), transparent 58%),
              radial-gradient(ellipse at 88% 88%, rgba(124, 92, 255, 0.15), transparent 58%),
              radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.35), transparent 62%)
            `
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '26px 26px'
          }}
        />
      </div>

      <ParticleCanvas />

      <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
        <div
          className="flex h-[700px] w-[430px] max-w-[calc(100vw-24px)] flex-col overflow-hidden"
          style={{
            borderRadius: '36px',
            background: 'linear-gradient(180deg, #FAF8F3 0%, #F7F5EF 100%)',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 30px 90px rgba(0,0,0,0.45), 0 0 80px rgba(124,92,255,0.12)'
          }}
        >
          <header className="shrink-0 px-6 pb-3 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #111217, #7C5CFF)' }}
                >
                  C
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-[0.06em]" style={{ color: '#1F2937' }}>
                    Claudio
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: getStatusDotColor() }} />
                    <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>
                      {getStatusText()}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold" style={{ color: '#1F2937' }}>
                {currentTime}
              </span>
            </div>

            <div
              className="rounded-2xl px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.68)', border: '1px solid rgba(17,24,39,0.05)' }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {getSourceBadges().map(item => (
                    <span
                      key={item}
                      className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                      style={{ background: '#FFFFFF', color: '#737782', border: '1px solid rgba(17,24,39,0.05)' }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <span className="shrink-0 text-[10px] font-medium" style={{ color: '#9CA3AF' }}>
                  {phase === 'intro' ? 'DJ live' : phase === 'playing' ? 'On air' : phase === 'planning' ? '...' : 'Radio ready'}
                </span>
              </div>
              <SoundWaves isPlaying={phase === 'playing'} isPlanning={phase === 'planning'} isSpeaking={phase === 'intro'} />
            </div>
          </header>

          <main
            ref={chatFeedRef}
            className="flex-1 space-y-3 overflow-y-auto px-6 pb-3 pt-2"
            style={{ backgroundImage: 'radial-gradient(rgba(17,24,39,0.035) 0.6px, transparent 0.6px)', backgroundSize: '13px 13px' }}
          >
            {chatMessages.map(renderChatMessage)}

            {!currentPlan && phase === 'idle' && (
              <NeteaseLoginPanel />
            )}

            {phase === 'planning' && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-tl-md px-4 py-3"
                  style={{ background: '#FFFFFF', color: '#6B7280', border: '1px solid rgba(17,24,39,0.05)' }}
                >
                  <TypingDots />
                </div>
              </div>
            )}

            {(audioError || speechError) && (
              <div className="flex justify-center">
                <span
                  className="max-w-[88%] rounded-full px-3 py-1 text-[11px]"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#92400E' }}
                >
                  {audioError || speechError}
                </span>
              </div>
            )}
          </main>

          <footer
            className="shrink-0 px-5 pb-4 pt-3"
            style={{
              background: 'rgba(250,248,243,0.96)',
              borderTop: '1px solid rgba(17,24,39,0.06)',
              boxShadow: '0 -18px 35px rgba(17,24,39,0.05)'
            }}
          >
            {currentPlan?.tracks?.length > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => setIsPlaylistOpen(prev => !prev)}
                  className="mb-2 flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs font-medium"
                  style={{ background: '#FFFFFF', color: '#4B5563', border: '1px solid rgba(17,24,39,0.05)', boxShadow: '0 6px 18px rgba(17,24,39,0.04)' }}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#7C5CFF' }} />
                    <span>Up next · {currentPlan.tracks.length} tracks</span>
                  </span>
                  <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                    {isPlaylistOpen ? 'Hide' : 'Show'}
                  </span>
                </button>

                {isPlaylistOpen && (
                  <div
                    className="mb-2 max-h-36 space-y-1.5 overflow-y-auto rounded-2xl p-1.5"
                    style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(17,24,39,0.05)' }}
                  >
                    {currentPlan.tracks.map((track, index) => (
                      <button
                        key={track.id || index}
                        onClick={() => playTrackByIndex(index)}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all hover:bg-white"
                        style={{
                          background: index === currentTrackIndex ? '#FFFFFF' : 'transparent',
                          boxShadow: index === currentTrackIndex ? '0 6px 16px rgba(124,92,255,0.09)' : 'none'
                        }}
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                          style={{
                            background: index === currentTrackIndex ? '#111217' : 'rgba(17,24,39,0.05)',
                            color: index === currentTrackIndex ? '#FFFFFF' : '#8A8D95'
                          }}
                        >
                          {index === currentTrackIndex ? 'Now' : index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold" style={{ color: '#111217' }}>
                            {track.title}
                          </p>
                          <p className="truncate text-[11px]" style={{ color: '#8A8D95' }}>
                            {track.artist} · {track.phase || track.mode}
                          </p>
                        </div>
                        <span
                          className="rounded-full px-2 py-1 text-[10px] font-medium"
                          style={{
                            background: index === currentTrackIndex ? 'rgba(124,92,255,0.1)' : 'rgba(17,24,39,0.05)',
                            color: index === currentTrackIndex ? '#7C5CFF' : '#8A8D95'
                          }}
                        >
                          {getSourceLabel(track)}
                        </span>
                        <span
                          className="h-6 w-1 rounded-full"
                          style={{ background: index === currentTrackIndex ? '#7C5CFF' : 'rgba(17,24,39,0.06)' }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <section
              className="rounded-[22px] px-3.5 py-3"
              style={{ background: '#FFFFFF', border: '1px solid rgba(17,24,39,0.05)', boxShadow: '0 10px 26px rgba(17,24,39,0.07)' }}
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: currentTrack ? getStatusDotColor() : '#D1D5DB' }}
                    />
                    <p className="truncate text-sm font-semibold" style={{ color: '#111217' }}>
                      {currentTrack?.title || 'No wave yet'}
                    </p>
                  </div>
                  <p className="truncate pl-3.5 text-[11px]" style={{ color: '#8A8D95' }}>
                    {currentTrack ? `${currentTrack.artist} · ${currentTrack.phase || currentTrack.mode || 'Moodwave'} · ${getSourceLabel(currentTrack)}` : 'Tell Moodwave how you feel'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={playPreviousTrack}
                    disabled={!currentPlan}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-30"
                    style={{ color: '#111217', background: 'rgba(17,24,39,0.04)' }}
                    aria-label="Previous track"
                  >
                    ‹
                  </button>
                  <button
                    onClick={handlePlayPause}
                    disabled={!currentPlan}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-30"
                    style={{ background: '#111217' }}
                    aria-label={isPlayingState ? 'Pause' : 'Play'}
                  >
                    {isPlayingState ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 4.5A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h.5A1.5 1.5 0 008 14V6a1.5 1.5 0 00-1.5-1.5H6zm7.5 0A1.5 1.5 0 0012 6v8a1.5 1.5 0 001.5 1.5h.5a1.5 1.5 0 001.5-1.5V6A1.5 1.5 0 0014 4.5h-.5z" />
                      </svg>
                    ) : (
                      <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.34-5.89a1.5 1.5 0 000-2.54L6.3 2.84z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={playNextTrack}
                    disabled={!currentPlan}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-30"
                    style={{ color: '#111217', background: 'rgba(17,24,39,0.04)' }}
                    aria-label="Next track"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="mb-2.5 flex items-center gap-2">
                <span className="w-8 text-[10px] font-mono" style={{ color: '#8A8D95' }}>
                  {formatPlaybackTime(trackTime)}
                </span>
                <div className="flex h-8 flex-1 items-center gap-0.5 overflow-hidden rounded-full px-2" style={{ background: '#F2F3F5' }}>
                  {Array.from({ length: 44 }).map((_, index) => {
                    const isActive = progressPercent >= (index / 43) * 100
                    const height = 5 + Math.abs(Math.sin(index * 0.54)) * 13
                    return (
                      <span
                        key={index}
                        className="flex-1 rounded-full transition-colors"
                        style={{
                          height: `${height}px`,
                          background: isActive ? '#111217' : '#D6D8DD',
                          opacity: isActive ? 0.95 : 0.82
                        }}
                      />
                    )
                  })}
                </div>
                <span className="w-8 text-right text-[10px] font-mono" style={{ color: '#8A8D95' }}>
                  {formatPlaybackTime(trackDuration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: '#8A8D95' }}>Vol</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={musicVolume}
                  onChange={handleVolumeChange}
                  className="h-1 flex-1 accent-[#111217]"
                />
                <span className="w-7 text-right text-[10px] font-mono" style={{ color: '#8A8D95' }}>
                  {Math.round(musicVolume * 100)}
                </span>
                {currentPlan && (
                  <button
                    onClick={replayDJ}
                    className="rounded-full px-2 py-1 text-[10px] font-medium"
                    style={{ background: 'rgba(124,92,255,0.08)', color: '#7C5CFF' }}
                  >
                    Replay
                  </button>
                )}
                {phase === 'intro' && isSpeaking && (
                  <button
                    onClick={handleStopSpeaking}
                    className="rounded-full px-2 py-1 text-[10px] font-medium"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                  >
                    Stop
                  </button>
                )}
              </div>
            </section>

            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="告诉 Moodwave 你现在的状态，或直接调整音乐…"
                className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-xs shadow-sm focus:outline-none"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1F2937' }}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate(userInput)}
              />
              <button
                onClick={() => handleGenerate(userInput)}
                disabled={!userInput.trim() || phase === 'planning'}
                className="rounded-xl px-3 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-45"
                style={{ background: 'linear-gradient(135deg, #111217, #7C5CFF)' }}
              >
                Send
              </button>
            </div>

            {!currentPlan && (
              <div className="mt-2 flex justify-center gap-1.5">
                {quickInputs.map(item => (
                  <button
                    key={item.text}
                    onClick={() => handleGenerate(item.input)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#6B7280' }}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            )}

            {currentPlan && (
              <div className="mt-2 flex items-center justify-between px-1">
                <p className="truncate text-[10px]" style={{ color: '#9CA3AF' }}>
                  {currentPlan.reason}
                </p>
                <button onClick={handleReset} className="ml-3 shrink-0 text-[10px] font-medium" style={{ color: '#6B7280' }}>
                  Reset
                </button>
              </div>
            )}
          </footer>
        </div>
      </div>
    </div>
  )
}
