import { useState, useRef, useEffect } from 'react'
import { useGlassSettings } from './GlassSettings'
import { XiaoMusicSettingsControls } from './XiaoMusicPanel'
import { ALL_TTS_VOICES } from '../services/ttsService'

export default function GlassSettingsPanel({
  xiaoSettings,
  xiaoDevices,
  xiaoStatus,
  xiaoDebug,
  xiaoBusy,
  currentTrack,
  onXiaoSettingsChange,
  onDetectXiaoDevices,
  onRefreshXiaoStatus,
  onPlayCurrentOnXiao,
  onStopXiao,
  onPreviousXiao,
  onNextXiao,
  onSetXiaoVolume,
  onXiaoSpeakerToggle,
  ttsSettings,
  onTtsSettingsChange,
  onTestTtsVoice,
}) {
  const { settings, update, reset } = useGlassSettings()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full text-lg transition-transform hover:scale-110"
        style={{
          background: 'rgba(255,255,255,0.58)',
          border: '1px solid rgba(255,255,255,0.42)',
          color: '#4a318e',
          backdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 14px 36px rgba(74,49,142,0.22), inset 0 1px 0 rgba(255,255,255,0.70)',
        }}
        aria-label="液态玻璃设置"
      >
        &#9881;
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="fixed right-4 top-16 z-50 max-h-[calc(100vh-5rem)] w-[320px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.66)',
            border: '1px solid rgba(255,255,255,0.46)',
            boxShadow: '0 24px 56px rgba(74,49,142,0.22), inset 0 1px 0 rgba(255,255,255,0.72)',
            backdropFilter: 'blur(26px) saturate(190%)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: '#1d1d1f' }}>
              液态玻璃设置
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
              style={{ color: '#7a7a7a', background: '#f5f5f7' }}
              aria-label="关闭设置"
            >
              &#10005;
            </button>
          </div>

          <label className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: '#333333' }}>
              开启液态玻璃
            </span>
            <button
              onClick={() => update('enabled', !settings.enabled)}
              className="relative h-5 w-9 rounded-full transition-colors"
              style={{
                background: settings.enabled ? 'linear-gradient(135deg, #7C5CFF, #22D3EE)' : '#d2d2d7',
              }}
              role="switch"
              aria-checked={settings.enabled}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                style={{
                  left: '2px',
                  transform: settings.enabled ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </button>
          </label>

          <div className="space-y-3">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>专辑背景</span>
                <span className="text-[11px]" style={{ color: '#6B7280' }}>
                  {settings.albumBackgroundMode === 'single' ? '当前单曲' : '多张专辑'}
                </span>
              </div>
              <div
                className="grid grid-cols-2 gap-1 rounded-xl p-1"
                style={{
                  background: '#f5f5f7',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                {[
                  ['collage', '多张专辑'],
                  ['single', '当前单曲'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('albumBackgroundMode', value)}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all"
                    style={{
                      background: settings.albumBackgroundMode === value ? '#ffffff' : 'transparent',
                      color: settings.albumBackgroundMode === value ? '#4a318e' : '#7a7a7a',
                      boxShadow: settings.albumBackgroundMode === value ? 'inset 0 0 0 1px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>折射模式</span>
                <span className="text-[11px]" style={{ color: '#6B7280' }}>
                  {settings.mode === 'shader' ? '最强' : settings.mode === 'prominent' ? '突出' : '标准'}
                </span>
              </div>
              <div
                className="grid grid-cols-3 gap-1 rounded-xl p-1"
                style={{
                  background: '#f5f5f7',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                {[
                  ['standard', '标准'],
                  ['prominent', '突出'],
                  ['shader', '最强'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('mode', value)}
                    disabled={!settings.enabled}
                    className="rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: settings.mode === value ? '#ffffff' : 'transparent',
                      color: settings.mode === value ? '#4a318e' : '#7a7a7a',
                      boxShadow: settings.mode === value ? 'inset 0 0 0 1px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>玻璃强度</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{settings.opacity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.opacity}
                onChange={(e) => update('opacity', Number(e.target.value))}
                className="w-full h-1 accent-[#7C5CFF]"
                disabled={!settings.enabled}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>雾化模糊</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{settings.blurAmount.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.35"
                step="0.01"
                value={settings.blurAmount}
                onChange={(e) => update('blurAmount', Number(e.target.value))}
                className="w-full h-1 accent-[#7C5CFF]"
                disabled={!settings.enabled}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>折射扭曲</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{Math.round(settings.displacementScale)}</span>
              </div>
              <input
                type="range"
                min="20"
                max="180"
                step="1"
                value={settings.displacementScale}
                onChange={(e) => update('displacementScale', Number(e.target.value))}
                className="w-full h-1 accent-[#7C5CFF]"
                disabled={!settings.enabled}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>色彩增强</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{Math.round(settings.saturation)}</span>
              </div>
              <input
                type="range"
                min="100"
                max="240"
                step="1"
                value={settings.saturation}
                onChange={(e) => update('saturation', Number(e.target.value))}
                className="w-full h-1 accent-[#7C5CFF]"
                disabled={!settings.enabled}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>边缘色散</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{settings.aberrationIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="0.1"
                value={settings.aberrationIntensity}
                onChange={(e) => update('aberrationIntensity', Number(e.target.value))}
                className="w-full h-1 accent-[#7C5CFF]"
                disabled={!settings.enabled}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>液态弹性</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{settings.elasticity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.01"
                value={settings.elasticity}
                onChange={(e) => update('elasticity', Number(e.target.value))}
                className="w-full h-1 accent-[#7C5CFF]"
                disabled={!settings.enabled}
              />
            </div>
          </div>

          {ttsSettings && onTtsSettingsChange && (
            <>
              <div className="my-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }} />
              <h4 className="mb-2 text-[11px] font-semibold" style={{ color: '#4a318e' }}>DJ 语音设置</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>DJ 串场词</span>
                  <button
                    type="button"
                    aria-pressed={ttsSettings.djTransitionsEnabled !== false}
                    onClick={() => onTtsSettingsChange({ djTransitionsEnabled: ttsSettings.djTransitionsEnabled === false })}
                    className="relative h-5 w-9 rounded-full transition-colors"
                    style={{ background: ttsSettings.djTransitionsEnabled !== false ? '#4a318e' : 'rgba(0,0,0,0.12)' }}
                  >
                    <span
                      className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
                      style={{ left: 2, transform: ttsSettings.djTransitionsEnabled !== false ? 'translateX(14px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>语音语言</span>
                  </div>
                  <div
                    className="grid grid-cols-3 gap-1 rounded-xl p-1"
                    style={{ background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.06)' }}
                  >
                    {[
                      ['auto', '自动'],
                      ['zh', '中文'],
                      ['en', 'English'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onTtsSettingsChange({ language: value })}
                        className="rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all"
                        style={{
                          background: ttsSettings.language === value ? '#ffffff' : 'transparent',
                          color: ttsSettings.language === value ? '#4a318e' : '#7a7a7a',
                          boxShadow: ttsSettings.language === value ? 'inset 0 0 0 1px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>语音音色</span>
                  </div>
                  <select
                    value={ttsSettings.voiceId}
                    onChange={(e) => onTtsSettingsChange({ voiceId: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 text-[11px] focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.54)', border: '1px solid rgba(0,0,0,0.06)', color: '#171820' }}
                  >
                    {(ttsSettings.language === 'en' ? ALL_TTS_VOICES.en :
                      ttsSettings.language === 'zh' ? ALL_TTS_VOICES.zh :
                      [...ALL_TTS_VOICES.zh, ...ALL_TTS_VOICES.en]
                    ).map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>语速</span>
                    <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{ttsSettings.speed.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.02"
                    value={ttsSettings.speed}
                    onChange={(e) => onTtsSettingsChange({ speed: Number(e.target.value) })}
                    className="w-full h-1 accent-[#7C5CFF]"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-medium" style={{ color: '#7a7a7a' }}>音调</span>
                    <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{ttsSettings.pitch}</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={ttsSettings.pitch}
                    onChange={(e) => onTtsSettingsChange({ pitch: Number(e.target.value) })}
                    className="w-full h-1 accent-[#7C5CFF]"
                  />
                </div>

                {onTestTtsVoice && (
                  <button
                    type="button"
                    onClick={onTestTtsVoice}
                    className="w-full rounded-xl py-2 text-[11px] font-semibold transition-all hover:opacity-90"
                    style={{
                      background: 'rgba(124,92,255,0.12)',
                      border: '1px solid rgba(124,92,255,0.20)',
                      color: '#4a318e',
                    }}
                  >
                    试听语音
                  </button>
                )}
              </div>
            </>
          )}

          {xiaoSettings && (
            <XiaoMusicSettingsControls
              settings={xiaoSettings}
              devices={xiaoDevices}
              status={xiaoStatus}
              debug={xiaoDebug}
              busy={xiaoBusy}
              currentTrack={currentTrack}
              onSettingsChange={onXiaoSettingsChange}
              onDetectDevices={onDetectXiaoDevices}
              onRefreshStatus={onRefreshXiaoStatus}
              onPlayCurrent={onPlayCurrentOnXiao}
              onStop={onStopXiao}
              onPrevious={onPreviousXiao}
              onNext={onNextXiao}
              onSetVolume={onSetXiaoVolume}
              onSpeakerToggle={onXiaoSpeakerToggle}
            />
          )}

          <button
            onClick={reset}
            className="mt-4 w-full rounded-xl py-2 text-xs font-semibold transition-all hover:opacity-90"
            style={{
              background: '#f5f5f7',
              border: '1px solid rgba(0,0,0,0.06)',
              color: '#4a318e',
            }}
          >
            恢复最强默认值
          </button>
        </div>
      )}
    </>
  )
}
