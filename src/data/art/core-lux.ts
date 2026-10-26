import type { RadialPaint, VectorPath } from '../../types'
import { blob, circ, dots, ell, lin, poly, rad, radLit, rect, rng, shade, softShadow, star, type Art } from './kit'
import { rotEll } from './cardparts'

// Premium artwork for the luxury / metal / minimal collections and the
// Signature series. One key light everywhere: top-left, slightly in front.
// Depth comes from facet shading, bevels, cast shadows, rim light and glints.

const W = 160
const H = 101
const BIG = 'M-60 -60H420V320H-60Z' // covers any view box (for evenodd masks)
const PI = Math.PI
const r2 = (v: number) => Math.round(v * 100) / 100

// ---- geometry ---------------------------------------------------------------
// Translate / scale an SVG path. Absolute coordinates are mapped, relative ones scaled.
export function tf(d: string, dx: number, dy: number, s = 1): string {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? []
  let out = ''
  let cmd = ''
  let i = 0
  for (const t of tok) {
    if (/[a-zA-Z]/.test(t)) {
      cmd = t
      i = 0
      out += t
      continue
    }
    let v = parseFloat(t)
    const abs = cmd === cmd.toUpperCase()
    const up = cmd.toUpperCase()
    if (up === 'A') {
      const k = i % 7
      if (k < 2) v *= s
      else if (k === 5) v = abs ? v * s + dx : v * s
      else if (k === 6) v = abs ? v * s + dy : v * s
    } else if (up === 'H') v = abs ? v * s + dx : v * s
    else if (up === 'V') v = abs ? v * s + dy : v * s
    else v = abs ? v * s + (i % 2 ? dy : dx) : v * s
    out += (/[a-zA-Z]$/.test(out) ? '' : ' ') + r2(v)
    i++
  }
  return out
}

// Circle wound the other way (to punch holes that survive nonzero clipping).
function circR(cx: number, cy: number, r: number): string {
  return `M${r2(cx - r)} ${r2(cy)}a${r2(r)} ${r2(r)} 0 1 1 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 1 ${r2(-2 * r)} 0Z`
}
function annulus(cx: number, cy: number, ro: number, ri: number): string {
  return circ(cx, cy, ro) + circR(cx, cy, ri)
}

// Rounded rectangle as points (clockwise), optionally rotated about its centre.
function rrPts(cx: number, cy: number, w: number, h: number, r: number, deg = 0): number[] {
  const pts: number[] = []
  const a = (deg * PI) / 180
  const corners: [number, number, number][] = [
    [w / 2 - r, -h / 2 + r, -PI / 2],
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, PI / 2],
    [-w / 2 + r, -h / 2 + r, PI],
  ]
  for (const [x, y, a0] of corners) {
    for (let k = 0; k <= 6; k++) {
      const t = a0 + (k / 6) * (PI / 2)
      const px = x + r * Math.cos(t)
      const py = y + r * Math.sin(t)
      pts.push(cx + px * Math.cos(a) - py * Math.sin(a), cy + px * Math.sin(a) + py * Math.cos(a))
    }
  }
  return pts
}
function rr(cx: number, cy: number, w: number, h: number, r: number, deg = 0): string {
  return poly(rrPts(cx, cy, w, h, r, deg))
}
function rrRev(cx: number, cy: number, w: number, h: number, r: number, deg = 0): string {
  const p = rrPts(cx, cy, w, h, r, deg)
  const out: number[] = []
  for (let i = p.length - 2; i >= 0; i -= 2) out.push(p[i], p[i + 1])
  return poly(out)
}

// Smooth open curve through points (quadratic midpoints).
function smooth(pts: number[]): string {
  if (pts.length < 6) return poly(pts, false)
  let d = `M${r2(pts[0])} ${r2(pts[1])}`
  for (let i = 2; i < pts.length - 2; i += 2) {
    const mx = (pts[i] + pts[i + 2]) / 2
    const my = (pts[i + 1] + pts[i + 3]) / 2
    d += `Q${r2(pts[i])} ${r2(pts[i + 1])} ${r2(mx)} ${r2(my)}`
  }
  return d + `L${r2(pts[pts.length - 2])} ${r2(pts[pts.length - 1])}`
}

// ---- lighting -----------------------------------------------------------------
type V3 = [number, number, number]
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const LIGHT = norm([-0.55, -0.62, 0.58])
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1])

// Normal of a 3D triangle, facing the viewer (+z).
function faceN(a: V3, b: V3, c: V3): V3 {
  const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const n = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]])
  return n[2] < 0 ? [-n[0], -n[1], -n[2]] : n
}
function diffuse(n: V3) {
  return Math.max(0, dot(n, LIGHT))
}
function spec(n: V3, p = 30) {
  return Math.pow(Math.max(0, dot(n, HALF)), p)
}

// Colour ramp (hex stops) → rgb string.
function hex3(h: string): V3 {
  const v = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as V3
}
function ramp(stops: [number, string][], t: number, add = 0): string {
  t = Math.max(0, Math.min(1, t))
  let i = 0
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++
  const [t0, c0] = stops[i]
  const [t1, c1] = stops[i + 1]
  const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
  const a = hex3(c0)
  const b = hex3(c1)
  const c = a.map((x, j) => Math.round(Math.min(255, x + (b[j] - x) * k + add * 255)))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

// ---- reusable effects -----------------------------------------------------------
// Blurred cast shadow of any shape (ring of offset copies).
function castShadow(d: string, dx: number, dy: number, a = 0.4, blur = 1.5, col = '0,0,0'): VectorPath[] {
  const out: VectorPath[] = []
  const n = 8
  for (let i = 0; i < n; i++) {
    const t = (i / n) * PI * 2
    out.push({ d: tf(d, dx + Math.cos(t) * blur, dy + Math.sin(t) * blur), fill: `rgba(${col},${(a / 5).toFixed(3)})` })
  }
  out.push({ d: tf(d, dx * 0.6, dy * 0.6), fill: `rgba(${col},${(a * 0.35).toFixed(3)})` })
  return out
}

// Raised bevel: light on edges facing the light, dark on the far edges.
function bevel(d: string, o: number, light: string, dark: string): VectorPath[] {
  return [
    { d: BIG + tf(d, o, o), rule: 'evenodd', fill: light, clip: d },
    { d: BIG + tf(d, -o, -o), rule: 'evenodd', fill: dark, clip: d },
  ]
}

function glow(cx: number, cy: number, r: number, col: string, a: number, blend: GlobalCompositeOperation = 'screen'): VectorPath {
  return { d: circ(cx, cy, r), fill: rad(cx, cy, r, 0, `rgba(${col},${a})`, 0.35, `rgba(${col},${a * 0.45})`, 1, `rgba(${col},0)`), blend }
}

// Star-shaped sparkle with bloom.
function glint(cx: number, cy: number, s: number, a = 1, col = '255,255,255'): VectorPath[] {
  return [
    glow(cx, cy, s * 0.8, col, 0.6 * a),
    { d: star(cx, cy, s, s * 0.06, 4, 0), fill: `rgba(${col},${0.9 * a})`, blend: 'screen' },
    { d: star(cx, cy, s * 0.42, s * 0.05, 4, 45), fill: `rgba(${col},${0.6 * a})`, blend: 'screen' },
    { d: circ(cx, cy, s * 0.09), fill: `rgba(255,255,255,${a})` },
  ]
}

// Soft diagonal reflection band (lacquer / clear-coat / polished metal).
function sheen(x: number, w: number, a: number, slant = 46, col = '255,255,255', blend: GlobalCompositeOperation = 'screen'): VectorPath {
  return {
    d: poly([x, -2, x + w, -2, x + w - slant, 103, x - slant, 103]),
    fill: lin(x - slant / 2, 50, x + w - slant / 2, 50, 0, `rgba(${col},0)`, 0.5, `rgba(${col},${a})`, 1, `rgba(${col},0)`),
    blend,
  }
}

function vignette(a: number, col = '0,0,0', cx = 70, cy = 40): VectorPath {
  return { d: rect(0, 0, W, H), fill: rad(cx, cy, 120, 0, `rgba(${col},0)`, 0.55, `rgba(${col},0)`, 1, `rgba(${col},${a})`), blend: 'multiply' }
}

// Anisotropic "sunray" brushing: conic light lobes + radial hairlines.
function sunray(cx: number, cy: number, light: string, dark: string, la: number, da: number, phi = -135, hair = 0.12): VectorPath[] {
  const levels = 12
  const lightD: string[] = Array(levels).fill('')
  const darkD: string[] = Array(levels).fill('')
  const n = 180
  const R = 240
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * PI * 2
    const a1 = ((i + 1.08) / n) * PI * 2
    const mid = (a0 + a1) / 2
    const b = Math.pow(Math.abs(Math.cos(mid - (phi * PI) / 180)), 2.5)
    const tri = poly([cx, cy, cx + R * Math.cos(a0), cy + R * Math.sin(a0), cx + R * Math.cos(a1), cy + R * Math.sin(a1)])
    lightD[Math.min(levels - 1, Math.floor(b * levels))] += tri
    darkD[Math.min(levels - 1, Math.floor((1 - b) * levels))] += tri
  }
  const out: VectorPath[] = []
  lightD.forEach((d, k) => d && out.push({ d, fill: `rgba(${light},${((la * (k + 0.5)) / levels).toFixed(3)})`, blend: 'screen' }))
  darkD.forEach((d, k) => d && out.push({ d, fill: `rgba(${dark},${((da * (k + 0.5)) / levels).toFixed(3)})`, blend: 'multiply' }))
  const r = rng(31)
  let hl = ''
  let hd = ''
  for (let i = 0; i < 420; i++) {
    const a = r() * PI * 2
    const r0 = 3 + r() * 40
    const seg = `M${r2(cx + r0 * Math.cos(a))} ${r2(cy + r0 * Math.sin(a))}L${r2(cx + R * Math.cos(a))} ${r2(cy + R * Math.sin(a))}`
    if (i % 2) hl += seg
    else hd += seg
  }
  out.push({ d: hl, stroke: `rgba(${light},${hair})`, sw: 0.14, blend: 'screen' })
  out.push({ d: hd, stroke: `rgba(${dark},${hair})`, sw: 0.14, blend: 'multiply' })
  return out
}

// ===================================================================================
// CORE LUX
// ===================================================================================

