import type { VectorPath } from '../../types'
import { blob, circ, dots, ell, lin, poly, rad, radLit, rect, rng, type Art } from './kit'
import { rotEll } from './cardparts'

// Vivid artwork: cyberpunk, neon, abstract, marble and nature collections.
// Every scene picks one key light and keeps it: form shading, core shadows
// (multiply, clipped), rim light, bloom ('screen' / 'lighter') and haze.

const W = 160
const H = 101
const f = (v: number) => Math.round(v * 100) / 100

// ---- lighting helpers (shared with core-world) --------------------------------
export function rgba(hex: string, a: number): string {
  const v = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}

// Linear blend between two #rrggbb colours.
export function mix(a: string, b: string, t: number): string {
  const pa = [0, 2, 4].map((i) => parseInt(a.slice(1 + i, 3 + i), 16))
  const pb = [0, 2, 4].map((i) => parseInt(b.slice(1 + i, 3 + i), 16))
  return '#' + pa.map((x, i) => Math.round(x + (pb[i] - x) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('')
}

// Soft light bloom (radial falloff), screened over whatever is below.
export function glow(x: number, y: number, r: number, hex: string, a = 1, blend: GlobalCompositeOperation = 'screen'): VectorPath {
  return { d: circ(x, y, r), fill: rad(x, y, r, 0, rgba(hex, a), 0.35, rgba(hex, a * 0.4), 1, rgba(hex, 0)), blend }
}

// Neon tube: wide additive halo, coloured glass and a hot white core.
export function neon(d: string, hex: string, w = 1, core = '#ffffff'): VectorPath[] {
  return [
    { d, stroke: rgba(hex, 0.09), sw: w * 10, blend: 'lighter' },
    { d, stroke: rgba(hex, 0.2), sw: w * 4.6, blend: 'lighter' },
    { d, stroke: rgba(hex, 0.85), sw: w * 1.9, blend: 'lighter' },
    { d, stroke: core, sw: w * 0.65, alpha: 0.95 },
  ]
}

// Catmull-Rom spline through flat [x0,y0,x1,y1,...] points.
export function smooth(pts: number[], closed = false): string {
  const P: [number, number][] = []
  for (let i = 0; i < pts.length; i += 2) P.push([pts[i], pts[i + 1]])
  const N = P.length
  const g = (i: number) => (closed ? P[(i + N) % N] : P[Math.max(0, Math.min(N - 1, i))])
  let d = `M${f(P[0][0])} ${f(P[0][1])}`
  const segs = closed ? N : N - 1
  for (let i = 0; i < segs; i++) {
    const [p0, p1, p2, p3] = [g(i - 1), g(i), g(i + 1), g(i + 2)]
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return closed ? d + 'Z' : d
}

// Darkened card edges (multiplied radial falloff).
export function vignette(a = 0.5, inner = 0.45, color = '0,0,0'): VectorPath {
  return { d: rect(-2, -2, W + 4, H + 4), fill: { kind: 'radial', cx: 80, cy: 50, r: 96, stops: [[inner, `rgba(${color},0)`], [1, `rgba(${color},${a})`]] }, blend: 'multiply' }
}

// Volumetric light shafts fanning out from a source.
export function rays(cx: number, cy: number, n: number, len: number, a0: number, spread: number, hex: string, alpha: number, seed: number): VectorPath {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = a0 + (r() - 0.5) * spread
    const w = 0.02 + r() * 0.06
    d += poly([cx, cy, cx + len * Math.cos(a - w), cy + len * Math.sin(a - w), cx + len * Math.cos(a + w), cy + len * Math.sin(a + w)])
  }
  return { d, fill: rad(cx, cy, len, 0, rgba(hex, alpha), 0.5, rgba(hex, alpha * 0.35), 1, rgba(hex, 0)), blend: 'screen' }
}

// Dense samples along a Catmull-Rom spline (for tapered strokes).
export function sampleCR(pts: number[], per = 10): [number, number][] {
  const P: [number, number][] = []
  for (let i = 0; i < pts.length; i += 2) P.push([pts[i], pts[i + 1]])
  const g = (i: number) => P[Math.max(0, Math.min(P.length - 1, i))]
  const out: [number, number][] = []
  for (let i = 0; i < P.length - 1; i++) {
    const [p0, p1, p2, p3] = [g(i - 1), g(i), g(i + 1), g(i + 2)]
    for (let k = 0; k < per; k++) {
      const t = k / per
      const t2 = t * t
      const t3 = t2 * t
      const c = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3)
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(P[P.length - 1])
  return out
}

// Tapered ribbon along a spline (branches, blades, swooshes).
export function taper(pts: number[], w0: number, w1: number, ox = 0, oy = 0): string {
  const s = sampleCR(pts)
  const l: number[] = []
  const r: number[] = []
  s.forEach(([x, y], i) => {
    const [ax, ay] = s[Math.max(0, i - 1)]
    const [bx, by] = s[Math.min(s.length - 1, i + 1)]
    const len = Math.hypot(bx - ax, by - ay) || 1
    const nx = -(by - ay) / len
    const ny = (bx - ax) / len
    const w = (w0 + (w1 - w0) * (i / (s.length - 1))) / 2
    l.push(x + nx * w + ox, y + ny * w + oy)
    r.unshift(x - nx * w + ox, y - ny * w + oy)
  })
  return poly([...l, ...r])
}

// Map a flat point list through a transform.
function tf(pts: number[], fn: (x: number, y: number) => [number, number]): number[] {
  const out: number[] = []
  for (let i = 0; i < pts.length; i += 2) out.push(...fn(pts[i], pts[i + 1]))
  return out
}

// Horizontal scanlines.
function scanlines(step: number, color: string, sw: number): VectorPath {
  let d = ''
  for (let y = 0; y < H; y += step) d += `M0 ${f(y)}H${W}`
  return { d, stroke: color, sw, blend: 'multiply' }
}

// Banded retro sun: gradient disc cut by stripes that show the sky behind.
function stripedSun(cx: number, cy: number, r: number, fill: VectorPath['fill'], sky: VectorPath['fill'], gaps = 6, start = 0.05): VectorPath[] {
  let gd = ''
  for (let k = 0; k < gaps; k++) {
    const gy = cy + r * start + k * ((r * (0.95 - start)) / gaps)
    gd += rect(cx - r - 1, gy, 2 * r + 2, 0.6 + k * (r * 0.04))
  }
  return [{ d: circ(cx, cy, r), fill }, { d: gd, fill: sky, clip: circ(cx, cy, r + 0.5) }]
}

// ---- Grid Runner: synthwave city, sun, light-cycle trails, wet grid -------------
export function neonCity(): Art {
  const p: VectorPath[] = []
  const HZ = 64
  const VX = 80
  const skyG = lin(0, 0, 0, HZ, 0, '#09021c', 0.42, '#260642', 0.78, '#6c1060', 1, '#ff3f86')
  p.push({ d: rect(0, 0, W, HZ + 1), fill: skyG })
  p.push({ d: dots(70, 5, W, 38, 0.12, 0.42), fill: 'rgba(255,225,255,0.75)' })
  // sun + bloom
  const sx = 80
  const sy = 42
  p.push(glow(sx, sy, 70, '#ff2f86', 0.55), glow(sx, sy, 40, '#ffb347', 0.5))
  p.push(...stripedSun(sx, sy, 24, lin(0, sy - 24, 0, sy + 24, 0, '#fff7b0', 0.35, '#ffc04a', 0.7, '#ff5a8a', 1, '#d81b7a'), skyG, 6, -0.05))
  p.push(glow(sx, sy, 30, '#ff7ab0', 0.25))
  // skyline factory
  const skyline = (seed: number, base: number, minH: number, maxH: number, minW: number, maxW: number) => {
    const rr = rng(seed)
    const boxes: [number, number, number, number][] = []
    let x = -4
    while (x < 164) {
      const w = minW + rr() * (maxW - minW)
      const h = minH + rr() * (maxH - minH)
      boxes.push([x, base - h, w, h])
      x += w + (rr() < 0.2 ? 1 : 0)
    }
    return boxes
  }
  // far layer: hazy, lit by the sun from behind
  const far = skyline(7, HZ, 8, 30, 5, 12)
  p.push({ d: far.map(([x, y, w, h]) => rect(x, y, w, h)).join(''), fill: lin(0, 30, 0, HZ, 0, '#3d1466', 1, '#8a2a7c') })
  p.push({ d: far.map(([x, y, w]) => `M${f(x)} ${f(y)}h${f(w)}`).join(''), stroke: 'rgba(255,170,210,0.35)', sw: 0.35, blend: 'screen' })
  // mid layer with antennas and windows
  const mid = skyline(19, HZ, 5, 20, 6, 14)
  p.push({ d: mid.map(([x, y, w, h]) => rect(x, y, w, h)).join(''), fill: lin(0, 40, 0, HZ, 0, '#1e0838', 1, '#3b0f55') })
  const rw = rng(41)
  let wA = ''
  let wB = ''
  let ant = ''
  for (const [bx, by, bw] of mid) {
    if (rw() < 0.3) ant += `M${f(bx + bw / 2)} ${f(by)}v${f(-3 - rw() * 5)}`
    for (let wy = by + 1.6; wy < HZ - 1; wy += 2.4) {
      for (let wx = bx + 1.2; wx < bx + bw - 1.2; wx += 2) {
        const v = rw()
        if (v < 0.12) wA += rect(wx, wy, 0.9, 1)
        else if (v < 0.18) wB += rect(wx, wy, 0.9, 1)
      }
    }
  }
  p.push({ d: ant, stroke: '#2a0b48', sw: 0.5 })
  p.push({ d: wA, fill: '#5ef0ff', alpha: 0.75 }, { d: wB, fill: '#ff6fd8', alpha: 0.8 })
  // horizon haze
  p.push({ d: rect(0, HZ - 10, W, 18), fill: lin(0, HZ - 10, 0, HZ + 8, 0, 'rgba(255,60,140,0)', 0.6, 'rgba(255,90,160,0.45)', 1, 'rgba(255,60,140,0)'), blend: 'screen' })
  // floor
  p.push({ d: rect(0, HZ, W, H - HZ + 1), fill: lin(0, HZ, 0, H, 0, '#2a0645', 0.4, '#12021f', 1, '#05010b') })
  // sun reflection on wet floor
  p.push({ d: rect(sx - 20, HZ, 40, H - HZ), fill: lin(0, HZ, 0, H, 0, 'rgba(255,170,90,0.55)', 0.5, 'rgba(255,60,140,0.2)', 1, 'rgba(255,60,140,0)'), blend: 'screen', clip: poly([sx - 12, HZ, sx + 12, HZ, sx + 24, H, sx - 24, H]) })
  let shim = ''
  const rs = rng(5)
  for (let i = 0; i < 26; i++) {
    const y = HZ + 1 + Math.pow(rs(), 1.4) * (H - HZ)
    const w = 2 + rs() * (8 + (y - HZ) * 0.5)
    shim += `M${f(sx - w / 2 + (rs() - 0.5) * 6)} ${f(y)}h${f(w)}`
  }
  p.push({ d: shim, stroke: 'rgba(255,200,140,0.55)', sw: 0.4, blend: 'lighter' })
  // glowing grid
  let grid = ''
  for (let i = -16; i <= 16; i++) grid += `M${f(VX + i * 2.2)} ${HZ}L${f(VX + i * 16)} ${H + 2}`
  for (let k = 1; k <= 11; k++) {
    const y = HZ + (H - HZ) * Math.pow(k / 11, 2)
    grid += `M0 ${f(y)}H${W}`
  }
  p.push({ d: grid, stroke: 'rgba(255,40,150,0.18)', sw: 1.6, blend: 'lighter', clip: rect(0, HZ, W, H) })
  p.push({ d: grid, stroke: 'rgba(255,90,200,0.75)', sw: 0.35, blend: 'lighter', clip: rect(0, HZ, W, H) })
  // light-cycle trails converging on the horizon
  const trailC = `M${VX - 3} ${HZ + 0.5}C${VX - 6} ${HZ + 12} ${VX - 26} ${HZ + 18} ${VX - 40} ${H + 2}`
  const trailM = `M${VX + 2} ${HZ + 0.5}C${VX + 4} ${HZ + 10} ${VX + 20} ${HZ + 20} ${VX + 52} ${H + 2}`
  p.push(...neon(trailC, '#38f2ff', 0.8), ...neon(trailM, '#ff4fd8', 0.8))
  // haze over the floor near the horizon (atmospheric perspective)
  p.push({ d: rect(0, HZ, W, 12), fill: lin(0, HZ, 0, HZ + 12, 0, 'rgba(255,80,150,0.55)', 1, 'rgba(255,80,150,0)'), blend: 'screen' })
  p.push({ d: `M0 ${HZ}H${W}`, stroke: '#ffd0e8', sw: 0.5 })
  // near buildings framing both sides, with visible side faces toward the vanishing point
  const tower = (x: number, top: number, w: number, base: number, seed: number, sign: string) => {
    const rr = rng(seed)
    const k = 0.16
    const left = x + w < VX
    const ex = left ? x + w : x
    const P = (px: number, py: number): [number, number] => [px + (VX - px) * k, py + (HZ - py) * k]
    const [t2x, t2y] = P(ex, top)
    const [b2x, b2y] = P(ex, base)
    const side = poly([ex, top, ex, base, b2x, b2y, t2x, t2y])
    p.push({ d: side, fill: lin(ex, 0, t2x, 0, 0, '#1a0630', 1, '#2c0b4a') })
    p.push({ d: side, fill: lin(0, top, 0, base, 0, rgba(sign, 0.0), 1, rgba(sign, 0.18)), blend: 'screen' })
    const front = rect(x, top, w, base - top)
    p.push({ d: front, fill: lin(0, top, 0, base, 0, '#140428', 1, '#0a0216') })
    let win = ''
    let win2 = ''
    for (let wy = top + 3; wy < base - 2; wy += 2.6) {
      for (let wx = x + 1.4; wx < x + w - 1.4; wx += 2.2) {
        const v = rr()
        if (v < 0.16) win += rect(wx, wy, 1.1, 1.3)
        else if (v < 0.22) win2 += rect(wx, wy, 1.1, 1.3)
      }
    }
    p.push({ d: win, fill: '#ffb0f0', alpha: 0.85 }, { d: win2, fill: '#7ff6ff', alpha: 0.85 })
    // rim light from the sun on the edge facing the centre
    p.push({ d: `M${f(ex)} ${f(top)}V${f(base)}`, stroke: rgba('#ff7ab8', 0.7), sw: 0.45, blend: 'screen' })
    p.push({ d: `M${f(x)} ${f(top)}h${f(w)}`, stroke: rgba('#ff9ad0', 0.5), sw: 0.4, blend: 'screen' })
    // neon sign strip
    const nx = left ? x + w * 0.3 : x + w * 0.7
    p.push(...neon(`M${f(nx)} ${f(top + 5)}V${f(top + 5 + (base - top) * 0.35)}`, sign, 0.7))
    // wet-floor reflection of the sign
    p.push({ d: rect(nx - 1.2, base, 2.4, 14), fill: lin(0, base, 0, base + 14, 0, rgba(sign, 0.5), 1, rgba(sign, 0)), blend: 'screen' })
  }
  tower(-2, 14, 14, 84, 3, '#ff4fd8')
  tower(12, 30, 12, 76, 4, '#38f2ff')
  tower(148, 8, 16, 88, 5, '#38f2ff')
  tower(135, 28, 12, 78, 6, '#ff4fd8')
  // rain
  let rain = ''
  const rr = rng(88)
  for (let i = 0; i < 80; i++) rain += `M${f(rr() * 170)} ${f(rr() * 101)}l-1.6 5`
  p.push({ d: rain, stroke: 'rgba(200,220,255,0.16)', sw: 0.3, blend: 'screen' })
  p.push(vignette(0.55))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Glitch: faceted 3D orb, sliced, RGB-split, pixel-sorted --------------------
type V3 = [number, number, number]
const nrm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2])
  return [v[0] / l, v[1] / l, v[2] / l]
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// Geodesic sphere (icosahedron subdivided once), outward-wound triangles.
export function geodesic(sub1 = true): V3[][] {
  const q = (1 + Math.sqrt(5)) / 2
  const V: V3[] = (
    [[-1, q, 0], [1, q, 0], [-1, -q, 0], [1, -q, 0], [0, -1, q], [0, 1, q], [0, -1, -q], [0, 1, -q], [q, 0, -1], [q, 0, 1], [-q, 0, -1], [-q, 0, 1]] as V3[]
  ).map(nrm)
  let F: V3[][] = []
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++)
      for (let k = j + 1; k < 12; k++) {
        const e = (a: V3, b: V3) => Math.hypot(...sub(a, b))
        if (e(V[i], V[j]) < 1.1 && e(V[j], V[k]) < 1.1 && e(V[i], V[k]) < 1.1) F.push([V[i], V[j], V[k]])
      }
  if (sub1) {
    const mid = (a: V3, b: V3) => nrm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2])
    F = F.flatMap(([a, b, c]) => {
      const ab = mid(a, b)
      const bc = mid(b, c)
      const ca = mid(c, a)
      return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]
    })
  }
  return F.map((t) => {
    const n = cross(sub(t[1], t[0]), sub(t[2], t[0]))
    return dot(n, [t[0][0] + t[1][0] + t[2][0], t[0][1] + t[1][1] + t[2][1], t[0][2] + t[1][2] + t[2][2]]) < 0 ? [t[0], t[2], t[1]] : t
  })
}

