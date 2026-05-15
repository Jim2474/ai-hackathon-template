import { XIAOMUSIC_PLAYBACK_TARGETS } from '../services/xiaoMusicService'

function StatusPill({ tone = 'idle', children }) {
  const colors = {
    idle: ['rgba(255,255,255,0.46)', '#5f6470'],
    ok: ['rgba(34,197,94,0.16)', '#15803d'],
    busy: ['rgba(124,92,255,0.16)', '#4a318e'],
    error: ['rgba(239,68,68,0.14)', '#be123c']
  }[tone] || ['rgba(255,255,255,0.46)', '#5f6470']

  return (
    <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: colors[0], color: colors[1] }}>
      {children}
    </span>
  )
}

function XiaoSpeakerSwitch({ enabled, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
      className="relative h-6 w-11 rounded-full transition-colors"
      style={{ background: enabled ? '#4a318e' : 'rgba(255,255,255,0.55)' }}
      title="小爱播放开关"
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
        style={{ left: 2, transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

export function XiaoMusicSettingsControls({
  settings,
  devices,
  status,
  debug,
  busy,
  currentTrack,
  onSettingsChange,
  onDetectDevices,
  onRefreshStatus,
  onPlayCurrent,
  onStop,
  onPrevious,
  onNext,
  onSetVolume,
  onSpeakerToggle,
}) {
  const selectedDevice = devices.find(device => device.did === settings.deviceDid)
  const statusTone = status.type === 'error' ? 'error' : busy ? 'busy' : settings.deviceDid ? 'ok' : 'idle'
  const isSpeakerMode = settings.playbackTarget === XIAOMUSIC_PLAYBACK_TARGETS.speaker

  return (
    <section className="mt-4 border-t pt-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: '#1d1d1f' }}>小爱音箱</span>
            <StatusPill tone={isSpeakerMode ? 'ok' : statusTone}>
              {isSpeakerMode ? '小爱播放' : status.message || '未连接'}
            </StatusPill>
          </div>
          <p className="mt-1 truncate text-[10px]" style={{ color: '#6c6f78' }}>
            {selectedDevice ? `${selectedDevice.name} · ${selectedDevice.did}` : '连接本机 xiaomusic 后推送音乐和 DJ 文案'}
          </p>
        </div>
        <XiaoSpeakerSwitch enabled={isSpeakerMode} onChange={onSpeakerToggle} />
      </div>

      <div className="space-y-2">
        <div
          className="rounded-xl px-3 py-2 text-[10px]"
          style={{ background: isSpeakerMode ? 'rgba(74,49,142,0.10)' : 'rgba(255,255,255,0.42)', color: isSpeakerMode ? '#4a318e' : '#5f6470' }}
        >
          {isSpeakerMode ? '已开启：Claudio 默认推送小爱音箱，电脑端不播放音乐。' : '已关闭：Claudio 使用电脑浏览器播放。'}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            value={settings.baseUrl}
            onChange={(event) => onSettingsChange({ baseUrl: event.target.value })}
            placeholder="http://127.0.0.1:58090"
            className="min-w-0 rounded-xl px-3 py-2 text-[11px] focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.54)', border: '1px solid rgba(0,0,0,0.06)', color: '#171820' }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={onDetectDevices}
            className="rounded-xl px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-45"
            style={{ background: '#4a318e' }}
          >
            检测
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            value={settings.username}
            onChange={(event) => onSettingsChange({ username: event.target.value })}
            placeholder="HTTP 用户名"
            className="min-w-0 rounded-xl px-3 py-2 text-[11px] focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.48)', border: '1px solid rgba(0,0,0,0.06)', color: '#171820' }}
          />
          <input
            type="password"
            value={settings.password}
            onChange={(event) => onSettingsChange({ password: event.target.value })}
            placeholder="HTTP 密码"
            className="min-w-0 rounded-xl px-3 py-2 text-[11px] focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.48)', border: '1px solid rgba(0,0,0,0.06)', color: '#171820' }}
          />
        </div>

        <select
          value={settings.deviceDid}
          onChange={(event) => {
            const device = devices.find(item => item.did === event.target.value)
            onSettingsChange({ deviceDid: event.target.value, deviceName: device?.name || '' })
          }}
          className="w-full rounded-xl px-3 py-2 text-[11px] focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.54)', border: '1px solid rgba(0,0,0,0.06)', color: '#171820' }}
        >
          <option value="">选择小爱设备</option>
          {devices.map(device => (
            <option key={device.did} value={device.did}>
              {device.name} {device.model ? `· ${device.model}` : ''}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-3 gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.46)' }}>
          {[
            ['浏览器', XIAOMUSIC_PLAYBACK_TARGETS.browser],
            ['小爱', XIAOMUSIC_PLAYBACK_TARGETS.speaker],
            ['双端', XIAOMUSIC_PLAYBACK_TARGETS.both],
          ].map(([label, value]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (value === XIAOMUSIC_PLAYBACK_TARGETS.speaker) {
                  onSpeakerToggle(true)
                  return
                }
                if (value === XIAOMUSIC_PLAYBACK_TARGETS.browser) {
                  onSpeakerToggle(false)
                  return
                }
                onSettingsChange({ playbackTarget: value, autoPushOnTrackChange: true })
              }}
              className="rounded-lg px-2 py-1.5 text-[10px] font-semibold"
              style={{
                background: settings.playbackTarget === value ? '#4a318e' : 'transparent',
                color: settings.playbackTarget === value ? '#fff' : '#5f6470'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px]" style={{ color: '#5f6470' }}>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.speakDjBeforeTrack}
              onChange={(event) => onSettingsChange({ speakDjBeforeTrack: event.target.checked })}
            />
            先播 DJ 文案
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.autoPushOnTrackChange}
              onChange={(event) => onSettingsChange({ autoPushOnTrackChange: event.target.checked })}
            />
            切歌自动推送
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px]" style={{ color: '#5f6470' }}>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.proxyDjAudioThroughXiaoMusic}
              onChange={(event) => onSettingsChange({ proxyDjAudioThroughXiaoMusic: event.target.checked })}
            />
            代理DJ音频
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.useMusicApiCompatibility}
              onChange={(event) => onSettingsChange({ useMusicApiCompatibility: event.target.checked })}
            />
            触屏兼容
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.forceStopCompatibility}
              onChange={(event) => onSettingsChange({ forceStopCompatibility: event.target.checked })}
            />
            强制停止
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-16 text-[10px]" style={{ color: '#5f6470' }}>推歌缓冲</span>
          <input
            type="range"
            min="0"
            max="1500"
            step="50"
            value={settings.ttsLeadMs}
            onChange={(event) => onSettingsChange({ ttsLeadMs: Number(event.target.value) })}
            className="h-1 flex-1 accent-[#4a318e]"
          />
          <span className="w-11 text-right text-[10px] font-mono" style={{ color: '#5f6470' }}>{(settings.ttsLeadMs / 1000).toFixed(1)}s</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-16 text-[10px]" style={{ color: '#5f6470' }}>小爱音量</span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.volume}
            onChange={(event) => onSettingsChange({ volume: Number(event.target.value) })}
            onMouseUp={() => onSetVolume(settings.volume)}
            onTouchEnd={() => onSetVolume(settings.volume)}
            className="h-1 flex-1 accent-[#4a318e]"
          />
          <span className="w-8 text-right text-[10px] font-mono" style={{ color: '#5f6470' }}>{settings.volume}</span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          <button type="button" disabled={busy || !settings.deviceDid} onClick={onPrevious} className="rounded-xl px-2 py-2 text-[10px] font-semibold disabled:opacity-35" style={{ background: 'rgba(255,255,255,0.54)', color: '#30323a' }}>上一首</button>
          <button type="button" disabled={busy || !settings.deviceDid || !currentTrack} onClick={onPlayCurrent} className="rounded-xl px-2 py-2 text-[10px] font-semibold disabled:opacity-35" style={{ background: '#4a318e', color: '#fff' }}>推送</button>
          <button type="button" disabled={busy || !settings.deviceDid} onClick={onStop} className="rounded-xl px-2 py-2 text-[10px] font-semibold disabled:opacity-35" style={{ background: 'rgba(239,68,68,0.14)', color: '#be123c' }}>停止</button>
          <button type="button" disabled={busy || !settings.deviceDid} onClick={onNext} className="rounded-xl px-2 py-2 text-[10px] font-semibold disabled:opacity-35" style={{ background: 'rgba(255,255,255,0.54)', color: '#30323a' }}>下一首</button>
          <button type="button" disabled={busy || !settings.deviceDid} onClick={onRefreshStatus} className="rounded-xl px-2 py-2 text-[10px] font-semibold disabled:opacity-35" style={{ background: 'rgba(255,255,255,0.54)', color: '#30323a' }}>状态</button>
        </div>

        <div
          className="rounded-xl px-3 py-2 text-[10px]"
          style={{ background: 'rgba(255,255,255,0.42)', border: '1px solid rgba(0,0,0,0.05)', color: '#5f6470' }}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-semibold" style={{ color: '#30323a' }}>最近 DJ 调试</span>
            <span className="font-mono">{debug?.stage || 'idle'}</span>
          </div>
          <p className="line-clamp-2">{debug?.message || '还没有推送记录'}</p>
          {debug?.trackTitle && (
            <p className="mt-1 truncate">歌曲：{debug.trackTitle}</p>
          )}
          {debug?.djSource && (
            <p className="mt-1 truncate">来源：{debug.djSource} · {debug.spokenDjChars || debug.originalDjChars || 0} 字</p>
          )}
          {debug?.djAudioUrl && (
            <p className="mt-1 truncate">DJ URL：{debug.djAudioUrl}</p>
          )}
          {debug?.djAudioPushUrl && debug.djAudioPushUrl !== debug.djAudioUrl && (
            <p className="mt-1 truncate">推送URL：{debug.djAudioPushUrl}</p>
          )}
          {debug?.pushedDjAt && (
            <p className="mt-1">DJ：{debug.pushedDjAt}{debug.pushedSongAt ? ` · 歌曲：${debug.pushedSongAt}` : ''}</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default function XiaoMusicPanel({
  settings,
  devices,
  status,
  busy,
  onSpeakerToggle,
}) {
  const selectedDevice = devices.find(device => device.did === settings.deviceDid)
  const isSpeakerMode = settings.playbackTarget === XIAOMUSIC_PLAYBACK_TARGETS.speaker
  const statusTone = status.type === 'error' ? 'error' : busy ? 'busy' : settings.deviceDid ? 'ok' : 'idle'
  const dotColor = isSpeakerMode ? '#22c55e' : statusTone === 'error' ? '#ef4444' : statusTone === 'busy' ? '#7c5cff' : '#a3a8b3'

  return (
    <div
      className="flex h-8 items-center gap-1.5 rounded-full px-2"
      style={{
        background: 'rgba(255,255,255,0.46)',
        border: '1px solid rgba(255,255,255,0.38)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.54)'
      }}
      title={selectedDevice ? `${selectedDevice.name} · 详细设置在右上角齿轮` : '小爱播放开关，详细设置在右上角齿轮'}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
      <span className="text-[10px] font-semibold" style={{ color: isSpeakerMode ? '#4a318e' : '#5f6470' }}>
        小爱
      </span>
      <button
        type="button"
        aria-pressed={isSpeakerMode}
        onClick={() => onSpeakerToggle(!isSpeakerMode)}
        className="relative h-5 w-9 rounded-full transition-colors"
        style={{ background: isSpeakerMode ? '#4a318e' : 'rgba(165,171,184,0.42)' }}
        title="小爱播放开关"
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
          style={{ left: 2, transform: isSpeakerMode ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