// Onyx: a black brilliant-cut gem set in a polished bezel, on faceted obsidian.
export function onyxFacets(): Art {
  const paths: VectorPath[] = []
  // faceted obsidian relief, lit from the top-left
  const r = rng(77)
  const cols = 8
  const rows = 5
  const pts: V3[][] = []
  for (let y = 0; y <= rows; y++) {
    const row: V3[] = []
    for (let x = 0; x <= cols; x++) {
      const jx = x === 0 || x === cols ? 0 : (r() - 0.5) * 14
      const jy = y === 0 || y === rows ? 0 : (r() - 0.5) * 12
      row.push([(x / cols) * W + jx, (y / rows) * H + jy, r() * 9])
    }
    pts.push(row)
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = pts[y][x]
      const b = pts[y][x + 1]
      const c = pts[y + 1][x + 1]
      const d = pts[y + 1][x]
      for (const tri of [[a, b, c], [a, c, d]] as V3[][]) {
        const n = faceN(tri[0], tri[1], tri[2])
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3
        const fall = 1 - Math.hypot(cx - 20, cy - 10) / 190
        const v = Math.round(7 + 22 * diffuse(n) * fall + 40 * spec(n, 40) * fall)
        paths.push({ d: poly(tri.flatMap((p) => [p[0], p[1]])), fill: `rgb(${v},${v},${v + 3})` })
      }
    }
  }
  let edges = ''
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const a = pts[y][x]
      const b = pts[y][x + 1]
      const c = pts[y + 1][x + 1]
      const d = pts[y + 1][x]
      edges += poly([a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]) + `M${r2(a[0])} ${r2(a[1])}L${r2(c[0])} ${r2(c[1])}`
    }
  paths.push({ d: edges, stroke: 'rgba(255,255,255,0.05)', sw: 0.3 })
  paths.push(sheen(60, 34, 0.05))

  // gem
  const cx = 117
  const cy = 50.5
  const R = 30
  paths.push(...castShadow(circ(cx, cy, R + 3.4), 1.8, 2.8, 0.85, 2.2))
  // fine engraved halo rings around the setting
  for (let k = 0; k < 6; k++) paths.push({ d: circ(cx, cy, R + 7 + k * 3.2), stroke: `rgba(255,255,255,${(0.05 - k * 0.007).toFixed(3)})`, sw: 0.25 })
  // polished bezel
  const bez = annulus(cx, cy, R + 3.4, R)
  paths.push({ d: bez, fill: lin(cx - R, cy - R, cx + R, cy + R, 0, '#f4f6f9', 0.25, '#a3aab3', 0.5, '#e9ecf0', 0.75, '#5d636c', 1, '#2b2f35') })
  paths.push(...bevel(bez, 0.6, 'rgba(255,255,255,0.6)', 'rgba(0,0,0,0.5)'))
  paths.push({ d: circ(cx, cy, R), stroke: 'rgba(0,0,0,0.85)', sw: 0.6 })

  // brilliant cut, viewed from the top
  const t = 0.62
  const P = (ang: number, rr_: number): V3 => [cx + rr_ * Math.cos(ang), cy + rr_ * Math.sin(ang), (R - rr_) * t]
  const rt = 0.55 * R
  const rs = 0.8 * R
  const T = Array.from({ length: 8 }, (_, k) => P(((k + 0.5) * PI) / 4, rt))
  const tz = T[0][2]
  T.forEach((p) => (p[2] = tz))
  const S = Array.from({ length: 8 }, (_, k) => P(((k + 1) * PI) / 4, rs))
  const G = Array.from({ length: 8 }, (_, k) => P(((k + 0.5) * PI) / 4, R))
  const M = Array.from({ length: 8 }, (_, k) => P(((k + 1) * PI) / 4, R))
  const L2 = norm([0.7, -0.15, 0.7])
  const facet = (ps: V3[], n: V3) => {
    const rv: V3 = [2 * n[2] * n[0], 2 * n[2] * n[1], 2 * n[2] * n[2] - 1]
    const b =
      0.05 +
      0.12 * diffuse(n) +
      1.1 * Math.pow(Math.max(0, dot(rv, LIGHT)), 14) +
      0.45 * Math.pow(Math.max(0, dot(rv, L2)), 10)
    const v = Math.round(Math.min(255, 10 + 245 * b))
    const flat = ps.flatMap((p) => [p[0], p[1]])
    const xs = ps.map((p) => p[0])
    const ys = ps.map((p) => p[1])
    paths.push({
      d: poly(flat),
      fill: lin(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 0, `rgb(${Math.min(255, v + 18)},${Math.min(255, v + 18)},${Math.min(255, v + 24)})`, 1, `rgb(${Math.round(v * 0.7)},${Math.round(v * 0.7)},${Math.round(v * 0.75)})`),
    })
  }
  for (let k = 0; k < 8; k++) {
    const k1 = (k + 1) % 8
    const km = (k + 7) % 8
    facet([T[k], T[k1], S[k]], faceN(T[k], T[k1], S[k]))
    const kite = [T[k], S[km], G[k], S[k]]
    facet(kite, faceN(S[km], G[k], S[k]))
    facet([S[k], G[k], M[k]], faceN(S[k], G[k], M[k]))
    facet([S[k], M[k], G[k1]], faceN(S[k], M[k], G[k1]))
  }
  const table = poly(T.flatMap((p) => [p[0], p[1]]))
  paths.push({ d: table, fill: lin(cx - rt, cy - rt, cx + rt, cy + rt, 0, '#2a2c33', 0.5, '#0b0b0e', 1, '#16171c') })
  paths.push({ d: poly([cx - 20, cy - 30, cx - 9, cy - 30, cx + 9, cy + 30, cx - 2, cy + 30]), fill: 'rgba(255,255,255,0.09)', clip: table, blend: 'screen' })
  // crisp polished facet edges
  let fe = table
  for (let k = 0; k < 8; k++) {
    const k1 = (k + 1) % 8
    fe += `M${r2(T[k][0])} ${r2(T[k][1])}L${r2(S[k][0])} ${r2(S[k][1])}L${r2(T[k1][0])} ${r2(T[k1][1])}`
    fe += `M${r2(S[k][0])} ${r2(S[k][1])}L${r2(G[k][0])} ${r2(G[k][1])}M${r2(S[k][0])} ${r2(S[k][1])}L${r2(M[k][0])} ${r2(M[k][1])}L${r2(G[k1][0])} ${r2(G[k1][1])}`
    fe += `M${r2(T[k][0])} ${r2(T[k][1])}L${r2(G[k][0])} ${r2(G[k][1])}`
  }
  paths.push({ d: fe, stroke: 'rgba(255,255,255,0.2)', sw: 0.22 })
  paths.push({ d: circ(cx, cy, R), stroke: lin(cx - R, cy - R, cx + R, cy + R, 0, 'rgba(255,255,255,0.7)', 0.5, 'rgba(255,255,255,0.05)', 1, 'rgba(255,255,255,0.3)'), sw: 0.35 })
  paths.push(...glint(T[5][0], T[5][1], 7, 0.9))
  paths.push(...glint(S[4][0] + 1, S[4][1] + 1, 4, 0.6))
  paths.push(...glint(cx + 21, cy + 18, 3.2, 0.45))
  return { viewW: W, viewH: H, paths }
}

// Total solar eclipse: streamer corona, earthshine, diamond-ring flare.
export function eclipse(): Art {
  const cx = 114
  const cy = 46
  const R = 23
  const r = rng(808)
  const paths: VectorPath[] = [
    { d: dots(160, 314, W, H, 0.1, 0.28), fill: 'rgba(220,226,255,0.45)' },
    { d: dots(36, 99, W, H, 0.25, 0.5), fill: 'rgba(255,255,255,0.8)' },
    glow(cx, cy, R * 3.4, '255,190,120', 0.16),
    {
      d: circ(cx, cy, R * 2.6),
      fill: rad(cx, cy, R * 2.6, 0, 'rgba(255,240,215,0.95)', 0.385, 'rgba(255,236,205,0.9)', 0.48, 'rgba(255,200,140,0.32)', 0.7, 'rgba(255,160,90,0.08)', 1, 'rgba(255,160,90,0)'),
      blend: 'screen',
    },
  ]
  // coronal streamers, longer along a tilted equator
  const groups = ['', '', '']
  for (let i = 0; i < 220; i++) {
    const a = r() * PI * 2
    const eq = Math.pow(Math.abs(Math.cos(a + 0.35)), 3)
    const L = R * (0.15 + Math.pow(r(), 2) * 0.7 + eq * r() * 1.5)
    const hw = (0.4 + r() * 1.3) / R
    const tip = R + L
    groups[i % 3] += poly([
      cx + R * 0.97 * Math.cos(a - hw),
      cy + R * 0.97 * Math.sin(a - hw),
      cx + tip * Math.cos(a + (r() - 0.5) * 0.04),
      cy + tip * Math.sin(a + (r() - 0.5) * 0.04),
      cx + R * 0.97 * Math.cos(a + hw),
      cy + R * 0.97 * Math.sin(a + hw),
    ])
  }
  const sr = R * 2.9
  groups.forEach((d, i) =>
    paths.push({
      d,
      fill: rad(cx, cy, sr, 0, 'rgba(255,245,225,0.8)', R / sr, 'rgba(255,240,215,0.7)', 0.6, 'rgba(255,205,150,0.14)', 1, 'rgba(255,190,130,0)'),
      alpha: 0.35 + i * 0.2,
      blend: 'screen',
    }),
  )
  paths.push(
    { d: circ(cx, cy, R + 1.2), stroke: 'rgba(255,240,220,0.35)', sw: 3.2, blend: 'screen' },
    { d: circ(cx, cy, R + 0.5), stroke: 'rgba(255,250,240,0.9)', sw: 1.1, blend: 'screen' },
    // moon with faint earthshine on the lower-left limb
    { d: circ(cx, cy, R), fill: rad(cx - 5, cy - 5, R * 1.3, 0, '#15161b', 1, '#030304') },
    { d: circ(cx, cy, R), fill: lin(cx - R, cy + R, cx + 4, cy - 4, 0, 'rgba(110,130,170,0.2)', 1, 'rgba(110,130,170,0)'), blend: 'screen' },
    { d: circ(cx, cy, R + 0.15), stroke: 'rgba(255,90,120,0.55)', sw: 0.5, blend: 'screen' },
  )
  // prominences
  for (const [a, s] of [[0.6, 1.3], [2.3, 1], [3.6, 1.6]] as const) {
    const px = cx + (R + 0.4) * Math.cos(a)
    const py = cy + (R + 0.4) * Math.sin(a)
    paths.push({ d: blob(px, py, s, s * 0.35, 3, a), fill: 'rgba(255,70,110,0.85)', blend: 'screen' })
  }
  // diamond ring (towards the key light) + Baily's beads
  const da = (-135 * PI) / 180
  const px = cx + R * Math.cos(da)
  const py = cy + R * Math.sin(da)
  for (const off of [-0.22, -0.3, 0.16]) {
    const bx = cx + R * Math.cos(da + off)
    const by = cy + R * Math.sin(da + off)
    paths.push(glow(bx, by, 2.2, '255,250,235', 0.9), { d: circ(bx, by, 0.4), fill: '#fff' })
  }
  paths.push(
    glow(px, py, 20, '255,240,210', 0.55),
    glow(px, py, 8, '255,255,255', 0.95),
    { d: ell(px, py, 46, 0.7), fill: lin(px - 46, py, px + 46, py, 0, 'rgba(170,205,255,0)', 0.5, 'rgba(190,215,255,0.7)', 1, 'rgba(170,205,255,0)'), blend: 'screen' },
    { d: star(px, py, 24, 0.5, 4, 0), fill: 'rgba(255,255,255,0.85)', blend: 'screen' },
    { d: star(px, py, 11, 0.35, 4, 45), fill: 'rgba(255,255,255,0.6)', blend: 'screen' },
    { d: circ(px, py, 2), fill: '#ffffff' },
    // lens ghosts along the flare axis
    { d: circ(cx + (cx - px) * 1.55, cy + (cy - py) * 1.55, 6), stroke: 'rgba(160,200,255,0.05)', sw: 0.6, blend: 'screen' },
  )
  for (const [x, y, s] of [[18, 82, 2.4], [62, 14, 1.8], [150, 88, 2], [40, 30, 1.4]] as const) paths.push(...glint(x, y, s, 0.7, '220,230,255'))
  return { viewW: W, viewH: H, paths }
}

// Imperial: engraved gold sunray field (backdrop).
export function goldSunray(): Art {
  return {
    viewW: W,
    viewH: H,
    paths: [
      ...sunray(117, 50, '255,244,214', '70,44,8', 0.5, 0.45, -135, 0.18),
      sheen(40, 40, 0.18),
      vignette(0.5, '40,24,4'),
    ],
  }
}