function rot(v: V3, ay: number, ax: number): V3 {
  const [x, y, z] = v
  const x1 = x * Math.cos(ay) + z * Math.sin(ay)
  const z1 = -x * Math.sin(ay) + z * Math.cos(ay)
  return [x1, y * Math.cos(ax) - z1 * Math.sin(ax), y * Math.sin(ax) + z1 * Math.cos(ax)]
}

// Colour ramp through several stops.
function ramp(stops: string[], t: number): string {
  const x = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1)
  const i = Math.floor(x)
  return mix(stops[i], stops[i + 1], x - i)
}

export function glitchField(): Art {
  const p: VectorPath[] = []
  const cx = 100
  const cy = 46
  const R = 33
  const L = nrm([-0.55, -0.62, 0.56])
  const Hh = nrm([L[0], L[1], L[2] + 1])
  const faces = geodesic().map((t) => t.map((v) => rot(v, 0.45, -0.32)))
  const vis = faces
    .map((t) => {
      const n = nrm(cross(sub(t[1], t[0]), sub(t[2], t[0])))
      return { t, n }
    })
    .filter(({ n }) => n[2] > 0.02)
  const shadeFace = (n: V3) => {
    const di = Math.max(0, dot(n, L))
    const sp = Math.pow(Math.max(0, dot(n, Hh)), 24)
    let c = ramp(['#10041f', '#3a0f78', '#9a24b0', '#ff5cc6', '#ffd6f4'], 0.12 + di * 0.85)
    const rim = Math.pow(1 - n[2], 2.2) * Math.max(0, n[0] * 0.8 + n[1] * 0.45)
    c = mix(c, '#2ef6ff', Math.min(1, rim * 1.6))
    return mix(c, '#ffffff', sp * 0.9)
  }
  const shaded = vis.map(({ t, n }) => ({ pts: t.flatMap((v) => [v[0], v[1]]), c: shadeFace(n) }))
  const orb = (ox: number, oy = 0, clip?: string, tint?: string): VectorPath[] =>
    shaded.map(({ pts, c }) => {
      const d = poly(tf(pts, (x, y) => [cx + ox + x * R, cy + oy + y * R]))
      const col = tint ? mix(c, tint, 0.55) : c
      return { d, fill: col, stroke: col, sw: 0.18, clip }
    })
  const silhouette = (ox: number) => circ(cx + ox, cy, R * 0.995)

  // backdrop: deep violet room, magenta key from the upper-left, cyan bounce
  p.push(glow(cx - 18, cy - 14, 80, '#b0208f', 0.45), glow(30, 85, 60, '#1fb8ff', 0.3))
  // perspective floor
  const HZ = 74
  let grid = ''
  for (let i = -14; i <= 14; i++) grid += `M${f(cx + i * 3)} ${HZ}L${f(cx + i * 22)} ${H + 2}`
  for (let k = 1; k <= 7; k++) grid += `M0 ${f(HZ + (H - HZ) * Math.pow(k / 7, 2))}H${W}`
  p.push({ d: rect(0, HZ, W, H - HZ), fill: lin(0, HZ, 0, H, 0, 'rgba(10,0,25,0.2)', 1, 'rgba(0,0,0,0.6)'), blend: 'multiply' })
  p.push({ d: grid, stroke: 'rgba(120,80,255,0.35)', sw: 0.3, blend: 'screen', clip: rect(0, HZ, W, H) })
  p.push({ d: `M0 ${HZ}H${W}`, stroke: 'rgba(180,140,255,0.5)', sw: 0.4, blend: 'screen' })
  // cast shadow + magenta floor bounce
  p.push({ d: ell(cx + 6, 89, 30, 5), fill: rad(cx + 6, 89, 30, 0, 'rgba(0,0,0,0.6)', 1, 'rgba(0,0,0,0)'), blend: 'multiply' })
  p.push({ d: ell(cx, 88, 40, 7), fill: rad(cx, 88, 40, 0, 'rgba(255,60,200,0.25)', 1, 'rgba(255,60,200,0)'), blend: 'screen' })

  // datamosh blocks behind the orb
  const r = rng(77)
  const moshCols = ['#ff3fb4', '#2ef6ff', '#7b2cff', '#ffe14d', '#ffffff']
  for (let i = 0; i < 26; i++) {
    const bw = 2 + Math.floor(r() * 7) * 2
    const bh = 1 + Math.floor(r() * 4)
    const bx = Math.floor(r() * 78) * 2
    const by = Math.floor(r() * 50) * 2
    const c = moshCols[Math.floor(r() * moshCols.length)]
    p.push({ d: rect(bx, by, bw, bh), fill: lin(bx, 0, bx + bw, 0, 0, rgba(c, 0.5), 1, rgba(c, 0.05)), blend: 'screen' })
  }

  // pixel-sort smears pulled out of the orb
  const sr = rng(12)
  for (let i = 0; i < 14; i++) {
    const y = cy - R * 0.85 + sr() * R * 1.7
    const hw = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)))
    const x0 = cx + hw - 3
    const len = 12 + sr() * 50
    const h = 0.5 + sr() * 1.8
    const c = sr() < 0.5 ? '#ff5cc6' : sr() < 0.5 ? '#2ef6ff' : '#b26bff'
    p.push({ d: rect(x0, y, len, h), fill: lin(x0, 0, x0 + len, 0, 0, rgba(c, 0.85), 1, rgba(c, 0)), blend: 'screen' })
  }
  for (let i = 0; i < 6; i++) {
    const y = cy - R * 0.7 + sr() * R * 1.4
    const hw = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)))
    const x0 = cx - hw + 3
    const len = 10 + sr() * 40
    p.push({ d: rect(x0 - len, y, len, 0.6 + sr()), fill: lin(x0 - len, 0, x0, 0, 0, 'rgba(46,246,255,0)', 1, 'rgba(46,246,255,0.7)'), blend: 'screen' })
  }

  // chromatic aberration fringes
  p.push({ d: silhouette(-3.2), fill: 'rgba(0,240,255,0.85)', blend: 'screen' })
  p.push({ d: silhouette(3.2), fill: 'rgba(255,30,90,0.85)', blend: 'screen' })

  // sliced orb with horizontal displacement
  const slices: [number, number, number, string?][] = [
    [0, 22, 0],
    [22, 25.5, -9, '#2ef6ff'],
    [25.5, 38, 0],
    [38, 41, 7],
    [41, 52, 0],
    [52, 54.5, 14, '#ff3fb4'],
    [54.5, 62, 0],
    [62, 66, -5],
    [66, 101, 0],
  ]
  for (const [y0, y1, ox, tint] of slices) {
    const clip = rect(0, y0, W, y1 - y0)
    if (ox) p.push({ d: silhouette(ox - 2.5), fill: 'rgba(0,240,255,0.6)', blend: 'screen', clip }, { d: silhouette(ox + 2.5), fill: 'rgba(255,30,90,0.6)', blend: 'screen', clip })
    p.push(...orb(ox, 0, clip, tint))
  }
  // wireframe edges + specular bloom + rim glow
  p.push({ d: vis.map(({ t }) => poly(tf(t.flatMap((v) => [v[0], v[1]]), (x, y) => [cx + x * R, cy + y * R]))).join(''), stroke: 'rgba(255,200,255,0.18)', sw: 0.18, blend: 'screen', clip: rect(0, 0, W, 22) + rect(0, 25.5, W, 12.5) + rect(0, 41, W, 11) + rect(0, 54.5, W, 7.5) + rect(0, 66, W, 35) })
  p.push(glow(cx - R * 0.42, cy - R * 0.46, 12, '#ffffff', 0.55))
  p.push({ d: circ(cx, cy, R), stroke: 'rgba(46,246,255,0.5)', sw: 0.6, blend: 'screen', clip: poly([cx, cy - R - 2, cx + R + 4, cy - R - 2, cx + R + 4, cy + R + 2, cx - R, cy + R + 2]) })

  // flying shards broken off the orb
  const shards = shaded.filter((_, i) => i % 5 === 2).slice(0, 11)
  shards.forEach(({ pts, c }, i) => {
    const ox = -40 - i * 5.5 + (i % 3) * 3
    const oy = ((i * 5) % 7) * 6 - 18
    const s = 0.5 - i * 0.03
    const mx = pts[0] + pts[2] + pts[4]
    const my = pts[1] + pts[3] + pts[5]
    const k = (x: number, y: number, dx: number): [number, number] => [cx + ox + dx + (x - mx / 3) * R * s * 2 , cy + oy + (y - my / 3) * R * s * 2]
    const d = poly(tf(pts, (x, y) => k(x, y, 0)))
    const d2 = poly(tf(pts, (x, y) => k(x, y, 1.4)))
    p.push({ d: d2, fill: 'rgba(255,30,90,0.7)', blend: 'screen' }, { d, fill: c }, { d, stroke: 'rgba(46,246,255,0.7)', sw: 0.25, blend: 'screen' })
  })

  // horizontal tear lines and pixel noise
  let tears = ''
  for (let i = 0; i < 7; i++) {
    const y = 6 + r() * 90
    tears += `M${f(r() * 40)} ${f(y)}h${f(40 + r() * 100)}`
  }
  p.push({ d: tears, stroke: 'rgba(200,255,255,0.45)', sw: 0.25, blend: 'lighter' })
  let px = ''
  let px2 = ''
  for (let i = 0; i < 60; i++) {
    const d = rect(Math.floor(r() * 80) * 2, Math.floor(r() * 50) * 2, 1, 1)
    if (r() < 0.5) px += d
    else px2 += d
  }
  p.push({ d: px, fill: 'rgba(46,246,255,0.7)', blend: 'lighter' }, { d: px2, fill: 'rgba(255,92,198,0.7)', blend: 'lighter' })
  // signal bars
  let bars = ''
  for (let i = 0; i < 12; i++) bars += rect(10 + i * 2.1, 90 - (2 + ((i * 7) % 9)), 1.2, 2 + ((i * 7) % 9))
  p.push({ d: bars, fill: 'rgba(46,246,255,0.55)', blend: 'screen' })
  p.push(scanlines(1.2, 'rgba(0,0,0,0.28)', 0.45))
  p.push(vignette(0.6))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Pulse: neon heart + ECG tubes mounted on a brick wall, wet ledge ------------
