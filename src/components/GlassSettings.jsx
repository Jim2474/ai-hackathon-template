import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'moodwave_glass_settings'

const DEFAULTS = {
  opacity: 0.72,
  blurAmount: 0.12,
  displacementScale: 45,
  saturation: 160,
  enabled: true,
}

const GlassSettingsContext = createContext(null)

export function GlassSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const reset = () => setSettings(DEFAULTS)

  return (
    <GlassSettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </GlassSettingsContext.Provider>
  )
}

export function useGlassSettings() {
  const ctx = useContext(GlassSettingsContext)
  if (!ctx) throw new Error('useGlassSettings must be used within GlassSettingsProvider')
  return ctx
}
