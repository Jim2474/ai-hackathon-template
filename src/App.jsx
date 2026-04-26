import { useState, useEffect } from 'react'
import ParticleCanvas from './components/ParticleCanvas'
import { generateSmartDJPlan } from './services/djPlanner'
import { localAudioLibrary } from './data/localAudioLibrary'
import { speakDJLine, stopSpeaking, replaySpeaking, getFriendlyProviderName } from './services/ttsService'

const thinkingMessages = [
  '正在理解你的状态...',
  '正在匹配声音场景...',
  '正在生成播放时间线...'
]

const quickInputs = [
  { text: '学习', input: '我要学习 2 小时' },
  { text: '睡眠', input: '我要睡前放松 30 分钟' },
  { text: '运动', input: '我要运动 1 小时' },
  { text: '安抚', input: '我现在有点焦虑' }
]

function SoundWaves({ isPlaying, isPlanning, isSpeaking }) {
  const bars = 40
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isPlaying && !isPlanning && !isSpeaking) return
    let intervalSpeed = 180
    if (isPlaying) intervalSpeed = 70
    if (isSpeaking) intervalSpeed = 60
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, intervalSpeed)
    return () => clearInterval(interval)
  }, [isPlaying, isPlanning, isSpeaking])

  return (
    <div className="flex items-end justify-center gap-0.5 h-12 pb-2">
      {Array.from({ length: bars }).map((_, i) => {
        let height = 6
        if (isPlaying) {
          const base = 12 + Math.sin(i * 0.4) * 8
          height = base + Math.sin(i * 0.25 + tick * 0.18) * 14 + Math.random() * 6
        } else if (isSpeaking) {
          const base = 14 + Math.sin(i * 0.3) * 9
          height = base + Math.sin(i * 0.2 + tick * 0.2) * 16 + Math.random() * 8
        } else if (isPlanning) {
          const base = 10 + Math.sin(i * 0.5) * 6
          height = base + Math.sin(Date.now() / 350 + i * 0.3) * 8
        }
        return (
          <div
            key={i}
            className="w-0.6 rounded-full"
            style={{
              height: `${Math.max(4, height)}px`,
              background: i % 2 === 0 ? '#7C5CFF' : '#22D3EE',
              opacity: isSpeaking ? 1 : 0.8
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

function WavePreview() {
  return (
    <div className="w-full h-20 flex items-center justify-center opacity-40">
      <svg width="240" height="50" viewBox="0 0 240 50" className="overflow-visible">
        <path
          d="M0 25 Q60 8, 120 25 T240 25"
          fill="none"
          stroke="#7C5CFF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M0 30 Q60 13, 120 30 T240 30"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        <path
          d="M0 35 Q60 18, 120 35 T240 35"
          fill="none"
          stroke="#7C5CFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.45"
        />
      </svg>
    </div>
  )
}

export default function App() {
  const [phase, setPhase] = useState('idle')
  const [userInput, setUserInput] = useState('')
  const [currentPlan, setCurrentPlan] = useState(null)
  const [currentTime, setCurrentTime] = useState(getCurrentTime())
  const [thinkingIndex, setThinkingIndex] = useState(0)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [audioElement, setAudioElement] = useState(null)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [failedTracks, setFailedTracks] = useState(new Set())

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(getCurrentTime()), 1000)
    return () => clearInterval(timeInterval)
  }, [])

  useEffect(() => {
    let interval
    if (phase === 'planning') {
      interval = setInterval(() => {
        setThinkingIndex(prev => (prev + 1) % thinkingMessages.length)
      }, 800)
    }
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    let interval
    if (phase === 'playing') {
      interval = setInterval(() => {
        setPlaybackTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [phase])

  const formatPlaybackTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusText = () => {
    switch (phase) {
      case 'idle': return 'Ready'
      case 'planning': return 'Planning'
      case 'speaking': return 'Speaking'
      case 'plan': return 'Ready to Play'
      case 'playing': return 'Playing'
      case 'paused': return 'Paused'
      default: return 'Ready'
    }
  }

  const getStatusDotColor = () => {
    switch (phase) {
      case 'idle': return '#10B981'
      case 'planning': return '#F59E0B'
      case 'speaking': return '#7C5CFF'
      case 'plan': return '#10B981'
      case 'playing': return '#10B981'
      case 'paused': return '#9CA3AF'
      default: return '#10B981'
    }
  }

  const speakOpeningLine = async (text) => {
    setIsSpeaking(true)
    setPhase('speaking')
    
    try {
      await speakDJLine(text, { rate: 0.9 })
      setIsSpeaking(false)
      setPhase('plan')
    } catch (error) {
      console.error('TTS failed:', error)
      setIsSpeaking(false)
      setPhase('plan')
    }
  }

  const replayDJ = () => {
    if (!currentPlan) return
    setPhase('speaking')
    speakOpeningLine(currentPlan.openingLine)
  }

  const handleStopSpeaking = () => {
    stopSpeaking()
    setIsSpeaking(false)
    if (phase === 'speaking') {
      setPhase('plan')
    }
  }

  const handleGenerate = async (input) => {
    setUserInput(input)
    setPhase('planning')
    setThinkingIndex(0)
    setAudioError('')
    
    stopSpeaking()
    if (audioElement) {
      audioElement.pause()
    }

    try {
      const plan = await generateSmartDJPlan(input, localAudioLibrary)
      setCurrentPlan(plan)
      setPlaybackTime(0)
      
      setPhase('speaking')
      speakOpeningLine(plan.openingLine)
    } catch (error) {
      console.error('Generate plan failed:', error)
    }
  }

  const playTrack = (index) => {
    if (!currentPlan || !currentPlan.tracks || index >= currentPlan.tracks.length) {
      setPhase('plan')
      return
    }
    
    const track = currentPlan.tracks[index]
    if (!track) return
    
    if (audioElement) {
      audioElement.pause()
      audioElement.onloadeddata = null
      audioElement.onerror = null
      audioElement.onended = null
    }
    
    const audio = new Audio(track.audioUrl)
    
    audio.onloadeddata = () => {
      setAudioError('')
      audio.play().catch(() => {})
    }
    
    audio.onerror = () => {
      console.error(`Failed to play track ${track.id}`)
      if (!currentPlan) {
        return
      }
      const newFailedTracks = new Set(failedTracks)
      newFailedTracks.add(track.id)
      setFailedTracks(newFailedTracks)
      
      const nextIndex = index + 1
      const totalTracks = currentPlan.tracks.length
      
      if (nextIndex < totalTracks) {
        const allFailed = newFailedTracks.size >= totalTracks
        if (allFailed) {
          setAudioError('No playable demo audio found. Please check public/audio.')
          setPhase('plan')
        } else {
          setCurrentTrackIndex(nextIndex)
          playTrack(nextIndex)
        }
      } else {
        const allFailed = newFailedTracks.size >= totalTracks
        if (allFailed) {
          setAudioError('No playable demo audio found. Please check public/audio.')
        }
        setPhase('plan')
      }
    }
    
    audio.onended = () => {
      if (!currentPlan) {
        return
      }
      const nextIndex = index + 1
      if (nextIndex < currentPlan.tracks.length) {
        setCurrentTrackIndex(nextIndex)
        playTrack(nextIndex)
      } else {
        setPhase('plan')
        setPlaybackTime(0)
      }
    }
    
    setAudioElement(audio)
    setCurrentTrackIndex(index)
    setPhase('playing')
  }

  const handlePlayPause = () => {
    if (phase === 'speaking') return
    
    if (phase === 'plan' || phase === 'paused') {
      if (phase === 'plan') {
        playTrack(0)
      } else if (audioElement) {
        audioElement.play()
        setPhase('playing')
      }
    } else if (phase === 'playing') {
      if (audioElement) {
        audioElement.pause()
      }
      setPhase('paused')
    }
  }

  const handleReset = () => {
    stopSpeaking()
    if (audioElement) {
      audioElement.pause()
      audioElement.onloadeddata = null
      audioElement.onerror = null
      audioElement.onended = null
      audioElement.src = ''
    }
    setAudioElement(null)
    setPhase('idle')
    setUserInput('')
    setCurrentPlan(null)
    setPlaybackTime(0)
    setIsSpeaking(false)
    setAudioError('')
    setCurrentTrackIndex(0)
    setFailedTracks(new Set())
  }

  const highlightKeywords = (text, highlights) => {
    const pattern = new RegExp(`(${highlights.join('|')})`, 'g')
    return text.split(pattern).map((part, i) => 
      highlights.includes(part) ? (
        <span key={i} className="bg-[#A7F3D0] text-[#065F46] px-1.5 py-0.5 rounded-md">
          {part}
        </span>
      ) : part
    )
  }

  return (
    <div 
      className="w-full h-screen relative overflow-hidden font-sans"
      style={{
        background: '#05070F',
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 12% 12%, rgba(34, 211, 238, 0.18), transparent 58%),
              radial-gradient(ellipse at 88% 88%, rgba(124, 92, 255, 0.15), transparent 58%),
              radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.35), transparent 62%)
            `
          }}
        />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '26px 26px'
          }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.018]" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M0 38 Q25 28, 50 38 T100 38"
            fill="none"
            stroke="#7C5CFF"
            strokeWidth="0.35"
          />
          <path
            d="M0 62 Q25 52, 50 62 T100 62"
            fill="none"
            stroke="#22D3EE"
            strokeWidth="0.25"
          />
        </svg>
      </div>
      
      <ParticleCanvas />
      
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
        <div 
          className="w-[380px] h-[680px] overflow-hidden flex flex-col"
          style={{
            borderRadius: '36px',
            background: 'linear-gradient(180deg, #FAF8F3 0%, #F7F5EF 100%)',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 30px 90px rgba(0,0,0,0.45), 0 0 80px rgba(124,92,255,0.12)'
          }}
        >
          <div className="px-6 pt-5 pb-3 flex flex-col relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #7C5CFF, #22D3EE)',
                    boxShadow: '0 4px 12px rgba(124,92,255,0.25)'
                  }}
                >
                  M
                </div>
                <span className="text-xs font-semibold tracking-widest" style={{ color: '#1F2937' }}>
                  MOODWAVE
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>HOME</span>
                <span 
                  className="text-xs font-semibold"
                  style={{ color: '#7C5CFF' }}
                >
                  PLAN
                </span>
                <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>MUSIC</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: getStatusDotColor() }}
                />
                <span className="text-xs font-semibold" style={{ color: '#1F2937' }}>
                  {getStatusText()}
                </span>
              </div>
              
              <span className="text-xs font-mono font-medium" style={{ color: '#6B7280' }}>
                {currentTime}
              </span>
            </div>
            
            <div className="mt-2">
              {phase === 'planning' ? (
                <div className="text-center py-3">
                  <p className="text-sm animate-pulse" style={{ color: '#6B7280' }}>
                    {thinkingMessages[thinkingIndex]}
                  </p>
                </div>
              ) : (
                <SoundWaves 
                  isPlaying={phase === 'playing'} 
                  isPlanning={false} 
                  isSpeaking={phase === 'speaking'}
                />
              )}
            </div>
            
            <div 
              className="h-px mt-1"
              style={{
                background: 'rgba(17,24,39,0.06)'
              }}
            />
          </div>
          
          <div className="flex-1 px-6 pb-6 relative z-20 flex flex-col overflow-y-auto">
            {phase === 'idle' && (
              <div className="flex flex-col h-full">
                <div className="mb-4 pt-1">
                  <h1 
                    className="text-2xl font-semibold mb-1"
                    style={{
                      background: 'linear-gradient(90deg, #111827 0%, #7C5CFF 70%, #22D3EE 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    Moodwave
                  </h1>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    AI 情境音乐电台
                  </p>
                </div>
                
                <div className="flex-1 flex flex-col justify-center gap-4">
                  <WavePreview />
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="告诉 Moodwave 你现在的状态..."
                      className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none shadow-sm"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        color: '#1F2937'
                      }}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && userInput && handleGenerate(userInput)}
                    />
                    <button
                      onClick={() => userInput && handleGenerate(userInput)}
                      disabled={!userInput}
                      className="text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:translate-y-[-1px] hover:scale-105 disabled:translate-y-0 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={userInput ? {
                        background: 'linear-gradient(135deg, #7C5CFF, #22D3EE)',
                        boxShadow: '0 5px 18px rgba(124,92,255,0.35)'
                      } : {
                        background: '#D1D5DB'
                      }}
                    >
                      Generate
                    </button>
                  </div>
                  
                  <div className="flex gap-2 justify-center">
                    {quickInputs.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleGenerate(item.input)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:bg-[rgba(124,92,255,0.1)] hover:border-[rgba(124,92,255,0.25)]"
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          color: '#6B7280'
                        }}
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mt-auto pt-2">
                  <div 
                    className="rounded-2xl p-4"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <p className="text-xs leading-relaxed" style={{ color: '#71717A' }}>
                      输入你现在的状态，Moodwave 会为你生成专属声音场景方案。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(phase === 'plan' || phase === 'speaking' || phase === 'playing' || phase === 'paused') && currentPlan && (
              <div className="flex flex-col h-full pt-1">
                <div className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={handleReset}
                      className="text-xs flex items-center gap-1 transition-colors hover:text-[#374151] font-medium"
                      style={{ color: '#6B7280' }}
                    >
                      ← 返回
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <h2 className="text-xl font-semibold mb-1" style={{ color: '#111827' }}>
                      {currentPlan.title}
                    </h2>
                    <p className="text-sm" style={{ color: '#4B5563' }}>
                      {currentPlan.subtitle}
                    </p>
                  </div>
                  
                  <div 
                    className="h-2.5 rounded-full overflow-hidden"
                    style={{ background: '#E5E7EB' }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(100, (playbackTime / (currentPlan.duration * 60)) * 100)}%`,
                        background: 'linear-gradient(90deg, #7C5CFF, #22D3EE)'
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto pb-3 space-y-3">
                  {/* Opening Line */}
                  <div 
                    className="rounded-2xl p-4"
                    style={{
                      background: phase === 'speaking' ? 'rgba(124,92,255,0.08)' : '#FFFFFF',
                      border: phase === 'speaking' ? '1px solid rgba(124,92,255,0.2)' : '1px solid #E5E7EB',
                      boxShadow: phase === 'speaking' ? '0 0 12px rgba(124,92,255,0.08)' : '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold" style={{ color: '#7C5CFF' }}>MOODWAVE DJ</span>
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>·</span>
                        <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>Opening</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(124,92,255,0.1)', color: '#7C5CFF' }}>
                          {getFriendlyProviderName()}
                        </span>
                      </div>
                      
                      {/* Control Buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={replayDJ}
                          className="px-2 py-1 rounded-full text-xs font-medium transition-all hover:bg-[rgba(124,92,255,0.1)]"
                          style={{ color: '#7C5CFF' }}
                        >
                          Replay DJ
                        </button>
                        {phase === 'speaking' && (
                          <button
                            onClick={handleStopSpeaking}
                            className="px-2 py-1 rounded-full text-xs font-medium transition-all hover:bg-[rgba(239,68,68,0.1)]"
                            style={{ color: '#EF4444' }}
                          >
                            Stop
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: phase === 'speaking' ? '#1F2937' : '#374151' }}>
                      {highlightKeywords(currentPlan.openingLine, currentPlan.highlights)}
                    </p>
                  </div>

                  {/* Reason */}
                  <div 
                    className="rounded-2xl p-4"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Why this mix?</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#4B5563' }}>
                      {currentPlan.reason}
                    </p>
                  </div>

                  {/* Tracks */}
                  <div 
                    className="rounded-2xl p-4"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                          {currentPlan.source === 'minimax' ? 'Generated by MiniMax' : 'Local demo mode'}
                        </span>
                      </div>
                      <span className="text-xs font-medium" style={{ color: '#111827' }}>
                        {currentPlan.source === 'minimax' ? 'Based on your local Apple Music playlist' : 'local Apple Music playlist · Demo audio'}
                      </span>
                    </div>
                    
                    {(phase === 'playing' || phase === 'paused') && currentPlan.tracks[currentTrackIndex] && (
                      <div 
                        className="mb-3 p-2 rounded-lg"
                        style={{
                          background: 'rgba(124,92,255,0.08)',
                          border: '1px solid rgba(124,92,255,0.2)'
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold" style={{ color: '#7C5CFF' }}>
                            Now Playing
                          </span>
                          <span className="text-sm font-medium" style={{ color: '#111827' }}>
                            {currentPlan.tracks[currentTrackIndex].title}
                          </span>
                          <span className="text-xs" style={{ color: '#6B7280' }}>
                            {currentPlan.tracks[currentTrackIndex].artist}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {currentPlan.tracks.map((track, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between py-2 px-2 rounded-lg transition-all duration-200"
                          style={{
                            background: index === currentTrackIndex ? 'rgba(124,92,255,0.1)' : 'transparent'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {index === currentTrackIndex && (
                              <span className="flex items-center gap-0.5">
                                <div className="w-1 h-1 rounded-full" style={{ background: '#7C5CFF', animation: 'pulse 1s infinite' }} />
                              </span>
                            )}
                            <div className="flex flex-col">
                              <span 
                                className="text-sm font-medium" 
                                style={{ 
                                  color: index === currentTrackIndex ? '#7C5CFF' : '#111827'
                                }}
                              >
                                {track.title}
                              </span>
                              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                                {track.artist}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>
                            {track.mode}
                          </span>
                        </div>
                      ))}
                    </div>
                    {audioError && (
                      <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <p className="text-xs" style={{ color: '#991B1B' }}>
                          {audioError}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Phases */}
                  <div 
                    className="rounded-2xl p-4"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>Playlist phases</span>
                    </div>
                    <div className="space-y-2">
                      {currentPlan.phases.map((phase, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>
                            {phase.time}
                          </span>
                          <span className="text-sm font-medium" style={{ color: '#374151' }}>
                            {phase.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transitions & Closing */}
                  {currentPlan.transitions.map((transition, index) => (
                    <div 
                      key={index}
                      className="rounded-2xl p-4"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xs font-semibold" style={{ color: '#7C5CFF' }}>MOODWAVE DJ</span>
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>·</span>
                        <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>Transition {index + 1}</span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#4B5563' }}>
                        {highlightKeywords(transition, currentPlan.highlights)}
                      </p>
                    </div>
                  ))}

                  <div 
                    className="rounded-2xl p-4"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xs font-semibold" style={{ color: '#7C5CFF' }}>MOODWAVE DJ</span>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>·</span>
                      <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>Closing</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#4B5563' }}>
                      {currentPlan.closingLine}
                    </p>
                  </div>
                </div>
                
                <div className="pb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="告诉 Moodwave 你现在的状态..."
                      className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none shadow-sm"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        color: '#1F2937'
                      }}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && userInput && handleGenerate(userInput)}
                    />
                    <button
                      onClick={() => userInput && handleGenerate(userInput)}
                      disabled={!userInput}
                      className="text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:translate-y-[-0.5px] disabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={userInput ? {
                        background: 'linear-gradient(135deg, #7C5CFF, #22D3EE)',
                        boxShadow: '0 3px 12px rgba(124,92,255,0.3)'
                      } : {
                        background: '#D1D5DB'
                      }}
                    >
                      Generate
                    </button>
                  </div>
                </div>
                
                <div className="pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-medium w-12" style={{ color: '#6B7280' }}>
                      {formatPlaybackTime(playbackTime)}
                    </span>
                    
                    <div className="flex-1 flex items-center gap-0.5 h-2.5">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-full"
                          style={{
                            height: `${5.5 + Math.sin(i * 0.7) * 4}px`,
                            opacity: phase === 'playing' ? (i < 16 ? 1 : 0.45) : 0.65,
                            background: i < 16 ? 
                              (playbackTime > 0 ? 'linear-gradient(90deg, #7C5CFF, #22D3EE)' : '#D1D5DB') 
                              : '#D1D5DB'
                          }}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={handlePlayPause}
                      className="w-13 h-13 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:translate-y-[-1px] hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #111827, #374151)',
                        boxShadow: '0 5px 18px rgba(0,0,0,0.3)'
                      }}
                    >
                      {phase === 'playing' ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1zm8 0a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === 'planning' && (
              <div className="flex flex-col h-full items-center justify-center pt-4">
                <div 
                  className="w-16 h-16 rounded-full animate-spin mb-6"
                  style={{
                    border: '2px solid #E5E7EB',
                    borderTop: '2px solid #7C5CFF'
                  }}
                />
                <p className="text-sm animate-pulse" style={{ color: '#6B7280' }}>
                  {thinkingMessages[thinkingIndex]}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
