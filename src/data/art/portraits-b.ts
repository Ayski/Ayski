import type { Paint, VectorPath } from '../../types'
import { lin, rad, rng, type Art } from './kit'
import { PORTRAIT_W, PORTRAIT_H } from './portrait-kit'

// Ninja and robot portraits (140 × 200 bust), drawn like a hand-inked, hand-painted
// illustration: every part is an authored bézier contour that gets a slight hand
// wobble, a pressure-sensitive ink line (thick on the shadow side, broken on the lit
// side), painted colour patches, cel core shadows, hatching and texture.

// =================================================================================
// Hand-drawing toolkit (local to this file)
// =================================================================================
type Pt = [number, number]
interface Ring {
  pts: Pt[]
  closed: boolean
}
interface Shape {
  rings: Ring[]
  d: string
}
type Xf = (p: Pt) => Pt

const q1 = (v: number) => Math.round(v * 10) / 10
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

let SEED = 1
const seed = () => (SEED = (SEED * 48271 + 11) % 2147483647)

// Smooth 1-D value noise in [0, 1].
function noise(s: number): (t: number) => number {
  const R = rng(s)
  const v = Array.from({ length: 64 }, () => R())
  return (t) => {
    const i = Math.floor(t)
    const f = t - i
    const a = v[((i % 64) + 64) % 64]
    const b = v[(((i + 1) % 64) + 64) % 64]
    return a + (b - a) * f * f * (3 - 2 * f)
  }
}

// Sample an absolute M/L/C/Q/Z path into polylines.
function parse(d: string, step: number): Ring[] {
  const tk = d.match(/[MLCQZ]|-?(?:\d+\.?\d*|\.\d+)/g) ?? []
  const out: Ring[] = []
  let cur: Pt[] = []
  let x = 0
  let y = 0
  let i = 0
  let cmd = 'M'
  const n = () => Number(tk[i++])
  const flush = (closed: boolean) => {
    if (closed && cur.length > 2 && dist(cur[0], cur[cur.length - 1]) < 0.01) cur.pop()
    if (cur.length > 1) out.push({ pts: cur, closed })
    cur = []
  }
  while (i < tk.length) {
    if (/[MLCQZ]/.test(tk[i])) {
      cmd = tk[i++]
      if (cmd === 'Z') {
        const s0 = cur[0]
        flush(true)
        if (s0) [x, y] = s0
        continue
      }
    }
    if (cmd === 'M') {
      flush(false)
      x = n()
      y = n()
      cur = [[x, y]]
      cmd = 'L'
      continue
    }
    if (!cur.length) cur = [[x, y]]
    if (cmd === 'L') {
      const nx = n()
      const ny = n()
      const k = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / step))
      for (let j = 1; j <= k; j++) cur.push([x + ((nx - x) * j) / k, y + ((ny - y) * j) / k])
      x = nx
      y = ny
    } else if (cmd === 'C') {
      const a = [x, y, n(), n(), n(), n(), n(), n()]
      const len = Math.hypot(a[2] - a[0], a[3] - a[1]) + Math.hypot(a[4] - a[2], a[5] - a[3]) + Math.hypot(a[6] - a[4], a[7] - a[5])
      const k = Math.max(2, Math.ceil(len / step))
      for (let j = 1; j <= k; j++) {
        const t = j / k
        const m = 1 - t
        const b0 = m * m * m
        const b1 = 3 * m * m * t
        const b2 = 3 * m * t * t
        const b3 = t * t * t
        cur.push([b0 * a[0] + b1 * a[2] + b2 * a[4] + b3 * a[6], b0 * a[1] + b1 * a[3] + b2 * a[5] + b3 * a[7]])
      }
      x = a[6]
      y = a[7]
    } else if (cmd === 'Q') {
      const a = [x, y, n(), n(), n(), n()]
      const len = Math.hypot(a[2] - a[0], a[3] - a[1]) + Math.hypot(a[4] - a[2], a[5] - a[3])
      const k = Math.max(2, Math.ceil(len / step))
      for (let j = 1; j <= k; j++) {
        const t = j / k
        const m = 1 - t
        cur.push([m * m * a[0] + 2 * m * t * a[2] + t * t * a[4], m * m * a[1] + 2 * m * t * a[3] + t * t * a[5]])
      }
      x = a[4]
      y = a[5]
    } else i++
  }
  flush(false)
  return out
}

function area(p: Pt[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}
const cw = (p: Pt[]) => (area(p) < 0 ? p.slice().reverse() : p)

function normals(p: Pt[], closed: boolean): Pt[] {
  const n = p.length
  return p.map((_, i) => {
    const a = p[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
    const b = p[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
    const tx = b[0] - a[0]
    const ty = b[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    return [ty / l, -tx / l]
  })
}

function cum(p: Pt[]): number[] {
  const s = [0]
  for (let i = 1; i < p.length; i++) s.push(s[i - 1] + dist(p[i - 1], p[i]))
  return s
}

// Low-frequency hand wobble along the normals (seamless on closed rings).
function wob(p: Pt[], closed: boolean, amp: number, s: number, per = 12): Pt[] {
  if (amp <= 0 || p.length < 3) return p
  const c = cum(p)
  const L = c[c.length - 1] + (closed ? dist(p[p.length - 1], p[0]) : 0)
  const a = noise(s)
  const b = noise(s + 101)
  const g = (u: number) => (a(u / per) - 0.5) * 2 + (b(u / (per * 0.33)) - 0.5) * 0.55
  const ns = normals(p, closed)
  return p.map((pt, i) => {
    const u = c[i]
    const o = amp * (closed ? g(u) * (1 - u / L) + g(u - L) * (u / L) : g(u))
    return [pt[0] + ns[i][0] * o, pt[1] + ns[i][1] * o]
  })
}

// Douglas-Peucker: drop points that deviate less than eps from the chord.
function simplify(p: Pt[], eps: number): Pt[] {
  if (p.length < 4) return p
  if (dist(p[0], p[p.length - 1]) < 1) {
    // degenerate chord (rings, tapered ribbons): split at the farthest point
    let m = 1
    p.forEach((q, i) => {
      if (dist(q, p[0]) > dist(p[m], p[0])) m = i
    })
    if (m <= 1 || m >= p.length - 2) return p
    return simplify(p.slice(0, m + 1), eps).concat(simplify(p.slice(m), eps).slice(1))
  }
  const keep = new Uint8Array(p.length)
  keep[0] = keep[p.length - 1] = 1
  const st: [number, number][] = [[0, p.length - 1]]
  while (st.length) {
    const [a, b] = st.pop() as [number, number]
    const [ax, ay] = p[a]
    const dx = p[b][0] - ax
    const dy = p[b][1] - ay
    const L = Math.hypot(dx, dy) || 1e-9
    let m = -1
    let md = eps
    for (let i = a + 1; i < b; i++) {
      const dd = Math.abs((p[i][0] - ax) * dy - (p[i][1] - ay) * dx) / L
      if (dd > md) {
        md = dd
        m = i
      }
    }
    if (m > 0) {
      keep[m] = 1
      st.push([a, m], [m, b])
    }
  }
  return p.filter((_, i) => keep[i])
}

function ringD(pts: Pt[], closed: boolean): string {
  const p = simplify(pts, 0.07)
  let d = `M${q1(p[0][0])} ${q1(p[0][1])}L`
  for (let i = 1; i < p.length; i++) d += `${q1(p[i][0])} ${q1(p[i][1])} `
  return d.trimEnd() + (closed ? 'Z' : '')
}
const toD = (rings: Ring[]) => rings.map((r) => ringD(r.pts, r.closed)).join('')

interface ShapeO {
  wob?: number
  xf?: Xf
  step?: number
  per?: number
}
// A hand-drawn shape: sampled, transformed, oriented clockwise, wobbled.
function S(d: string, o: ShapeO = {}): Shape {
  const rings = parse(d, o.step ?? 0.9).map((r) => {
    let pts = o.xf ? r.pts.map(o.xf) : r.pts
    if (r.closed) pts = cw(pts)
    pts = wob(pts, r.closed, o.wob ?? 0.32, seed(), o.per ?? 12)
    return { pts, closed: r.closed }
  })
  return { rings, d: toD(rings) }
}
const joinS = (...s: Shape[]): Shape => ({ rings: s.flatMap((x) => x.rings), d: s.map((x) => x.d).join('') })
const moveS = (s: Shape, dx: number, dy: number): Shape => {
  const rings = s.rings.map((r) => ({ closed: r.closed, pts: r.pts.map((p): Pt => [p[0] + dx, p[1] + dy]) }))
  return { rings, d: toD(rings) }
}

function rot(cx: number, cy: number, deg: number, tx = cx, ty = cy, sc = 1): Xf {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a) * sc
  const s = Math.sin(a) * sc
  return ([x, y]) => [tx + (x - cx) * c - (y - cy) * s, ty + (x - cx) * s + (y - cy) * c]
}

// Variable-width ribbon around a polyline: runs where width > cut become filled,
// tapered polygons (gaps elsewhere). `out` biases the width to the +normal side.
function ribbon(p: Pt[], closed: boolean, w: number[], out: number, cut: number, tap: number): string {
  const n = p.length
  const ns = normals(p, closed)
  const on = w.map((v) => v > cut)
  if (closed && on.every(Boolean)) {
    let m = 0
    w.forEach((v, i) => {
      if (v < w[m]) m = i
    })
    on[m] = false
  }
  const runs: number[][] = []
  let run: number[] = []
  if (closed) {
    const st = on.findIndex((v) => !v)
    if (st < 0) return ''
    for (let k = 1; k <= n; k++) {
      const i = (st + k) % n
      if (on[i]) run.push(i)
      else {
        if (run.length > 1) runs.push(run)
        run = []
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (on[i]) run.push(i)
      else {
        if (run.length > 1) runs.push(run)
        run = []
      }
    }
  }
  if (run.length > 1) runs.push(run)
  let d = ''
  for (const r of runs) {
    const s = [0]
    for (let k = 1; k < r.length; k++) s.push(s[k - 1] + dist(p[r[k - 1]], p[r[k]]))
    const L = s[s.length - 1]
    const t = Math.min(tap, L / 2.2)
    const A: Pt[] = []
    const B: Pt[] = []
    r.forEach((i, k) => {
      const e = t > 0 ? Math.min(1, s[k] / t, (L - s[k]) / t) : 1
      const ww = w[i] * Math.pow(Math.max(0, e), 0.6)
      A.push([p[i][0] + ns[i][0] * ww * out, p[i][1] + ns[i][1] * ww * out])
      B.push([p[i][0] - ns[i][0] * ww * (1 - out), p[i][1] - ns[i][1] * ww * (1 - out)])
    })
    d += ringD(cw(A.concat(B.reverse())), true)
  }
  return d
}

interface LineO {
  a?: number // fraction of length used to swell in
  b?: number // fraction used to taper out
  press?: number
  wob?: number
  xf?: Xf
  min?: number
}
// A tapered brush/pen stroke along a path (or point list).
function line(src: string | Pt[], w: number, o: LineO = {}): string {
  let rings: Ring[] = typeof src === 'string' ? parse(src, 0.6) : [{ pts: src, closed: false }]
  if (o.xf) rings = rings.map((r) => ({ closed: r.closed, pts: r.pts.map(o.xf as Xf) }))
  let d = ''
  for (const r of rings) {
    const p = wob(r.pts, false, o.wob ?? 0.18, seed(), 9)
    if (p.length < 2) continue
    const c = cum(p)
    const L = c[c.length - 1] || 1
    const nz = noise(seed())
    const a = o.a ?? 0.22
    const b = o.b ?? 0.4
    const pr = o.press ?? 0.25
    const mn = o.min ?? 0
    const ws = p.map((_, i) => {
      const t = c[i] / L
      const prof = Math.max(mn, Math.min(1, smooth(0, a, t) * 1.0001, smooth(0, b, 1 - t) * 1.0001))
      return w * prof * (1 + pr * (nz(c[i] / 6) - 0.5) * 2)
    })
    d += ribbon(p, false, ws, 0.5, 0.015, 0)
  }
  return d
}

interface InkO {
  w?: number
  lo?: number // width on the lit side (fraction of w)
  dir?: Pt // direction of the heavy side (away from the light)
  out?: number
  gap?: number // break the line where width < gap·w
  press?: number
  acc?: [number, number, number, number][] // [x, y, radius, extra width]
  per?: number
}
// Pressure ink contour around every ring of a shape.
function inkD(s: Shape, o: InkO = {}): string {
  const W = o.w ?? 2.4
  const lo = o.lo ?? 0.28
  const dir = o.dir ?? [0.5, 0.866]
  const pr = o.press ?? 0.3
  const acc = o.acc ?? []
  let d = ''
  for (const r of s.rings) {
    const ns = normals(r.pts, r.closed)
    const nz = noise(seed())
    const c = cum(r.pts)
    const L = c[c.length - 1] || 1
    const w = r.pts.map((p, i) => {
      const f = ns[i][0] * dir[0] + ns[i][1] * dir[1]
      let v = W * (lo + (1 - lo) * smooth(-0.7, 0.85, f)) * (1 + pr * (nz(c[i] / (o.per ?? 7)) - 0.5) * 2)
      for (const [ax, ay, ar, am] of acc) {
        const dd = dist(p, [ax, ay])
        if (dd < ar) v += am * (1 - dd / ar) * (1 - dd / ar)
      }
      if (!r.closed) v *= Math.min(1, smooth(0, 0.12, c[i] / L) * 1.0001, smooth(0, 0.12, 1 - c[i] / L) * 1.0001)
      return v
    })
    d += ribbon(r.pts, r.closed, w, o.out ?? 0.55, W * (o.gap ?? 0.3), 2.6)
  }
  return d
}

// Inner light/shadow band hugging the edges that face `dir` (rim light, bounce).
function bandD(s: Shape, dir: Pt, w: number, lo = 0.05, hi = 0.85): string {
  let d = ''
  for (const r of s.rings) {
    if (!r.closed) continue
    const ns = normals(r.pts, true)
    const nz = noise(seed())
    const c = cum(r.pts)
    const ws = r.pts.map((_, i) => w * smooth(lo, hi, ns[i][0] * dir[0] + ns[i][1] * dir[1]) * (0.75 + 0.5 * nz(c[i] / 8)))
    d += ribbon(r.pts, true, ws, 0, w * 0.08, 3)
  }
  return d
}

function inside(polys: Pt[][], p: Pt): boolean {
  let c = false
  for (const poly of polys) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]
      const b = poly[j]
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c
    }
  }
  return c
}

interface HatchO {
  ang: number
  gap: number
  w: number
  bend?: number
  trim?: number
  jit?: number
  min?: number
  max?: number
}
// Hand hatching: tapered, slightly varied parallel strokes filling a region.
function hatch(region: Shape, o: HatchO): string {
  const polys = region.rings.filter((r) => r.closed).map((r) => r.pts)
  if (!polys.length) return ''
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of polys.flat()) {
    x0 = Math.min(x0, p[0])
    y0 = Math.min(y0, p[1])
    x1 = Math.max(x1, p[0])
    y1 = Math.max(y1, p[1])
  }
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2
  const Rn = rng(seed())
  let d = ''
  for (let k = -R; k <= R; k += o.gap * (0.7 + Rn() * 0.6)) {
    const a = ((o.ang + (Rn() - 0.5) * (o.jit ?? 7)) * Math.PI) / 180
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    const bend = (o.bend ?? 0) * (0.6 + Rn() * 0.8)
    const pts: Pt[] = []
    const ins: boolean[] = []
    for (let t = -R; t <= R; t += 0.6) {
      const off = k + (bend * t * t) / R
      const p: Pt = [cx + ux * t - uy * off, cy + uy * t + ux * off]
      pts.push(p)
      ins.push(inside(polys, p))
    }
    let run: Pt[] = []
    const emit = () => {
      if (run.length < 3) return
      const tr = o.trim ?? 0.25
      const n = run.length
      const s0 = Math.floor(n * tr * Rn())
      const s1 = n - Math.floor(n * tr * Rn())
      let seg = run.slice(s0, s1)
      const mx = o.max ?? 999
      while (seg.length >= 3) {
        const len = Math.min(seg.length, Math.round((mx / 0.6) * (0.6 + Rn() * 0.5)))
        const piece = seg.slice(0, len)
        if (piece.length * 0.6 >= (o.min ?? 1.6)) d += line(piece, o.w * (0.75 + Rn() * 0.5), { a: 0.15, b: 0.5, wob: 0.12 })
        seg = seg.slice(len + Math.round(1 + Rn() * 3))
      }
    }
    pts.forEach((p, i) => {
      if (ins[i]) run.push(p)
      else {
        emit()
        run = []
      }
    })
    emit()
  }
  return d
}

