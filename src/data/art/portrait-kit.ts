import type { Paint, VectorPath } from '../../types'
import { circ, INK, lin, rad, radLit, ell } from './kit'

// Shared drawing helpers for the collectible character portraits.
// Portraits are authored in a 140 × 200 box; key light from the upper-left.

export const PORTRAIT_W = 140
export const PORTRAIT_H = 200

// ---- local helpers -------------------------------------------------------------
export const r2 = (v: number) => Math.round(v * 100) / 100
export const rgba = (c: string, a: number) => `rgba(${c},${a})`
export type BBox = [number, number, number, number]

// Mirror a path (absolute M/L/C/Q/S/T commands only) around a vertical axis.
export function mir(d: string, ax = 70): string {
  return d.replace(/([MLCQST])([^MLCQSTZ]*)/g, (_m, c: string, args: string) => {
    const nums = args.trim().split(/[\s,]+/).filter(Boolean).map(Number)
    return c + nums.map((v, i) => (i % 2 === 0 ? r2(2 * ax - v) : v)).join(' ')
  })
}
export const both = (d: string, ax = 70) => d + mir(d, ax)

// Bounding box of a path written with absolute coordinate pairs.
export function bb(d: string): BBox {
  const v = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i + 1 < v.length; i += 2) {
    x0 = Math.min(x0, v[i])
    x1 = Math.max(x1, v[i])
    y0 = Math.min(y0, v[i + 1])
    y1 = Math.max(y1, v[i + 1])
  }
  return [x0, y0, x1, y1]
}

export const ink = (d: string, sw = 2.2, color: Paint = INK): VectorPath => ({ d, stroke: color, sw })
export const glow = (x: number, y: number, r: number, c: string, a = 0.6, blend: GlobalCompositeOperation = 'screen'): VectorPath => ({
  d: circ(x, y, r),
  fill: rad(x, y, r, 0, rgba(c, a), 0.4, rgba(c, +(a * 0.35).toFixed(3)), 1, rgba(c, 0)),
  blend,
})
export const blush = (x: number, y: number, r: number, c = '255,110,110', a = 0.5): VectorPath => ({
  d: circ(x, y, r),
  fill: rad(x, y, r, 0, rgba(c, a), 1, rgba(c, 0)),
})
// Ambient occlusion: a soft multiply spot limited to `clip`.
export const ao = (x: number, y: number, r: number, clip: string, color = '#6a5a70', sy = 1): VectorPath => ({
  d: ell(x, y, r, r * sy),
  fill: rad(x, y, r, 0, color, 1, '#ffffff'),
  clip,
  blend: 'multiply',
})

export interface FormOpts {
  sw?: number
  ink?: Paint
  shade?: string // core-shadow tint (multiplied)
  deep?: string // occlusion tint at the far side
  term?: number // terminator position 0..1 (smaller = more shadow)
  hi?: number // key-light sheen strength
  rim?: string // rim-light colour "r,g,b"
  rimW?: number
  box?: BBox
}

// A lit volume: base fill, multiply core shadow away from the upper-left key,
// a soft screen sheen toward the key, a coloured rim on the far edge, ink.
export function form(d: string, fill: Paint, o: FormOpts = {}): VectorPath[] {
  const [x0, y0, x1, y1] = o.box ?? bb(d)
  const w = x1 - x0
  const h = y1 - y0
  const lx = x0 + w * 0.28
  const ly = y0 + h * 0.2
  const R = Math.hypot(w, h) * 0.86
  const t = o.term ?? 0.36
  const out: VectorPath[] = [{ d, fill }]
  out.push({
    d,
    fill: rad(lx, ly, R, 0, '#ffffff', t, '#ffffff', Math.min(0.97, t + 0.16), o.shade ?? '#9a8cb4', 1, o.deep ?? '#54486e'),
    clip: d,
    blend: 'multiply',
  })
  if ((o.hi ?? 0.35) > 0) {
    out.push({ d, fill: rad(lx, ly, Math.max(w, h) * 0.42, 0, rgba('255,255,255', o.hi ?? 0.35), 1, 'rgba(255,255,255,0)'), clip: d, blend: 'screen' })
  }
  if (o.rim) {
    out.push({
      d,
      stroke: lin(x0, y0 + h * 0.2, x1, y1 - h * 0.1, 0, rgba(o.rim, 0), 0.62, rgba(o.rim, 0), 1, rgba(o.rim, 1)),
      sw: o.rimW ?? 7,
      clip: d,
      blend: 'screen',
    })
  }
  out.push({ d, stroke: o.ink ?? INK, sw: o.sw ?? 3.5 })
  return out
}

// Lit eye: white, gradient iris, pupil and specular dots.
export function eye(x: number, y: number, rx: number, ry: number, irisR: number, light: string, dark: string, dx = 0): VectorPath[] {
  const white = ell(x, y, rx, ry)
  return [
    { d: white, fill: radLit(x, y, Math.max(rx, ry) * 1.3, 0, '#ffffff', 1, '#cfd7e4') },
    { d: circ(x + dx, y + 0.4, irisR), fill: radLit(x + dx, y + 0.4, irisR, 0, light, 1, dark), clip: white },
    { d: circ(x + dx, y + 0.4, irisR * 0.48), fill: INK, clip: white },
    { d: ell(x, y - ry * 0.55, rx * 1.1, ry * 0.6), fill: 'rgba(60,40,80,0.28)', clip: white, blend: 'multiply' },
    { d: white, stroke: INK, sw: 2 },
    { d: circ(x + dx + irisR * 0.38, y - irisR * 0.32, irisR * 0.32), fill: '#ffffff' },
    { d: circ(x + dx - irisR * 0.35, y + irisR * 0.45, irisR * 0.14), fill: 'rgba(255,255,255,0.85)' },
  ]
}

export const STEEL = (x0: number, x1: number): Paint =>
  lin(x0, 0, x1, 0, 0, '#8a95a3', 0.12, '#e6ecf2', 0.28, '#ffffff', 0.44, '#b8c2cd', 0.62, '#8a95a4', 0.84, '#5f6977', 1, '#454d58')
export const GOLD = (x0: number, y0: number, x1: number, y1: number): Paint =>
  lin(x0, y0, x1, y1, 0, '#fff4b8', 0.35, '#f2c14e', 0.7, '#c98f1c', 1, '#8a5a08')
export const SKIN = (x: number, y: number, r: number): Paint => radLit(x, y, r, 0, '#ffe4ca', 0.55, '#f6be96', 1, '#dc9470')
export const METAL_SH = { shade: '#8a96ae', deep: '#363e54', term: 0.36, hi: 0.55 }
export const SKIN_SH = { shade: '#eaaca4', deep: '#b06878', term: 0.46, hi: 0.3 }

