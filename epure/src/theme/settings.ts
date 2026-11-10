// Réglages de l'app (thème, fond d'écran, moteur) : store réactif + sauvegarde localStorage.

import { createStore, useStore } from '../state/store'

export type ThemeId = 'deep' | 'light' | 'pastel' | 'neon' | 'mono' | 'amoled'
export type AnimSpeed = 'slow' | 'normal' | 'fast' | 'off'
export type BgMode = 'dynamic' | 'solid' | 'image'
export type Screen = 'now' | 'playlists' | 'stats'
export type FlowMode = 'comfort' | 'balance' | 'discovery' | 'playlist'

export interface ThemeDef {
  id: ThemeId
  label: string
  scheme: 'dark' | 'light'
  /** Couleur de base du fond et accent par défaut. */
  base: string
  accent: string
}

export const THEMES: ThemeDef[] = [
  { id: 'deep', label: 'Sombre profond', scheme: 'dark', base: '#0b0b10', accent: '#8f7dff' },
  { id: 'light', label: 'Clair épuré', scheme: 'light', base: '#f3f1ec', accent: '#3d5afe' },
  { id: 'pastel', label: 'Pastel', scheme: 'light', base: '#f4e6ee', accent: '#e07aa6' },
  { id: 'neon', label: 'Néon', scheme: 'dark', base: '#07030f', accent: '#00e5ff' },
  { id: 'mono', label: 'Monochrome', scheme: 'dark', base: '#141414', accent: '#ededed' },
  { id: 'amoled', label: 'AMOLED noir pur', scheme: 'dark', base: '#000000', accent: '#6ff0c4' },
]
export const themeDef = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0]

export const ACCENT_PRESETS = ['#8f7dff', '#3d5afe', '#00c2ff', '#6ff0c4', '#ffd166', '#ff8a5c', '#ff5c8a', '#ededed']

export interface Settings {
  // --- apparence
  theme: ThemeId
  accent: string
  dynamicColors: boolean
  radius: number
  blur: number
  animSpeed: AnimSpeed
  coverSize: number
  // --- fond d'écran
  bgMode: BgMode
  bgSolid: string
  wallpaperId: string | null
  perScreen: boolean
  screenWallpapers: Partial<Record<Screen, string>>
  bgBlur: number
  bgBrightness: number
  bgDim: number
  bgSaturation: number
  tintWithCover: boolean
  parallax: boolean
  // --- moteur Epure Flow
  flowEnabled: boolean
  mode: FlowMode
  /** Niveau d'aventure : part de découvertes, de 0 à 100. */
  adventure: number
  playlistId: string | null
  playlistName: string | null
  /** Jours de repos de base après 2 écoutes en 14 jours. */
  restBaseDays: number
  debug: boolean
}

export const DEFAULTS: Settings = {
  theme: 'deep',
  accent: '#8f7dff',
  dynamicColors: true,
  radius: 22,
  blur: 24,
  animSpeed: 'normal',
  coverSize: 1,
  bgMode: 'dynamic',
  bgSolid: '#15131f',
  wallpaperId: null,
  perScreen: false,
  screenWallpapers: {},
  bgBlur: 0,
  bgBrightness: 100,
  bgDim: 25,
  bgSaturation: 100,
  tintWithCover: false,
  parallax: true,
  flowEnabled: true,
  mode: 'comfort',
  adventure: 20,
  playlistId: null,
  playlistName: null,
  restBaseDays: 3,
  debug: false,
}

/** Clés qui font partie d'un "thème" exportable (le reste concerne le moteur). */
export const THEME_KEYS: (keyof Settings)[] = [
  'theme',
  'accent',
  'dynamicColors',
  'radius',
  'blur',
  'animSpeed',
  'coverSize',
  'bgMode',
  'bgSolid',
  'wallpaperId',
  'perScreen',
  'screenWallpapers',
  'bgBlur',
  'bgBrightness',
  'bgDim',
  'bgSaturation',
  'tintWithCover',
  'parallax',
]

const KEY = 'epure.settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    /* localStorage indisponible ou contenu illisible : valeurs par défaut */
  }
  return DEFAULTS
}

export const settingsStore = createStore<Settings>(load())
settingsStore.subscribe(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settingsStore.get()))
  } catch {
    /* quota dépassé ou navigation privée : les réglages restent en mémoire */
  }
})

export const setSettings = (patch: Partial<Settings>) => settingsStore.set(patch)
export const useSettings = <S,>(selector: (s: Settings) => S) => useStore(settingsStore, selector)

/** Remet l'apparence et le fond à zéro, sans toucher au moteur. */
export function resetTheme() {
  const patch: Partial<Settings> = {}
  for (const k of THEME_KEYS) (patch as Record<string, unknown>)[k] = DEFAULTS[k]
  settingsStore.set(patch)
}

// ---------------------------------------------------------------- vitesse des animations

const reducedMotion =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false }

/** Vrai si les animations doivent être coupées (réglage ou préférence système). */
export const motionOff = () => settingsStore.get().animSpeed === 'off' || reducedMotion.matches

/** Multiplicateur de durée : 1 = normal, plus grand = plus lent, 0 = désactivé. */
export function speedFactor(): number {
  if (motionOff()) return 0
  const speed = settingsStore.get().animSpeed
  return speed === 'slow' ? 1.7 : speed === 'fast' ? 0.6 : 1
}
