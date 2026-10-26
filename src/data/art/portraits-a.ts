import type { Paint, VectorPath } from '../../types'
import { circ as kcirc, lin as klin, rad as krad, radLit as kradLit, rng, type Art } from './kit'
import { PORTRAIT_W, PORTRAIT_H } from './portrait-kit'

// Knight and wizard portraits (140 × 200), drawn "by hand": every body part is a
// spline through hand-placed points (with a little wobble), outlines are filled
// tapered ribbons whose width follows the light (thin and broken on the lit side,
// heavy on the shadow side), shadows are hand-shaped cel patches with hatching.

// ---- hand-drawing toolkit ----------------------------------------------------------
type P = [number, number]
type Pt = number[] // [x, y] or [x, y, 1] for a sharp corner
const TAU = Math.PI * 2
const LX = 0.6 // direction the key light travels (from the upper-left)
const LY = 0.8
const f = (v: number) => Math.round(v * 10) / 10

// Current group transform (head tilt), applied by every emitter below, so a whole
// group of finished parts — shapes, clips, dots and gradients — turns together.
let XF: { cx: number; cy: number; c: number; s: number } | null = null
function tiltOn(cx: number, cy: number, deg: number): void {
  const a = (deg * Math.PI) / 180
  XF = { cx, cy, c: Math.cos(a), s: Math.sin(a) }
}
function tiltOff(): void {
  XF = null
}
function X(x: number, y: number): P {
  if (!XF) return [x, y]
  const dx = x - XF.cx
  const dy = y - XF.cy
  return [XF.cx + dx * XF.c - dy * XF.s, XF.cy + dx * XF.s + dy * XF.c]
}
const xy = (x: number, y: number): string => {
  if (!XF) return f(x) + ' ' + f(y)
  const dx = x - XF.cx
  const dy = y - XF.cy
  return f(XF.cx + dx * XF.c - dy * XF.s) + ' ' + f(XF.cy + dx * XF.s + dy * XF.c)
}
const circ = (x: number, y: number, r: number) => {
  const p = X(x, y)
  return kcirc(p[0], p[1], r)
}
const lin = (x0: number, y0: number, x1: number, y1: number, ...stops: (number | string)[]) => {
  const a = X(x0, y0)
  const b = X(x1, y1)
  return klin(a[0], a[1], b[0], b[1], ...stops)
}
const rad = (cx: number, cy: number, r: number, ...stops: (number | string)[]) => {
  const a = X(cx, cy)
  return krad(a[0], a[1], r, ...stops)
}
const radLit = (cx: number, cy: number, r: number, ...stops: (number | string)[]) => {
  const a = X(cx, cy)
  return kradLit(a[0], a[1], r, ...stops)
}
const rgba = (c: string, a: number) => `rgba(${c},${a})`

function cubic(s: number[], t: number): P {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [a * s[0] + b * s[2] + c * s[4] + d * s[6], a * s[1] + b * s[3] + c * s[5] + d * s[7]]
}

// Catmull-Rom through the points, as cubic bézier segments.
function segsOf(pts: Pt[], closed: boolean): number[][] {
  const n = pts.length
  const g = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  const out: number[][] = []
  const cnt = closed ? n : n - 1
  for (let i = 0; i < cnt; i++) {
    const p0 = g(i - 1)
    const p1 = g(i)
    const p2 = g(i + 1)
    const p3 = g(i + 2)
    const k1 = p1[2] ? 0 : 1 / 6
    const k2 = p2[2] ? 0 : 1 / 6
    out.push([
      p1[0], p1[1],
      p1[0] + (p2[0] - p0[0]) * k1, p1[1] + (p2[1] - p0[1]) * k1,
      p2[0] - (p3[0] - p1[0]) * k2, p2[1] - (p3[1] - p1[1]) * k2,
      p2[0], p2[1],
    ])
  }
  return out
}

function cr(pts: Pt[], closed = true): string {
  let d = 'M' + xy(pts[0][0], pts[0][1])
  for (const s of segsOf(pts, closed)) d += 'C' + xy(s[2], s[3]) + ' ' + xy(s[4], s[5]) + ' ' + xy(s[6], s[7])
  return closed ? d + 'Z' : d
}

function samp(pts: Pt[], closed = true, step = 0.6): P[] {
  const out: P[] = []
  for (const s of segsOf(pts, closed)) {
    const len = Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[2], s[5] - s[3]) + Math.hypot(s[6] - s[4], s[7] - s[5])
    const n = Math.max(2, Math.ceil(len / step))
    for (let i = 0; i < n; i++) out.push(cubic(s, i / n))
  }
  if (!closed) {
    const l = pts[pts.length - 1]
    out.push([l[0], l[1]])
  }
  return out
}

// Ramer–Douglas–Peucker: drop points closer than `tol` to the simplified line.
function rdp(S: P[], tol: number): P[] {
  const n = S.length
  if (n < 3) return S
  const keep = new Uint8Array(n)
  keep[0] = 1
  keep[n - 1] = 1
  const t2 = tol * tol
  const stack: number[] = []
  const ex = S[n - 1][0] - S[0][0]
  const ey = S[n - 1][1] - S[0][1]
  if (ex * ex + ey * ey < 0.01) {
    // closed outline whose ends meet: split at the point farthest from the start
    let far = 1
    let fd = -1
    for (let i = 1; i < n - 1; i++) {
      const d2 = (S[i][0] - S[0][0]) ** 2 + (S[i][1] - S[0][1]) ** 2
      if (d2 > fd) {
        fd = d2
        far = i
      }
    }
    keep[far] = 1
    stack.push(0, far, far, n - 1)
  } else stack.push(0, n - 1)
  while (stack.length) {
    const b = stack.pop() as number
    const a = stack.pop() as number
    const [ax, ay] = S[a]
    const dx = S[b][0] - ax
    const dy = S[b][1] - ay
    const l2 = dx * dx + dy * dy || 1e-9
    let best = -1
    let bi = -1
    for (let i = a + 1; i < b; i++) {
      const px = S[i][0] - ax
      const py = S[i][1] - ay
      const cr2 = px * dy - py * dx
      const d2 = (cr2 * cr2) / l2
      if (d2 > best) {
        best = d2
        bi = i
      }
    }
    if (bi > 0 && best > t2) {
      keep[bi] = 1
      stack.push(a, bi, bi, b)
    }
  }
  const out: P[] = []
  for (let i = 0; i < n; i++) if (keep[i]) out.push(S[i])
  return out
}
const poly = (S: P[], tol = 0.1) => {
  const R = rdp(S, tol)
  let d = 'M' + xy(R[0][0], R[0][1])
  for (let i = 1; i < R.length; i++) d += 'L' + xy(R[i][0], R[i][1])
  return d + 'Z'
}

