import type { Paint, VectorPath } from '../../types'
import { INK, lin, rad, rng, type Art } from './kit'
import { PORTRAIT_W, PORTRAIT_H } from './portrait-kit'

// Dragon and ghost-pirate portraits (140 × 200 bust, key light upper-left).
// Drawn "by hand": every contour is an authored bézier, wobbled slightly, inked
// with a filled variable-width stroke (heavy in shadow, broken in the light),
// shaded with hand-shaped cel shadows, hatching, painterly colour dabs and grain.

// ================================================================================
// Hand-drawing toolkit (local to this file)
// ================================================================================
type P = [number, number]
const L: P = [-0.6, -0.8] // direction toward the key light
const f1 = (v: number) => (Math.round(v * 10) / 10).toString()
const f2 = (v: number) => (Math.round(v * 100) / 100).toString()
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerpP = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const rgba = (c: string, a: number) => `rgba(${c},${a})`

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Parse an absolute M/L/C/Q/Z path into sampled polylines.
function sample(d: string, step = 0.8): { pts: P[]; closed: boolean }[] {
  const tok = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const out: { pts: P[]; closed: boolean }[] = []
  let cur: P[] = []
  let i = 0
  let cmd = 'M'
  let p: P = [0, 0]
  const num = () => Number(tok[i++])
  const push = (q: P) => {
    const last = cur[cur.length - 1]
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 1e-3) cur.push(q)
  }
  while (i < tok.length) {
    if (/[MLCQZ]/.test(tok[i])) cmd = tok[i++]
    if (cmd === 'Z') {
      if (cur.length) out.push({ pts: cur, closed: true })
      cur = []
      cmd = 'M'
      continue
    }
    if (cmd === 'M') {
      if (cur.length) out.push({ pts: cur, closed: false })
      p = [num(), num()]
      cur = [p]
      cmd = 'L'
    } else if (cmd === 'L') {
      const q: P = [num(), num()]
      const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / step))
      for (let k = 1; k <= n; k++) push(lerpP(p, q, k / n))
      p = q
    } else if (cmd === 'C') {
      const c1: P = [num(), num()]
      const c2: P = [num(), num()]
      const q: P = [num(), num()]
      const est = Math.hypot(c1[0] - p[0], c1[1] - p[1]) + Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) + Math.hypot(q[0] - c2[0], q[1] - c2[1])
      const n = Math.max(2, Math.ceil(est / step))
      for (let k = 1; k <= n; k++) {
        const t = k / n
        const u = 1 - t
        push([
          u * u * u * p[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * q[0],
          u * u * u * p[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * q[1],
        ])
      }
      p = q
    } else if (cmd === 'Q') {
      const c: P = [num(), num()]
      const q: P = [num(), num()]
      const est = Math.hypot(c[0] - p[0], c[1] - p[1]) + Math.hypot(q[0] - c[0], q[1] - c[1])
      const n = Math.max(2, Math.ceil(est / step))
      for (let k = 1; k <= n; k++) {
        const t = k / n
        const u = 1 - t
        push([u * u * p[0] + 2 * u * t * c[0] + t * t * q[0], u * u * p[1] + 2 * u * t * c[1] + t * t * q[1]])
      }
      p = q
    } else i++
  }
  if (cur.length) out.push({ pts: cur, closed: false })
  return out
}

function arcLen(pts: P[], closed: boolean): number[] {
  const s = [0]
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  if (closed && pts.length > 1) {
    const a = pts[pts.length - 1]
    const b = pts[0]
    s.push(s[s.length - 1] + Math.hypot(a[0] - b[0], a[1] - b[1]))
  }
  return s
}

// Unit left-normals of a polyline.
function normals(pts: P[], closed: boolean): P[] {
  const n = pts.length
  return pts.map((_, i) => {
    const a = pts[closed ? (i - 2 + n) % n : Math.max(0, i - 2)]
    const b = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)]
    const tx = b[0] - a[0]
    const ty = b[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    return [ty / l, -tx / l] as P
  })
}

const signedArea = (pts: P[]) => {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

// Smooth, deterministic "hand" noise along arc length.
function noiseFn(seed: number, period?: number) {
  const r = rng(seed)
  const fr = [0.23, 0.61, 1.7].map((f) => (period ? Math.max(1, Math.round((f * period) / (2 * Math.PI))) * ((2 * Math.PI) / period) : f))
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28]
  return (s: number) => 0.55 * Math.sin(s * fr[0] + ph[0]) + 0.35 * Math.sin(s * fr[1] + ph[1]) + 0.15 * Math.sin(s * fr[2] + ph[2])
}

// Ramer–Douglas–Peucker simplification (keeps the hand wobble, drops redundancy).
function rdp(pts: P[], tol: number): P[] {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = pts[a]
    const dx = pts[b][0] - ax
    const dy = pts[b][1] - ay
    const l = Math.hypot(dx, dy) || 1e-9
    let best = -1
    let bi = -1
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / l
      if (dist > best) {
        best = dist
        bi = i
      }
    }
    if (best > tol) {
      keep[bi] = 1
      stack.push([a, bi], [bi, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}
function polyD(pts: P[], closed = true, _fmt = f1, tol = 0.1): string {
  let q = pts
  if (pts.length > 6) {
    if (closed) {
      const h = pts.length >> 1
      q = rdp(pts.slice(0, h + 1), tol).concat(rdp(pts.slice(h), tol).slice(1))
    } else q = rdp(pts, tol)
  }
  let d = ''
  let px = ''
  let py = ''
  q.forEach((p, i) => {
    const x = f1(p[0])
    const y = f1(p[1])
    if (i && x === px && y === py) return
    d += (i ? 'L' : 'M') + x + ' ' + y
    px = x
    py = y
  })
  return closed ? d + 'Z' : d
}

// A hand-drawn part: the authored outline, wobbled and oriented clockwise.
interface Shape {
  pts: P[]
  d: string
  c: string // coarse copy of the outline, used as a clip (the ink hides the difference)
}
function shape(d: string, wob = 0.32): Shape {
  const sp = sample(d)[0]
  let pts = sp.pts
  if (signedArea(pts) < 0) pts = pts.slice().reverse()
  const s = arcLen(pts, true)
  const nz = noiseFn(hash(d), s[s.length - 1])
  const nm = normals(pts, true)
  pts = pts.map((p, i) => {
    const o = wob * nz(s[i])
    return [p[0] + nm[i][0] * o, p[1] + nm[i][1] * o] as P
  })
  return { pts, d: polyD(pts), c: polyD(pts, true, f1, 0.3) }
}

interface InkOpts {
  w?: number // max width
  min?: number // width factor on the lit side
  taper?: number // taper length (view units) at run ends
  out?: number // 1 / -1: which side of travel faces outward (light-dependent width), 0 = none
  gap?: number // break the line where light factor exceeds this (0..1)
  jit?: number // width jitter
  wob?: number // positional wobble for open lines
  t0?: number // start taper fraction override for open lines (pressure)
}

// Variable-width ink: centreline → filled polygon(s). Thick in shadow, thin and
// broken toward the light, tapered at run ends.
function inkPts(pts0: P[], closed: boolean, o: InkOpts = {}, seed = 1): string {
  if (pts0.length < 2) return ''
  const w = o.w ?? 1.6
  const min = o.min ?? 0.28
  const nz = noiseFn(seed + 7)
  let pts = pts0
  const s0 = arcLen(pts, closed)
  if (!closed && (o.wob ?? 0.25) > 0) {
    const nm0 = normals(pts, false)
    const wz = noiseFn(seed + 3)
    pts = pts.map((p, i) => [p[0] + nm0[i][0] * (o.wob ?? 0.25) * wz(s0[i]), p[1] + nm0[i][1] * (o.wob ?? 0.25) * wz(s0[i])] as P)
  }
  const nm = normals(pts, closed)
  const out = closed ? 1 : o.out ?? 0
  const n = pts.length
  const width: number[] = pts.map((_, i) => {
    let k = 1
    if (out) {
      const lit = out * (nm[i][0] * L[0] + nm[i][1] * L[1]) // 1 = faces the light
      const f = (1 - lit) / 2
      k = min + (1 - min) * Math.pow(f, 1.3)
      if (o.gap !== undefined && f < 1 - o.gap && nz(s0[i] * 1.6) > -0.15) k = 0
    }
    return w * k * (1 + (o.jit ?? 0.18) * nz(s0[i] * 2.3))
  })
  // split into runs of visible ink
  const idx: number[] = []
  let start = 0
  if (closed) {
    const z = width.findIndex((v) => v <= 0.02)
    start = z < 0 ? 0 : z
  }
  for (let k = 0; k < n; k++) idx.push(closed ? (start + k) % n : k)
  if (closed && width[start] > 0.02) idx.push(start) // full ring
  const runs: number[][] = []
  let run: number[] = []
  for (const i of idx) {
    if (width[i] > 0.02) run.push(i)
    else if (run.length) {
      runs.push(run)
      run = []
    }
  }
  if (run.length) runs.push(run)
  let d = ''
  const tl = o.taper ?? 2.2
  for (const r of runs) {
    if (r.length < 2) continue
    const rs = [0]
    for (let k = 1; k < r.length; k++) rs.push(rs[k - 1] + Math.hypot(pts[r[k]][0] - pts[r[k - 1]][0], pts[r[k]][1] - pts[r[k - 1]][1]))
    const len = rs[rs.length - 1]
    const ring = closed && r.length === n + 1
    const t = Math.min(tl, len / 3)
    const t0 = !closed && o.t0 !== undefined ? o.t0 * len : t
    const left: P[] = []
    const right: P[] = []
    r.forEach((i, k) => {
      const env = ring ? 1 : Math.min(1, smooth(0, t0, rs[k]) * 0.92 + 0.08, smooth(0, t, len - rs[k]) * 0.92 + 0.08)
      const h = (width[i] * env) / 2
      left.push([pts[i][0] + nm[i][0] * h, pts[i][1] + nm[i][1] * h])
      right.push([pts[i][0] - nm[i][0] * h, pts[i][1] - nm[i][1] * h])
    })
    if (ring) d += polyD(left) + polyD(right.reverse())
    else d += polyD(left.concat(right.reverse()))
  }
  return d
}

// Ink a path string (centreline) — open strokes or closed contours.
function inkD(d: string, o: InkOpts = {}): string {
  return sample(d)
    .map((sp, k) => inkPts(sp.pts, sp.closed, o, hash(d) + k))
    .join('')
}

// Contour of a Shape.
const outline = (s: Shape, o: InkOpts = {}) => inkPts(s.pts, true, o, hash(s.d))

// Position at arc fraction t along a polyline.
function at(pts: P[], s: number[], t: number): P {
  const target = clamp(t) * s[s.length - 1]
  let lo = 0
  let hi = s.length - 1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (s[m] < target) lo = m
    else hi = m
  }
  const seg = s[hi] - s[lo] || 1
  return lerpP(pts[lo], pts[Math.min(hi, pts.length - 1)], (target - s[lo]) / seg)
}

const curve = (d: string) => {
  const pts = sample(d, 0.5)[0].pts
  return { pts, s: arcLen(pts, false) }
}

// One tapered hatch stroke from a to b (pressure at the start, fading tip).
function hatchStroke(a: P, b: P, w: number, bend: number): string {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const nx = -dy / l
  const ny = dx / l
  // pressure near the start: the widest point sits a third of the way along
  const mx = a[0] + dx * 0.35 + nx * bend
  const my = a[1] + dy * 0.35 + ny * bend
  const h = w * 0.95
  return `M${f1(a[0])} ${f1(a[1])}Q${f1(mx + nx * h)} ${f1(my + ny * h)} ${f1(b[0])} ${f1(b[1])}Q${f1(mx - nx * h)} ${f1(my - ny * h)} ${f1(a[0])} ${f1(a[1])}Z`
}

interface HatchOpts {
  n: number
  w?: number
  from?: number
  to?: number
  len?: number // fraction of the way from A to B
  lenJit?: number
  bend?: number
  shift?: number // cross-hatch: end point slides along B by this fraction
  jit?: number
  seed?: number
}
// Hatching that follows the form: strokes start on curve A (shadow edge) and
// head toward curve B, so they wrap around the volume.
function hatch(A: string, B: string, o: HatchOpts): string {
  const a = curve(A)
  const b = curve(B)
  const r = rng(o.seed ?? hash(A + B))
  const from = o.from ?? 0
  const to = o.to ?? 1
  let d = ''
  for (let i = 0; i < o.n; i++) {
    const t = from + ((to - from) * (i + 0.5 + (o.jit ?? 0.5) * (r() - 0.5))) / o.n
    const pa = at(a.pts, a.s, t)
    const pb = at(b.pts, b.s, t + (o.shift ?? 0))
    const len = (o.len ?? 1) * (1 - (o.lenJit ?? 0.35) * r())
    d += hatchStroke(pa, lerpP(pa, pb, len), (o.w ?? 0.9) * (0.75 + 0.5 * r()), (o.bend ?? 0.6) * (r() - 0.3))
  }
  return d
}

// Scale rows on a patch spanned by curves A (u: 0..1) and B; v goes A → B.
interface ScaleOpts {
  rows: number
  per: number // scales per row at full width
  size?: number
  w?: number
  show?: (u: number, v: number) => number // probability a scale is drawn
  seed?: number
  u0?: number
  u1?: number
  flip?: boolean
}
function scales(A: string, B: string, o: ScaleOpts): string {
  const a = curve(A)
  const b = curve(B)
  const r = rng(o.seed ?? hash(A + B + 's'))
  const u0 = o.u0 ?? 0
  const u1 = o.u1 ?? 1
  let d = ''
  for (let j = 0; j < o.rows; j++) {
    const u = u0 + ((u1 - u0) * (j + 0.5)) / o.rows
    for (let k = 0; k < o.per; k++) {
      const v = (k + 0.5 + (j % 2 ? 0.5 : 0) + (r() - 0.5) * 0.25) / (o.per + 0.5)
      if (v <= 0.02 || v >= 0.98) continue
      if (r() > (o.show ? o.show(u, v) : 1)) continue
      const P0 = lerpP(at(a.pts, a.s, u), at(b.pts, b.s, u), v)
      const Pu = lerpP(at(a.pts, a.s, u + 0.01), at(b.pts, b.s, u + 0.01), v)
      const Pv = lerpP(at(a.pts, a.s, u), at(b.pts, b.s, u), v + 0.01)
      let ux = Pu[0] - P0[0]
      let uy = Pu[1] - P0[1]
      const ul = Math.hypot(ux, uy) || 1
      ux /= ul
      uy /= ul
      let vx = Pv[0] - P0[0]
      let vy = Pv[1] - P0[1]
      const vl = Math.hypot(vx, vy) || 1
      vx /= vl
      vy /= vl
      const width = vl * 100
      const fore = Math.pow(Math.sin(Math.PI * v), 0.7) // foreshortening toward the edges
      const sz = ((o.size ?? 1) * width) / (o.per + 0.5) * (0.85 + 0.3 * r())
      const hw = (sz * fore) / 2
      const dip = sz * 0.55 * (o.flip ? -1 : 1)
      // a "U" arc across v, dipping along u
      const p1: P = [P0[0] - vx * hw, P0[1] - vy * hw]
      const p2: P = [P0[0] + vx * hw, P0[1] + vy * hw]
      const c: P = [P0[0] + ux * dip * 2, P0[1] + uy * dip * 2]
      const h = (o.w ?? 0.6) * (0.6 + 0.4 * fore)
      d += `M${f1(p1[0])} ${f1(p1[1])}Q${f1(c[0] + ux * h)} ${f1(c[1] + uy * h)} ${f1(p2[0])} ${f1(p2[1])}Q${f1(c[0] - ux * h)} ${f1(c[1] - uy * h)} ${f1(p1[0])} ${f1(p1[1])}Z`
    }
  }
  return d
}

// Soft painterly colour dab: round touches with radial falloff; elongated dabs
// are laid down as a row of touches along the major axis.
function dab(cx: number, cy: number, rx: number, ry: number, rot: number, color: string, a: number, blend?: GlobalCompositeOperation, clip?: string): VectorPath[] {
  const major = Math.max(rx, ry)
  const minor = Math.min(rx, ry)
  const ang = rot + (ry > rx ? Math.PI / 2 : 0)
  const n = Math.max(1, Math.round((major / minor) * 1.5 - 0.5))
  const aa = n === 1 ? a : +(a * (1.6 / Math.sqrt(n + 1))).toFixed(3)
  const out: VectorPath[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * (major - minor)
    const x = cx + Math.cos(ang) * t
    const y = cy + Math.sin(ang) * t
    const R = f1(minor)
    out.push({
      d: `M${f1(x - minor)} ${f1(y)}a${R} ${R} 0 1 0 ${f1(2 * minor)} 0a${R} ${R} 0 1 0 ${f1(-2 * minor)} 0Z`,
      fill: { kind: 'radial', cx: x, cy: y, r: minor, stops: [[0, rgba(color, aa)], [0.5, rgba(color, +(aa * 0.55).toFixed(3))], [1, rgba(color, 0)]] },
      blend,
      clip,
    })
  }
  return out
}

// Paper / pigment grain: tiny specks and short strokes clipped to a region.
function grain(clip: string, box: [number, number, number, number], n: number, seed: number, dark = '60,30,10', light = '255,240,210'): VectorPath[] {
  const r = rng(seed)
  let dk = ''
  let lt = ''
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * (box[2] - box[0])
    const y = box[1] + r() * (box[3] - box[1])
    const a = r() * Math.PI
    const l = 0.2 + r() * 0.5
    const w = 0.12 + r() * 0.16
    const ex = Math.cos(a) * l
    const ey = Math.sin(a) * l
    const nx = -Math.sin(a) * w
    const ny = Math.cos(a) * w
    const sp = `M${f1(x - ex)} ${f1(y - ey)}L${f1(x + nx)} ${f1(y + ny)}L${f1(x + ex)} ${f1(y + ey)}Z`
    if (r() < 0.62) dk += sp
    else lt += sp
  }
  return [
    { d: dk, fill: rgba(dark, 0.16), clip, blend: 'multiply' },
    { d: lt, fill: rgba(light, 0.16), clip, blend: 'screen' },
  ]
}