// Imperial: raised gold medallion — beaded rim, guilloché field, laurel, faceted star.
export function medallion(): Art {
  const c = 50
  const R = 47
  const gold = (x0: number, y0: number, x1: number, y1: number) =>
    lin(x0, y0, x1, y1, 0, '#fff5d2', 0.3, '#e2b558', 0.55, '#f7da8e', 0.8, '#a7772a', 1, '#5e400e')
  const paths: VectorPath[] = []
  const rim = annulus(c, c, R, R - 6)
  const field = circ(c, c, R - 6)
  paths.push({ d: field, fill: rad(c - 12, c - 14, R * 1.15, 0, '#f1cf7c', 0.55, '#c39441', 1, '#7a5418') })
  // engraved guilloché rosette in the field
  let g = ''
  for (let k = 0; k < 48; k++) {
    const t = (k / 48) * PI * 2
    g += circ(c + 9 * Math.cos(t), c + 9 * Math.sin(t), 27)
  }
  paths.push({ d: tf(g, -0.25, -0.25), stroke: 'rgba(70,44,8,0.5)', sw: 0.28, clip: field })
  paths.push({ d: tf(g, 0.25, 0.25), stroke: 'rgba(255,240,200,0.45)', sw: 0.24, clip: field })
  // inner recess shading
  paths.push({ d: BIG + circ(c + 1.6, c + 2, R - 6), rule: 'evenodd', fill: 'rgba(60,35,5,0.45)', clip: field })
  paths.push({ d: BIG + circ(c - 1, c - 1.2, R - 6), rule: 'evenodd', fill: 'rgba(255,245,210,0.35)', clip: field })
  // rim
  paths.push({ d: rim, fill: gold(0, 0, 100, 100) })
  paths.push(...bevel(rim, 0.8, 'rgba(255,250,225,0.8)', 'rgba(60,35,5,0.6)'))
  let beads = ''
  for (let k = 0; k < 64; k++) {
    const t = (k / 64) * PI * 2
    beads += circ(c + (R - 3) * Math.cos(t), c + (R - 3) * Math.sin(t), 1.15)
  }
  paths.push({ d: tf(beads, 0.4, 0.5), fill: 'rgba(60,35,5,0.55)' })
  paths.push({ d: beads, fill: radLit(c, c, R, 0, '#fff7da', 0.6, '#e3b75c', 1, '#8b6220') })
  let bh = ''
  for (let k = 0; k < 64; k++) {
    const t = (k / 64) * PI * 2
    bh += circ(c + (R - 3) * Math.cos(t) - 0.4, c + (R - 3) * Math.sin(t) - 0.45, 0.4)
  }
  paths.push({ d: bh, fill: 'rgba(255,255,240,0.85)' })
  // laurel wreath, embossed
  let leaves = ''
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const tt = 0.1 + i * 0.083
      const ang = PI / 2 + side * (tt * PI)
      const lx = c + 31 * Math.cos(ang)
      const ly = c + 31 * Math.sin(ang)
      const tang = (ang * 180) / PI + 90 * side
      const off = 3.2
      leaves += rotEll(lx + off * Math.cos(ang), ly + off * Math.sin(ang), 5.2, 2, tang - 28 * side)
      leaves += rotEll(lx - off * Math.cos(ang), ly - off * Math.sin(ang), 5.2, 2, tang + 28 * side)
    }
  }
  const stem = 'M50 83A33 33 0 0 1 18.6 60M50 83A33 33 0 0 0 81.4 60'
  paths.push({ d: tf(stem, 0.5, 0.6), stroke: 'rgba(60,35,5,0.6)', sw: 1.3 })
  paths.push({ d: stem, stroke: gold(0, 20, 100, 90), sw: 1 })
  paths.push({ d: tf(leaves, 0.55, 0.7), fill: 'rgba(60,35,5,0.6)' })
  paths.push({ d: tf(leaves, -0.3, -0.35), fill: 'rgba(255,248,220,0.9)' })
  paths.push({ d: leaves, fill: gold(10, 10, 90, 95) })
  // faceted 8-point star
  const sc: V3 = [c, c, 7]
  const pts: V3[] = []
  for (let i = 0; i < 16; i++) {
    const a = (i * PI) / 8 - PI / 2
    const rr_ = i % 2 ? 6.2 : 17
    pts.push([c + rr_ * Math.cos(a), c + rr_ * Math.sin(a), 0])
  }
  paths.push(...castShadow(poly(pts.flatMap((p) => [p[0], p[1]])), 1, 1.3, 0.55, 0.9, '60,35,5'))
  const sr: [number, string][] = [[0, '#5e400e'], [0.35, '#a7772a'], [0.7, '#f0cd78'], [1, '#fffbe8']]
  for (let i = 0; i < 16; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % 16]
    const n = faceN(sc, a, b)
    paths.push({ d: poly([sc[0], sc[1], a[0], a[1], b[0], b[1]]), fill: ramp(sr, diffuse(n) * 1.1 + spec(n, 20) * 0.5) })
  }
  paths.push(...glint(c - 4, c - 9, 5, 0.9))
  paths.push({ d: circ(c, c, R), stroke: 'rgba(60,35,5,0.5)', sw: 0.5 })
  return { viewW: 100, viewH: 100, paths }
}

// Royale: velvet ground with an embossed art-deco fan.
export function decoVelvet(): Art {
  const paths: VectorPath[] = []
  const fx = 80
  const fy = 76.6
  const R = 100
  const inner = rect(11.4, 11.4, 137.2, 65.2)
  let wedA = ''
  let wedB = ''
  let rays = ''
  for (let i = 0; i < 28; i++) {
    const a0 = PI + (i / 28) * PI
    const a1 = PI + ((i + 1) / 28) * PI
    const w = poly([fx, fy, fx + R * Math.cos(a0), fy + R * Math.sin(a0), fx + R * Math.cos(a1), fy + R * Math.sin(a1)])
    if (i % 2) wedA += w
    else wedB += w
    rays += `M${r2(fx + 9 * Math.cos(a0))} ${r2(fy + 9 * Math.sin(a0))}L${r2(fx + R * Math.cos(a0))} ${r2(fy + R * Math.sin(a0))}`
  }
  paths.push(
    { d: wedA, fill: rad(fx, fy, 80, 0, 'rgba(255,200,170,0.16)', 1, 'rgba(255,190,200,0.02)'), clip: inner, blend: 'screen' },
    { d: wedB, fill: rad(fx, fy, 80, 0, 'rgba(0,0,0,0.3)', 1, 'rgba(0,0,0,0.06)'), clip: inner, blend: 'multiply' },
    { d: tf(rays, 0.25, 0.25), stroke: 'rgba(0,0,0,0.35)', sw: 0.3, clip: inner },
    { d: rays, stroke: 'rgba(233,196,106,0.3)', sw: 0.25, clip: inner },
  )
  for (const rr_ of [18, 40, 62]) paths.push({ d: `M${fx - rr_} ${fy}A${rr_} ${rr_} 0 0 1 ${fx + rr_} ${fy}`, stroke: 'rgba(233,196,106,0.2)', sw: 0.3, clip: inner })
  paths.push(glow(fx, fy, 40, '255,190,120', 0.12), sheen(30, 50, 0.07, 46, '255,200,210'), vignette(0.7, '20,0,6'))
  return { viewW: W, viewH: H, paths }
}

// Royale: bevelled gold frame, stepped corners, faceted lozenge.
export function decoFrame(): Art {
  const gold = lin(0, 0, 160, 101, 0, '#fff4cf', 0.2, '#d9a94a', 0.45, '#f6d98b', 0.7, '#a8772a', 1, '#6b4810')
  const paths: VectorPath[] = []
  const add = (d: string, o = 0.35) => {
    paths.push({ d, fill: gold }, ...bevel(d, o, 'rgba(255,250,225,0.85)', 'rgba(50,25,0,0.65)'))
  }
  add(rect(6, 6, 148, 89) + rrRev(80, 50.5, 143.6, 84.6, 0.01))
  add(rect(10.6, 10.6, 138.8, 79.8) + rrRev(80, 50.5, 137.4, 78.4, 0.01), 0.25)
  // stepped corners
  const corner = (sx: number, sy: number) => {
    const x = sx < 0 ? 10.6 : 149.4
    const y = sy < 0 ? 10.6 : 90.4
    const dx = -sx
    const dy = -sy
    const p = [0, 0, 16, 0, 16, 1.6, 4.6, 1.6, 4.6, 4.6, 1.6, 4.6, 1.6, 16, 0, 16]
    const q = [6.6, 6.6, 12, 6.6, 12, 7.8, 7.8, 7.8, 7.8, 12, 6.6, 12]
    const map = (a: number[]) => {
      const o: number[] = []
      for (let i = 0; i < a.length; i += 2) o.push(x + dx * a[i], y + dy * a[i + 1])
      // keep clockwise winding after mirroring
      if (dx * dy < 0) {
        const rv: number[] = []
        for (let i = o.length - 2; i >= 0; i -= 2) rv.push(o[i], o[i + 1])
        return poly(rv)
      }
      return poly(o)
    }
    return map(p) + map(q)
  }
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(corner(sx, sy), 0.3)
  // lower ornament: bars and a faceted lozenge
  add(rect(42, 76.2, 30, 0.9) + rect(88, 76.2, 30, 0.9), 0.2)
  add(rect(50, 79.2, 22, 0.5) + rect(88, 79.2, 22, 0.5), 0.15)
  const lc: V3 = [80, 76.6, 3]
  const lp: V3[] = [[80, 71.6, 0], [85, 76.6, 0], [80, 81.6, 0], [75, 76.6, 0]]
  const gr: [number, string][] = [[0, '#5e400e'], [0.4, '#b8892c'], [0.75, '#f3d07c'], [1, '#fffbe8']]
  for (let i = 0; i < 4; i++) {
    const a = lp[i]
    const b = lp[(i + 1) % 4]
    const n = faceN(lc, a, b)
    paths.push({ d: poly([lc[0], lc[1], a[0], a[1], b[0], b[1]]), fill: ramp(gr, diffuse(n) * 1.15 + spec(n) * 0.4) })
  }
  paths.push(...glint(77.6, 74, 2.6, 0.8))
  return { viewW: W, viewH: H, paths }
}

// Royale: 3D gold crown with pearls and cabochon jewels.
export function crown(): Art {
  const band = lin(14, 0, 86, 0, 0, '#5a3a0c', 0.12, '#b8892c', 0.3, '#fff4cf', 0.45, '#e2b558', 0.75, '#946518', 1, '#4a300a')
  const body = 'M18 56L12 22L32 42L50 12L68 42L88 22L82 56Z'
  const bandD = 'M17 56H83V69Q50 74 17 69Z'
  const paths: VectorPath[] = [
    // velvet cap
    { d: 'M20 56C18 30 82 30 80 56Z', fill: rad(44, 38, 34, 0, '#c2203f', 0.6, '#6e0a22', 1, '#2a020b') },
    { d: body, fill: band },
    ...bevel(body, 0.7, 'rgba(255,250,225,0.8)', 'rgba(50,25,0,0.6)'),
    { d: 'M50 16L50 52M14 26L24 54M86 26L76 54', stroke: 'rgba(255,245,210,0.25)', sw: 0.5 },
    { d: bandD, fill: band },
    ...bevel(bandD, 0.7, 'rgba(255,250,225,0.85)', 'rgba(50,25,0,0.65)'),
    { d: 'M17 59.5Q50 63.5 83 59.5', stroke: 'rgba(60,35,5,0.55)', sw: 0.5 },
    { d: 'M17 66Q50 70.5 83 66', stroke: 'rgba(60,35,5,0.55)', sw: 0.5 },
  ]
  const jewel = (x: number, y: number, rx: number, ry: number, c1: string, c2: string, c3: string) => {
    paths.push(
      { d: ell(x + 0.5, y + 0.7, rx + 1, ry + 1), fill: 'rgba(50,25,0,0.6)' },
      { d: ell(x, y, rx + 0.9, ry + 0.9), fill: lin(x - rx, y - ry, x + rx, y + ry, 0, '#fff4cf', 1, '#7a5214') },
      { d: ell(x, y, rx, ry), fill: { kind: 'radial', cx: x, cy: y, r: rx * 1.1, fx: x - rx * 0.35, fy: y - ry * 0.4, stops: [[0, c1], [0.5, c2], [1, c3]] } as RadialPaint },
      { d: ell(x + rx * 0.25, y + ry * 0.35, rx * 0.5, ry * 0.35), fill: 'rgba(255,255,255,0.18)', blend: 'screen' },
      { d: ell(x - rx * 0.38, y - ry * 0.42, rx * 0.28, ry * 0.2), fill: 'rgba(255,255,255,0.9)' },
    )
  }
  jewel(50, 63.5, 4.8, 3.6, '#ff9aa8', '#c4142e', '#3e0410')
  jewel(32, 62.6, 3, 2.5, '#9effc8', '#13915a', '#04301c')
  jewel(68, 62.6, 3, 2.5, '#9effc8', '#13915a', '#04301c')
  jewel(50, 36, 2.6, 3.4, '#bcd4ff', '#2a52c8', '#081648')
  const pearl = (x: number, y: number, s: number) =>
    paths.push(
      { d: circ(x + 0.4, y + 0.6, s), fill: 'rgba(50,25,0,0.5)' },
      { d: circ(x, y, s), fill: radLit(x, y, s, 0, '#ffffff', 0.5, '#efe6d6', 1, '#9a8a76') },
      { d: circ(x - s * 0.35, y - s * 0.4, s * 0.25), fill: 'rgba(255,255,255,0.95)' },
    )
  pearl(12, 22, 3.6)
  pearl(50, 12, 4)
  pearl(88, 22, 3.6)
  pearl(32, 42, 2.4)
  pearl(68, 42, 2.4)
  paths.push(...glint(46, 9, 6, 0.8))
  return { viewW: 100, viewH: 80, paths }
}