export function heartbeat(color = '#5ef2ff'): Art {
  const p: VectorPath[] = []
  const HC = '#ff2e88'
  const hx = 80
  const hy = 43
  const s = 1.5
  const heartPts: number[] = []
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2
    heartPts.push(16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)))
  }
  const heart = (ox: number, oy: number, mirror = 0) =>
    smooth(tf(heartPts, (x, y) => [hx + x * s + ox, mirror ? 2 * mirror - (hy + y * s) : hy + y * s + oy]), true)
  const by = 50
  const ecgPts = [-4, by, 30, by, 33, by - 3, 36, by, 52, by, 56, by - 2, 59, by, 66, by, 70, by + 6, 75, by - 30, 81, by + 14, 85, by, 98, by, 102, by - 4, 106, by, 124, by, 127, by - 3, 130, by, 164, by]
  const ecg = (ox: number, oy: number, mirror = 0) => poly(tf(ecgPts, (x, y) => [x + ox, mirror ? 2 * mirror - y : y + oy]), false)
  const LEDGE = 82

  // wall lit by the sign (light first, then the brick texture multiplies over it)
  p.push({ d: rect(0, 0, W, LEDGE), fill: lin(0, 0, 0, LEDGE, 0, '#140a22', 1, '#1d0d2a') })
  p.push(glow(hx, hy + 4, 78, HC, 0.42), glow(hx, hy, 36, '#ff6fb0', 0.35))
  p.push({ d: rect(0, by - 22, W, 44), fill: lin(0, by - 22, 0, by + 22, 0, rgba(color, 0), 0.5, rgba(color, 0.16), 1, rgba(color, 0)), blend: 'screen' })
  let mortar = ''
  const rb = rng(9)
  let dark = ''
  let lite = ''
  for (let row = 0; row * 5.2 < LEDGE; row++) {
    const y = row * 5.2
    mortar += `M0 ${f(y)}H${W}`
    for (let x = row % 2 ? -5 : 0; x < W; x += 10.4) {
      mortar += `M${f(x)} ${f(y)}v5.2`
      const v = rb()
      if (v < 0.35) dark += rect(x + 0.3, y + 0.3, 9.8, 4.6)
      else if (v < 0.55) lite += rect(x + 0.3, y + 0.3, 9.8, 1.2)
    }
  }
  p.push({ d: dark, fill: 'rgba(40,10,40,0.35)', blend: 'multiply' })
  p.push({ d: lite, fill: 'rgba(255,190,230,0.06)', blend: 'screen' })
  p.push({ d: mortar, stroke: 'rgba(10,0,20,0.75)', sw: 0.55, blend: 'multiply' })
  // tube shadows cast on the wall (light comes from the tubes but the room spill is from above)
  p.push({ d: heart(1.6, 3.2), stroke: 'rgba(10,0,20,0.45)', sw: 3, blend: 'multiply' })
  p.push({ d: ecg(1.4, 3), stroke: 'rgba(10,0,20,0.4)', sw: 2.2, blend: 'multiply' })
  // mounting clips
  let clips = ''
  for (const [cxp, cyp] of [[hx - 22, hy - 10], [hx + 22, hy - 10], [hx - 10, hy + 18], [hx + 10, hy + 18], [20, by], [140, by]]) clips += rect(cxp - 0.9, cyp - 1.6, 1.8, 3.2)
  p.push({ d: clips, fill: '#3a2a40', stroke: 'rgba(255,255,255,0.25)', sw: 0.2 })
  // the tubes
  p.push(...neon(heart(0, 0), HC, 1.05, '#ffe2f0'))
  p.push(...neon(ecg(0, 0), color, 0.85, '#f2ffff'))
  // hot spots where the tubes are brightest
  p.push(glow(75, by - 28, 6, '#ffffff', 0.5), glow(hx, hy - 7, 5, '#ffffff', 0.3))
  // glossy black ledge reflecting the sign
  p.push({ d: rect(0, LEDGE, W, H - LEDGE), fill: lin(0, LEDGE, 0, H, 0, '#1a0c22', 1, '#050208') })
  const ledgeClip = rect(0, LEDGE, W, H - LEDGE)
  p.push({ d: heart(0, 0, LEDGE), stroke: rgba(HC, 0.25), sw: 7, blend: 'lighter', clip: ledgeClip })
  p.push({ d: heart(0, 0, LEDGE), stroke: rgba(HC, 0.6), sw: 1.4, blend: 'lighter', clip: ledgeClip })
  p.push({ d: rect(0, LEDGE, W, H - LEDGE), fill: rad(hx, LEDGE, 50, 0, rgba(HC, 0.35), 1, rgba(HC, 0)), blend: 'screen' })
  p.push({ d: ecg(0, 0, LEDGE), stroke: rgba(color, 0.5), sw: 1.2, blend: 'lighter', clip: ledgeClip })
  p.push({ d: rect(0, LEDGE, W, H - LEDGE), fill: lin(0, LEDGE, 0, H, 0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.6)'), blend: 'multiply' })
  p.push({ d: `M0 ${LEDGE}H${W}`, stroke: 'rgba(255,150,210,0.6)', sw: 0.5, blend: 'screen' })
  p.push({ d: rect(0, LEDGE - 2.5, W, 2.5), fill: lin(0, LEDGE - 2.5, 0, LEDGE, 0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.5)'), blend: 'multiply' })
  p.push(vignette(0.65, 0.35))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Miami: striped sun, lit cloud streaks, skyline, rim-lit palms ------------------
export function miamiSunset(): Art {
  const p: VectorPath[] = []
  const HZ = 70
  const sx = 82
  const sy = 52
  const skyG = lin(0, 0, 0, HZ, 0, '#1a0a42', 0.35, '#541a78', 0.72, '#d43f86', 1, '#ff9a5c')
  p.push({ d: rect(0, 0, W, HZ + 1), fill: skyG })
  p.push({ d: dots(40, 3, W, 30, 0.12, 0.35), fill: 'rgba(255,230,255,0.6)' })
  p.push(glow(sx, sy, 75, '#ff4f8f', 0.5), glow(sx, sy, 40, '#ffd36b', 0.55))
  p.push(...stripedSun(sx, sy, 25, lin(0, sy - 25, 0, sy + 25, 0, '#fff6b8', 0.4, '#ffc25c', 0.75, '#ff6a7a', 1, '#f2449e'), skyG, 5, 0.0))
  p.push(glow(sx, sy, 32, '#ffb0a0', 0.22))
  // cloud streaks lit from below by the sun
  const streak = (x: number, y: number, w: number, h: number, a: number) => {
    const d = ell(x, y, w, h) + ell(x - w * 0.35, y - h * 0.5, w * 0.5, h * 0.9) + ell(x + w * 0.3, y - h * 0.3, w * 0.45, h * 0.8)
    p.push({ d: ell(x, y + 0.5, w, h) + ell(x - w * 0.35, y, w * 0.5, h * 0.9), fill: rgba('#ffc39a', a * 0.9) })
    p.push({ d, fill: lin(0, y - h * 1.5, 0, y + h, 0, rgba('#3b1660', a), 1, rgba('#c0397e', a)) })
  }
  streak(28, 34, 30, 2.2, 0.9)
  streak(132, 26, 34, 2, 0.85)
  streak(70, 46, 44, 1.5, 0.75)
  streak(125, 58, 30, 1.3, 0.7)
  // distant skyline in haze
  const rr = rng(23)
  let sky = ''
  let win = ''
  for (let x = 30; x < 140; ) {
    const w = 2 + rr() * 5
    const h = 1.5 + rr() * (Math.abs(x - 85) < 25 ? 9 : 5)
    sky += rect(x, HZ - h, w, h + 0.5)
    if (rr() < 0.6) win += rect(x + w * 0.4, HZ - h + 1, 0.5, 0.5)
    x += w
  }
  p.push({ d: sky, fill: '#6a2070', alpha: 0.85 }, { d: win, fill: '#ffe0f0', alpha: 0.7 })
  // sea
  p.push({ d: rect(0, HZ, W, H - HZ), fill: lin(0, HZ, 0, H, 0, '#7a2a7a', 0.25, '#3a1460', 1, '#0d0322') })
  let refl = ''
  const rs = rng(17)
  for (let i = 0; i < 46; i++) {
    const y = HZ + 1 + Math.pow(rs(), 1.3) * (H - HZ - 1)
    const spread = 22 - (y - HZ) * 0.25
    const w = 1.5 + rs() * spread * 0.6
    refl += `M${f(sx - w / 2 + (rs() - 0.5) * spread * 0.5)} ${f(y)}h${f(w)}`
  }
  p.push({ d: refl, stroke: 'rgba(255,190,110,0.8)', sw: 0.55, blend: 'lighter' })
  p.push({ d: rect(sx - 26, HZ, 52, 12), fill: rad(sx, HZ, 26, 0, 'rgba(255,150,120,0.5)', 1, 'rgba(255,150,120,0)'), blend: 'screen' })
  let ripples = ''
  for (let i = 0; i < 30; i++) {
    const y = HZ + 3 + rs() * 28
    ripples += `M${f(rs() * 160)} ${f(y)}h${f(2 + rs() * 6)}`
  }
  p.push({ d: ripples, stroke: 'rgba(255,140,200,0.25)', sw: 0.35, blend: 'screen' })
  p.push({ d: `M0 ${HZ}H${W}`, stroke: 'rgba(255,200,220,0.7)', sw: 0.4, blend: 'screen' })

  // palms: rim copy shifted toward the sun, silhouette on top
  // frond: arched blade, narrow on top, leaflets hanging from the underside
  const leaf = (x0: number, y0: number, x1: number, y1: number, bend: number, ox: number, oy: number) => {
    const mx = (x0 + x1) / 2 + bend
    const my = (y0 + y1) / 2 - Math.abs(bend) * 0.6 - 3
    const N = 34
    const up: number[] = []
    const low: number[] = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1
      const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1
      const tx = 2 * (1 - t) * (mx - x0) + 2 * t * (x1 - mx)
      const ty = 2 * (1 - t) * (my - y0) + 2 * t * (y1 - my)
      const len = Math.hypot(tx, ty) || 1
      const ux = tx / len
      const uy = ty / len
      let nx = -uy
      let ny = ux
      if (ny < 0) {
        nx = -nx
        ny = -ny
      }
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04)), 0.7)
      const w = 6.5 * env
      up.push(px - nx * w * 0.3 + ox, py - ny * w * 0.3 + oy)
      const k = i % 2 ? 1 : 0.25
      low.unshift(px + (nx * 0.85 + ux * 0.45) * w * k + ox, py + (ny * 0.85 + uy * 0.45) * w * k + w * k * 0.35 + oy)
    }
    return poly([...up, ...low])
  }
  const palm = (bx: number, byy: number, tx: number, ty: number, fronds: [number, number, number][], rimX: number) => {
    const trunk = (ox: number, oy: number) => {
      const N = 20
      const l: number[] = []
      const rgt: number[] = []
      const cxp = (bx + tx) / 2 + (tx - bx) * 0.6
      for (let i = 0; i <= N; i++) {
        const t = i / N
        const x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cxp + t * t * tx
        const y = (1 - t) * (1 - t) * byy + 2 * (1 - t) * t * ((byy + ty) / 2) + t * t * ty
        const w = 2.2 - t * 0.9
        l.push(x - w + ox, y + oy)
        rgt.unshift(x + w + ox, y + oy)
      }
      return poly([...l, ...rgt])
    }
    const crown = (ox: number, oy: number) => fronds.map(([ex, ey, bend]) => leaf(tx, ty, ex, ey, bend, ox, oy)).join('')
    p.push({ d: trunk(rimX, -0.3), fill: '#ff7aa8' })
    p.push({ d: crown(rimX * 0.8, -0.5), fill: '#ff6f9f' })
    p.push({ d: trunk(0, 0), fill: lin(bx - 3, 0, bx + 3, 0, 0, '#1a0628', 1, '#12041d') })
    let rings = ''
    for (let i = 1; i < 16; i++) {
      const t = i / 16
      const cxp = (bx + tx) / 2 + (tx - bx) * 0.6
      const x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cxp + t * t * tx
      const y = (1 - t) * (1 - t) * byy + 2 * (1 - t) * t * ((byy + ty) / 2) + t * t * ty
      rings += `M${f(x - 2)} ${f(y)}q2 1 4 0`
    }
    p.push({ d: rings, stroke: 'rgba(255,120,170,0.25)', sw: 0.4 })
    p.push({ d: crown(0, 0), fill: '#13041e' })
    p.push({ d: circ(tx - 1.5, ty + 2, 1.6) + circ(tx + 1.2, ty + 2.6, 1.5), fill: radLit(tx, ty + 2, 3, 0, '#5a2040', 1, '#14041c') })
  }
  palm(6, 104, 20, 16, [[-14, 30, -6], [-6, 4, 6], [10, -8, -4], [36, 2, 8], [44, 26, -6], [30, 42, 6], [2, 44, -6]], 0.9)
  palm(158, 104, 146, 10, [[112, 22, -8], [120, 46, 6], [136, -10, -5], [170, 0, 6], [178, 30, -6], [160, 40, 6], [124, 2, 6]], -0.9)
  p.push(vignette(0.45))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Flux: glossy liquid blobs with core shadow, rim, reflections, cast shadows ----
export function liquidBlobs(): Art {
  const p: VectorPath[] = []
  p.push(glow(40, 20, 80, '#6a3cff', 0.35), glow(130, 90, 70, '#ff9a3a', 0.22), glow(150, 10, 40, '#2fd3c0', 0.2))
  // abstract studio floor curve
  p.push({ d: `M-4 74 Q80 66 164 74 V105 H-4 Z`, fill: lin(0, 66, 0, 101, 0, 'rgba(255,255,255,0.06)', 1, 'rgba(0,0,0,0.3)') })
  p.push({ d: `M-4 74 Q80 66 164 74`, stroke: 'rgba(200,190,255,0.18)', sw: 0.5, blend: 'screen' })
  type B = [number, number, number, number, number, string, string, string, string]
  const blobs: B[] = [
    [128, 22, 13, 2, 0.8, '#b8fff4', '#2fd3c0', '#0a5c56', '#ff7ad9'],
    [88, 20, 4.5, 1, 2, '#fff1c4', '#e2a93a', '#7a4a08', '#7c5cff'],
    [48, 38, 29, 3, 0, '#d6ccff', '#7c5cff', '#2a1290', '#ffb35c'],
    [150, 88, 6, 1, 3.4, '#e6dcff', '#9a7cff', '#3a2290', '#2fd3c0'],
    [112, 66, 31, 4, 1.3, '#fff0bf', '#e2a93a', '#6a3e06', '#ff6fb5'],
    [72, 84, 12, 2, 2.6, '#ffd2ea', '#ff6fb5', '#8a1652', '#7c5cff'],
    [18, 82, 6.5, 1, 4.1, '#ffffff', '#b9c0d8', '#4a5070', '#ff6fb5'],
  ]
  // chrome torus orbiting the violet blob (back half drawn first, front half after)
  const tor = { cx: 48, cy: 40, rx: 42, ry: 9, deg: -14 }
  const half = (front: boolean) => {
    const a = (tor.deg * Math.PI) / 180
    const c = Math.cos(a)
    const s = Math.sin(a)
    const y0 = front ? 0 : -tor.ry - 6
    const y1 = front ? tor.ry + 6 : 0
    return poly([[-tor.rx - 6, y0], [tor.rx + 6, y0], [tor.rx + 6, y1], [-tor.rx - 6, y1]].flatMap(([x, y]) => [tor.cx + x * c - y * s, tor.cy + x * s + y * c]))
  }
  const torus = (front: boolean): VectorPath[] => {
    const d = rotEll(tor.cx, tor.cy, tor.rx, tor.ry, tor.deg)
    const clip = half(front)
    return [
      { d: rotEll(tor.cx + 4, tor.cy + 8, tor.rx, tor.ry, tor.deg), stroke: 'rgba(5,0,20,0.25)', sw: 5, blend: 'multiply', clip },
      { d, stroke: '#3a3f5c', sw: 4.6, clip },
      { d, stroke: lin(0, tor.cy - tor.ry - 6, 0, tor.cy + tor.ry + 6, 0, '#ffffff', 0.3, '#c9d2ff', 0.5, '#4a4f72', 0.7, '#ffb35c', 1, '#ffffff'), sw: 3.4, clip },
      { d, stroke: 'rgba(255,255,255,0.85)', sw: 0.5, clip },
    ]
  }
  blobs.forEach(([x, y, r, amp, ph, a, b, c, rim], i) => {
    if (i === 2) p.push(...torus(false))
    const shape = (ox: number, oy: number, k = 1) => blob(x + ox, y + oy, r * k, Math.min(amp, r * 0.08) * k, 2 + (i % 2), ph)
    const d = shape(0, 0)
    // soft cast shadow on the wall/floor behind (down-right)
    for (let k = 0; k < 4; k++) p.push({ d: shape(r * 0.22 + k * 0.6, r * 0.32 + k * 0.8, 1 + k * 0.05), fill: 'rgba(5,0,20,0.12)', blend: 'multiply' })
    // coloured caustic glow transmitted through the blob
    p.push({ d: shape(r * 0.3, r * 0.45, 1.1), fill: rad(x + r * 0.3, y + r * 0.45, r * 1.1, 0, rgba(b, 0.3), 1, rgba(b, 0)), blend: 'screen' })
    // body
    p.push({ d, fill: radLit(x, y, r * 1.15, 0, a, 0.5, b, 1, c) })
    // environment: darker lower hemisphere reflecting the floor, bright horizon line
    p.push({ d: rect(x - r * 1.3, y + r * 0.05, r * 2.6, r * 1.3), fill: lin(0, y + r * 0.05, 0, y + r, 0, rgba(c, 0), 0.25, rgba(c, 0.4), 1, rgba(c, 0.15)), blend: 'multiply', clip: d })
    p.push({ d: `M${f(x - r * 1.2)} ${f(y + r * 0.1)}Q${f(x)} ${f(y + r * 0.22)} ${f(x + r * 1.2)} ${f(y + r * 0.1)}`, stroke: 'rgba(255,255,255,0.07)', sw: Math.max(0.4, r * 0.12), blend: 'screen', clip: d })
    // core shadow (terminator)
    p.push({ d, fill: rad(x - r * 0.4, y - r * 0.45, r * 1.75, 0.5, 'rgba(10,0,30,0)', 1, 'rgba(10,0,30,0.6)'), blend: 'multiply' })
    // rim / bounce light on the far side
    p.push({ d: d + shape(-r * 0.05, -r * 0.06), rule: 'evenodd', fill: lin(x - r, y - r, x + r, y + r, 0, rgba(rim, 0), 0.65, rgba(rim, 0.12), 1, rgba(rim, 0.45)), blend: 'screen', clip: d })
    // speculars: broad soft window + sharp hot spot
    p.push({ d: ell(x - r * 0.36, y - r * 0.48, r * 0.42, r * 0.2), fill: rad(x - r * 0.36, y - r * 0.48, r * 0.42, 0, 'rgba(255,255,255,0.65)', 1, 'rgba(255,255,255,0)'), blend: 'screen' })
    p.push({ d: ell(x - r * 0.42, y - r * 0.5, r * 0.13, r * 0.07), fill: 'rgba(255,255,255,0.95)' })
    p.push({ d: circ(x + r * 0.5, y + r * 0.55, r * 0.05), fill: 'rgba(255,255,255,0.6)' })
    // thin-film iridescence
    p.push({ d, fill: lin(x - r, y - r, x + r, y + r, 0, 'rgba(255,120,220,0.35)', 0.5, 'rgba(120,255,240,0.25)', 1, 'rgba(255,220,120,0.35)'), blend: 'overlay' })
    if (i === 2) p.push(...torus(true))
  })
  p.push(vignette(0.5))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Wave: backlit curling barrel, translucent lip, dark receding tube, crashing foam --
export function waveBands(): Art {
  const p: VectorPath[] = []
  const sx = 146
  const sy = 33
  // sky: low sun behind the wave on the right
  p.push({ d: rect(0, 0, W, H), fill: lin(0, 0, 0, 64, 0, '#4f93b4', 0.5, '#a9d0d4', 0.85, '#f6d6a2', 1, '#ffc98a') })
  p.push(glow(sx, sy, 90, '#ffc070', 0.65), glow(sx, sy, 24, '#fff0c8', 0.95))
  p.push({ d: circ(sx, sy, 5), fill: '#fffaf0' })
  // distant swells on the horizon
  p.push({ d: rect(0, 62, W, 40), fill: lin(0, 62, 0, 80, 0, '#6fb6c4', 1, '#1f6f88') })
  p.push({ d: `M0 62H${W}`, stroke: 'rgba(255,240,210,0.8)', sw: 0.4, blend: 'screen' })
  const r = rng(91)
  let glit = ''
  for (let i = 0; i < 40; i++) {
    const y = 62.5 + Math.pow(r(), 1.4) * 10
    glit += `M${f(sx + (r() - 0.5) * (4 + (y - 62) * 3))} ${f(y)}h${f(0.6 + r() * 2)}`
  }
  p.push({ d: glit, stroke: 'rgba(255,245,215,0.9)', sw: 0.4, blend: 'lighter' })

  // geometry
  const back = [172, 70, 156, 60, 138, 46, 120, 30, 104, 17, 90, 9]
  const lipOuter = [90, 9, 74, 4, 56, 4, 41, 10, 30, 21, 23, 35, 21, 49, 25, 60]
  const lipInner = [25, 60, 29, 50, 31, 39, 37, 29, 47, 22, 60, 19, 73, 20]
  const face = [73, 20, 81, 29, 84, 42, 80, 56, 70, 68, 54, 78, 34, 85, 12, 90, -8, 93]
  const bodyD = smooth([172, 108, ...back, ...lipOuter.slice(2), ...lipInner.slice(2), ...face.slice(2), -8, 108], false) + 'Z'
  const lipD = smooth([...lipOuter, ...lipInner.slice(2).slice(0, -2), ...lipInner.slice(-2)], false) + 'Z'
  const tubeD = smooth([...lipInner, ...face.slice(2, 14), 26, 82, 19, 72], true)

  // tube: dark, receding toward a vanishing point deep inside
  const vx = 62
  const vy = 44
  p.push({ d: tubeD, fill: rad(vx, vy, 34, 0, '#010b10', 0.35, '#03222c', 0.7, '#0a4a5a', 1, '#1c8090') })
  // far wall of the tube curving away: a soft crescent of transmitted light
  p.push({ d: tubeD, fill: rad(vx + 10, vy - 2, 26, 0.55, 'rgba(90,220,210,0)', 0.85, 'rgba(90,220,210,0.22)', 1, 'rgba(90,220,210,0)'), blend: 'screen' })
  p.push({ d: tubeD, fill: rad(vx - 2, vy + 2, 12, 0, 'rgba(0,5,10,0.5)', 1, 'rgba(0,5,10,0)'), blend: 'multiply' })
  // the curling wall of water at the back of the tube catches a rim of light
  p.push({ d: smooth(face.slice(0, 12)), stroke: 'rgba(160,255,230,0.5)', sw: 1.4, blend: 'screen', clip: tubeD })
  // light spilling into the mouth of the tube from the open side
  p.push({ d: tubeD, fill: lin(18, 0, 50, 0, 0, 'rgba(150,240,230,0.45)', 1, 'rgba(150,240,230,0)'), blend: 'screen' })

  // wave body
  p.push({ d: bodyD, fill: lin(0, 4, 0, 101, 0, '#5fe6d2', 0.25, '#1fa6b8', 0.6, '#0b5f82', 1, '#032c44') })
  // light passing through the thin upper water, strongest toward the sun
  p.push({ d: bodyD, fill: rad(104, 24, 50, 0, 'rgba(170,255,210,0.75)', 0.5, 'rgba(120,240,200,0.3)', 1, 'rgba(120,240,200,0)'), blend: 'screen' })
  // the face beside the tube is in its own shadow
  p.push({ d: bodyD, fill: rad(84, 56, 34, 0, 'rgba(0,25,45,0.55)', 1, 'rgba(0,25,45,0)'), blend: 'multiply' })
  // face texture: streaks that curve into the tube
  let streaks = ''
  for (let k = 0; k < 12; k++) {
    const o = 3 + k * 5.5
    const d = smooth([84 + o * 0.8, 24 + o * 0.15, 90 + o * 0.6, 42 + o * 0.2, 86 + o * 0.5, 60 + o * 0.2, 74 + o * 0.6, 76 + o * 0.1, 50 + o, 90 + o * 0.05])
    if (k % 2) streaks += d
  }
  p.push({ d: streaks, stroke: 'rgba(200,255,245,0.22)', sw: 0.5, blend: 'screen', clip: bodyD })
  // backlight bleeding over the crest, hot sun core
  p.push(glow(sx, sy, 46, '#ffe0a0', 0.6), glow(sx, sy, 14, '#fff6e0', 0.9, 'lighter'))
  p.push({ d: circ(sx, sy, 4.2), fill: '#ffffff' })
  // sunlit back slope rim
  p.push({ d: smooth(back), stroke: 'rgba(255,236,190,0.75)', sw: 0.7, blend: 'screen' })

  // translucent lip: bright aqua/green where the backlight passes through
  p.push({ d: lipD, fill: lin(30, 6, 34, 50, 0, '#d8fff0', 0.35, '#6ff5d6', 0.75, '#22c2c0', 1, '#0d8a9c') })
  p.push({ d: lipD, fill: rad(66, 8, 34, 0, 'rgba(230,255,200,0.8)', 1, 'rgba(160,255,220,0)'), blend: 'screen' })
  p.push({ d: smooth(lipInner), stroke: 'rgba(0,40,60,0.55)', sw: 1.2, blend: 'multiply' })
  let lipFlow = ''
  for (let k = 0; k < 6; k++) lipFlow += smooth(tf(lipOuter, (x, y) => [x + 1.2 + k * 0.7, y + 1.4 + k * 0.9]).slice(0, 14))
  p.push({ d: lipFlow, stroke: 'rgba(255,255,255,0.3)', sw: 0.35, blend: 'screen', clip: lipD })

  // falling curtain from the lip tip, see-through
  p.push({ d: smooth([25, 59, 23, 66, 20, 76, 17, 86, 30, 87, 29, 76, 28, 66], true), fill: lin(18, 60, 30, 88, 0, 'rgba(190,255,245,0.55)', 1, 'rgba(255,255,255,0.75)'), blend: 'screen' })
  let fall = ''
  for (let k = 0; k < 6; k++) fall += smooth([25 + k * 0.5, 60, 23 + k * 0.8, 70, 19 + k * 1.6, 82])
  p.push({ d: fall, stroke: 'rgba(255,255,255,0.45)', sw: 0.3 })

  // foam riding the crest and spilling over the lip
  const foamPath = (ox: number, oy: number) => {
    const rr = rng(5)
    let d = taper(tf([140, 50, 124, 34, 108, 20, 92, 9, 74, 3.2, 56, 3.2, 41, 9, 30, 20, 23.5, 34, 21.5, 46], (x, y) => [x + ox, y + oy]), 0.8, 2.6)
    const pts = sampleCR([140, 50, 124, 34, 108, 20, 92, 9, 74, 3.2, 56, 3.2, 41, 9, 30, 20, 23.5, 34, 21.5, 46], 4)
    pts.forEach(([x, y], i) => {
      const t = i / pts.length
      if (rr() < 0.8) d += circ(x + ox + (rr() - 0.5) * 2, y + oy - 0.5 + rr() * 1.5, 0.6 + rr() * 1.8 * t)
    })
    return d
  }
  p.push({ d: foamPath(0.8, 1.2), fill: 'rgba(20,100,120,0.45)' })
  p.push({ d: foamPath(0, 0), fill: lin(30, 0, 140, 40, 0, '#ffffff', 0.6, '#f2fbfb', 1, '#fff4dc') })
  p.push({ d: foamPath(0, 0), fill: rad(sx, sy, 80, 0, 'rgba(255,220,160,0.5)', 1, 'rgba(255,220,160,0)'), blend: 'multiply' })

  // backlit spray mist blowing off the crest toward the sun
  const rs = rng(23)
  for (let i = 0; i < 9; i++) {
    const x = 60 + rs() * 70
    const y = 2 + rs() * 10 + (x - 60) * 0.18
    const rr = 4 + rs() * 7
    p.push({ d: circ(x, y, rr), fill: rad(x, y, rr, 0, 'rgba(255,248,230,0.4)', 1, 'rgba(255,248,230,0)'), blend: 'screen' })
  }
  let mist = ''
  for (let i = 0; i < 90; i++) {
    const x = 40 + rs() * 100
    const y = -2 + rs() * 16 + (x - 40) * 0.15
    mist += circ(x, y, 0.12 + rs() * 0.4)
  }
  p.push({ d: mist, fill: 'rgba(255,250,235,0.85)', blend: 'lighter' })

  // white water exploding where the lip lands: clumped, irregular foam
  const rw = rng(44)
  const boil: [number, number, number][] = []
  for (let i = 0; i < 120; i++) {
    const x = -8 + rw() * 66
    const lift = Math.max(0, 1 - Math.abs(x - 22) / 30)
    const y = 104 - rw() * (14 + lift * 18)
    boil.push([x, y, 0.8 + rw() * (1.2 + lift * 2.6)])
  }
  boil.sort((a, b) => a[1] - b[1])
  const shadowD = boil.map(([x, y, rr]) => circ(x + 0.7, y + 1, rr)).join('')
  const foamD = boil.map(([x, y, rr]) => circ(x, y, rr)).join('')
  p.push({ d: shadowD, fill: 'rgba(20,90,110,0.35)' })
  p.push({ d: foamD, fill: lin(0, 70, 0, 104, 0, '#ffffff', 0.6, '#e6f6f8', 1, '#9fcfd8') })
  p.push({ d: foamD, fill: rad(48, 72, 50, 0, 'rgba(255,230,190,0.5)', 1, 'rgba(255,230,190,0)'), blend: 'multiply' })
  let foamHi = ''
  for (const [x, y, rr] of boil) if (rr > 2) foamHi += circ(x + rr * 0.3, y - rr * 0.35, rr * 0.35)
  p.push({ d: foamHi, fill: 'rgba(255,255,255,0.55)' })
  let plume = ''
  for (let i = 0; i < 70; i++) {
    const x = 6 + rw() * 40
    const y = 58 + rw() * 26
    plume += circ(x, y, 0.15 + rw() * 0.6)
  }
  p.push({ d: plume, fill: 'rgba(255,255,255,0.85)' })
  p.push({ d: circ(24, 80, 22), fill: rad(24, 80, 22, 0, 'rgba(255,255,255,0.45)', 1, 'rgba(255,255,255,0)'), blend: 'screen' })
  // foam lace across the foreground
  let lace = ''
  for (let i = 0; i < 4; i++) {
    const y = 92 + i * 2.6
    lace += smooth([56 + i * 4, y, 84 + i * 3, y - 1.2, 114, y + 0.6, 140 - i * 2, y - 0.8, 168, y])
  }
  p.push({ d: lace, stroke: 'rgba(220,250,255,0.22)', sw: 0.45, blend: 'screen' })
  p.push(vignette(0.35, 0.5, '0,30,50'))
  return { viewW: W, viewH: H, paths: p }
}

// Procedural marble: cloudy base plus branching veins.
export function marble(dark: boolean): Art {
  const r = rng(dark ? 61 : 29)
  const paths: VectorPath[] = []
  for (let i = 0; i < 9; i++) {
    paths.push({ d: blob(r() * 160, r() * 101, 18 + r() * 26, 4, 3, r() * 6), fill: dark ? 'rgba(255,255,255,0.025)' : 'rgba(120,120,130,0.05)' })
  }
  const vein = (x: number, y: number, a: number, steps: number): string => {
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`
    for (let k = 0; k < steps; k++) {
      a += (r() - 0.5) * 0.7
      x += Math.cos(a) * (4 + r() * 4)
      y += Math.sin(a) * (4 + r() * 4)
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`
    }
    return d
  }
  let main = ''
  let fine = ''
  for (let i = 0; i < 4; i++) {
    const sx = -5 + r() * 40
    const sy = r() * 101
    main += vein(sx, sy, -0.25 + r() * 0.5, 26)
    for (let j = 0; j < 3; j++) fine += vein(sx + r() * 100, r() * 101, r() * 6.28, 8)
  }
  const veinColor = dark ? 'rgba(255,255,255,0.5)' : 'rgba(90,90,100,0.45)'
  paths.push({ d: main, stroke: dark ? 'rgba(255,255,255,0.045)' : 'rgba(80,80,90,0.05)', sw: 2.2 })
  paths.push({ d: main, stroke: veinColor, sw: 0.4 })
  paths.push({ d: fine, stroke: veinColor, sw: 0.3, alpha: 0.7 })
  let gold = ''
  for (let i = 0; i < 2; i++) gold += vein(r() * 60, r() * 101, -0.2 + r() * 0.4, 22)
  paths.push({ d: gold, stroke: '#e2b85a', sw: 0.7, alpha: 0.9 })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Forêt: golden-hour fir forest, low sun, god rays, glowing mist, gold rim light --
export function pineForest(): Art {
  const p: VectorPath[] = []
  const sx = 112
  const sy = 44
  p.push({ d: rect(0, 0, W, H), fill: lin(0, 0, 0, H, 0, '#4a5f86', 0.3, '#b98a86', 0.52, '#f2b36e', 0.7, '#ffd58a', 1, '#f0a85e') })
  p.push(glow(sx, sy, 110, '#ffb35a', 0.55), glow(sx, sy, 40, '#ffe2a0', 0.75), glow(sx, sy, 12, '#fffbe8', 1))
  p.push({ d: circ(sx, sy, 5.5), fill: '#fffdf2' })
  // tiered fir silhouette
  const fir = (x: number, base: number, h: number, w: number, ox = 0, oy = 0) => {
    const tiers = 5
    const right: number[] = []
    for (let j = 0; j < tiers; j++) {
      const t1 = (j + 1) / tiers
      right.push(x + w * (0.25 + 0.75 * t1) * 0.5 + ox, base - h + h * t1 * 0.92 + oy)
      right.push(x + w * (0.12 + 0.75 * t1) * 0.25 + ox, base - h + h * (t1 * 0.92 - 0.04) + oy)
    }
    const left: number[] = []
    for (let k = right.length - 2; k >= 0; k -= 2) left.push(2 * (x + ox) - right[k], right[k + 1])
    return poly([x + ox, base - h + oy, ...right, x + ox + w * 0.06, base + oy, x + ox - w * 0.06, base + oy, ...left])
  }
  // far (warm, hazy gold) to near (rich deep green / teal)
  const layers = [
    { base: 58, h: 10, w: 5, gap: 4.2, col: '#d9a46e', rim: 0.35, seed: 3 },
    { base: 66, h: 15, w: 7, gap: 5.5, col: '#a8855a', rim: 0.45, seed: 5 },
    { base: 76, h: 22, w: 10, gap: 7.5, col: '#4f7a52', rim: 0.6, seed: 8 },
    { base: 88, h: 30, w: 13, gap: 10, col: '#24574c', rim: 0.75, seed: 13 },
    { base: 100, h: 38, w: 16, gap: 13, col: '#0e3632', rim: 0.85, seed: 17 },
  ]
  layers.forEach((L, li) => {
    const r = rng(L.seed)
    const tops: [number, number, number, number][] = []
    for (let x = -4; x < 166; x += L.gap * (0.7 + r() * 0.6)) {
      const h = L.h * (0.7 + r() * 0.55)
      const b = L.base + Math.sin(x / 17 + li) * 2.5
      tops.push([x, b, h, L.w * (0.8 + r() * 0.4)])
    }
    const trees = (rim: number) => tops.map(([x, b, h, w]) => fir(x, b, h, w, x < sx ? rim : -rim, rim ? -0.25 : 0)).join('')
    let ground = `M-6 ${H + 2}`
    for (let x = -6; x <= 166; x += 8) ground += `L${x} ${f(L.base - 1 + Math.sin(x / 17 + li) * 2.5)}`
    ground += `L166 ${H + 2}Z`
    // gold rim on the sun-facing edge of every tree, brighter near the sun
    const rimD = trees(0.5 + li * 0.12)
    p.push({ d: rimD, fill: rad(sx, sy, 120, 0, rgba('#ffe6a0', L.rim), 0.6, rgba('#ffb85a', L.rim * 0.7), 1, rgba('#ff9a4a', L.rim * 0.35)) })
    const body = ground + trees(0)
    p.push({ d: body, fill: lin(0, L.base - L.h, 0, L.base + 6, 0, mix(L.col, '#ffcf8a', 0.12), 1, mix(L.col, '#000000', 0.15)) })
    // trunks and boughs catch some sun on the right of the sun / left of it
    p.push({ d: body, fill: rad(sx, sy, 90, 0, 'rgba(255,190,110,0.28)', 1, 'rgba(255,190,110,0)'), blend: 'screen' })
    // glowing mist where the light hits, cooler away from the sun
    p.push({ d: rect(0, L.base - 7, W, 18), fill: lin(0, L.base - 7, 0, L.base + 11, 0, 'rgba(255,214,150,0)', 0.55, 'rgba(255,214,150,0.5)', 1, 'rgba(255,214,150,0)'), blend: 'screen', clip: ell(sx, L.base, 100, 20) })
    p.push({ d: rect(0, L.base - 5, W, 14), fill: lin(0, L.base - 5, 0, L.base + 9, 0, 'rgba(230,220,210,0)', 0.6, `rgba(230,220,210,${0.18 - li * 0.02})`, 1, 'rgba(230,220,210,0)'), blend: 'screen' })
    if (li === 1) p.push(rays(sx, sy, 26, 190, Math.PI * 0.62, 2.6, '#ffe0a0', 0.42, 21))
    if (li === 3) p.push(rays(sx, sy, 18, 190, Math.PI * 0.6, 2.4, '#ffd890', 0.3, 33))
  })
  // low warm haze over the forest floor
  p.push({ d: rect(0, 82, W, 20), fill: lin(0, 82, 0, H, 0, 'rgba(255,200,130,0)', 1, 'rgba(255,200,130,0.22)'), blend: 'screen' })
  // floating motes in the light
  const rm = rng(71)
  let motes = ''
  for (let i = 0; i < 40; i++) {
    const a = Math.PI * 0.5 + (rm() - 0.5) * 2.2
    const d = 10 + rm() * 70
    motes += circ(sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.8, 0.15 + rm() * 0.35)
  }
  p.push({ d: motes, fill: 'rgba(255,240,200,0.8)', blend: 'lighter' })
  // foreground framing firs, rim-lit in gold on the sun side
  const big: [number, number, number, number, number][] = [
    [6, 106, 96, 30, 1],
    [24, 108, 62, 20, 1],
    [154, 106, 90, 28, -1],
    [140, 110, 52, 18, -1],
  ]
  for (const [x, b, h, w, side] of big) {
    p.push({ d: fir(x, b, h, w, side * 0.9, -0.4), fill: '#ffc874' })
    p.push({ d: fir(x, b, h, w), fill: lin(x - w / 2, 0, x + w / 2, 0, 0, '#051410', 1, '#0b2219') })
  }
  p.push(vignette(0.45, 0.5, '40,20,10'))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Coucher: sunset sea, lit cloud banks, hazy ranges, glitter path, rocks --------
export function sunsetSea(): Art {
  const p: VectorPath[] = []
  const HZ = 64
  const sx = 98
  const sy = 58
  p.push({ d: rect(0, 0, W, HZ + 1), fill: lin(0, 0, 0, HZ, 0, '#2c2560', 0.35, '#8a3f7a', 0.7, '#f07a6a', 1, '#ffd29a') })
  p.push(glow(sx, sy, 95, '#ff9a5a', 0.5), glow(sx, sy, 30, '#fff0c0', 0.8))
  // cloud banks, undersides lit by the low sun
  const bank = (x: number, y: number, w: number, h: number, seed: number, ox = 0, oy = 0) => {
    const r = rng(seed)
    let d = ''
    for (let i = 0; i < 9; i++) {
      const t = i / 8
      d += ell(x - w / 2 + t * w + ox, y - Math.sin(t * Math.PI) * h * (0.4 + r() * 0.5) + oy, w * (0.08 + r() * 0.08), h * (0.45 + r() * 0.35))
    }
    return d + ell(x + ox, y + oy, w * 0.52, h * 0.38)
  }
  const clouds: [number, number, number, number, number][] = [
    [36, 22, 56, 7, 2],
    [130, 14, 50, 6, 4],
    [70, 40, 70, 4.5, 6],
    [140, 46, 40, 3.5, 9],
  ]
  for (const [x, y, w, h, seed] of clouds) {
    p.push({ d: bank(x, y, w, h, seed, 0.6, 0.9), fill: '#ffd9a8', alpha: 0.9 })
    p.push({ d: bank(x, y, w, h, seed), fill: lin(0, y - h, 0, y + h * 0.4, 0, '#5a3a7a', 0.6, '#b4577e', 1, '#f2906e') })
  }
  p.push({ d: circ(sx, sy, 10), fill: lin(0, sy - 10, 0, sy + 10, 0, '#fffbe6', 1, '#ffc27a') })
  // hazy mountain ranges, warmer and lighter with distance
  const range = (seed: number, base: number, amp: number, col: string) => {
    const r = rng(seed)
    const pts: number[] = [-4, HZ + 1]
    for (let x = -4; x <= 164; x += 6) pts.push(x, base - amp * (0.3 + r() * 0.7) * (0.6 + 0.4 * Math.sin(x / 23 + seed)))
    pts.push(164, HZ + 1)
    p.push({ d: smooth(pts) + 'Z', fill: col })
  }
  range(3, 60, 10, '#c86a7a')
  range(7, 63, 9, '#8a3d68')
  // islands (left and right, leaving the sun free)
  p.push({ d: smooth([-4, HZ + 0.5, 6, 52, 18, 47, 30, 53, 44, 49, 58, 58, 70, HZ + 0.5]) + 'Z', fill: '#4a1f48' })
  p.push({ d: smooth([124, HZ + 0.5, 134, 54, 146, 50, 156, 55, 166, 52, 166, HZ + 0.5]) + 'Z', fill: '#42193f' })
  p.push({ d: smooth([18, 47.6, 30, 53.6, 44, 49.6]), stroke: 'rgba(255,170,120,0.5)', sw: 0.5, blend: 'screen' })
  // sea
  p.push({ d: rect(0, HZ, W, H - HZ), fill: lin(0, HZ, 0, H, 0, '#e8826e', 0.25, '#8a3e6e', 0.7, '#3e1a50', 1, '#1c0b2c') })
  p.push({ d: rect(sx - 30, HZ, 60, 18), fill: rad(sx, HZ, 30, 0, 'rgba(255,220,160,0.6)', 1, 'rgba(255,220,160,0)'), blend: 'screen' })
  const r = rng(51)
  let glit = ''
  let waves = ''
  for (let i = 0; i < 150; i++) {
    const t = Math.pow(r(), 1.4)
    const y = HZ + 0.8 + t * (H - HZ)
    const spread = 3 + t * 26
    const x = sx + (r() - 0.5) * spread * 2 * r()
    glit += `M${f(x)} ${f(y)}h${f(0.6 + r() * (1 + t * 4))}`
  }
  for (let i = 0; i < 40; i++) {
    const y = HZ + 2 + r() * 36
    waves += `M${f(r() * 160)} ${f(y)}q${f(2 + y * 0.03)} -0.6 ${f(4 + y * 0.06)} 0`
  }
  p.push({ d: waves, stroke: 'rgba(30,8,40,0.35)', sw: 0.45, blend: 'multiply' })
  p.push({ d: glit, stroke: 'rgba(255,232,170,0.85)', sw: 0.45, blend: 'lighter' })
  p.push({ d: `M0 ${HZ}H${W}`, stroke: 'rgba(255,230,190,0.6)', sw: 0.35, blend: 'screen' })
  // foreground rocks, rim-lit from the sun
  const rockT = (ox: number, oy: number) => {
    const pts = [-6, 104, -6, 84, 6, 78, 18, 80, 26, 86, 36, 88, 46, 96, 52, 104]
    return smooth(tf(pts, (x, y) => [x + ox, y + oy])) + 'Z'
  }
  p.push({ d: rockT(0.9, -0.7), fill: '#ffb07a' })
  p.push({ d: rockT(0, 0), fill: lin(0, 78, 30, 104, 0, '#3a1838', 1, '#12060f') })
  p.push({ d: rockT(0, 0), fill: lin(0, 78, 0, 104, 0, 'rgba(255,140,100,0.18)', 0.4, 'rgba(255,140,100,0)'), blend: 'screen' })
  const rock2 = smooth([128, 104, 136, 92, 146, 89, 156, 90, 166, 86, 166, 104]) + 'Z'
  const rock2r = smooth([127.2, 103.4, 135.2, 91.4, 145.2, 88.4, 155.2, 89.4, 165.2, 85.4, 165.2, 103.4]) + 'Z'
  p.push({ d: rock2r, fill: '#ffa070' }, { d: rock2, fill: '#1a0918' })
  // gulls
  const bird = (x: number, y: number, s: number) => `M${f(x - 4 * s)} ${f(y - 1.5 * s)}Q${f(x - 2 * s)} ${f(y - 3 * s)} ${f(x)} ${f(y)}Q${f(x + 2 * s)} ${f(y - 3 * s)} ${f(x + 4 * s)} ${f(y - 1.5 * s)}`
  p.push({ d: bird(52, 30, 1.1) + bird(63, 25, 0.8) + bird(42, 22, 0.7) + bird(72, 32, 0.55), stroke: '#3a1830', sw: 0.8 })
  p.push(vignette(0.4))
  return { viewW: W, viewH: H, paths: p }
}