// Shorthand builders
const fillP = (d: string, fill: Paint, extra: Partial<VectorPath> = {}): VectorPath => ({ d, fill, ...extra })
const inkP = (d: string, color: Paint = INK, alpha?: number): VectorPath => ({ d, fill: color, alpha })
const mult = (d: string, fill: Paint, clip: string, alpha?: number): VectorPath => ({ d, fill, clip, blend: 'multiply', alpha })

const centroid = (pts: P[]): P => {
  let x = 0
  let y = 0
  for (const q of pts) {
    x += q[0]
    y += q[1]
  }
  return [x / pts.length, y / pts.length]
}
function moved(s: Shape, dx: number, dy: number, k = 1): string {
  const c = centroid(s.pts)
  return polyD(s.pts.map((q) => [c[0] + (q[0] - c[0]) * k + dx, c[1] + (q[1] - c[1]) * k + dy] as P))
}

// Band hugging the contour on the side facing `dir` (rim light / reflected light).
function band(s: Shape, dir: P, w: number, pow = 1.6): string {
  const nm = normals(s.pts, true)
  const sl = arcLen(s.pts, true)
  const nz = noiseFn(hash(s.d) + 11)
  const n = s.pts.length
  const ww = s.pts.map((_, i) => w * Math.pow(clamp(nm[i][0] * dir[0] + nm[i][1] * dir[1]), pow) * (1 + 0.25 * nz(sl[i])))
  // only emit the stretches where the band has width: outer run + inner run reversed
  const z = ww.findIndex((v) => v < 0.03)
  if (z < 0) {
    const inner = s.pts.map((q, i) => [q[0] - nm[i][0] * ww[i], q[1] - nm[i][1] * ww[i]] as P)
    return s.d + polyD(inner.reverse())
  }
  let d = ''
  let run: number[] = []
  const flush = () => {
    if (run.length > 2) {
      const outer = run.map((i) => s.pts[i])
      const inner = run.map((i) => [s.pts[i][0] - nm[i][0] * ww[i], s.pts[i][1] - nm[i][1] * ww[i]] as P)
      d += polyD(outer.concat(inner.reverse()))
    }
    run = []
  }
  for (let k = 0; k <= n; k++) {
    const i = (z + k) % n
    if (ww[i] >= 0.03) run.push(i)
    else flush()
  }
  flush()
  return d
}

// ---- region hatching ------------------------------------------------------------
// Parameter intervals where the line o + h·t lies inside a closed polygon.
function lineIn(pts: P[], o: P, h: P): [number, number][] {
  const nx = -h[1]
  const ny = h[0]
  const ts: number[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const da = (a[0] - o[0]) * nx + (a[1] - o[1]) * ny
    const db = (b[0] - o[0]) * nx + (b[1] - o[1]) * ny
    if ((da <= 0 && db > 0) || (db <= 0 && da > 0)) {
      const u = da / (da - db)
      const x = a[0] + (b[0] - a[0]) * u
      const y = a[1] + (b[1] - a[1]) * u
      ts.push((x - o[0]) * h[0] + (y - o[1]) * h[1])
    }
  }
  ts.sort((x, y) => x - y)
  const out: [number, number][] = []
  for (let i = 0; i + 1 < ts.length; i += 2) out.push([ts[i], ts[i + 1]])
  return out
}
function minus(A: [number, number][], B: [number, number][]): [number, number][] {
  let cur = A
  for (const [b0, b1] of B) {
    const nxt: [number, number][] = []
    for (const [a0, a1] of cur) {
      if (b1 <= a0 || b0 >= a1) nxt.push([a0, a1])
      else {
        if (b0 > a0) nxt.push([a0, b0])
        if (b1 < a1) nxt.push([b1, a1])
      }
    }
    cur = nxt
  }
  return cur
}
function intersect(A: [number, number][], B: [number, number][]): [number, number][] {
  const out: [number, number][] = []
  for (const [a0, a1] of A) for (const [b0, b1] of B) if (Math.min(a1, b1) > Math.max(a0, b0)) out.push([Math.max(a0, b0), Math.min(a1, b1)])
  return out
}

interface RegionHatch {
  ang?: number // stroke direction (radians)
  gap?: number // spacing between strokes
  w?: number
  min?: number // shortest stroke kept
  seed?: number
  inset?: number // pull stroke ends in from the region boundary
}
// Parallel hand hatching filling (inside polys "in") minus (inside polys "out").
function hatchIn(inn: P[][], out: P[][], o: RegionHatch = {}): string {
  const r = rng(o.seed ?? 7)
  const ang = o.ang ?? -1.0
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const q of inn[0]) {
    x0 = Math.min(x0, q[0])
    y0 = Math.min(y0, q[1])
    x1 = Math.max(x1, q[0])
    y1 = Math.max(y1, q[1])
  }
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const D = Math.hypot(x1 - x0, y1 - y0) / 2 + 1
  const gap = o.gap ?? 1.25
  let d = ''
  for (let c = -D; c < D; c += gap * (0.8 + 0.4 * r())) {
    const a = ang + (r() - 0.5) * 0.1
    const h: P = [Math.cos(a), Math.sin(a)]
    const org: P = [cx - h[1] * c, cy + h[0] * c]
    let iv = lineIn(inn[0], org, h)
    for (let k = 1; k < inn.length; k++) iv = intersect(iv, lineIn(inn[k], org, h))
    for (const q of out) iv = minus(iv, lineIn(q, org, h))
    for (const [t0, t1] of iv) {
      const len = t1 - t0
      const ins = o.inset ?? 0.3
      if (len < (o.min ?? 1.2) + ins * 2) continue
      const s0 = t0 + ins + r() * len * 0.12
      const s1 = t1 - ins - r() * len * 0.25
      if (s1 - s0 < (o.min ?? 1.2)) continue
      d += sym([org[0] + h[0] * s0, org[1] + h[1] * s0], [org[0] + h[0] * (s0 + s1) / 2 + (r() - 0.5) * 0.3, org[1] + h[1] * (s0 + s1) / 2], [org[0] + h[0] * s1, org[1] + h[1] * s1], (o.w ?? 0.5) * (0.8 + 0.4 * r()))
    }
  }
  return d
}
const movedPts = (s: Shape, dx: number, dy: number, k = 1): P[] => {
  const c = centroid(s.pts)
  return s.pts.map((q) => [c[0] + (q[0] - c[0]) * k + dx, c[1] + (q[1] - c[1]) * k + dy] as P)
}

// Hand-built tapered tube (bones, spikes, claws): centreline + width profile.
function tube(d: string, w0: number, w1: number, bulge = 0): Shape {
  const pts = sample(d, 0.6)[0].pts
  const sl = arcLen(pts, false)
  const len = sl[sl.length - 1]
  const nm = normals(pts, false)
  const left: P[] = []
  const right: P[] = []
  pts.forEach((q, i) => {
    const t = sl[i] / len
    const w = (w0 + (w1 - w0) * t + bulge * Math.sin(Math.PI * t)) / 2
    left.push([q[0] + nm[i][0] * w, q[1] + nm[i][1] * w])
    right.push([q[0] - nm[i][0] * w, q[1] - nm[i][1] * w])
  })
  // rounded caps (half ellipses) at both ends
  const cap = (q: P, n: P, w: number, back: number): P[] => {
    const out: P[] = []
    for (let k = 1; k < 8; k++) {
      const a = (k / 8) * Math.PI
      const c = Math.cos(a)
      const sn = Math.sin(a)
      out.push([q[0] + n[0] * w * c - n[1] * back * sn * w * 0.8, q[1] + n[1] * w * c + n[0] * back * sn * w * 0.8])
    }
    return out
  }
  const e = pts.length - 1
  const endCap = cap(pts[e], nm[e], w1 / 2, 1)
  const startCap = cap(pts[0], [-nm[0][0], -nm[0][1]], w0 / 2, 1)
  const all = left.concat(endCap, right.reverse(), startCap)
  let cmd = ''
  all.forEach((q, i) => (cmd += (i ? 'L' : 'M') + f2(q[0]) + ' ' + f2(q[1])))
  return shape(cmd + 'Z', 0.12)
}