// Titanium: anisotropic brushing, soft reflections, laser-etched hex field, debossed emblem.
export function titanium(): Art {
  const r = rng(404)
  const lt = ['', '']
  const dk = ['', '']
  for (let i = 0; i < 260; i++) {
    const y = r() * H
    const x0 = -5 + r() * 60
    const x1 = x0 + 60 + r() * 120
    const s = `M${r2(x0)} ${r2(y)}L${r2(x1)} ${r2(y + (r() - 0.5) * 0.3)}`
    if (r() > 0.5) lt[i % 2] += s
    else dk[i % 2] += s
  }
  let hex = ''
  const s = 4.2
  const hh = s * Math.sqrt(3)
  for (let row = 0; row * hh * 0.5 < 108; row++) {
    for (let col = 0; col * s * 3 < 170; col++) {
      const cx = col * s * 3 + (row % 2 ? s * 1.5 : 0)
      const cy = row * hh * 0.5
      const p: number[] = []
      for (let k = 0; k < 6; k++) p.push(cx + s * 0.92 * Math.cos((k * PI) / 3), cy + s * 0.92 * Math.sin((k * PI) / 3))
      hex += poly(p)
    }
  }
  const fade = (a: number, col: string) => lin(60, 0, 160, 30, 0, `rgba(${col},0)`, 0.6, `rgba(${col},${a * 0.6})`, 1, `rgba(${col},${a})`)
  const hexPts = (R: number) => Array.from({ length: 6 }, (_, k) => [122 + R * Math.cos((k * PI) / 3 - PI / 6), 50.5 + R * Math.sin((k * PI) / 3 - PI / 6)]).flat()
  const hp = (R: number) => poly(hexPts(R))
  const hpR = (R: number) => {
    const p = hexPts(R)
    const o: number[] = []
    for (let i = p.length - 2; i >= 0; i -= 2) o.push(p[i], p[i + 1])
    return poly(o)
  }
  const groove = hp(25) + hpR(22.5)
  const boss = hp(13)
  return {
    viewW: W,
    viewH: H,
    paths: [
      { d: lt[0], stroke: 'rgba(255,255,255,0.4)', sw: 0.14, blend: 'screen' },
      { d: lt[1], stroke: 'rgba(255,255,255,0.18)', sw: 0.32, blend: 'screen' },
      { d: dk[0], stroke: 'rgba(60,66,76,0.22)', sw: 0.14, blend: 'multiply' },
      { d: dk[1], stroke: 'rgba(60,66,76,0.12)', sw: 0.32, blend: 'multiply' },
      sheen(58, 44, 0.45),
      sheen(118, 30, 0.22, 46, '40,46,56', 'multiply'),
      sheen(150, 20, 0.25),
      { d: tf(hex, -0.22, -0.22), stroke: fade(0.28, '30,34,40'), sw: 0.22 },
      { d: tf(hex, 0.22, 0.22), stroke: fade(0.55, '255,255,255'), sw: 0.2 },
      // debossed hexagonal channel and a raised centre boss
      { d: groove, fill: 'rgba(40,46,56,0.12)', blend: 'multiply' },
      ...bevel(groove, 0.55, 'rgba(30,34,40,0.4)', 'rgba(255,255,255,0.85)'),
      ...castShadow(boss, 0.9, 1.2, 0.35, 1, '30,34,40'),
      { d: boss, fill: lin(110, 38, 134, 63, 0, '#f6f7f9', 0.45, '#c2c7ce', 1, '#8a919a') },
      ...bevel(boss, 0.55, 'rgba(255,255,255,0.95)', 'rgba(30,34,40,0.45)'),
      { d: poly([108, 63, 116, 37, 120, 37, 112, 63]), fill: 'rgba(255,255,255,0.4)', clip: boss, blend: 'screen' },
      vignette(0.25, '40,46,56'),
    ],
  }
}

// Frost: rime on the corners, branching cracks, bokeh.
export function frostCracks(): Art {
  const r = rng(5)
  let rimeA = ''
  let rimeB = ''
  for (let i = 0; i < 1400; i++) {
    const x = r() * W
    const y = r() * H
    const dn = Math.min(Math.hypot(x - W, y), Math.hypot(x, y - H) * 1.1)
    if (Math.exp(-dn / 22) < r()) continue
    const s = 0.12 + r() * 0.35
    if (r() > 0.4) rimeA += circ(x, y, s)
    else rimeB += rotEll(x, y, s * 2.4, s * 0.6, r() * 180)
  }
  let cracks = ''
  const branch = (x: number, y: number, a: number, len: number, depth: number) => {
    const x2 = x + Math.cos(a) * len
    const y2 = y + Math.sin(a) * len
    cracks += `M${r2(x)} ${r2(y)}L${r2(x2)} ${r2(y2)}`
    if (depth <= 0) return
    branch(x2, y2, a + (r() - 0.5) * 0.5, len * 0.78, depth - 1)
    if (r() > 0.35) branch(x2, y2, a + (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.4), len * 0.55, depth - 2)
  }
  for (let i = 0; i < 6; i++) branch(160, 0, PI * (0.55 + i * 0.07), 9, 5)
  for (let i = 0; i < 4; i++) branch(0, 101, PI * (1.6 + i * 0.09), 7, 4)
  const paths: VectorPath[] = [
    glow(22, 8, 70, '235,245,255', 0.28),
    { d: cracks, stroke: 'rgba(255,255,255,0.08)', sw: 1.4 },
    { d: cracks, stroke: 'rgba(255,255,255,0.55)', sw: 0.3 },
    { d: rimeA, fill: 'rgba(255,255,255,0.55)' },
    { d: rimeB, fill: 'rgba(235,245,255,0.35)' },
  ]
  for (const [x, y, s, a] of [[40, 70, 9, 0.08], [70, 20, 5, 0.1], [14, 40, 4, 0.12], [86, 88, 6, 0.06]] as const)
    paths.push({ d: circ(x, y, s), fill: rad(x, y, s, 0, `rgba(230,245,255,${a * 0.4})`, 0.85, `rgba(230,245,255,${a * 0.6})`, 1, 'rgba(230,245,255,0)'), blend: 'screen' })
  paths.push(sheen(50, 40, 0.12), vignette(0.35, '10,30,60'))
  return { viewW: W, viewH: H, paths }
}

// Frost: faceted 3D ice crystal (prismatic ridges shaded from the light).
export function iceCrystal(): Art {
  const c = 50
  const paths: VectorPath[] = [glow(c, c, 48, '210,235,255', 0.32)]
  const iceR: [number, string][] = [[0, '#3e6a99'], [0.35, '#8fb8e0'], [0.7, '#dcefff'], [1, '#ffffff']]
  let edges = ''
  const ridge = (x0: number, y0: number, ang: number, len: number, wdt: number) => {
    const ux = Math.cos(ang)
    const uy = Math.sin(ang)
    const px = -uy
    const py = ux
    const tipx = x0 + ux * len
    const tipy = y0 + uy * len
    const mx = x0 + ux * len * 0.45
    const my = y0 + uy * len * 0.45
    for (const sgn of [1, -1]) {
      const n = norm([px * sgn * 0.8, py * sgn * 0.8, 0.6])
      const b = diffuse(n) * 1.05 + spec(n, 18) * 0.6
      paths.push({ d: poly([x0, y0, mx + px * sgn * wdt, my + py * sgn * wdt, tipx, tipy]), fill: ramp(iceR, b) })
    }
    edges += `M${r2(x0)} ${r2(y0)}L${r2(tipx)} ${r2(tipy)}` + poly([x0, y0, mx + px * wdt, my + py * wdt, tipx, tipy, mx - px * wdt, my - py * wdt])
  }
  for (let k = 0; k < 6; k++) {
    const a = (k * PI) / 3 - PI / 2
    for (const [rr_, len] of [[15, 9], [25, 11], [34, 7]] as const) {
      const bx = c + rr_ * Math.cos(a)
      const by = c + rr_ * Math.sin(a)
      ridge(bx, by, a - 0.95, len, 1.5)
      ridge(bx, by, a + 0.95, len, 1.5)
    }
    ridge(c + 5 * Math.cos(a), c + 5 * Math.sin(a), a, 42, 3.4)
  }
  // central hexagonal plate, faceted like a cut stone
  const cz: V3 = [c, c, 5]
  const hx: V3[] = Array.from({ length: 6 }, (_, k) => [c + 9 * Math.cos((k * PI) / 3 - PI / 2 + PI / 6), c + 9 * Math.sin((k * PI) / 3 - PI / 2 + PI / 6), 0] as V3)
  for (let k = 0; k < 6; k++) {
    const a = hx[k]
    const b = hx[(k + 1) % 6]
    const n = faceN(cz, a, b)
    paths.push({ d: poly([c, c, a[0], a[1], b[0], b[1]]), fill: ramp(iceR, diffuse(n) * 1.1 + spec(n, 20) * 0.5) })
    edges += `M${c} ${c}L${r2(a[0])} ${r2(a[1])}`
  }
  edges += poly(hx.flatMap((p) => [p[0], p[1]]))
  paths.push({ d: edges, stroke: 'rgba(255,255,255,0.75)', sw: 0.3 })
  paths.push(...glint(c - 3, c - 4, 7, 0.9), ...glint(c - 36, c - 21, 4, 0.7), ...glint(c + 2, c - 46, 3, 0.6))
  return { viewW: 100, viewH: 100, paths }
}

// Apex: extruded, folded gold chevrons with cast shadows and clear-coat.
export function chevrons(): Art {
  const paths: VectorPath[] = [vignette(0.6)]
  const hiGold = (x: number) => lin(x, 0, x + 30, 50, 0, '#fff6d6', 0.35, '#efc96e', 0.7, '#c3933a', 1, '#e8c272')
  const loGold = (x: number) => lin(x + 28, 50, x, 101, 0, '#8a5f1a', 0.5, '#b07f2c', 1, '#6a4710')
  const chevs: [number, number][] = [[121, 2.6], [111, 5.2], [93, 10.5]]
  for (const [x, w] of chevs) {
    const shape = poly([x, -2, x + w, -2, x + w + 28, 50.5, x + w, 103, x, 103, x + 28, 50.5])
    paths.push(...castShadow(shape, 4.5, 5, 0.75, 2.4))
  }
  for (const [x, w] of chevs) {
    const shape = poly([x, -2, x + w, -2, x + w + 28, 50.5, x + w, 103, x, 103, x + 28, 50.5])
    for (let t = 5; t >= 1; t--) paths.push({ d: tf(shape, t * 0.32, t * 0.36), fill: t > 3 ? '#2e1e05' : '#5a3d0c' })
    const up = poly([x, -2, x + w, -2, x + w + 28, 50.5, x + 28, 50.5])
    const lo = poly([x + 28, 50.5, x + w + 28, 50.5, x + w, 103, x, 103])
    paths.push({ d: up, fill: hiGold(x) }, { d: lo, fill: loGold(x) })
    let br = ''
    for (let k = 0; k < 10; k++) br += `M${r2(x - 4 + k * (w / 9))} -2L${r2(x + 24 + k * (w / 9))} 50.5`
    paths.push({ d: br, stroke: 'rgba(255,255,255,0.18)', sw: 0.18, clip: up, blend: 'screen' })
    paths.push(
      { d: `M${x} -2L${x + 28} 50.5`, stroke: 'rgba(255,252,235,0.9)', sw: 0.4 },
      { d: `M${x + 28} 50.5H${x + w + 28}`, stroke: 'rgba(255,240,200,0.7)', sw: 0.3 },
      { d: `M${x + w + 28} 50.5L${x + w} 103`, stroke: 'rgba(40,25,0,0.6)', sw: 0.4 },
    )
  }
  paths.push(...glint(121.5, 50.5, 5, 0.8))
  paths.push(sheen(40, 46, 0.1), sheen(20, 10, 0.06))
  return { viewW: W, viewH: H, paths }
}

