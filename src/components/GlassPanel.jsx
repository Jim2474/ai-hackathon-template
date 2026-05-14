import { useGlassSettings } from './GlassSettings'

const PRESETS = {
  card: {
    displacementScale: 135,
    blurAmount: 0.2,
    saturation: 215,
    aberrationIntensity: 4.8,
    elasticity: 0.48,
    cornerRadius: 34,
    mode: 'shader',
  },
  panel: {
    displacementScale: 122,
    blurAmount: 0.18,
    saturation: 205,
    aberrationIntensity: 4.2,
    elasticity: 0.38,
    cornerRadius: 24,
    mode: 'shader',
  },
  bubble: {
    displacementScale: 84,
    blurAmount: 0.14,
    saturation: 190,
    aberrationIntensity: 3,
    elasticity: 0.28,
    cornerRadius: 16,
    mode: 'prominent',
  },
  player: {
    displacementScale: 145,
    blurAmount: 0.2,
    saturation: 220,
    aberrationIntensity: 5,
    elasticity: 0.52,
    cornerRadius: 24,
    mode: 'shader',
  },
}

function LiquidGlassLayer({ preset, settings }) {
  if (!settings.enabled) return null

  const base = PRESETS[preset] || PRESETS.panel
  const opacity = settings.opacity ?? 0.96
  const displacement = settings.displacementScale ?? base.displacementScale
  const aberration = settings.aberrationIntensity ?? base.aberrationIntensity

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-[inherit]"
        style={{
          opacity,
          background: `
            radial-gradient(circle at 18% 12%, rgba(255,255,255,0.38), transparent ${Math.min(42, 18 + displacement / 8)}%),
            radial-gradient(circle at 84% 86%, rgba(124,92,255,0.22), transparent ${Math.min(46, 24 + aberration * 3)}%),
            linear-gradient(135deg, rgba(255,255,255,0.30), rgba(255,255,255,0.08) 42%, rgba(34,211,238,0.16))
          `,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.55),
            inset 0 -1px 0 rgba(255,255,255,0.16),
            inset 12px 0 28px rgba(255,255,255,0.08),
            inset -18px 0 34px rgba(124,92,255,0.18)
          `,
          background: `
            linear-gradient(120deg, rgba(255,255,255,0.2), transparent 22%, transparent 70%, rgba(34,211,238,0.14)),
            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.20), transparent 38%)
          `,
          mixBlendMode: 'screen',
          opacity: Math.min(0.9, opacity * 0.82),
        }}
      />
    </div>
  )
}

export default function GlassPanel({
  preset = 'panel',
  children,
  className = '',
  contentClassName = 'relative z-10',
  style = {},
  ...rest
}) {
  const { settings } = useGlassSettings()
  const base = PRESETS[preset] || PRESETS.panel
  const borderRadius = style.borderRadius ?? `${base.cornerRadius}px`
  const blurPixels = Math.max(8, Math.round(8 + (settings.blurAmount ?? base.blurAmount) * 52))
  const saturation = Math.round(settings.saturation ?? base.saturation)

  return (
    <div
      className={className}
      style={{
        ...style,
        position: style.position || 'relative',
        isolation: 'isolate',
        overflow: style.overflow || 'hidden',
        borderRadius,
        backdropFilter: `blur(${blurPixels}px) saturate(${saturation}%)`,
        WebkitBackdropFilter: `blur(${blurPixels}px) saturate(${saturation}%)`,
      }}
      {...rest}
    >
      <LiquidGlassLayer preset={preset} settings={settings} />
      <div className={contentClassName}>{children}</div>
    </div>
  )
}