interface Look {
  fill: Paint
  sh?: string // core-shadow tint (multiply)
  shift?: P // crescent offset toward the light (bigger = more shadow)
  deep?: string // occlusion tint (second, thinner crescent)
  deepShift?: P
  rim?: string // "r,g,b" rim light
  rimW?: number
  rimA?: number
  bounce?: string // reflected light from below "r,g,b"
  hatch?: { step?: number; len?: number; w?: number; cross?: boolean; th?: number; ang?: number; a?: number; color?: string }
  ink?: InkOpts
  inkC?: string
  extra?: (s: Shape) => VectorPath[] // painted between shading and ink
  soft?: string // soft gradient shading colour toward the lower right
  hl?: string // "r,g,b" lit-edge highlight
  hlW?: number
  open?: [string, number][] // ink these open contours (centreline, outward side) instead of the closed outline
}
function draw(s: Shape, k: Look): VectorPath[] {
  const out: VectorPath[] = [fillP(s.d, k.fill)]
  if (k.soft) {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const q of s.pts) {
      x0 = Math.min(x0, q[0])
      y0 = Math.min(y0, q[1])
      x1 = Math.max(x1, q[0])
      y1 = Math.max(y1, q[1])
    }
    out.push({ d: s.d, fill: lin(x0, y0, x1, y1, 0, '#ffffff', 0.45, '#ffffff', 1, k.soft), blend: 'multiply' })
  }
  if (k.extra) out.push(...k.extra(s))
  if (k.hl) out.push({ d: band(s, [-0.6, -0.8], k.hlW ?? 2.2, 1.6), fill: rgba(k.hl, 0.55), blend: 'screen' })
  if (k.sh) {
    const [dx, dy] = k.shift ?? [-3, -3]
    out.push({ d: s.d + moved(s, dx, dy, 1.02), rule: 'evenodd', fill: k.sh, clip: s.c, blend: 'multiply' })
  }
  if (k.deep) {
    const [dx, dy] = k.deepShift ?? [-1.2, -1.4]
    out.push({ d: s.d + moved(s, dx, dy, 1.0), rule: 'evenodd', fill: k.deep, clip: s.c, blend: 'multiply' })
  }
  if (k.bounce) out.push({ d: band(s, [0.2, 1], 3.5, 2), fill: rgba(k.bounce, 0.45), blend: 'screen' })
  if (k.rim) {
    out.push({ d: band(s, [0.9, -0.25], (k.rimW ?? 2.6) * 2.2, 2.2), fill: rgba(k.rim, (k.rimA ?? 0.9) * 0.35), blend: 'screen' })
    out.push({ d: band(s, [0.9, -0.25], k.rimW ?? 2.6, 2.5), fill: rgba(k.rim, k.rimA ?? 0.9), blend: 'screen' })
  }
  if (k.hatch) {
    const [dx, dy] = k.shift ?? [-3, -3]
    const hs = hash(s.d)
    let d = hatchIn([s.pts], [movedPts(s, dx * 0.85, dy * 0.85, 1.02)], { ang: k.hatch.ang ?? -1.0, gap: k.hatch.step ?? 1.3, w: k.hatch.w, seed: hs })
    if (k.hatch.cross) d += hatchIn([s.pts], [movedPts(s, dx * 0.45, dy * 0.45, 1.01)], { ang: (k.hatch.ang ?? -1.0) + 1.2, gap: (k.hatch.step ?? 1.3) * 1.2, w: (k.hatch.w ?? 0.5) * 0.85, seed: hs + 1 })
    out.push({ d, fill: k.hatch.color ?? INK, alpha: k.hatch.a ?? 0.55 })
  }
  if (k.open) out.push(inkP(k.open.map(([d, side]) => inkD(d, { ...(k.ink ?? {}), out: side, t0: 0.05 })).join(''), k.inkC ?? INK))
  else out.push(inkP(outline(s, k.ink ?? {}), k.inkC ?? INK))
  return out
}

// Scale texture in two passes: dark scale edges where the form turns from the
// light, a few warm glints on scale tops in the light.
function scaleSet(A: string, B: string, o: ScaleOpts, clip: string, dark: string, light: string, shade: (u: number, v: number) => number): VectorPath[] {
  const dk = scales(A, B, { ...o, show: (u, v) => 0.08 + 0.95 * shade(u, v) })
  const lt = scales(A, B, { ...o, w: (o.w ?? 0.6) * 0.7, seed: (o.seed ?? 3) + 17, show: (u, v) => 0.5 * (1 - shade(u, v)) })
  return [
    { d: dk, fill: dark, alpha: 0.75, clip },
    { d: shiftD(lt, -0.3, -0.7), fill: light, alpha: 0.7, clip },
  ]
}


// Symmetric tapered stroke a → b bowing through m (thin–thick–thin).
function sym(a: P, m: P, b: P, w: number): string {
  // control point of the quadratic through m at t = .5, widened on both sides
  const cx = 2 * m[0] - (a[0] + b[0]) / 2
  const cy = 2 * m[1] - (a[1] + b[1]) / 2
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const nx = (-dy / l) * w
  const ny = (dx / l) * w
  return `M${f1(a[0])} ${f1(a[1])}Q${f1(cx + nx)} ${f1(cy + ny)} ${f1(b[0])} ${f1(b[1])}Q${f1(cx - nx)} ${f1(cy - ny)} ${f1(a[0])} ${f1(a[1])}Z`
}