// Stealth: faceted flying wing hovering above its shadow, violet rim light.
export function stealthShapes(): Art {
  const glowC = '155,140,255'
  const C: V3 = [113, 54, 5]
  const B: V3[] = [
    [113, 34, 2.5], [158, 62, 0], [149, 66.5, 0], [140, 63.2, 0], [131, 70.5, 0], [122, 64.5, 1],
    [113, 74, 1.5], [104, 64.5, 1], [95, 70.5, 0], [86, 63.2, 0], [77, 66.5, 0], [68, 62, 0],
  ]
  const wing = poly(B.flatMap((p) => [p[0], p[1]]))
  const gm: [number, string][] = [[0, '#07080b'], [0.4, '#22242c'], [0.75, '#5a5e6c'], [1, '#c9ccd8']]
  const paths: VectorPath[] = []
  for (let k = 0; k < 7; k++) paths.push({ d: `M${113 - 30 - k * 12} 54A${30 + k * 12} ${30 + k * 12} 0 0 1 ${113 + 30 + k * 12} 54`, stroke: `rgba(${glowC},0.05)`, sw: 0.3 })
  paths.push({ d: ell(113, 86, 46, 6), fill: rad(113, 86, 46, 0, `rgba(${glowC},0.16)`, 1, `rgba(${glowC},0)`), blend: 'screen' })
  paths.push(...castShadow(tf(wing, -2, 26), 0, 0, 0.7, 2.6))
  for (let i = 0; i < B.length; i++) {
    const a = B[i]
    const b = B[(i + 1) % B.length]
    const n = faceN(C, a, b)
    const rim = Math.max(0, dot(n, norm([0.7, 0.6, 0.4])))
    paths.push({ d: poly([C[0], C[1], a[0], a[1], b[0], b[1]]), fill: ramp(gm, 0.08 + diffuse(n) * 0.72 + spec(n, 40) * 0.35) })
    if (rim > 0.05) paths.push({ d: poly([C[0], C[1], a[0], a[1], b[0], b[1]]), fill: `rgba(${glowC},${(rim * 0.35).toFixed(3)})`, blend: 'screen' })
  }
  let ridges = ''
  for (const p of B) ridges += `M${C[0]} ${C[1]}L${p[0]} ${p[1]}`
  paths.push({ d: ridges, stroke: 'rgba(255,255,255,0.12)', sw: 0.25 })
  // leading edges catch the key light, trailing edges glow violet
  paths.push({ d: 'M68 62L113 34L158 62', stroke: 'rgba(235,238,255,0.7)', sw: 0.35 })
  const trail = poly(B.slice(1).flatMap((p) => [p[0], p[1]]), false)
  paths.push({ d: trail, stroke: `rgba(${glowC},0.18)`, sw: 3, blend: 'screen' })
  paths.push({ d: trail, stroke: `rgba(${glowC},0.95)`, sw: 0.6, blend: 'screen' })
  // cockpit canopy
  const cp = poly([113, 40, 117.5, 47.5, 113, 50, 108.5, 47.5])
  paths.push({ d: cp, fill: lin(109, 40, 117, 50, 0, '#3b3f55', 0.5, '#0a0b12', 1, '#1a1830') })
  paths.push({ d: 'M110.6 46.2L113 42.2', stroke: 'rgba(220,215,255,0.8)', sw: 0.45 })
  paths.push(glow(106, 67, 4, glowC, 0.7), glow(120, 67, 4, glowC, 0.7))
  paths.push({ d: 'M0 88L40 88L48 80L82 80', stroke: `rgba(${glowC},0.35)`, sw: 0.4 })
  paths.push(...glint(113, 34.5, 3.5, 0.8))
  return { viewW: W, viewH: H, paths }
}

// Pure: a polished gold sphere resting on a dark studio floor.
export function orb(): Art {
  const cx = 80
  const cy = 42
  const R = 21
  const fy = cy + R
  const sphere = circ(cx, cy, R)
  const body = radLit(cx, cy, R, 0, '#fff7dc', 0.16, '#f3d68c', 0.48, '#c7953d', 0.85, '#6a4512', 1, '#4a3009')
  return {
    viewW: W,
    viewH: H,
    paths: [
      glow(cx, cy - 6, 85, '255,240,210', 0.06),
      glow(cx, cy, R * 2.3, '230,180,90', 0.1),
      // mirrored reflection on the glossy floor, fading away
      { d: circ(cx, fy * 2 - cy, R), fill: radLit(cx, fy * 2 - cy, R, 0, '#6a4a18', 0.6, '#3a2608', 1, '#140c02'), alpha: 0.55 },
      { d: rect(0, fy - 1, W, H - fy + 1), fill: lin(0, fy - 1, 0, fy + 24, 0, 'rgba(14,15,19,0)', 0.6, 'rgba(14,15,19,0.9)', 1, '#0e0f13') },
      ...softShadow(cx, fy + 1, 62, 8, 0.1, '255,225,170'),
      ...softShadow(cx, fy + 0.4, 24, 3.4, 0.75),
      { d: ell(cx, fy, 10, 1), fill: 'rgba(0,0,0,0.75)' },
      { d: sphere, fill: body },
      // core shadow and floor bounce
      { d: sphere, fill: rad(cx - 8, cy - 9, R * 2.05, 0, 'rgba(20,10,0,0)', 0.52, 'rgba(20,10,0,0)', 0.76, 'rgba(20,10,0,0.55)', 1, 'rgba(20,10,0,0.85)'), blend: 'multiply' },
      { d: BIG + circ(cx - 0.7, cy + 0.9, R), rule: 'evenodd', fill: lin(cx - R, cy + R, cx + R, cy - R, 0, 'rgba(255,240,215,0)', 0.6, 'rgba(255,240,215,0)', 1, 'rgba(255,240,215,0.25)'), clip: sphere, blend: 'screen' },
      // soft-box reflection + specular
      { d: rr(cx - 7.4, cy - 9.6, 9, 5.4, 2.2, -28), fill: 'rgba(255,255,255,0.45)', clip: sphere, blend: 'screen' },
      { d: ell(cx - 7.5, cy - 9.5, 6, 4), fill: rad(cx - 7.5, cy - 9.5, 6, 0, 'rgba(255,255,255,0.7)', 1, 'rgba(255,255,255,0)'), blend: 'screen' },
      { d: circ(cx - 8.2, cy - 10.3, 0.9), fill: '#ffffff' },
    ],
  }
}

// Ligne: blind-embossed white hills (paper relief) with one fine ink line.
export function oneLine(): Art {
  const ridges = [
    'M-2 56C18 50 30 38 44 38C58 38 66 48 80 48C96 48 104 28 120 28C136 28 146 42 162 42',
    'M-2 66C14 62 26 52 40 52C54 52 60 62 74 62C90 62 100 42 114 42C128 42 136 56 162 54',
    'M-2 76C20 76 30 58 46 58C60 58 66 72 80 72C96 72 104 50 120 50C134 50 142 66 162 62',
  ]
  const fills = [
    lin(0, 28, 0, 101, 0, '#f1f2f5', 1, '#e8eaee'),
    lin(0, 42, 0, 101, 0, '#f6f7f9', 1, '#eceef1'),
    lin(0, 50, 0, 101, 0, '#fdfdfe', 1, '#f2f3f6'),
  ]
  const paths: VectorPath[] = []
  ridges.forEach((rd, i) => {
    const hill = rd + 'L162 104L-2 104Z'
    paths.push(...castShadow(hill, 0.5, -0.5, 0.14, 1.3, '70,76,90'))
    paths.push({ d: hill, fill: fills[i] })
    paths.push({ d: tf(rd, -0.2, 0.4), stroke: 'rgba(255,255,255,0.95)', sw: 0.7, clip: hill })
    paths.push({ d: hill, fill: lin(0, 0, 160, 0, 0, 'rgba(255,255,255,0.35)', 1, 'rgba(120,128,140,0.06)'), blend: 'multiply', alpha: 0.6 })
  })
  const sun = circ(118, 17, 7)
  paths.push(
    { d: sun, fill: '#eef0f3' },
    { d: BIG + tf(sun, 0.9, 1), rule: 'evenodd', fill: 'rgba(60,66,80,0.2)', clip: sun },
    { d: BIG + tf(sun, -0.7, -0.8), rule: 'evenodd', fill: 'rgba(255,255,255,1)', clip: sun },
    { d: ridges[2], stroke: '#15161a', sw: 0.5 },
  )
  return { viewW: W, viewH: H, paths }
}