// Organic paint dab: irregular soft blob built from stacked translucent layers.
function blobD(cx: number, cy: number, rx: number, ry: number, deg: number, irr = 0.28): string {
  const nz = noise(seed())
  const a0 = (deg * Math.PI) / 180
  const pts: Pt[] = []
  for (let i = 0; i < 36; i++) {
    const t = (i / 36) * Math.PI * 2
    const k = 1 + irr * (nz((i / 36) * 7) - 0.5) * 2
    const x = Math.cos(t) * rx * k
    const y = Math.sin(t) * ry * k
    pts.push([cx + x * Math.cos(a0) - y * Math.sin(a0), cy + x * Math.sin(a0) + y * Math.cos(a0)])
  }
  return ringD(cw(pts), true)
}
function dab(cx: number, cy: number, rx: number, ry: number, deg: number, color: string, alpha: number, clip: string, blend?: GlobalCompositeOperation): VectorPath[] {
  // an elongated dab is laid down as a few overlapping soft round touches
  const v = color.replace('#', '')
  const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)).join(',')
  const r = Math.min(rx, ry)
  const n = Math.max(1, Math.round(Math.max(rx, ry) / r))
  const a = (deg * Math.PI) / 180
  const ax = rx >= ry ? [Math.cos(a), Math.sin(a)] : [-Math.sin(a), Math.cos(a)]
  const span = Math.max(rx, ry) - r
  const Rn = rng(seed())
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1
    const x = cx + ax[0] * span * t + (Rn() - 0.5) * r * 0.3
    const y = cy + ax[1] * span * t + (Rn() - 0.5) * r * 0.3
    const rr = r * (1.15 + Rn() * 0.25)
    return { d: blobD(x, y, rr, rr * (0.8 + Rn() * 0.3), Rn() * 180, 0.3), fill: softR(x, y, rr, c, +(alpha / Math.sqrt(n)).toFixed(3)), clip, blend }
  })
}

// Paper / canvas grain: tiny tapered flecks.
function grainD(x0: number, y0: number, x1: number, y1: number, n: number, len: number, w: number): string {
  const R = rng(seed())
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0)
    const y = y0 + R() * (y1 - y0)
    const a = ((40 + (R() - 0.5) * 70) * Math.PI) / 180
    const l = len * (0.4 + R())
    const ww = w * (0.5 + R())
    const ux = Math.cos(a) * l
    const uy = Math.sin(a) * l
    const vx = -Math.sin(a) * ww
    const vy = Math.cos(a) * ww
    d += ringD(cw([[x - ux, y - uy], [x + vx, y + vy], [x + ux, y + uy], [x - vx, y - vy]]), true)
  }
  return d
}

// Fine crossing threads (weave hint) over a box.
function weaveD(x0: number, y0: number, x1: number, y1: number, gap: number, ang: number): string {
  let d = ''
  const a = (ang * Math.PI) / 180
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const R = Math.hypot(x1 - x0, y1 - y0) / 2
  for (let k = -R; k <= R; k += gap) {
    d += `M${q1(cx - ux * R - uy * k)} ${q1(cy - uy * R + ux * k)}L${q1(cx + ux * R - uy * k)} ${q1(cy + uy * R + ux * k)}`
  }
  return d
}

// Painting shortcuts.
const fillP = (s: Shape, fill: Paint): VectorPath => ({ d: s.d, fill })
const inP = (s: Shape, d: string, fill: Paint, blend?: GlobalCompositeOperation, alpha?: number): VectorPath => ({ d, fill, clip: s.d, blend, alpha })
const softR = (cx: number, cy: number, r: number, c: string, a: number): Paint =>
  rad(cx, cy, r, 0, `rgba(${c},${a})`, 0.55, `rgba(${c},${+(a * 0.45).toFixed(3)})`, 1, `rgba(${c},0)`)