// Cross lines around a tube (horn ridges, finger knuckles, belly plates).
function rings(d: string, w0: number, w1: number, ts: number[], bow = 0.35, lw = 0.6, span = 0.92): string {
  const c = curve(d)
  let out = ''
  for (const t of ts) {
    const q = at(c.pts, c.s, t)
    const q2 = at(c.pts, c.s, Math.min(1, t + 0.01))
    let tx = q2[0] - q[0]
    let ty = q2[1] - q[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l
    ty /= l
    const hw = ((w0 + (w1 - w0) * t) / 2) * span
    const a: P = [q[0] + ty * hw, q[1] - tx * hw]
    const b: P = [q[0] - ty * hw, q[1] + tx * hw]
    const m: P = [q[0] + tx * hw * bow * 2, q[1] + ty * hw * bow * 2]
    out += sym(a, m, b, lw)
  }
  return out
}

// Spikes / fins sprouting from a contour curve, sweeping along it.
function spikes(d: string, ts: number[], hs: number[], side: 1 | -1, sweep = 0.7, base = 0.06): string {
  const c = curve(d)
  let out = ''
  ts.forEach((t, i) => {
    const h = hs[i]
    const b1 = at(c.pts, c.s, t - base)
    const b2 = at(c.pts, c.s, t + base)
    const q = at(c.pts, c.s, t)
    const q2 = at(c.pts, c.s, Math.min(1, t + 0.01))
    let tx = q2[0] - q[0]
    let ty = q2[1] - q[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l
    ty /= l
    const nx = ty * side
    const ny = -tx * side
    const tip: P = [q[0] + nx * h + tx * h * sweep, q[1] + ny * h + ty * h * sweep]
    const c1: P = [b1[0] + nx * h * 0.55, b1[1] + ny * h * 0.55]
    const c2: P = [b2[0] + nx * h * 0.25 + tx * h * 0.2, b2[1] + ny * h * 0.25 + ty * h * 0.2]
    out += `M${f2(b1[0])} ${f2(b1[1])}Q${f2(c1[0])} ${f2(c1[1])} ${f2(tip[0])} ${f2(tip[1])}Q${f2(c2[0])} ${f2(c2[1])} ${f2(b2[0])} ${f2(b2[1])}Z`
  })
  return out
}

// Slide already-built paths (absolute coordinates only) — used to fit groups.
function shiftD(d: string, dx: number, dy: number): string {
  return d.replace(/([MLCQZa])([^MLCQZa]*)/g, (_m, c: string, args: string) => {
    if (c === 'a' || c === 'Z') return c + args
    let i = 0
    return c + args.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (v) => f1(Number(v) + (i++ % 2 === 0 ? dx : dy)))
  })
}
function offsetPaths(ps: VectorPath[], dx: number, dy: number): void {
  const mv = (d: string) => shiftD(d, dx, dy)
  const mp = (pt?: Paint): Paint | undefined => {
    if (!pt || typeof pt === 'string') return pt
    if (pt.kind === 'linear') return { ...pt, x0: pt.x0 + dx, y0: pt.y0 + dy, x1: pt.x1 + dx, y1: pt.y1 + dy }
    return { ...pt, cx: pt.cx + dx, cy: pt.cy + dy, fx: pt.fx === undefined ? undefined : pt.fx + dx, fy: pt.fy === undefined ? undefined : pt.fy + dy }
  }
  for (const q of ps) {
    q.d = mv(q.d)
    if (q.clip) q.clip = mv(q.clip)
    q.fill = mp(q.fill)
    q.stroke = mp(q.stroke)
  }
}

// A line running along a tube at a fraction f of its half-width (grooves, ridges).
function along(d: string, w0: number, w1: number, f: number, t0 = 0.05, t1 = 0.9): string {
  const c = curve(d)
  const n = normals(c.pts, false)
  const len = c.s[c.s.length - 1]
  const out: P[] = []
  c.pts.forEach((q, i) => {
    const t = c.s[i] / len
    if (t < t0 || t > t1) return
    const hw = ((w0 + (w1 - w0) * t) / 2) * f
    out.push([q[0] + n[i][0] * hw, q[1] + n[i][1] * hw])
  })
  return polyD(out, false)
}

// Uniformly scale finished paths about (ox, oy) — fits the figure inside the frame.
function scalePaths(ps: VectorPath[], k: number, ox: number, oy: number): void {
  const X = (v: number) => ox + (v - ox) * k
  const Y = (v: number) => oy + (v - oy) * k
  // one pass over the tokens: absolute pairs are mapped, relative arcs only scaled
  const tf = (d: string) => {
    let cmd = 'M'
    let i = 0
    return d.replace(/[MLCQZa]|-?\d*\.?\d+(?:e-?\d+)?/g, (t) => {
      const c = t.charCodeAt(0)
      if (c > 64) {
        cmd = t
        i = 0
        return t
      }
      const v = +t
      const j = i++
      if (cmd === 'a') {
        const m = j % 7
        return m === 2 || m === 3 || m === 4 ? t : f1(v * k)
      }
      return f1(j % 2 === 0 ? ox + (v - ox) * k : oy + (v - oy) * k)
    })
  }
  const tp = (pt?: Paint): Paint | undefined => {
    if (!pt || typeof pt === 'string') return pt
    if (pt.kind === 'linear') return { ...pt, x0: X(pt.x0), y0: Y(pt.y0), x1: X(pt.x1), y1: Y(pt.y1) }
    return { ...pt, cx: X(pt.cx), cy: Y(pt.cy), r: pt.r * k, fx: pt.fx === undefined ? undefined : X(pt.fx), fy: pt.fy === undefined ? undefined : Y(pt.fy) }
  }
  const cache = new Map<string, string>()
  const ctf = (d: string) => {
    let r = cache.get(d)
    if (r === undefined) {
      r = tf(d)
      cache.set(d, r)
    }
    return r
  }
  for (const q of ps) {
    q.d = ctf(q.d)
    if (q.clip) q.clip = ctf(q.clip)
    q.fill = tp(q.fill)
    q.stroke = tp(q.stroke)
    if (q.sw) q.sw *= k
  }
}

// ================================================================================
// Dragon: Aurum — proud golden dragon on its hoard, head turned 3/4 to the right
// ================================================================================
export function dragon(): Art {
  const p: VectorPath[] = []
  const RIM = '255,150,60'
  const LAVA = '255,120,40'
  const BR = '#6a2208' // brown "ink" for interior lines on gold
  const GOLD = lin(40, 20, 120, 170, 0, '#fff7d6', 0.25, '#fbd66e', 0.6, '#e8a436', 1, '#a85a1a')
  const GSH = 'rgba(150,48,52,0.82)'
  const GDEEP = 'rgba(64,12,34,0.68)'
  const MEMB = lin(-20, 10, 40, 160, 0, '#f6874a', 0.45, '#cf3c22', 1, '#6a1210')
  const MEMB2 = lin(110, 60, 150, 160, 0, '#d64c2c', 0.6, '#9a2016', 1, '#4e0c0a')
  const MSH = 'rgba(100,16,30,0.6)'
  const BONE = lin(0, 0, 60, 140, 0, '#ffe7a6', 1, '#d0922e')
  const HORN = lin(10, 0, 76, 44, 0, '#fffbf0', 0.45, '#efdfb4', 1, '#a68452')
  const hornPaint = (x0: number, y0: number, x1: number, y1: number) => lin(x0, y0, x1, y1, 0, '#e2cfa0', 0.28, '#fff9ea', 0.55, '#d8bc88', 0.74, '#8a6a40', 0.9, '#3e2a16', 1, '#22140a')
  const HSH = 'rgba(160,104,64,0.62)'
  const PLATE = lin(70, 90, 110, 190, 0, '#fff6d2', 0.5, '#f6dc96', 1, '#d29a48')
  const hatchG = { step: 1.2, w: 0.5, a: 0.78, color: '#3a0610' }
  const SHADE = (shift: number) => (u: number, v: number) => clamp(0.15 + v * shift + u * 0.25)
  const LOOK = { fill: GOLD, sh: GSH, deep: GDEEP, rim: RIM, bounce: LAVA, hatch: hatchG, soft: '#b04a40', hl: '255,250,225', ink: { w: 2.5, gap: 0.86 } }

  // ---- far wing (behind everything) -------------------------------------------
  const fwArm = 'M104 150 C110 134 118 118 127 104'
  const fwF = ['M127 104 C133 94 140 86 147 80', 'M127 104 C136 104 144 107 151 113', 'M127 104 C133 114 138 126 143 139']
  const fwMem = shape(
    'M104 150 C110 134 118 118 127 104 C133 94 140 86 147 80 C141 90 142 102 151 113 C143 118 140 128 143 139 C134 137 122 144 112 157 C108 156 105 154 104 150 Z',
  )
  p.push(
    ...draw(fwMem, {
      fill: MEMB2,
      sh: MSH,
      shift: [-5, -2],
      rim: RIM,
      rimW: 2,
      ink: { w: 1.9, gap: 0.8 },
      extra: (s) => [
        ...dab(140, 96, 5, 8, 0.3, '255,170,80', 0.5, 'screen', s.c),
        ...dab(136, 124, 5, 7, 0.3, '255,150,70', 0.45, 'screen', s.c),
        { d: inkD('M131 98 C136 96 140 94 143 90 M133 108 C137 110 141 112 145 112 M132 116 C134 122 136 128 138 132 M116 130 C120 136 122 140 124 144', { w: 0.4, wob: 0.4 }), fill: 'rgba(90,8,8,0.6)', clip: s.c },
      ],
    }),
  )
  for (const [d, w0, w1, bl] of [[fwF[0], 2.8, 0.7, 0], [fwF[1], 2.4, 0.7, 0], [fwF[2], 2.4, 0.7, 0], [fwArm, 5, 3.4, 1]] as [string, number, number, number][])
    p.push(...draw(tube(d, w0, w1, bl), { fill: BONE, sh: GSH, shift: [-1, -1], rim: RIM, rimW: 0.8, ink: { w: 1.1 } }))

  // ---- far horn ---------------------------------------------------------------
  const farHornC = 'M84 36 C80 27 74 20 67 15 C61 11 57 7 55 1'
  p.push(...draw(tube(farHornC, 9, 0.5), { fill: hornPaint(84, 36, 55, 1), sh: HSH, shift: [-2, -1], ink: { w: 1.4 } }))
  p.push(inkP(rings(farHornC, 9, 0.5, [0.12, 0.24, 0.36, 0.48, 0.6, 0.72], 0.3, 0.45), '#7a5a30', 0.8))
  p.push(inkP(inkD(along(farHornC, 9, 0.5, -0.4, 0.05, 0.8), { w: 0.4 }), '#8a6838', 0.6))

  // ---- near wing ----------------------------------------------------------------
  const nwArm = 'M38 146 C30 124 18 100 5 80'
  const nwF = ['M5 80 C6 60 8 38 12 16', 'M5 80 C-2 64 -8 50 -15 37', 'M5 80 C-6 84 -14 92 -21 104', 'M5 80 C-2 98 -6 114 -9 130']
  const nwMem = shape(
    'M38 146 C30 124 18 100 5 80 C6 60 8 38 12 16 C4 28 -4 34 -15 37 C-10 54 -12 80 -21 104 C-14 110 -10 118 -9 130 C4 138 22 150 38 160 Z',
  )
  p.push(
    ...draw(nwMem, {
      fill: MEMB,
      sh: MSH,
      shift: [-7, -3],
      ink: { w: 2.1, gap: 0.82 },
      extra: (s) => [
        ...dab(-2, 64, 14, 24, 0.2, '255,190,100', 0.5, 'screen', s.c),
        ...dab(-8, 112, 10, 12, 0.4, '255,140,60', 0.45, 'screen', s.c),
        ...dab(24, 130, 12, 18, 0.4, '120,10,30', 0.4, 'multiply', s.c),
        // lava light glowing through the thin membrane
        ...dab(2, 42, 6, 9, 0.5, '255,210,120', 0.55, 'screen', s.c),
        ...dab(-12, 72, 6, 14, 0.1, '255,190,100', 0.5, 'screen', s.c),
        ...dab(-12, 116, 6, 7, 0, '255,170,80', 0.5, 'screen', s.c),
        ...dab(10, 140, 10, 6, 0.4, '255,150,70', 0.4, 'screen', s.c),
        // veins branching off the finger bones
        { d: inkD('M9 52 C5 50 2 46 0 40 M7 64 C2 62 -4 58 -8 52 M-1 66 C-6 70 -10 74 -14 80 M-4 88 C-8 94 -12 98 -16 102 M2 104 C-2 110 -4 116 -6 122 M14 108 C10 118 8 126 6 134 M24 120 C20 128 18 136 16 142', { w: 0.42, wob: 0.5 }), fill: 'rgba(120,14,10,0.6)', clip: s.c },
        { d: inkD('M6 58 C2 56 -2 52 -4 48 M0 94 C-4 100 -8 104 -12 108', { w: 0.35, wob: 0.4 }), fill: 'rgba(255,200,120,0.6)', clip: s.c },
        // tension folds near the body
        { d: inkD('M30 140 C26 144 22 146 16 146 M33 147 C28 151 22 152 16 152 M26 132 C22 136 18 138 12 138', { w: 0.5 }), fill: '#4a0606', alpha: 0.6, clip: s.c },
        { d: hatch('M12 16 C4 28 -4 34 -15 37', 'M5 80 C5 70 4 60 3 50', { n: 9, w: 0.45, len: 0.35, bend: 1 }), fill: '#3a0606', alpha: 0.5, clip: s.c },
        { d: hatch('M-21 104 C-14 110 -10 118 -9 130', 'M5 80 C3 90 1 96 0 104', { n: 6, w: 0.45, len: 0.4, bend: 1 }), fill: '#3a0606', alpha: 0.5, clip: s.c },
      ],
    }),
  )
  for (const [d, w0, w1, bl] of [[nwF[0], 3.4, 0.9, 0], [nwF[1], 3, 0.9, 0], [nwF[2], 3, 0.9, 0], [nwF[3], 2.8, 0.9, 0], [nwArm, 6.6, 4.4, 1.4]] as [string, number, number, number][]) {
    p.push(...draw(tube(d, w0, w1, bl), { fill: BONE, sh: GSH, shift: [-1.2, -1.2], ink: { w: 1.3 } }))
  }
  p.push(inkP(rings(nwF[0], 3.4, 0.9, [0.3, 0.62]) + rings(nwF[1], 3, 0.9, [0.35, 0.66]) + rings(nwF[2], 3, 0.9, [0.4]) + rings(nwArm, 6.6, 4.4, [0.55], 0.25, 0.7), BR, 0.8))
  const thumb = tube('M5 81 C1 77 -3 75 -8 75', 3, 0.3)
  p.push(...draw(thumb, { fill: HORN, sh: HSH, shift: [-0.6, -0.8], ink: { w: 1 } }))

  // ---- ear fin + cheek spikes (behind the head) ---------------------------------
  const ear = shape('M62 46 C54 40 46 36 36 34 C40 38 42 42 42 45 C37 45 33 47 30 50 C38 52 44 54 50 58 C54 56 58 52 62 50 Z')
  p.push(...draw(ear, { fill: MEMB, sh: MSH, shift: [-2, -1.5], ink: { w: 1.3 }, extra: (s) => [{ d: inkD('M60 47 C52 42 44 38 37 35 M60 50 C52 49 42 49 32 50', { w: 0.55 }), fill: '#4a0a08', alpha: 0.8, clip: s.c }] }))
  for (const d of ['M58 60 C50 57 40 56 30 58', 'M58 70 C48 72 38 76 30 83', 'M60 80 C55 87 50 92 43 97'])
    p.push(...draw(tube(d, 6.5, 0.4), { fill: HORN, sh: HSH, shift: [-1, -1.2], ink: { w: 1.2 } }))

  // ---- body ---------------------------------------------------------------------
  const body = shape('M6 200 C4 182 8 164 20 152 C28 144 38 142 48 146 C64 152 84 152 100 148 C116 150 128 162 130 178 C132 188 131 195 130 200 Z')
  p.push(
    ...draw(body, {
      ...LOOK,
      shift: [-16, -8],
      hatch: { ...hatchG, cross: true, len: 5 },
      extra: (s) => [
        ...dab(26, 168, 12, 14, 0.2, '255,245,210', 0.4, 'screen', s.c),
        mult('M70 150 C82 156 94 156 104 150 C102 160 96 168 86 172 C80 166 74 158 70 150 Z', 'rgba(170,64,40,0.6)', s.c),
        ...dab(46, 172, 10, 14, 0.2, '170,64,40', 0.45, 'multiply', s.c),
        ...scaleSet('M22 152 C14 166 10 182 10 200', 'M110 150 C122 162 128 180 128 200', { rows: 7, per: 9, w: 0.55, size: 0.85 }, s.d, BR, '#fff4c8', SHADE(0.9)),
      ],
    }),
  )
  // ---- neck ---------------------------------------------------------------------
  const dorsal = 'M54 50 C45 62 40 78 40 94 C40 110 38 126 30 142'
  for (const sp of spikes(dorsal, [0.22, 0.38, 0.54, 0.7, 0.86], [6, 7.5, 7, 6, 4.5], -1, 0.9, 0.055).split('Z').filter(Boolean))
    p.push(...draw(shape(sp + 'Z', 0.1), { fill: MEMB, sh: MSH, shift: [-1, -1], ink: { w: 1 } }))
  const throat = 'M90 88 C80 96 74 107 76 119 C78 132 88 144 102 154'
  const neck = shape('M54 50 C45 62 40 78 40 94 C40 110 38 126 30 142 C36 160 42 180 44 200 L112 200 C110 184 106 168 102 154 C88 144 78 132 76 119 C74 107 80 96 90 88 C80 74 66 58 54 50 Z')
  p.push(
    ...draw(neck, {
      ...LOOK,
      shift: [-13, -3],
      open: [[dorsal, -1], [throat, 1]],
      extra: (s) => [
        ...dab(50, 92, 9, 24, 0.1, '255,252,232', 0.75, 'screen', s.c),
        ...dab(70, 132, 14, 18, 0.3, '230,110,60', 0.4, 'multiply', s.c),
        ...dab(80, 110, 6, 14, 0.2, '255,120,50', 0.35, 'screen', s.c),
        // cast shadow of the jaw on the neck, wrapping round the throat
        mult('M56 84 C64 90 74 93 84 92 C88 91 91 89 94 86 C92 93 88 99 84 106 C78 106 72 103 68 99 C63 94 59 89 56 84 Z', 'rgba(110,46,86,0.72)', s.c),
        ...dab(80, 96, 10, 7, 0.3, '90,40,90', 0.5, 'multiply', s.c),
        ...dab(76, 120, 6, 18, 0.15, '120,60,110', 0.45, 'multiply', s.c),
        { d: sym([66, 112], [72, 116], [76, 111], 0.8) + sym([64, 124], [70, 128], [76, 124], 0.7), fill: BR, alpha: 0.6, clip: s.c },
        { d: hatch('M54 84 C64 92 78 96 90 92', 'M54 92 C64 100 76 104 86 102', { n: 12, w: 0.5, len: 0.9, shift: 0.04 }), fill: '#5a1a08', alpha: 0.5, clip: s.c },
        ...scaleSet(dorsal, 'M88 88 C78 98 72 110 72 122 C72 134 80 144 92 154', { rows: 17, per: 6, w: 0.5, size: 0.9 }, s.d, BR, '#fff4c8', SHADE(0.85)),
        ...scaleSet('M30 142 C36 160 42 180 44 200', 'M92 154 C96 168 98 184 98 200', { rows: 9, per: 7, w: 0.5, size: 0.85, seed: 5 }, s.d, BR, '#fff4c8', SHADE(0.8)),
        ...dab(60, 170, 12, 20, 0, '170,64,40', 0.35, 'multiply', s.c),
        // pectoral fold where the neck swells into the chest
        mult('M44 164 C56 172 72 176 90 170 C86 176 76 180 64 180 C54 178 48 172 44 164 Z', 'rgba(180,70,40,0.5)', s.c),
        { d: inkD('M44 163 C56 171 72 175 90 169', { w: 0.9, t0: 0.3 }), fill: BR, alpha: 0.7 },
        { d: inkD('M48 160 C58 167 70 170 84 167', { w: 0.8 }), fill: 'rgba(255,248,220,0.6)' },
      ],
    }),
  )

  // belly plates down the throat and chest
  const plates = shape('M88 87 C78 97 72 109 72 121 C72 135 80 147 90 156 C95 168 97 184 96 200 L122 200 C123 184 119 166 104 153 C88 143 80 132 78 119 C77 107 82 97 92 89 Z')
  const plateLines =
    sym([82, 95], [86, 99], [91, 93], 0.9) +
    sym([77, 103], [81, 108], [86, 103], 0.9) +
    sym([74, 112], [78, 117], [83, 113], 0.9) +
    sym([73, 122], [78, 127], [83, 124], 0.9) +
    sym([74, 132], [80, 137], [86, 135], 1) +
    sym([78, 141], [86, 147], [94, 145], 1) +
    sym([86, 152], [96, 158], [106, 156], 1.1) +
    sym([91, 163], [102, 169], [113, 167], 1.1) +
    sym([94, 175], [106, 181], [118, 179], 1.2)
  p.push(...draw(plates, { fill: PLATE, sh: 'rgba(170,84,90,0.66)', shift: [-5, -2], hatch: { step: 1.3, w: 0.45, a: 0.6, color: '#4a0a20' }, rim: RIM, bounce: LAVA, ink: { w: 1.5, gap: 0.8 }, extra: (s) => [{ d: plateLines, fill: '#8a4a18', alpha: 0.85, clip: s.c }] }))

  // ---- head ---------------------------------------------------------------------
  const head = shape(
    'M52 50 C56 40 64 34 74 32 C80 31 86 32 92 34 C96 35 99 37 100 40 C101 42 102 43 104 43 C106 40 110 40 112 43 C116 46 121 50 126 54 C129 55 132 57 133 60 C135 58 137 56 139 55 C138 58 136 61 134 63 C134 66 132 69 128 70 C122 72 114 74 108 75 C108 79 104 82 98 83 C97 86 95 89 92 91 C92 88 90 86 88 85 C82 86 76 86 70 84 C68 88 64 91 60 93 C61 89 60 86 59 83 C55 80 52 75 51 69 C49 62 50 55 52 50 Z',
  )
  p.push(
    ...draw(head, {
      ...LOOK,
      shift: [-7, -8],
      extra: (s) => [
        ...dab(72, 46, 14, 10, 0.2, '255,253,236', 0.75, 'screen', s.c),
        ...dab(116, 56, 10, 5, 0.5, '255,245,210', 0.45, 'screen', s.c),
        // shadow plane under the cheekbone and along the jaw
        mult('M60 66 C70 70 84 72 100 74 C110 75 118 74 126 71 C118 77 108 80 98 84 C84 88 68 86 58 80 Z', 'rgba(170,70,60,0.55)', s.c),
        mult('M58 80 C70 86 86 87 98 84 C104 83 107 80 108 78 C108 84 102 88 94 90 C80 92 66 90 58 84 Z', 'rgba(100,44,90,0.6)', s.c),
        { d: hatch('M62 80 C74 86 88 86 98 84', 'M64 72 C76 78 90 79 104 77', { n: 14, w: 0.5, len: 0.8, shift: 0.03 }), fill: '#5a1a08', alpha: 0.5, clip: s.c },
        ...scaleSet('M106 48 C112 51 118 55 126 60', 'M94 56 C104 60 114 64 124 68', { rows: 7, per: 3, w: 0.42, size: 0.8 }, s.d, BR, '#fff8d8', () => 0.55),
        ...scaleSet('M56 54 C56 64 58 72 63 80', 'M68 58 C68 66 70 74 74 81', { rows: 5, per: 3, w: 0.48, size: 0.9 }, s.d, BR, '#fff8d8', (u) => 0.4 + u * 0.5),
        // cheekbone ridge
        mult('M64 63 C74 60 86 61 96 65 C88 65 78 65 70 67 C67 66 65 65 64 63 Z', 'rgba(180,80,40,0.5)', s.c),
        { d: inkD('M64 62 C74 59 86 60 96 64', { w: 0.8, t0: 0.4 }), fill: BR, alpha: 0.7 },
        { d: inkD('M66 60 C74 57 84 57 92 60', { w: 0.9 }), fill: 'rgba(255,252,230,0.7)' },
        { d: inkD('M108 52 C112 56 116 58 122 60', { w: 0.6 }), fill: BR, alpha: 0.6 },
      ],
    }),
  )

  // ---- near horn ----------------------------------------------------------------
  const hornC = 'M70 40 C62 31 54 25 44 22 C34 19 25 17 17 11 C14 8 12 5 11 1'
  p.push(...draw(tube(hornC, 12.5, 0.5), { fill: hornPaint(70, 40, 11, 1), sh: HSH, shift: [-2, -3], rim: RIM, rimW: 1.4, ink: { w: 1.7 } }))
  p.push(inkP(rings(hornC, 12.5, 0.5, [0.08, 0.15, 0.22, 0.29, 0.36, 0.43, 0.5, 0.58, 0.66, 0.74], 0.3, 0.45), '#7a5a30', 0.85))
  p.push(inkP(inkD(along(hornC, 12.5, 0.5, -0.45, 0.04, 0.8), { w: 0.5 }) + inkD(along(hornC, 12.5, 0.5, 0.15, 0.08, 0.7), { w: 0.4 }), '#8a6838', 0.6))
  p.push(inkP(inkD(along(hornC, 12.5, 0.5, 0.55, 0.05, 0.85), { w: 0.6 }), 'rgba(90,50,20,0.55)'))
  p.push({ d: inkD('M62 32 C55 26 48 23 40 21 C33 19 27 17 22 13', { w: 0.9, wob: 0.1 }), fill: 'rgba(255,255,255,0.85)' })
  // brow spikes between horn and brow
  for (const d of ['M80 34 C78 29 75 26 71 24', 'M88 34 C88 29 86 26 83 23'])
    p.push(...draw(tube(d, 3.4, 0.3), { fill: HORN, sh: HSH, shift: [-0.6, -0.8], ink: { w: 1 } }))
  // horn root wraps the skull
  p.push(inkP(inkD('M60 46 C61 40 66 36 74 35', { w: 1.2, t0: 0.3 })))

  // ---- face ---------------------------------------------------------------------
  // near eye (half-lidded, menacing)
  const eyeN = shape('M74 50 C78 46 86 45 95 46 C93 51 87 54 81 54 C77 54 75 52 74 50 Z', 0.05)
  p.push(fillP(eyeN.d, rad(83, 50, 10, 0, '#fffbd0', 0.45, '#ffbe36', 1, '#d0500a')))
  p.push(fillP('M79 46 C80.5 50 80.5 52 79.5 55 C82 52 82.5 49 81.5 46 Z', INK, { clip: eyeN.d }))
  p.push(fillP(eyeN.d + moved(eyeN, 0, 2.4), '#a04a10', { rule: 'evenodd', clip: eyeN.d, blend: 'multiply' }))
  p.push(fillP('M76.5 49.5 C78 48.5 79 48.5 80 49.5 C79 50.5 77.5 50.5 76.5 49.5 Z', '#ffffff'))
  p.push({ d: inkD('M86 52 C89 51 91 50 93 48', { w: 0.6 }), fill: 'rgba(255,255,220,0.8)' })
  p.push(inkP(outline(eyeN, { w: 1.3, min: 0.5 })))
  p.push(...dab(85, 50, 9, 6, 0, '255,190,60', 0.45, 'screen'))
  // smug wrinkles at the eye corner
  p.push(inkP(inkD('M96 47 C98 48 100 50 101 52 M95 50 C97 52 98 54 98 57', { w: 0.6 }), BR, 0.7))
  // brow shelf (lowered toward the snout = menace)
  const brow = shape('M62 45 C70 38 82 34 93 36 C97 37 100 40 99 43 C95 44 89 46 83 47 C76 48 69 49 62 45 Z')
  p.push(...draw(brow, { fill: GOLD, sh: GSH, shift: [-1, -2.5], ink: { w: 1.5 } }))
  p.push(mult('M70 47 C78 47 88 45 98 43 C95 47 89 49 83 50 C77 51 73 50 70 47 Z', 'rgba(150,60,30,0.6)', head.c))
  // far eye (smug, under a raised brow)
  const eyeF = shape('M103.5 49 C105 46.5 109 46 111.5 47.5 C110.5 50 107 51.5 103.5 49 Z', 0.03)
  p.push(fillP(eyeF.d, rad(108, 48.5, 4, 0, '#fff4b0', 1, '#f09020')), fillP('M107 46.5 C107.6 48 107.6 49.5 107 51 C108.2 49.5 108.4 48 108 46.5 Z', INK, { clip: eyeF.d }), inkP(outline(eyeF, { w: 0.9, min: 0.5 })))
  p.push(inkP(inkD('M102 45 C105 42 109 42 112 45', { w: 1, t0: 0.3 })))
  // nostril
  const nostril = shape('M124 61 C126 58 130 58 132 60 C130 61 128 62 127 64 Z', 0.05)
  p.push(fillP(nostril.d, INK))
  // smirk: long mouth line hooking up at the back, teeth peeking
  p.push(inkP(inkD('M128 71 C118 74 106 76 94 77 C84 78 76 76 71 70', { w: 1.6, t0: 0.12 })))
  p.push(inkP(inkD('M73 74 C71 71 71 68 73 65', { w: 0.8 })))
  for (const [x, y, h] of [[102, 76.5, 6], [112, 75, 3.6], [119, 73.6, 3], [92, 77.5, 2.6]]) {
    const t = shape(`M${x - 1.5} ${y} C${x - 1} ${y + h * 0.5} ${x - 0.3} ${y + h * 0.8} ${x + 0.4} ${y + h} C${x + 1} ${y + h * 0.6} ${x + 1.4} ${y + h * 0.3} ${x + 1.6} ${y - 0.4} Z`, 0.02)
    p.push(fillP(t.d, '#fffbe8'), inkP(outline(t, { w: 0.7, min: 0.5 })))
  }

  // ---- smoke curling from the nostril -------------------------------------------
  for (const [x, y, rx, ry, a] of [[131, 58, 2.2, 1.6, 0.4], [134, 53, 3, 2.2, 0.2], [137, 47, 3.8, 2.8, -0.3], [136, 40, 4.4, 3.2, 0.5], [139, 32, 5, 3.6, 0.2], [137, 23, 5.6, 4, -0.2]])
    p.push(...dab(x, y, rx * 1.2, ry * 1.2, 0.3, '250,240,228', Math.min(0.85, a + 0.35), undefined))
  p.push(inkP(inkD('M129 61 C133 57 132 52 135 49 C138 46 141 47 140 50 C139 52 136 51 136 47 C136 41 141 37 139 30 C138 25 134 23 136 18', { w: 0.6, t0: 0.4, gap: undefined }), 'rgba(255,245,230,0.75)'))
  p.push(inkP(inkD('M141 44 C144 40 143 35 140 33 M134 38 C131 34 132 29 135 27', { w: 0.45 }), 'rgba(120,80,60,0.45)'))

  // ---- near arm + talons on the hoard ------------------------------------------
  const arm = shape(
    'M40 146 C28 146 18 152 14 162 C10 172 10 182 14 188 C17 193 24 195 32 194 C40 193 46 192 52 190 C56 189 60 187 60 184 C58 181 52 181 46 182 C38 183 30 182 27 177 C25 170 30 162 38 158 C44 155 46 150 40 146 Z',
  )
  p.push(mult('M38 158 C46 160 52 168 54 182 C48 182 40 184 34 182 C34 172 34 164 38 158 Z', 'rgba(150,56,36,0.55)', body.c))
  p.push(
    ...draw(arm, {
      ...LOOK,
      shift: [-4, -5],
      extra: (s) => [
        ...dab(20, 162, 6, 10, 0.3, '255,250,225', 0.55, 'screen', s.c),
        ...scaleSet('M26 148 C16 156 12 168 13 182', 'M38 152 C32 160 28 170 28 180', { rows: 6, per: 3, w: 0.5 }, s.d, BR, '#fff4c8', SHADE(0.7)),
        ...scaleSet('M16 186 C28 190 40 190 52 186', 'M26 181 C34 184 44 184 54 182', { rows: 5, per: 2, w: 0.45 }, s.d, BR, '#fff4c8', () => 0.6),
        { d: inkD('M17 157 C22 160 26 166 27 172', { w: 0.8 }) + inkD('M18 186 C21 184 24 183 27 183', { w: 0.7 }), fill: BR, alpha: 0.75 },
      ],
    }),
  )

  // ---- a goblet half-buried in the hoard ----------------------------------------
  const GCUP = lin(104, 166, 122, 194, 0, '#fff4c0', 0.4, '#f0be48', 1, '#9a5a10')
  const cupLook = { fill: GCUP, sh: 'rgba(170,80,20,0.6)', shift: [-3, -2] as P, rim: RIM, rimW: 1.2, ink: { w: 1.1 } }
  const base = shape('M106 192 C108 189.5 118 189.5 120 192 C118 194.5 108 194.5 106 192 Z', 0.05)
  const stem = shape('M111.4 181 C112 184 111.6 187 110.6 190.6 L115.4 190.6 C114.4 187 114 184 114.6 181 Z', 0.05)
  const cup = shape('M104 168 C106 166 120 166 122 168 C121.5 175 118.5 180.5 113 181.5 C107.5 180.5 104.5 175 104 168 Z', 0.08)
  p.push(...draw(base, cupLook), ...draw(stem, cupLook), ...draw(cup, { ...cupLook, hl: '255,255,240', hlW: 1.2 }))
  const knob = shape('M110.6 184.4 C111.6 183.2 114.4 183.2 115.4 184.4 C114.4 185.6 111.6 185.6 110.6 184.4 Z', 0.03)
  p.push(fillP(knob.d, GCUP), inkP(outline(knob, { w: 0.6, min: 0.5 })))
  const lip = shape('M104.4 168 C107 166.4 119 166.2 121.6 168 C119 169.6 107 169.8 104.4 168 Z', 0.03)
  p.push(fillP(lip.d, lin(0, 166, 0, 170, 0, '#4a2404', 1, '#8a5010')), inkP(outline(lip, { w: 0.6, min: 0.5 })))
  const gem2 = shape('M110.5 174 C111.5 172 114.5 172 115.5 174 C114.5 176 111.5 176 110.5 174 Z', 0.03)
  p.push(fillP(gem2.d, rad(113, 173.5, 3, 0, '#c8f0ff', 0.4, '#2a8adc', 1, '#0a2a60')), inkP(outline(gem2, { w: 0.5, min: 0.5 })), inkP(sym([111.6, 173.6], [112.4, 172.8], [113.4, 172.8], 0.35), '#ffffff'))
  p.push(inkP(sym([106, 170], [107, 175], [110, 179], 0.6), 'rgba(255,255,240,0.85)'))

  // ---- coin hoard ---------------------------------------------------------------
  const heap = shape(
    'M-8 200 C-6 192 0 188 8 189 C14 185 22 185 28 188 C36 184 46 185 52 189 C60 186 70 187 76 191 C84 187 94 188 100 192 C108 189 118 190 124 193 C132 192 140 194 144 200 Z',
  )
  p.push(...draw(heap, { fill: lin(0, 186, 0, 200, 0, '#ffe58a', 1, '#c88a1c'), sh: GSH, shift: [-2, -3], rim: RIM, ink: { w: 1.5, gap: 0.8 } }))
  // coins on the heap (tiny details)
  const R = rng(91)
  let coinD = ''
  let coinRim = ''
  let coinHi = ''
  for (let i = 0; i < 46; i++) {
    const x = -4 + R() * 146
    const y = 190 + R() * 9
    const rx = 2.2 + R() * 1.4
    const ry = rx * (0.35 + R() * 0.3)
    const a = (R() - 0.5) * 0.5
    const pts: P[] = []
    for (let k = 0; k < 18; k++) {
      const t = (k / 18) * Math.PI * 2
      const ex = Math.cos(t) * rx
      const ey = Math.sin(t) * ry
      pts.push([x + ex * Math.cos(a) - ey * Math.sin(a), y + ex * Math.sin(a) + ey * Math.cos(a)])
    }
    coinD += polyD(pts, true, f1)
    coinRim += sym([x - rx * 0.6, y + ry * 0.2], [x, y + ry * 0.9], [x + rx * 0.6, y + ry * 0.2], 0.35)
    coinHi += sym([x - rx * 0.6, y - ry * 0.1], [x - rx * 0.2, y - ry * 0.8], [x + rx * 0.3, y - ry * 0.6], 0.4)
  }
  p.push({ d: coinD, fill: lin(0, 186, 0, 200, 0, '#fff0a8', 0.5, '#f2bf48', 1, '#b87818'), stroke: '#5a3008', sw: 0.45 })
  p.push(inkP(coinRim, '#7a4a10', 0.8), inkP(coinHi, 'rgba(255,255,240,0.9)'))
  // a ruby in the hoard
  const ruby = shape('M110 192 C112 189 116 189 118 192 C117 195 114 197 112 196 C110 195 109 194 110 192 Z', 0.05)
  p.push(fillP(ruby.d, rad(113, 192, 5, 0, '#ffb0b8', 0.4, '#e02040', 1, '#600818')), inkP(outline(ruby, { w: 0.7, min: 0.4 })), inkP(sym([111, 192], [112.5, 190.5], [114, 191], 0.6), '#ffffff'))
  // talons gripping the coins
  for (const d of ['M50 188 C54 190 57 193 59 197', 'M55 185 C59 187 62 190 64 194', 'M44 191 C47 193 49 196 51 199'])
    p.push(...draw(tube(d, 3, 0.4), { fill: HORN, sh: HSH, shift: [-0.6, -0.8], ink: { w: 0.9 } }))

  // ---- grain over the figure ----------------------------------------------------
  p.push(...grain(head.c + neck.c + body.c + plates.c + arm.c, [0, 25, 135, 200], 450, 4))
  p.push(...grain(nwMem.c + fwMem.c, [-25, 10, 152, 160], 160, 8, '60,0,0', '255,200,150'))
  scalePaths(p, 0.97, 70, 200)
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths: p }
}

