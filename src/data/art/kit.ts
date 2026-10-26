import type { LinearPaint, RadialPaint, VectorPath } from '../../types'

// Drawing kit: tiny helpers that produce SVG path strings for hand-made
// illustrations. Everything is authored in "view units" and scaled at render.

export const INK = '#1b1712'

export interface Art {
  viewW: number
  viewH: number
  paths: VectorPath[]
}

// ---- paints & colour helpers --------------------------------------------------
// Linear gradient from (x0,y0) to (x1,y1); stops as alternating offset/colour.
export function lin(x0: number, y0: number, x1: number, y1: number, ...stops: (number | string)[]): LinearPaint {
  return { kind: 'linear', x0, y0, x1, y1, stops: pairs(stops) }
}

// Radial gradient; the focal point defaults to the upper-left for a lit-sphere look.
export function rad(cx: number, cy: number, r: number, ...stops: (number | string)[]): RadialPaint {
  return { kind: 'radial', cx, cy, r, stops: pairs(stops) }
}

export function radLit(cx: number, cy: number, r: number, ...stops: (number | string)[]): RadialPaint {
  return { kind: 'radial', cx, cy, r, fx: cx - r * 0.35, fy: cy - r * 0.4, stops: pairs(stops) }
}

function pairs(stops: (number | string)[]): [number, string][] {
  const out: [number, string][] = []
  for (let i = 0; i < stops.length; i += 2) out.push([stops[i] as number, stops[i + 1] as string])
  return out
}

// Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour; amt in [-1, 1].
export function shade(hex: string, amt: number): string {
  const v = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
  const out = c.map((x) => Math.round(amt >= 0 ? x + (255 - x) * amt : x * (1 + amt)))
  return '#' + out.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('')
}

// Soft contact shadow: stacked translucent ellipses fake a blurred edge
// (works everywhere, unlike canvas filters).
export function softShadow(cx: number, cy: number, rx: number, ry: number, alpha = 0.28, color = '0,0,0'): VectorPath[] {
  const steps = 6
  return Array.from({ length: steps }, (_, i) => {
    const k = 1 - i / (steps + 1)
    return { d: ell(cx, cy, rx * (0.55 + 0.45 * k), ry * (0.55 + 0.45 * k)), fill: `rgba(${color},${(alpha / steps).toFixed(3)})` }
  })
}

// Curved white gloss highlight along the upper-left of a shape.
export function gloss(d: string, width = 4, alpha = 0.7): VectorPath {
  return { d, stroke: `rgba(255,255,255,${alpha})`, sw: width }
}

const n = (v: number) => Math.round(v * 100) / 100

export function circ(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`
}

export function ell(cx: number, cy: number, rx: number, ry: number): string {
  return `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`
}

export function rect(x: number, y: number, w: number, h: number): string {
  return `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`
}

export function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2)
  return (
    `M${n(x + q)} ${n(y)}H${n(x + w - q)}Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + q)}` +
    `V${n(y + h - q)}Q${n(x + w)} ${n(y + h)} ${n(x + w - q)} ${n(y + h)}` +
    `H${n(x + q)}Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - q)}V${n(y + q)}Q${n(x)} ${n(y)} ${n(x + q)} ${n(y)}Z`
  )
}

export function poly(pts: number[], close = true): string {
  let d = ''
  for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${n(pts[i])} ${n(pts[i + 1])}`
  return close ? d + 'Z' : d
}

export function star(cx: number, cy: number, ro: number, ri: number, points = 5, rot = -90): string {
  const pts: number[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? ri : ro
    const a = ((rot + (i * 180) / points) * Math.PI) / 180
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  return poly(pts)
}

// Wobbly closed shape around a centre — handy for organic, hand-drawn forms.
export function blob(cx: number, cy: number, r: number, amp: number, freq: number, phase = 0, ry = r): string {
  const pts: number[] = []
  const steps = 96
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const k = 1 + (amp / r) * Math.sin(a * freq + phase) + (amp / r) * 0.4 * Math.sin(a * (freq * 2 + 1) + phase * 1.7)
    pts.push(cx + r * k * Math.cos(a), cy + ry * k * Math.sin(a))
  }
  return poly(pts)
}

export function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, phase = 0): string {
  const pts: number[] = []
  const steps = Math.round(turns * 60)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = r0 + (r1 - r0) * t
    const a = phase + t * turns * Math.PI * 2
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  return poly(pts, false)
}

// Deterministic PRNG so procedural details are identical on every render.
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Pixel art: one string per row, one character per pixel ('.' = empty).
// Horizontal runs of the same colour are merged into single rectangles.
export function pixels(map: string[], pal: Record<string, string>, size = 10, ox = 0, oy = 0): VectorPath[] {
  const byColor = new Map<string, string>()
  map.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      let run = 1
      while (x + run < row.length && row[x + run] === c) run++
      if (c !== '.' && pal[c]) {
        const d = rect(ox + x * size, oy + y * size, run * size + 0.4, size + 0.4)
        byColor.set(pal[c], (byColor.get(pal[c]) ?? '') + d)
      }
      x += run
    }
  })
  return [...byColor.entries()].map(([fill, d]) => ({ d, fill }))
}

