import LiquidGlass from 'liquid-glass-react'

const PRESETS = {
  card: {
    displacementScale: 45,
    blurAmount: 0.12,
    saturation: 160,
    aberrationIntensity: 1.5,
    elasticity: 0.1,
    cornerRadius: 34,
    mode: 'standard',
  },
  panel: {
    displacementScale: 55,
    blurAmount: 0.08,
    saturation: 140,
    aberrationIntensity: 2,
    elasticity: 0.15,
    cornerRadius: 24,
    mode: 'standard',
  },
  bubble: {
    displacementScale: 30,
    blurAmount: 0.06,
    saturation: 130,
    aberrationIntensity: 1,
    elasticity: 0.1,
    cornerRadius: 16,
    mode: 'standard',
  },
  player: {
    displacementScale: 50,
    blurAmount: 0.1,
    saturation: 150,
    aberrationIntensity: 2,
    elasticity: 0.2,
    cornerRadius: 24,
    mode: 'standard',
  },
}

export default function GlassPanel({ preset = 'panel', children, className = '', style = {}, ...rest }) {
  const base = PRESETS[preset] || PRESETS.panel

  return (
    <LiquidGlass
      {...base}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </LiquidGlass>
  )
}
