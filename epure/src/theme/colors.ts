// Couleurs : extraction de la palette d'une pochette, conversions et luminance.

export type RGB = [number, number, number]

export interface Palette {
  /** Couleur la plus présente et la plus vive de la pochette. */
  dominant: RGB
  /** Deuxième couleur, distincte de la première. */
  secondary: RGB
}

export const NEUTRAL_PALETTE: Palette = { dominant: [124, 110, 220], secondary: [60, 70, 120] }

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.padEnd(6, '0')
  const n = parseInt(full.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const rgbToHex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
export const css = ([r, g, b]: RGB, a = 1) =>
  a === 1 ? `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})` : `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${a})`

/** Luminance relative perçue, de 0 (noir) à 1 (blanc). */
export function luminance([r, g, b]: RGB): number {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h /= 6
  return [h, s, l]
}
export function hslToRgb(h: number, s: number, l: number): RGB {
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

/** Même teinte, mais saturation et clarté imposées (bornées). */
export function tune(rgb: RGB, opts: { s?: [number, number]; l: number; sMul?: number }): RGB {
  const [h, s] = rgbToHsl(rgb)
  let sat = s * (opts.sMul ?? 1)
  if (opts.s) sat = Math.min(opts.s[1], Math.max(opts.s[0], sat))
  return hslToRgb(h, Math.min(1, sat), opts.l)
}

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/** Charge une image (CORS anonyme) : sert au préchargement et à la lecture des pixels. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image'))
    img.src = url
  })
}

function pixels(source: CanvasImageSource, size = 32): Uint8ClampedArray | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, size, size)
    return ctx.getImageData(0, 0, size, size).data
  } catch {
    return null // canvas "souillé" (pas d'en-tête CORS) ou image invalide
  }
}

/** Luminance moyenne d'une image, pour le contraste automatique du texte. */
export function averageLuminance(source: CanvasImageSource): number {
  const data = pixels(source)
  if (!data) return 0.2
  let sum = 0
  for (let i = 0; i < data.length; i += 4) sum += luminance([data[i], data[i + 1], data[i + 2]])
  return sum / (data.length / 4)
}

const paletteCache = new Map<string, Palette>()

/**
 * Palette d'une pochette : on range les pixels par familles de couleurs et on retient les
 * deux familles les plus présentes, en favorisant les couleurs saturées.
 */
export async function extractPalette(url: string): Promise<Palette> {
  if (!url) return NEUTRAL_PALETTE
  const cached = paletteCache.get(url)
  if (cached) return cached
  let palette = NEUTRAL_PALETTE
  try {
    const data = pixels(await loadImage(url))
    if (data) {
      const buckets = new Map<number, { w: number; r: number; g: number; b: number; n: number }>()
      for (let i = 0; i < data.length; i += 4) {
        const rgb: RGB = [data[i], data[i + 1], data[i + 2]]
        const [, s, l] = rgbToHsl(rgb)
        // Les pixels presque noirs ou presque blancs ne donnent pas une bonne teinte.
        const weight = (0.15 + s) * (1 - Math.abs(l - 0.5) * 1.4)
        if (weight <= 0) continue
        const key = ((rgb[0] >> 5) << 6) | ((rgb[1] >> 5) << 3) | (rgb[2] >> 5)
        const b = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0, n: 0 }
        b.w += weight
        b.r += rgb[0]
        b.g += rgb[1]
        b.b += rgb[2]
        b.n++
        buckets.set(key, b)
      }
      const ranked = [...buckets.values()]
        .sort((a, b) => b.w - a.w)
        .map((b): RGB => [b.r / b.n, b.g / b.n, b.b / b.n])
      if (ranked.length) {
        const dominant = ranked[0]
        const distance = (c: RGB) =>
          Math.abs(c[0] - dominant[0]) + Math.abs(c[1] - dominant[1]) + Math.abs(c[2] - dominant[2])
        const secondary = ranked.find((c) => distance(c) > 90) ?? mix(dominant, [20, 20, 40], 0.5)
        palette = { dominant, secondary }
      }
    }
  } catch {
    /* image inaccessible : palette neutre */
  }
  paletteCache.set(url, palette)
  return palette
}
