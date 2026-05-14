import { useState, useRef, useEffect } from 'react'
import { useGlassSettings } from './GlassSettings'
import { XiaoMusicSettingsControls } from './XiaoMusicPanel'

export default function GlassSettingsPanel({
  xiaoSettings,
  xiaoDevices,
  xiaoStatus,
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

          {xiaoSettings && (
            <XiaoMusicSettingsControls
              settings={xiaoSettings}
              devices={xiaoDevices}
              status={xiaoStatus}
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