// =================================================================================
// Ninja: Kagero
// =================================================================================
export function ninja(): Art {
  SEED = 4242
  const INKC = '#130e1d'
  const RIM = '255,128,72'
  const RIMHI = '255,214,160'
  const out: VectorPath[] = []
  const sil: string[] = []
  const add = (...p: VectorPath[]) => out.push(...p)
  const ink = (s: Shape, o: InkO = {}, color = INKC) => add({ d: inkD(s, o), fill: color })
  const stroke = (src: string | Pt[], w: number, color: string, o: LineO = {}, clip?: string, alpha?: number) =>
    add({ d: line(src, w, o), fill: color, clip, alpha })

  // ---------------------------------------------------------------- scarf tails
  const tail = (spine: string, w0: number, w1: number, tw0: number, tw1: number, flut: number, front: [string, string], back: [string, string]) => {
    const sp = parse(spine, 0.7)[0].pts
    const c = cum(sp)
    const L = c[c.length - 1]
    const ns = normals(sp, false)
    const nz = noise(seed())
    const mid: Pt[] = sp.map((p, i) => {
      const t = c[i] / L
      const o = flut * t * Math.sin(t * 9 + 0.5) + (nz(c[i] / 10) - 0.5) * 2 * t
      return [p[0] + ns[i][0] * o, p[1] + ns[i][1] * o]
    })
    const nm = normals(mid, false)
    const vals = mid.map((_, i) => {
      const t = c[i] / L
      return Math.cos(tw0 + (tw1 - tw0) * t) * (w0 + (w1 - w0) * t)
    })
    // split into runs by sign of the twisted width (front face / back face)
    const parts: { pts: Pt[]; front: boolean; i0: number; i1: number }[] = []
    let st = 0
    for (let i = 1; i <= mid.length; i++) {
      if (i === mid.length || Math.sign(vals[i]) !== Math.sign(vals[st])) {
        const A: Pt[] = []
        const B: Pt[] = []
        for (let k = Math.max(0, st - 1); k < Math.min(mid.length, i + 1); k++) {
          const h = Math.abs(vals[k]) / 2 + 0.25
          const edge = 0.6 * Math.sin(c[k] * 0.9)
          A.push([mid[k][0] + nm[k][0] * (h + edge * 0.3), mid[k][1] + nm[k][1] * (h + edge * 0.3)])
          B.push([mid[k][0] - nm[k][0] * h, mid[k][1] - nm[k][1] * h])
        }
        parts.push({ pts: A.concat(B.reverse()), front: vals[st] >= 0, i0: st, i1: i })
        st = i
      }
    }
    for (const p of parts) {
      const sh: Shape = { rings: [{ pts: cw(p.pts), closed: true }], d: ringD(cw(p.pts), true) }
      const [c0, c1] = p.front ? front : back
      const a = mid[p.i0]
      const b = mid[Math.min(mid.length - 1, p.i1)]
      add(fillP(sh, lin(a[0], a[1] - 6, b[0], b[1] + 6, 0, c0, 1, c1)))
      // fold crease running along the ribbon
      const cr = mid.slice(p.i0, p.i1).map((m, k): Pt => {
        const j = p.i0 + k
        const off = vals[j] * 0.12
        return [m[0] + nm[j][0] * off, m[1] + nm[j][1] * off]
      })
      if (cr.length > 6) add({ d: line(cr, 1.3, { a: 0.3, b: 0.3 }), fill: p.front ? 'rgba(120,0,20,0.55)' : 'rgba(40,0,10,0.6)', clip: sh.d })
      if (p.front && cr.length > 6) {
        const hl = cr.map((m, k): Pt => {
          const j = p.i0 + k
          return [m[0] - nm[j][0] * Math.abs(vals[j]) * 0.28, m[1] - nm[j][1] * Math.abs(vals[j]) * 0.28]
        })
        add({ d: line(hl, 1.1, { a: 0.3, b: 0.5 }), fill: 'rgba(255,190,150,0.55)', clip: sh.d })
      }
      add(inP(sh, bandD(sh, [0.4, -0.9], 2.2), `rgba(${RIM},0.85)`, 'screen'))
      ink(sh, { w: 1.9, lo: 0.3 })
    }
  }

  // tail behind (rises above the right shoulder)
  tail('M104 132 C116 126 128 116 138 106 C146 98 154 94 166 94', 13, 10, 0.5, 3.7, 2.4, ['#ff6a50', '#c41e24'], ['#8a1420', '#5a0a16'])

  // ---------------------------------------------------------------- torso / tunic
  const torso = S('M46 131 C34 135 24 141 17 152 C10 163 6 178 4 196 C3 199 6 201 10 202 C36 205 76 206 104 203 C118 201 130 198 137 194 C140 182 137 170 129 162 C121 154 109 148 101 136 Z')
  sil.push(torso.d)
  add(fillP(torso, lin(10, 140, 130, 205, 0, '#46528a', 0.35, '#2c3462', 0.75, '#1c2146', 1, '#12152e')))
  // painted colour patches: cool key on the left chest, warm purple bounce, sunset on the right
  add(...dab(40, 168, 22, 14, -30, '#6c78b8', 0.55, torso.d, 'screen'))
  add(...dab(78, 186, 26, 12, 10, '#5a3c7a', 0.5, torso.d))
  add(...dab(124, 178, 12, 20, 0, '#a04a5a', 0.45, torso.d, 'screen'))
  // core shadow: right side of the chest and below the scarf
  const torsoSh = S('M60 150 C76 160 92 160 104 150 C112 158 122 166 128 176 C132 184 134 190 136 196 C120 202 100 205 80 205 C88 196 96 186 98 174 C99 166 92 160 80 160 C72 160 64 156 60 150 Z')
  add(inP(torso, torsoSh.d, '#2a2350', 'multiply', 0.85))
  add({ d: hatch(torsoSh, { ang: 62, gap: 1.9, w: 0.55, bend: 0.12, max: 24, jit: 4 }), fill: INKC, alpha: 0.5, clip: torso.d })
  // fold shapes radiating from the raised left shoulder and the neck
  const folds: [string, number][] = [
    ['M28 160 C38 170 48 182 54 198', 1.6],
    ['M24 170 C32 178 38 188 40 200', 1.3],
    ['M50 150 C60 162 66 176 68 192', 1.2],
    ['M112 160 C116 172 116 186 112 200', 1.5],
    ['M120 166 C126 176 128 186 128 196', 1.1],
    ['M90 168 C96 178 98 190 96 202', 1.0],
  ]
  for (const [f, w] of folds) {
    stroke(f, w * 1.6, 'rgba(10,8,30,0.55)', { a: 0.15, b: 0.6 }, torso.d)
    stroke(f.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_m, x: string, y: string) => `${+x - 1.4} ${+y - 0.6}`), w * 0.8, 'rgba(150,160,230,0.35)', { a: 0.3, b: 0.5 }, torso.d)
  }
  // crossed kimono collar with a chain-mesh undershirt in the V
  const vee = S('M57 148 C61 160 64 170 66 180 C74 168 84 157 92 147 Z')
  add(fillP(vee, '#141428'))
  add({ d: weaveD(56, 146, 94, 182, 1.7, 45) + weaveD(56, 146, 94, 182, 1.7, -45), stroke: 'rgba(160,170,210,0.35)', sw: 0.35, clip: vee.d })
  add(inP(vee, vee.d, lin(60, 148, 70, 180, 0, 'rgba(0,0,0,0.6)', 1, 'rgba(0,0,0,0)'), 'multiply'))
  const lapL = S('M50 146 C54 160 58 172 62 188 L67 181 C64 168 61 157 57 147 Z')
  add(fillP(lapL, lin(50, 150, 66, 180, 0, '#3a4378', 1, '#232955')))
  ink(lapL, { w: 1.4 })
  const lapR = S('M90 144 C84 160 74 180 62 205 L74 205 C84 184 92 166 99 150 Z')
  add(fillP(lapR, lin(84, 150, 74, 205, 0, '#4a5694', 0.5, '#2e3666', 1, '#1a1e40')))
  add(inP(lapR, line('M95 150 C88 166 80 184 72 204', 1.2), 'rgba(170,180,240,0.5)'))
  add(inP(lapR, bandD(lapR, [0.9, 0.4], 2.4), 'rgba(10,8,30,0.6)', 'multiply'))
  ink(lapR, { w: 1.8, acc: [[66, 200, 8, 1.2]] })
  // sunset rim + ink on the torso silhouette
  add(inP(torso, torso.d, lin(100, 160, 138, 170, 0, 'rgba(255,120,70,0)', 1, 'rgba(255,120,70,0.28)'), 'screen'))
  add(inP(torso, bandD(torso, [0.75, -0.65], 3), `rgba(${RIM},0.7)`, 'screen'))
  add(inP(torso, bandD(torso, [0.8, -0.6], 1.6, 0.4), `rgba(${RIMHI},0.8)`, 'screen'))
  // bottom of the bust melts into shadow so it sits on the plinth
  add(inP(torso, torso.d, lin(0, 186, 0, 205, 0, 'rgba(10,6,24,0)', 1, 'rgba(10,6,24,0.75)'), 'multiply'))
  ink(torso, { w: 3, lo: 0.25, acc: [[96, 140, 10, 1.2], [44, 134, 8, 1]] })

  // ---------------------------------------------------------------- scarf, part behind the neck
  const scarfBack = S('M92 124 C100 118 110 119 115 126 C118 132 117 139 112 144 L96 142 Z')
  add(fillP(scarfBack, lin(96, 120, 114, 144, 0, '#8a1420', 1, '#4a0610')))
  add(inP(scarfBack, bandD(scarfBack, [0.7, -0.7], 2.4), `rgba(${RIM},0.8)`, 'screen'))
  ink(scarfBack, { w: 2 })

  // ---------------------------------------------------------------- head (hood + mask)
  const hx = rot(72, 120, -5)
  const hood = S('M60 33 C78 29 97 36 106 52 C112 63 114 77 112 91 C110 104 104 114 98 124 C94 130 92 136 92 142 L52 142 C47 136 42 129 39 122 C36 115 35 108 34 101 C33 96 31.5 92 32 87 C32 83 31 80 32 76 C33 68 36 57 42 48 C47 40 52 35 60 33 Z', { xf: hx })
  sil.push(hood.d)
  // knot flaps at the back of the hood, fluttering
  const flapA = S('M104 54 C112 46 122 40 134 38 C130 44 126 50 124 56 C118 58 111 60 106 62 Z', { xf: hx })
  const flapB = S('M106 60 C116 60 126 64 134 72 C126 74 118 72 110 70 Z', { xf: hx })
  for (const f of [flapB, flapA]) {
    add(fillP(f, lin(104, 50, 134, 70, 0, '#3a4478', 1, '#1a1d3c')))
    add(inP(f, bandD(f, [0.3, -0.95], 2.4), `rgba(${RIM},0.85)`, 'screen'))
    ink(f, { w: 1.8 })
  }
  add(fillP(hood, lin(40, 40, 110, 130, 0, '#4a5690', 0.4, '#2b3364', 0.8, '#1a1f42', 1, '#121530')))
  // painted patches
  add(...dab(56, 52, 18, 12, -35, '#8790d8', 0.5, hood.d, 'screen'))
  add(...dab(84, 46, 14, 9, 10, '#6f7cc4', 0.35, hood.d, 'screen'))
  add(...dab(44, 70, 8, 14, 0, '#6a4c8a', 0.45, hood.d))
  add(...dab(62, 132, 22, 9, 0, '#c84a50', 0.35, hood.d, 'screen'))
  add(...dab(100, 100, 10, 20, 10, '#3a2a5a', 0.5, hood.d))
  // core shadow (back of the skull, under the jaw), hard-edged like a cel shape
  const hoodSh = S('M86 34 C96 40 104 50 106 62 C108 76 104 88 100 98 C96 108 90 118 84 126 C78 132 70 137 58 142 L94 142 C96 134 100 126 104 118 C110 106 114 92 113 78 C112 62 106 46 94 38 C91 36 89 35 86 34 Z', { xf: hx })
  add(inP(hood, hoodSh.d, '#2b2152', 'multiply', 0.9))
  add({ d: hatch(hoodSh, { ang: 58, gap: 1.8, w: 0.6, bend: 0.25, max: 26, jit: 4 }), fill: INKC, alpha: 0.55, clip: hood.d })
  const nape = S('M98 104 C104 108 106 118 100 128 C96 134 94 140 92 142 L84 142 C90 132 96 120 98 104 Z', { xf: hx })
  add({ d: hatch(nape, { ang: -25, gap: 1.6, w: 0.5, max: 14, jit: 4 }), fill: INKC, alpha: 0.5, clip: hood.d })
  // ear swelling under the cloth
  stroke('M90 86 C97 86 101 93 100 100 C99 105 96 107 92 107', 1.6, 'rgba(10,8,30,0.6)', { a: 0.2, b: 0.5, xf: hx }, hood.d)
  stroke('M89 87 C95 87 98 92 98 98', 1, 'rgba(160,170,240,0.45)', { xf: hx }, hood.d)
  // fabric folds from the knot toward the face
  const hoodFolds: [string, number, boolean][] = [
    ['M104 58 C92 50 76 44 60 41', 1.4, true],
    ['M104 62 C96 64 88 70 84 77', 1.2, true],
    ['M106 66 C104 76 102 84 100 90', 1.1, false],
    ['M98 120 C92 124 86 130 82 138', 1.3, false],
    ['M104 110 C100 116 96 120 90 124', 1, false],
  ]
  for (const [f, w, lit] of hoodFolds) {
    stroke(f, w * 1.6, 'rgba(8,6,24,0.6)', { a: 0.15, b: 0.6, xf: hx }, hood.d)
    if (lit) stroke(f, w * 0.7, 'rgba(170,180,250,0.4)', { a: 0.3, b: 0.5, xf: (p) => hx([p[0] - 0.8, p[1] - 1.2]) }, hood.d)
  }
  // mask: nose tents the cloth, folds radiate to the jaw and chin
  const noseSh = S('M51 100 C53 104 53 108 50 112 C56 113 63 111 68 107 C61 107 55 104 51 100 Z', { xf: hx })
  add(inP(hood, noseSh.d, '#1e1a40', 'multiply', 0.8))
  stroke('M50 99 C50 103 49 107 47 110', 1.4, 'rgba(170,180,250,0.55)', { xf: hx }, hood.d)
  const maskFolds: [string, number][] = [
    ['M52 111 C60 115 68 118 78 120', 1.5],
    ['M50 113 C52 118 54 123 56 128', 1.2],
    ['M58 106 C66 107 74 108 84 106', 1.1],
    ['M54 116 C62 122 70 126 80 128', 1.0],
  ]
  for (const [f, w] of maskFolds) {
    stroke(f, w * 1.7, 'rgba(8,6,24,0.6)', { a: 0.1, b: 0.7, xf: hx }, hood.d)
    stroke(f, w * 0.7, 'rgba(160,170,240,0.4)', { a: 0.3, b: 0.6, xf: (p) => hx([p[0] - 0.6, p[1] - 1.3]) }, hood.d)
  }
  // rim light from the setting sun, with a broad warm spill on the turned-away side
  add(inP(hood, hood.d, lin(...hx([80, 60]), ...hx([114, 70]), 0, 'rgba(255,120,70,0)', 1, 'rgba(255,120,70,0.3)'), 'screen'))
  add(inP(hood, bandD(hood, [0.9, -0.35], 2.4), `rgba(${RIM},0.75)`, 'screen'))
  add(inP(hood, bandD(hood, [0.92, -0.3], 1.1, 0.5), `rgba(${RIMHI},0.85)`, 'screen'))

  // eye slit (skin)
  const slit = S('M32 80 C44 77 60 75 76 77 C84 78 90 80 95 84 C93 87 90 89 86 91 C76 95 66 97 58 97 C55 97 53 96 51 93 C49 96 46 98 42 98 C38 98 35 97 33 96 C32 91 32 85 32 80 Z', { xf: hx, wob: 0.2 })
  add(fillP(slit, lin(32, 80, 95, 92, 0, '#ffd6b0', 0.45, '#f0ae84', 1, '#b86a5a')))
  add(...dab(46, 92, 6, 3, 0, '#ff8a7a', 0.5, slit.d))
  add(...dab(70, 93, 8, 3, 0, '#ff8a7a', 0.4, slit.d))
  // shadow cast by the hood hem across the top of the slit + turning-away cheek
  add(inP(slit, S('M30 78 C46 75 66 74 96 82 L95 86 C80 84 66 82 56 83 C48 84 40 85 31 86 Z', { xf: hx }).d, '#a65a68', 'multiply', 0.85))
  add(inP(slit, S('M80 78 C88 80 94 82 96 84 C92 90 86 92 80 94 C82 88 82 82 80 78 Z', { xf: hx }).d, '#9a5464', 'multiply', 0.8))
  // frown creases + nose bridge
  stroke('M52.5 82.5 C52.8 84.5 52.6 86.5 52 88', 0.7, 'rgba(110,40,40,0.7)', { xf: hx })
  stroke('M54.5 83.5 C55 85 55.2 86.5 54.8 88', 0.5, 'rgba(110,40,40,0.5)', { xf: hx })
  stroke('M52 89 C52.6 91 52.4 93 51.4 94.5', 0.9, 'rgba(255,230,200,0.7)', { xf: hx })
  // eyes
  const eyeN = S('M58 89.6 C62 85.6 70 84.2 77 85.8 C74 90 66 92.6 59 90.8 Z', { xf: hx, wob: 0.12 })
  const eyeF = S('M35 87.2 C38 84.8 44 84.4 48.6 89.4 C45 91.6 39 91.6 35 87.2 Z', { xf: hx, wob: 0.12 })
  for (const [e, ix, iy, r] of [[eyeN, 66.4, 88.4, 3.5], [eyeF, 42.6, 88.4, 2.9]] as [Shape, number, number, number][]) {
    const [cx, cy] = hx([ix, iy])
    add(fillP(e, rad(cx - 2, cy - 2, 12, 0, '#fffaf0', 1, '#cdbfc6')))
    add({ d: blobD(cx, cy, r * 0.88, r, 0, 0.04), fill: rad(cx, cy - 0.6, r, 0, '#fff2b0', 0.45, '#f2a628', 0.85, '#a8500c', 1, '#4a1e06'), clip: e.d })
    add({ d: blobD(cx, cy + 0.2, r * 0.42, r * 0.5, 0, 0.05), fill: '#120a08', clip: e.d })
    add(inP(e, S('M30 80 L80 80 L80 89 C70 86 60 86 30 88 Z', { xf: hx }).d, 'rgba(90,40,70,0.55)', 'multiply'))
    add({ d: blobD(cx - r * 0.38, cy - r * 0.3, r * 0.26, r * 0.22, 0, 0.05), fill: '#ffffff', clip: e.d })
    add({ d: blobD(cx + r * 0.4, cy + r * 0.45, r * 0.12, r * 0.1, 0, 0.05), fill: 'rgba(255,255,255,0.8)', clip: e.d })
  }
  // lids: heavy upper lid with a flick at the outer corner, broken lower lid
  stroke('M57.6 90 C61 86 69 84 77.4 85.6 C78.6 85.4 79.6 84.8 80.4 83.8', 1.9, INKC, { a: 0.1, b: 0.25, xf: hx })
  stroke('M76 86.8 C73 90.2 67 92.2 61 91.4', 0.7, 'rgba(60,20,30,0.85)', { a: 0.3, b: 0.4, xf: hx })
  stroke('M49 90 C45 85.4 39 84.4 35 87 C34 87.5 33.4 87.6 32.8 87.4', 1.6, INKC, { a: 0.1, b: 0.3, xf: hx })
  stroke('M46.5 90.8 C43 91.8 39 91.2 36.4 88.6', 0.6, 'rgba(60,20,30,0.8)', { a: 0.3, b: 0.4, xf: hx })
  // angry brows (brushy)
  const browN = S('M55 87 C59 84 67 81.4 80.6 79.6 C79 81 72 82.6 66 84.4 C61 85.8 58 87.2 56.4 88.4 Z', { xf: hx, wob: 0.15 })
  const browF = S('M50.6 86.8 C46 84 40 82.4 33 82 C35 83.4 40 84.6 44 86 C47 87 49 88 50 88.4 Z', { xf: hx, wob: 0.15 })
  add(fillP(joinS(browN, browF), INKC))
  stroke('M58 85.6 C64 83.2 70 82 76 81', 0.5, 'rgba(120,90,110,0.6)', { xf: hx })

  // hood hem above the slit (rolled edge) and mask hem below it
  const hemT = S('M30 75 C44 71 62 69 78 71 C87 72 93 76 97.5 82 C92 80.5 86 78.6 78 77.6 C62 75.6 46 76.6 31 80.6 Z', { xf: hx, wob: 0.2 })
  add(fillP(hemT, lin(0, 70, 0, 81, 0, '#6a78ba', 0.6, '#36407a', 1, '#1c2048')))
  add(inP(hemT, bandD(hemT, [0.85, -0.3], 2), `rgba(${RIM},0.8)`, 'screen'))
  ink(hemT, { w: 1.7, lo: 0.35, acc: [[60, 77, 30, 0.4]] })
  const hemB = S('M32.6 95 C36 97 39 98 42 98 C46 98 49 96 51 93 C53 96 55 97 58 97 C66 97 76 95 86 91 C89.5 89.5 92.5 87.5 95.5 85 C96 88 94 91 90 94 C80 99 68 102.6 58 102.6 C54.6 102.6 52.6 100.6 51.4 98.6 C48.6 101.6 44 103 39 102.6 C36 102.4 34 101.4 33 100 Z', { xf: hx, wob: 0.2 })
  add(fillP(hemB, lin(0, 93, 0, 103, 0, '#7a86c6', 0.45, '#3c4682', 1, '#1e2250')))
  add(inP(hemB, bandD(hemB, [0.3, 0.95], 1.6), 'rgba(8,6,24,0.6)', 'multiply'))
  ink(hemB, { w: 1.6, lo: 0.3 })
  ink(slit, { w: 1.1, lo: 0.5 })
  ink(hood, { w: 3.2, lo: 0.22, acc: [[94, 126, 12, 1.4], [40, 122, 8, 0.8]] })

  // ---------------------------------------------------------------- scarf wrap (front) + knot
  const scarf = S('M38 128 C46 134 60 138 76 137 C88 136 98 132 106 126 C111 131 113 138 111 145 C110 150 106 154 100 156 C86 161 66 161 50 157 C42 155 37 150 36 143 C35 137 36 132 38 128 Z')
  sil.push(scarf.d)
  // contact shadow of the scarf on the head/neck and chest
  add({ d: moveS(scarf, 2, 4).d, fill: 'rgba(10,6,30,0.55)', clip: torso.d, blend: 'multiply' })
  add({ d: moveS(scarf, 1, -3).d, fill: 'rgba(10,6,30,0.45)', clip: hood.d, blend: 'multiply' })
  const underScarf = S('M66 157 C82 161 98 157 108 150 C113 156 113 163 106 167 C94 170 78 167 66 157 Z')
  add({ d: hatch(underScarf, { ang: 62, gap: 1.5, w: 0.5, max: 12, jit: 4 }) + hatch(underScarf, { ang: -28, gap: 1.7, w: 0.45, max: 10, jit: 4 }), fill: INKC, alpha: 0.5, clip: torso.d })
  add(fillP(scarf, lin(38, 128, 108, 158, 0, '#ff6a52', 0.4, '#d8302c', 0.8, '#9a1620', 1, '#6a0c16')))
  add(...dab(54, 138, 14, 5, 5, '#ffb08a', 0.5, scarf.d, 'screen'))
  add(...dab(92, 150, 14, 6, -10, '#5a0a24', 0.55, scarf.d, 'multiply'))
  const scarfSh = S('M70 149 C82 148 94 144 104 136 C110 140 111 146 108 151 C100 157 86 160 72 160 C60 160 50 158 44 154 C54 154 62 152 70 149 Z')
  add(inP(scarf, scarfSh.d, '#8a2a4a', 'multiply', 0.85))
  add({ d: hatch(scarfSh, { ang: 28, gap: 1.6, w: 0.5, max: 14, jit: 4, bend: 0.1 }), fill: '#3a0612', alpha: 0.55, clip: scarf.d })
  const wraps = ['M39 137 C52 145 76 147 107 135', 'M38 147 C54 154 80 154 109 144', 'M44 131 C58 138 80 139 100 132']
  for (const f of wraps) {
    stroke(f, 2.2, 'rgba(90,0,20,0.7)', { a: 0.2, b: 0.4 }, scarf.d)
    stroke(f.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_m, x: string, y: string) => `${x} ${+y - 1.6}`), 1.1, 'rgba(255,190,150,0.6)', { a: 0.25, b: 0.5 }, scarf.d)
  }
  add(inP(scarf, bandD(scarf, [0.85, -0.5], 2.4), `rgba(${RIM},0.85)`, 'screen'))
  ink(scarf, { w: 2.6, acc: [[100, 156, 10, 1]] })
  const knot = S('M90 142.4 C93.6 137.4 100.6 136 105.6 138.6 C108.6 140.4 110.8 143.6 110 147.4 C112 150.6 110 155.6 105 157 C100 158.8 93.4 157.4 90.4 152.6 C88.4 149.4 88.4 145.4 90 142.4 Z')
  add({ d: moveS(knot, 1.5, 2).d, fill: 'rgba(40,0,10,0.5)', clip: scarf.d, blend: 'multiply' })
  add(fillP(knot, lin(90, 138, 110, 157, 0, '#ff7a5a', 0.45, '#cc2a2a', 1, '#701020')))
  // pleats pinched toward the knot's right side
  for (const [f, w] of [['M91 145 C96 145 101 146.6 106 149', 1.3], ['M92 151 C97 150.4 102 150 107 149.6', 1.1], ['M96 139.6 C99 142.4 102.6 145.6 106 148.6', 1.2], ['M94 155.4 C98 153.6 102 151.6 106.6 150.4', 1]] as [string, number][]) {
    stroke(f, w * 1.4, 'rgba(80,0,16,0.75)', { a: 0.2, b: 0.6 }, knot.d)
    stroke(f.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_m, x: string, y: string) => `${x} ${+y - 1}`), w * 0.6, 'rgba(255,180,140,0.6)', { a: 0.2, b: 0.6 }, knot.d)
  }
  add(inP(knot, bandD(knot, [0.8, -0.5], 1.8), `rgba(${RIM},0.85)`, 'screen'))
  ink(knot, { w: 2, acc: [[106, 149, 4, 0.8]] })
  // front tail
  tail('M102 152 C112 158 124 156 136 150 C146 145 156 146 168 152', 12, 9, 0.2, 4.6, 2.2, ['#ff7258', '#c8222a'], ['#8a1420', '#540814'])

  // ---------------------------------------------------------------- forearm, fist and kunai
  // sleeve bunched at the elbow (bottom-left), then the bandaged forearm rising to the fist
  const sleeve = S('M2 186 C8 182 16 182 22 186 C28 190 32 196 33 203 C22 205.4 10 205 1 202.6 C0.6 196 0.8 190 2 186 Z')
  sil.push(sleeve.d)
  add({ d: moveS(sleeve, 6, 2).d, fill: 'rgba(10,6,30,0.45)', clip: torso.d, blend: 'multiply' })
  add(fillP(sleeve, lin(2, 184, 30, 204, 0, '#4a5690', 0.6, '#262d5c', 1, '#141834')))
  stroke('M6 190 C12 192 18 196 20 203', 1.6, 'rgba(8,6,24,0.7)', { a: 0.1, b: 0.6 }, sleeve.d)
  stroke('M14 186 C20 189 25 194 27 201', 1.3, 'rgba(8,6,24,0.6)', { a: 0.1, b: 0.6 }, sleeve.d)
  stroke('M5 188.6 C10 189.6 15 193 17.6 199', 0.8, 'rgba(160,170,240,0.5)', {}, sleeve.d)
  ink(sleeve, { w: 2.4, lo: 0.3 })
  // forearm as a foreshortened cylinder: axis from the elbow (17,198) to the wrist (37,157)
  const arm = S('M3.4 191 C4.2 182 11 172 19 164 C23 160 26.6 156.8 30 154.8 C34 153.4 39 154.2 43.6 158.6 C41.6 166 37.6 176 32.6 189 C30.4 195.6 24.6 199.8 17.4 199.8 C10 199.6 5 196.4 3.4 191 Z')
  sil.push(arm.d)
  add({ d: moveS(arm, 7, 3).d, fill: 'rgba(10,6,30,0.5)', clip: torso.d, blend: 'multiply' })
  add(fillP(arm, lin(8, 172, 40, 182, 0, '#d0d4f0', 0.4, '#9a9fc8', 1, '#55598a')))
  add(...dab(18, 176, 3.4, 12, 34, '#eef0ff', 0.55, arm.d, 'screen'))
  const armSh = S('M33 158 C37 158 41 159 44 160 C42 168 37 180 32 192 C29 197 25 199 21 200 C27 188 32 172 33 158 Z')
  add(inP(arm, armSh.d, '#625a96', 'multiply', 0.75))
  add({ d: hatch(armSh, { ang: 25, gap: 1.5, w: 0.45, max: 14, jit: 4 }), fill: INKC, alpha: 0.45, clip: arm.d })
  // bandage turns: arcs around the cylinder, slanted like a spiral, overlap shadow under each edge
  const ax: Pt = [19 / 45.2, -41 / 45.2]
  const pp: Pt = [-ax[1], ax[0]]
  for (let k = 0; k < 7; k++) {
    const t = 3.4 + k * 5.5 + [0, 0.8, -0.6, 0.4, 1, -0.4, 0.2][k]
    const cx = 18 + ax[0] * t
    const cy = 198 + ax[1] * t
    const hw = 12.6 - t * 0.14
    const L: Pt = [cx - pp[0] * hw + ax[0] * 1.6, cy - pp[1] * hw + ax[1] * 1.6]
    const R: Pt = [cx + pp[0] * hw - ax[0] * 1.2, cy + pp[1] * hw - ax[1] * 1.2]
    const sag = 2.6
    const c1: Pt = [L[0] + pp[0] * hw * 0.6 - ax[0] * sag, L[1] + pp[1] * hw * 0.6 - ax[1] * sag]
    const c2: Pt = [R[0] - pp[0] * hw * 0.6 - ax[0] * sag, R[1] - pp[1] * hw * 0.6 - ax[1] * sag]
    const e = (o: number) => `M${q1(L[0] - ax[0] * o)} ${q1(L[1] - ax[1] * o)}C${q1(c1[0] - ax[0] * o)} ${q1(c1[1] - ax[1] * o)} ${q1(c2[0] - ax[0] * o)} ${q1(c2[1] - ax[1] * o)} ${q1(R[0] - ax[0] * o)} ${q1(R[1] - ax[1] * o)}`
    add({ d: line(e(1.6), 2.6, { a: 0.3, b: 0.3 }), fill: 'rgba(60,46,110,0.35)', clip: arm.d, blend: 'multiply' })
    add({ d: line(e(0), 1, { a: 0.05, b: 0.6 }), fill: 'rgba(20,14,40,0.9)', clip: arm.d })
    add({ d: line(e(-1.1), 0.8, { a: 0.4, b: 0.4 }), fill: 'rgba(255,255,255,0.6)', clip: arm.d })
  }
  add({ d: weaveD(4, 150, 46, 200, 1.1, 64) + weaveD(4, 150, 46, 200, 1.4, -26), stroke: 'rgba(40,36,80,0.16)', sw: 0.22, clip: arm.d })
  add(inP(arm, bandD(arm, [0.9, -0.3], 2.2), `rgba(${RIM},0.75)`, 'screen'))
  ink(arm, { w: 2.2, lo: 0.3, acc: [[24, 196, 6, 1]] })
  // kunai + fist share a tilted local frame
  const fx = rot(0, 0, -16, 38, 145, 0.86)
  // ring pommel (behind the fist)
  const ring = S('M-4.6 19 C-4.6 15.6 -2.4 13.4 0.2 13.4 C3 13.4 4.8 15.8 4.6 19 C4.4 22.2 2.4 24.4 -0.2 24.4 C-2.8 24.4 -4.6 22 -4.6 19 Z M-2.2 19 C-2.2 20.8 -1.2 22 0 22 C1.4 22 2.2 20.6 2.2 19 C2.2 17.2 1.2 16 0 16 C-1.4 16 -2.2 17.4 -2.2 19 Z', { xf: fx, wob: 0.1 })
  add({ d: ring.d, fill: lin(32, 156, 44, 170, 0, '#e8eef6', 0.5, '#7a8496', 1, '#363c4c'), rule: 'evenodd' })
  add({ d: inkD(ring, { w: 1.2 }), fill: INKC })
  // blade: lit bevel / shadow bevel split by the ridge
  const bladeL = S('M-2.6 -12 C-5.4 -20 -6.6 -29 -5 -37 C-3.6 -45 -1.4 -53 0 -60 C0.2 -52 0.4 -41 0.5 -31 C0.6 -23 0.4 -16 0.2 -12 Z', { xf: fx, wob: 0.08 })
  const bladeR = S('M0.2 -12 C0.4 -16 0.6 -23 0.5 -31 C0.4 -41 0.2 -52 0 -60 C1.2 -53 3 -45 4.2 -37 C5.2 -29 4.6 -20 2.4 -12 Z', { xf: fx, wob: 0.08 })
  add(fillP(bladeL, lin(24, 98, 40, 128, 0, '#ffffff', 0.35, '#d6deea', 0.7, '#8e9ab0', 1, '#5a6478')))
  add(fillP(bladeR, lin(24, 98, 40, 128, 0, '#6a7488', 0.5, '#3a4256', 1, '#20263a')))
  add(inP(bladeR, bandD(bladeR, [0.95, 0.1], 1.6, 0.1), `rgba(${RIM},1)`, 'screen'))
  add(inP(bladeL, line('M-1.8 -17 C-3.4 -26 -3 -36 -1.4 -48', 0.9, { xf: fx }), 'rgba(255,255,255,0.95)'))
  add({ d: grainD(18, 96, 42, 134, 40, 1.4, 0.12), fill: 'rgba(40,40,70,0.45)', clip: bladeL.d })
  const blade = joinS(bladeL, bladeR)
  add({ d: inkD(blade, { w: 1.5, lo: 0.4 }), fill: INKC })
  stroke('M0.2 -13 C0.5 -24 0.5 -41 0.05 -58', 0.5, 'rgba(20,20,40,0.6)', { xf: fx })
  // glint on the blade
  const [gx, gy] = fx([-1.6, -48])
  const sp = (r: number) => `M${q1(gx)} ${q1(gy - r)}C${q1(gx + 0.4)} ${q1(gy - 0.6)} ${q1(gx + 0.6)} ${q1(gy - 0.4)} ${q1(gx + r)} ${q1(gy)}C${q1(gx + 0.6)} ${q1(gy + 0.4)} ${q1(gx + 0.4)} ${q1(gy + 0.6)} ${q1(gx)} ${q1(gy + r)}C${q1(gx - 0.4)} ${q1(gy + 0.6)} ${q1(gx - 0.6)} ${q1(gy + 0.4)} ${q1(gx - r)} ${q1(gy)}C${q1(gx - 0.6)} ${q1(gy - 0.4)} ${q1(gx - 0.4)} ${q1(gy - 0.6)} ${q1(gx)} ${q1(gy - r)}Z`
  add({ d: blobD(gx, gy, 5, 5, 0, 0.02), fill: softR(gx, gy, 5, '255,240,220', 0.85), blend: 'screen' })
  add({ d: sp(4.6), fill: '#ffffff' })
  // fist: gloved back of the hand (tekko), bare curled fingers, thumb across the front
  const glove = S('M-11.6 -5 C-13.4 1 -13 9 -9 14.4 C-6 16 -2 16.4 1 16 C2 10 1 2 -2 -4 C-4 -7.6 -8 -8 -11.6 -5 Z', { xf: fx })
  add(fillP(glove, lin(...fx([-12, -6]), ...fx([0, 16]), 0, '#5a669e', 0.5, '#2e3668', 1, '#1a1e42')))
  add(inP(glove, line('M-11 -2 C-12 3 -11.6 8 -9.4 12', 1.2, { xf: fx }), 'rgba(190,200,255,0.55)'))
  ink(glove, { w: 1.9, lo: 0.3, acc: [[...fx([-9, 14]), 4, 0.8]] })
  add(inP(glove, bandD(glove, [-0.95, -0.25], 1.4), `rgba(${RIMHI},0.5)`, 'screen'))
  const SKM = '#ec9f7c'
  const FINK = '#4a1a1a'
  const fist = S('M-10 -8.6 C-4 -10.6 4 -10.6 10 -8.6 C13 -7.6 13.6 -4.2 11.4 -3.2 C13.8 -2.4 13.8 1.4 11.2 2.2 C13.2 3.2 13 6.4 10.6 7 C11.8 8.2 11.2 10.8 8.4 11.2 C2 12.6 -5 12.2 -9.6 10.8 C-12.2 6 -12.6 -3 -10 -8.6 Z', { xf: fx, wob: 0.1 })
  add({ d: moveS(fist, 1, 2).d, fill: 'rgba(40,10,30,0.5)', blend: 'multiply' })
  add(fillP(fist, lin(...fx([-10, -9]), ...fx([12, 11]), 0, '#ffdcc0', 0.45, SKM, 1, '#b4624e')))
  add(...dab(...fx([-3, -6]), 6, 3, -16, '#fff0e0', 0.6, fist.d, 'screen'))
  add(...dab(...fx([0, 9]), 8, 3, -16, '#c04a5a', 0.5, fist.d, 'multiply'))
  // one core shadow for the whole block, then the finger cuts
  const fistSh = S('M4 -10 C9 -9 13 -7 13 -4 C14 0 14 6 11 10 C8 12 2 12.6 -4 12 C2 9 6 4 6 -2 C6 -5 5 -8 4 -10 Z', { xf: fx })
  add(inP(fist, fistSh.d, '#b0606a', 'multiply', 0.75))
  add({ d: hatch(fistSh, { ang: 50, gap: 0.9, w: 0.35, max: 4 }), fill: FINK, alpha: 0.4, clip: fist.d })
  for (const [yy, x1] of [[-3.2, 11.4], [2.2, 11.2], [7, 10.6]] as [number, number][]) {
    stroke(`M${x1} ${yy} C${x1 - 5} ${yy + 0.6} ${x1 - 11} ${yy + 0.4} ${-6.4} ${yy - 0.4}`, 1.2, FINK, { a: 0.06, b: 0.75, xf: fx })
    stroke(`M${x1 - 2} ${yy + 0.9} C${x1 - 6} ${yy + 1.6} ${x1 - 11} ${yy + 1.4} ${-5} ${yy + 1}`, 0.9, 'rgba(255,240,226,0.65)', { a: 0.3, b: 0.5, xf: fx })
    stroke(`M${x1 - 7.6} ${yy - 4.2} C${x1 - 8} ${yy - 3} ${x1 - 8} ${yy - 2} ${x1 - 7.4} ${yy - 0.8}`, 0.5, 'rgba(120,40,40,0.75)', { xf: fx })
  }
  stroke('M3.4 7.8 C3 9 3 10 3.6 11', 0.5, 'rgba(120,40,40,0.75)', { xf: fx })
  const thumb = S('M-12 -7 C-7.4 -12.4 2.6 -14.4 9.6 -11.6 C11.8 -10.4 12.2 -7.8 10.2 -6.6 C4.6 -6.4 -3.4 -4.6 -10.2 -2 C-12 -3.2 -12.8 -5.2 -12 -7 Z', { xf: fx, wob: 0.12 })
  add({ d: moveS(thumb, 0.8, 1.8).d, fill: 'rgba(80,20,20,0.55)', blend: 'multiply' })
  add(fillP(thumb, lin(...fx([-10, -12]), ...fx([8, -6]), 0, '#ffe2c8', 0.5, SKM, 1, '#bc7460')))
  add(inP(thumb, line('M-9 -8.4 C-4 -11.6 3 -12.6 8 -11', 0.8, { xf: fx }), 'rgba(255,250,240,0.75)'))
  const nail = S('M5.4 -11.8 C7.6 -12 9.6 -11 9.8 -9.2 C8.4 -8.6 6.6 -8.8 5.2 -9.4 Z', { xf: fx, wob: 0.05 })
  add(fillP(nail, '#ffeadf'))
  add({ d: inkD(nail, { w: 0.6, lo: 0.4 }), fill: 'rgba(110,40,40,0.8)' })
  ink(thumb, { w: 1.3, lo: 0.25, dir: [0.3, 1] }, FINK)
  ink(fist, { w: 1.6, lo: 0.25, acc: [[...fx([10, 10]), 4, 0.8]] })
  // the fist's outer contour gets the dark ink, interior lines stay brown

  // sketchy accents: doubled strokes past the contour, contact darks, wind lines
  stroke('M57 34.6 C52 35.6 47.6 38.6 44.6 42.6', 0.8, INKC, { a: 0.3, b: 0.6, xf: hx })
  stroke('M112.6 84 C113.4 90 113 96 111.4 102', 0.9, INKC, { a: 0.3, b: 0.6, xf: hx })
  stroke('M95 127 C99 129.6 104 129.6 108 127', 1.6, INKC, { a: 0.2, b: 0.4 })
  stroke('M16 154 C12 160 9 166 7 173', 0.8, INKC, { a: 0.3, b: 0.6 })
  for (const [d, w] of [['M120 172 C130 169.6 142 169.4 156 171.4', 0.9], ['M128 177 C136 175.6 144 175.6 152 176.6', 0.6], ['M124 84 C134 81.6 146 81.6 160 83.6', 0.8], ['M134 90 C142 88.6 150 88.6 158 89.6', 0.55]] as [string, number][]) {
    stroke(d, w, 'rgba(255,226,200,0.7)', { a: 0.4, b: 0.5 })
  }

  // ---------------------------------------------------------------- texture over the whole figure
  const silD = sil.join('')
  add({ d: grainD(0, 30, 160, 206, 900, 0.9, 0.16), fill: '#1a1030', alpha: 0.22, clip: silD, blend: 'multiply' })
  add({ d: grainD(0, 30, 160, 206, 350, 0.7, 0.14), fill: '#ffe6d0', alpha: 0.12, clip: silD, blend: 'screen' })
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths: out }
}