// Marble with layered veins, depth clouds, polished reflection and a gold vein.
export type MarbleTone = 'noir' | 'blanc' | 'or'
export function marbleLux(tone: MarbleTone): Art {
  const r = rng(tone === 'noir' ? 11 : tone === 'blanc' ? 23 : 47)
  const dark = tone === 'noir'
  const veinCol = dark ? '232,234,240' : tone === 'blanc' ? '96,100,110' : '128,112,92'
  const cloudCol = dark ? '255,255,255' : tone === 'blanc' ? '150,154,164' : '190,168,130'
  const paths: VectorPath[] = []
  for (let i = 0; i < 22; i++) {
    const x = r() * W
    const y = r() * H
    const s = 14 + r() * 34
    paths.push({ d: blob(x, y, s, s * 0.25, 3 + Math.floor(r() * 3), r() * 6, s * (0.4 + r() * 0.4)), fill: rad(x, y, s, 0, `rgba(${cloudCol},${dark ? 0.05 : 0.09})`, 1, `rgba(${cloudCol},0)`), blend: dark ? 'screen' : 'multiply' })
  }
  const walk = (x: number, y: number, a: number, steps: number, step: number, turn = 0.22) => {
    const pts: number[] = [x, y]
    const ph = r() * 6
    for (let i = 0; i < steps; i++) {
      a += (r() - 0.5) * turn + 0.07 * Math.sin(i * 0.3 + ph)
      x += Math.cos(a) * step
      y += Math.sin(a) * step
      pts.push(x, y)
    }
    return pts
  }
  const dirAt = (p: number[], k: number) => Math.atan2(p[k + 3] - p[k + 1], p[k + 2] - p[k])
  const main: number[][] = []
  const thin: number[][] = []
  const nMain = dark ? 3 : 3
  for (let i = 0; i < nMain; i++) {
    const pts = walk(-6, 10 + (i + r() * 0.8) * (80 / nMain), -0.45 + r() * 0.6, 30, 6.2)
    main.push(pts)
    for (let b = 0; b < 4; b++) {
      const k = 2 * Math.floor(2 + r() * (pts.length / 2 - 6))
      const br = walk(pts[k], pts[k + 1], dirAt(pts, k) + (r() > 0.5 ? 1 : -1) * (0.35 + r() * 0.4), 5 + Math.floor(r() * 9), 3.6, 0.3)
      thin.push(br)
      if (r() > 0.5) {
        const k2 = 2 * Math.floor(1 + r() * (br.length / 2 - 3))
        thin.push(walk(br[k2], br[k2 + 1], dirAt(br, k2) + (r() - 0.5) * 1.4, 3 + Math.floor(r() * 4), 2.6, 0.4))
      }
    }
  }
  const ghosts = [walk(-6, 30 + r() * 40, -0.2, 30, 6, 0.15), walk(40 + r() * 40, -6, 1.2, 22, 6, 0.15)]
  // tapered, pinching vein ribbons (width varies along the vein like real marble)
  const ribbon = (p: number[], base: number) => {
    const L: number[] = []
    const Rr: number[] = []
    const ph = r() * 6
    const m = p.length / 2
    for (let i = 0; i < m; i++) {
      const j = Math.min(m - 2, i)
      const a = Math.atan2(p[2 * j + 3] - p[2 * j + 1], p[2 * j + 2] - p[2 * j])
      const taper = Math.min(1, i / 3, (m - 1 - i) / 3)
      const w = base * taper * (0.2 + 0.8 * Math.abs(Math.sin(i * 0.33 + ph)) * (0.65 + 0.35 * Math.sin(i * 0.13 + ph * 2)))
      L.push(p[2 * i] - Math.sin(a) * w, p[2 * i + 1] + Math.cos(a) * w)
      Rr.push(p[2 * i] + Math.sin(a) * w, p[2 * i + 1] - Math.cos(a) * w)
    }
    const back: number[] = []
    for (let i = Rr.length - 2; i >= 0; i -= 2) back.push(Rr[i], Rr[i + 1])
    return poly([...L, ...back])
  }
  const mr = main.map((p) => ribbon(p, dark ? 1 : 0.85)).join('')
  const md = main.map(smooth).join('')
  const td = thin.map(smooth).join('')
  const gd = ghosts.map(smooth).join('')
  const va = dark ? 0.8 : 1
  paths.push(
    { d: gd, stroke: `rgba(${veinCol},0.04)`, sw: 9 },
    { d: gd, stroke: `rgba(${veinCol},0.06)`, sw: 2.5 },
    { d: md, stroke: `rgba(${veinCol},${0.045 * va})`, sw: 7 },
    { d: md, stroke: `rgba(${veinCol},${0.09 * va})`, sw: 2.4 },
    { d: mr, fill: `rgba(${veinCol},${0.5 * va})` },
    { d: md, stroke: `rgba(${veinCol},${0.3 * va})`, sw: 0.18 },
    { d: tf(md, 0.35, 0.25), stroke: `rgba(${veinCol},${0.25 * va})`, sw: 0.3 },
    { d: tf(md, -0.3, 0.45), stroke: `rgba(${veinCol},${0.18 * va})`, sw: 0.22 },
    { d: td, stroke: `rgba(${veinCol},${0.06 * va})`, sw: 1.8 },
    { d: td, stroke: `rgba(${veinCol},${0.32 * va})`, sw: 0.22 },
  )
  // gold veins (inlaid, bevelled, with a warm halo)
  const goldVeins = tone === 'or' ? 2 : 1
  for (let gI = 0; gI < goldVeins; gI++) {
    const gp = walk(-6, 20 + r() * 60, -0.2 + r() * 0.3, 36, 5.2)
    const gd = smooth(gp)
    const branch = smooth(walk(gp[24], gp[25], 0.9, 9, 3.4)) + smooth(walk(gp[44], gp[45], -0.8, 8, 3.2))
    const gw = tone === 'or' ? 1.25 - gI * 0.45 : 0.95
    const gr = ribbon(gp, gw * 0.9)
    paths.push(
      { d: gd, stroke: 'rgba(214,160,60,0.16)', sw: gw * 4, blend: dark ? 'screen' : 'multiply' },
      { d: tf(gr, 0.3, 0.4), fill: 'rgba(70,40,5,0.6)' },
      { d: gr, fill: lin(0, 0, 160, 101, 0, '#fff0bf', 0.3, '#d7a646', 0.55, '#f7d98a', 0.8, '#a8772a', 1, '#f0cc78') },
      { d: gd, stroke: '#e2b860', sw: gw * 0.35 },
      { d: tf(gd, -0.2, -0.25), stroke: 'rgba(255,250,225,0.8)', sw: gw * 0.22 },
      { d: tf(branch, 0.2, 0.25), stroke: 'rgba(70,40,5,0.5)', sw: gw * 0.55 },
      { d: branch, stroke: '#d9aa4c', sw: gw * 0.45 },
    )
  }
  paths.push(
    sheen(54, 40, dark ? 0.07 : 0.5),
    glow(26, 10, 60, '255,255,255', dark ? 0.07 : 0.35),
    vignette(dark ? 0.6 : 0.12, dark ? '0,0,0' : '90,80,70'),
  )
  return { viewW: W, viewH: H, paths }
}

// Aqua glass: floating frosted panes with refraction, fresnel edges, shadows.
export function glassLux(): Art {
  const orbs: [number, number, number, string, number][] = [
    [122, 26, 30, '90,240,230', 0.5],
    [40, 86, 32, '150,110,255', 0.4],
    [156, 92, 20, '80,180,255', 0.35],
  ]
  const paths: VectorPath[] = orbs.map(([x, y, s, c, a]) => glow(x, y, s, c, a))
  const panes = [
    { cx: 104, cy: 40, w: 66, h: 42, deg: -9 },
    { cx: 64, cy: 79, w: 30, h: 19, deg: -14 },
    { cx: 125, cy: 64, w: 54, h: 35, deg: 7 },
  ]
  const r = rng(9)
  for (const p of panes) {
    const d = rr(p.cx, p.cy, p.w, p.h, 5, p.deg)
    paths.push(...castShadow(d, 2.6, 3.6, 0.42, 2.4, '0,18,28'))
    paths.push({ d, fill: lin(p.cx - p.w / 2, p.cy - p.h / 2, p.cx + p.w / 2, p.cy + p.h / 2, 0, 'rgba(255,255,255,0.2)', 0.5, 'rgba(200,250,255,0.07)', 1, 'rgba(255,255,255,0.12)') })
    for (const [x, y, s, c, a] of orbs) paths.push({ d: circ(x - 5, y - 3.5, s * 0.9), fill: rad(x - 5, y - 3.5, s * 0.9, 0, `rgba(${c},${a * 0.9})`, 1, `rgba(${c},0)`), clip: d, blend: 'screen' })
    paths.push({ d: dots(220, Math.floor(r() * 999), W, H, 0.08, 0.2), fill: 'rgba(255,255,255,0.18)', clip: d })
    paths.push({ d: poly([p.cx - p.w * 0.3, p.cy - 40, p.cx - p.w * 0.16, p.cy - 40, p.cx - p.w * 0.5, p.cy + 40, p.cx - p.w * 0.64, p.cy + 40]), fill: 'rgba(255,255,255,0.12)', clip: d, blend: 'screen' })
    paths.push({ d: tf(d, 0.5, 0.6), stroke: 'rgba(0,30,40,0.35)', sw: 0.6, clip: d })
    paths.push({
      d,
      stroke: lin(p.cx - p.w / 2, p.cy - p.h / 2, p.cx + p.w / 2, p.cy + p.h / 2, 0, 'rgba(255,255,255,0.95)', 0.35, 'rgba(255,255,255,0.2)', 0.7, 'rgba(255,255,255,0.12)', 1, 'rgba(255,255,255,0.55)'),
      sw: 0.6,
    })
    const pts = rrPts(p.cx, p.cy, p.w, p.h, 5, p.deg)
    paths.push(...glint(pts[pts.length - 6], pts[pts.length - 5], 3, 0.6))
  }
  return { viewW: W, viewH: H, paths }
}

// ===================================================================================
// SIGNATURE
// ===================================================================================

// Obsidian: turned (engine-cut) concentric rings that catch the light anisotropically.
export function engineRings(): Art {
  const cx = 126
  const cy = 50.5
  const levels = 12
  const seg = 90
  const L: string[] = Array(levels).fill('')
  for (let rr_ = 3.5; rr_ < 150; rr_ += 1.15) {
    for (let s = 0; s < seg; s++) {
      const a0 = (s / seg) * PI * 2
      const a1 = ((s + 1) / seg) * PI * 2
      const b = Math.pow(Math.abs(Math.cos((a0 + a1) / 2 + (135 * PI) / 180)), 3)
      const lv = Math.min(levels - 1, Math.floor(b * levels))
      L[lv] += `M${r2(cx + rr_ * Math.cos(a0))} ${r2(cy + rr_ * Math.sin(a0))}A${r2(rr_)} ${r2(rr_)} 0 0 1 ${r2(cx + rr_ * Math.cos(a1))} ${r2(cy + rr_ * Math.sin(a1))}`
    }
  }
  const paths: VectorPath[] = L.map((d, k) => ({ d, stroke: `rgba(255,255,255,${(0.03 + 0.34 * (k / (levels - 1)) ** 1.5).toFixed(3)})`, sw: 0.3 }))
  const boss = circ(cx, cy, 5.5)
  paths.push(
    ...castShadow(boss, 0.7, 1, 0.8, 0.8),
    { d: boss, fill: radLit(cx, cy, 5.5, 0, '#8a8f99', 0.5, '#2a2c32', 1, '#0b0b0d') },
    ...bevel(boss, 0.35, 'rgba(255,255,255,0.6)', 'rgba(0,0,0,0.6)'),
    { d: circ(cx - 1.8, cy - 2, 1), fill: 'rgba(255,255,255,0.9)' },
    sheen(30, 40, 0.05),
    vignette(0.5),
  )
  return { viewW: W, viewH: H, paths }
}

// Noir absolu: sculpted wave ribs, each segment lit by its slope.
export function ribbedNoir(): Art {
  const levels = 20
  const buckets: string[] = Array(levels).fill('')
  const yv = (b: number, x: number) => b + 9 * Math.sin(x / 26 + b / 30) + 3 * Math.sin(x / 9 + b / 11)
  const sp = 3.4
  for (let i = -8; i < 38; i++) {
    const b0 = i * sp
    const bm = b0 + sp / 2
    const b1 = b0 + sp
    for (let x = -2; x < 162; x += 2) {
      const slope = (yv(bm, x + 2) - yv(bm, x)) / 2
      const pl = Math.hypot(slope, 1)
      const px = slope / pl
      const py = -1 / pl
      const fall = Math.max(0.32, 1 - Math.hypot(x - 20, b0) / 210)
      for (const [ya, yb, sg] of [[b0, bm + 0.15, 1], [bm, b1 + 0.15, -1]] as const) {
        const n = norm([px * 0.75 * sg, py * 0.75 * sg, 0.66])
        const v = (0.55 * diffuse(n) + 0.9 * spec(n, 24)) * fall
        const lv = Math.min(levels - 1, Math.floor(v * levels))
        buckets[lv] += poly([x, yv(ya, x), x + 2.3, yv(ya, x + 2.3), x + 2.3, yv(yb, x + 2.3), x, yv(yb, x)])
      }
    }
  }
  const paths: VectorPath[] = []
  buckets.forEach((d, k) => {
    if (!d) return
    const g = Math.round(10 + 120 * Math.pow(k / (levels - 1), 1.5))
    paths.push({ d, fill: `rgb(${g},${g},${g + 2})` })
  })
  paths.push(glow(20, 6, 80, '255,255,255', 0.04), vignette(0.55))
  return { viewW: W, viewH: H, paths }
}

