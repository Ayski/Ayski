// Traduit les réglages + la palette de la pochette en variables CSS. Toute l'interface
// lit ses couleurs dans ces variables : rien n'est codé en dur dans les composants.

import { useEffect, useMemo } from 'react'
import { createStore, useStore } from '../state/store'
import { usePlayer } from '../state/player'
import { useWallpapers, wallpaperFor, type WallpaperView } from '../wallpaper/wallpapers'
import {
  css,
  extractPalette,
  hexToRgb,
  luminance,
  mix,
  NEUTRAL_PALETTE,
  tune,
  type Palette,
  type RGB,
} from './colors'
import { themeDef, useSettings, type Screen, type Settings } from './settings'

/** Palette de la pochette en cours + écran affiché (pour le fond "par écran"). */
export const uiStore = createStore<{ palette: Palette; screen: Screen }>({
  palette: NEUTRAL_PALETTE,
  screen: 'now',
})

export interface BackgroundModel {
  kind: 'gradient' | 'solid' | 'image'
  /** Identifiant du contenu : quand il change, le fond fait un fondu enchaîné. */
  key: string
  /** Valeur CSS de `background` pour un dégradé ou une couleur unie. */
  paint?: string
  wallpaper?: WallpaperView
  /** Luminance estimée du fond tel qu'affiché (0 noir → 1 blanc). */
  luminance: number
}

/** Dégradé dynamique : les couleurs de la pochette, ramenées à l'ambiance du thème. */
function gradient(palette: Palette, s: Settings): { paint: string; lum: number } {
  const theme = themeDef(s.theme)
  const base = hexToRgb(theme.base)
  let a: RGB
  let b: RGB
  switch (s.theme) {
    case 'light':
      a = tune(palette.dominant, { l: 0.84, s: [0.3, 0.7] })
      b = tune(palette.secondary, { l: 0.9, s: [0.25, 0.6] })
      break
    case 'pastel':
      a = tune(palette.dominant, { l: 0.82, s: [0.5, 0.85] })
      b = tune(palette.secondary, { l: 0.88, s: [0.45, 0.8] })
      break
    case 'neon':
      a = tune(palette.dominant, { l: 0.3, s: [0.85, 1] })
      b = tune(palette.secondary, { l: 0.14, s: [0.8, 1] })
      break
    case 'mono':
      a = tune(palette.dominant, { l: 0.24, s: [0, 0] })
      b = tune(palette.secondary, { l: 0.1, s: [0, 0] })
      break
    case 'amoled':
      a = tune(palette.dominant, { l: 0.08, s: [0.3, 0.8] })
      b = [0, 0, 0]
      break
    default:
      a = tune(palette.dominant, { l: 0.26, s: [0.3, 0.7] })
      b = tune(palette.secondary, { l: 0.13, s: [0.25, 0.6] })
  }
  const paint = `radial-gradient(130% 75% at 15% 0%, ${css(a)} 0%, transparent 72%), radial-gradient(120% 80% at 100% 100%, ${css(b)} 0%, transparent 70%), ${theme.base}`
  return { paint, lum: luminance(mix(mix(a, b, 0.5), base, 0.45)) }
}

export function backgroundModel(s: Settings, palette: Palette, wallpaper: WallpaperView | null): BackgroundModel {
  if (s.bgMode === 'image' && wallpaper) {
    const lum = wallpaper.luminance * (s.bgBrightness / 100) * (1 - s.bgDim / 100)
    return { kind: 'image', key: wallpaper.id, wallpaper, luminance: Math.min(1, lum) }
  }
  if (s.bgMode === 'solid') {
    return { kind: 'solid', key: s.bgSolid, paint: s.bgSolid, luminance: luminance(hexToRgb(s.bgSolid)) }
  }
  const g = gradient(palette, s)
  return { kind: 'gradient', key: g.paint, paint: g.paint, luminance: g.lum }
}

/** Modèle du fond pour l'écran courant (partagé par le fond et par le thème). */
export function useBackgroundModel(): BackgroundModel {
  const settings = useSettings((s) => s)
  const { palette, screen } = useStore(uiStore, (s) => s)
  const wallpapers = useWallpapers()
  return useMemo(
    () => backgroundModel(settings, palette, wallpaperFor(screen, settings, wallpapers)),
    [settings, palette, screen, wallpapers],
  )
}

/** À monter une fois : suit la pochette et pousse les variables CSS sur <html>. */
export function useTheme() {
  const settings = useSettings((s) => s)
  const image = usePlayer((s) => s.track?.image ?? '')
  const palette = useStore(uiStore, (s) => s.palette)
  const model = useBackgroundModel()

  // Palette de la pochette : calculée dès que l'image est chargée, puis appliquée d'un bloc
  // (le fond et l'accent changent donc ensemble, en fondu de 600 ms).
  useEffect(() => {
    let alive = true
    if (!image) return
    void extractPalette(image).then((p) => alive && uiStore.set({ palette: p }))
    return () => {
      alive = false
    }
  }, [image])

  useEffect(() => {
    const root = document.documentElement
    // Contraste automatique : fond clair → texte sombre.
    const lightBg = model.luminance > 0.32
    const fg: RGB = lightBg ? [18, 18, 24] : [255, 255, 255]

    let accent = hexToRgb(settings.accent)
    if (settings.dynamicColors) {
      accent =
        settings.theme === 'mono'
          ? lightBg
            ? [40, 40, 44]
            : [236, 236, 236]
          : tune(palette.dominant, lightBg ? { l: 0.4, s: [0.45, 0.85] } : { l: 0.72, s: [0.45, 0.9] })
    }
    const vars: Record<string, string> = {
      '--accent': css(accent),
      '--on-accent': luminance(accent) > 0.36 ? '#101014' : '#ffffff',
      '--fg': fg.map(Math.round).join(' '),
      '--glass': lightBg ? '255 255 255 / 0.46' : '255 255 255 / 0.09',
      '--glass-strong': lightBg ? '250 250 252 / 0.78' : '22 22 30 / 0.72',
      '--glass-line': lightBg ? '0 0 0 / 0.08' : '255 255 255 / 0.12',
      '--tint': css(tune(palette.dominant, { l: 0.45, s: [0.4, 0.9] })),
      '--radius': `${settings.radius}px`,
      '--blur': `${settings.blur}px`,
      '--cover-scale': String(settings.coverSize),
      '--speed': settings.animSpeed === 'slow' ? '1.7' : settings.animSpeed === 'fast' ? '0.6' : settings.animSpeed === 'off' ? '0' : '1',
    }
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
    root.dataset.scheme = lightBg ? 'light' : 'dark'
    root.dataset.motion = settings.animSpeed === 'off' ? 'off' : 'on'
    // La barre d'état iOS suit la couleur de base du thème.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeDef(settings.theme).base)
  }, [settings, palette, model.luminance])
}