// =================================================================================
// Robot: R-0B1N
// =================================================================================
export function robot(): Art {
  SEED = 9001
  const INKC = '#1b120c'
  const RIM = '94,240,255'
  const out: VectorPath[] = []
  const sil: string[] = []
  const add = (...p: VectorPath[]) => out.push(...p)
  const ink = (s: Shape, o: InkO = {}, color = INKC) => add({ d: inkD(s, o), fill: color })
  const stroke = (src: string | Pt[], w: number, color: string, o: LineO = {}, clip?: string, alpha?: number) =>
    add({ d: line(src, w, o), fill: color, clip, alpha })
  const PAINT = (x0: number, y0: number, x1: number, y1: number) => lin(x0, y0, x1, y1, 0, '#ffd884', 0.3, '#f2ae46', 0.7, '#d7832e', 1, '#9a5022')
  const STEELP = (x0: number, y0: number, x1: number, y1: number) => lin(x0, y0, x1, y1, 0, '#eef2f4', 0.3, '#aeb8c0', 0.7, '#6a7680', 1, '#3a424c')
  // paint chips showing bare steel, with a dark lower lip and a lit upper edge
  const chips = (clip: Shape, list: [number, number, number, number][]) => {
    for (const [x, y, r, deg] of list) {
      const R = rng(seed())
      const n = 9 + Math.floor(R() * 4)
      const a0 = (deg * Math.PI) / 180
      const pts: Pt[] = []
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.4
        const k = r * (0.45 + R() * 0.65)
        const px = Math.cos(t) * k
        const py = Math.sin(t) * k * 0.6
        pts.push([x + px * Math.cos(a0) - py * Math.sin(a0), y + px * Math.sin(a0) + py * Math.cos(a0)])
      }
      const c: Shape = { rings: [{ pts: cw(pts), closed: true }], d: ringD(cw(pts), true) }
      add({ d: c.d, fill: lin(x - r, y - r, x + r, y + r, 0, '#cfd6dc', 1, '#7e8892'), clip: clip.d })
      add({ d: bandD(c, [-0.5, -0.85], 0.9, -0.2), fill: 'rgba(80,30,10,0.75)', clip: clip.d })
      add({ d: bandD(c, [0.5, 0.85], 0.5, 0.2), fill: 'rgba(255,245,215,0.85)', clip: clip.d })
      add({ d: inkD(c, { w: 0.5, lo: 0.2, dir: [-0.5, -0.85], gap: 0.3 }), fill: 'rgba(70,24,6,0.8)', clip: clip.d })
    }
  }
  const rustStreak = (src: string, w: number, clip: string) => {
    stroke(src, w * 2.2, 'rgba(150,62,20,0.35)', { a: 0.1, b: 0.8 }, clip)
    stroke(src, w, 'rgba(120,44,12,0.7)', { a: 0.1, b: 0.85 }, clip)
  }
  const scratches = (clip: string, x0: number, y0: number, x1: number, y1: number, n: number) => {
    const R = rng(seed())
    let d = ''
    for (let i = 0; i < n; i++) {
      const x = x0 + R() * (x1 - x0)
      const y = y0 + R() * (y1 - y0)
      const a = (R() - 0.5) * 1.4 + 0.4
      const l = 2 + R() * 4
      d += line(`M${q1(x)} ${q1(y)}C${q1(x + Math.cos(a) * l * 0.4)} ${q1(y + Math.sin(a) * l * 0.4 + 0.3)} ${q1(x + Math.cos(a) * l * 0.7)} ${q1(y + Math.sin(a) * l * 0.7 + 0.3)} ${q1(x + Math.cos(a) * l)} ${q1(y + Math.sin(a) * l)}`, 0.35 + R() * 0.25, { a: 0.2, b: 0.6 })
    }
    add({ d, fill: 'rgba(255,250,230,0.55)', clip })
  }
  const bolt = (x: number, y: number, r: number, clip?: string) => {
    const b = S(`M${x - r} ${y} C${x - r} ${y - r * 0.6} ${x - r * 0.5} ${y - r} ${x + 0.1} ${y - r} C${x + r * 0.6} ${y - r} ${x + r} ${y - r * 0.5} ${x + r} ${y + 0.1} C${x + r} ${y + r * 0.6} ${x + r * 0.5} ${y + r} ${x} ${y + r} C${x - r * 0.6} ${y + r} ${x - r} ${y + r * 0.5} ${x - r} ${y} Z`, { wob: 0.05, step: 0.4 })
    add({ d: moveS(b, r * 0.35, r * 0.5).d, fill: 'rgba(60,20,0,0.45)', clip, blend: 'multiply' })
    add({ d: b.d, fill: lin(x - r, y - r, x + r, y + r, 0, '#ffffff', 0.4, '#a9b3bc', 1, '#4a525c') })
    stroke(`M${x - r * 0.55} ${y + r * 0.2} L${x + r * 0.55} ${y - r * 0.2}`, Math.max(0.35, r * 0.28), 'rgba(30,30,40,0.8)')
    add({ d: inkD(b, { w: Math.max(0.5, r * 0.4), lo: 0.3, gap: 0.2 }), fill: INKC })
  }
  // ribbed flexible hose (neck / arm) along a spine
  const hose = (spine: string, w0: number, w1: number, pitch: number, base: [string, string, string]) => {
    const sp = parse(spine, 0.5)[0].pts
    const c = cum(sp)
    const L = c[c.length - 1]
    const ns = normals(sp, false)
    const n = Math.max(2, Math.round(L / pitch))
    const at = (u: number) => {
      let i = 0
      while (i < c.length - 1 && c[i + 1] < u) i++
      return i
    }
    for (let k = n - 1; k >= 0; k--) {
      const ia = at((k / n) * L)
      const ib = at(Math.min(L, ((k + 1) / n) * L + pitch * 0.25))
      const pa = sp[ia]
      const pb = sp[ib]
      const wa = (w0 + (w1 - w0) * (c[ia] / L)) / 2
      const wb = (w0 + (w1 - w0) * (c[ib] / L)) / 2
      const na = ns[ia]
      const nb = ns[ib]
      const tx = pb[0] - pa[0]
      const ty = pb[1] - pa[1]
      const bulge = 0.9
      const d = `M${q1(pa[0] + na[0] * wa)} ${q1(pa[1] + na[1] * wa)}C${q1(pa[0] + na[0] * wa * 0.4 + tx * 0.5 * -0.1 - tx * bulge * 0.2)} ${q1(pa[1] + na[1] * wa * 0.4 - ty * bulge * 0.2)} ${q1(pa[0] - na[0] * wa * 0.4 - tx * bulge * 0.2)} ${q1(pa[1] - na[1] * wa * 0.4 - ty * bulge * 0.2)} ${q1(pa[0] - na[0] * wa)} ${q1(pa[1] - na[1] * wa)}L${q1(pb[0] - nb[0] * wb)} ${q1(pb[1] - nb[1] * wb)}C${q1(pb[0] - nb[0] * wb * 0.4 + tx * bulge * 0.35)} ${q1(pb[1] - nb[1] * wb * 0.4 + ty * bulge * 0.35)} ${q1(pb[0] + nb[0] * wb * 0.4 + tx * bulge * 0.35)} ${q1(pb[1] + nb[1] * wb * 0.4 + ty * bulge * 0.35)} ${q1(pb[0] + nb[0] * wb)} ${q1(pb[1] + nb[1] * wb)}Z`
      const rib = S(d, { wob: 0.1, step: 0.5 })
      add(fillP(rib, lin(pa[0] + na[0] * wa, pa[1] + na[1] * wa, pa[0] - na[0] * wa, pa[1] - na[1] * wa, 0, base[0], 0.45, base[1], 1, base[2])))
      add(inP(rib, bandD(rib, [0.3, 0.95], 1.4), 'rgba(20,10,20,0.55)', 'multiply'))
      add(inP(rib, bandD(rib, [0.9, -0.3], 1.4), `rgba(${RIM},0.7)`, 'screen'))
      ink(rib, { w: 1.3, lo: 0.3 })
    }
  }

  // ---------------------------------------------------------------- torso (barrel)
  const torso = S('M28 135 C42 128 94 126 110 132 C118 136 124 144 127 155 C129.6 168 131 184 131.6 200 C100 206 40 206 5 200 C3 188 5 172 10 158 C14 148 20 140 28 135 Z')
  sil.push(torso.d)
  add(fillP(torso, PAINT(10, 132, 130, 204)))
  add(...dab(34, 160, 18, 12, -30, '#fff0b0', 0.55, torso.d, 'screen'))
  add(...dab(100, 186, 22, 12, -10, '#7a3a5a', 0.45, torso.d, 'multiply'))
  add(...dab(20, 194, 14, 6, 0, '#4ac0c0', 0.35, torso.d, 'screen'))
  const torsoSh = S('M92 132 C106 136 118 144 124 156 C128 170 130 186 132 200 C118 203 100 205 86 205 C98 196 106 182 106 166 C106 152 100 140 92 132 Z')
  add(inP(torso, torsoSh.d, '#8a5070', 'multiply', 0.8))
  add({ d: hatch(torsoSh, { ang: 58, gap: 2, w: 0.55, bend: 0.1, max: 28, jit: 3 }), fill: '#2a1028', alpha: 0.5, clip: torso.d })
  // panel seams wrapping the barrel
  stroke('M8 186 C34 192 70 193 104 189 C114 188 122 186 130 183', 1.1, 'rgba(70,30,10,0.8)', { a: 0.05, b: 0.1 }, torso.d)
  stroke('M8 187.6 C34 193.6 70 194.6 104 190.6 C114 189.6 122 187.6 130 184.6', 0.6, 'rgba(255,230,170,0.6)', {}, torso.d)
  stroke('M104 136 C110 148 112 162 111 176 C110.6 182 110 186 109 190', 1, 'rgba(70,30,10,0.75)', { a: 0.05, b: 0.1 }, torso.d)
  stroke('M105.6 136 C111.6 148 113.6 162 112.6 176', 0.5, 'rgba(255,220,160,0.5)', { a: 0.1, b: 0.3 }, torso.d)
  // vents on the turned-away side
  for (let k = 0; k < 3; k++) {
    const y = 156 + k * 6
    const v = S(`M114.6 ${y} C117 ${y - 0.6} 120 ${y - 0.4} 122.6 ${y + 0.6} C123 ${y + 1.6} 122.6 ${y + 2.4} 122 ${y + 2.8} C119.6 ${y + 2} 117 ${y + 1.8} 114.8 ${y + 2.4} C114 ${y + 1.8} 114 ${y + 0.8} 114.6 ${y} Z`, { wob: 0.08, step: 0.4 })
    add(fillP(v, '#24121a'))
    add(inP(v, line(`M115 ${y + 2.2} C118 ${y + 1.6} 120 ${y + 1.6} 122.2 ${y + 2.4}`, 0.7), `rgba(${RIM},0.5)`))
    stroke(`M114.6 ${y + 3.4} C117 ${y + 2.8} 120 ${y + 3} 122.4 ${y + 3.6}`, 0.6, 'rgba(255,220,160,0.5)', {}, torso.d)
  }
  // raised chest plate
  const plate = S('M40.4 150.4 C54 153.4 78 153.6 92.4 149.6 C95.6 149 97.2 151.4 97 155 C96.6 164 95.6 173 94 180 C93.2 183.4 91 185.2 88 185.8 C74 189.6 54 189.4 42.6 186 C39.6 185.2 37.8 183 37.4 179.4 C36.6 171 36.8 162 37.6 155 C37.8 152 38.6 150.2 40.4 150.4 Z')
  add({ d: moveS(plate, 1.6, 2.4).d, fill: 'rgba(80,30,10,0.5)', clip: torso.d, blend: 'multiply' })
  add(fillP(plate, PAINT(37, 146, 97, 186)))
  add(...dab(48, 156, 10, 5, -10, '#fff2c0', 0.6, plate.d, 'screen'))
  add(inP(plate, S('M80 148 C90 150 96 152 97 158 C96 168 95 176 94 182 C90 186 84 186 76 186 C84 178 88 166 80 148 Z').d, '#9a5a70', 'multiply', 0.7))
  add(inP(plate, line('M39.6 153 C52 156 76 156.2 92.6 151.8', 1.1), 'rgba(255,250,220,0.9)'))
  add(inP(plate, bandD(plate, [0.6, 0.8], 1.6), 'rgba(90,30,30,0.5)', 'multiply'))
  chips(plate, [[90, 183, 2.6, 10], [40, 158, 1.8, 70]])
  ink(plate, { w: 1.7, lo: 0.3 })
  for (const [x, y] of [[41.6, 154.4], [92.6, 153.6], [41.8, 182.6], [90.4, 182.4]]) bolt(x, y, 1.1)
  // chest porthole with a glowing heart
  const port = S('M51.4 167 C51.4 159.6 57.6 154.4 66 154.4 C74.6 154.4 80.6 159.6 80.6 167 C80.6 174.6 74.4 179.6 66 179.6 C57.6 179.6 51.4 174.6 51.4 167 Z', { wob: 0.15 })
  add({ d: moveS(port, 1.6, 2.4).d, fill: 'rgba(80,30,10,0.5)', clip: torso.d, blend: 'multiply' })
  add(fillP(port, STEELP(51, 154, 81, 180)))
  ink(port, { w: 2, lo: 0.35 })
  const glass = S('M55.4 167 C55.4 161.6 60 158 66 158 C72.2 158 77.6 161.6 77.6 167 C77.6 173 72.6 177.6 66.4 177.6 C60 177.6 55.4 173 55.4 167 Z', { wob: 0.1 })
  add(fillP(glass, rad(66, 167, 13, 0, '#3a0a1c', 1, '#12040a')))
  add({ d: blobD(66, 167, 12, 10, 0, 0.1), fill: softR(66, 168, 12, '255,80,120', 0.75), clip: glass.d, blend: 'screen' })
  const heart = S('M66 173.4 C62 170 59.4 167.6 59.4 164.8 C59.4 162.6 61 161.2 62.8 161.2 C64.2 161.2 65.4 162 66 163.4 C66.6 162 67.8 161.2 69.2 161.2 C71 161.2 72.6 162.6 72.6 164.8 C72.6 167.6 70 170 66 173.4 Z', { wob: 0.08, step: 0.4 })
  add(fillP(heart, rad(64.6, 164.6, 8, 0, '#ffffff', 0.25, '#ffb0c4', 0.6, '#ff3a6a', 1, '#c0103a')))
  add({ d: inkD(heart, { w: 0.7, lo: 0.4, gap: 0.2 }), fill: '#6a0a20' })
  add(inP(glass, 'M57 163 C59 159 64 158 69 158.4 C65 159.6 61 161.6 58.6 165 Z', 'rgba(255,255,255,0.7)'))
  add(inP(glass, bandD(glass, [-0.5, -0.85], 1.6), 'rgba(0,0,0,0.6)', 'multiply'))
  ink(glass, { w: 1.2, lo: 0.4 })
  add({ d: blobD(66, 168, 24, 22, 0, 0.1), fill: softR(66, 168, 24, '255,90,130', 0.25), blend: 'screen' })
  // base rim the bust stands on
  const rim = S('M4 192 C40 199 100 199 138 191 C139.6 195 139.6 199 138.6 202 C102 208 40 208 3.4 202.6 C2.6 199 2.8 195 4 192 Z')
  add(fillP(rim, STEELP(4, 190, 60, 206)))
  add(inP(rim, rim.d, lin(0, 192, 140, 192, 0, 'rgba(0,0,0,0)', 0.6, 'rgba(0,0,0,0)', 1, 'rgba(40,20,60,0.6)'), 'multiply'))
  stroke('M6 194.6 C40 201 100 201 136 193.6', 1, 'rgba(255,255,255,0.75)', {}, rim.d)
  for (let x = 12; x < 136; x += 17) bolt(x, 197.6 + Math.sin((x / 140) * Math.PI) * 2.6, 1)
  ink(rim, { w: 2 })
  add(inP(torso, bandD(torso, [0.95, -0.3], 4), `rgba(${RIM},0.85)`, 'screen'))
  add(inP(torso, bandD(torso, [0.95, -0.25], 1.4, 0.5), 'rgba(220,255,255,0.9)', 'screen'))
  ink(torso, { w: 3, lo: 0.25, acc: [[110, 132, 8, 1]] })

  // ---------------------------------------------------------------- right shoulder joint + arm hanging at the side
  const armR = S('M115 158 C121 158 131 161 137 168 C140.6 177 141 190 140.4 203 C132 205 124 205 118.4 204 C117.4 190 116.4 174 115 158 Z')
  sil.push(armR.d)
  add({ d: moveS(armR, -3, 2).d, fill: 'rgba(60,20,30,0.5)', clip: torso.d, blend: 'multiply' })
  add(fillP(armR, PAINT(114, 158, 141, 204)))
  add(inP(armR, S('M126 160 C134 164 140 172 141 186 L141 205 L128 205 C130 190 130 174 126 160 Z').d, '#8a5070', 'multiply', 0.8))
  add({ d: hatch(S('M128 162 C135 166 140 174 141 186 L141 204 L131 204 C132 190 132 176 128 162 Z'), { ang: 76, gap: 1.8, w: 0.5, max: 24, jit: 3 }), fill: '#2a1028', alpha: 0.5, clip: armR.d })
  add(inP(armR, line('M120 164 C121.6 176 122.4 190 122.6 204', 3, { a: 0.2, b: 0.1 }), 'rgba(255,240,190,0.55)', 'screen'))
  const cuff = S('M116.4 178 C124 180.6 132 180.6 140.6 177.6 C141 180 141 182.6 140.8 185 C132 188 124 188 116.8 185.6 C116.4 183 116.2 180.4 116.4 178 Z')
  add({ d: moveS(cuff, 0, 2).d, fill: 'rgba(60,20,30,0.5)', clip: armR.d, blend: 'multiply' })
  add(fillP(cuff, STEELP(116, 177, 141, 188)))
  add(inP(cuff, line('M117.6 180 C124 182.4 132 182.4 139.6 179.6', 0.9), 'rgba(255,255,255,0.85)'))
  add(inP(cuff, bandD(cuff, [0.95, 0], 1.8), `rgba(${RIM},0.9)`, 'screen'))
  ink(cuff, { w: 1.5 })
  chips(armR, [[122, 194, 2.4, 0]])
  add(inP(armR, bandD(armR, [0.95, -0.2], 3), `rgba(${RIM},0.9)`, 'screen'))
  ink(armR, { w: 2.4, acc: [[118, 160, 6, 0.8]] })
  const shR = S('M112 150 C114 143 121 140 127 142 C133 144.6 135.4 151 133.4 157 C131.4 162.6 125 165 119.4 163 C114 161 111 156 112 150 Z')
  sil.push(shR.d)
  add({ d: moveS(shR, -1, 3).d, fill: 'rgba(60,20,30,0.5)', clip: joinS(torso, armR).d, blend: 'multiply' })
  add(fillP(shR, STEELP(112, 141, 134, 164)))
  add(inP(shR, S('M127 142 C134 146 136 154 132 160 C128 164 122 165 116 162 C124 160 129 152 127 142 Z').d, '#4a4a6a', 'multiply', 0.75))
  add(inP(shR, line('M114 150 C115.6 145.6 119.6 143 124 143.4', 1), 'rgba(255,255,255,0.85)'))
  add(inP(shR, bandD(shR, [0.95, -0.2], 2.2), `rgba(${RIM},0.95)`, 'screen'))
  bolt(123, 153, 1.8)
  ink(shR, { w: 2 })

  // ---------------------------------------------------------------- collar + neck hose
  const hx = rot(0, 0, -9, 64, 84)
  hose('M70 140 C70 132 68 124 66 114', 24, 21, 3.6, ['#c8d0d6', '#7a8690', '#2e353e'])
  const collar = S('M32 137 C48 129 92 127 108 133 C111 137 110 142 106 145 C90 140 52 141 36 148 C32 145 31 141 32 137 Z')
  add({ d: moveS(collar, 1, 3).d, fill: 'rgba(60,20,0,0.5)', clip: torso.d, blend: 'multiply' })
  add(fillP(collar, STEELP(32, 128, 80, 148)))
  add(inP(collar, line('M36 139 C52 132 88 130.6 104 135', 1.1), 'rgba(255,255,255,0.85)'))
  add(inP(collar, bandD(collar, [0.9, 0.2], 2.2), `rgba(${RIM},0.85)`, 'screen'))
  for (const x of [42, 58, 76, 94]) bolt(x, 139.6 - Math.sin(((x - 30) / 80) * Math.PI) * 2.4, 1)
  ink(collar, { w: 2.2 })

  // ---------------------------------------------------------------- waving arm (left)
  const shoulder = S('M8 140 C14 134 24 134 28 140 C32 146 30 154 24 157 C17 160 9 157 6.6 151 C5.6 147 6 143 8 140 Z')
  hose('M16 146 C8 140 2 132 -1 120 C-2.6 114 -2 108 0 103', 12, 10.4, 3.2, ['#c8d0d6', '#7a8690', '#2e353e'])
  add(fillP(shoulder, STEELP(6, 134, 30, 158)))
  add(inP(shoulder, line('M10 142 C14 137.6 20 136.6 24.6 138.6', 1, {}), 'rgba(255,255,255,0.85)'))
  add(inP(shoulder, S('M24 138 C30 142 32 150 26 156 C20 159 14 158 10 156 C18 154 24 148 24 138 Z').d, '#5a5a7a', 'multiply', 0.7))
  bolt(17, 147, 2)
  ink(shoulder, { w: 2.2 })
  // open three-fingered hand, palm out, waving
  const hxH = rot(0, 0, -14, 1, 92, 1.22)
  const palmR = S('M-7 4 C-8 -2 -7 -6 -4 -7.6 C0 -9 5 -8.6 7.6 -6 C9.6 -3 9.4 2 8 6 C6.6 10 2.4 12 -1.4 11.4 C-5 10.6 -6.6 8 -7 4 Z', { xf: hxH })
  const fingersR: string[] = [
    'M-6.6 -5 C-8.6 -9 -9.4 -14 -8 -17.6 C-7 -19.6 -4.4 -19.6 -3.6 -17.4 C-2.8 -14 -2.6 -10 -2.4 -7 Z',
    'M-2 -7.6 C-2.4 -12.6 -1.8 -18 0.2 -21 C1.6 -22.6 4 -22 4.4 -19.6 C4.6 -15.6 3.8 -11 3 -7.4 Z',
    'M3.6 -6.8 C5 -11 7.4 -15 10.4 -16.8 C12.2 -17.6 14 -16 13.2 -13.6 C12 -10.6 10 -7.6 8 -4.6 Z',
    'M7.6 2 C10.4 0.6 14 0.8 16 2.8 C17.4 4.4 16.4 6.6 14.2 6.6 C12 6.4 10 6.4 7.8 7 Z',
  ]
  const fsh = fingersR.map((d) => S(d, { xf: hxH, wob: 0.1 }))
  for (const f of fsh) {
    add(fillP(f, STEELP(-10, 70, 16, 100)))
    add(inP(f, bandD(f, [0.6, 0.8], 1.3), 'rgba(30,20,40,0.5)', 'multiply'))
    add(inP(f, bandD(f, [0.95, -0.2], 1.1), `rgba(${RIM},0.8)`, 'screen'))
    ink(f, { w: 1.5, lo: 0.3 })
  }
  // finger joints
  stroke('M-8.4 -12 C-7 -11.4 -5 -11.4 -3.2 -12.2', 0.6, 'rgba(30,30,40,0.75)', { xf: hxH })
  stroke('M-1.8 -14.6 C-0.2 -14 1.8 -14 3.6 -14.6', 0.6, 'rgba(30,30,40,0.75)', { xf: hxH })
  stroke('M6.4 -12.4 C7.6 -11.4 9.2 -10.8 10.8 -11', 0.6, 'rgba(30,30,40,0.75)', { xf: hxH })
  add(fillP(palmR, lin(...hxH([-7, -8]), ...hxH([8, 11]), 0, '#ffd884', 0.45, '#eaa040', 1, '#a85a24')))
  add(inP(palmR, S('M2 -8 C8 -6 10 0 8 6 C6 10 2 12 -2 11.4 C4 6 5 -2 2 -8 Z', { xf: hxH }).d, '#8a4a5a', 'multiply', 0.7))
  chips(palmR, [[...hxH([-3, 5]), 1.8, 10]])
  add(inP(palmR, bandD(palmR, [0.95, -0.2], 1.6), `rgba(${RIM},0.8)`, 'screen'))
  ink(palmR, { w: 1.9, lo: 0.3 })
  // motion arcs of the wave
  stroke('M-12 72 C-14 78 -14.6 84 -13.6 90', 1, 'rgba(255,255,255,0.8)', { a: 0.4, b: 0.4 })
  stroke('M-16.6 76 C-18 80 -18.4 84 -17.8 88', 0.8, 'rgba(255,255,255,0.6)', { a: 0.4, b: 0.4 })
  stroke('M17 74 C19.4 79 20 84 19.2 89', 0.9, 'rgba(255,255,255,0.7)', { a: 0.4, b: 0.4 })

  // ---------------------------------------------------------------- head (local frame, tilted)
  // antennae behind the head
  const antL = 'M-22 -36 C-23 -42 -24.4 -48 -26 -55'
  const antR = 'M14 -37 C15 -42 16.6 -46 18.6 -49 C21 -52 26 -53.4 30.6 -52 C33.4 -51 35 -48.4 35.4 -45.6'
  for (const a of [antL, antR]) {
    add({ d: line(a, 3.6, { xf: hx, min: 0.85, a: 0.01, b: 0.01, press: 0 }), fill: INKC })
    add({ d: line(a, 1.6, { xf: hx, min: 0.85, a: 0.01, b: 0.01, press: 0 }), fill: '#c4ccd4' })
  }
  stroke('M17.6 -47 C19.8 -50.4 24 -52 28.6 -51.4', 0.6, 'rgba(255,255,255,0.9)', { xf: hx })
  // kink crease on the bent antenna
  const [kx, ky] = hx([18.6, -49])
  add({ d: blobD(kx, ky, 1.6, 1.2, 0, 0.2), fill: '#6a7480' })
  // bulbs: warm bright one, and a flickering one on the bent antenna
  const [b1x, b1y] = hx([-26.4, -58.6])
  add({ d: blobD(b1x, b1y, 13, 13, 0, 0.1), fill: softR(b1x, b1y, 13, '255,190,80', 0.7), blend: 'screen' })
  const bulb1 = S(`M${b1x - 4.2} ${b1y} C${b1x - 4.2} ${b1y - 2.6} ${b1x - 2.2} ${b1y - 4.4} ${b1x} ${b1y - 4.4} C${b1x + 2.6} ${b1y - 4.4} ${b1x + 4.2} ${b1y - 2.4} ${b1x + 4.2} ${b1y + 0.2} C${b1x + 4.2} ${b1y + 2.8} ${b1x + 2.2} ${b1y + 4.2} ${b1x - 0.2} ${b1y + 4.2} C${b1x - 2.6} ${b1y + 4.2} ${b1x - 4.2} ${b1y + 2.4} ${b1x - 4.2} ${b1y} Z`, { wob: 0.08, step: 0.4 })
  add(fillP(bulb1, rad(b1x - 1.4, b1y - 1.6, 6, 0, '#ffffff', 0.3, '#ffe08a', 0.7, '#ff9a20', 1, '#c05010')))
  add({ d: blobD(b1x - 1.6, b1y - 1.8, 1.2, 0.9, -30, 0.1), fill: '#ffffff' })
  ink(bulb1, { w: 1.4, lo: 0.4 })
  const [b2x, b2y] = hx([35.6, -42.4])
  add({ d: blobD(b2x, b2y, 7, 7, 0, 0.1), fill: softR(b2x, b2y, 7, '255,150,90', 0.45), blend: 'screen' })
  const bulb2 = S(`M${b2x - 3.2} ${b2y} C${b2x - 3.2} ${b2y - 2} ${b2x - 1.6} ${b2y - 3.4} ${b2x} ${b2y - 3.4} C${b2x + 2} ${b2y - 3.4} ${b2x + 3.2} ${b2y - 1.8} ${b2x + 3.2} ${b2y + 0.2} C${b2x + 3.2} ${b2y + 2.2} ${b2x + 1.6} ${b2y + 3.4} ${b2x - 0.2} ${b2y + 3.4} C${b2x - 2} ${b2y + 3.4} ${b2x - 3.2} ${b2y + 1.8} ${b2x - 3.2} ${b2y} Z`, { wob: 0.06, step: 0.4 })
  add(fillP(bulb2, rad(b2x - 1, b2y - 1.2, 4.6, 0, '#ffe6c0', 0.4, '#e08a5a', 1, '#7a3018')))
  ink(bulb2, { w: 1.2, lo: 0.4 })
  // little sparks at the kink
  for (const [dx, dy, l, a] of [[2, -3, 4, -1.2], [3.4, 0, 3.4, -0.3], [-2.6, -2.6, 3, -2.2]]) {
    const x0 = kx + dx
    const y0 = ky + dy
    const x1 = x0 + Math.cos(a) * l
    const y1 = y0 + Math.sin(a) * l
    stroke(`M${q1(x0)} ${q1(y0)}L${q1((x0 + x1) / 2 + 0.8)} ${q1((y0 + y1) / 2 - 0.4)}L${q1(x1)} ${q1(y1)}`, 0.9, '#fff3a0', { a: 0.1, b: 0.5, wob: 0 })
  }
  // sockets
  for (const [x, y] of [[-22, -36.4], [14, -37.2]]) {
    const sk = S(`M${x - 4} ${y + 1} C${x - 4} ${y - 2} ${x - 2} ${y - 3} ${x} ${y - 3} C${x + 2.4} ${y - 3} ${x + 4} ${y - 2} ${x + 4} ${y + 1} Z`, { xf: hx, wob: 0.05, step: 0.4 })
    add(fillP(sk, STEELP(...hx([x - 4, y - 3]), ...hx([x + 4, y + 1]))))
    ink(sk, { w: 1.2 })
  }
  const head = S('M-38 -34 C-20 -38 0 -38.4 6 -37.6 C10 -35.4 16 -35.2 20 -37 C25 -37.6 28 -36 30 -35 C38 -33.4 43 -30 44 -24 C46 -8 46 10 42 24 C40 30 35 33 28 34 C8 36 -18 36 -34 33 C-41 32 -44 27 -44 20 C-46 4 -45 -14 -43 -26 C-42 -31 -41 -33 -38 -34 Z', { xf: hx })
  sil.push(head.d)
  add({ d: moveS(head, 3, 5).d, fill: 'rgba(30,10,20,0.45)', clip: joinS(torso, collar).d, blend: 'multiply' })
  add(fillP(head, PAINT(...hx([-40, -36]), ...hx([40, 34]))))
  add(...dab(...hx([-26, -24]), 18, 9, -12, '#fff4c4', 0.6, head.d, 'screen'))
  add(...dab(...hx([-8, 28]), 22, 6, -9, '#53c8c8', 0.35, head.d, 'screen'))
  add(...dab(...hx([4, -30]), 12, 5, -9, '#c06a50', 0.3, head.d, 'multiply'))
  // side plane (turned away from the lamp)
  const side = S('M26 -36 C30 -20 31.4 0 29.6 20 C29 26 28 30 26.4 34 C33 33 38 31 41 26 C45.6 12 46 -8 44 -24 C42.6 -30 38 -34 30 -35.4 Z', { xf: hx })
  add(inP(head, side.d, '#7a5684', 'multiply', 0.9))
  add(inP(head, side.d, lin(...hx([28, 0]), ...hx([46, 0]), 0, 'rgba(94,240,255,0)', 1, 'rgba(94,240,255,0.35)'), 'screen'))
  add({ d: hatch(side, { ang: 76, gap: 1.8, w: 0.5, max: 30, jit: 3 }), fill: '#2a1028', alpha: 0.5, clip: head.d })
  add({ d: hatch(S('M30 8 C30 20 28.4 28 26.4 34 C33 33 38 31 41 26 C43.4 20 44.4 14 44.6 6 Z', { xf: hx }), { ang: -18, gap: 1.6, w: 0.45, max: 12, jit: 4 }), fill: '#2a1028', alpha: 0.5, clip: head.d })
  stroke('M26 -35.4 C30 -20 31.2 0 29.4 20 C28.8 26 27.8 30 26.2 34', 1.2, 'rgba(255,230,170,0.75)', { xf: hx, a: 0.1, b: 0.2 }, head.d)
  stroke('M27.6 -35 C31.6 -20 33 0 31.2 20 C30.6 26 29.6 30 28 33.6', 1, 'rgba(80,30,20,0.6)', { xf: hx, a: 0.1, b: 0.2 }, head.d)
  // under-jaw core shadow
  const jawSh = S('M-44 18 C-30 24 0 25 26 22 C34 21 40 18 43 14 C42 24 38 32 28 34 C8 36 -18 36 -34 33 C-40 31 -43 26 -44 18 Z', { xf: hx })
  add(inP(head, jawSh.d, '#9a5a70', 'multiply', 0.8))
  // dent on the crown with creases
  const dent = S('M4 -37 C8 -33 16 -32.6 21 -36 C17 -31 9 -30.6 4 -37 Z', { xf: hx, wob: 0.1 })
  add(inP(head, dent.d, '#7a3a2a', 'multiply', 0.8))
  stroke('M6 -36.4 C9 -34.6 14 -34.2 19 -36', 0.7, 'rgba(255,240,200,0.8)', { xf: hx })
  stroke('M10 -33.4 C10.6 -31 10.4 -29 9.6 -27', 0.6, 'rgba(90,40,20,0.7)', { xf: hx })
  stroke('M15 -33.4 C16 -31.4 16.4 -29.6 16 -28', 0.5, 'rgba(90,40,20,0.6)', { xf: hx })
  // forehead seam + rivets, worn paint, rust
  stroke('M-41 -27 C-20 -29.6 6 -29.8 27 -28.4', 1, 'rgba(90,40,12,0.8)', { xf: hx, a: 0.05, b: 0.1 }, head.d)
  stroke('M-41 -25.6 C-20 -28.2 6 -28.4 27 -27', 0.6, 'rgba(255,236,180,0.7)', { xf: hx }, head.d)
  chips(head, [[...hx([-40, -31]), 3.6, 40], [...hx([24, 31]), 3, 0], [...hx([-36, 29]), 2.6, 10], [...hx([38, -28]), 2.4, 70], [...hx([2, -36]), 1.8, 0]])
  scratches(head.d, ...hx([-38, -26]), ...hx([20, 30]), 16)
  for (const [x, y] of [[-38, -21], [-38, 24], [22, -21], [22, 25]]) {
    const [bx, by] = hx([x, y])
    bolt(bx, by, 1.3, head.d)
  }
  const [r1x, r1y] = hx([-38, 25])
  rustStreak(`M${q1(r1x)} ${q1(r1y + 1.4)} C${q1(r1x + 0.4)} ${q1(r1y + 4)} ${q1(r1x)} ${q1(r1y + 6)} ${q1(r1x + 0.6)} ${q1(r1y + 8)}`, 0.7, head.d)
  const [r2x, r2y] = hx([22, 25])
  rustStreak(`M${q1(r2x)} ${q1(r2y + 1.4)} C${q1(r2x + 0.4)} ${q1(r2y + 3)} ${q1(r2x)} ${q1(r2y + 5)} ${q1(r2x + 0.5)} ${q1(r2y + 7)}`, 0.6, head.d)
  // ear dial on the side plane
  const ear = S('M33 -11 C37.6 -12 41.6 -6.4 41.6 0 C41.6 7 38.4 11.4 34.4 10.6 C31 10 29.6 4.6 29.8 -0.4 C30 -5.6 31 -10 33 -11 Z', { xf: hx, wob: 0.1 })
  add({ d: moveS(ear, -1.2, 1.6).d, fill: 'rgba(40,10,30,0.5)', clip: head.d, blend: 'multiply' })
  add(fillP(ear, STEELP(...hx([30, -11]), ...hx([42, 11]))))
  for (let k = -3; k <= 3; k++) stroke(`M${34.6 + Math.abs(k) * 0.2} ${k * 2.6} C${37} ${k * 2.7} ${39} ${k * 2.6} ${40.6 - Math.abs(k) * 0.4} ${k * 2.5}`, 0.45, 'rgba(30,30,40,0.6)', { xf: hx }, ear.d)
  const hub = S('M34.6 -3 C36.4 -3.4 38 -1.6 38 0.4 C38 2.6 36.6 3.8 35 3.6 C33.6 3.4 33 1.8 33 0.2 C33 -1.4 33.4 -2.8 34.6 -3 Z', { xf: hx, wob: 0.05, step: 0.4 })
  add(fillP(hub, '#5a646e'))
  ink(hub, { w: 0.8 })
  add(inP(ear, bandD(ear, [0.95, -0.2], 1.8), `rgba(${RIM},0.95)`, 'screen'))
  ink(ear, { w: 1.6, lo: 0.3 })

  // visor: recessed dark glass with a bevelled lip
  const lip = S('M-37 -25 C-22 -28.4 4 -28.4 19.4 -26 C24.4 -25.2 26.6 -22 26.4 -17 C26 -4 25.6 9 24.4 17 C23.8 22 21 24.8 16 25.4 C0 26.6 -19 26.4 -31.6 25 C-36.4 24.4 -39 21.4 -39.2 16 C-39.8 4 -39.6 -8 -39 -17 C-38.8 -21.4 -38.6 -24.2 -37 -25 Z', { xf: hx, wob: 0.12 })
  add(fillP(lip, STEELP(...hx([-38, -27]), ...hx([26, 26]))))
  add(inP(lip, bandD(lip, [0.85, 0.5], 2), 'rgba(30,20,40,0.5)', 'multiply'))
  ink(lip, { w: 1.8, lo: 0.35 })
  const visor = S('M-34 -22 C-20 -25 4 -25 18 -23 C22 -22.4 23.6 -20 23.4 -16 C23 -4 22.6 8 21.4 16 C21 20 18.6 22 15 22.4 C0 23.6 -18 23.4 -30 22 C-34 21.4 -36 19 -36.2 15 C-36.8 4 -36.6 -8 -36 -16 C-35.8 -19.6 -35.6 -21.4 -34 -22 Z', { xf: hx, wob: 0.1 })
  add(fillP(visor, lin(...hx([-30, -24]), ...hx([16, 24]), 0, '#123a46', 0.5, '#0a2430', 1, '#04121a')))
  // shadow of the lip inside the glass (recess)
  add(inP(visor, S('M-40 -26 L30 -26 L30 -17 C14 -19.6 -10 -19.6 -40 -16.6 Z', { xf: hx }).d, 'rgba(0,0,0,0.6)', 'multiply'))
  // scanlines
  let scan = ''
  for (let y = -22; y < 24; y += 1.4) scan += `M-38 ${y}L26 ${y}`
  add({ d: S(scan, { xf: hx, wob: 0 }).d, stroke: `rgba(${RIM},0.08)`, sw: 0.4, clip: visor.d })
  // happy dome eyes, blush and a smile, all glowing
  const eyeA = S('M-24.6 3 C-25.6 -6 -21.6 -12 -16.6 -12 C-11.6 -12 -8.2 -6.4 -8.8 2 C-11 -1.4 -13.8 -2.6 -16.6 -2.6 C-19.6 -2.6 -22.6 -1 -24.6 3 Z', { xf: hx, wob: 0.08, step: 0.5 })
  const eyeB = S('M1.4 2.6 C0.6 -5.4 4 -11 8.4 -11 C12.6 -11 15.4 -6 14.8 1.8 C13 -1.2 10.6 -2.4 8.2 -2.4 C5.6 -2.4 3.2 -1 1.4 2.6 Z', { xf: hx, wob: 0.08, step: 0.5 })
  for (const [e, cx, cy, r] of [[eyeA, -16.6, -5, 14], [eyeB, 8.2, -4.6, 12]] as [Shape, number, number, number][]) {
    const [gx, gy] = hx([cx, cy])
    add({ d: blobD(gx, gy, r, r, 0, 0.05), fill: softR(gx, gy, r, RIM, 0.55), clip: visor.d, blend: 'screen' })
    add(fillP(e, rad(gx - 1.6, gy - 2, r * 0.75, 0, '#ffffff', 0.35, '#c8fcff', 0.75, '#5ef0ff', 1, '#1ab4d0')))
    add({ d: inkD(e, { w: 0.9, lo: 0.6, gap: 0.1 }), fill: 'rgba(10,80,100,0.8)' })
    add({ d: blobD(gx - r * 0.18, gy - r * 0.2, r * 0.12, r * 0.09, -30, 0.1), fill: '#ffffff' })
  }
  for (const [cx, cy, r] of [[-24, 9, 5], [15, 9, 4.2]]) {
    const [gx, gy] = hx([cx, cy])
    add({ d: blobD(gx, gy, r, r * 0.6, -9, 0.15), fill: softR(gx, gy, r, '255,110,170', 0.85), clip: visor.d, blend: 'screen' })
  }
  stroke('M-12.6 10 C-9 15.4 -1 16 3.4 10.4', 4.6, `rgba(${RIM},0.3)`, { xf: hx, a: 0.3, b: 0.3 }, visor.d)
  stroke('M-12.6 10 C-9 15.4 -1 16 3.4 10.4', 1.8, '#a8faff', { xf: hx, a: 0.2, b: 0.2 }, visor.d)
  // glass glare
  add(inP(visor, S('M-30 -22 L-18 -22 L-30 22 L-36 22 Z M-14 -22 L-10 -22 L-22 22 L-25 22 Z', { xf: hx, wob: 0.2 }).d, 'rgba(255,255,255,0.08)', 'screen'))
  stroke('M-31 -14 C-30 -18 -27 -20.4 -22 -20.6', 1.2, 'rgba(255,255,255,0.55)', { xf: hx })
  ink(visor, { w: 1.4, lo: 0.45 })
  // lamp key: warm sheen along the top bevel; cyan neon rim on the right
  stroke('M-39 -31 C-24 -35.4 -2 -36 4 -35.4', 1.6, 'rgba(255,255,230,0.85)', { xf: hx, a: 0.2, b: 0.5 }, head.d)
  add(inP(head, bandD(head, [0.95, -0.15], 4.4), `rgba(${RIM},0.85)`, 'screen'))
  add(inP(head, bandD(head, [0.95, -0.1], 1.4, 0.5), 'rgba(225,255,255,0.95)', 'screen'))
  ink(head, { w: 3.2, lo: 0.22, acc: [[...hx([30, 34]), 10, 1.2]] })

  // sketchy accents past the contour and contact darks
  stroke('M-45 -18 C-45.4 -25 -43.6 -31 -39.4 -35.6', 0.8, INKC, { a: 0.3, b: 0.6, xf: hx })
  stroke('M45.4 -4 C46 4 45.6 12 44 19', 0.9, INKC, { a: 0.3, b: 0.6, xf: hx })
  stroke('M54 128.6 C62 131 72 131 80 128.4', 1.6, INKC, { a: 0.2, b: 0.4 })
  stroke('M8 157 C5.6 164 4.4 172 4 180', 0.8, INKC, { a: 0.3, b: 0.6 })

  // ---------------------------------------------------------------- texture over the whole figure
  const silD = sil.join('')
  add({ d: grainD(-20, 20, 160, 206, 900, 0.9, 0.16), fill: '#2a1408', alpha: 0.2, clip: silD, blend: 'multiply' })
  add({ d: grainD(-20, 20, 160, 206, 300, 0.7, 0.14), fill: '#fff4e0', alpha: 0.14, clip: silD, blend: 'screen' })
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths: out }
}
