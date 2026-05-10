import { useState, useRef, useEffect } from 'react'
import { useGlassSettings } from './GlassSettings'

export default function GlassSettingsPanel() {
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

  const sliderStyle = {
    accent: '#A78BFA',
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full text-lg transition-transform hover:scale-110"
        style={{
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#E5E7EB',
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Glass settings"
      >
        &#9881;
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="fixed right-4 top-16 z-50 w-[280px] rounded-2xl p-4"
          style={{
            background: 'rgba(15,18,35,0.88)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 32px rgba(124,92,255,0.12)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: '#F3F4F6' }}>
              Glass Settings
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
              style={{ color: '#9CA3AF', background: 'rgba(255,255,255,0.06)' }}
              aria-label="Close settings"
            >
              &#10005;
            </button>
          </div>

          <label className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: '#D1D5DB' }}>
              Enable Glass Effect
            </span>
            <button
              onClick={() => update('enabled', !settings.enabled)}
              className="relative h-5 w-9 rounded-full transition-colors"
              style={{
                background: settings.enabled ? '#7C5CFF' : 'rgba(255,255,255,0.12)',
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
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#9CA3AF' }}>Opacity</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{settings.opacity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.opacity}
                onChange={(e) => update('opacity', Number(e.target.value))}
                className="w-full h-1 accent-[#A78BFA]"
                disabled={!settings.enabled}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#9CA3AF' }}>Blur</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{settings.blurAmount.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.01"
                value={settings.blurAmount}
                onChange={(e) => update('blurAmount', Number(e.target.value))}
                className="w-full h-1 accent-[#A78BFA]"
                disabled={!settings.enabled}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#9CA3AF' }}>Displacement</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{Math.round(settings.displacementScale)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.displacementScale}
                onChange={(e) => update('displacementScale', Number(e.target.value))}
                className="w-full h-1 accent-[#A78BFA]"
                disabled={!settings.enabled}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: '#9CA3AF' }}>Saturation</span>
                <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{Math.round(settings.saturation)}</span>
              </div>
              <input
                type="range"
                min="100"
                max="200"
                step="1"
                value={settings.saturation}
                onChange={(e) => update('saturation', Number(e.target.value))}
                className="w-full h-1 accent-[#A78BFA]"
                disabled={!settings.enabled}
              />
            </div>
          </div>

          <button
            onClick={reset}
            className="mt-4 w-full rounded-xl py-2 text-xs font-semibold transition-all hover:opacity-90"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#D1D5DB',
            }}
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </>
  )
}