// Cartoon cloud: thick ink outline drawn first, white fill on top, so only the
// outer contour of the overlapping puffs remains visible.
export function cloud(cx: number, cy: number, s: number, fill = '#ffffff', ink = INK): VectorPath[] {
  const parts = [
    circ(cx - 14 * s, cy + 2 * s, 10 * s),
    circ(cx, cy - 6 * s, 14 * s),
    circ(cx + 15 * s, cy + 1 * s, 11 * s),
    rrect(cx - 22 * s, cy, 46 * s, 12 * s, 6 * s),
  ]
  // Fill each puff on its own: arcs and the rounded rect wind in opposite
  // directions, so a single combined fill would punch holes where they overlap.
  return [{ d: parts.join(''), stroke: ink, sw: 5 * s }, ...parts.map((d) => ({ d, fill }))]
}

// Five-petal flower.
export function flower(cx: number, cy: number, r: number, petal: string, heart: string): VectorPath[] {
  let d = ''
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    d += circ(cx + r * 0.62 * Math.cos(a), cy + r * 0.62 * Math.sin(a), r * 0.48)
  }
  return [
    { d, fill: petal, stroke: INK, sw: Math.max(1.2, r * 0.18) },
    { d: circ(cx, cy, r * 0.38), fill: heart, stroke: INK, sw: Math.max(1, r * 0.14) },
  ]
}

// Scattered small dots (stars, specks) as a single path.
export function dots(count: number, seed: number, w: number, h: number, rmin: number, rmax: number): string {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < count; i++) d += circ(r() * w, r() * h, rmin + r() * (rmax - rmin))
  return d
}

// Flat-bottomed flame tongues across a band.
export function flames(w: number, h: number, base: number, tongues: number, seed: number): string {
  const r = rng(seed)
  let d = `M0 ${n(base)}`
  const step = w / tongues
  for (let i = 0; i < tongues; i++) {
    const x0 = i * step
    const peak = base - h * (0.45 + r() * 0.55)
    d += `Q${n(x0 + step * 0.15)} ${n(base - h * 0.3)} ${n(x0 + step * 0.5)} ${n(peak)}`
    d += `Q${n(x0 + step * 0.85)} ${n(base - h * 0.3)} ${n(x0 + step)} ${n(base - h * 0.08)}`
  }
  return d + `L${n(w)} ${n(base + 20)}L0 ${n(base + 20)}Z`
}

// Circle sliced into horizontal bands with growing gaps (retro sunset sun).
export function bandedSun(cx: number, cy: number, r: number, colors: string[], gapStart = 0.1): VectorPath[] {
  const out: VectorPath[] = []
  const bands = colors.length
  const top = cy - r
  const bandH = (2 * r) / bands
  for (let b = 0; b < bands; b++) {
    const y0 = top + b * bandH
    const frac = b / (bands - 1)
    const gap = frac > gapStart ? bandH * 0.42 * ((frac - gapStart) / (1 - gapStart)) : 0
    const y1 = y0 + bandH - gap
    const pts: number[] = []
    const steps = 10
    for (let i = 0; i <= steps; i++) {
      const y = y0 + ((y1 - y0) * i) / steps
      const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)))
      pts.push(cx + dx, y)
    }
    for (let i = steps; i >= 0; i--) {
      const y = y0 + ((y1 - y0) * i) / steps
      const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)))
      pts.push(cx - dx, y)
    }
    out.push({ d: poly(pts), fill: colors[b] })
  }
  return out
}

// Retro perspective grid floor from a horizon line.
export function perspectiveGrid(w: number, h: number, horizon: number, color: string, sw = 0.7): VectorPath {
  let d = ''
  const vx = w / 2
  for (let i = -12; i <= 12; i++) d += `M${n(vx + i * 2)} ${n(horizon)}L${n(vx + i * (w / 7))} ${n(h + 4)}`
  for (let k = 1; k <= 9; k++) {
    const y = horizon + (h - horizon) * Math.pow(k / 9, 1.9)
    d += `M0 ${n(y)}L${n(w)} ${n(y)}`
  }
  return { d, stroke: color, sw }
}

// Halftone dot field whose dot size fades from one corner.
export function halftone(w: number, h: number, step: number, rmax: number, fill: string): VectorPath {
  let d = ''
  const diag = Math.hypot(w, h)
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const r = rmax * (1 - Math.hypot(x, y) / diag)
      if (r > 0.25) d += circ(x + ((y / step) % 2 ? step / 2 : 0), y, r)
    }
  }
  return { d, fill }
}
