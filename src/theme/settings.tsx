import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light' | 'auto'
export type PreviewQuality = 'eco' | 'standard' | 'high'

export interface Settings {
  theme: ThemeMode
  accent: string
  animations: boolean
  grid: boolean
  autosave: boolean
  previewQuality: PreviewQuality
  exportResolution: number // px width
}

const DEFAULTS: Settings = {
  theme: 'dark',
  accent: '#D9B45B',
  animations: true,
  grid: false,
  autosave: true,
  previewQuality: 'high',
  exportResolution: 2048,
}

const KEY = 'css-settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

interface Ctx {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

const SettingsContext = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  const update = (patch: Partial<Settings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })

  const reset = () => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setSettings(DEFAULTS)
  }

  // Resolve theme (auto -> system) and expose via data-attributes + CSS vars.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const resolved =
        settings.theme === 'auto' ? (mq.matches ? 'light' : 'dark') : settings.theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.setProperty('--accent', settings.accent)
      document.documentElement.classList.toggle('no-anim', !settings.animations)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', resolved === 'light' ? '#F5F5F7' : '#08090D')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme, settings.accent, settings.animations])

  const value = useMemo(() => ({ settings, update, reset }), [settings])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export function previewWidth(q: PreviewQuality): number {
  return q === 'eco' ? 540 : q === 'standard' ? 820 : 1100
}