// Tufty outline around a centreline (ostrich plume, ghostly wisps).
function plumeShape(d: string, w: number, tufts: number, seed: number): Shape {
  const pts = sample(d, 0.5)[0].pts
  const sl = arcLen(pts, false)
  const len = sl[sl.length - 1]
  const nm = normals(pts, false)
  const r = rng(seed)
  const ph = r() * 6
  const left: P[] = []
  const right: P[] = []
  pts.forEach((q, i) => {
    const t = sl[i] / len
    const prof = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.6) * (1 - 0.35 * t)
    const tuftL = 1 + 0.3 * Math.abs(Math.sin(t * tufts * Math.PI + ph))
    const tuftR = 1 + 0.3 * Math.abs(Math.sin(t * tufts * Math.PI * 1.1 + ph + 1.3))
    left.push([q[0] + nm[i][0] * w * prof * tuftL, q[1] + nm[i][1] * w * prof * tuftL])
    right.push([q[0] - nm[i][0] * w * prof * 0.8 * tuftR, q[1] - nm[i][1] * w * prof * 0.8 * tuftR])
  })
  return shape(polyD(left.concat(right.reverse())), 0.15)
}

// Barbs combed out of a centreline, curving toward the tip.
function barbs(d: string, n: number, len: number, side: number, w: number, from = 0.06, to = 0.96): string {
  const c = curve(d)
  let out = ''
  for (let i = 0; i < n; i++) {
    const t = from + ((to - from) * i) / (n - 1)
    const q = at(c.pts, c.s, t)
    const q2 = at(c.pts, c.s, Math.min(1, t + 0.02))
    let tx = q2[0] - q[0]
    let ty = q2[1] - q[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l
    ty /= l
    const L2 = len * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.6) * (1 - 0.3 * t)
    const e: P = [q[0] + (ty * side * 0.8 + tx * 0.6) * L2, q[1] + (-tx * side * 0.8 + ty * 0.6) * L2]
    const m: P = [q[0] + ty * side * L2 * 0.5 + tx * L2 * 0.1, q[1] - tx * side * L2 * 0.5 + ty * L2 * 0.1]
    out += sym(q, m, e, w)
  }
  return out
}

