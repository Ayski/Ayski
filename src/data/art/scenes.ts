import type { Paint, VectorPath } from '../../types'
import { blob, circ, ell, gloss, INK, lin, poly, rad, radLit, rect, rng, rrect, softShadow, spiral, star, type Art } from './kit'

// Themed scene illustrations (comics, synthwave, tattoo flash, ukiyo-e, space,
// parody ID). Light comes from the upper-left everywhere; procedural details
// use the seeded PRNG so every render is identical.

// ---- local geometry helpers ------------------------------------------------
type P = [number, number]
const n2 = (v: number) => Math.round(v * 100) / 100
const TAU = Math.PI * 2

// Catmull-Rom spline through the points, as cubic Béziers.
function smooth(pts: P[], closed = true, k = 1): string {
  const len = pts.length
  const at = (i: number): P => (closed ? pts[(i + len) % len] : pts[Math.max(0, Math.min(len - 1, i))])
  let d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`
  const segs = closed ? len : len - 1
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * k
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * k
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * k
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * k
    d += `C${n2(c1x)} ${n2(c1y)} ${n2(c2x)} ${n2(c2y)} ${n2(p2[0])} ${n2(p2[1])}`
  }
  return closed ? d + 'Z' : d
}

const pl = (pts: P[], close = true) => poly(pts.flat(), close)
const off = (pts: P[], dx: number, dy: number): P[] => pts.map(([x, y]) => [x + dx, y + dy])

function area(pts: P[]): number {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  return a
}
// Force one winding direction so several sub-paths in one fill always union.
const cw = (pts: P[]): P[] => (area(pts) < 0 ? [...pts].reverse() : pts)

function inside(x: number, y: number, pg: P[]): boolean {
  let c = false
  for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
    const [xi, yi] = pg[i]
    const [xj, yj] = pg[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

// Ben-Day / halftone dots on a staggered grid, optionally clipped to a polygon.
function dotsIn(pg: P[] | null, x0: number, y0: number, x1: number, y1: number, step: number, rOf: (x: number, y: number) => number): string {
  let d = ''
  let row = 0
  for (let y = y0; y <= y1; y += step * 0.866, row++) {
    for (let x = x0 + (row % 2 ? step / 2 : 0); x <= x1; x += step) {
      const r = rOf(x, y)
      if (r > 0.14 && (!pg || inside(x, y, pg))) d += circ(x, y, r)
    }
  }
  return d
}

function cubicPts(p0: P, c1: P, c2: P, p3: P, steps = 16): P[] {
  const out: P[] = []
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
    ])
  }
  return out
}

// Project points that fall outside a circle onto its rim (cheap clip for convex discs).
function clampToCircle(pts: P[], cx: number, cy: number, r: number): P[] {
  return pts.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const dd = Math.hypot(dx, dy)
    return dd > r ? [cx + (dx / dd) * r, cy + (dy / dd) * r] : [x, y]
  })
}

// Neon tube: wide translucent strokes under a bright core fake the glow.
function neon(d: string, color: string, sw: number, core = '#ffffff'): VectorPath[] {
  return [
    { d, stroke: color, sw: sw * 9, alpha: 0.06 },
    { d, stroke: color, sw: sw * 5.5, alpha: 0.12 },
    { d, stroke: color, sw: sw * 3, alpha: 0.3 },
    { d, stroke: color, sw: sw * 1.5 },
    { d, stroke: core, sw: sw * 0.55, alpha: 0.85 },
  ]
}

function halo(cx: number, cy: number, r: number, rgb: string, a: number): VectorPath {
  return { d: circ(cx, cy, r), fill: rad(cx, cy, r, 0, `rgba(${rgb},${a})`, 1, `rgba(${rgb},0)`) }
}

const sparkle = (cx: number, cy: number, r: number) => star(cx, cy, r, r * 0.2, 4, -90)

// Light-source bloom (screen-blended so it brightens whatever is underneath).
function bloom(cx: number, cy: number, r: number, rgb: string, a: number, blend: GlobalCompositeOperation = 'screen'): VectorPath {
  return { d: circ(cx, cy, r), fill: rad(cx, cy, r, 0, `rgba(${rgb},${a})`, 0.3, `rgba(${rgb},${a * 0.45})`, 1, `rgba(${rgb},0)`), blend }
}

// Volumetric light shafts fanning out of a source point.
function godRays(cx: number, cy: number, degs: number[], len: number, spread: number, rgb: string, a: number): VectorPath {
  let d = ''
  degs.forEach((deg, i) => {
    const t = (deg * Math.PI) / 180
    const sp = spread * (0.6 + ((i * 37) % 10) / 12)
    d += pl([[cx, cy], [cx + Math.cos(t - sp) * len, cy + Math.sin(t - sp) * len], [cx + Math.cos(t + sp) * len, cy + Math.sin(t + sp) * len]])
  })
  return { d, fill: rad(cx, cy, len, 0, `rgba(${rgb},${a})`, 1, `rgba(${rgb},0)`), blend: 'screen' }
}

// Shade inside a shape (multiply by default) without spilling outside it.
const shadeIn = (shape: string, fill: Paint, blend: GlobalCompositeOperation = 'multiply', alpha = 1): VectorPath => ({ d: shape, fill, blend, alpha })

// Star sky: mostly tiny stars, a few bright ones.
function starDots(seed: number, count: number, w: number, h: number, rmin: number, rmax: number, y0 = 0): string {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < count; i++) d += circ(r() * w, y0 + r() * h, rmin + (rmax - rmin) * Math.pow(r(), 3))
  return d
}

// ============================================================================
// COMICS
// ============================================================================
function burstPts(cx: number, cy: number, ro: number, ri: number, spikes: number, seed: number, squash = 0.74, rot = 0): P[] {
  const r = rng(seed)
  const out: P[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const outer = i % 2 === 0
    const rr = outer ? ro * (0.8 + r() * 0.26) : ri * (0.9 + r() * 0.18)
    const a = rot + ((i + (r() - 0.5) * 0.45) / (spikes * 2)) * TAU
    out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a) * squash])
  }
  return out
}

function sunRays(cx: number, cy: number, count: number, len: number, rot = 0): string {
  let d = ''
  for (let i = 0; i < count; i += 2) {
    const a0 = rot + (i / count) * TAU
    const a1 = rot + ((i + 1) / count) * TAU
    d += pl([[cx, cy], [cx + len * Math.cos(a0), cy + len * Math.sin(a0)], [cx + len * Math.cos(a1), cy + len * Math.sin(a1)]])
  }
  return d
}

// Tapered speed lines radiating from a centre (thin at the inner end).
function speedLines(cx: number, cy: number, count: number, r0: number, r1: number, wmax: number, seed: number, squash = 0.75): string {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < count; i++) {
    const a = r() * TAU
    const ra = r0 + r() * (r1 - r0) * 0.25
    const ca = Math.cos(a)
    const sa = Math.sin(a) * squash
    const p0: P = [cx + ra * ca, cy + ra * sa]
    const p1: P = [cx + r1 * ca, cy + r1 * sa]
    const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    const nx = -(p1[1] - p0[1]) / l
    const ny = (p1[0] - p0[0]) / l
    const w = wmax * (0.4 + r() * 0.6)
    d += pl([p0, [p1[0] + nx * w, p1[1] + ny * w], [p1[0] - nx * w, p1[1] - ny * w]])
  }
  return d
}

export function boomBackdrop(): Art {
  const cx = 80
  const cy = 50
  const r = rng(77)
  // debris chunks flying out of the blast, each with a motion trail
  const shards: VectorPath[] = []
  ;[[16, 22, 0.4], [146, 18, 1.2], [150, 80, 2.2], [10, 80, 3.1], [124, 95, 4], [34, 95, 5.2], [80, 4, 0.9]].forEach(([x, y, a], k) => {
    const s = 2.4 + r() * 1.8
    const pts: P[] = [0, 1, 2, 3, 4].map((j) => {
      const ang = a + (j / 5) * TAU + (r() - 0.5) * 0.7
      const rr = s * (0.6 + r() * 0.6)
      return [x + rr * Math.cos(ang), y + rr * Math.sin(ang)]
    })
    const dx = (x - cx) / Math.hypot(x - cx, y - cy)
    const dy = (y - cy) / Math.hypot(x - cx, y - cy)
    shards.push(
      { d: `M${n2(x - dx * 4)} ${n2(y - dy * 4)}L${n2(x - dx * 14)} ${n2(y - dy * 14)}M${n2(x - dx * 3 + dy * 2)} ${n2(y - dy * 3 - dx * 2)}L${n2(x - dx * 10 + dy * 2)} ${n2(y - dy * 10 - dx * 2)}`, stroke: INK, sw: 0.7, alpha: 0.6 },
      { d: pl(off(pts, 0.9, 1)), fill: INK },
      { d: pl(pts), fill: k % 2 ? '#ff8a1c' : '#6b5a7a', stroke: INK, sw: 0.8 },
      { d: pl(pts), fill: lin(x - s, y - s, x + s, y + s, 0, 'rgba(255,255,255,0.55)', 0.5, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.3)'), blend: 'overlay' },
    )
  })
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: sunRays(cx, cy, 36, 200, 0.05), fill: '#ffbf2e' },
      { d: dotsIn(null, 0, 0, 162, 103, 3.4, (x, y) => Math.min(1.35, Math.max(0, (Math.hypot(x - cx, (y - cy) * 1.35) - 40) / 44) * 1.35)), fill: '#e8384f', alpha: 0.42 },
      { d: rect(0, 0, 160, 101), fill: rad(cx, cy, 110, 0, 'rgba(0,0,0,0)', 0.55, 'rgba(0,0,0,0)', 1, 'rgba(120,20,40,0.45)'), blend: 'multiply' },
      bloom(cx, cy, 70, '255,240,170', 0.8),
      { d: speedLines(cx, cy, 52, 64, 130, 1.1, 5), fill: INK, alpha: 0.55 },
      ...shards,
    ],
  }
}

export function boomBurst(): Art {
  const cx = 100
  const cy = 78
  const outer = burstPts(cx, cy, 99, 60, 15, 4)
  const mid = burstPts(cx, cy + 1, 71, 46, 13, 8, 0.74, 0.2)
  const core = burstPts(cx, cy + 2, 47, 33, 11, 12, 0.74, 0.1)
  const shadeDots = dotsIn(outer, 0, 0, 200, 156, 4, (x, y) => (inside(x, y, mid) ? 0 : Math.min(1.6, Math.max(0, (x - 85 + (y - 70) * 1.5) / 75) * 1.6)))
  // billowing smoke around the base, lit by the blast itself
  const r = rng(17)
  let puffs = ''
  for (let i = 0; i < 17; i++) {
    const a = Math.PI * (-0.12 + (i / 16) * 1.24)
    const pr = 11 + r() * 7
    const rr = 84 + r() * 12
    puffs += circ(cx + rr * Math.cos(a), cy + 6 + rr * 0.7 * Math.sin(a), pr)
  }
  const sparks = sparkle(cx - 22, cy - 14, 10) + sparkle(cx + 26, cy + 8, 7) + sparkle(cx + 6, cy - 26, 5) + sparkle(cx - 8, cy + 20, 4.5)
  return {
    viewW: 200,
    viewH: 156,
    paths: [
      { d: puffs, stroke: INK, sw: 6 },
      { d: puffs, fill: '#efe9f2' },
      shadeIn(puffs, rad(cx, cy, 120, 0, '#ffffff', 0.6, '#d8cde0', 1, '#5b4a72')),
      shadeIn(puffs, rad(cx, cy, 104, 0, 'rgba(255,190,80,0.85)', 0.75, 'rgba(255,170,60,0.35)', 1, 'rgba(255,170,60,0)'), 'screen'),
      { d: dotsIn(null, 0, 0, 200, 156, 3.6, (x, y) => Math.max(0, (Math.hypot(x - cx, (y - cy) * 1.3) - 95) / 30) * 1.4), fill: '#4a3a62', alpha: 0.5, clip: puffs },
      { d: pl(off(outer, 6, 7)), fill: INK },
      { d: pl(outer), fill: lin(20, 10, 180, 140, 0, '#ff6461', 0.55, '#e63946', 1, '#b5172b') },
      { d: shadeDots, fill: '#7d0b1b', alpha: 0.6 },
      { d: pl(outer), stroke: INK, sw: 5 },
      { d: pl(off(mid, 3, 3.5)), fill: 'rgba(110,10,20,0.45)' },
      { d: pl(mid), fill: lin(40, 30, 160, 125, 0, '#ffd23f', 1, '#ff7b00'), stroke: INK, sw: 2.8 },
      { d: pl(core), fill: radLit(cx, cy + 2, 50, 0, '#ffffff', 0.4, '#fff7b8', 1, '#ffd84a') },
      bloom(cx, cy, 64, '255,255,235', 0.95),
      { d: ell(cx, cy + 2, 30, 21), stroke: '#ffffff', sw: 1.6, alpha: 0.8 },
      { d: sparks, fill: '#ffffff', stroke: INK, sw: 1.6 },
    ],
  }
}

export function heroCity(): Art {
  const r = rng(12)
  const paths: VectorPath[] = [
    { d: rect(0, 0, 160, 101), fill: lin(0, 0, 0, 101, 0, '#121a66', 0.42, '#3553d6', 0.78, '#ff8a6a', 1, '#ffd37a') },
    { d: dotsIn(null, 0, 0, 162, 92, 3.4, (x, y) => Math.min(1.1, Math.max(0, (Math.hypot(x - 22, y - 74) - 26) / 80) * 1.3)), fill: '#ffffff', alpha: 0.14 },
    godRays(22, 74, [-84, -66, -48, -32, -16, -2], 170, 0.045, '255,220,170', 0.28),
    bloom(22, 74, 48, '255,190,120', 0.8),
    { d: circ(22, 74, 8), fill: radLit(22, 74, 8, 0, '#fffdf0', 1, '#ffd36b') },
  ]
  // searchlight beams from the rooftops
  ;[[62, -16], [112, 20], [140, -4]].forEach(([x, deg]) => {
    const t = ((deg - 90) * Math.PI) / 180
    const L = 120
    const tx = x + Math.cos(t) * L
    const ty = 84 + Math.sin(t) * L
    const nx = -Math.sin(t)
    const ny = Math.cos(t)
    paths.push({ d: pl([[x - nx * 0.8, 84 - ny * 0.8], [tx - nx * 11, ty - ny * 11], [tx + nx * 11, ty + ny * 11], [x + nx * 0.8, 84 + ny * 0.8]]), fill: lin(x, 84, tx, ty, 0, 'rgba(255,248,210,0.55)', 1, 'rgba(255,248,210,0)'), blend: 'screen' })
  })
  // far skyline: hazy and pale (atmospheric perspective)
  let far = ''
  let x = -2
  while (x < 162) {
    const w = 5 + r() * 8
    const top = 68 + r() * 12
    far += rect(x, top, w, 40)
    x += w + 0.4
  }
  paths.push({ d: far, fill: lin(0, 68, 0, 101, 0, '#a69ce0', 1, '#6a64c4') })
  paths.push({ d: rect(0, 66, 160, 35), fill: lin(0, 66, 0, 101, 0, 'rgba(255,180,150,0)', 1, 'rgba(255,180,150,0.4)'), blend: 'screen' })
  // near buildings: lit front, dark side, bright roof, ambient occlusion at street level
  x = -6
  while (x < 164) {
    const w = 11 + r() * 9
    const h = 9 + Math.pow(r(), 1.4) * 26
    const base = 103
    const top = base - h
    const dx = 3
    const dy = 2
    const front = rect(x, top, w, h)
    const side = pl([[x + w, top], [x + w + dx, top - dy], [x + w + dx, base], [x + w, base]])
    const roof = pl([[x, top], [x + dx, top - dy], [x + w + dx, top - dy], [x + w, top]])
    let wl = ''
    let wd = ''
    for (let wy = top + 2.4; wy < base - 4; wy += 3.4)
      for (let wx = x + 1.8; wx < x + w - 2.2; wx += 3) {
        if (r() < 0.55) wl += rect(wx, wy, 1.5, 1.9)
        else wd += rect(wx, wy, 1.5, 1.9)
      }
    paths.push(
      { d: side, fill: lin(x + w, 0, x + w + dx, 0, 0, '#161c58', 1, '#0b0f36') },
      { d: front, fill: lin(x, top, x + w, base, 0, '#4558cc', 1, '#25338f') },
      { d: roof, fill: '#9aaaff' },
      { d: wd, fill: '#1a2263' },
      { d: wl, fill: '#ffe27a' },
      shadeIn(front, lin(0, top, 0, base, 0, 'rgba(255,255,255,1)', 1, 'rgba(20,20,70,1)'), 'multiply', 0.55),
      { d: `M${n2(x + 0.25)} ${n2(base)}V${n2(top)}L${n2(x + dx)} ${n2(top - dy)}`, stroke: '#ffd0a0', sw: 0.55, alpha: 0.9 },
      { d: front + side + roof, stroke: INK, sw: 0.55 },
    )
    x += w + dx + 0.3
  }
  paths.push({ d: rect(0, 90, 160, 11), fill: lin(0, 90, 0, 101, 0, 'rgba(255,255,255,1)', 1, 'rgba(10,10,40,1)'), blend: 'multiply', alpha: 0.6 })
  return { viewW: 160, viewH: 101, paths }
}

export function heroEmblem(): Art {
  const CX = 168
  const CY = 112
  const T = (s: number, dx: number, dy: number) => (x: number, y: number): P => [CX + (x - 100) * s + dx, CY + (y - 104) * s + dy]
  const shieldPts = (s: number, dx = 0, dy = 0): P[] => {
    const t = T(s, dx, dy)
    return [
      ...cubicPts(t(100, 12), t(128, 26), t(150, 30), t(172, 30)),
      ...cubicPts(t(172, 30), t(176, 104), t(150, 160), t(100, 196)),
      ...cubicPts(t(100, 196), t(50, 160), t(24, 104), t(28, 30)),
      ...cubicPts(t(28, 30), t(50, 30), t(72, 26), t(100, 12)),
    ]
  }
  const outer = shieldPts(1)
  const field = shieldPts(0.8)
  const half = field.filter(([px]) => px >= CX - 0.01)
  const t = T(1, 0, 0)
  const bolt: P[] = [t(114, 40), t(68, 112), t(96, 112), t(80, 170), t(136, 90), t(106, 90), t(126, 40)]
  const fieldDots = dotsIn(field, 0, 0, 260, 230, 4.2, (px, py) => Math.min(1.5, Math.max(0, (py - CY - 10) / 60 + (px - CX) / 120) * 1.8))
  // swooshes trailing behind (flying up-right)
  const streak = (y0: number, len: number, w: number) =>
    `M${CX - 40} ${y0 - w}Q${CX - 40 - len * 0.5} ${y0 - w + len * 0.18} ${CX - 40 - len} ${y0 + len * 0.42}Q${CX - 40 - len * 0.45} ${y0 + w + len * 0.2} ${CX - 40} ${y0 + w}Z`
  const streaks = streak(CY + 6, 120, 13) + streak(CY + 48, 92, 9) + streak(CY - 34, 74, 7)
  return {
    viewW: 270,
    viewH: 230,
    paths: [
      { d: streaks, fill: 'rgba(255,255,255,0.92)', stroke: INK, sw: 3 },
      { d: streak(CY + 6, 120, 13), stroke: '#9bdcff', sw: 2, alpha: 0.9 },
      { d: pl(off(outer, 8, 9)), fill: INK },
      { d: pl(outer), fill: lin(CX - 70, 20, CX + 70, 200, 0, '#fff4b0', 0.35, '#ffcf3f', 0.7, '#e09a00', 1, '#a86400'), stroke: INK, sw: 5 },
      shadeIn(pl(outer), rad(CX - 50, CY - 70, 110, 0, 'rgba(255,255,230,0.9)', 1, 'rgba(255,255,230,0)'), 'screen'),
      { d: pl(field), fill: radLit(CX, CY - 10, 90, 0, '#ff7b7b', 0.45, '#e63946', 1, '#8f0a1a'), stroke: INK, sw: 3 },
      shadeIn(pl(field), rad(CX - 30, CY - 40, 150, 0, '#ffffff', 0.5, '#ffffff', 1, '#3a0010'), 'multiply', 0.8),
      { d: pl(half), fill: 'rgba(60,0,10,0.18)' },
      { d: fieldDots, fill: '#5c0010', alpha: 0.45 },
      { d: pl(off(bolt, 6, 6)), fill: 'rgba(70,0,10,0.7)' },
      { d: pl(bolt), fill: lin(CX - 30, 40, CX + 30, 170, 0, '#fffbd0', 0.4, '#ffe14d', 1, '#f59f00'), stroke: INK, sw: 4 },
      gloss(smooth([t(44, 42), t(70, 34), t(98, 22)], false), 5, 0.75),
      gloss(smooth([t(38, 60), t(40, 90), t(52, 124)], false), 4, 0.45),
      { d: smooth([t(120, 48), t(110, 64)], false), stroke: 'rgba(255,255,255,0.85)', sw: 3 },
      bloom(t(50, 38)[0], t(50, 38)[1], 18, '255,255,240', 0.9),
      { d: sparkle(t(50, 38)[0], t(50, 38)[1], 10), fill: '#ffffff' },
    ],
  }
}


// ============================================================================
// SYNTHWAVE
// ============================================================================
function sunBands(cx: number, cy: number, r: number, bands: number, gapFrom: number): string {
  let d = ''
  const bandH = (2 * r) / bands
  for (let b = 0; b < bands; b++) {
    const y0 = cy - r + b * bandH
    const fr = b / (bands - 1)
    const gap = fr > gapFrom ? bandH * 0.62 * ((fr - gapFrom) / (1 - gapFrom)) : 0
    const y1 = y0 + bandH - gap
    const pts: P[] = []
    for (let i = 0; i <= 8; i++) {
      const y = y0 + ((y1 - y0) * i) / 8
      pts.push([cx + Math.sqrt(Math.max(0, r * r - (y - cy) ** 2)), y])
    }
    for (let i = 8; i >= 0; i--) {
      const y = y0 + ((y1 - y0) * i) / 8
      pts.push([cx - Math.sqrt(Math.max(0, r * r - (y - cy) ** 2)), y])
    }
    d += pl(pts)
  }
  return d
}

function grid(H: number, cx: number): string {
  let d = ''
  for (let i = -15; i <= 15; i++) d += `M${n2(cx + i * 1.4)} ${H}L${n2(cx + i * 15)} 103`
  for (let k = 1; k <= 11; k++) {
    const y = H + (103 - H) * Math.pow(k / 11, 2.1)
    d += `M0 ${n2(y)}L160 ${n2(y)}`
  }
  return d
}

function ridge(pts: P[], base: number): string {
  return pl([[pts[0][0], base], ...pts, [pts[pts.length - 1][0], base]])
}

export function outrunScene(): Art {
  const H = 62
  const far: P[] = [[-2, 54], [10, 50], [20, 53], [30, 46], [40, 52], [48, 49], [56, 55], [66, 51], [74, 57], [86, 56], [96, 50], [106, 54], [114, 47], [124, 52], [134, 45], [144, 51], [152, 48], [162, 53]]
  const nearL: P[] = [[-2, 40], [8, 44], [16, 36], [28, 50], [36, 47], [48, 62]]
  const nearR: P[] = [[112, 62], [122, 49], [130, 52], [142, 38], [150, 44], [162, 36]]
  const wire = (pts: P[]) => pts.map(([x, y], i) => (i % 2 === 0 ? '' : `M${x} ${y}L${x - 6} ${H}M${x} ${y}L${x + 7} ${H}`)).join('')
  // sun reflection on the floor
  let refl = ''
  for (let k = 0; k < 9; k++) {
    const y = H + 1.2 + k * k * 0.45 + k * 0.9
    const w = 22 * (1 - k / 11)
    refl += rect(80 - w, y, w * 2, 0.7 + k * 0.12)
  }
  // road with perspective dashes
  const roadW = (y: number) => 2.2 + ((y - H) / (101 - H)) * 46
  let dashes = ''
  for (let k = 0; k < 7; k++) {
    const y0 = H + (101 - H) * Math.pow(k / 7, 1.8) + 0.6
    const y1 = H + (101 - H) * Math.pow((k + 0.55) / 7, 1.8)
    const w0 = roadW(y0) * 0.035
    const w1 = roadW(y1) * 0.035
    dashes += pl([[80 - w0, y0], [80 + w0, y0], [80 + w1, y1], [80 - w1, y1]])
  }
  // rear view of a retro coupé
  const car: VectorPath[] = [
    ...softShadow(80, 98.6, 27, 3.2, 0.7, '0,0,0'),
    { d: rrect(61, 90, 8.5, 9, 1.6) + rrect(90.5, 90, 8.5, 9, 1.6), fill: '#05010a' },
    { d: pl([[57, 92.5], [103, 92.5], [104, 84.5], [100, 78.5], [60, 78.5], [56, 84.5]]), fill: lin(0, 78, 0, 93, 0, '#4a1675', 1, '#16041f') },
    { d: pl([[66, 78.6], [94, 78.6], [89, 69.5], [71, 69.5]]), fill: lin(0, 69, 0, 79, 0, '#2a0f45', 1, '#14051f') },
    { d: pl([[68.6, 77.6], [91.4, 77.6], [87.6, 71], [72.4, 71]]), fill: lin(0, 71, 0, 78, 0, '#ff8ccf', 0.5, '#9a2a8a', 1, '#2b0c4a') },
    { d: 'M58 86.6H102M58 88.4H102M58 90.2H102', stroke: '#0a0212', sw: 0.6 },
    ...neon('M61 82.3H99', '#ff2a4d', 0.9, '#ffd0d8'),
    { d: rrect(75, 86.2, 10, 4, 0.6), fill: '#efe6ff', stroke: '#0a0212', sw: 0.4 },
    ...neon('M60.4 78.6H99.6', '#ff7ad9', 0.32),
    ...neon('M71.4 69.6H88.6', '#ff9ee8', 0.25),
    shadeIn(pl([[68.6, 77.6], [91.4, 77.6], [87.6, 71], [72.4, 71]]), lin(70, 71, 80, 78, 0, 'rgba(255,255,255,0)', 0.45, 'rgba(255,255,255,0.55)', 0.55, 'rgba(255,255,255,0)'), 'screen'),
    bloom(61, 82.3, 6, '255,60,90', 0.9, 'lighter'),
    bloom(99, 82.3, 6, '255,60,90', 0.9, 'lighter'),
    { d: sparkle(60.6, 78.8, 1.8) + sparkle(88.4, 69.8, 1.3), fill: '#ffffff' },
  ]
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: rect(0, 0, 160, H + 1), fill: lin(0, 0, 0, H, 0, '#06011a', 0.45, '#2a0752', 0.8, '#8a1471', 1, '#ff3d7f') },
      { d: starDots(3, 80, 160, 40, 0.18, 0.7), fill: '#ffffff', alpha: 0.85 },
      { d: sparkle(20, 12, 2.2) + sparkle(140, 20, 1.8) + sparkle(118, 8, 1.4), fill: '#ffffff' },
      halo(20, 12, 4, '255,180,255', 0.5),
      halo(80, 38, 62, '255,61,140', 0.6),
      { d: sunBands(80, 38, 27, 13, 0.24), fill: lin(0, 11, 0, 65, 0, '#fff7a8', 0.32, '#ffc84a', 0.66, '#ff5f7a', 1, '#e8178a') },
      bloom(80, 38, 40, '255,200,150', 0.45),
      { d: ridge(far, H + 1), fill: lin(0, 44, 0, H, 0, '#3d0f6e', 1, '#1a0636') },
      ...neon(pl(far, false), '#ff4fd8', 0.28),
      { d: rect(0, 44, 160, H - 44), fill: lin(0, 44, 0, H, 0, 'rgba(255,80,160,0)', 1, 'rgba(255,100,170,0.5)'), blend: 'screen' },
      { d: ridge(nearL, H + 1) + ridge(nearR, H + 1), fill: lin(0, 36, 0, H, 0, '#1e0640', 1, '#0b0119') },
      shadeIn(ridge(nearL, H + 1), lin(48, 0, 0, 0, 0, 'rgba(255,90,180,0.45)', 0.5, 'rgba(255,90,180,0)'), 'screen'),
      shadeIn(ridge(nearR, H + 1), lin(112, 0, 160, 0, 0, 'rgba(255,90,180,0.45)', 0.5, 'rgba(255,90,180,0)'), 'screen'),
      { d: wire(nearL) + wire(nearR), stroke: '#c13cff', sw: 0.35, alpha: 0.45 },
      ...neon(pl(nearL, false) + pl(nearR, false), '#38e8ff', 0.3),
      { d: rect(0, H, 160, 101 - H), fill: lin(0, H, 0, 101, 0, '#2a0848', 1, '#05010d') },
      { d: refl, fill: lin(0, H, 0, H + 30, 0, 'rgba(255,120,170,0.75)', 1, 'rgba(255,60,140,0)') },
      ...neon(grid(H, 80), '#ff2e97', 0.32, '#ffb3e6'),
      { d: rect(0, H, 160, 12), fill: lin(0, H, 0, H + 12, 0, 'rgba(120,16,110,0.95)', 1, 'rgba(120,16,110,0)') },
      { d: pl([[78.9, H], [81.1, H], [80 + roadW(103) / 2, 103], [80 - roadW(103) / 2, 103]]), fill: lin(0, H, 0, 101, 0, '#1c0436', 1, '#0a0116') },
      ...neon(`M78.9 ${H}L${80 - roadW(103) / 2} 103M81.1 ${H}L${80 + roadW(103) / 2} 103`, '#38e8ff', 0.32),
      { d: dashes, fill: '#ffe98a', alpha: 0.9 },
      { d: rect(0, H - 5, 160, 10), fill: lin(0, H - 5, 0, H + 5, 0, 'rgba(255,80,160,0)', 0.5, 'rgba(255,110,180,0.55)', 1, 'rgba(255,80,160,0)') },
      ...neon(`M0 ${H}H160`, '#ff6ad5', 0.32),
      ...car,
    ],
  }
}

// Silhouetted palm: tapered ringed trunk + serrated, drooping fronds.
function palmTree(bx: number, by: number, tx: number, ty: number, s: number, seed: number, lean = 1): { trunk: string; fronds: string; nuts: string } {
  const r = rng(seed)
  const c: P = [(bx + tx) / 2 + 10 * s * lean, (by + ty) / 2 + 4 * s]
  const B = (t: number): P => [
    (1 - t) ** 2 * bx + 2 * (1 - t) * t * c[0] + t * t * tx,
    (1 - t) ** 2 * by + 2 * (1 - t) * t * c[1] + t * t * ty,
  ]
  const left: P[] = []
  const right: P[] = []
  const N = 30
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const p = B(t)
    const q = B(Math.min(1, t + 0.01))
    const p0 = B(Math.max(0, t - 0.01))
    const dx = q[0] - p0[0]
    const dy = q[1] - p0[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = -dy / l
    const ny = dx / l
    const w = s * (2.5 - 1.3 * t) * (i % 2 ? 1.12 : 1)
    left.push([p[0] + nx * w, p[1] + ny * w])
    right.push([p[0] - nx * w, p[1] - ny * w])
  }
  const trunk = pl(cw([...left, ...right.reverse()]))
  let fronds = ''
  const angles = [-172, -146, -118, -92, -64, -36, -8, 16, 198]
  angles.forEach((deg) => {
    const a = ((deg + (r() - 0.5) * 10) * Math.PI) / 180
    const L = s * (17 + r() * 6)
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const E: P = [tx + L * ca, ty + L * sa + L * 0.42 * Math.abs(ca) + L * 0.15]
    const C1: P = [tx + L * 0.55 * ca, ty + L * 0.55 * sa - L * 0.16]
    const Q = (t: number): P => [
      (1 - t) ** 2 * tx + 2 * (1 - t) * t * C1[0] + t * t * E[0],
      (1 - t) ** 2 * ty + 2 * (1 - t) * t * C1[1] + t * t * E[1],
    ]
    const up: P[] = []
    const dn: P[] = []
    const M = 26
    for (let i = 0; i <= M; i++) {
      const t = i / M
      const p = Q(t)
      const q = Q(Math.min(1, t + 0.02))
      const p0 = Q(Math.max(0, t - 0.02))
      const dx = q[0] - p0[0]
      const dy = q[1] - p0[1]
      const l = Math.hypot(dx, dy) || 1
      let nx = -dy / l
      let ny = dx / l
      if (ny < 0) {
        nx = -nx
        ny = -ny
      }
      const tooth = i % 2 === 1 && i > 2 && i < M - 1
      const wd = s * 3.6 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9) * (tooth ? 1 : 0.62)
      const wu = s * 1.3 * Math.pow(Math.sin(Math.PI * t), 0.8) * (tooth ? 1 : 0.7)
      const fwd = tooth ? 0.5 * s : 0
      dn.push([p[0] + nx * wd + (dx / l) * fwd, p[1] + ny * wd + (dy / l) * fwd])
      up.push([p[0] - nx * wu + (dx / l) * fwd, p[1] - ny * wu + (dy / l) * fwd])
    }
    fronds += pl(cw([...up, ...dn.reverse()]))
  })
  const nuts = circ(tx - 1.4 * s, ty + 1.8 * s, 1.3 * s) + circ(tx + 1.3 * s, ty + 2.2 * s, 1.2 * s) + circ(tx, ty + 3.2 * s, 1.2 * s)
  return { trunk, fronds, nuts }
}

// Thin lens-shaped cloud streak.
const lens = (x: number, y: number, w: number, h: number) => `M${n2(x - w / 2)} ${n2(y)}Q${n2(x - w * 0.1)} ${n2(y - h)} ${n2(x + w / 2)} ${n2(y)}Q${n2(x + w * 0.05)} ${n2(y + h * 0.45)} ${n2(x - w / 2)} ${n2(y)}Z`

export function neonPalmScene(): Art {
  const H = 66
  const r = rng(8)
  let refl = ''
  for (let k = 0; k < 13; k++) {
    const y = H + 1.6 + k * 2.6
    const w = 26 * (1 - k / 15)
    let x = 80 - w
    while (x < 80 + w) {
      const seg = 3 + r() * 8
      refl += `M${n2(x)} ${n2(y)}H${n2(Math.min(80 + w, x + seg))}`
      x += seg + 1 + r() * 3
    }
  }
  let glints = ''
  for (let i = 0; i < 26; i++) {
    const y = H + 1 + Math.pow(r(), 1.6) * 28
    const w = 0.6 + r() * 1.8
    const x = 80 + (r() - 0.5) * (44 - (y - H))
    glints += rrect(x - w, y - 0.18, w * 2, 0.36, 0.18)
  }
  const p1 = palmTree(6, 104, 30, 24, 1.15, 3, 1)
  const p2 = palmTree(158, 104, 134, 30, 1.0, 5, -1)
  const p3 = palmTree(116, 66, 121, 46, 0.42, 7, 0.6)
  const SIL = '#0d0217'
  const hillL: P[] = [[-2, H], [-2, 60], [14, 57], [30, 60], [44, 64], [52, H]]
  const hillR: P[] = [[100, H], [110, 62], [124, 59], [140, 61], [162, 57], [162, H]]
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: rect(0, 0, 160, H + 1), fill: lin(0, 0, 0, H, 0, '#120430', 0.4, '#4a1172', 0.72, '#c2266f', 0.9, '#ff6b5a', 1, '#ffb36b') },
      { d: starDots(41, 55, 160, 30, 0.18, 0.6), fill: '#ffffff', alpha: 0.75 },
      halo(80, 50, 52, '255,90,150', 0.55),
      godRays(80, 49, [-170, -150, -128, -106, -74, -52, -30, -10], 120, 0.035, '255,190,160', 0.22),
      ...neon(pl([[80, 9], [117, H], [43, H]]), '#3ef0ff', 0.4),
      { d: sunBands(80, 49, 21, 10, 0.4), fill: lin(0, 28, 0, 70, 0, '#fff4a6', 0.4, '#ffb347', 1, '#ff3f7f') },
      { d: lens(70, 56, 46, 3) + lens(96, 60, 48, 2.4) + lens(50, 51, 30, 2) + lens(124, 41, 40, 2) + lens(32, 34, 34, 1.8) + lens(128, 47, 24, 1.4), fill: lin(0, 30, 0, 62, 0, '#4a1466', 1, '#8a2470'), alpha: 0.92 },
      bloom(80, 49, 32, '255,220,170', 0.5),
      { d: smooth(hillL, false) + 'Z' + smooth(hillR, false) + 'Z', fill: '#2a0a45' },
      shadeIn(smooth(hillL, false) + 'Z' + smooth(hillR, false) + 'Z', lin(0, 56, 0, H, 0, 'rgba(255,120,170,0.45)', 1, 'rgba(255,120,170,0)'), 'screen'),
      // distant sailboat on the horizon
      { d: pl([[100, 65.6], [109, 65.6], [107.6, 66.6], [101.4, 66.6]]) + pl([[104.2, 65.2], [104.2, 57.5], [108.6, 65.2]]) + pl([[103.6, 65.2], [103.6, 59], [100.4, 65.2]]), fill: '#1c0530' },
      { d: rect(0, H, 160, 101 - H), fill: lin(0, H, 0, 101, 0, '#3d0f5e', 1, '#0a0320') },
      { d: refl, stroke: lin(0, H, 0, 101, 0, '#ffd08a', 0.5, '#ff6aa8', 1, 'rgba(255,80,160,0.2)'), sw: 0.9 },
      { d: glints, fill: '#fff4cf', blend: 'lighter' },
      ...neon(`M0 ${H}H160`, '#ff8fb1', 0.28),
      // palms: rim-lit silhouettes
      { d: p3.trunk + p3.fronds, fill: '#1c0530' },
      { d: p1.trunk + p2.trunk, fill: SIL },
      { d: p1.fronds + p2.fronds, fill: SIL },
      { d: p1.nuts + p2.nuts, fill: SIL },
      shadeIn(p1.trunk + p1.fronds, lin(14, 0, 60, 0, 0, 'rgba(255,90,170,0)', 1, 'rgba(255,120,180,0.6)'), 'screen'),
      shadeIn(p2.trunk + p2.fronds, lin(150, 0, 104, 0, 0, 'rgba(255,90,170,0)', 1, 'rgba(255,120,180,0.6)'), 'screen'),
      { d: p1.trunk + p2.trunk, stroke: '#ff4fa3', sw: 0.45, alpha: 0.5 },
      { d: p1.fronds + p2.fronds, stroke: '#ff4fa3', sw: 0.3, alpha: 0.35 },
    ],
  }
}

// ============================================================================
// OLD-SCHOOL TATTOO FLASH
// ============================================================================
export function flashPaper(starsAt: [number, number, number][]): Art {
  const r = rng(19)
  let specks = ''
  for (let i = 0; i < 70; i++) specks += circ(r() * 160, r() * 101, 0.12 + r() * 0.3)
  const paths: VectorPath[] = [
    { d: rect(0, 0, 160, 101), fill: rad(40, 20, 170, 0, 'rgba(255,255,255,1)', 0.45, 'rgba(245,235,215,1)', 1, 'rgba(150,105,55,1)'), blend: 'multiply' },
    bloom(34, 18, 70, '255,250,235', 0.5),
    { d: blob(30, 70, 16, 2, 5, 1) + blob(130, 24, 12, 1.5, 4, 2), fill: 'rgba(150,100,40,0.07)' },
    { d: specks, fill: 'rgba(80,50,20,0.28)' },
    { d: rrect(4.5, 4.5, 151, 92, 2.5), stroke: INK, sw: 0.9, alpha: 0.85 },
    { d: rrect(6.6, 6.6, 146.8, 87.8, 1.6), stroke: '#b3261e', sw: 0.45, alpha: 0.9 },
  ]
  starsAt.forEach(([x, y, s]) => paths.push(...tatStar(x, y, s)))
  return { viewW: 160, viewH: 101, paths }
}

// Two-tone traditional star with a sparkle.
function tatStar(cx: number, cy: number, ro: number): VectorPath[] {
  const ri = ro * 0.45
  const pts: P[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? ri : ro
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
  }
  let dark = ''
  for (let i = 0; i < 10; i += 2) dark += pl([[cx, cy], pts[i], pts[(i + 1) % 10]])
  const sw = ro * 0.16
  return [
    { d: pl(pts), fill: '#f6c945' },
    { d: dark, fill: '#d9901c' },
    { d: pl(pts), stroke: INK, sw },
    { d: `M${n2(cx + ro * 1.5)} ${n2(cy - ro * 0.9)}h${n2(ro * 0.6)}M${n2(cx + ro * 1.8)} ${n2(cy - ro * 1.2)}v${n2(ro * 0.6)}`, stroke: INK, sw: sw * 0.7 },
    { d: circ(cx - ro * 1.4, cy + ro * 0.9, sw * 0.6), fill: INK },
  ]
}

function tatRose(cx: number, cy: number, R: number): VectorPath[] {
  const L = (pts: number[]) => {
    let d = `M${n2(cx + pts[0] * R)} ${n2(cy + pts[1] * R)}`
    for (let i = 2; i < pts.length; i += 4) d += `Q${n2(cx + pts[i] * R)} ${n2(cy + pts[i + 1] * R)} ${n2(cx + pts[i + 2] * R)} ${n2(cy + pts[i + 3] * R)}`
    return d
  }
  const body = blob(cx, cy, R, R * 0.06, 6, 0.5)
  const bowl = blob(cx, cy - R * 0.2, R * 0.58, R * 0.05, 5, 1.2, R * 0.46)
  return [
    { d: body, fill: radLit(cx, cy, R * 1.1, 0, '#ff6a5c', 0.55, '#d42a20', 1, '#7d1010') },
    { d: bowl, fill: lin(0, cy - R * 0.7, 0, cy + R * 0.3, 0, '#c42219', 1, '#8a1410') },
    { d: bowl, stroke: INK, sw: R * 0.1 },
    { d: spiral(cx, cy - R * 0.22, R * 0.04, R * 0.36, 1.25, 0.8), stroke: INK, sw: R * 0.1 },
    { d: L([-0.8, -0.02, 0, 0.62, 0.8, -0.02]), stroke: INK, sw: R * 0.11 },
    { d: L([-0.96, 0.22, -0.7, 0.82, -0.08, 0.92]) + L([0.96, 0.22, 0.7, 0.82, 0.08, 0.92]), stroke: INK, sw: R * 0.1 },
    { d: L([-0.62, 0.26, -0.4, 0.56, -0.1, 0.6]) + L([-0.66, -0.6, -0.42, -0.86, -0.06, -0.86]), stroke: '#fff3df', sw: R * 0.08, alpha: 0.9 },
    { d: body, stroke: INK, sw: R * 0.16 },
  ]
}

function tatLeaf(x: number, y: number, deg: number, len: number, w: number): VectorPath[] {
  const a = (deg * Math.PI) / 180
  const tx = x + len * Math.cos(a)
  const ty = y + len * Math.sin(a)
  const mx = (x + tx) / 2
  const my = (y + ty) / 2
  const nx = -Math.sin(a) * w
  const ny = Math.cos(a) * w
  const leaf = `M${n2(x)} ${n2(y)}Q${n2(mx + nx)} ${n2(my + ny)} ${n2(tx)} ${n2(ty)}Q${n2(mx - nx)} ${n2(my - ny)} ${n2(x)} ${n2(y)}Z`
  const halfD = `M${n2(x)} ${n2(y)}Q${n2(mx + nx)} ${n2(my + ny)} ${n2(tx)} ${n2(ty)}Q${n2(mx + nx * 0.1)} ${n2(my + ny * 0.1)} ${n2(x)} ${n2(y)}Z`
  const dark = ny > 0 ? halfD : `M${n2(x)} ${n2(y)}Q${n2(mx - nx)} ${n2(my - ny)} ${n2(tx)} ${n2(ty)}Q${n2(mx - nx * 0.1)} ${n2(my - ny * 0.1)} ${n2(x)} ${n2(y)}Z`
  return [
    { d: leaf, fill: '#3e9a47' },
    { d: dark, fill: '#1f5f2a' },
    { d: `M${n2(x)} ${n2(y)}Q${n2(mx + nx * 0.15)} ${n2(my + ny * 0.15)} ${n2(tx)} ${n2(ty)}`, stroke: INK, sw: w * 0.16 },
    { d: leaf, stroke: INK, sw: w * 0.26 },
  ]
}

export function tattooHeart(): Art {
  const heartPts: P[] = [
    ...cubicPts([120, 158], [62, 120], [32, 90], [40, 60], 24),
    ...cubicPts([40, 60], [48, 28], [90, 22], [120, 54], 24),
    ...cubicPts([120, 54], [150, 22], [192, 28], [200, 60], 24),
    ...cubicPts([200, 60], [208, 90], [178, 120], [120, 158], 24),
  ]
  const heartD = 'M120 158C62 120 32 90 40 60C48 28 90 22 120 54C150 22 192 28 200 60C208 90 178 120 120 158Z'
  // whip shading: halftone that thickens toward the lower-right edge
  const shifted = [5, 10, 15, 21].map((k) => off(heartPts, -k * 0.7, -k))
  const whip = dotsIn(heartPts, 30, 20, 212, 162, 3.3, (x, y) => {
    let k = 0
    for (const sp of shifted) if (!inside(x, y, sp)) k++
    return k * 0.42
  })
  // dagger on a 45° line: pommel top-right, tip bottom-left
  const A: P = [224, 18]
  const at = (sAlong: number, w: number): P => [A[0] - Math.SQRT1_2 * sAlong + Math.SQRT1_2 * w, A[1] + Math.SQRT1_2 * sAlong + Math.SQRT1_2 * w]
  const tipS = 214
  const blade = pl([at(31, -7.5), at(tipS - 22, -5.5), at(tipS, 0), at(tipS - 22, 5.5), at(31, 7.5)])
  const bladeLit = pl([at(31, -7.5), at(tipS - 22, -5.5), at(tipS, 0), at(31, 0)])
  const guard = smooth([at(25, -19), at(27, -21), at(32, -19), at(32, 19), at(27, 21), at(25, 19)])
  const grip = pl([at(5, -5), at(5, 5), at(25, 5.5), at(25, -5.5)])
  let wraps = ''
  for (let k = 8; k < 25; k += 4) wraps += `M${n2(at(k, -5)[0])} ${n2(at(k, -5)[1])}L${n2(at(k + 2.5, 5)[0])} ${n2(at(k + 2.5, 5)[1])}`
  const tip = at(tipS, 0)
  const drop = (x: number, y: number, s2: number) => `M${n2(x)} ${n2(y)}Q${n2(x + 3.4 * s2)} ${n2(y + 6 * s2)} ${n2(x)} ${n2(y + 8.5 * s2)}Q${n2(x - 3.4 * s2)} ${n2(y + 6 * s2)} ${n2(x)} ${n2(y)}Z`
  const drops = drop(tip[0] - 1, tip[1] + 4, 1) + drop(tip[0] - 6, tip[1] + 14, 0.7)
  return {
    viewW: 240,
    viewH: 190,
    paths: [
      { d: blade, fill: lin(...at(31, 8), ...at(31, -8), 0, '#6c7788', 1, '#b9c3d0') },
      { d: bladeLit, fill: lin(...at(40, 0), ...at(tipS, 0), 0, '#ffffff', 1, '#dfe6ee') },
      { d: `M${n2(at(31, 0)[0])} ${n2(at(31, 0)[1])}L${n2(tip[0])} ${n2(tip[1])}`, stroke: INK, sw: 1.6 },
      { d: blade, stroke: INK, sw: 4 },
      { d: drops, fill: lin(0, tip[1], 0, tip[1] + 22, 0, '#ff5a4a', 1, '#a3140c'), stroke: INK, sw: 2.4 },
      ...tatLeaf(44, 130, 196, 44, 14),
      ...tatLeaf(56, 148, 138, 38, 12),
      ...tatLeaf(196, 130, -16, 44, 14),
      ...tatLeaf(184, 148, 42, 38, 12),
      { d: heartD, fill: lin(60, 30, 190, 150, 0, '#ef4a37', 0.6, '#cf2619', 1, '#9c140c') },
      shadeIn(heartD, rad(84, 52, 160, 0, '#ffffff', 0.4, '#ffffff', 1, '#4a0805'), 'multiply', 0.85),
      { d: whip, fill: '#2a0605', alpha: 0.9 },
      shadeIn(heartD, rad(78, 50, 48, 0, 'rgba(255,215,190,0.75)', 1, 'rgba(255,215,190,0)'), 'screen'),
      { d: 'M56 70Q58 44 86 38Q68 52 66 72Q60 78 56 70Z', fill: '#fff3df' },
      { d: circ(96, 42, 3.2) + circ(70, 84, 2.2), fill: '#fff3df' },
      { d: 'M158 40Q174 38 184 50', stroke: '#fff3df', sw: 3.2, alpha: 0.9 },
      { d: heartD, stroke: INK, sw: 5.5 },
      ...tatRose(58, 134, 24),
      ...tatRose(182, 134, 24),
      { d: grip, fill: lin(...at(10, -6), ...at(10, 6), 0, '#5a3a24', 1, '#24150c'), stroke: INK, sw: 3.5 },
      { d: wraps, stroke: '#a77a4c', sw: 1.6 },
      { d: guard, fill: lin(...at(28, -20), ...at(28, 20), 0, '#fff0a8', 0.45, '#f2b82c', 1, '#9c6a10'), stroke: INK, sw: 3.5 },
      { d: circ(A[0], A[1], 7), fill: radLit(A[0], A[1], 7, 0, '#fff4c0', 0.5, '#f2b82c', 1, '#8a5a0a'), stroke: INK, sw: 3.5 },
      bloom(at(60, -3)[0], at(60, -3)[1], 12, '255,255,255', 0.9),
      { d: sparkle(at(60, -3)[0], at(60, -3)[1], 7), fill: '#ffffff' },
    ],
  }
}

function feather(b: P, t: P, w: number): string {
  const dx = t[0] - b[0]
  const dy = t[1] - b[1]
  const L = Math.hypot(dx, dy)
  const ux = dx / L
  const uy = dy / L
  const nx = -uy
  const ny = ux
  const at = (f: number, s: number): P => [b[0] + ux * L * f + nx * s, b[1] + uy * L * f + ny * s]
  return smooth([b, at(0.3, w * 0.5), at(0.85, w * 0.48), t, at(0.85, -w * 0.48), at(0.3, -w * 0.5)])
}

export function swallow(mirror = false): Art {
  const X = (p: P): P => (mirror ? [240 - p[0], p[1]] : p)
  const XS = (pts: P[]) => pts.map(X)
  const NAVY = '#14294a'
  const UP = [NAVY, '#24508a', '#3f86c0', '#a9d8ee']
  const LO = ['#0f1f3a', '#1d4373', '#3d78ad', '#6aa6cf']
  const fp = (b: P, t: P, c: string[]) => {
    const B = X(b)
    const T = X(t)
    return lin(B[0], B[1], T[0], T[1], 0, c[0], 0.55, c[1], 0.82, c[2], 1, c[3])
  }
  const F = (b: P, t: P, w: number, c = UP): VectorPath => ({ d: feather(X(b), X(t), w), fill: fp(b, t, c), stroke: INK, sw: 3 })
  const upper: [P, P, number][] = [
    [[128, 68], [108, 50], 13],
    [[134, 66], [94, 38], 14],
    [[140, 64], [80, 26], 15],
    [[146, 60], [66, 15], 15],
    [[152, 56], [50, 6], 16],
  ]
  const lower: [P, P, number][] = [
    [[142, 86], [128, 136], 12],
    [[138, 88], [112, 144], 13],
    [[134, 90], [96, 148], 13],
  ]
  const body = smooth(XS([[174, 39], [192, 39], [203, 49], [201, 61], [189, 70], [167, 82], [143, 92], [121, 98], [103, 101], [97, 91], [114, 77], [138, 62], [157, 47]]))
  const belly = smooth(XS([[200, 59], [189, 70], [167, 82], [143, 92], [121, 98], [105, 100], [121, 88], [145, 78], [169, 70], [189, 64]]))
  const throat = smooth(XS([[202, 56], [199, 63], [189, 70], [177, 73], [174, 63], [187, 58]]))
  const covert = smooth(XS([[162, 50], [150, 40], [128, 32], [104, 26], [96, 28], [112, 42], [132, 56], [150, 66]]))
  const eye = X([189, 50])
  const hl = X([191, 48.8])
  const lit = (x0: number, x1: number) => lin(X([x0, 0])[0], 0, X([x1, 0])[0], 0, 0, 'rgba(255,255,255,0.4)', 1, 'rgba(255,255,255,0)')
  return {
    viewW: 240,
    viewH: 170,
    paths: [
      F([106, 97], [50, 140], 10),
      F([106, 95], [30, 110], 10),
      F([108, 95], [70, 116], 14),
      ...lower.map(([b, t, w]) => F(b, t, w, LO)),
      { d: body, fill: lin(X([100, 40])[0], 40, X([180, 100])[0], 100, 0, '#2f66a3', 0.5, NAVY, 1, '#0c1830') },
      { d: belly, fill: lin(0, 60, 0, 100, 0, '#fff7e2', 1, '#e0c58c') },
      shadeIn(belly, lin(0, 70, 0, 100, 0, '#ffffff', 1, '#b08a50'), 'multiply', 0.6),
      { d: throat, fill: radLit(X([188, 64])[0], 64, 12, 0, '#ff6a5a', 1, '#b3170e') },
      { d: body, stroke: INK, sw: 3.5 },
      { d: pl(XS([[200, 46], [217, 50.5], [200, 55]])), fill: INK, stroke: INK, sw: 2 },
      ...upper.map(([b, t, w]) => F(b, t, w)),
      { d: covert, fill: lin(X([100, 26])[0], 26, X([160, 64])[0], 64, 0, '#3f7cbc', 1, NAVY), stroke: INK, sw: 3.5 },
      shadeIn(covert, lit(100, 150), 'screen'),
      gloss(smooth(XS([[112, 34], [128, 36], [146, 46]]), false), 2.6, 0.6),
      gloss(smooth(XS([[178, 45], [186, 42], [194, 46]]), false), 2.4, 0.75),
      { d: circ(eye[0], eye[1], 4.8), fill: '#ffffff', stroke: INK, sw: 2.2 },
      { d: circ(eye[0] + (mirror ? -1 : 1), eye[1], 2.6), fill: INK },
      { d: circ(hl[0], hl[1], 0.9), fill: '#ffffff' },
    ],
  }
}

export function roseCluster(): Art {
  return {
    viewW: 170,
    viewH: 104,
    paths: [
      ...tatLeaf(70, 64, 196, 56, 15),
      ...tatLeaf(100, 64, -16, 56, 15),
      ...tatLeaf(76, 76, 146, 42, 12),
      ...tatLeaf(94, 76, 34, 42, 12),
      ...tatRose(85, 54, 32),
      bloom(70, 38, 14, '255,230,220', 0.55),
    ],
  }
}

// ============================================================================
// JAPAN
// ============================================================================
interface Curl {
  outer: P[]
  inner: P[]
  tg: P[]
  nm: P[]
}

// Breaking-wave curl: an inward spiral band that thins to the lip.
function curl(cx: number, cy: number, R: number, T: number, th0: number, th1: number, shrink: number, N = 80): Curl {
  const outer: P[] = []
  const inner: P[] = []
  const tg: P[] = []
  const nm: P[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const th = th0 + (th1 - th0) * t
    const ro = R * (1 - shrink * Math.pow(t, 1.25))
    const thick = T * Math.pow(1 - t, 0.85)
    const c = Math.cos(th)
    const s = Math.sin(th)
    outer.push([cx + ro * c, cy + ro * s])
    inner.push([cx + (ro - thick) * c, cy + (ro - thick) * s])
    nm.push([c, s])
    tg.push([-s, c])
  }
  return { outer, inner, tg, nm }
}

function band(cv: Curl, f0: number, f1: number, t0: number, t1: number): P[] {
  const N = cv.outer.length - 1
  const a: P[] = []
  const b: P[] = []
  for (let i = Math.round(t0 * N); i <= Math.round(t1 * N); i++) {
    const o = cv.outer[i]
    const n = cv.inner[i]
    a.push([o[0] + (n[0] - o[0]) * f0, o[1] + (n[1] - o[1]) * f0])
    b.push([o[0] + (n[0] - o[0]) * f1, o[1] + (n[1] - o[1]) * f1])
  }
  return [...a, ...b.reverse()]
}

function lineAt(cv: Curl, f: number, t0: number, t1: number): string {
  const N = cv.outer.length - 1
  const pts: P[] = []
  for (let i = Math.round(t0 * N); i <= Math.round(t1 * N); i++) {
    const o = cv.outer[i]
    const n = cv.inner[i]
    pts.push([o[0] + (n[0] - o[0]) * f, o[1] + (n[1] - o[1]) * f])
  }
  return smooth(pts, false)
}

// Foam claws: hooked white fingers along the outer edge of the curl.
function claws(cv: Curl, t0: number, t1: number, count: number, size: (t: number) => number, seed: number): string {
  const r = rng(seed)
  const N = cv.outer.length - 1
  let d = ''
  for (let k = 0; k < count; k++) {
    const t = t0 + ((t1 - t0) * (k + 0.5)) / count
    const i = Math.round(t * N)
    const [px, py] = cv.outer[i]
    const [nx, ny] = cv.nm[i]
    const [tx, ty] = cv.tg[i]
    const L = size(t) * (0.8 + r() * 0.4)
    const w = L * 0.36
    const at = (fn: number, ft: number): P => [px + nx * L * fn + tx * L * ft, py + ny * L * fn + ty * L * ft]
    const pts: P[] = [at(-0.12, -0.4), at(0.5, -0.3), at(0.98, 0.12), at(1.12, 0.66), at(0.9, 0.62), at(0.74, 0.34), at(0.44, 0.2), at(-0.12, 0.38)]
    void w
    d += smooth(cw(pts))
  }
  return d
}

export function greatWave(): Art {
  const N = 90
  const cv = curl(80, 50, 36, 25, Math.PI * 1.0, Math.PI * 2.24, 0.34, N)
  const back: P[] = [[-4, 103], [-4, 85], [12, 80], [26, 72.5], [36, 63], [41, 56]]
  const trough: P[] = [[69, 57], [70, 66], [75, 73.5], [85, 78.5], [98, 80], [112, 79], [124, 81], [136, 83], [150, 82], [164, 83], [164, 103]]
  const body: P[] = [...back, ...cv.outer, ...[...cv.inner].reverse(), ...trough]
  const bodyD = pl(body)
  let backLines = ''
  for (let k = 0; k < 6; k++) {
    const y = 82 + k * 4
    backLines += smooth([[-2, y + 4], [14, y - 1 - k * 0.3], [28, y - 8 + k * 0.9], [40, y - 18 + k * 2.6]], false)
  }
  for (let k = 0; k < 4; k++) {
    const y = 86 + k * 4
    backLines += smooth([[56, y + 1], [80, y - 1.5], [104, y + 0.5], [128, y - 1], [164, y + 1]], false)
  }
  const swell: P[] = [[96, 104], [96, 96], [108, 90], [120, 86], [130, 81], [137, 76.5], [141, 75.5], [145, 78.5], [152, 83], [164, 86], [164, 103]]
  const r = rng(91)
  let spray = ''
  for (let i = 0; i < 60; i++) {
    const t = 0.2 + r() * 0.75
    const k = Math.round(t * N)
    const [px, py] = cv.outer[k]
    const [nx, ny] = cv.nm[k]
    const dd = 4 + r() * 13
    spray += circ(px + nx * dd + (r() - 0.5) * 4, py + ny * dd + (r() - 0.5) * 4, 0.3 + r() * 0.65)
  }
  for (let i = 0; i < 12; i++) spray += circ(134 + r() * 16, 70 + r() * 6, 0.3 + r() * 0.4)
  let glints = ''
  for (let i = 0; i < 14; i++) {
    const t = 0.1 + r() * 0.6
    const k = Math.round(t * N)
    const o = cv.outer[k]
    const n = cv.inner[k]
    const f = 0.3 + r() * 0.5
    glints += sparkle(o[0] + (n[0] - o[0]) * f, o[1] + (n[1] - o[1]) * f, 0.6 + r() * 0.8)
  }
  const crest = (t: number) => 2.6 + 4.6 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.16) / 0.84)) * 0.62), 1.4)
  // stylised ukiyo-e cloud bands
  const cloudBand = (x: number, y: number, w: number) => smooth([[x, y], [x + w * 0.2, y - 2.2], [x + w * 0.45, y - 1.4], [x + w * 0.62, y - 3.4], [x + w * 0.85, y - 1.8], [x + w, y], [x + w * 0.5, y + 1.2]])
  const clouds = cloudBand(4, 22, 34) + cloudBand(102, 12, 30) + cloudBand(118, 46, 34) + cloudBand(14, 40, 22)
  const boat = smooth([[62, 80.5], [86, 84], [112, 79.6], [111, 82.6], [86, 86.6], [63.5, 83.2]])
  let rowers = ''
  for (let i = 0; i < 6; i++) {
    const x = 70 + i * 6
    const y = 82.6 + Math.sin(((x - 62) / 50) * Math.PI) * 0.8
    rowers += circ(x, y - 2.6, 1.05) + rrect(x - 1.1, y - 1.9, 2.2, 2.4, 0.8)
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: rect(0, 0, 160, 46), fill: lin(0, 0, 0, 46, 0, 'rgba(40,52,82,0.42)', 1, 'rgba(40,52,82,0)') },
      { d: clouds, fill: '#f6eedc', stroke: 'rgba(110,90,60,0.35)', sw: 0.35 },
      bloom(134, 24, 26, '235,110,80', 0.28, 'multiply'),
      { d: circ(134, 24, 10), fill: radLit(134, 24, 11, 0, '#ec5a42', 1, '#c2301f') },
      // Mount Fuji, softened by distance
      { d: 'M110 82L126 63Q130 61 134 63L152 82Z', fill: lin(0, 62, 0, 82, 0, '#6a86aa', 1, '#4a6890') },
      shadeIn('M110 82L126 63Q130 61 134 63L152 82Z', lin(124, 0, 140, 0, 0, '#ffffff', 1, '#9aa8c0'), 'multiply'),
      { d: 'M121.8 67.6L126 63Q130 61 134 63L138.4 67.8L135.6 66.6L133.6 69L131 66.8L128.4 69.4L126 67L124 69Z', fill: '#fbf6ea' },
      { d: rect(100, 72, 60, 12), fill: lin(0, 72, 0, 84, 0, 'rgba(239,227,198,0)', 1, 'rgba(239,227,198,0.85)') },
      { d: bodyD, fill: lin(0, 14, 0, 101, 0, '#24579a', 0.55, '#14376b', 1, '#0b2448') },
      { d: pl(band(cv, 0, 0.55, 0.02, 0.98)), fill: '#2a66ad' },
      { d: pl(band(cv, 0, 0.26, 0.1, 1)), fill: '#7fb0de' },
      shadeIn(bodyD, rad(80, 54, 34, 0, '#0a1430', 0.55, '#3a4c78', 1, '#ffffff'), 'multiply'),
      shadeIn(pl(band(cv, 0.05, 0.6, 0.04, 0.75)), lin(44, 20, 100, 60, 0, 'rgba(220,240,255,0.5)', 1, 'rgba(220,240,255,0)'), 'screen'),
      { d: lineAt(cv, 0.66, 0.04, 0.86) + lineAt(cv, 0.8, 0.03, 0.74) + lineAt(cv, 0.9, 0.03, 0.6) + lineAt(cv, 0.4, 0.06, 0.92) + lineAt(cv, 0.52, 0.05, 0.9), stroke: '#d6e6f6', sw: 0.42, alpha: 0.75 },
      { d: backLines, stroke: '#9cc3e8', sw: 0.45, alpha: 0.6 },
      { d: glints, fill: '#ffffff', alpha: 0.9 },
      { d: bodyD, stroke: '#0d1f3f', sw: 0.8 },
      { d: pl(band(cv, -0.03, 0.13, 0.15, 1)), fill: '#ffffff' },
      { d: claws(cv, 0.22, 0.97, 19, (t) => crest(t) * 0.7, 13), fill: '#e8f1fa', stroke: '#1b2f55', sw: 0.38 },
      { d: claws(cv, 0.17, 1, 26, crest, 5), fill: '#ffffff', stroke: '#1b2f55', sw: 0.42 },
      { d: spray, fill: '#ffffff' },
      // fishing boat in the trough, for scale
      { d: boat, fill: lin(0, 80, 0, 87, 0, '#f6e4b8', 1, '#b8945a'), stroke: '#1b2f55', sw: 0.45 },
      { d: rowers, fill: '#1b2f55' },
      { d: smooth([[62, 85], [86, 88.2], [110, 83.6]], false), stroke: '#ffffff', sw: 0.8, alpha: 0.55 },
      { d: pl(swell), fill: lin(0, 74, 0, 101, 0, '#2a62a8', 1, '#0d2a55') },
      shadeIn(pl(swell), lin(120, 0, 160, 0, 0, '#ffffff', 1, '#5a6a90'), 'multiply', 0.6),
      { d: smooth(swell.slice(1, -1), false), stroke: '#0d1f3f', sw: 0.6 },
      { d: smooth([[124, 84], [132, 80], [137, 77], [141, 76], [145, 79], [150, 82.5], [146, 81.6], [142, 79.4], [139, 80.6], [135, 80.2], [130, 83]]), fill: '#ffffff', stroke: '#1b2f55', sw: 0.35 },
      { d: smooth([[116, 92], [130, 88], [146, 90], [164, 92]], false) + smooth([[118, 97], [136, 94], [164, 97]], false), stroke: '#9cc3e8', sw: 0.45, alpha: 0.6 },
    ],
  }
}

// ---- Koi pond, seen from above -----------------------------------------------
interface KoiOpts {
  cx: number
  cy: number
  R: number
  a0: number // head angle on the arc (radians)
  sweep: number // arc length in radians, sign = swimming direction
  W: number
  base: string
  baseDark: string
  patch: string
  patchDark: string
  spots?: boolean
  seed: number
}

function koiFish(o: KoiOpts): VectorPath[] {
  const sp = (u: number) => {
    const a = o.a0 - o.sweep * u
    return { p: [o.cx + o.R * Math.cos(a), o.cy + o.R * Math.sin(a)] as P, n: [Math.cos(a), Math.sin(a)] as P }
  }
  const hw = (u: number) => {
    if (u < 0.1) return o.W * 0.66 * Math.sqrt(Math.max(0, u) / 0.1)
    if (u < 0.32) return o.W * (0.66 + 0.34 * Math.sin(((u - 0.1) / 0.22) * (Math.PI / 2)))
    return o.W * (0.17 + 0.83 * Math.cos(Math.min(1, (u - 0.32) / 0.58) * (Math.PI / 2)))
  }
  const M = (u: number, v: number): P => {
    const { p, n } = sp(u)
    return [p[0] + n[0] * v, p[1] + n[1] * v]
  }
  const MV = (u: number, f: number): P => M(u, f * hw(u))
  const left: P[] = []
  const right: P[] = []
  for (let i = 0; i <= 40; i++) {
    const u = (i / 40) * 0.9
    left.push(MV(u, 1))
    right.push(MV(u, -1))
  }
  const bodyPts = [...left, ...right.reverse()]
  const body = smooth(bodyPts)
  const W = o.W
  // tail: two flowing lobes
  const tail: P[] = [M(0.88, W * 0.17), M(0.98, W * 0.62), M(1.12, W * 1.05), M(1.22, W * 0.95), M(1.12, W * 0.32), M(1.1, 0), M(1.12, -W * 0.32), M(1.22, -W * 0.95), M(1.12, -W * 1.05), M(0.98, -W * 0.62), M(0.88, -W * 0.17)]
  let tailRays = ''
  ;[-0.9, -0.6, -0.3, 0.3, 0.6, 0.9].forEach((f) => (tailRays += smooth([M(0.9, f * W * 0.1), M(1.02, f * W * 0.55), M(1.15, f * W * 0.95)], false)))
  // pectoral fins
  const fin = (sgn: number) => smooth([M(0.26, sgn * W * 0.8), M(0.3, sgn * W * 1.55), M(0.42, sgn * W * 2.1), M(0.5, sgn * W * 1.75), M(0.42, sgn * W * 1.1), M(0.36, sgn * W * 0.85)])
  let finRays = ''
  ;[1, -1].forEach((sgn) => [1.35, 1.65, 1.9].forEach((k, j) => (finRays += smooth([M(0.3, sgn * W * 0.9), M(0.36 + j * 0.03, sgn * W * k * 0.9), M(0.4 + j * 0.035, sgn * W * k)], false))))
  // patches drawn in body coordinates so they always stay inside the outline
  const r = rng(o.seed)
  const patchShape = (u0: number, u1: number, f0: number, f1: number): string => {
    const pts: P[] = []
    const N = 18
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU
      const wob = 1 + (r() - 0.5) * 0.35
      const u = (u0 + u1) / 2 + ((u1 - u0) / 2) * Math.cos(a) * wob
      const f = Math.max(-0.96, Math.min(0.96, (f0 + f1) / 2 + ((f1 - f0) / 2) * Math.sin(a) * wob))
      pts.push(MV(u, f))
    }
    return smooth(cw(pts))
  }
  const patches = patchShape(0.03, 0.17, -0.7, 0.6) + patchShape(0.26, 0.47, -1.1, 0.75) + patchShape(0.52, 0.72, -0.5, 1.2) + patchShape(0.76, 0.86, -0.8, 0.2)
  let scales = ''
  let row = 0
  for (let u = 0.2; u < 0.84; u += 0.042, row++) {
    for (let f = -0.85 + (row % 2) * 0.14; f < 0.9; f += 0.28) scales += smooth([MV(u, f - 0.11), MV(u + 0.026, f), MV(u, f + 0.11)], false)
  }
  let spots = ''
  if (o.spots) [[0.36, 0.3], [0.44, -0.4], [0.6, 0.15], [0.68, -0.5], [0.22, -0.5]].forEach(([u, f]) => (spots += smooth(cw([MV(u - 0.03, f), MV(u, f + 0.18), MV(u + 0.035, f), MV(u, f - 0.2)]))))
  const shadowPts = off(bodyPts, 2.6, 3.4)
  const highlight = smooth([...Array.from({ length: 14 }, (_, i) => MV(0.06 + i * 0.05, -0.15)), ...Array.from({ length: 14 }, (_, i) => MV(0.71 - i * 0.05, -0.55))])
  const shadeSide = smooth([...Array.from({ length: 16 }, (_, i) => MV(0.04 + i * 0.053, 0.5)), ...Array.from({ length: 16 }, (_, i) => MV(0.83 - i * 0.053, 0.98))])
  const OUT = '#2a1408'
  const [hx, hy] = sp(0).p
  void hx
  void hy
  return [
    { d: smooth(shadowPts), fill: 'rgba(0,18,24,0.35)' },
    { d: smooth(off(tail, 2.6, 3.4)), fill: 'rgba(0,18,24,0.2)' },
    { d: fin(1) + fin(-1), fill: o.base, alpha: 0.75 },
    { d: finRays, stroke: o.patchDark, sw: 0.3, alpha: 0.6 },
    { d: fin(1) + fin(-1), stroke: OUT, sw: 0.45, alpha: 0.7 },
    { d: smooth(tail), fill: o.patch, alpha: 0.78 },
    { d: tailRays, stroke: o.patchDark, sw: 0.32, alpha: 0.7 },
    { d: smooth(tail), stroke: OUT, sw: 0.45, alpha: 0.7 },
    { d: body, fill: o.base },
    { d: shadeSide, fill: o.baseDark, alpha: 0.55 },
    { d: patches, fill: o.patch },
    { d: spots, fill: '#17110d' },
    { d: scales, stroke: o.patchDark, sw: 0.28, alpha: 0.35 },
    { d: highlight, fill: '#ffffff', alpha: 0.28 },
    { d: body, stroke: OUT, sw: 0.6 },
    { d: circ(...MV(0.085, 0.55), 0.85) + circ(...MV(0.085, -0.55), 0.85), fill: '#111111' },
    { d: circ(...MV(0.08, 0.5), 0.3) + circ(...MV(0.08, -0.6), 0.3), fill: '#ffffff' },
    { d: smooth([MV(0.02, 0.35), M(-0.01, W * 0.8), M(0.0, W * 1.05)], false) + smooth([MV(0.02, -0.35), M(-0.01, -W * 0.8), M(0.0, -W * 1.05)], false), stroke: OUT, sw: 0.4 },
  ]
}

export function koiPond(): Art {
  const r = rng(23)
  let caustics = ''
  for (let k = 0; k < 9; k++) {
    const y0 = 6 + k * 11
    const pts: P[] = []
    for (let x = -4; x <= 164; x += 8) pts.push([x, y0 + Math.sin(x * 0.09 + k) * 3 + (r() - 0.5) * 3])
    caustics += smooth(pts, false)
  }
  for (let k = 0; k < 14; k++) {
    const x0 = 4 + k * 12
    const pts: P[] = []
    for (let y = -4; y <= 105; y += 8) pts.push([x0 + Math.sin(y * 0.1 + k * 1.3) * 3 + (r() - 0.5) * 3, y])
    caustics += smooth(pts, false)
  }
  // pebbles on the pond floor, muted by depth
  const stones: VectorPath[] = []
  ;[[10, 88, 6], [20, 95, 4.5], [4, 74, 4], [28, 86, 3], [146, 92, 6], [136, 98, 4], [154, 78, 3.6], [62, 98, 3.4], [100, 4, 4]].forEach(([x, y, rr]) => {
    const d = blob(x, y, rr, rr * 0.08, 3, x, rr * 0.7)
    stones.push({ d, fill: '#164c52', alpha: 0.85 }, shadeIn(d, rad(x - rr * 0.4, y - rr * 0.5, rr * 1.6, 0, 'rgba(160,230,220,0.35)', 1, 'rgba(160,230,220,0)'), 'screen'))
  })
  const shafts = godRays(-10, -20, [24, 32, 40, 47, 55], 190, 0.035, '200,255,245', 0.16)
  const ripple = (x: number, y: number, s: number): VectorPath[] => [
    { d: ell(x, y, 9 * s, 3.4 * s) + ell(x, y, 15 * s, 5.6 * s) + ell(x, y, 21 * s, 7.8 * s), stroke: '#bff3ef', sw: 0.5, alpha: 0.32 },
    { d: `M${x - 13 * s} ${y - 3.4 * s}Q${x} ${y - 7 * s} ${x + 13 * s} ${y - 3.4 * s}`, stroke: '#ffffff', sw: 0.6, alpha: 0.55, blend: 'screen' },
    { d: sparkle(x - 6 * s, y - 5.4 * s, 1.4) + sparkle(x + 9 * s, y - 7.4 * s, 1), fill: '#ffffff', blend: 'lighter' },
  ]
  const pad = (x: number, y: number, rr: number, rot: number): VectorPath[] => {
    const a0 = rot
    const pts: P[] = []
    for (let i = 0; i <= 40; i++) {
      const a = a0 + 0.35 + (i / 40) * (TAU - 0.7)
      pts.push([x + rr * Math.cos(a), y + rr * 0.92 * Math.sin(a)])
    }
    pts.push([x, y])
    let veins = ''
    for (let i = 0; i < 9; i++) {
      const a = a0 + 0.6 + (i / 8) * (TAU - 1.2)
      veins += `M${n2(x)} ${n2(y)}L${n2(x + rr * 0.85 * Math.cos(a))} ${n2(y + rr * 0.8 * Math.sin(a))}`
    }
    return [
      { d: pl(off(pts, 1.6, 2.2)), fill: 'rgba(0,18,24,0.35)' },
      { d: pl(pts), fill: radLit(x, y, rr * 1.1, 0, '#8fd16a', 0.6, '#3f9a4a', 1, '#1f6a3a'), stroke: '#174a2c', sw: 0.6 },
      { d: veins, stroke: '#cdeeb0', sw: 0.35, alpha: 0.55 },
    ]
  }
  const lotus = (x: number, y: number, s: number): VectorPath[] => {
    let back = ''
    let front = ''
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU
      back += feather([x, y], [x + 6 * s * Math.cos(a), y + 6 * s * Math.sin(a)], 3.6 * s)
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3
      front += feather([x, y], [x + 4 * s * Math.cos(a), y + 4 * s * Math.sin(a)], 2.8 * s)
    }
    return [
      { d: back, fill: lin(x - 6 * s, y - 6 * s, x + 6 * s, y + 6 * s, 0, '#ffe3ef', 1, '#f28bb4'), stroke: '#9b3a64', sw: 0.35 },
      { d: front, fill: lin(x - 4 * s, y - 4 * s, x + 4 * s, y + 4 * s, 0, '#fff6fa', 1, '#f7a8c8'), stroke: '#9b3a64', sw: 0.3 },
      { d: circ(x, y, 1.4 * s), fill: '#ffd34d', stroke: '#b07a00', sw: 0.3 },
    ]
  }
  const koiA = koiFish({ cx: 80, cy: 50, R: 31, a0: -0.25, sweep: 2.45, W: 8.4, base: '#fbf7f0', baseDark: '#c9c1b5', patch: '#f2541b', patchDark: '#9a2a08', seed: 4 })
  const koiB = koiFish({ cx: 80, cy: 50, R: 31, a0: Math.PI - 0.25, sweep: 2.45, W: 8.2, base: '#ffb53b', baseDark: '#c46a10', patch: '#fff1d6', patchDark: '#8a4a08', spots: true, seed: 9 })
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      ...stones,
      { d: caustics, stroke: '#9ff0e6', sw: 0.45, alpha: 0.07, blend: 'screen' },
      shafts,
      ...ripple(28, 22, 1),
      ...ripple(34, 84, 0.8),
      ...ripple(134, 82, 0.85),
      ...koiB,
      ...koiA,
      ...pad(150, 12, 17, 2.2),
      ...pad(130, 2, 10, 1.2),
      ...lotus(146, 14, 1.25),
      ...pad(8, 52, 9, 0.2),
      { d: rect(0, 0, 160, 101), fill: rad(40, 20, 170, 0, 'rgba(255,255,255,1)', 0.5, 'rgba(230,245,245,1)', 1, 'rgba(10,40,50,1)'), blend: 'multiply', alpha: 0.7 },
    ],
  }
}

// ============================================================================
// SPACE
// ============================================================================
export function nebulaSky(seed: number, tint: 'violet' | 'blue', sun?: P): Art {
  const r = rng(seed)
  const glows: VectorPath[] =
    tint === 'violet'
      ? [halo(36, 74, 62, '150,60,210', 0.32), halo(118, 26, 50, '40,170,220', 0.24), halo(94, 84, 34, '230,70,160', 0.22), halo(20, 20, 30, '90,90,230', 0.2)]
      : [halo(30, 30, 60, '80,70,220', 0.3), halo(128, 70, 46, '200,60,190', 0.2), halo(70, 10, 36, '40,170,230', 0.18)]
  const lensFlare: VectorPath[] = []
  if (sun) {
    const [sx, sy] = sun
    const vx = 80 - sx
    const vy = 50 - sy
    lensFlare.push(
      godRays(sx, sy, [8, 22, 36, 50, 64, 80], 210, 0.028, '255,235,200', 0.13),
      bloom(sx, sy, 50, '255,232,196', 0.8),
      bloom(sx, sy, 14, '255,255,255', 1),
      { d: circ(sx, sy, 4.5), fill: '#ffffff' },
      { d: `M${sx - 30} ${sy}H${sx + 30}M${sx} ${sy - 22}V${sy + 22}`, stroke: lin(sx - 30, sy - 22, sx + 30, sy + 22, 0, 'rgba(255,245,225,0)', 0.5, 'rgba(255,245,225,0.75)', 1, 'rgba(255,245,225,0)'), sw: 0.3, blend: 'screen' },
      ...[[0.62, 2.4, 0.22], [0.9, 5, 0.12], [1.35, 9, 0.08], [1.6, 3.4, 0.16]].map(([t, rr, a]): VectorPath => ({ d: circ(sx + vx * t, sy + vy * t, rr), fill: `rgba(150,200,255,${a})`, blend: 'screen' })),
      { d: circ(sx + vx * 1.15, sy + vy * 1.15, 6.5), stroke: 'rgba(200,170,255,0.18)', sw: 0.8, blend: 'screen' },
    )
  }
  let bright = ''
  const flares: VectorPath[] = []
  for (let i = 0; i < 6; i++) {
    const x = 6 + r() * 148
    const y = 6 + r() * 89
    const s = 1.2 + r() * 1.6
    bright += sparkle(x, y, s)
    flares.push(halo(x, y, s * 2.2, '200,220,255', 0.5))
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      ...glows,
      { d: smooth([[-4, 90], [30, 70], [70, 58], [110, 38], [164, 16], [164, 34], [112, 54], [70, 72], [28, 88], [-4, 104]]), fill: 'rgba(255,200,255,0.05)' },
      { d: starDots(seed, 120, 160, 101, 0.15, 0.55), fill: '#ffffff', alpha: 0.75 },
      { d: starDots(seed + 1, 18, 160, 101, 0.5, 0.85), fill: '#dfe8ff' },
      ...flares,
      { d: bright, fill: '#ffffff' },
      ...lensFlare,
    ],
  }
}

export function ringedPlanet(): Art {
  const cx = 110
  const cy = 76
  const R = 44
  const ringArc = (rx: number, ry: number, front: boolean) => (front ? `M${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}` : `M${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`)
  const rings = (front: boolean): VectorPath[] => [
    { d: ringArc(102, 25, front), stroke: '#b98f5c', sw: 5, alpha: 0.75 },
    { d: ringArc(95, 23.2, front), stroke: '#f3dcae', sw: 6 },
    { d: ringArc(87.5, 21.4, front), stroke: '#3a2a3a', sw: 1.4, alpha: 0.6 },
    { d: ringArc(82, 20, front), stroke: '#e2bf86', sw: 5 },
    { d: ringArc(75, 18.4, front), stroke: '#c79a64', sw: 4, alpha: 0.55 },
  ]
  const ringBands: [number, number, number][] = [[102, 25, 5], [95, 23.2, 6], [82, 20, 5], [75, 18.4, 4]]
  // shadow of the rings on the globe (just below the front arc)
  const shadowBand: P[] = []
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI * (i / 40)
    shadowBand.push([cx + 100 * Math.cos(a), cy + 7 + 24 * Math.sin(a)])
  }
  for (let i = 40; i >= 0; i--) {
    const a = Math.PI * (i / 40)
    shadowBand.push([cx + 100 * Math.cos(a), cy + 13 + 27 * Math.sin(a)])
  }
  return {
    viewW: 220,
    viewH: 152,
    paths: [
      halo(cx, cy, R * 1.3, '255,190,140', 0.3),
      ...rings(false),
      // planet shadow falling on the far ring
      ...ringBands.map(([rx, ry, sw]) => ({ d: smooth(Array.from({ length: 9 }, (_, i): P => { const t = -1.12 + i * 0.07; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] }), false), stroke: 'rgba(8,6,26,0.5)', sw: sw + 0.4 })),
      {
        d: circ(cx, cy, R),
        fill: lin(0, cy - R, 0, cy + R, 0, '#f8dcae', 0.1, '#eab47a', 0.18, '#f5d39c', 0.28, '#c8814b', 0.36, '#e9b67e', 0.47, '#f6d9a4', 0.55, '#d48f55', 0.64, '#efc28c', 0.76, '#b96f3e', 0.86, '#e2a96e', 1, '#c27a45'),
      },
      { d: ell(cx + 16, cy + 22, 7, 3.2), fill: '#b5582f', alpha: 0.85 },
      { d: ell(cx + 15, cy + 21.4, 4, 1.6), fill: '#e88a5a', alpha: 0.8 },
      { d: pl(clampToCircle(shadowBand, cx, cy, R - 0.3)), fill: 'rgba(30,10,30,0.45)' },
      { d: circ(cx, cy, R), fill: rad(cx - 16, cy - 18, R * 1.55, 0, 'rgba(255,250,235,0.28)', 0.35, 'rgba(255,240,220,0)', 0.62, 'rgba(10,4,30,0.2)', 0.82, 'rgba(10,4,30,0.72)', 1, 'rgba(6,2,22,0.92)') },
      { d: `M${cx - R * 0.94} ${cy - R * 0.2}A${R} ${R} 0 0 1 ${cx + R * 0.15} ${cy - R * 0.99}`, stroke: 'rgba(255,240,215,0.75)', sw: 1.6 },
      ...rings(true),
      { d: ringArc(95, 23.2, true), stroke: lin(cx - 100, 0, cx + 100, 0, 0, 'rgba(255,255,255,0.45)', 0.4, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.35)'), sw: 6 },
    ],
  }
}

export function moon(): Art {
  return {
    viewW: 40,
    viewH: 40,
    paths: [
      { d: circ(20, 20, 16), fill: radLit(20, 20, 18, 0, '#f1f3f8', 0.6, '#b9bfcc', 1, '#5b6274') },
      { d: circ(14, 16, 3.6) + circ(25, 24, 4.4) + circ(22, 11, 2) + circ(12, 26, 2.2), fill: 'rgba(80,86,104,0.35)' },
      { d: circ(20, 20, 16), fill: rad(14, 14, 26, 0, 'rgba(0,0,0,0)', 0.6, 'rgba(0,0,0,0)', 1, 'rgba(5,6,24,0.75)') },
    ],
  }
}

// Earth horizon + exhaust trail for the take-off card.
export function launchSky(): Art {
  const r = rng(61)
  const puffs: VectorPath[] = []
  const trail: P[] = [[79, 69], [72, 75], [63, 82], [51, 88], [37, 94], [20, 99]]
  let all = ''
  trail.forEach(([x, y], i) => {
    const s2 = 3 + i * 1.9
    ;[0, 1, 2].forEach((k) => {
      const px = x + (r() - 0.5) * s2 * 1.2 + (k - 1) * s2 * 0.7
      const py = y + (r() - 0.5) * s2 * 0.6
      const pr = s2 * (0.65 + r() * 0.35)
      const d = circ(px, py, pr)
      all += d
      puffs.push({ d, fill: radLit(px, py, pr, 0, '#ffffff', 0.55, '#e6e0fa', 1, '#8f80c8') })
    })
  })
  const earth = circ(40, 228, 140)
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      bloom(40, 226, 156, '90,170,255', 0.7),
      { d: earth, fill: lin(0, 88, 0, 140, 0, '#3d8fe0', 0.25, '#1d5fb0', 1, '#0a2a5c') },
      { d: smooth([[-2, 96], [20, 92], [36, 94], [54, 91], [70, 95], [60, 99], [30, 99], [6, 101]]), fill: '#3fae6a', alpha: 0.7 },
      { d: smooth([[-4, 92.6], [16, 90], [34, 91.5], [26, 93]]) + smooth([[46, 92], [66, 93.6], [58, 95]]), fill: '#ffffff', alpha: 0.45 },
      shadeIn(earth, lin(0, 0, 120, 0, 0, '#ffffff', 0.5, '#c8d8f0', 1, '#1a2448'), 'multiply'),
      { d: 'M-100 228A140 140 0 0 1 180 228', stroke: '#bff0ff', sw: 1.4, alpha: 0.9, blend: 'screen' },
      { d: 'M-100 228A140 140 0 0 1 180 228', stroke: '#7cc8ff', sw: 6, alpha: 0.25, blend: 'screen' },
      ...puffs,
      shadeIn(all, rad(80, 68, 30, 0, 'rgba(255,170,80,0.9)', 1, 'rgba(255,140,60,0)'), 'screen'),
    ],
  }
}

export function rocket(): Art {
  const hw = (y: number) => {
    if (y <= 106) {
      const t = Math.min(1, Math.max(0, (y - 10) / 96))
      return 27 * Math.pow(1 - (1 - t) * (1 - t), 0.8)
    }
    return 27 - 5 * ((y - 106) / 66) ** 2
  }
  const prof = (y0: number, y1: number): [P[], P[]] => {
    const L: P[] = []
    const Rr: P[] = []
    for (let i = 0; i <= 30; i++) {
      const y = y0 + ((y1 - y0) * i) / 30
      L.push([60 - hw(y), y])
      Rr.push([60 + hw(y), y])
    }
    return [L, Rr]
  }
  const [bl, br] = prof(10, 172)
  const bodyPts: P[] = [...br, ...[...bl].reverse()]
  const seam = (y: number, sag = 6) => `M${n2(60 - hw(y))} ${y}Q60 ${y + sag} ${n2(60 + hw(y))} ${y}`
  const [nl, nr] = prof(10, 54)
  const seamPts: P[] = []
  for (let i = 1; i < 12; i++) {
    const t = i / 12
    const xa = 60 + hw(54)
    const xb = 60 - hw(54)
    seamPts.push([(1 - t) ** 2 * xa + 2 * (1 - t) * t * 60 + t * t * xb, (1 - t) ** 2 * 54 + 2 * (1 - t) * t * 60 + t * t * 54])
  }
  const nose = pl([...nr, ...seamPts, ...[...nl].reverse()])
  const stripeD = (y0: number, y1: number) => `M${n2(60 - hw(y0))} ${y0}Q60 ${y0 + 6} ${n2(60 + hw(y0))} ${y0}L${n2(60 + hw(y1))} ${y1}Q60 ${y1 + 6} ${n2(60 - hw(y1))} ${y1}Z`
  const METAL = lin(33, 0, 87, 0, 0, '#6c7689', 0.14, '#c9d0db', 0.3, '#ffffff', 0.55, '#d5dbe3', 0.82, '#8e98a8', 1, '#4e5768')
  const RED = lin(33, 0, 87, 0, 0, '#7d0816', 0.25, '#ff6b6b', 0.4, '#ff9e9e', 0.7, '#e63946', 1, '#7d0816')
  let rivets = ''
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU
    rivets += circ(60 + 18.5 * Math.cos(a), 84 + 18.5 * Math.sin(a), 0.9)
  }
  return {
    viewW: 120,
    viewH: 256,
    paths: [
      // exhaust flame (drawn first, behind the nozzle)
      halo(60, 206, 38, '255,150,40', 0.55),
      { d: 'M38 178Q30 216 60 254Q90 216 82 178Z', fill: lin(0, 178, 0, 254, 0, '#ff8a00', 0.7, '#ff4d00', 1, 'rgba(255,40,0,0)') },
      { d: 'M44 178Q40 208 60 238Q80 208 76 178Z', fill: lin(0, 178, 0, 238, 0, '#ffd23f', 1, '#ff8a00') },
      { d: 'M50 178Q48 200 60 218Q72 200 70 178Z', fill: lin(0, 178, 0, 218, 0, '#ffffff', 1, '#ffe98a') },
      bloom(60, 192, 30, '255,170,60', 0.75, 'lighter'),
      // fins
      { d: 'M36 116Q14 128 10 168L16 172L38 156Z', fill: lin(10, 0, 38, 0, 0, '#ff7676', 1, '#a10e1e'), stroke: INK, sw: 4 },
      { d: 'M84 116Q106 128 110 168L104 172L82 156Z', fill: lin(82, 0, 110, 0, 0, '#d42f3e', 1, '#6e0712'), stroke: INK, sw: 4 },
      // nozzle
      { d: 'M42 170L78 170L74 182L46 182Z', fill: lin(42, 0, 78, 0, 0, '#3b4252', 0.35, '#9aa3b2', 1, '#262b36'), stroke: INK, sw: 3.5 },
      // body
      { d: pl(bodyPts), fill: METAL },
      { d: nose, fill: RED },
      { d: stripeD(128, 138), fill: RED },
      { d: seam(54) + seam(128) + seam(138) + seam(160, 5), stroke: INK, sw: 2.2 },
      { d: pl(bodyPts), stroke: INK, sw: 4.5 },
      // centre fin seen edge-on
      { d: 'M56 140L64 140L63 178L57 178Z', fill: lin(56, 0, 64, 0, 0, '#ff8080', 1, '#9d0b1b'), stroke: INK, sw: 3 },
      gloss(smooth([[45, 66], [43, 96], [44, 122]], false), 4, 0.8),
      gloss('M48 34Q52 24 58 18', 3, 0.85),
      // porthole
      { d: circ(60, 84, 21), fill: lin(40, 64, 80, 104, 0, '#f5f7fa', 0.5, '#9aa3b2', 1, '#4e5768'), stroke: INK, sw: 3.5 },
      { d: rivets, fill: '#4e5768' },
      { d: circ(60, 84, 14.5), fill: radLit(60, 84, 15, 0, '#d8f1ff', 0.45, '#4da8ef', 1, '#123b7a'), stroke: INK, sw: 3 },
      { d: 'M50 80Q52 72 60 71', stroke: 'rgba(255,255,255,0.9)', sw: 3 },
      { d: circ(67, 92, 1.8), fill: 'rgba(255,255,255,0.6)' },
      shadeIn(pl(bodyPts), lin(33, 0, 87, 0, 0, 'rgba(255,255,255,0)', 0.75, 'rgba(255,255,255,0)', 1, 'rgba(120,170,255,0.5)'), 'screen'),
      bloom(46, 60, 10, '255,255,255', 0.9),
      { d: sparkle(46, 60, 6) + sparkle(52, 77, 3.4), fill: '#ffffff' },
    ],
  }
}

// ============================================================================
// PARODY SWIMMING LICENCE (clearly fictional)
// ============================================================================
function rosette(cx: number, cy: number, a: number, b: number, k: number, sy: number, phase: number): string {
  const pts: P[] = []
  const N = 360
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * TAU
    pts.push([cx + a * Math.cos(t) + b * Math.cos(k * t + phase), cy + (a * Math.sin(t) - b * Math.sin(k * t + phase)) * sy])
  }
  return pl(pts, false)
}

export function licenceBackdrop(): Art {
  let guil = ''
  for (let i = 0; i < 6; i++) guil += rosette(104, 58, 30, 9, 11, 0.85, (i / 6) * TAU)
  let waves = ''
  for (let i = 0; i < 7; i++) {
    const y = 4 + i * 2.4
    const pts: P[] = []
    for (let x = 0; x <= 160; x += 2) pts.push([x, y + Math.sin(x * 0.12 + i * 0.7) * 1.2])
    waves += pl(pts, false)
  }
  let bottomWaves = ''
  for (let i = 0; i < 5; i++) {
    const y = 82 + i * 1.4
    const pts: P[] = []
    for (let x = 0; x <= 160; x += 2) pts.push([x, y + Math.sin(x * 0.18 + i) * 0.8])
    bottomWaves += pl(pts, false)
  }
  const bar = (x: number, y: number, w: number, h: number) => rrect(x, y - h / 2, w, h, h / 2)
  const labels = bar(58, 30, 16, 1.5) + bar(104, 30, 13, 1.5) + bar(58, 44, 10, 1.5) + bar(104, 44, 12, 1.5) + bar(58, 58, 15, 1.5) + bar(58, 72, 19, 1.5)
  const values = bar(58, 35.4, 32, 3.4) + bar(58, 49.4, 19, 3.4) + bar(104, 49.4, 26, 3.4) + bar(58, 63.4, 46, 3.4)
  const signature = smooth([[104, 38], [106.5, 33], [108.4, 38.6], [111, 33.6], [113, 38.2], [116.5, 33.4], [119, 38], [123, 34.6], [127, 37.2], [131, 35], [137, 36.4], [142, 34.2]], false)
  // category pictograms: jellyfish, bubbles, wave
  const icon = (x: number) => circ(x, 78, 3.6)
  const jelly = `M58.6 78.4Q58.6 74.8 61 74.8Q63.4 74.8 63.4 78.4Z` + `M59.4 78.6Q59 80.4 59.8 81.4M61 78.6V81.8M62.6 78.6Q63 80.4 62.2 81.4`
  const bub = circ(70, 79, 1.3) + circ(72, 76.6, 0.9) + circ(73.4, 79.4, 0.7)
  const wav = 'M79.6 78.6Q80.8 76.6 82 78.6T84.4 78.6M79.6 80.6Q80.8 78.6 82 80.6T84.4 80.6'
  // chevron machine-readable zone
  let mrz = ''
  let blocks = ''
  const r = rng(29)
  ;[92.4, 97.2].forEach((y, row) => {
    for (let i = 0; i < 40; i++) {
      const x = 8 + i * 3.6
      const kind = row === 0 ? (i > 22 ? 0 : 1) : i < 6 || (i > 12 && i < 20) ? 1 : 0
      if (kind === 0) mrz += `M${n2(x + 1.8)} ${n2(y - 1.4)}L${n2(x + 0.6)} ${n2(y)}L${n2(x + 1.8)} ${n2(y + 1.4)}`
      else blocks += rrect(x + 0.4, y - 1.4, 1.8 + r() * 0.6, 2.8, 0.4)
    }
  })
  let bubbles = ''
  for (let i = 0; i < 9; i++) bubbles += circ(12 + r() * 34, 36 + r() * 30, 0.6 + r() * 1.4)
  const win = rrect(8, 28, 41, 55, 2.2)
  const crestStar: P[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? 2.2 : 5
    crestStar.push([13 + rr * Math.cos(a), 10.5 + rr * Math.sin(a)])
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: guil, stroke: '#2d7fd0', sw: 0.22, alpha: 0.22 },
      { d: bottomWaves, stroke: '#2d7fd0', sw: 0.25, alpha: 0.25 },
      { d: star(118, 58, 26, 11, 5), fill: '#1d6fd8', alpha: 0.04 },
      // header band with crest and title bars
      { d: rect(0, 0, 160, 21), fill: lin(0, 0, 160, 21, 0, '#0a3478', 0.55, '#1562c4', 1, '#0aa3c2') },
      { d: waves, stroke: '#ffffff', sw: 0.25, alpha: 0.18 },
      shadeIn(rect(0, 0, 160, 21), lin(0, 0, 0, 21, 0, 'rgba(255,255,255,0.3)', 0.5, 'rgba(255,255,255,0)'), 'screen'),
      { d: rect(0, 21, 160, 1.1), fill: lin(0, 0, 160, 0, 0, '#ffd75e', 0.5, '#fff3c0', 1, '#e8b83a') },
      { d: circ(13.6, 11.2, 7.4), fill: 'rgba(0,20,60,0.35)' },
      { d: circ(13, 10.5, 7.4), fill: radLit(13, 10.5, 7.4, 0, '#fff4c0', 0.55, '#f2b82c', 1, '#8a5a0a'), stroke: '#6b4a08', sw: 0.4 },
      { d: pl(crestStar), fill: lin(8, 6, 18, 15, 0, '#ff9a7a', 1, '#d2452a'), stroke: '#6b2a10', sw: 0.35 },
      { d: bar(25, 8.4, 54, 4.6), fill: '#ffffff' },
      { d: bar(25, 15, 32, 2.2), fill: '#cfe8ff', alpha: 0.8 },
      { d: bar(120, 8, 32, 2.4) + bar(130, 13.6, 22, 2), fill: '#cfe8ff', alpha: 0.85 },
      // portrait window with underwater light
      { d: rrect(8.6, 28.6, 41, 55, 2.2), fill: 'rgba(10,40,90,0.18)' },
      { d: win, fill: lin(0, 28, 0, 83, 0, '#d4f0ff', 0.6, '#7cc6f2', 1, '#3d93d6') },
      { d: godRays(18, 20, [62, 74, 86, 98, 110], 70, 0.06, '255,255,255', 0.35).d, fill: rad(18, 20, 70, 0, 'rgba(255,255,255,0.4)', 1, 'rgba(255,255,255,0)'), clip: win, blend: 'screen' },
      { d: bubbles, stroke: '#ffffff', sw: 0.35, alpha: 0.7 },
      { d: rect(8.3, 77, 40.4, 5.7), fill: lin(0, 77, 0, 83, 0, '#f3dc9c', 1, '#d9b86a') },
      { d: win, stroke: '#0a3478', sw: 0.6 },
      // fields
      { d: labels, fill: '#8aa3c4' },
      { d: values, fill: '#0b1f44' },
      { d: signature, stroke: '#1d4ed8', sw: 0.75 },
      { d: icon(61) + icon(71.5) + icon(82), fill: '#ffffff', stroke: '#0b3d91', sw: 0.45 },
      { d: jelly, fill: '#f7a8c8', stroke: '#0b3d91', sw: 0.4 },
      { d: bub, fill: '#bfe6ff', stroke: '#0b3d91', sw: 0.35 },
      { d: wav, stroke: '#0b3d91', sw: 0.5 },
      // MRZ zone
      { d: rect(0, 88.5, 160, 12.5), fill: 'rgba(255,255,255,0.6)' },
      { d: mrz, stroke: '#33415c', sw: 0.55 },
      { d: blocks, fill: '#33415c' },
    ],
  }
}

// Glossy laminate sheen laid over the whole licence.
export function laminate(): Art {
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: rect(0, 0, 160, 101), fill: lin(0, 0, 160, 101, 0, 'rgba(255,255,255,0)', 0.36, 'rgba(255,255,255,0)', 0.44, 'rgba(255,255,255,0.28)', 0.5, 'rgba(255,255,255,0.08)', 0.56, 'rgba(255,255,255,0.22)', 0.62, 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,0)'), blend: 'screen' },
      { d: rect(0, 0, 160, 101), fill: rad(140, 96, 120, 0, 'rgba(0,30,80,0.12)', 1, 'rgba(0,30,80,0)'), blend: 'multiply' },
    ],
  }
}

// Holographic foil seal: rainbow wedges + white guilloche rosette + glare.
export function holoSeal(): Art {
  // holographic foil seal
  const sx = 16
  const sy = 16
  const SR = 12
  const holoCols = ['#ffd1f1', '#c7f0ff', '#d6ffd8', '#fff3b8', '#e3d4ff', '#bff7f0']
  const wedges: VectorPath[] = holoCols.map((c, j) => {
    let d = ''
    for (let i = j; i < 36; i += holoCols.length) {
      const a0 = (i / 36) * TAU
      const a1 = ((i + 1.05) / 36) * TAU
      d += pl([[sx, sy], [sx + SR * Math.cos(a0), sy + SR * Math.sin(a0)], [sx + SR * Math.cos(a1), sy + SR * Math.sin(a1)]])
    }
    return { d, fill: c }
  })
  let seal = ''
  for (let i = 0; i < 4; i++) seal += rosette(sx, sy, 5.4, 3, 7, 1, (i / 4) * TAU)
  const glare = pl(clampToCircle([[sx - 14, sy + 4], [sx + 2, sy - 14], [sx + 7, sy - 9], [sx - 9, sy + 9]], sx, sy, SR - 0.4))
  // starfish emblem
  const fish: P[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? 1.6 : 4
    fish.push([sx + rr * Math.cos(a), sy + rr * Math.sin(a)])
  }
  return {
    viewW: 32,
    viewH: 32,
    paths: [
      halo(sx, sy, SR + 4, '120,200,255', 0.35),
      ...wedges,
      { d: circ(sx, sy, SR), fill: rad(sx - 3, sy - 3, SR, 0, 'rgba(255,255,255,0.6)', 1, 'rgba(255,255,255,0)') },
      { d: seal, stroke: '#ffffff', sw: 0.3, alpha: 0.85 },
      { d: glare, fill: '#ffffff', alpha: 0.45 },
      { d: pl(fish), fill: 'rgba(255,255,255,0.8)', stroke: '#6b7fa0', sw: 0.35 },
      { d: circ(sx, sy, SR) + circ(sx, sy, SR - 1.6), stroke: '#8496b4', sw: 0.35 },
      { d: `M${sx - SR * 0.95} ${sy + 3}A${SR} ${SR} 0 0 1 ${sx + 3} ${sy - SR * 0.95}`, stroke: 'rgba(255,255,255,0.9)', sw: 0.8, blend: 'screen' },
      { d: `M${sx + SR * 0.95} ${sy - 3}A${SR} ${SR} 0 0 1 ${sx - 3} ${sy + SR * 0.95}`, stroke: 'rgba(40,50,90,0.45)', sw: 0.8, blend: 'multiply' },
    ],
  }
}