// Galet: a zen cairn of polished pebbles in raked sand.
export function cairn(): Art {
  const paths: VectorPath[] = []
  const bx = 112
  const by = 80
  let rk = ''
  for (let rx = 26; rx < 190; rx += 3.6) rk += ell(bx, by, rx, rx * 0.3)
  rk += ell(46, 84, 7, 2.2) + ell(46, 84, 10.6, 3.3) + ell(46, 84, 14.2, 4.4)
  paths.push(
    { d: tf(rk, 0, -0.45), stroke: 'rgba(80,84,92,0.16)', sw: 0.55 },
    { d: tf(rk, 0, 0.45), stroke: 'rgba(255,255,255,0.9)', sw: 0.5 },
    glow(30, 10, 90, '255,255,255', 0.35),
  )
  const stones = [
    { x: 112, y: 74, rx: 22, ry: 9, c: '#4b4f55', ph: 0.4 },
    { x: 110.6, y: 60.8, rx: 16, ry: 6.8, c: '#8d867a', ph: 1.7 },
    { x: 112.6, y: 50.6, rx: 11.2, ry: 5.2, c: '#c8c2b7', ph: 2.6 },
    { x: 111.8, y: 42.9, rx: 6.6, ry: 3.5, c: '#2f3135', ph: 4.1 },
    { x: 46, y: 81.4, rx: 5.6, ry: 2.9, c: '#3a3d42', ph: 5.2 },
  ]
  paths.push(...softShadow(bx + 3, by + 3.5, 28, 5, 0.38, '40,44,50'))
  paths.push(...softShadow(47, 84, 8, 2, 0.35, '40,44,50'))
  const r = rng(3)
  stones.forEach((s, i) => {
    const d = blob(s.x, s.y, s.rx, s.rx * 0.035, 3, s.ph, s.ry)
    const fill: RadialPaint = { kind: 'radial', cx: s.x, cy: s.y, r: s.rx * 1.08, fx: s.x - s.rx * 0.35, fy: s.y - s.ry * 0.7, stops: [[0, shade(s.c, 0.38)], [0.55, s.c], [1, shade(s.c, -0.5)]] }
    paths.push({ d, fill })
    paths.push({ d, fill: lin(s.x, s.y - s.ry, s.x, s.y + s.ry, 0, 'rgba(0,0,0,0)', 0.5, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.38)'), blend: 'multiply' })
    paths.push({ d: dots(260, 50 + i, W, H, 0.05, 0.16), fill: 'rgba(255,255,255,0.2)', clip: d })
    paths.push({ d: dots(200, 90 + i, W, H, 0.05, 0.14), fill: 'rgba(0,0,0,0.22)', clip: d })
    // bounce light from the sand on the lower rim
    paths.push({ d: BIG + tf(d, 0, -0.9), rule: 'evenodd', fill: 'rgba(255,250,240,0.22)', clip: d, blend: 'screen' })
    // AO under the stone resting on top
    const up = stones[i + 1]
    if (up && i < 3) paths.push({ d: ell(up.x, up.y + up.ry * 0.85, up.rx * 1.05, up.ry * 0.8), fill: rad(up.x, up.y + up.ry * 0.85, up.rx * 1.05, 0, 'rgba(0,0,0,0.55)', 1, 'rgba(0,0,0,0)'), clip: d, blend: 'multiply' })
    paths.push({ d: ell(s.x - s.rx * 0.32, s.y - s.ry * 0.5, s.rx * 0.38, s.ry * 0.28), fill: rad(s.x - s.rx * 0.32, s.y - s.ry * 0.5, s.rx * 0.38, 0, 'rgba(255,255,255,0.4)', 1, 'rgba(255,255,255,0)'), clip: d, blend: 'screen' })
    void r
  })
  return { viewW: W, viewH: H, paths }
}

// Blanc pur: sculpted pearl-white folds.
export function pearlFolds(): Art {
  const paths: VectorPath[] = [
    glow(130, 20, 60, '255,215,235', 0.18, 'multiply'),
    glow(140, 80, 50, '200,225,255', 0.18, 'multiply'),
  ]
  for (let k = 0; k < 6; k++) {
    const pts: number[] = []
    for (let x = -4; x <= 166; x += 4) pts.push(x, 6 + k * 17 + 10 * Math.sin(x / 34 + k * 0.6) - x * 0.12)
    const d = smooth(pts)
    paths.push(
      { d: tf(d, 0, 3.2), stroke: 'rgba(110,118,135,0.035)', sw: 12, blend: 'multiply' },
      { d: tf(d, 0, 2), stroke: 'rgba(110,118,135,0.05)', sw: 5, blend: 'multiply' },
      { d: tf(d, 0, 0.9), stroke: 'rgba(90,96,110,0.12)', sw: 0.5, blend: 'multiply' },
      { d: tf(d, 0, -1.6), stroke: 'rgba(255,255,255,0.7)', sw: 3.2 },
      { d: tf(d, 0, -0.3), stroke: 'rgba(255,255,255,0.95)', sw: 0.6 },
    )
  }
  paths.push(sheen(40, 50, 0.4))
  return { viewW: W, viewH: H, paths }
}

// Carton: kraft fibres, masking tape, twine and a glossy wax seal.
export function kraftSeal(): Art {
  const r = rng(61)
  let fl = ''
  let fd = ''
  for (let i = 0; i < 700; i++) {
    const x = r() * W
    const y = r() * H
    const a = (r() - 0.5) * 0.8
    const l = 0.8 + r() * 3.2
    const s = `M${r2(x)} ${r2(y)}l${r2(Math.cos(a) * l)} ${r2(Math.sin(a) * l)}`
    if (i % 2) fl += s
    else fd += s
  }
  const twineA = 'M-4 72L164 56'
  const twineB = 'M124 -4L113 105'
  const twist = (x0: number, y0: number, x1: number, y1: number) => {
    let d = ''
    const len = Math.hypot(x1 - x0, y1 - y0)
    const ux = (x1 - x0) / len
    const uy = (y1 - y0) / len
    for (let t = 0; t < len; t += 1.3) {
      const x = x0 + ux * t
      const y = y0 + uy * t
      d += `M${r2(x - uy * 1 - ux * 0.5)} ${r2(y + ux * 1 - uy * 0.5)}L${r2(x + uy * 1 + ux * 0.5)} ${r2(y - ux * 1 + uy * 0.5)}`
    }
    return d
  }
  const twine = (d: string, tw: string): VectorPath[] => [
    { d: tf(d, 0.8, 1.8), stroke: 'rgba(60,35,10,0.22)', sw: 3.2 },
    { d: tf(d, 0.5, 1.1), stroke: 'rgba(60,35,10,0.3)', sw: 2.2 },
    { d, stroke: '#d9c6a0', sw: 2.2 },
    { d: tw, stroke: 'rgba(110,85,50,0.7)', sw: 0.45, clip: tubeClip(d, 1.1) },
    { d: tf(d, -0.3, -0.5), stroke: 'rgba(255,248,230,0.5)', sw: 0.5 },
  ]
  const tape = (() => {
    const pts = rrPts(34, 15, 38, 12, 0.3, -11)
    return poly(pts)
  })()
  const sx = 118.6
  const sy = 62.4
  const seal = blob(sx, sy, 14, 0.9, 7, 0.6)
  const rim = annulus(sx, sy, 11.2, 9)
  const emblem = star(sx, sy, 6.8, 3, 8, -90)
  const red: RadialPaint = { kind: 'radial', cx: sx, cy: sy, r: 15, fx: sx - 5, fy: sy - 6, stops: [[0, '#e8424a'], [0.5, '#a3121c'], [1, '#4a0308']] }
  return {
    viewW: W,
    viewH: H,
    paths: [
      { d: fl, stroke: 'rgba(255,238,205,0.22)', sw: 0.18 },
      { d: fd, stroke: 'rgba(80,50,18,0.2)', sw: 0.18 },
      { d: dots(240, 7, W, H, 0.06, 0.22), fill: 'rgba(60,35,10,0.35)' },
      glow(30, 10, 80, '255,240,210', 0.18),
      vignette(0.35, '70,40,10'),
      ...twine(twineA, twist(-4, 72, 164, 56)),
      ...twine(twineB, twist(124, -4, 113, 105)),
      // masking tape
      ...castShadow(tape, 0.4, 0.8, 0.2, 0.6, '60,35,10'),
      { d: tape, fill: 'rgba(242,234,210,0.78)' },
      { d: tape, fill: lin(16, 10, 52, 20, 0, 'rgba(255,255,255,0.3)', 1, 'rgba(255,255,255,0)'), blend: 'screen' },
      { d: 'M22 13.5L44 9.6M24 18L48 13.6', stroke: 'rgba(255,255,255,0.4)', sw: 0.3, clip: tape },
      // wax seal
      ...castShadow(seal, 1.4, 2, 0.6, 1.4, '50,20,5'),
      { d: seal, fill: red },
      ...bevel(seal, 0.6, 'rgba(255,170,170,0.45)', 'rgba(40,0,5,0.5)'),
      { d: circ(sx, sy, 9), fill: rad(sx + 1, sy + 1, 10, 0, '#8e0f18', 1, '#5e050c') },
      { d: rim, fill: red },
      ...bevel(rim, 0.45, 'rgba(255,190,190,0.6)', 'rgba(40,0,5,0.6)'),
      ...castShadow(emblem, 0.4, 0.5, 0.5, 0.4, '40,0,5'),
      { d: emblem, fill: radLit(sx, sy, 7, 0, '#f0606a', 0.6, '#b0161f', 1, '#6a0810') },
      ...bevel(emblem, 0.3, 'rgba(255,200,200,0.7)', 'rgba(40,0,5,0.6)'),
      { d: `M${sx - 10} ${sy - 4}Q${sx - 8} ${sy - 10} ${sx - 2} ${sy - 11.5}`, stroke: 'rgba(255,255,255,0.55)', sw: 0.7 },
      { d: circ(sx - 6.5, sy - 8.6, 0.6), fill: 'rgba(255,255,255,0.9)' },
    ],
  }
}

// Clip region around a straight two-point line path (twine strands).
function tubeClip(d: string, hw: number): string {
  const n = d.match(/-?\d+\.?\d*/g)!.map(Number)
  const [x0, y0, x1, y1] = n
  const len = Math.hypot(x1 - x0, y1 - y0)
  const px = (-(y1 - y0) / len) * hw
  const py = ((x1 - x0) / len) * hw
  return poly([x0 + px, y0 + py, x1 + px, y1 + py, x1 - px, y1 - py, x0 - px, y0 - py])
}

// Or gravé: clous de Paris (hobnail pyramids) panel in a polished frame.
export function clousDeParis(): Art {
  const px = 46
  const py = 9
  const pw = 106
  const ph = 83
  const panel = rr(px + pw / 2, py + ph / 2, pw, ph, 4)
  const s = 4.4
  const faces = ['', '', '', '']
  let grid = ''
  for (let y = py - s; y < py + ph + s; y += s) {
    for (let x = px - s; x < px + pw + s; x += s) {
      const ax = x + s / 2
      const ay = y + s / 2
      faces[0] += poly([x, y, x + s, y, ax, ay])
      faces[1] += poly([x, y, ax, ay, x, y + s])
      faces[2] += poly([x + s, y, x + s, y + s, ax, ay])
      faces[3] += poly([x, y + s, ax, ay, x + s, y + s])
    }
  }
  for (let x = px - s; x < px + pw + s; x += s) grid += `M${r2(x)} ${py - 6}V${py + ph + 6}`
  for (let y = py - s; y < py + ph + s; y += s) grid += `M${px - 6} ${r2(y)}H${px + pw + 6}`
  const cols = ['#fbe6a8', '#e0b95e', '#a0722a', '#6e4c14']
  const frame = rr(px + pw / 2, py + ph / 2, pw + 6, ph + 6, 6) + rrRev(px + pw / 2, py + ph / 2, pw, ph, 4)
  const r = rng(17)
  let brush = ''
  for (let i = 0; i < 160; i++) {
    const y = r() * H
    const x0 = -4 + r() * 30
    brush += `M${r2(x0)} ${r2(y)}H${r2(x0 + 30 + r() * 30)}`
  }
  return {
    viewW: W,
    viewH: H,
    paths: [
      { d: rect(0, 0, W, H), fill: 'rgb(128,128,128)', alpha: 0.38, blend: 'saturation' },
      { d: rect(0, 0, W, H), fill: lin(0, 0, 0, H, 0, 'rgba(255,240,200,0.15)', 1, 'rgba(40,25,5,0.35)'), blend: 'multiply' },
      { d: brush, stroke: 'rgba(255,240,200,0.25)', sw: 0.2, blend: 'screen' },
      { d: tf(brush, 0, 0.6), stroke: 'rgba(60,38,6,0.2)', sw: 0.2, blend: 'multiply' },
      ...castShadow(rr(px + pw / 2, py + ph / 2, pw + 6, ph + 6, 6), 1.2, 1.8, 0.5, 1.6, '50,30,5'),
      ...faces.map((d, i) => ({ d, fill: cols[i], clip: panel })),
      { d: grid, stroke: 'rgba(60,38,6,0.5)', sw: 0.2, clip: panel },
      { d: panel, fill: lin(px, py, px + pw, py + ph, 0, 'rgba(255,240,200,0)', 0.35, 'rgba(255,240,200,0.35)', 0.5, 'rgba(255,240,200,0)', 1, 'rgba(255,240,200,0)'), blend: 'screen' },
      { d: panel, fill: rad(px + pw * 0.3, py + ph * 0.3, 110, 0, 'rgba(60,35,5,0)', 0.6, 'rgba(60,35,5,0.15)', 1, 'rgba(60,35,5,0.5)'), blend: 'multiply' },
      { d: frame, fill: lin(px, py, px + pw, py + ph, 0, '#fff6d6', 0.25, '#d7a646', 0.5, '#f8de96', 0.75, '#9a6c22', 1, '#5e400e') },
      ...bevel(frame, 0.6, 'rgba(255,252,235,0.9)', 'rgba(50,25,0,0.6)'),
      sheen(28, 24, 0.22),
      ...glint(px + 2, py + 1, 4, 0.8),
    ],
  }
}

// Or rose: twisting satin ribbons in rose gold.
export function roseSatin(): Art {
  const paths: VectorPath[] = []
  const ribbons = [
    { base: 34, amp: 12, ph: 0.4, tw: 1.1, w: 9 },
    { base: 70, amp: 9, ph: 2.6, tw: 2.2, w: 7 },
  ]
  for (const rb of ribbons) {
    const top: number[] = []
    const bot: number[] = []
    const stops: (number | string)[] = []
    for (let x = -4; x <= 164; x += 2) {
      const c = rb.base + rb.amp * Math.sin(x / 38 + rb.ph)
      const tw = Math.cos(x / 30 + rb.tw)
      const hw = rb.w * (0.12 + 0.88 * Math.abs(tw))
      top.push(x, c - hw)
      bot.push(x, c + hw)
    }
    for (let k = 0; k <= 20; k++) {
      const x = -4 + (168 * k) / 20
      const ang = x / 30 + rb.tw
      const b = 0.5 + 0.5 * Math.sin(ang * 2 - 0.6) * Math.sign(Math.cos(ang))
      stops.push(k / 20, ramp([[0, '#7a3a2e'], [0.45, '#c97c69'], [0.8, '#f4c3b2'], [1, '#fff1ea']], b))
    }
    const bl: number[] = []
    for (let i = bot.length - 2; i >= 0; i -= 2) bl.push(bot[i], bot[i + 1])
    const d = poly([...top, ...bl])
    paths.push(...castShadow(d, 1.6, 3.4, 0.35, 2.4, '90,40,30'))
    paths.push({ d, fill: lin(-4, 0, 164, 0, ...stops) })
    paths.push({ d: smooth(top), stroke: 'rgba(255,240,232,0.7)', sw: 0.35 })
    paths.push({ d: smooth(bot), stroke: 'rgba(90,40,30,0.4)', sw: 0.35 })
  }
  paths.push(sheen(70, 40, 0.18), glow(24, 10, 70, '255,240,232', 0.25))
  return { viewW: W, viewH: H, paths }
}

// Platine: sunray-brushed platinum dial with a polished centre.
export function platineSunray(): Art {
  const cx = 116
  const cy = 50.5
  const boss = circ(cx, cy, 4.2)
  return {
    viewW: W,
    viewH: H,
    paths: [
      ...sunray(cx, cy, '255,255,255', '40,46,56', 0.75, 0.4, -135, 0.16),
      { d: circ(cx, cy, 30), stroke: 'rgba(40,46,56,0.18)', sw: 0.3 },
      { d: circ(cx, cy, 30.4), stroke: 'rgba(255,255,255,0.5)', sw: 0.3 },
      ...castShadow(boss, 0.5, 0.8, 0.4, 0.6, '30,34,40'),
      { d: boss, fill: lin(cx - 4, cy - 4, cx + 4, cy + 4, 0, '#ffffff', 0.5, '#b7bdc5', 1, '#6f7680') },
      ...bevel(boss, 0.3, 'rgba(255,255,255,0.9)', 'rgba(30,34,40,0.5)'),
      vignette(0.2, '40,46,56'),
    ],
  }
}

// Holographique: conic rainbow foil, diffraction rings and sparkles.
export function holoPrism(): Art {
  const cx = 116
  const cy = 50
  const paths: VectorPath[] = []
  const n = 120
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * PI * 2
    const a1 = ((i + 1.1) / n) * PI * 2
    const hue = Math.round((i / n) * 720) % 360
    paths.push({ d: poly([cx, cy, cx + 240 * Math.cos(a0), cy + 240 * Math.sin(a0), cx + 240 * Math.cos(a1), cy + 240 * Math.sin(a1)]), fill: `hsla(${hue},100%,66%,0.26)` })
  }
  const ringsBy: string[] = Array(12).fill('')
  for (let rr_ = 3; rr_ < 170; rr_ += 1.4) ringsBy[Math.floor(rr_ / 1.4) % 12] += circ(cx, cy, rr_)
  ringsBy.forEach((d, k) => paths.push({ d, stroke: `hsla(${k * 30},100%,60%,0.09)`, sw: 0.5 }))
  paths.push(
    sheen(30, 40, 0.5),
    sheen(96, 20, 0.35),
    { d: rect(0, 0, W, H), fill: lin(0, 0, W, H, 0, 'rgba(255,120,200,0.25)', 0.33, 'rgba(255,230,120,0.2)', 0.66, 'rgba(110,255,210,0.22)', 1, 'rgba(120,150,255,0.28)'), blend: 'soft-light' },
  )
  const r = rng(12)
  for (let i = 0; i < 14; i++) paths.push(...glint(r() * W, r() * H, 1 + r() * 2.4, 0.8))
  return { viewW: W, viewH: H, paths }
}

// Holographique: a prismatic cut gem (side view) refracting the spectrum.
export function holoGem(): Art {
  const paths: VectorPath[] = []
  const g: [number, number][] = [10, 20, 30, 40, 50, 60, 70, 80, 90].map((x) => [x, 40])
  const t: [number, number][] = [[30, 22], [43.3, 22], [56.6, 22], [70, 22]]
  const cul: [number, number] = [50, 94]
  const hues = [320, 280, 220, 180, 140, 60, 30, 350]
  const facet = (pts: [number, number][], hue: number, lightness: number) => {
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    paths.push({ d: poly(pts.flat()), fill: lin(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 0, `hsl(${hue},90%,${Math.min(96, lightness + 14)}%)`, 1, `hsl(${(hue + 50) % 360},80%,${lightness - 8}%)`) })
  }
  paths.push({ d: poly([10, 40, 30, 22, 70, 22, 90, 40, 50, 94]), fill: 'rgba(255,255,255,0.5)' })
  const zz: [number, number][] = [g[0], t[0], g[2], t[1], g[4], t[2], g[6], t[3], g[8]]
  for (let i = 0; i < zz.length - 2; i++) facet([zz[i], zz[i + 1], zz[i + 2]], hues[i % 8], 84 - i * 3 + (i % 2) * 8)
  for (let i = 0; i < 8; i++) facet([g[i], g[i + 1], cul], hues[(i + 3) % 8], 62 + (i < 4 ? 14 - i * 3 : (i - 4) * 2) + (i % 2) * 6)
  facet([[30, 22], [70, 22], [66, 17], [34, 17]], 200, 92)
  let e = poly([10, 40, 30, 22, 70, 22, 90, 40, 50, 94]) + 'M10 40H90M34 17L30 22M66 17L70 22M34 17H66'
  for (let i = 1; i < zz.length - 1; i++) e += `M${zz[i - 1][0]} ${zz[i - 1][1]}L${zz[i][0]} ${zz[i][1]}L${zz[i + 1][0]} ${zz[i + 1][1]}`
  for (let i = 1; i < 8; i++) e += `M${g[i][0]} 40L50 94`
  paths.push({ d: e, stroke: 'rgba(255,255,255,0.85)', sw: 0.5 })
  paths.push({ d: 'M50 94L36 40M50 94L64 40', stroke: 'rgba(255,255,255,0.4)', sw: 0.3 })
  paths.push(...glint(31, 22, 9, 1), ...glint(70, 39, 5, 0.8), ...glint(50, 93, 4, 0.6))
  return { viewW: 100, viewH: 100, paths }
}

// Transit: enamelled metro lines as raised tubes over an engraved city grid.
export function transitLines(): Art {
  const paths: VectorPath[] = []
  const r = rng(21)
  let streets = ''
  for (let x = 4; x < W; x += 6 + r() * 10) streets += `M${r2(x)} 0V${H}`
  for (let y = 4; y < H; y += 6 + r() * 9) streets += `M0 ${r2(y)}H${W}`
  const river = 'M-4 92C30 86 50 96 80 88C110 80 130 92 164 82'
  paths.push(
    { d: tf(streets, -0.2, -0.2), stroke: 'rgba(0,0,0,0.25)', sw: 0.25 },
    { d: tf(streets, 0.2, 0.2), stroke: 'rgba(255,255,255,0.05)', sw: 0.25 },
    { d: river, stroke: 'rgba(110,230,220,0.08)', sw: 9 },
    { d: tf(river, 0, -3.6), stroke: 'rgba(160,255,240,0.12)', sw: 0.4 },
    glow(20, 6, 90, '200,255,240', 0.1),
    vignette(0.5, '0,10,15'),
  )
  const lines: [string, string][] = [
    ['M-4 30H58Q64 30 68 34L82 48Q86 52 92 52H164', '#ffcc33'],
    ['M-4 70H36Q42 70 46 66L74 38Q78 34 84 34H164', '#4fd1c5'],
    ['M124 -4V24Q124 30 120 34L108 46Q104 50 104 56V105', '#ff7a6b'],
  ]
  for (const [d] of lines) paths.push({ d: tf(d, 0.9, 1.6), stroke: 'rgba(0,0,0,0.22)', sw: 5.5 }, { d: tf(d, 0.7, 1.2), stroke: 'rgba(0,0,0,0.4)', sw: 3.4 })
  for (const [d, c] of lines)
    paths.push(
      { d: tf(d, 0.3, 0.5), stroke: shade(c, -0.45), sw: 3 },
      { d, stroke: c, sw: 3 },
      { d: tf(d, -0.4, -0.6), stroke: shade(c, 0.45), sw: 1.1, alpha: 0.85 },
      { d: tf(d, -0.55, -0.8), stroke: 'rgba(255,255,255,0.75)', sw: 0.3 },
    )
  const station = (x: number, y: number, w = 0) => {
    const d = w ? rr(x, y, w + 5, 5, 2.5, -45) : circ(x, y, 2.4)
    paths.push(
      ...castShadow(d, 0.7, 1.2, 0.5, 0.6),
      { d, fill: radLit(x, y, 3 + w / 2, 0, '#ffffff', 0.7, '#dfe7ea', 1, '#9fb0b6') },
      { d, stroke: '#0a2f3a', sw: 0.75 },
      { d: tf(d, -0.3, -0.4), stroke: 'rgba(255,255,255,0.8)', sw: 0.3, clip: d },
    )
  }
  station(73, 39, 4)
  station(120.6, 34)
  station(104.5, 52)
  for (const [x, y] of [[24, 30], [140, 52], [20, 70], [148, 34], [124, 12], [104, 82]]) station(x, y)
  return { viewW: W, viewH: H, paths }
}

// Carbone rouge: glossy lacquered racing stripes with pinstripes and clear-coat.
export function carbonStripes(): Art {
  const s1 = rect(120, -2, 9.6, 105)
  const s2 = rect(133.6, -2, 2.6, 105)
  const both = s1 + s2
  const red = lin(0, 0, 0, 101, 0, '#ff5a48', 0.35, '#e0251f', 0.75, '#b0151a', 1, '#6e0a0e')
  return {
    viewW: W,
    viewH: H,
    paths: [
      vignette(0.55),
      ...castShadow(both, 0.5, 0.6, 0.6, 0.6),
      { d: both, fill: red },
      { d: both, fill: lin(118, 0, 138, 0, 0, 'rgba(255,255,255,0.18)', 0.5, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.25)'), blend: 'overlay' },
      { d: 'M120.2 -2V103M133.8 -2V103', stroke: 'rgba(255,190,180,0.75)', sw: 0.3 },
      { d: 'M129.4 -2V103M136 -2V103', stroke: 'rgba(40,0,0,0.6)', sw: 0.3 },
      { d: 'M116.4 -2V103M139.6 -2V103', stroke: lin(0, 0, 0, 101, 0, '#ffffff', 0.5, '#9aa0a8', 1, '#e6e8eb'), sw: 0.35 },
      { d: poly([118, 22, 140, 6, 140, 18, 118, 34]), fill: lin(0, 6, 0, 34, 0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,0.5)', 1, 'rgba(255,255,255,0)'), clip: both, blend: 'screen' },
      sheen(64, 34, 0.1),
      sheen(150, 12, 0.08),
      glow(30, 12, 50, '255,255,255', 0.06),
    ],
  }
}