// ================================================================================
// Ghost pirate: Cap. Brume — jolly spectral captain, head turned 3/4 to the left
// ================================================================================
export function pirateGhost(): Art {
  const p: VectorPath[] = []
  const MOON = '170,235,255'
  const TEAL = '#0b3240' // ink for the spectral parts
  const SPECTRE = lin(30, 50, 110, 130, 0, 'rgba(242,254,255,0.88)', 0.45, 'rgba(196,240,250,0.76)', 1, 'rgba(104,190,220,0.58)')
  const SSH = 'rgba(56,136,178,0.55)'
  const COAT = lin(10, 116, 130, 200, 0, '#c8424a', 0.45, '#9a1e30', 1, '#4a0a1a')
  const CSH = 'rgba(70,10,40,0.62)'
  const HAT = lin(10, 10, 130, 64, 0, '#50526a', 0.5, '#26283a', 1, '#101018')
  const GOLDT = lin(0, 0, 140, 60, 0, '#fff0a8', 0.4, '#f0be4a', 1, '#a86e12')
  const hatchC = { len: 4, step: 1.6, th: 0.38, w: 0.5, a: 0.55, color: '#2a0410' }
  const ghostLook = { fill: SPECTRE, sh: SSH, rim: MOON, rimW: 2.4, inkC: TEAL, hl: '255,255,255', soft: '#7ab8d0', hatch: { step: 1.5, w: 0.42, a: 0.45, color: TEAL } }

  // ---- back glow --------------------------------------------------------------
  p.push(...dab(66, 90, 54, 54, 0, MOON, 0.26, 'screen'))

  const plumeStart = p.length
  // ---- plume (behind the hat) -------------------------------------------------
  const plumeC = 'M106 24 C116 8 134 0 145 9 C153 16 153 30 148 40 C145 47 141 52 136 55'
  const plume = plumeShape(plumeC, 10, 13, 3)
  p.push(
    ...draw(plume, {
      fill: lin(100, 6, 150, 60, 0, 'rgba(250,254,255,0.95)', 0.6, 'rgba(196,236,248,0.9)', 1, 'rgba(130,200,226,0.85)'),
      sh: SSH,
      shift: [-4, -3],
      rim: MOON,
      inkC: TEAL,
      ink: { w: 1.1, gap: 0.6 },
      extra: (s) => [...dab(130, 12, 8, 6, 0, '255,255,255', 0.7, 'screen', s.c), { d: barbs(plumeC, 22, 11, 1, 0.4, 0.1, 0.95) + barbs(plumeC, 18, 8, -1, 0.35, 0.12, 0.95), fill: TEAL, alpha: 0.32, clip: s.c }],
    }),
  )
  p.push(inkP(inkD(plumeC, { w: 0.9, t0: 0.15 }), 'rgba(255,255,255,0.9)'))

  offsetPaths(p.slice(plumeStart), 0, -3)

  // ---- coat: 3/4 torso, near arm akimbo, far arm behind holding a spyglass --------
  const FOLD = 'rgba(70,10,40,0.5)'
  const CUFF = lin(0, 160, 0, 190, 0, '#e05a60', 1, '#801828')
  const HAND = lin(0, 160, 0, 196, 0, 'rgba(240,253,255,0.85)', 1, 'rgba(130,205,230,0.6)')
  const BRASS = lin(0, 180, 30, 200, 0, '#fff0b0', 0.4, '#e2a83a', 1, '#7a4a08')
  const sleeveLook = (fill: Paint): Look => ({ fill, sh: CSH, shift: [-5, -3], rim: MOON, rimW: 1.8, hatch: hatchC, hl: '255,200,200', hlW: 1.4, ink: { w: 1.7, gap: 0.82 } })

  const front: VectorPath[] = [] // spyglass hand sits in front of the mist
  // far arm (mostly behind the torso), hand dissolving, small brass spyglass
  const slvF = shape('M30 127 C22 130 17 138 15 148 C13 158 13 168 14 177 C18 178 23 178 27 177 C27 168 28 158 30 148 C31 140 32 132 30 127 Z')
  p.push(...draw(slvF, { ...sleeveLook(lin(12, 128, 32, 178, 0, '#c8424a', 1, '#6a1222')), extra: (s) => [mult(sym([22, 146], [20, 160], [21, 174], 2.4), FOLD, s.c), { d: inkD('M17 160 C20 161 23 163 25 166', { w: 0.55 }), fill: '#3a0614', alpha: 0.7, clip: s.c }] }))
  const scope = tube('M22 183 C16 187 10 192 3 198', 4, 3.2)
  front.push(...draw(scope, { fill: BRASS, sh: 'rgba(150,80,10,0.6)', shift: [-1, -1.5], rim: MOON, rimW: 1, hl: '255,255,230', hlW: 0.8, ink: { w: 1 } }))
  front.push(inkP(rings('M22 183 C16 187 10 192 3 198', 4.6, 3.8, [0.3, 0.36, 0.7], 0.2, 0.55), '#5a3004', 0.85))
  const handF = shape('M15 178 C14 182 16 186 20 188 C23 189 26 187 27 184 C28 181 27 178 26 176 Z', 0.12)
  front.push(...draw(handF, { fill: HAND, sh: SSH, shift: [-1, -1], inkC: TEAL, ink: { w: 0.9, gap: 0.6 }, extra: (s) => [{ d: inkD('M17 182 C19 183 21 183 23 182 M18 185 C20 186 22 186 24 185', { w: 0.4 }), fill: TEAL, alpha: 0.6, clip: s.c }] }))
  const cuffF = shape('M12 172 C17 170 24 170 29 172 C30 175 30 178 29 181 C24 182 17 182 12 181 C11 178 11 175 12 172 Z')
  front.push(...draw(cuffF, { fill: CUFF, sh: CSH, shift: [-3, -2], rim: MOON, rimW: 1.2, ink: { w: 1.3 }, extra: (s) => [{ d: band(s, [0, -1], 1.3, 1), fill: GOLDT }] }))

  // torso: sloping shoulders, waist, skirts flaring into the mist
  const coat = shape(
    'M46 118 C38 120 31 123 25 128 C21 132 20 140 22 148 C24 156 29 162 33 166 C29 174 22 184 15 193 C19 196 22 192 26 196 C30 199 34 193 39 196 C44 199 48 193 53 197 C58 199 62 194 67 197 C72 199 76 193 81 196 C86 199 90 193 95 197 C100 199 104 193 109 196 C114 199 118 193 122 196 C125 197 127 195 128 193 C122 184 112 176 105 168 C103 160 104 150 107 142 C111 134 117 129 122 126 C116 121 104 117 92 116 C80 115 58 116 46 118 Z',
  )
  p.push(
    ...draw(coat, {
      fill: COAT,
      sh: CSH,
      shift: [-11, -5],
      deep: 'rgba(40,0,20,0.5)',
      rim: MOON,
      rimW: 2.4,
      hatch: hatchC,
      soft: '#802040',
      hl: '255,200,200',
      ink: { w: 2, gap: 0.85 },
      extra: (s) => [
        // folds pulled from the shoulders toward the waist
        mult(sym([30, 132], [32, 148], [36, 162], 2.6) + sym([100, 124], [100, 140], [102, 156], 2.4), FOLD, s.c),
        // skirt folds fanning out from the belt
        mult(sym([40, 172], [34, 182], [30, 196], 3.4) + sym([52, 172], [50, 184], [48, 197], 3) + sym([88, 172], [92, 184], [96, 197], 3) + sym([100, 170], [106, 182], [112, 196], 3.2), FOLD, s.c),
        { d: inkD('M39 173 C35 182 32 189 30 194 M51 173 C50 182 49 189 48 194 M89 173 C91 182 93 189 95 194 M101 171 C105 180 109 187 111 193 M31 134 C33 146 34 154 36 160', { w: 0.75 }), fill: '#3a0614', alpha: 0.7, clip: s.c },
        { d: inkD('M42 174 C38 182 36 188 35 194 M93 174 C96 182 99 188 101 194', { w: 0.6 }), fill: 'rgba(255,190,190,0.5)', clip: s.c },
        ...dab(40, 146, 6, 14, 0.1, '255,190,190', 0.3, 'screen', s.c),
        ...dab(64, 182, 22, 8, 0, '120,230,255', 0.3, 'screen', s.c),
        ...dab(66, 126, 20, 9, 0, '120,230,255', 0.35, 'screen', s.c), // spectral glow on the collar
      ],
    }),
  )
  // dark breeches glimpsed where the skirts part, fading into mist
  const split = shape('M60 170 C58 178 56 186 55 196 C60 198 72 198 78 196 C77 186 75 178 72 170 Z', 0.1)
  p.push(fillP(split.d, lin(0, 168, 0, 196, 0, '#1a2a34', 1, 'rgba(120,200,220,0.5)')), inkP(inkD('M60 170 C58 178 56 186 55 194 M72 170 C75 178 77 186 78 194', { w: 0.9, out: 0 }), '#2a0410'))
  // waistcoat + lapels following the chest curve
  const vest = shape('M52 121 C57 133 61 148 64 166 L72 166 C74 148 78 133 84 121 Z')
  p.push(...draw(vest, { fill: lin(52, 120, 84, 166, 0, '#2e5a66', 1, '#0c2430'), sh: 'rgba(0,20,30,0.5)', shift: [-3, -2], ink: { w: 1.2 } }))
  const lapL = shape('M46 118 C49 118 51 119 53 122 C57 134 60 150 63 166 C56 162 48 154 43 144 C38 134 40 124 46 118 Z')
  const lapR = shape('M92 116 C89 116 86 118 84 122 C79 134 75 150 73 166 C80 162 88 154 94 144 C98 134 98 122 92 116 Z')
  p.push(...draw(lapL, { fill: lin(40, 118, 64, 166, 0, '#d24c54', 1, '#7a1424'), sh: CSH, shift: [-3, -2], ink: { w: 1.4 } }))
  p.push(...draw(lapR, { fill: lin(98, 118, 72, 166, 0, '#a8283a', 1, '#4a0a18'), sh: CSH, shift: [-4, -2], rim: MOON, ink: { w: 1.5 } }))
  p.push(inkP(inkD('M47 120 C50 120 52 122 53 125 C56 136 59 150 61 162 M91 118 C88 118 86 120 85 124 C81 136 77 150 75 162', { w: 0.9 }), GOLDT))
  for (const [x, y] of [[48, 136], [53, 150], [89, 134], [84, 148]]) {
    const b = shape(`M${x - 1.8} ${y} C${x - 1.8} ${y - 1.2} ${x - 0.9} ${y - 1.9} ${x} ${y - 1.9} C${x + 1.1} ${y - 1.9} ${x + 1.8} ${y - 1} ${x + 1.8} ${y} C${x + 1.8} ${y + 1.1} ${x + 1} ${y + 1.9} ${x} ${y + 1.9} C${x - 1} ${y + 1.9} ${x - 1.8} ${y + 1.1} ${x - 1.8} ${y} Z`, 0.03)
    p.push(fillP(b.d, rad(x - 0.6, y - 0.6, 2.4, 0, '#fff6c0', 0.5, '#e8b03a', 1, '#8a5a08')), inkP(outline(b, { w: 0.6, min: 0.5 })))
  }
  // wide leather belt and buckle cinching the waist
  const belt = shape('M33 163 C50 168 84 168 106 162 C107 165 107 168 106 171 C84 177 50 177 33 172 C32 169 32 166 33 163 Z')
  p.push(...draw(belt, { fill: lin(0, 162, 0, 176, 0, '#5a3a2a', 1, '#1e100a'), sh: 'rgba(0,0,0,0.5)', shift: [-4, -1.5], rim: MOON, rimW: 1, hl: '255,220,190', hlW: 0.8, ink: { w: 1.3 }, extra: (s) => [{ d: inkD('M36 165.6 C52 170 82 170 103 165 M36 170 C52 174 82 174 103 169', { w: 0.35 }), fill: 'rgba(255,220,180,0.35)', clip: s.c }] }))
  const buckle = shape('M60 164.5 C63 164 69 164 72 164.5 C72.6 167.5 72.6 171 72 174 C69 174.6 63 174.6 60 174 C59.4 171 59.4 167.5 60 164.5 Z', 0.04)
  const hole = shape('M62.5 167 C65 166.6 67 166.6 69.5 167 C69.8 168.8 69.8 170.2 69.5 172 C67 172.4 65 172.4 62.5 172 C62.2 170.2 62.2 168.8 62.5 167 Z', 0.03)
  p.push(fillP(buckle.d + hole.d, lin(60, 164, 72, 175, 0, '#fff4b8', 0.45, '#e8b03a', 1, '#7a4a08'), { rule: 'evenodd' }), inkP(outline(buckle, { w: 0.8, min: 0.5 }) + outline(hole, { w: 0.5, min: 0.5 })), inkP(sym([61, 165.6], [64, 165], [67, 165.4], 0.4), '#fffbe8'))
  // far epaulette: foreshortened, half hidden behind the collar
  const epF = shape('M26 127 C30 121 38 118 46 118 C47 121 46 125 43 128 C38 130 32 131 26 131 C25 130 25 128 26 127 Z')
  {
    let fr = ''
    for (let i = 0; i < 6; i++) {
      const x = 27 + i * 3
      const y = 130.5 - i * 0.4
      fr += sym([x, y], [x - 0.4, y + 3], [x - 0.6, y + 6 - (i % 2)], 1.1)
    }
    p.push(mult(shiftD(fr, 1.2, 0.8), 'rgba(60,0,20,0.5)', coat.c), inkP(fr, lin(26, 128, 46, 138, 0, '#f6d27a', 1, '#8a5208')), inkP(fr, 'rgba(90,50,0,0.35)'))
  }
  p.push(...draw(epF, { fill: lin(26, 118, 46, 131, 0, '#fff0a8', 0.4, '#e8b440', 1, '#8a5a10'), sh: 'rgba(170,80,20,0.6)', shift: [-2, -2], hl: '255,255,230', hlW: 1, ink: { w: 1.2 } }))

  // near arm akimbo: elbow out, translucent fist on the hip
  const slvN = shape('M104 120 C116 117 128 121 134 130 C139 138 141 148 141 157 C141 164 137 169 130 170 C122 171 115 173 108 175 C106 171 105 166 104 161 C111 159 116 157 120 154 C121 150 119 146 116 143 C112 140 108 138 106 136 C103 131 102 124 104 120 Z')
  p.push(
    ...draw(slvN, {
      ...sleeveLook(lin(138, 120, 104, 172, 0, '#b8303e', 0.6, '#7a1424', 1, '#3e0612')),
      shift: [-6, -4],
      extra: (s) => [
        mult(sym([126, 130], [133, 144], [135, 160], 3.4), FOLD, s.c),
        // elbow creases
        { d: inkD('M124 153 C128 156 131 160 132 165 M120 157 C123 160 125 164 125 168 M119 145 C124 147 127 151 128 155 M112 132 C118 134 122 140 124 146', { w: 0.6 }), fill: '#3a0614', alpha: 0.75, clip: s.c },
        { d: inkD('M112 126 C118 126 124 130 127 136', { w: 0.6 }), fill: 'rgba(255,200,200,0.5)', clip: s.c },
      ],
    }),
  )
  const cuffN = shape('M100 159.5 C104 157.5 108 157.5 111 159.5 C113 164.5 113.5 170 112 175.5 C108 177.5 104 177.5 101 175.5 C99 170 99 165 100 159.5 Z')
  const fist = shape('M102 162 C98 160 93 161 91 164 C89 167 90 171 93 173 C96 175 100 175 103 173 Z', 0.1)
  p.push(...draw(fist, { fill: HAND, sh: SSH, shift: [-1.2, -1], rim: MOON, rimW: 0.8, inkC: TEAL, ink: { w: 1, gap: 0.6 }, extra: (s) => [{ d: inkD('M93 165 C95 165 97 166 98 167 M92 168 C94 168 96 169 97 170 M94 171 C96 171 97.5 172 98.5 173', { w: 0.45 }), fill: TEAL, alpha: 0.65, clip: s.c }, ...dab(96, 167, 5, 5, 0, MOON, 0.45, 'screen', s.c)] }))
  p.push(...draw(cuffN, { fill: CUFF, sh: CSH, shift: [-2, -1.5], rim: MOON, rimW: 1.2, ink: { w: 1.2 }, extra: (s) => [{ d: band(s, [-1, 0], 1.2, 1), fill: GOLDT }] }))
  p.push(...dab(109, 168, 1.2, 1.2, 0, '255,220,120', 1))

  // torn holes: spectral glow shows through the cloth
  for (const d of ['M38 174 C40 173 41 171 42.5 172 C43 174 44.5 174.5 46 176 C45 178 46.5 180 45.5 182 C44 182.5 43 184 41.5 184 C41 182 39.5 181 38.5 179.5 C39.5 177.5 37.5 176 38 174 Z', 'M129 142 C131 141 132 139 134 139.5 C135 141 136 141 137 142.5 C136 144 136.5 145.5 135 146.5 C133.5 146 132 147.5 130.5 147 C130.5 145.5 128.5 144 129 142 Z']) {
    const h = shape(d, 0.1)
    const c = centroid(h.pts)
    p.push(fillP(h.d, rad(c[0], c[1], 6, 0, 'rgba(230,255,255,0.95)', 0.6, 'rgba(140,230,255,0.85)', 1, 'rgba(60,170,210,0.8)')), inkP(outline(h, { w: 0.8, min: 0.4 }), '#2a0410'))
    p.push(...dab(c[0], c[1], 7, 7, 0, MOON, 0.35, 'screen'))
  }

  // near epaulette: braided board with a heavy bullion fringe
  const ep = shape('M97 119 C104 113 117 116 126 124 C130 128 132 132 131 137 C126 138 118 136 110 134 C104 132 100 131 98 128 C95 125 95 122 97 119 Z')
  {
    let shadowF = ''
    let cords = ''
    let cordsDk = ''
    for (let i = 0; i < 10; i++) {
      const x = 99 + i * 3.4
      const y = 129.5 + i * 0.9 - Math.sin(i * 0.35) * 0.6
      const L2 = 9 - (i % 3) * 1.4 + (i > 6 ? 1 : 0)
      const sway = 0.6 + i * 0.12
      shadowF += sym([x + 1.6, y + 1], [x + 2.2 + sway, y + L2 * 0.55], [x + 2 + sway, y + L2 + 1], 1.5)
      cords += sym([x, y], [x + sway, y + L2 * 0.5], [x + sway * 0.8, y + L2], 1.4)
      cordsDk += sym([x + 0.5, y + 0.5], [x + sway + 0.7, y + L2 * 0.5], [x + sway * 0.8 + 0.4, y + L2], 0.5)
    }
    p.push(mult(shadowF, 'rgba(60,0,20,0.55)', coat.c + slvN.c))
    p.push(inkP(cords, lin(98, 128, 136, 145, 0, '#fff0a0', 0.5, '#e0a636', 1, '#8a5208')), inkP(cordsDk, '#5a3004', 0.7))
  }
  p.push(...draw(ep, { fill: lin(96, 114, 130, 138, 0, '#fff3b0', 0.35, '#f2c04c', 0.75, '#c88a1e', 1, '#7a4a08'), sh: 'rgba(170,80,20,0.65)', shift: [-3, -3], rim: MOON, rimW: 1.6, hl: '255,255,230', hlW: 1.4, ink: { w: 1.4 } }))
  p.push(inkP(inkD('M100 121 C106 117 116 119 124 126 C127 129 128 132 128 134', { w: 0.7 }), '#7a4a08', 0.8))
  p.push(inkP(inkD('M101 125 C108 128 118 131 128 134', { w: 0.5 }), '#7a4a08', 0.6))
  p.push(...dab(112, 124, 2.4, 2.4, 0, '255,250,200', 0.9), inkP(sym([110.8, 124], [112, 122.6], [113.4, 123.4], 0.5), '#fffbe8'))
  // high collar flaps
  const colL = shape('M44 118 C38 112 36 104 38 96 C44 104 50 112 54 120 C50 119 47 118 44 118 Z')
  const colR = shape('M96 116 C102 108 104 98 100 90 C94 100 88 110 82 120 C86 118 91 116 96 116 Z')

  const headStart = p.length
  // ---- spectral head ------------------------------------------------------------
  const head = shape('M36 52 C34 56 33 60 34 63 C35 66 36 68 35 71 C34 76 34 82 36 88 C38 94 40 100 42 104 C44 110 50 114 56 114 C66 114 78 110 88 102 C94 97 98 92 100 86 C103 78 104 68 103 60 C102 56 100 52 98 50 C90 38 50 38 36 52 Z')
  // collar behind the head
  p.push(...draw(colR, { fill: lin(104, 90, 82, 120, 0, '#8a1a2c', 1, '#3a0614'), sh: CSH, shift: [-2, -2], rim: MOON, ink: { w: 1.5 } }))
  p.push(
    ...draw(head, {
      ...ghostLook,
      shift: [-7, -5],
      extra: (s) => [
        ...dab(58, 64, 20, 14, 0, '255,255,255', 0.5, 'screen', s.c),
        ...dab(70, 96, 22, 14, 0, '110,226,255', 0.3, 'screen', s.c),
        ...dab(82, 82, 9, 7, 0, '120,160,255', 0.35, 'multiply', s.c), // cheek blush (cool)
        // smile fold + crow's feet + jowl
        { d: inkD('M52 82 C56 86 58 90 58 95', { w: 0.9, t0: 0.3 }) + inkD('M80 70 C83 71 85 72 87 74 M80 66 C83 66 85 65 87 64', { w: 0.6 }) + inkD('M84 98 C88 96 92 92 94 88', { w: 0.7 }), fill: TEAL, alpha: 0.65 },
        mult('M80 88 C86 86 92 84 98 80 C96 90 90 98 82 104 C82 98 82 94 80 88 Z', 'rgba(70,150,190,0.4)', s.c),
      ],
    }),
  )
  p.push(...draw(colL, { fill: lin(38, 96, 54, 120, 0, '#c8424a', 1, '#6a1222'), sh: CSH, shift: [-2, -2], ink: { w: 1.4 } }))
  // spectral hair streaming back from under the hat
  for (const [dd, w] of [
    ['M98 58 C106 58 114 60 120 64 C126 68 130 66 132 62', 4.2],
    ['M99 63 C108 64 116 68 121 73 C125 77 129 77 131 74', 3.4],
    ['M100 68 C106 71 111 76 114 81 C116 85 119 86 121 84', 2.6],
  ] as [string, number][]) {
    const hw = tube(dd, w, 0.3)
    p.push(...draw(hw, { fill: lin(98, 56, 132, 86, 0, 'rgba(240,252,255,0.85)', 1, 'rgba(150,215,235,0.45)'), sh: SSH, shift: [-1, -1.2], rim: MOON, rimW: 1, inkC: TEAL, ink: { w: 0.8, gap: 0.6 } }))
  }
  // ear + gold hoop
  const ear = shape('M99 66 C104 61 111 64 111 72 C111 79 107 85 101 84 C102 78 101 72 99 66 Z')
  p.push(...draw(ear, { ...ghostLook, shift: [-1.5, -1], ink: { w: 1.1 }, extra: (s) => [{ d: inkD('M103 69 C106 68 108 71 107 75 C106 78 104 79 103 78', { w: 0.6 }), fill: TEAL, alpha: 0.6, clip: s.c }] }))
  const hoop = 'M106 84 C102 86 102 92 106 93 C110 94 112 90 110 86'
  p.push(inkP(inkD(hoop, { w: 1.9, wob: 0 })), inkP(inkD(hoop, { w: 0.9, wob: 0 }), '#f6c84e'), inkP(sym([103.5, 89], [104, 87.5], [105, 86.5], 0.5), '#fffbe0'))

  // eye patch (far eye) + strap
  p.push(inkP(inkD('M30 60 C44 61 60 56 76 50 C86 47 94 47 101 49', { w: 1.6, t0: 0.1 })))
  const patch = shape('M34 60 C36 56 45 55 49 58 C52 63 50 70 45 72 C40 73 35 70 34 66 Z', 0.08)
  p.push(...draw(patch, { fill: lin(34, 56, 50, 72, 0, '#3e4052', 1, '#0c0c14'), hl: '200,230,255', hlW: 1, ink: { w: 1.4 } }))
  const browL = shape('M31 57 C34 53 41 52 48 54 C49 55 49 56 48 56.5 C43 56 37 56.5 32 58.5 C31 58 30.8 57.6 31 57 Z', 0.08)
  p.push(...draw(browL, { fill: lin(30, 52, 48, 58, 0, '#ffffff', 1, '#a8dcec'), sh: SSH, shift: [-0.6, -1], inkC: TEAL, ink: { w: 0.9 } }))
  // near eye (open, merry, glinting) + raised bushy brow
  p.push(...dab(70, 66, 9, 8, 0, '140,240,255', 0.55, 'screen'))
  const eyeW = shape('M61 66 C62 61 67 59 72 59.5 C76 60 79 63 78.5 67 C78 71 73 73.5 68 72.5 C64 72 61 69.5 61 66 Z', 0.05)
  p.push(fillP(eyeW.d, 'rgba(250,255,255,0.96)'))
  p.push(fillP('M65 66 C65 63 67 61.5 69.5 61.5 C72 61.5 73.6 63.5 73.6 66 C73.6 68.6 71.8 70.6 69.4 70.6 C67 70.6 65 68.6 65 66 Z', rad(69.5, 66, 5, 0, '#e8ffff', 0.4, '#3ad0f0', 1, '#0a5a78'), { clip: eyeW.d }))
  p.push(fillP('M67.8 66 C67.8 65 68.6 64.4 69.4 64.4 C70.3 64.4 71 65.1 71 66 C71 66.9 70.3 67.6 69.4 67.6 C68.5 67.6 67.8 66.9 67.8 66 Z', '#06202a', { clip: eyeW.d }))
  p.push(fillP('M70.2 63.6 C70.9 63.1 71.8 63.4 72 64.1 C71.5 64.7 70.6 64.6 70.2 63.6 Z', '#ffffff'))
  p.push(fillP(eyeW.d + moved(eyeW, 0, 2.4), 'rgba(50,130,170,0.6)', { rule: 'evenodd', clip: eyeW.d, blend: 'multiply' }))
  p.push(inkP(outline(eyeW, { w: 1.1, min: 0.4 }), TEAL))
  p.push(inkP(inkD('M60 63 C63 58.5 69 57 75 57.5 C78 58 80 59.5 81 62', { w: 1.4, t0: 0.2 }), TEAL))
  p.push(inkP(inkD('M63 74 C67 75.5 72 75.5 76 73.5', { w: 0.6 }), TEAL, 0.6))
  const browR = shape('M57 57 C60 50 68 46 77 47 C82 48 86 50 88 54 C85 53 82 53 79 54 C82 55 84 56 85 58 C80 56 74 55 69 55 C65 55 61 56 57 57 Z')
  p.push(...draw(browR, { fill: lin(57, 46, 88, 58, 0, '#ffffff', 1, '#a8dcec'), sh: SSH, shift: [-1, -1.5], rim: MOON, rimW: 1, inkC: TEAL, ink: { w: 1.1 }, extra: (s) => [{ d: inkD('M62 54 C66 51 70 50 74 50 M66 55 C70 53 76 52 80 52', { w: 0.45 }), fill: TEAL, alpha: 0.5, clip: s.c }] }))
  // bulbous nose
  const nose = shape('M46 60 C44 66 38 70 33 73 C28 75 27 81 31 84 C34 86 38 85 41 84 C44 86 48 85 49 82 C50 79 48 76 47 72 C47 68 48 64 46 60 Z')
  p.push(...draw(nose, { ...ghostLook, shift: [-2.5, -2.5], ink: { w: 1.4 }, extra: (s) => [...dab(36, 80, 5, 4, 0, '120,160,255', 0.4, 'multiply', s.c), ...dab(34, 76, 2.5, 2, 0, '255,255,255', 0.8, 'screen', s.c)] }))
  p.push(inkP(inkD('M42 84 C43 81 45 79 47 79', { w: 0.8 }), TEAL))
  // grin with a gold tooth
  const mouth = shape('M40 92 C50 95 64 95 77 90 C74 100 66 106 57 106 C48 106 42 100 40 92 Z')
  p.push(fillP(mouth.d, lin(0, 90, 0, 106, 0, '#0e4a5e', 1, '#03161e')))
  p.push(fillP('M42 92 C52 95.5 64 96 76 91 C74 95 70 96.5 66 97 C56 98 48 97 42 92 Z', 'rgba(245,255,255,0.96)', { clip: mouth.d }))
  p.push(fillP('M58 95.5 L58 99.4 C59.6 99.9 61.6 99.9 63 99.4 L63 95.8 Z', rad(60, 96.5, 4, 0, '#fff4c0', 1, '#c88a1c'), { clip: mouth.d }))
  p.push(inkP(sym([52, 95.5], [52.3, 97.5], [52.5, 98], 0.5) + sym([58, 95.5], [58, 97.5], [58, 99.4], 0.45) + sym([63, 95.8], [63, 97.5], [63, 99.4], 0.45) + sym([69, 95.5], [69.2, 96.8], [69.4, 97.2], 0.5), TEAL, 0.7))
  p.push(fillP('M50 104 C55 101 63 101 69 103 C65 106 55 106 50 104 Z', 'rgba(120,200,220,0.55)', { clip: mouth.d }))
  p.push(inkP(outline(mouth, { w: 1.4, min: 0.5 }), TEAL))
  // curly moustache locks (tapered, combed strands)
  const lockL = 'M43 86 C36 90 28 92 22 89 C17 86 18 80 23 80 C26 81 26 84 23.5 84.5'
  const lockR = 'M46 86 C56 89 68 90 78 86 C86 83 89 77 86 74 C84 72 81 73.5 82 76'
  for (const [d, w] of [[lockL, 5.2], [lockR, 6.4]] as [string, number][]) {
    const m = tube(d, w, 0.5)
    p.push(...draw(m, { fill: lin(18, 72, 90, 90, 0, '#ffffff', 1, '#bfe4f0'), sh: SSH, shift: [-1.2, -1.6], rim: MOON, rimW: 1.1, inkC: TEAL, ink: { w: 1.1 }, extra: (s) => [{ d: rings(d, w, 0.5, [], 0) + inkD(d, { w: 0.4 }), fill: TEAL, alpha: 0.35, clip: s.c }] }))
  }
  const mid = shape('M39 84 C42 82 48 82 51 84 C49 88 45 89 41 88 C40 87 39 86 39 84 Z', 0.05)
  p.push(...draw(mid, { fill: '#f4fcff', sh: SSH, shift: [-1, -1], inkC: TEAL, ink: { w: 0.9 } }))
  // wispy beard streaming down into the collar
  const beard = shape('M44 104 C50 110 60 112 72 108 C76 112 76 120 72 126 C74 132 78 136 83 138 C76 141 70 139 66 135 C64 141 66 147 70 151 C62 149 58 143 58 135 C54 139 52 145 52 150 C47 144 47 136 50 128 C46 120 43 112 44 104 Z')
  p.push(
    ...draw(beard, {
      ...ghostLook,
      shift: [-2.5, -2],
      ink: { w: 1.1, gap: 0.72 },
      extra: (s) => [{ d: inkD('M52 110 C56 118 56 126 54 134 M60 112 C64 120 64 130 62 140 M68 112 C70 120 72 128 76 134 M56 124 C58 132 58 140 56 146', { w: 0.5 }), fill: TEAL, alpha: 0.5, clip: s.c }],
    }),
  )

  offsetPaths(p.slice(headStart), 0, 3)
  const hatStart = p.length
  // ---- tricorn hat (tilted rakishly) -----------------------------------------------
  const crown = shape('M46 16 C52 2 80 -3 100 6 C104 10 106 14 106 20 Z')
  p.push(...draw(crown, { fill: HAT, sh: 'rgba(0,0,10,0.5)', shift: [-6, -3], rim: MOON, ink: { w: 1.6 } }))
  const farWall = shape('M7 34 C4 24 8 14 18 8 C22 6 26 4 31 3 C35 6 39 9 43 13 L30 26 Z')
  p.push(...draw(farWall, { fill: lin(6, 4, 40, 30, 0, '#1c1c28', 1, '#08080e'), hl: '160,200,255', hlW: 1, ink: { w: 1.5 } }))
  const under = shape('M6 34 C12 40 24 44 40 46 C64 50 100 52 134 54 C130 58 120 58 108 57 C84 56 58 54 38 52 C22 49 12 42 6 34 Z')
  p.push(...draw(under, { fill: '#0c0c14', rim: MOON, rimW: 1, ink: { w: 1.5 } }))
  const wall = shape('M6 34 C16 18 44 6 72 6 C98 6 120 22 134 46 C136 49 136 52 134 54 C112 52 88 50 66 48 C46 46 26 42 14 40 C9 39 6 37 6 34 Z')
  p.push(
    ...draw(wall, {
      fill: HAT,
      sh: 'rgba(0,0,10,0.55)',
      shift: [-7, -6],
      rim: MOON,
      rimW: 2,
      hl: '200,220,255',
      hlW: 2.6,
      hatch: { ...hatchC, color: '#000000' },
      ink: { w: 2, gap: 0.85 },
      extra: (s) => [
        { d: inkD('M10 33 C20 19 46 9.5 72 9.5 C98 9.5 118 24 131 46', { w: 1.9, wob: 0.1 }), fill: GOLDT, clip: s.c },
        { d: inkD('M11 35.5 C21 22 46 12.5 72 12.5', { w: 0.5 }), fill: 'rgba(120,70,0,0.5)', clip: s.c },
        // leather creases
        { d: inkD('M26 36 C32 30 40 26 48 25 M96 30 C104 34 110 40 114 46 M58 42 C62 40 68 40 72 41', { w: 0.6 }), fill: '#000000', alpha: 0.65, clip: s.c },
        { d: inkD('M27 34.5 C33 28.5 41 24.5 49 23.5 M97 28.5 C105 32.5 111 38.5 115 44.5', { w: 0.5 }), fill: 'rgba(170,200,255,0.4)', clip: s.c },
      ],
    }),
  )
  // skull & crossbones emblem (tiny detail)
  {
    const bones = sym([57, 22], [64, 27], [71, 33], 1.5) + sym([71, 22], [64, 27], [57, 33], 1.5)
    let knobs = ''
    for (const [x, y] of [[56.5, 21], [57.8, 20.4], [71.5, 21], [70.2, 20.4], [56.5, 33.5], [57.8, 34.2], [71.5, 33.5], [70.2, 34.2]]) knobs += `M${x - 0.9} ${y}C${x - 0.9} ${y - 0.6} ${x - 0.5} ${y - 0.9} ${x} ${y - 0.9}C${x + 0.5} ${y - 0.9} ${x + 0.9} ${y - 0.5} ${x + 0.9} ${y}C${x + 0.9} ${y + 0.5} ${x + 0.5} ${y + 0.9} ${x} ${y + 0.9}C${x - 0.5} ${y + 0.9} ${x - 0.9} ${y + 0.5} ${x - 0.9} ${y}Z`
    p.push(inkP(bones + knobs, '#efe9d8'))
    const skull = shape('M60 25 C60 21.2 61.8 19 64.2 19 C66.6 19 68.4 21.2 68.4 25 C68.4 26.8 67.4 27.8 66.6 28.3 L66.4 30 C65 30.6 63.4 30.6 62 30 L61.8 28.3 C61 27.8 60 26.8 60 25 Z', 0.04)
    p.push(fillP(skull.d, lin(60, 19, 68, 30, 0, '#fffdf2', 1, '#c8c0a8')), inkP(outline(skull, { w: 0.6, min: 0.5 })))
    p.push(fillP('M61.4 24.6 C61.6 23.4 62.8 23 63.6 23.8 C63.8 25 63 25.8 62 25.6 C61.6 25.4 61.4 25 61.4 24.6 Z M64.8 23.8 C65.6 23 66.8 23.4 67 24.6 C67 25 66.8 25.4 66.4 25.6 C65.4 25.8 64.6 25 64.8 23.8 Z M63.6 27.4 L64.2 26.2 L64.8 27.4 Z', INK))
  }

  offsetPaths(p.slice(hatStart), 0, -3)
  // cast shadow of the brim across the brow
  p.push(mult('M30 42 C50 46 80 50 104 54 C102 58 96 60 90 60 C72 58 52 56 34 54 C32 50 30 46 30 42 Z', 'rgba(40,100,140,0.5)', shiftD(head.d, 0, 3)))

  // ---- spectral mist swirling round the hem: the bust's soft bottom edge ----------
  const mist = shape(
    'M-8 202 C-9 195 -4 189 3 190 C4 185 10 183 15 186 C17 180 26 179 30 185 C32 183 37 183 39 187 C43 182 52 182 55 189 C58 187 62 188 63 191 C67 185 77 185 80 191 C83 189 87 190 88 193 C92 186 103 185 106 191 C108 189 112 189 113 192 C117 184 129 183 132 190 C137 186 145 189 147 195 C150 199 150 203 148 205 L-6 205 Z',
  )
  p.push(...dab(70, 196, 80, 12, 0, MOON, 0.35, 'screen'))
  p.push(fillP(mist.d, lin(0, 181, 0, 204, 0, 'rgba(225,250,255,0.42)', 0.45, 'rgba(185,238,250,0.72)', 1, 'rgba(150,220,240,0.9)')))
  p.push(...dab(28, 194, 10, 5, 0, '255,255,255', 0.6, 'screen', mist.c), ...dab(98, 195, 12, 5, 0, '255,255,255', 0.5, 'screen', mist.c))
  p.push(mult(band(mist, [0.4, 0.9], 6, 1), 'rgba(60,140,180,0.45)', mist.c))
  p.push(inkP(outline(mist, { w: 1.1, gap: 0.55, min: 0.2 }), TEAL, 0.75))
  p.push(inkP(inkD('M8 196 C12 191 20 191 23 196 M42 197 C46 193 52 194 53 198 M70 195 C73 192 78 192 80 195 M92 197 C96 193 102 193 104 197 M116 195 C120 191 126 191 128 195', { w: 0.55 }), TEAL, 0.45))
  // tendrils curling up out of the mist and the cuffs
  for (const [d, w] of [
    ['M6 191 C0 186 -2 178 2 174 C5 171 9 173 8 176', 2.6],
    ['M136 190 C142 184 144 176 140 172 C137 170 134 172 135 175', 2.6],
    ['M118 188 C122 193 128 195 133 193', 2],
  ] as [string, number][]) {
    const t = tube(d, w, 0.3)
    p.push({ d: t.d, fill: 'rgba(210,248,255,0.75)' }, inkP(outline(t, { w: 0.6, gap: 0.6 }), TEAL, 0.6))
  }

  p.push(...front)
  p.push(...grain(coat.c + slvN.c + wall.c + crown.c, [0, 0, 140, 200], 420, 12, '20,0,10', '255,220,230'))
  p.push(...grain(head.c, [28, 44, 112, 116], 120, 13, '0,40,60', '255,255,255'))
  scalePaths(p, 0.95, 70, 202)
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths: p }
}