function area(S: Pt[]): number {
  let a = 0
  for (let i = 0; i < S.length; i++) {
    const p = S[i]
    const q = S[(i + 1) % S.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a
}

// Outward normals (closed) or (ty, -tx) normals (open).
function normals(S: P[], closed: boolean): P[] {
  const n = S.length
  const sgn = closed && area(S) < 0 ? -1 : 1
  return S.map((_, i) => {
    const a = S[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
    const b = S[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
    let tx = b[0] - a[0]
    let ty = b[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l
    ty /= l
    return [sgn * ty, -sgn * tx]
  })
}

function arcLen(S: P[]): number[] {
  const L = [0]
  for (let i = 1; i < S.length; i++) L.push(L[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]))
  return L
}

// A filled band of varying width around a sampled line; zero-width runs break it.
function ribbon(S: P[], N: P[], ws: number[], closed: boolean, off = 0): string {
  const eps = 0.04
  const n = S.length
  const side = (i: number, s: number): P => [S[i][0] + N[i][0] * (off + (s * ws[i]) / 2), S[i][1] + N[i][1] * (off + (s * ws[i]) / 2)]
  if (closed && ws.every((w) => w > eps)) {
    const A: P[] = new Array(n)
    const B: P[] = new Array(n)
    for (let i = 0; i < n; i++) {
      A[i] = side(i, 1)
      B[n - 1 - i] = side(i, -1)
    }
    return poly(A) + poly(B)
  }
  const start = closed ? ws.findIndex((w) => w <= eps) : 0
  const idx = Array.from({ length: closed ? n + 1 : n }, (_, k) => (start + k) % n)
  let d = ''
  let run: number[] = []
  const flush = () => {
    const m = run.length
    if (m > 1) {
      const Q: P[] = new Array(2 * m)
      for (let k = 0; k < m; k++) {
        Q[k] = side(run[k], 1)
        Q[2 * m - 1 - k] = side(run[k], -1)
      }
      d += poly(Q)
    }
    run = []
  }
  for (const i of idx) {
    if (ws[i] > eps) run.push(i)
    else flush()
  }
  flush()
  return d
}

function interp(a: number[], t: number): number {
  if (a.length === 1) return a[0]
  const x = Math.max(0, Math.min(1, t)) * (a.length - 1)
  const i = Math.min(a.length - 2, Math.floor(x))
  return a[i] + (a[i + 1] - a[i]) * (x - i)
}

interface TL {
  w: number
  closed?: boolean
  ta?: number // start taper (fraction of length)
  tb?: number // end taper
  light?: number // 0..1: how much the width follows the light (thick in shadow)
  cut?: number // subtracted from the width: breaks the line where it is thin
  jit?: number // pen-pressure variation
  seed?: number
  prof?: number[] // explicit width multipliers along the line
  off?: number
}

// Tapered, pressure-varying ink line (returned as a filled outline).
function tl(pts: Pt[], o: TL): string {
  const closed = !!o.closed
  const S = samp(pts, closed, o.w < 0.8 ? 1.4 : Math.max(0.8, Math.min(1.6, o.w * 0.7)))
  if (S.length < 2) return ''
  const N = normals(S, closed)
  const L = arcLen(S)
  const tot = L[L.length - 1] || 1
  const R = rng(o.seed ?? 3)
  const p1 = R() * TAU
  const p2 = R() * TAU
  const p3 = R() * TAU
  const jit = o.jit ?? 0.3
  const ws = S.map((_, i) => {
    const t = L[i] / tot
    let w = o.w
    if (o.prof) w *= interp(o.prof, t)
    if (!closed) {
      const ta = o.ta ?? 0.3
      const tb = o.tb ?? 0.3
      if (ta > 0) w *= Math.pow(Math.min(1, t / ta), 0.6)
      if (tb > 0) w *= Math.pow(Math.min(1, (1 - t) / tb), 0.6)
    }
    if (o.light) {
      const k = (N[i][0] * LX + N[i][1] * LY + 1) / 2
      w *= 1 - o.light + o.light * (0.06 + 1.55 * k * k)
    }
    const s = L[i]
    w *= 1 + jit * (0.55 * Math.sin(s * 0.31 + p1) + 0.3 * Math.sin(s * 0.97 + p2) + 0.15 * Math.sin(s * 2.3 + p3))
    return w - (o.cut ?? 0)
  })
  return ribbon(S, N, ws, closed, o.off ?? 0)
}

// Light / rim / thickness band hugging the inside of the edges that face `dir`.
function edge(pts: Pt[], dir: P, o: { w: number; inset: number; th?: number; seed?: number; jit?: number }): string {
  const S = samp(pts, true, 1.1)
  const N = normals(S, true)
  const l = Math.hypot(dir[0], dir[1])
  const dx = dir[0] / l
  const dy = dir[1] / l
  const th = o.th ?? 0.3
  const R = rng(o.seed ?? 5)
  const p1 = R() * TAU
  const p2 = R() * TAU
  const L = arcLen(S)
  const ws = S.map((_, i) => {
    const k = Math.max(0, Math.min(1, (N[i][0] * dx + N[i][1] * dy - th) / (1 - th)))
    const s = L[i]
    return o.w * Math.pow(k, 0.8) * (1 + (o.jit ?? 0.35) * (0.6 * Math.sin(s * 0.4 + p1) + 0.4 * Math.sin(s * 1.3 + p2)))
  })
  return ribbon(S, N, ws, true, -o.inset)
}

interface LK {
  w: number
  p?: number // tip sharpness
  bulge?: number
  asym?: number // share of the width on the normal side
  root?: number // root taper length (fraction), 0 = blunt root
  serr?: number // jagged barbs along the edges (feathers, hair tufts)
  per?: number // barb spacing
}
interface Lock {
  d: string
  cd: string // coarse outline, used as a clip
  S: P[]
  A: P[]
  B: P[]
  shadeD: string // half facing away from the light
  litA: boolean // true when the A side faces the light
}

// A clump of hair / feather / beard: flowing S-curve with a pointed tip.
function lock(spine: Pt[], o: LK): Lock {
  const S = samp(spine, false, o.serr ? 0.75 : 1.1)
  const N = normals(S, false)
  const L = arcLen(S)
  const tot = L[L.length - 1] || 1
  const asym = o.asym ?? 0.5
  const A: P[] = []
  const B: P[] = []
  let dot = 0
  // irregular barb rhythm (each tooth its own length) for feathers / tufts
  const teeth = (seed: number) => {
    const R = rng(seed)
    const cuts = [0]
    while (cuts[cuts.length - 1] < tot) cuts.push(cuts[cuts.length - 1] + (o.per ?? 3) * (0.55 + R() * 0.9))
    let j = 1 // samples arrive in order along the spine: walk the cuts forward only
    return (s: number) => {
      while (j < cuts.length - 1 && cuts[j] < s) j++
      const fr = (s - cuts[j - 1]) / (cuts[j] - cuts[j - 1])
      return Math.pow(Math.max(0, Math.min(1, fr)), 2.2)
    }
  }
  const ta = teeth(Math.round(o.w * 31 + tot))
  const tb = teeth(Math.round(o.w * 17 + tot * 3))
  S.forEach((p, i) => {
    const t = L[i] / tot
    let w = o.w * Math.pow(1 - t, o.p ?? 0.8) * (1 + (o.bulge ?? 0.3) * Math.sin(Math.PI * t))
    if (o.root) w *= Math.pow(Math.min(1, t / o.root), 0.55)
    let wa = w
    let wb = w
    if (o.serr) {
      const g = Math.min(1, t / 0.25)
      wa *= 1 + o.serr * g * (ta(L[i]) - 0.35)
      wb *= 1 + o.serr * g * (tb(L[i]) - 0.35)
    }
    w = (wa + wb) / 2
    A.push([p[0] + N[i][0] * wa * asym, p[1] + N[i][1] * wa * asym])
    B.push([p[0] - N[i][0] * wb * (1 - asym), p[1] - N[i][1] * wb * (1 - asym)])
    dot += N[i][0] * LX + N[i][1] * LY
  })
  const rs = [...S].reverse()
  const ring = [...A, ...[...B].reverse()]
  return { d: poly(ring), cd: poly(ring, 0.35), S, A, B, shadeD: poly([...(dot > 0 ? A : B), ...rs]), litA: dot <= 0 }
}

function inside(S: P[], x: number, y: number): boolean {
  let c = false
  for (let i = 0, j = S.length - 1; i < S.length; j = i++) {
    const [xi, yi] = S[i]
    const [xj, yj] = S[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

// Cheap tapered stroke for hatching / texture: two quadratic sides meeting in sharp tips.
function lens(a: Pt, m: Pt, b: Pt, w: number): string {
  let nx = b[1] - a[1]
  let ny = a[0] - b[0]
  const l = Math.hypot(nx, ny) || 1
  nx = (nx / l) * w
  ny = (ny / l) * w
  const cx = 2 * m[0] - (a[0] + b[0]) / 2
  const cy = 2 * m[1] - (a[1] + b[1]) / 2
  const s0 = xy(a[0], a[1])
  return `M${s0}Q${xy(cx + nx, cy + ny)} ${xy(b[0], b[1])}Q${xy(cx - nx, cy - ny)} ${s0}Z`
}

interface HT {
  ang: number // degrees
  gap: number
  w: number
  seed?: number
  bend?: number
  shrink?: number
  jitA?: number
  within?: P[] // keep only strokes whose middle lies in here
  max?: number // longest single stroke
}

// Hand hatching: tapered, slightly curved, irregular strokes filling the rings (even-odd).
function hatch(rings: P[][], o: HT): string {
  const a = (o.ang * Math.PI) / 180
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const toH = (p: P): P => [p[0] * ca + p[1] * sa, -p[0] * sa + p[1] * ca]
  const fromH = (u: number, v: number): Pt => [u * ca - v * sa, u * sa + v * ca]
  const Rr = rings.map((r) => r.map(toH))
  let vmin = Infinity
  let vmax = -Infinity
  for (const r of Rr) for (const p of r) {
    vmin = Math.min(vmin, p[1])
    vmax = Math.max(vmax, p[1])
  }
  const R = rng(o.seed ?? 11)
  let d = ''
  for (let v = vmin + o.gap * (0.3 + R() * 0.5); v < vmax; v += o.gap * (0.75 + R() * 0.5)) {
    const xs: number[] = []
    for (const r of Rr) {
      for (let i = 0; i < r.length; i++) {
        const p = r[i]
        const q = r[(i + 1) % r.length]
        if (p[1] <= v !== q[1] <= v) xs.push(p[0] + ((v - p[1]) / (q[1] - p[1])) * (q[0] - p[0]))
      }
    }
    xs.sort((m, n) => m - n)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const len = xs[i + 1] - xs[i]
      if (len < 1.2) continue
      const sh = o.shrink ?? 0.35
      let u0 = xs[i] + len * sh * R() * 0.5 + 0.2
      const u1 = xs[i + 1] - len * sh * R() * 0.5 - 0.2
      const max = o.max ?? 14
      while (u1 - u0 > 0.9) {
        const e = Math.min(u1, u0 + max * (0.7 + R() * 0.3))
        const mid = fromH((u0 + e) / 2, v)
        if (!o.within || inside(o.within, mid[0], mid[1])) {
          const vv = v + (R() - 0.5) * o.gap * 0.3
          const tilt = (R() - 0.5) * (o.jitA ?? 0.14) * (e - u0)
          const bend = (o.bend ?? 0.06) * (e - u0) * (0.5 + R())
          d += lens(fromH(u0, vv - tilt / 2), fromH((u0 + e) / 2, vv - bend), fromH(e, vv + tilt / 2), o.w * (0.7 + R() * 0.6))
        }
        u0 = e + 0.8 + R() * 1.5
      }
    }
  }
  return d
}

// Tiny dots (stubble, grain, sparkle dust) inside a region.
function specks(region0: P[], n: number, r0: number, r1: number, seed: number): string {
  const region = rdp(region0, 0.5)
  const R = rng(seed)
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of region) {
    x0 = Math.min(x0, p[0])
    y0 = Math.min(y0, p[1])
    x1 = Math.max(x1, p[0])
    y1 = Math.max(y1, p[1])
  }
  let d = ''
  let tries = 0
  let made = 0
  while (made < n && tries < n * 8) {
    tries++
    const x = x0 + R() * (x1 - x0)
    const y = y0 + R() * (y1 - y0)
    if (region.length > 4 && !inside(region, x, y)) continue
    const r = r0 + R() * (r1 - r0)
    d += `M${xy(x, y - r)}l${f(r)} ${f(r)}l${f(-r)} ${f(r)}l${f(-r)} ${f(-r)}Z`
    made++
  }
  return d
}

function wob(pts: Pt[], amp: number, seed: number): Pt[] {
  const R = rng(seed)
  return pts.map((p) => (p[2] ? [p[0] + (R() - 0.5) * amp, p[1] + (R() - 0.5) * amp, 1] : [p[0] + (R() - 0.5) * amp * 2, p[1] + (R() - 0.5) * amp * 2]))
}
const mv = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map((p) => [p[0] + dx, p[1] + dy, ...p.slice(2)])
const cw = (pts: Pt[]): Pt[] => (area(pts) < 0 ? [...pts].reverse() : pts)

// Short random strokes inside a region (metal scratches, fabric weave, skin texture).
function scratches(region: P[], n: number, len: number, ang: number, spread: number, w: number, seed: number): string {
  const R = rng(seed)
  const pts = specksPts(rdp(region, 0.6), n, R)
  let d = ''
  pts.forEach(([x, y]) => {
    const a = ((ang + (R() - 0.5) * spread) * Math.PI) / 180
    const l = len * (0.4 + R() * 0.8)
    const bx = Math.cos(a) * l
    const by = Math.sin(a) * l
    d += lens([x - bx / 2, y - by / 2], [x + (R() - 0.5) * 0.6, y + (R() - 0.5) * 0.6], [x + bx / 2, y + by / 2], w * (0.6 + R() * 0.7))
  })
  return d
}
function specksPts(region: P[], n: number, R: () => number): P[] {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of region) {
    x0 = Math.min(x0, p[0])
    y0 = Math.min(y0, p[1])
    x1 = Math.max(x1, p[0])
    y1 = Math.max(y1, p[1])
  }
  const out: P[] = []
  let tries = 0
  while (out.length < n && tries < n * 10) {
    tries++
    const x = x0 + R() * (x1 - x0)
    const y = y0 + R() * (y1 - y0)
    if (inside(region, x, y)) out.push([x, y])
  }
  return out
}

// ---- part painting -----------------------------------------------------------------
interface Look {
  base: Paint
  shade: string // multiplied core-shadow colour
  off?: P // how far toward the light the shadow terminator sits
  seed: number
  ink: string
  inkW: number
  cut?: number
  lit?: string // bevel light along the edges facing the key
  litW?: number
  rim?: string // "r,g,b" rim light on the right edges
  rimW?: number
  hatch?: { ang: number; gap: number; w: number; color: string; alpha: number; bend?: number }
  under?: string // thickness band on the downward edges
  top?: string // cast shadow from the plate above, along the upper edge
  topW?: number
  lip?: string // bright rolled edge along the lower edge
  sky?: string // painterly tint on the faces turned up (environment / sky)
  warm?: string // tint on the faces turned down-right (ground bounce)
}

// One painted volume: base, hand-shaped cel shadow following the silhouette,
// hatching inside the shadow, bevel light, rim light and a light-aware ink outline.
function paint(pts0: Pt[], L: Look): VectorPath[] {
  const pts = cw(pts0)
  const d = cr(pts)
  const ring = samp(pts, true, 2)
  const out: VectorPath[] = [{ d, fill: L.base }]
  const [ox, oy] = L.off ?? [-7, -7]
  const sh = wob(mv(pts, ox, oy), 2.2, L.seed + 7)
  out.push({ d: d + cr(sh), rule: 'evenodd', fill: L.shade, clip: d, blend: 'multiply' })
  if (L.hatch) {
    const h = L.hatch
    out.push({
      d: hatch([ring, samp(sh, true, 2)], { ang: h.ang, gap: h.gap, w: h.w, seed: L.seed, within: pts as P[], bend: h.bend }),
      fill: h.color,
      alpha: h.alpha,
      clip: d,
    })
  }
  if (L.under) out.push({ d: edge(pts, [0.2, 1], { w: 2.6, inset: 1.2, th: 0.45, seed: L.seed + 1 }), fill: L.under, clip: d, blend: 'multiply' })
  if (L.sky) out.push({ d: edge(pts, [-0.3, -1], { w: 9, inset: 3.5, th: 0.1, seed: L.seed + 8, jit: 0.3 }), fill: L.sky, clip: d, blend: 'screen' })
  if (L.warm) out.push({ d: edge(pts, [0.5, 1], { w: 7, inset: 4, th: 0.2, seed: L.seed + 9, jit: 0.3 }), fill: L.warm, clip: d, blend: 'screen' })
  if (L.top) out.push({ d: edge(pts, [0, -1], { w: L.topW ?? 5, inset: 0, th: 0.5, seed: L.seed + 5, jit: 0.5 }), fill: L.top, clip: d, blend: 'multiply' })
  if (L.lip) out.push({ d: edge(pts, [-0.2, 1], { w: 1.3, inset: 1.3, th: 0.55, seed: L.seed + 6 }), fill: L.lip })
  if (L.lit) out.push({ d: edge(pts, [-0.65, -0.75], { w: L.litW ?? 1.6, inset: Math.max(1.6, (L.litW ?? 1.6) * 0.6 + 0.4), th: 0.35, seed: L.seed + 2 }), fill: L.lit })
  if (L.rim) out.push({ d: edge(pts, [1, 0.1], { w: L.rimW ?? 2.6, inset: Math.max(1.5, (L.rimW ?? 2.6) * 0.5 + 0.3), th: 0.25, seed: L.seed + 3 }), fill: rgba(L.rim, 0.9), blend: 'screen' })
  out.push({ d: tl(pts, { closed: true, w: L.inkW, light: 0.85, cut: L.cut ?? L.inkW * 0.12, seed: L.seed + 4 }), fill: L.ink })
  if (L.inkW >= 2.4) out.push({ d: tl(mv(wob(pts, 0.5, L.seed + 12), 0.8, -0.6), { closed: true, w: 0.9, cut: 0.45, jit: 1.3, seed: L.seed + 13 }), fill: L.ink, alpha: 0.35 })
  return out
}

// Hand-shaped colour patch (painterly), optional soft edge via a radial paint.
const blot = (pts: Pt[], fill: Paint, alpha: number, clip?: string, blend?: GlobalCompositeOperation, seed = 1): VectorPath => ({
  d: cr(wob(pts, 0.5, seed)),
  fill,
  alpha,
  clip,
  blend,
})
const soft = (x: number, y: number, r: number, c: string, a: number, clip?: string, blend?: GlobalCompositeOperation): VectorPath => ({
  d: circ(x, y, r),
  fill: rad(x, y, r, 0, rgba(c, a), 0.55, rgba(c, a * 0.45), 1, rgba(c, 0)),
  clip,
  blend,
})
const line = (pts: Pt[], w: number, fill: Paint, o: Partial<TL> = {}, clip?: string, alpha?: number): VectorPath => ({
  d: tl(pts, { w, ta: 0.3, tb: 0.35, ...o }),
  fill,
  clip,
  alpha,
})

// Four-point specular glint (metal, glass, eyes).
function glint(x: number, y: number, r: number): string {
  const k = r * 0.22
  return cr([[x, y - r, 1], [x + k, y - k, 1], [x + r, y, 1], [x + k, y + k, 1], [x, y + r, 1], [x - k, y + k, 1], [x - r, y, 1], [x - k, y - k, 1]])
}

// Painted clump (feather / lock of hair / beard strand) with its own light and shadow.
function clump(spine: Pt[], o: LK & { base: Paint; shade: string; hi: string; ink: string; inkW: number; seed: number; strands?: number; strandC?: string; rim?: string; k?: Lock }): VectorPath[] {
  const k = o.k ?? lock(spine, o)
  const out: VectorPath[] = [{ d: k.d, fill: o.base }]
  out.push({ d: k.shadeD, fill: o.shade, clip: k.cd, blend: 'multiply' })
  // highlight streak along the lit half, offset off the spine
  const hiPts: Pt[] = []
  const n = k.S.length
  for (let i = Math.floor(n * 0.08); i < n * 0.8; i += Math.max(1, Math.floor(n / 9))) {
    const lt = k.litA ? k.A[i] : k.B[i]
    hiPts.push([k.S[i][0] * 0.55 + lt[0] * 0.45, k.S[i][1] * 0.55 + lt[1] * 0.45])
  }
  if (hiPts.length > 2) out.push({ d: tl(hiPts, { w: o.w * 0.22, ta: 0.3, tb: 0.6, jit: 0.4, seed: o.seed }), fill: o.hi, clip: k.cd })
  if (o.strands) {
    const R = rng(o.seed + 9)
    let d = ''
    for (let s = 0; s < o.strands; s++) {
      const fr = 0.18 + R() * 0.64
      const t0 = R() * 0.25
      const t1 = 0.55 + R() * 0.4
      const pts: Pt[] = []
      for (let i = Math.floor(n * t0); i < n * t1; i += Math.max(1, Math.floor(n / 8))) {
        pts.push([k.A[i][0] * fr + k.B[i][0] * (1 - fr), k.A[i][1] * fr + k.B[i][1] * (1 - fr)])
      }
      if (pts.length > 2) d += tl(pts, { w: 0.55 + R() * 0.35, ta: 0.3, tb: 0.5, jit: 0.3, seed: o.seed + s })
    }
    out.push({ d, fill: o.strandC ?? o.ink, alpha: 0.55, clip: k.cd })
  }
  if (o.rim) out.push({ d: edge(cw(k.A.concat([...k.B].reverse())), [1, 0.1], { w: 1.8, inset: 1.1, th: 0.3, seed: o.seed }), fill: rgba(o.rim, 0.85), blend: 'screen' })
  const contour = cw([...k.A, ...[...k.B].reverse()])
  out.push({ d: ribbonClosed(contour, o.inkW, o.seed), fill: o.ink })
  return out
}
// Light-aware closed ink around an already dense polygon.
function ribbonClosed(S: Pt[], w: number, seed: number): string {
  const P2 = S.map((p): P => [p[0], p[1]])
  const N = normals(P2, true)
  const L = arcLen(P2)
  const R = rng(seed)
  const p1 = R() * TAU
  const ws = P2.map((_, i) => {
    const k = (N[i][0] * LX + N[i][1] * LY + 1) / 2
    return w * (0.08 + 1.5 * k * k) * (1 + 0.3 * Math.sin(L[i] * 0.37 + p1)) - w * 0.15
  })
  return ribbon(P2, N, ws, true)
}

// ---- Knight: Sire Boulon ------------------------------------------------------
export function knight(): Art {
  const RIM = '255,180,105'
  const SINK = '#1d2233'
  const WINK = '#3a1a10'
  const out: VectorPath[] = []
  const steel = (seed: number, o: Partial<Look> = {}): Look => ({
    base: lin(0, 120, 0, 200, 0, '#e9eef6', 0.45, '#a9b4c6', 1, '#7c8597'),
    shade: '#6c7593',
    seed,
    ink: SINK,
    inkW: 2.6,
    lit: 'rgba(255,255,255,0.85)',
    rim: RIM,
    hatch: { ang: 62, gap: 2, w: 0.45, color: '#232a44', alpha: 0.32 },
    sky: 'rgba(120,180,255,0.32)',
    ...o,
  })

  // -- plume (behind the helmet), clumps sweeping back in the wind
  const plumeLook = { base: lin(20, 0, 90, 40, 0, '#ff6a52', 0.6, '#d8262a', 1, '#9a1420'), shade: '#b0404c', hi: 'rgba(255,200,170,0.85)', ink: '#5a0c14', inkW: 1, strandC: '#7a0d16', rim: RIM }
  const plumes: [Pt[], number, number][] = [
    [[[78, 32], [64, 32], [50, 37], [38, 47], [31, 60], [30, 72], [33, 78]], 13, 0.5],
    [[[79, 30], [62, 26], [46, 27], [32, 35], [22, 48], [18, 62]], 15, 0.45],
    [[[80, 29], [66, 18], [48, 14], [32, 17], [19, 27], [11, 41]], 15, 0.5],
    [[[81, 28], [74, 13], [60, 5], [43, 4], [29, 9]], 12, 0.55],
    [[[82, 27], [84, 15], [80, 6], [72, 1]], 8, 0.5],
    [[[82, 28], [92, 20], [102, 17], [110, 20], [113, 25]], 7, 0.45],
    [[[79, 31], [66, 36], [54, 44], [46, 56], [44, 66]], 9, 0.5],
    [[[80, 29], [64, 23], [48, 22], [34, 26], [26, 33]], 10, 0.5],
  ]
  tiltOn(78, 140, -6) // proud chin-up: the whole head (plume included) tips back
  const plumeCd: string[] = []
  plumes.forEach(([sp, w, asym], i) => {
    const lk = { w: w * 1.25, asym, p: 0.7, bulge: 0.5, root: 0.1, serr: 0.3, per: 4.2 + (i % 3) * 0.8 }
    const k = lock(sp, lk)
    plumeCd.push(k.cd)
    out.push(...clump(sp, { ...lk, k, strands: 4, seed: 20 + i, ...plumeLook }))
    // flyaway barbs leaving the clump edges toward the tip
    const R = rng(60 + i)
    let d = ''
    for (let j = 0; j < 7; j++) {
      const side = R() < 0.5 ? k.A : k.B
      const m = Math.floor(side.length * (0.3 + R() * 0.6))
      const a = side[m]
      const b = side[Math.min(side.length - 1, m + 6)]
      const tx = b[0] - a[0]
      const ty = b[1] - a[1]
      const c = k.S[m]
      const ox = (a[0] - c[0]) * 0.35
      const oy = (a[1] - c[1]) * 0.35
      d += lens([a[0] - ox, a[1] - oy], [a[0] + tx * 0.6 + ox, a[1] + ty * 0.6 + oy], [a[0] + tx * 1.3 + ox * 2, a[1] + ty * 1.3 + oy * 2], 0.6)
    }
    out.push({ d, fill: '#8a1018', alpha: 0.8 })
  })

  const plumeSil = plumeCd.join('')
  tiltOff()
  // -- body: breastplate, sash and medal
  const chest: Pt[] = [[40, 146], [58, 141], [78, 144], [100, 141], [114, 149], [122, 168], [126, 188], [116, 197], [96, 200.5], [70, 201], [44, 200], [22, 199.5], [10, 198], [14, 182], [24, 164], [32, 152]]
  out.push(...paint(chest, steel(40, { off: [-9, -6] })))
  const chestD = cr(cw(chest))
  // curved horizon reflection on the barrel chest + warm ground bounce under it
  out.push({ d: tl([[26, 176], [50, 170], [80, 172], [104, 168], [122, 172]], { w: 7, ta: 0.15, tb: 0.15, jit: 0.4, seed: 41 }), fill: '#4a5372', alpha: 0.75, clip: chestD })
  out.push({ d: tl([[26, 183], [50, 177], [80, 179], [104, 175], [122, 179]], { w: 4, ta: 0.2, tb: 0.2, seed: 42 }), fill: '#f0b07a', alpha: 0.55, clip: chestD, blend: 'screen' })
  // central ridge of the breastplate (3/4: sits right of centre)
  out.push(line([[80, 146], [82, 160], [81, 176], [78, 198]], 1.6, SINK, { ta: 0.2, tb: 0.4 }, chestD))
  out.push(line([[78, 147], [79.6, 160], [78.8, 176], [76, 196]], 1.4, 'rgba(255,255,255,0.8)', { ta: 0.3, tb: 0.5 }, chestD))
  out.push({ d: scratches(samp(cw(chest), true, 2), 26, 3, 20, 60, 0.35, 43), fill: 'rgba(255,255,255,0.55)', clip: chestD })

  const sash: Pt[] = [[34, 160], [50, 146], [66, 154], [84, 166], [104, 176], [124, 184], [120, 197], [104, 199], [84, 187], [66, 176], [50, 168]]
  out.push(...paint(sash, { base: lin(30, 150, 120, 200, 0, '#4c86e8', 0.5, '#2a5bc4', 1, '#183c8c'), shade: '#6a74b8', off: [-4, -6], seed: 50, ink: '#101a3a', inkW: 2.1, lit: 'rgba(200,225,255,0.7)', rim: RIM, rimW: 2, hatch: { ang: -30, gap: 1.5, w: 0.45, color: '#0b1530', alpha: 0.45 } }))
  const sashD = cr(cw(sash))
  out.push(line([[52, 156], [70, 166], [92, 178], [116, 190]], 1.1, '#f2c14e', { ta: 0.1, tb: 0.15 }, sashD, 0.9))
  out.push(line([[44, 160], [58, 166]], 0.7, '#0e1838', {}, sashD, 0.7))
  out.push(line([[70, 172], [86, 181], [98, 186]], 0.7, '#0e1838', {}, sashD, 0.7))
  out.push(line([[100, 194], [110, 191]], 0.6, '#0e1838', {}, sashD, 0.7))
  let fringe = ''
  for (let i = 0; i < 9; i++) {
    const x = 105 + i * 2
    const y = 198.6 - i * 1.3
    fringe += tl([[x, y - 2], [x + 0.6, y + 0.6], [x + 0.2, y + 2.2 - (i % 3) * 0.5]], { w: 1, ta: 0.05, tb: 0.6, seed: 46 + i })
  }
  out.push({ d: fringe, fill: '#f2c14e' }, { d: fringe, fill: '#7a4a04', alpha: 0.35, clip: 'M100 194H130V202H100Z' })

  // fauld: lowest plate edge, curving with the plinth
  out.push({ d: tl([[18, 186], [40, 191.4], [70, 193.6], [100, 191.4], [124, 185]], { w: 4, ta: 0.1, tb: 0.1, jit: 0.3, seed: 44, off: -2.2 }), fill: '#3c4462', alpha: 0.7, clip: chestD, blend: 'multiply' })
  out.push(line([[18, 185.4], [40, 190.8], [70, 193], [100, 190.8], [124, 184.4]], 1.7, SINK, { ta: 0.05, tb: 0.05 }, chestD))
  out.push({ d: tl([[18, 183.6], [40, 189], [70, 191.2], [100, 189], [124, 182.6]], { w: 1.1, ta: 0.15, tb: 0.3, seed: 45 }), fill: 'rgba(255,255,255,0.85)', clip: chestD })
  // medal of honour pinned high on the chest
  const ribbonM: Pt[] = [[85, 152, 1], [93, 152, 1], [92, 162, 1], [89, 164, 1], [86, 162, 1]]
  out.push(...paint(ribbonM, { base: lin(93, 0, 103, 0, 0, '#ffffff', 0.3, '#e83a3a', 0.6, '#ffffff', 1, '#b81c2a'), shade: '#c87080', off: [-2, -2], seed: 60, ink: '#2a0a10', inkW: 1.3 }))
  const medal: Pt[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + 0.12
    const r = i % 2 ? 3.1 : 6.4
    medal.push([89.5 + r * Math.cos(a), 169 + r * Math.sin(a), 1])
  }
  out.push(...paint(wob(medal, 0.3, 61), { base: radLit(89, 169, 7, 0, '#fff6c0', 0.5, '#f2c14e', 1, '#a8740e'), shade: '#d09a50', off: [-2.5, -2.5], seed: 62, ink: '#3a2404', inkW: 1.5, lit: 'rgba(255,255,255,0.9)', litW: 1 }))
  out.push({ d: circ(88, 166.5, 0.9), fill: '#ffffff' })
  out.push(line([[80, 162], [77.6, 159.4]], 0.9, '#ffffff', { ta: 0.5, tb: 0.5 }), line([[79, 166], [76, 166]], 0.7, '#ffffff', { ta: 0.5, tb: 0.5 }))

  // -- pauldrons and gorget: one volume each; the lames are shown by overlap seams
  // (bright rolled lip above the seam, cast shadow on the plate below it)
  const lames = (outline: Pt[], seams: Pt[][], ref: Pt[][], seed: number): VectorPath[] => {
    const d = cr(cw(outline))
    const r: VectorPath[] = []
    ref.forEach((h, i) => {
      r.push({ d: tl(h, { w: i ? 2.6 : 4.2, ta: 0.15, tb: 0.3, jit: 0.35, seed: seed + 10 + i }), fill: '#4a5372', alpha: i ? 0.3 : 0.45, clip: d })
      if (!i) r.push({ d: tl(mv(h, 0, 3.6), { w: 2.4, ta: 0.2, tb: 0.2, seed: seed + 20 + i }), fill: '#f0b07a', alpha: 0.45, clip: d, blend: 'screen' })
    })
    seams.forEach((sm, i) => {
      r.push({ d: tl(mv(sm, 0.4, 2.4), { w: 4, ta: 0.08, tb: 0.2, jit: 0.3, seed: seed + 30 + i }), fill: '#3c4462', alpha: 0.7, clip: d, blend: 'multiply' })
      r.push({ d: tl(mv(sm, 0, -1.3), { w: 1.2, ta: 0.15, tb: 0.35, seed: seed + 40 + i }), fill: 'rgba(255,255,255,0.9)', clip: d })
      r.push({ d: tl(sm, { w: 1.9, ta: 0.05, tb: 0.12, jit: 0.45, seed: seed + 50 + i }), fill: SINK, clip: d })
    })
    return r
  }
  // -- gorget under the chin
  const gor: Pt[] = [[42, 140], [44, 130], [62, 137], [80, 139], [98, 136], [108, 130], [111, 139], [114, 149], [98, 156], [78, 158], [58, 156], [40, 149]]
  out.push(...paint(gor, steel(90, { off: [-5, -6], inkW: 2.1, hatch: undefined })))
  out.push(...lames(gor, [[[40, 141], [60, 146.5], [79, 149], [98, 146], [113, 140]]], [[[44, 136], [62, 141], [80, 143], [100, 140], [110, 135]]], 90))
  out.push({ d: cr(cw([[56, 130], [80, 134], [102, 130], [100, 146], [80, 152], [60, 146]])), fill: rad(82, 136, 26, 0, 'rgba(40,30,60,0.8)', 1, 'rgba(40,30,60,0)'), clip: cr(cw(gor)), blend: 'multiply' })
  const farP: Pt[] = [[95, 152], [101, 141], [113, 135], [126, 137], [135, 146], [139.6, 160], [139, 176], [135, 189], [129, 197], [121, 193], [112, 183], [104, 171], [97, 163]]
  out.push(...paint(farP, steel(72, { off: [-9, -9], rimW: 3.4 })))
  out.push(...lames(farP,
    [[[98, 158], [110, 157], [124, 162], [135, 172], [141, 178]], [[106, 172], [117, 173], [128, 180], [134, 188], [138, 192]]],
    [[[98, 150], [112, 145.6], [126, 149], [138, 157]]], 72))
  const farPD = cr(cw(farP))
  out.push(line([[104, 141], [114, 137.5], [124, 139]], 1.8, '#ffffff', { ta: 0.3, tb: 0.5 }, farPD))
  out.push({ d: scratches(samp(cw(farP), true, 2), 12, 2.4, 20, 60, 0.3, 74), fill: 'rgba(255,255,255,0.55)', clip: farPD })

  const nearP: Pt[] = [[9, 198], [4, 187], [1.6, 172], [3.6, 158], [11.6, 147], [25, 139], [40, 135], [54, 136], [64, 142], [68.4, 152], [66.6, 162], [61, 171], [54, 180], [45, 188], [34, 194.6], [21, 198.6]]
  out.push(...paint(nearP, steel(82, { off: [-12, -12], inkW: 2.8 })))
  out.push(...lames(nearP,
    [[[0, 170], [11, 160], [27, 155], [44, 155], [58, 160], [67, 166]], [[2, 186], [12, 176], [26, 171], [40, 172], [52, 177], [58, 181]]],
    [[[2, 160], [16, 150.6], [36, 145.6], [56, 147], [68, 152]]], 82))
  const nearPD = cr(cw(nearP))
  out.push(line([[7, 158], [14, 147.5], [26, 140], [40, 137]], 2.6, '#ffffff', { ta: 0.25, tb: 0.5 }, nearPD))
  out.push({ d: circ(11, 152, 1) + circ(45, 138, 0.7), fill: '#ffffff' })
  for (const [x, y] of [[13, 156], [26, 151.6], [40, 151], [53, 153.6]] as P[]) {
    out.push({ d: circ(x, y, 1.5), fill: radLit(x, y, 1.7, 0, '#fff4c0', 1, '#a8740e'), stroke: SINK, sw: 0.6 }, { d: circ(x - 0.5, y - 0.5, 0.45), fill: '#ffffff' })
  }
  out.push({ d: scratches(samp(cw(nearP), true, 2), 20, 2.6, 30, 70, 0.3, 85), fill: 'rgba(255,255,255,0.6)', clip: nearPD })
  out.push({ d: scratches(samp(cw(nearP), true, 2), 8, 2, 30, 70, 0.3, 86), fill: 'rgba(30,36,56,0.5)', clip: nearPD })


  out.push({ d: cr(cw([[92, 132], [110, 130], [122, 138], [118, 150], [104, 154], [94, 146]])), fill: rad(106, 140, 18, 0, 'rgba(40,40,80,0.6)', 1, 'rgba(40,40,80,0)'), clip: cr(cw(gor)) + farPD, blend: 'multiply' })
  tiltOn(78, 140, -6)
  // -- face (drawn before the helmet so the helmet rim overlaps it)
  const face: Pt[] = [[54, 72], [70, 66], [92, 66], [104, 71], [108, 84], [107.4, 100], [105.6, 114], [102.6, 125], [97.4, 132.6], [88, 137.6], [75, 137.4], [66, 132], [58.6, 123], [53.4, 108], [51, 88]]
  const faceC = cw(face)
  const faceD = cr(faceC)
  out.push({ d: faceD, fill: lin(50, 70, 108, 140, 0, '#ffd8b4', 0.5, '#f6bc98', 1, '#e8a48c') })
  // painterly patches: warm light, rosy cheek and nose, cool bounce from the steel
  out.push(blot([[56, 80], [72, 73], [86, 76], [86, 92], [78, 104], [64, 110], [55, 98]], '#ffe6ca', 0.55, faceD, undefined, 3))
  out.push(soft(64, 105, 10, '255,110,100', 0.45, faceD))
  out.push(soft(95, 100, 6, '255,100,90', 0.45, faceD))
  out.push(soft(90, 80, 7, '255,140,110', 0.25, faceD))
  out.push(blot([[60, 124], [70, 132], [84, 136], [80, 142], [70, 140], [62, 132]], '#bcd0ff', 0.35, faceD, 'screen', 4))
  // cel core shadow on the far side and under the jaw
  const faceSh: Pt[] = [[97, 68], [107, 72], [110, 88], [108, 106], [104, 121], [98, 132.6], [89, 138], [78, 139], [87, 133], [94, 124], [97, 111], [95, 99], [98, 88], [96, 77]]
  out.push(blot(faceSh, '#e4979c', 1, faceD, 'multiply', 5))
  out.push({ d: hatch([samp(cw(faceSh), true, 1)], { ang: 58, gap: 1.6, w: 0.42, seed: 6, bend: 0.1 }), fill: '#7a3424', alpha: 0.45, clip: faceD })
  // cast shadow of the helmet rim on the face (near cheek + forehead under the visor)
  const rimSh: Pt[] = [[50, 72], [76, 64], [104, 67], [108, 74], [96, 76], [80, 76], [64, 80], [58, 90], [57, 106], [61, 122], [66, 132], [58, 126], [52, 108], [50, 90]]
  out.push(blot(rimSh, '#c47a80', 0.7, faceD, 'multiply', 7))
  // eye socket shadows
  out.push(blot([[60, 84], [70, 80.5], [80, 83], [79, 87], [70, 85], [62, 88]], '#d99486', 0.7, faceD, 'multiply', 8))
  out.push(blot([[87, 83], [95, 81], [101, 83], [100, 86], [94, 85], [88, 86]], '#d99486', 0.6, faceD, 'multiply', 9))
  // stubble on the jaw and chin
  const jaw: Pt[] = [[60, 117], [70, 123], [86, 125], [102, 118], [99, 129], [92, 137], [82, 139], [71, 137], [63, 130]]
  out.push({ d: specks(samp(cw(jaw), true, 1), 90, 0.2, 0.42, 10), fill: '#8a4a30', alpha: 0.45, clip: faceD })
  // big chin, cleft, chin light
  out.push(line([[89.5, 129.6], [90.2, 132.6], [89.8, 135]], 1, WINK, { ta: 0.3, tb: 0.5 }, faceD))
  out.push(blot([[74, 128], [82, 126.4], [86, 130], [82, 134], [75, 133]], '#ffe2c8', 0.5, faceD, undefined, 11))
  out.push(line([[68, 132.8], [76, 136.8], [88, 137.2], [97, 132.8]], 1.4, WINK, { ta: 0.3, tb: 0.3 }, undefined, 0.85))

  // painterly skin texture: short warm / cool strokes following the cheeks
  out.push({ d: scratches(samp(faceC, true, 1), 60, 3, 70, 40, 0.7, 15), fill: '#e88a7a', alpha: 0.18, clip: faceD })
  out.push({ d: scratches(samp(faceC, true, 1), 30, 3, 100, 40, 0.7, 16), fill: '#fff0dc', alpha: 0.25, clip: faceD })
  // eyes in 3/4: near eye bigger, far eye narrower
  const eyeN: Pt[] = [[61, 89], [64, 85.6], [70, 84.4], [75.4, 86.6], [74, 90.4], [67, 92]]
  const eyeF: Pt[] = [[89.5, 88], [91.6, 85.3], [95, 84.8], [97.8, 86.6], [96, 89], [92, 89.9]]
  for (const [e, ix, iy, ir, s] of [[eyeN, 71, 88.2, 3.3, 1], [eyeF, 95.6, 87.1, 2.5, 2]] as [Pt[], number, number, number, number][]) {
    const ed = cr(cw(e))
    out.push({ d: ed, fill: '#fbf3ec' })
    out.push({ d: circ(ix, iy, ir), fill: radLit(ix, iy, ir, 0, '#bfe6ff', 0.55, '#3a86d0', 1, '#163e80'), clip: ed })
    out.push({ d: circ(ix, iy, ir * 0.48), fill: '#0d1020', clip: ed })
    out.push({ d: cr(wob([[e[0][0] - 1, e[0][1] - 2], [e[2][0], e[2][1] - 3], [e[3][0] + 1, e[3][1] - 2], [e[3][0], e[3][1] + 0.4], [e[2][0], e[2][1] + 1.6], [e[0][0], e[0][1] + 0.6]], 0.2, s)), fill: '#c88a80', alpha: 0.7, clip: ed, blend: 'multiply' })
    out.push({ d: circ(ix + ir * 0.35, iy - ir * 0.4, ir * 0.3), fill: '#ffffff' }, { d: circ(ix - ir * 0.4, iy + ir * 0.4, ir * 0.13), fill: 'rgba(255,255,255,0.8)' })
  }
  out.push(line([[60, 89.6], [63, 85.6], [70, 84], [76.4, 86.8]], 1.9, WINK, { ta: 0.12, tb: 0.35 }))
  out.push(line([[61.6, 88.6], [58.4, 86.9]], 1.1, WINK, { ta: 0.1, tb: 0.9 }))
  out.push(line([[63, 91.2], [68, 92.5], [74.4, 90.6]], 0.6, WINK, {}, undefined, 0.8))
  out.push(line([[63.4, 83.4], [69, 82], [74.5, 83.5]], 0.6, WINK, {}, undefined, 0.6))
  out.push(line([[64, 95], [70, 96], [74, 94.4]], 0.5, '#9a5040', {}, undefined, 0.6))
  out.push(line([[89, 88.3], [91.6, 84.9], [95, 84.2], [98.6, 86.5]], 1.5, WINK, { ta: 0.15, tb: 0.35 }))
  out.push(line([[91.6, 89.9], [95.6, 89.6]], 0.5, WINK, {}, undefined, 0.7))
  // bushy ginger brows: near one lifted with pride, far one cocked high (goofy)
  const browC = { base: lin(0, 70, 0, 84, 0, '#f6a24a', 1, '#b35a1c'), shade: '#c06a40', hi: 'rgba(255,225,170,0.9)', ink: WINK, inkW: 1.1, strands: 6, strandC: '#7a3410', serr: 0.35, per: 2.2 }
  out.push(...clump([[79.5, 80], [74, 76.2], [66, 75.4], [58, 79], [55.5, 82]], { w: 5.2, p: 0.6, bulge: 0.25, root: 0.18, asym: 0.55, seed: 100, ...browC }))
  out.push(...clump([[87, 79], [91.5, 74.5], [97.5, 73.4], [103, 76]], { w: 4, p: 0.6, bulge: 0.2, root: 0.2, seed: 101, ...browC }))

  // mouth: cocky grin, far corner lifted
  const mouth: Pt[] = [[79.5, 113.6], [88, 115.6], [97.6, 112], [96.4, 116.6], [89, 119.8], [82.4, 117.8]]
  const mouthD = cr(cw(mouth))
  out.push({ d: mouthD, fill: '#5a1418' })
  out.push({ d: cr(cw([[80, 113.4], [88, 115.4], [97.4, 111.8], [96.4, 114.8], [88.6, 117.2], [81.6, 115.2]])), fill: '#fbf6ee', clip: mouthD })
  out.push(line([[84.4, 114.6], [84.6, 116.4]], 0.4, '#a09088', { ta: 0, tb: 0.5 }, mouthD), line([[89.4, 115.6], [89.5, 117.2]], 0.4, '#a09088', { ta: 0, tb: 0.5 }, mouthD), line([[93.6, 114.4], [93.6, 116]], 0.4, '#a09088', { ta: 0, tb: 0.5 }, mouthD))
  out.push({ d: cr(cw([[84, 118.6], [89, 119.6], [94.6, 117.6], [92.4, 121.4], [88, 122.4], [85, 121]])), fill: 'rgba(255,190,160,0.6)', clip: mouthD, blend: 'screen' })
  out.push(line([[78.6, 113], [84, 115], [88, 116], [94, 114], [98.6, 111]], 1.5, WINK, { ta: 0.2, tb: 0.2 }))
  out.push(line([[97.4, 112.4], [99.6, 110.2], [100.4, 108.2]], 0.9, WINK, { ta: 0.1, tb: 0.6 }))
  out.push(line([[84, 121.6], [89, 123], [93.4, 121.4]], 1, WINK, { ta: 0.35, tb: 0.35 }, undefined, 0.8))
  out.push(blot([[84, 122], [89, 123.2], [94, 121.8], [92, 125], [86, 124.6]], '#c06a58', 0.6, faceD, 'multiply', 14))

  // -- helmet (horseshoe shell with the face opening), over the face
  const helm: Pt[] = [
    [61, 133, 1], [46, 129], [37, 121], [31.5, 103], [31, 82], [36.5, 60], [49, 43], [67, 32.5], [86, 31], [101, 37.5], [110.5, 51], [114.6, 68], [114.6, 86], [111.6, 104], [107.6, 119], [104, 129, 1],
    [100.6, 122], [104, 104], [106, 86], [104, 75], [92, 68], [76, 66.5], [62, 69.5], [54.5, 76], [50.6, 92], [51.4, 110], [56, 124],
  ]
  out.push(...paint(helm, steel(110, { base: lin(30, 30, 114, 130, 0, '#f6f9ff', 0.35, '#b9c4d6', 0.7, '#8d97ab', 1, '#646d82'), off: [-12, -10], inkW: 3, rimW: 3.6, litW: 2 })))
  const helmD = cr(cw(helm))
  // reflections: horizon band bending round the dome, warm ground below, sky glint on top
  out.push({ d: tl([[30, 94], [36, 90], [44, 89], [52, 90]], { w: 6, ta: 0.1, tb: 0.4, seed: 111 }), fill: '#465070', alpha: 0.75, clip: helmD })
  out.push({ d: tl([[31, 102], [38, 98], [46, 97], [52, 99]], { w: 3.4, ta: 0.15, tb: 0.5, seed: 112 }), fill: '#ffb27a', alpha: 0.55, clip: helmD, blend: 'screen' })
  out.push({ d: tl([[104, 84], [108, 80], [114, 79]], { w: 5, ta: 0.4, tb: 0.1, seed: 113 }), fill: '#465070', alpha: 0.6, clip: helmD })
  out.push(line([[38, 74], [41, 61], [50, 48.5], [63, 40]], 3, '#ffffff', { ta: 0.25, tb: 0.5, jit: 0.4 }, helmD))
  out.push({ d: circ(37, 82, 1.2) + circ(38, 87, 0.6), fill: '#ffffff' })
  // raised comb running over the dome
  out.push(line([[108, 56], [100, 43], [86, 34.6], [68, 35], [52, 42], [40, 54]], 1.6, SINK, { ta: 0.15, tb: 0.4 }, helmD))
  out.push(line([[106, 58], [98.4, 46], [85.6, 38.2], [69, 38.6], [54, 45]], 1.2, 'rgba(255,255,255,0.75)', { ta: 0.2, tb: 0.5 }, helmD))
  // inner rim thickness: dark lip all around the opening
  out.push({ d: tl([[56, 124], [51.4, 110], [50.6, 92], [54.5, 76], [62, 69.5], [76, 66.5], [92, 68], [104, 75], [106, 86], [104, 104], [100.6, 122]], { w: 2.4, ta: 0.05, tb: 0.05, off: 1.6, seed: 114 }), fill: '#30384e', clip: helmD })
  out.push({ d: tl([[57, 122], [53, 108], [52.6, 92], [56, 79], [63, 72.4]], { w: 1, ta: 0.2, tb: 0.3, off: -2.6, seed: 115 }), fill: 'rgba(255,255,255,0.75)', clip: helmD })
  // rivets along the cheek guards
  for (const [x, y] of [[44, 96], [45, 110], [48, 122], [109.2, 98], [107, 112]] as P[]) {
    out.push({ d: circ(x, y, 1.5), fill: radLit(x, y, 1.6, 0, '#eef2f8', 1, '#5b6378'), stroke: SINK, sw: 0.55 }, { d: circ(x - 0.5, y - 0.5, 0.4), fill: '#ffffff' })
  }
  out.push({ d: scratches(samp(cw(helm), true, 2), 26, 2.6, -30, 80, 0.3, 116), fill: 'rgba(255,255,255,0.6)', clip: helmD })
  out.push({ d: scratches(samp(cw(helm), true, 2), 12, 2, -30, 80, 0.3, 117), fill: 'rgba(30,36,56,0.5)', clip: helmD })

  // -- moustache: huge handlebar curling over the cheek guards (the goofy pride)
  const stC = { base: lin(0, 96, 0, 114, 0, '#ffc070', 0.6, '#e08a3a', 1, '#a8501a'), shade: '#c06838', hi: 'rgba(255,236,190,0.95)', ink: '#4a1c08', inkW: 1.3, strands: 8, strandC: '#8a3c12', rim: RIM }
  out.push(...clump([[90, 108], [81, 111.6], [71, 112.8], [62.6, 111]], { w: 6.4, p: 0.7, bulge: 0.4, serr: 0.22, per: 3.2, seed: 120, ...stC }))
  out.push(...clump([[93, 108], [100, 110.2], [105.4, 108.6]], { w: 5, p: 0.7, bulge: 0.4, serr: 0.22, per: 3.2, seed: 121, ...stC }))
  out.push(...clump([[91, 107.4], [83, 109.6], [73, 111.4], [64, 110.4], [57, 106.4], [53.6, 101], [54.6, 96], [58.4, 94.6]], { w: 10, p: 0.55, bulge: 0.45, asym: 0.5, serr: 0.22, per: 3.2, seed: 122, ...stC }))
  out.push(...clump([[92.5, 107.4], [99, 108.4], [105, 106.6], [109, 102], [109.2, 97.2], [106.6, 96]], { w: 8, p: 0.55, bulge: 0.45, asym: 0.5, serr: 0.22, per: 3.2, seed: 123, ...stC }))

  // nose: big, proud, pointing toward the light side of the card
  const nose: Pt[] = [[82.6, 86], [86.4, 92.6], [91, 96.8], [97, 97.6], [100.6, 101], [99.4, 105.4], [94.4, 107.2], [90.4, 105.6], [86.6, 106.6], [83, 104.4], [84, 99]]
  const noseD = cr(cw(nose))
  out.push({ d: noseD, fill: lin(83, 88, 99, 106, 0, '#ffd0aa', 1, '#e99a7c') })
  out.push(soft(96.5, 101, 4.5, '255,105,95', 0.5, noseD))
  out.push(blot([[90, 102], [97, 103], [99.5, 101.5], [98.5, 105.5], [93.5, 107], [88, 105.6]], '#d07a6c', 0.9, noseD, 'multiply', 12))
  out.push({ d: cr(cw([[88, 106], [96, 106.4], [101, 105], [99, 109], [92, 110], [86, 108.6]])), fill: '#b86a5a', alpha: 0.7, clip: faceD, blend: 'multiply' })
  out.push(line([[100.4, 99.6], [100.6, 103.4], [97.4, 106.6], [93, 107.2]], 1.7, WINK, { ta: 0.15, tb: 0.5 }))
  out.push(line([[90.6, 105.4], [87.6, 106.6], [84.2, 105], [83, 102]], 1.4, WINK, { ta: 0.3, tb: 0.4 }))
  out.push(line([[84.6, 91], [86.6, 95.6]], 0.8, WINK, { ta: 0.4, tb: 0.4 }, undefined, 0.5))
  out.push(line([[91.6, 104.9], [90.4, 103.6], [89.2, 104.3]], 1.1, WINK, { ta: 0.2, tb: 0.4 }))
  out.push(line([[86.5, 88], [89.2, 93.6], [93, 97.2]], 0.7, '#a85a48', { ta: 0.4, tb: 0.4 }, undefined, 0.6))
  out.push({ d: cr(wob([[92.5, 97.6], [95.6, 98.3], [96.2, 99.8], [93.4, 99.4]], 0.15, 13)), fill: 'rgba(255,255,255,0.9)' })

  // -- raised visor resting on the brow of the helmet
  const visor: Pt[] = [[43, 76], [44, 66], [52, 55.5], [66, 48.6], [84, 46.8], [100, 50], [111, 57.5], [116.4, 66.6], [114.6, 71.4], [104, 63.6], [88, 59.6], [70, 60.8], [56, 66], [48, 73.6]]
  out.push(...paint(visor, steel(130, { base: lin(40, 46, 116, 74, 0, '#ffffff', 0.4, '#c4cede', 1, '#77819a'), off: [-6, -8], inkW: 2.8, rimW: 3 })))
  const visorD = cr(cw(visor))
  out.push({ d: tl([[48, 72.4], [56, 64.8], [70, 59.6], [88, 58.4], [104, 62.4], [114.4, 70]], { w: 2.6, ta: 0.05, tb: 0.05, off: 1.2, seed: 131 }), fill: '#3a4258', clip: visorD })
  out.push(line([[50, 62], [58, 54.6], [70, 50.4], [84, 49.4]], 1.8, '#ffffff', { ta: 0.3, tb: 0.5 }, visorD))
  // breathing slits
  for (const [x0, y0, x1, y1] of [[60, 58.6, 61, 63.6], [68, 55.8, 68.6, 61.2], [92, 54.6, 92.4, 60.2], [100, 57.2, 100.2, 62.6]]) {
    out.push(line([[x0, y0], [(x0 + x1) / 2 + 0.3, (y0 + y1) / 2], [x1, y1]], 1.5, SINK, { ta: 0.25, tb: 0.25, jit: 0.1 }, visorD))
  }
  out.push(line([[79.4, 48], [80, 54], [79.8, 59.6]], 1.2, SINK, { ta: 0.2, tb: 0.2 }, visorD))
  out.push(line([[78.2, 48.4], [78.6, 54], [78.4, 59.2]], 1, 'rgba(255,255,255,0.8)', { ta: 0.3, tb: 0.3 }, visorD))
  // pivot boss
  out.push({ d: cr(wob([[41, 74], [43, 70.6], [47, 70.6], [48.6, 74], [46.6, 77.6], [42.6, 77.4]], 0.2, 132)), fill: radLit(45, 74, 4, 0, '#fff4c0', 0.6, '#e2ae3c', 1, '#8a5a08'), stroke: SINK, sw: 0.9 })
  out.push({ d: circ(44.2, 72.8, 0.7), fill: '#ffffff' })

  // -- crest socket holding the plume
  const sock: Pt[] = [[74.6, 33.4], [74.8, 27.4], [77.6, 25], [83.6, 25], [86.2, 27.6], [86, 33.4], [80.6, 35.4]]
  out.push(...paint(sock, { base: lin(74, 0, 86, 0, 0, '#fff2b0', 0.4, '#f2c14e', 1, '#9a6a0e'), shade: '#c89040', off: [-3, -3], seed: 140, ink: '#2a1a04', inkW: 1.5, lit: 'rgba(255,255,255,0.9)', litW: 1 }))
  out.push(line([[75, 29.6], [80.4, 30.8], [86, 29.6]], 0.8, '#5a3a04', { ta: 0.2, tb: 0.2 }))

  out.push({ d: glint(40, 50, 3.4) + glint(57, 58, 2), fill: '#ffffff' })
  tiltOff()
  out.push({ d: glint(10, 151, 2.6) + glint(106, 140, 2) + glint(30, 153, 1.6), fill: '#ffffff' })
  // -- paper grain over the whole figure (multiply speckle + a few light flecks)
  const sil = [plumeSil, helmD, faceD, visorD, cr(cw(chest)), nearPD, farPD, cr(cw(gor))].join('')
  out.push({ d: 'M0 166H140V202H0Z', fill: lin(0, 166, 0, 201, 0, '#ffffff', 1, '#8a8aa6'), clip: cr(cw(chest)) + nearPD + farPD, blend: 'multiply' })
  out.push({ d: specks([[0, 0], [140, 0], [140, 200], [0, 200]], 240, 0.22, 0.48, 150), fill: '#4a3a50', alpha: 0.16, clip: sil, blend: 'multiply' })

  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths: out }
}

// ---- Wizard: Mage Zéphyr ------------------------------------------------------
// Turned toward the card's centre, head cocked, a sly half-closed eye; a wind
// from the right streams his hat tip, brows, hair and beard back to the left.
export function wizard(): Art {
  const RIM = '140,232,255'
  const WINK = '#2a1424'
  const RINK = '#170b34'
  const out: VectorPath[] = []
  const hairC = { base: lin(0, 70, 0, 200, 0, '#ffffff', 0.6, '#eceaf6', 1, '#cfcbe6'), shade: '#b4acd8', hi: 'rgba(255,255,255,0.95)', ink: '#2a2048', inkW: 1.3, strands: 5, strandC: '#8a84b8', rim: RIM }
  const robeLook = (seed: number, o: Partial<Look> = {}): Look => ({
    base: lin(0, 130, 60, 200, 0, '#9478ff', 0.45, '#6040d8', 1, '#341c88'),
    shade: '#6a58b8',
    seed,
    ink: RINK,
    inkW: 2.6,
    lit: 'rgba(200,180,255,0.55)',
    rim: RIM,
    rimW: 3,
    hatch: { ang: -55, gap: 1.8, w: 0.45, color: '#120830', alpha: 0.4, bend: 0.12 },
    ...o,
  })

  tiltOn(76, 130, 4) // head cocked toward the orb (hair, beard and hat follow)
  // -- hair streaming back to the left, behind the head
  const backHair: [Pt[], number][] = [
    [[[50, 98], [40, 106], [31, 116], [26, 128], [26, 138]], 12],
    [[[48, 84], [36, 86], [24, 92], [14, 98], [8, 104]], 12],
    [[[48, 92], [36, 98], [26, 108], [19, 120], [17, 130]], 13],
    [[[50, 104], [42, 114], [37, 126], [36, 138]], 10],
    [[[47, 80], [36, 79], [24, 82], [14, 86]], 8],
  ]
  backHair.forEach(([sp, w], i) => out.push(...clump(sp, { w, p: 0.6, bulge: 0.5, serr: 0.16, per: 4.6, asym: 0.45, seed: 200 + i, ...hairC })))

  tiltOff()
  // -- robe: one draped volume, near shoulder low and forward, far shoulder up
  const robe: Pt[] = [[1, 197], [3, 180], [10, 165], [24, 153], [42, 145], [60, 141], [80, 140], [98, 139], [114, 143], [127, 152], [135, 167], [138.5, 184], [138.6, 195], [131, 197.6], [124, 196.4], [114, 199.6], [104, 198.6], [92, 201.4], [80, 200.6], [66, 201.6], [54, 200.4], [40, 201], [28, 198.8], [16, 199.6], [7, 197.6]]
  out.push(...paint(robe, robeLook(210, { off: [-8, -6], sky: 'rgba(190,170,255,0.35)' })))
  const robeD = cr(cw(robe))
  out.push(blot([[8, 172], [22, 158], [40, 150], [52, 152], [40, 162], [24, 174], [12, 186]], '#a890ff', 0.35, robeD, 'screen', 211))
  // drapery: folds pulled from the shoulders, each a tapered crease with a soft shadow beside it
  const folds: Pt[][] = [
    [[22, 160], [24, 172], [22, 186], [18, 198]],
    [[34, 152], [38, 166], [40, 182], [38, 199]],
    [[12, 176], [14, 188], [12, 198]],
    [[112, 150], [110, 166], [112, 184], [116, 199]],
    [[124, 158], [126, 172], [130, 188], [132, 198]],
  ]
  folds.forEach((fp, i) => {
    out.push({ d: tl(mv(fp, 2.4, 0), { w: 5, ta: 0.2, tb: 0.1, jit: 0.4, seed: 220 + i }), fill: '#3a2480', alpha: 0.55, clip: robeD, blend: 'multiply' })
    out.push({ d: tl(mv(fp, -1.6, 0), { w: 1.6, ta: 0.3, tb: 0.2, seed: 230 + i }), fill: 'rgba(190,170,255,0.6)', clip: robeD })
    out.push(line(fp, 1.3, RINK, { ta: 0.25, tb: 0.15, jit: 0.4, seed: 240 + i }, robeD, 0.85))
  })
  // fabric weave: faint crossing strokes in the cloth
  out.push({ d: scratches(samp(cw(robe), true, 1), 90, 2.4, 45, 10, 0.32, 212) + scratches(samp(cw(robe), true, 1), 90, 2.4, -45, 10, 0.32, 213), fill: '#d0c0ff', alpha: 0.16, clip: robeD })
  // embroidered stars on the cloth
  const R = rng(5)
  let emb = ''
  for (const [x, y] of [[16, 186], [30, 172], [46, 190], [118, 172], [128, 186], [108, 190], [26, 194]] as P[]) {
    const sz = 1.6 + R() * 1.2
    const st: Pt[] = []
    for (let i = 0; i < 8; i++) {
      const a2 = (i * Math.PI) / 4 + R() * 0.3
      const r2 = i % 2 ? sz * 0.35 : sz
      st.push([x + r2 * Math.cos(a2), y + r2 * Math.sin(a2), 1])
    }
    emb += cr(st)
  }
  out.push({ d: emb, fill: '#ffd86a', alpha: 0.9, clip: robeD })

  // -- shoulder mantle with a scalloped, gold-trimmed hem
  const mantle: Pt[] = [[3, 184], [7, 168], [17, 157], [33, 149], [50, 144.6], [70, 143], [90, 143], [110, 145], [125, 152], [133.6, 163], [136, 176], [129, 180], [119, 174.6], [107, 178.6], [93, 174], [79, 180], [63, 175.6], [48, 181.6], [33, 177], [19, 183.6], [9, 181]]
  out.push(...paint(mantle, robeLook(250, { base: lin(0, 143, 40, 184, 0, '#6e6cf0', 0.5, '#4240b8', 1, '#221e78'), off: [-9, -7], inkW: 2.4, sky: 'rgba(170,160,255,0.45)' })))
  const mantleD = cr(cw(mantle))
  out.push({ d: edge(cw(mantle), [0, 1], { w: 2.6, inset: 1.6, th: 0.35, seed: 251 }), fill: '#f2c14e', clip: mantleD })
  out.push({ d: edge(cw(mantle), [0, 1], { w: 0.8, inset: 0.8, th: 0.45, seed: 252 }), fill: '#8a5a08', clip: mantleD })
  for (const [fp, sd] of [[[[22, 158], [24, 168], [19, 182]], 253], [[[46, 148], [47, 162], [48, 180]], 254], [[[118, 150], [119, 162], [119, 174]], 255]] as [Pt[], number][]) {
    out.push({ d: tl(mv(fp, 2.2, 0), { w: 4, ta: 0.2, tb: 0.1, seed: sd }), fill: '#14104a', alpha: 0.5, clip: mantleD, blend: 'multiply' })
    out.push(line(fp, 1.1, RINK, { ta: 0.3, tb: 0.15, seed: sd }, mantleD, 0.8))
  }

  tiltOn(76, 130, 4)
  // -- ear, then the face (forehead hidden under the brim)
  const ear: Pt[] = [[47, 90], [41, 87.6], [37, 92], [37.6, 100], [41, 106], [46.6, 106]]
  out.push(...paint(ear, { base: '#f0b49a', shade: '#d08a86', off: [-3, -2], seed: 260, ink: WINK, inkW: 1.6 }))
  out.push(line([[44, 92], [40.6, 92.4], [40, 97], [42.6, 101]], 1, WINK, { ta: 0.3, tb: 0.5 }, cr(cw(ear)), 0.8))
  out.push(soft(41, 96, 4, '255,110,100', 0.4, cr(cw(ear))))

  const face: Pt[] = [[45, 78], [60, 79], [80, 79.6], [99, 78], [106, 85], [108, 97], [105.6, 109], [99, 119], [89, 125], [75, 126], [62, 121], [52, 112], [46.6, 98]]
  const faceC = cw(face)
  const faceD = cr(faceC)
  out.push({ d: faceD, fill: lin(45, 80, 106, 126, 0, '#ffd8bc', 0.5, '#f4b998', 1, '#e29a88') })
  out.push(blot([[50, 86], [66, 84], [78, 88], [76, 100], [66, 108], [54, 104]], '#ffe6d2', 0.55, faceD, undefined, 261))
  out.push(soft(61, 104, 9, '255,100,100', 0.5, faceD))
  out.push(soft(100, 100, 5, '255,110,110', 0.25, faceD))
  const faceSh: Pt[] = [[98, 79], [106, 84], [109, 97], [106, 110], [99, 120], [90, 125], [96, 114], [99, 104], [96, 94], [99, 87]]
  out.push(blot(faceSh, '#eab4c0', 1, faceD, 'multiply', 262))
  out.push({ d: hatch([samp(cw(faceSh), true, 1)], { ang: 60, gap: 1.6, w: 0.4, seed: 263, bend: 0.1 }), fill: '#6a2a34', alpha: 0.45, clip: faceD })
  // brim cast shadow over the brow, soft-edged and hand-shaped
  const brimSh: Pt[] = [[44, 76], [80, 77], [108, 78], [108, 86], [100, 87], [90, 85], [80, 86], [70, 85], [58, 88], [48, 90]]
  out.push(blot(brimSh, '#a86a8a', 0.75, faceD, 'multiply', 264))
  out.push({ d: hatch([samp(cw(brimSh), true, 1)], { ang: 12, gap: 1.4, w: 0.4, seed: 265 }), fill: '#3a1430', alpha: 0.4, clip: faceD })
  // wrinkles: forehead-to-cheek, crow's feet, nasolabial fold
  out.push(line([[57, 93.4], [54.6, 92], [52.6, 91.6]], 0.6, WINK, {}, faceD, 0.7))
  out.push(line([[57.4, 96], [54.4, 96.4], [52.4, 97.6]], 0.6, WINK, {}, faceD, 0.7))
  out.push(line([[58, 98.4], [55.6, 100.2]], 0.55, WINK, {}, faceD, 0.6))
  out.push(line([[62, 100.6], [66, 101.4], [71, 100.4]], 0.6, '#8a4040', {}, faceD, 0.7))
  out.push(line([[100.6, 95], [102.4, 93.6]], 0.5, WINK, {}, faceD, 0.6))
  out.push(line([[100.6, 97.4], [103, 97.2]], 0.5, WINK, {}, faceD, 0.6))
  out.push(line([[80, 108], [78, 113], [79, 118]], 0.8, '#8a4040', { ta: 0.3, tb: 0.5 }, faceD, 0.7))

  out.push({ d: scratches(samp(faceC, true, 1), 50, 3, 70, 40, 0.7, 266), fill: '#e07a80', alpha: 0.18, clip: faceD })
  out.push({ d: scratches(samp(faceC, true, 1), 26, 3, 100, 40, 0.7, 267), fill: '#fff0e6', alpha: 0.25, clip: faceD })
  // eyes: near one squeezed into a sly crescent, far one open with a glint
  const eyeN: Pt[] = [[60.6, 95.4], [63.4, 93.2], [69, 92.4], [74, 93.6], [72.8, 95.8], [66.4, 96.4]]
  const eyeF: Pt[] = [[90.2, 93.4], [92.6, 90.4], [96.4, 89.8], [99.2, 91.8], [97.6, 94.6], [93.2, 95.3]]
  for (const [e, ix, iy, ir, sd] of [[eyeN, 70.4, 94.6, 2.9, 1], [eyeF, 96.6, 92.4, 2.6, 2]] as [Pt[], number, number, number, number][]) {
    const ed = cr(cw(e))
    out.push({ d: ed, fill: '#fbf4f0' })
    out.push({ d: circ(ix, iy, ir), fill: radLit(ix, iy, ir, 0, '#efe0ff', 0.5, '#8a5ae0', 1, '#3a1a8a'), clip: ed })
    out.push({ d: circ(ix, iy, ir * 0.45), fill: '#120a20', clip: ed })
    out.push({ d: cr(wob([[e[0][0] - 1, e[0][1] - 2], [e[2][0], e[2][1] - 3], [e[3][0] + 1, e[3][1] - 2], [e[3][0], e[3][1] + 0.4], [e[2][0], e[2][1] + 1.4], [e[0][0], e[0][1] + 0.5]], 0.2, sd)), fill: '#c890a0', alpha: 0.7, clip: ed, blend: 'multiply' })
    out.push({ d: circ(ix + ir * 0.35, iy - ir * 0.4, ir * 0.32), fill: '#ffffff' }, { d: circ(ix - ir * 0.4, iy + ir * 0.4, ir * 0.13), fill: 'rgba(255,255,255,0.8)' })
  }
  // smiling squint: the near lid arches down, the cheek pushes the lower lid up
  out.push({ d: cr(cw([[59.6, 95.6], [62.6, 91.6], [69, 90.4], [75, 92.8], [74.4, 94.2], [69, 92.8], [63.4, 93.8]])), fill: '#eeac98' })
  out.push({ d: cr(cw([[61, 96.8], [66, 95.2], [72.6, 95.4], [73.6, 97.6], [67, 98.6], [61.6, 98.4]])), fill: '#f6bfa6' })
  out.push(line([[59.2, 96], [62.6, 93.2], [69, 92.6], [75.4, 94.6]], 2, WINK, { ta: 0.12, tb: 0.3 }))
  out.push(line([[62, 91.6], [68, 89.8], [74.6, 91.6]], 0.6, WINK, {}, undefined, 0.6))
  out.push(line([[61.4, 96.4], [66.6, 95.4], [73, 95.8]], 0.8, WINK, { ta: 0.2, tb: 0.4 }, undefined, 0.9))
  out.push(line([[62.4, 99.4], [67, 100], [71.4, 99]], 0.55, '#9a5050', {}, undefined, 0.7))
  out.push(line([[89.6, 93.6], [92.4, 90], [96.4, 89.2], [99.8, 91.6]], 1.6, WINK, { ta: 0.15, tb: 0.35 }))
  out.push(line([[92.6, 95.4], [97.8, 94.8]], 0.5, WINK, {}, undefined, 0.7))
  out.push(line([[92, 88.2], [96, 87.4], [99.6, 88.6]], 0.5, WINK, {}, undefined, 0.55))

  // -- beard: an under-mass, then flowing locks sweeping left in the wind
  const beardMass: Pt[] = [[50, 108], [62, 116], [80, 120], [98, 116], [106, 110], [110, 124], [106, 142], [97, 158], [84, 170], [68, 180], [50, 182], [38, 174], [40, 160], [45, 144], [46, 126]]
  out.push({ d: cr(cw(beardMass)), fill: '#d8d4ee' })
  out.push({ d: cr(wob(mv(cw(beardMass), 5, 6), 1.5, 278)), fill: '#1a0e50', alpha: 0.55, clip: robeD + mantleD, blend: 'multiply' })
  out.push({ d: ribbonClosed(samp(cw(beardMass), true, 0.5), 2.2, 279), fill: '#2a2048' })
  const beardLocks: [Pt[], number, string][] = [
    [[[104, 110], [109, 124], [106.6, 138], [108, 150], [102, 161]], 9, '#2a2048'],
    [[[52, 110], [47, 126], [46, 142], [40, 158], [30, 172], [21, 180]], 13, '#2a2048'],
    [[[96, 116], [100.6, 132], [95, 148], [95, 162], [85, 176], [72, 186]], 13, '#4a4278'],
    [[[66, 118], [62, 136], [64.6, 152], [57, 168], [45, 182], [33, 190]], 16, '#4a4278'],
    [[[82, 120], [80, 138], [84.4, 154], [77, 172], [63, 188], [49, 196]], 16, '#4a4278'],
    [[[58, 116], [54, 130], [56.6, 144], [52, 154]], 7, '#5a5490'],
    [[[90, 120], [94, 134], [90.6, 148], [92, 156]], 7, '#5a5490'],
    [[[74, 122], [71.6, 136], [74, 146]], 6, '#5a5490'],
  ]
  beardLocks.forEach(([sp, w, ink], i) => out.push(...clump(sp, { w, p: 0.75, bulge: 0.45, root: 0.06, serr: 0.12, per: 5, seed: 280 + i, ...hairC, ink, inkW: 1.2, strands: 5 })))
  out.push(soft(58, 120, 22, '120,110,180', 0.35, cr(cw(beardMass)), 'multiply'))
  // orb light bouncing on the beard's right flank
  out.push(soft(108, 146, 24, '120,220,255', 0.55, cr(cw(beardMass)), 'screen'))

  // -- moustache: long, drooping, its tips blown back
  const mC = { ...hairC, ink: '#4a4278', inkW: 1.1, strands: 5 }
  out.push(...clump([[90, 113.4], [82, 116.6], [72, 119], [63, 120], [56, 122.6], [51, 128]], { w: 9.4, p: 0.7, bulge: 0.45, serr: 0.18, per: 3.6, seed: 300, ...mC }))
  out.push(...clump([[92.6, 113.6], [99, 116.4], [103, 121], [104, 128]], { w: 7, p: 0.7, bulge: 0.45, serr: 0.18, per: 3.6, seed: 301, ...mC }))
  out.push({ d: tl([[50, 126], [58, 124], [72, 123], [86, 121], [96, 120], [104, 128]], { w: 4.6, ta: 0.2, tb: 0.3, jit: 0.5, seed: 302 }), fill: '#8a80c0', alpha: 0.6, clip: cr(cw(beardMass)), blend: 'multiply' })
  // smirk tucked under the moustache, far corner lifted
  out.push(line([[86, 121.6], [92, 122], [98, 119.6], [100.4, 117.4]], 1.2, WINK, { ta: 0.2, tb: 0.3 }))
  out.push({ d: cr(cw([[88, 121.4], [93, 121.8], [97.6, 119.8], [95.6, 123.2], [90.6, 123.6]])), fill: '#b05a6a', alpha: 0.85 })

  // nose: big, round and rosy, drooping toward the moustache
  const nose: Pt[] = [[82, 93], [85, 99.6], [89, 103.4], [95, 103.4], [99.4, 106.4], [99.6, 111.4], [95.4, 114.2], [90.4, 113.4], [86.4, 114.4], [82.2, 112.4], [81.6, 106.6], [83, 100]]
  const noseD = cr(cw(nose))
  out.push({ d: noseD, fill: lin(82, 95, 100, 114, 0, '#ffc8b0', 1, '#ea8c80') })
  out.push(soft(95, 108, 6, '255,90,90', 0.5, noseD))
  out.push(blot([[90, 110], [98, 109], [100.4, 107.6], [99.6, 112], [94.6, 115], [87.6, 114.4]], '#c8706c', 0.85, noseD, 'multiply', 270))
  out.push({ d: cr(cw([[87, 114], [97, 114.4], [102, 112.6], [100, 117.4], [92, 118.4], [85, 116.6]])), fill: '#a05a6a', alpha: 0.6, clip: faceD, blend: 'multiply' })
  out.push(line([[100.2, 106], [100.4, 110.6], [97, 114], [92, 114.6]], 1.6, WINK, { ta: 0.15, tb: 0.5 }))
  out.push(line([[90.4, 113.4], [86.6, 114.8], [83, 113.4], [81.8, 110]], 1.3, WINK, { ta: 0.3, tb: 0.4 }))
  out.push(line([[91.6, 113.6], [90.2, 112.2], [88.8, 113]], 1.1, WINK, { ta: 0.2, tb: 0.4 }))
  out.push({ d: cr(wob([[90, 103.6], [94.6, 104], [96, 106], [92, 106]], 0.15, 271)), fill: 'rgba(255,255,255,0.9)' })

  // -- bushy brows flaring back in the wind; far one cocked high
  const bC = { ...hairC, shade: '#9a90cc', ink: '#2a2048', inkW: 1.2, strands: 5 }
  out.push(...clump([[79, 91], [71, 87.4], [62, 87], [53, 85], [45, 83.6], [38, 85]], { w: 8, p: 0.6, bulge: 0.35, root: 0.15, serr: 0.32, per: 2.6, seed: 310, ...bC }))
  out.push(...clump([[87.6, 90], [93, 85.6], [99.6, 84.2], [106, 84.6], [111, 87.4]], { w: 6.4, p: 0.6, bulge: 0.35, root: 0.18, serr: 0.32, per: 2.6, seed: 311, ...bC }))

  // -- hat: wobbly brim in perspective, crumpled cone, tip blown back with a star
  const hatLook = (seed: number, o: Partial<Look> = {}): Look => robeLook(seed, { base: lin(20, 0, 110, 60, 0, '#8a6cff', 0.45, '#5636d0', 1, '#28126e'), hatch: { ang: -60, gap: 1.8, w: 0.45, color: '#120830', alpha: 0.4, bend: 0.15 }, ...o })
  out.push({ d: cr(cw([[4, 78], [30, 80], [50, 82], [52, 92], [36, 92], [20, 92], [6, 90]])), fill: rad(40, 80, 30, 0, 'rgba(60,30,110,0.7)', 1, 'rgba(60,30,110,0)'), clip: backHair.map(([sp, w]) => lock(sp, { w, p: 0.7, bulge: 0.45 }).d).join('') + cr(cw(ear)), blend: 'multiply' })
  const brim: Pt[] = [[10, 72], [18, 63.6], [38, 57.6], [62, 55.6], [88, 56.4], [110, 60], [127, 67], [129.6, 73.6], [120, 79.4], [98, 82.6], [72, 83.4], [48, 83.6], [30, 82.6], [16, 79.6], [9.4, 76.6]]
  out.push(...paint(brim, hatLook(320, { off: [-6, -5], inkW: 2.8 })))
  const brimD = cr(cw(brim))
  // thickness of the brim's front edge + its floppy wave
  out.push({ d: tl([[11, 76], [28, 81], [48, 82.4], [72, 82.2], [98, 81.2], [120, 77.8], [128, 72.6]], { w: 2.6, ta: 0.1, tb: 0.1, off: 1.2, seed: 321 }), fill: '#1a0a4a', clip: brimD })
  out.push(line([[12, 70], [16, 74], [24, 77.4]], 1, RINK, { ta: 0.3, tb: 0.4 }, brimD, 0.7))
  out.push(line([[22, 70], [40, 74.4], [64, 76.4]], 0.9, RINK, { ta: 0.3, tb: 0.4 }, brimD, 0.7))
  out.push(line([[90, 76.6], [108, 74], [120, 70.4]], 0.9, RINK, { ta: 0.3, tb: 0.4 }, brimD, 0.7))

  const cone: Pt[] = [[39, 63], [44, 49], [50, 37], [54.6, 28], [51, 22.6], [42, 21.4], [33, 24.6], [25.6, 30.6], [19.4, 35.4, 1], [21.6, 26], [30, 15], [43, 7.6], [58, 5.6], [71, 10.4], [82, 20], [91, 33], [97.6, 47], [101.6, 62.6]]
  out.push(...paint(cone, hatLook(330, { off: [-11, -6], inkW: 2.9 })))
  const coneD = cr(cw(cone))
  out.push(blot([[46, 50], [52, 36], [58, 26], [66, 18], [70, 26], [62, 40], [56, 54]], '#b8a4ff', 0.35, coneD, 'screen', 331))
  // crumples where the cone bends over
  for (const [fp, sd] of [
    [[[54, 27.6], [60, 25], [68, 26.4]], 332],
    [[[53, 31.6], [61, 32], [69, 36]], 333],
    [[[62, 18], [66, 22], [72, 23.6]], 334],
    [[[43, 15], [47, 19.6]], 335],
    [[[34, 17.4], [37, 22]], 336],
  ] as [Pt[], number][]) {
    out.push({ d: tl(mv(fp, 0.6, 1.8), { w: 3, ta: 0.2, tb: 0.3, seed: sd }), fill: '#2a1470', alpha: 0.5, clip: coneD, blend: 'multiply' })
    out.push(line(fp, 1.1, RINK, { ta: 0.3, tb: 0.4, seed: sd }, coneD, 0.85))
    out.push({ d: tl(mv(fp, -0.4, -1.2), { w: 0.9, ta: 0.3, tb: 0.4, seed: sd + 1 }), fill: 'rgba(210,195,255,0.7)', clip: coneD })
  }
  out.push({ d: scratches(samp(cw(cone), true, 2), 40, 2.2, -70, 30, 0.35, 337), fill: 'rgba(200,180,255,0.35)', clip: coneD })
  // embroidered moon and stars on the cone
  out.push({ d: cr([[72, 40], [67.4, 43], [66.6, 49], [70.6, 53.6], [76.4, 54], [72.4, 50.6], [71.4, 45]]), fill: '#ffe680', clip: coneD })
  let cs = ''
  for (const [x, y, z] of [[56, 50, 2.6], [86, 52, 2], [62, 36, 1.6], [80, 30, 1.4], [44, 28, 1.3]]) {
    const st: Pt[] = []
    for (let i = 0; i < 8; i++) st.push([x + (i % 2 ? z * 0.36 : z) * Math.cos((i * Math.PI) / 4 - Math.PI / 2), y + (i % 2 ? z * 0.36 : z) * Math.sin((i * Math.PI) / 4 - Math.PI / 2), 1])
    cs += cr(st)
  }
  out.push({ d: cs, fill: '#ffd84d', clip: coneD })

  // band wrapping the cone base, with a gem
  const band: Pt[] = [[40.4, 58.6, 1], [56, 62], [80, 62.2], [100.8, 58.4, 1], [101.6, 63.8, 1], [80, 68], [56, 67.8], [39.4, 63.6, 1]]
  out.push(...paint(band, { base: lin(0, 57, 0, 69, 0, '#fff2b0', 0.4, '#f2c14e', 1, '#9a6a0e'), shade: '#c89040', off: [-5, -3], seed: 340, ink: '#2a1404', inkW: 1.9, lit: 'rgba(255,255,255,0.9)', litW: 1, rim: RIM, rimW: 2 }))
  out.push(line([[41, 61], [60, 64.8], [80, 65], [101, 61]], 0.5, '#7a4a04', { ta: 0.2, tb: 0.2 }, cr(cw(band)), 0.6))
  out.push(soft(76, 65, 9, '120,230,255', 0.6, undefined, 'screen'))
  const gem: Pt[] = [[76, 59.6, 1], [80.6, 64.6, 1], [76, 70, 1], [71.4, 64.6, 1]]
  out.push({ d: cr(gem), fill: radLit(76, 64.6, 6, 0, '#e6fbff', 0.5, '#4fd6ff', 1, '#1a6ab0'), stroke: RINK, sw: 1.1 })
  out.push(line([[73.6, 63], [75.6, 61]], 0.8, '#ffffff', { ta: 0.3, tb: 0.3 }))

  // star charm dangling from the blown-back tip
  out.push(line([[20, 35], [17.6, 39], [16.6, 43]], 0.7, '#ffe08a', { ta: 0, tb: 0 }))
  out.push(soft(16, 46, 8, '255,220,120', 0.7, undefined, 'screen'))
  const charm: Pt[] = []
  for (let i = 0; i < 10; i++) {
    const a2 = -Math.PI / 2 + (i * Math.PI) / 5 + 0.2
    const r2 = i % 2 ? 2.2 : 4.6
    charm.push([16.2 + r2 * Math.cos(a2), 46.4 + r2 * Math.sin(a2), 1])
  }
  out.push(...paint(wob(charm, 0.3, 341), { base: radLit(16, 46, 5, 0, '#fff7c2', 1, '#e8a417'), shade: '#d0a050', off: [-2, -2], seed: 342, ink: '#3a2404', inkW: 1.2 }))

  const headSil = faceD + brimD + coneD + cr(cw(beardMass))
  tiltOff()
  // -- orb floating at his shoulder, with wisps of magic curling round it
  out.push(soft(119, 148, 34, '150,225,255', 0.55, undefined, 'lighter'))
  const orbD = circ(119, 148, 11.5)
  out.push({ d: orbD, fill: radLit(119, 148, 12, 0, '#ffffff', 0.25, '#bff4ff', 0.65, '#5a86f0', 1, '#3426a8') })
  out.push(blot([[112, 150], [116, 144], [122, 144], [126, 149], [123, 155], [116, 156]], '#9ff0ff', 0.45, orbD, 'screen', 350))
  out.push(line([[111, 151], [109.6, 146], [113, 141], [118.6, 140.6]], 1.7, 'rgba(255,255,255,0.9)', { ta: 0.2, tb: 0.5 }, orbD))
  out.push(line([[124, 156], [128, 152], [129.6, 147]], 1.1, 'rgba(160,240,255,0.9)', { ta: 0.4, tb: 0.4 }, orbD))
  out.push({ d: tl([[107.5, 148], [109, 157], [119, 159.6], [128.4, 154], [130, 146], [126, 138.6], [118, 136.6]], { w: 2.6, ta: 0.1, tb: 0.6, light: 0.8, seed: 351 }), fill: RINK })
  const wisps: Pt[][] = [
    [[100, 162], [106, 168], [118, 168], [130, 160], [136, 148], [133, 136], [124, 130]],
    [[134, 166], [128, 172], [118, 172], [110, 166]],
    [[104, 136], [110, 130], [118, 128.6], [126, 131]],
  ]
  wisps.forEach((wp, i) => {
    out.push({ d: tl(wp, { w: 2.6 - i * 0.5, ta: 0.3, tb: 0.5, seed: 352 + i }), fill: 'rgba(170,240,255,0.9)', blend: 'screen' })
    out.push({ d: tl(wp, { w: 0.9, ta: 0.3, tb: 0.5, seed: 360 + i }), fill: '#ffffff' })
  })
  let sp = ''
  for (const [x, y, z] of [[134, 130, 2.6], [103, 128, 1.8], [136, 170, 1.6], [98, 170, 1.4]]) sp += cr([[x, y - z, 1], [x + z * 0.28, y - z * 0.28, 1], [x + z, y, 1], [x + z * 0.28, y + z * 0.28, 1], [x, y + z, 1], [x - z * 0.28, y + z * 0.28, 1], [x - z, y, 1], [x - z * 0.28, y - z * 0.28, 1]])
  out.push({ d: sp + glint(113.6, 142, 2.2) + glint(48, 47, 1.6), fill: '#ffffff' })

  // -- paper grain over the figure
  const sil = [robeD, mantleD, headSil].join('')
  out.push({ d: 'M0 170H140V202H0Z', fill: lin(0, 170, 0, 201, 0, '#ffffff', 1, '#8a84b0'), clip: robeD + mantleD, blend: 'multiply' })
  out.push({ d: specks([[0, 0], [140, 0], [140, 200], [0, 200]], 240, 0.22, 0.48, 390), fill: '#3a2a50', alpha: 0.16, clip: sil, blend: 'multiply' })

  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths: out }
}
