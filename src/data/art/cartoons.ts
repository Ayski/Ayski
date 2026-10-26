import type { Paint, VectorPath } from '../../types'
import { circ, dots, ell, gloss, INK, lin, poly, rad, radLit, rect, rng, rrect, shade, type Art } from './kit'

// Parody illustrations of well-known cartoon universes, drawn as "3D-ish"
// cartoon renders: one key light per card, form shading and core shadows
// (multiply, clipped to each shape), rim lights on the side away from the key,
// specular highlights, cast shadows / contact occlusion and emissive glows.
// Original drawings — no official logos, names or artwork.

// ---- Local drawing helpers --------------------------------------------------
const q2 = (v: number) => Math.round(v * 100) / 100
const T = 'rgba(255,255,255,0)' // neutral stop: no effect under multiply or screen
const BIG = rect(-400, -400, 1200, 1200)

// Paint a gradient only inside `clip`, composited with `blend`.
function inside(clip: string, fill: Paint, blend: GlobalCompositeOperation = 'multiply', alpha = 1): VectorPath {
  return { d: BIG, fill, clip, blend, alpha }
}

// Rim light: the inner half of a gradient stroke along the contour, screened.
export function rimLight(shape: string, paint: Paint, w: number): VectorPath {
  return { d: shape, stroke: paint, sw: w * 2, clip: shape, blend: 'screen' }
}

// Translate a path (absolute commands are offset, relative ones kept).
export function shift(d: string, dx: number, dy: number): string {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? []
  const arity: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 }
  let out = ''
  let i = 0
  while (i < tok.length) {
    const c = tok[i++]
    out += c
    const up = c.toUpperCase()
    const n = arity[up]
    if (!n) continue
    while (i < tok.length && !/[a-zA-Z]/.test(tok[i])) {
      const a = tok.slice(i, i + n).map(Number)
      i += n
      if (c === up) {
        if (up === 'H') a[0] += dx
        else if (up === 'V') a[0] += dy
        else if (up === 'A') {
          a[5] += dx
          a[6] += dy
        } else for (let k = 0; k < n; k += 2) {
          a[k] += dx
          a[k + 1] += dy
        }
      }
      out += a.map(q2).join(' ') + ' '
    }
  }
  return out
}

// Drop samples that sit within `tol` of the line through their kept
// neighbours (Ramer–Douglas–Peucker). Doubled points mark sharp corners and
// are always kept. Hand-drawn strokes are densely sampled; this keeps the
// shape and cuts the path data several-fold.
function simplify(P: [number, number][], tol: number): [number, number][] {
  const n = P.length
  if (n < 4) return P
  const keep = new Uint8Array(n)
  keep[0] = keep[n - 1] = 1
  for (let i = 1; i < n; i++) if (P[i][0] === P[i - 1][0] && P[i][1] === P[i - 1][1]) keep[i] = keep[i - 1] = 1
  const rdp = (a: number, b: number) => {
    let far = -1
    let dmax = tol
    const [ax, ay] = P[a]
    const dx = P[b][0] - ax
    const dy = P[b][1] - ay
    const len = Math.hypot(dx, dy) || 1
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / len
      if (d > dmax) {
        dmax = d
        far = i
      }
    }
    if (far >= 0) {
      keep[far] = 1
      rdp(a, far)
      rdp(far, b)
    }
  }
  let a = 0
  for (let i = 1; i < n; i++) {
    if (!keep[i]) continue
    rdp(a, i)
    a = i
  }
  return P.filter((_, i) => keep[i])
}

// Smooth curve through points (Catmull-Rom converted to cubic Béziers).
export function smooth(pts: number[], close = true): string {
  let P: [number, number][] = []
  for (let i = 0; i < pts.length; i += 2) P.push([pts[i], pts[i + 1]])
  P = simplify(P, 0.06)
  const n = P.length
  const at = (i: number) => (close ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))])
  let d = `M${q2(P[0][0])} ${q2(P[0][1])}`
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const a = at(i - 1)
    const b = at(i)
    const c = at(i + 1)
    const e = at(i + 2)
    d += `C${q2(b[0] + (c[0] - a[0]) / 6)} ${q2(b[1] + (c[1] - a[1]) / 6)} ${q2(c[0] - (e[0] - b[0]) / 6)} ${q2(c[1] - (e[1] - b[1]) / 6)} ${q2(c[0])} ${q2(c[1])}`
  }
  return close ? d + 'Z' : d
}

// Open arc along an ellipse; angles in degrees (0 = right, 90 = down).
function arcAlong(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps = 18): string {
  const pts: number[] = []
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180
    pts.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a))
  }
  return poly(pts, false)
}

// Elliptical glow pool: many faint stacked ellipses (a radial gradient can't be squashed).
function glowPool(cx: number, cy: number, rx: number, ry: number, alpha: number, color: string, steps = 16, blend?: GlobalCompositeOperation): VectorPath[] {
  return Array.from({ length: steps }, (_, i) => {
    const k = 1 - i / steps
    return { d: ell(cx, cy, rx * k, ry * k), fill: `rgba(${color},${(alpha / steps).toFixed(3)})`, blend }
  })
}

// Smoother soft shadow than the kit's (more, fainter rings: no visible banding).
function softShade(cx: number, cy: number, rx: number, ry: number, alpha = 0.3, color = '0,0,0', steps = 14): VectorPath[] {
  return Array.from({ length: steps }, (_, i) => {
    const k = 1 - i / steps
    return { d: ell(cx, cy, rx * (0.35 + 0.65 * k), ry * (0.35 + 0.65 * k)), fill: `rgba(${color},${(alpha / steps).toFixed(3)})` }
  })
}

// Soft shadow restricted to a surface (so it never spills past it).
function shadowOn(surface: string, cx: number, cy: number, rx: number, ry: number, alpha: number, color: string): VectorPath[] {
  return softShade(cx, cy, rx, ry, alpha, color).map((p) => ({ ...p, clip: surface, blend: 'multiply' as GlobalCompositeOperation }))
}

// Four-point twinkle with concave sides.
function sparkle(cx: number, cy: number, r: number, k = 0.2): string {
  const q = r * k
  return (
    `M${q2(cx)} ${q2(cy - r)}Q${q2(cx + q)} ${q2(cy - q)} ${q2(cx + r)} ${q2(cy)}` +
    `Q${q2(cx + q)} ${q2(cy + q)} ${q2(cx)} ${q2(cy + r)}Q${q2(cx - q)} ${q2(cy + q)} ${q2(cx - r)} ${q2(cy)}` +
    `Q${q2(cx - q)} ${q2(cy - q)} ${q2(cx)} ${q2(cy - r)}Z`
  )
}

// Tapered lens between two points (fur stripes, wisps).
function lens(x0: number, y0: number, x1: number, y1: number, w: number): string {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  const nx = (-(y1 - y0) / len) * w
  const ny = ((x1 - x0) / len) * w
  return `M${q2(x0)} ${q2(y0)}Q${q2(mx + nx)} ${q2(my + ny)} ${q2(x1)} ${q2(y1)}Q${q2(mx - nx)} ${q2(my - ny)} ${q2(x0)} ${q2(y0)}Z`
}

// Shaded sphere (bubble of goo, hand, bead): base, core shadow, rim, ink, specular.
function sphere(x: number, y: number, r: number, lit: string, mid: string, dark: string, rimCol: string, ink = 2.2, key: [number, number] = [-1, -1]): VectorPath[] {
  const C = circ(x, y, r)
  const kx = x + key[0] * r * 0.4
  const ky = y + key[1] * r * 0.4
  return [
    { d: C, fill: rad(kx, ky, r * 1.5, 0, lit, 0.5, mid, 1, dark) },
    rimLight(C, lin(x + key[0] * r, y + key[1] * r, x - key[0] * r, y - key[1] * r, 0, T, 0.6, T, 1, rimCol), r * 0.22),
    { d: C, stroke: INK, sw: ink },
    { d: ell(x + key[0] * r * 0.38, y + key[1] * r * 0.42, r * 0.3, r * 0.2), fill: 'rgba(255,255,255,0.9)' },
  ]
}

// Union of circles / ellipses (all wound the same way, so they also work as a clip).
const union = (parts: string[]) => parts.join('')

// ---- Hand-drawn figure kit ---------------------------------------------------
// Characters are authored as point lists (a few hand-placed points per form,
// deliberately asymmetric) that become Catmull-Rom cubic Béziers. Every contour
// gets a slow hand wobble, and the ink is a FILLED tapered stroke whose width
// follows the light: heavy on the shadow side, thin and broken on the lit side.
// A repeated point in a list marks a sharp corner.
export type Pt = [number, number]

export interface Curve {
  p: Pt[] // dense, wobbled samples
  c: boolean[] // corner flags
  d: string // cubic-Bézier path
}

function toPts(f: number[] | Pt[]): Pt[] {
  if (!f.length || Array.isArray(f[0])) return (f as Pt[]).map((p) => [p[0], p[1]] as Pt)
  const o: Pt[] = []
  const a = f as number[]
  for (let i = 0; i + 1 < a.length; i += 2) o.push([a[i], a[i + 1]])
  return o
}

// Sample a Catmull-Rom curve through the points (cubic Bézier segments).
function sampleCurve(f: number[] | Pt[], closed: boolean, step = 1.5): { p: Pt[]; c: boolean[]; u: number[] } {
  const P = toPts(f)
  const n = P.length
  const same = (i: number, j: number) => {
    const a = P[(i + n) % n]
    const b = P[(j + n) % n]
    return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6
  }
  const at = (i: number) => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))])
  const p: Pt[] = []
  const c: boolean[] = []
  const u: number[] = []
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    if (same(i, i + 1)) continue
    const a = at(i - 1)
    const b = at(i)
    const cc = at(i + 1)
    const e = at(i + 2)
    const c1: Pt = [b[0] + (cc[0] - a[0]) / 6, b[1] + (cc[1] - a[1]) / 6]
    const c2: Pt = [cc[0] - (e[0] - b[0]) / 6, cc[1] - (e[1] - b[1]) / 6]
    const m = Math.max(2, Math.ceil(Math.hypot(cc[0] - b[0], cc[1] - b[1]) / step))
    for (let k = 0; k < m; k++) {
      const t = k / m
      const s = 1 - t
      p.push([
        s * s * s * b[0] + 3 * s * s * t * c1[0] + 3 * s * t * t * c2[0] + t * t * t * cc[0],
        s * s * s * b[1] + 3 * s * s * t * c1[1] + 3 * s * t * t * c2[1] + t * t * t * cc[1],
      ])
      c.push(k === 0 && (same(i, i - 1) || (!closed && i === 0)))
      u.push(i + t)
    }
  }
  if (!closed) {
    p.push(P[n - 1])
    c.push(true)
    u.push(n - 1)
  }
  return { p, c, u }
}

function normals(p: Pt[], closed: boolean): Pt[] {
  const n = p.length
  return p.map((_, i) => {
    const a = closed ? p[(i - 1 + n) % n] : p[Math.max(0, i - 1)]
    const b = closed ? p[(i + 1) % n] : p[Math.min(n - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [-dy / l, dx / l] as Pt
  })
}

function arcLen(p: Pt[]): number[] {
  const s = [0]
  for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]))
  return s
}

// Slow hand tremor along the normal (periodic on closed curves: no seam).
function wobble(p: Pt[], amp: number, seed: number, closed: boolean): Pt[] {
  if (!amp || p.length < 3) return p
  const r = rng(seed)
  const s = arcLen(p)
  const L = s[s.length - 1] + (closed ? Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) : 0)
  const per = (len: number) => (closed ? (2 * Math.PI * Math.max(1, Math.round(L / len))) / L : (2 * Math.PI) / len)
  const f1 = per(22 + r() * 12)
  const f2 = per(6 + r() * 4)
  const p1 = r() * 6.28
  const p2 = r() * 6.28
  const N = normals(p, closed)
  return p.map((q, i) => {
    const o = amp * (0.68 * Math.sin(s[i] * f1 + p1) + 0.32 * Math.sin(s[i] * f2 + p2))
    return [q[0] + N[i][0] * o, q[1] + N[i][1] * o] as Pt
  })
}

// Cubic-Bézier path through dense samples (keeps flagged corners sharp).
function curveD(p: Pt[], c: boolean[], closed: boolean, every = 2): string {
  const keep: number[] = []
  for (let i = 0; i < p.length; i++) if (i % every === 0 || c[i] || (!closed && i === p.length - 1)) keep.push(i)
  const flat: number[] = []
  keep.forEach((i) => {
    flat.push(p[i][0], p[i][1])
    if (c[i] && (closed || (i > 0 && i < p.length - 1))) flat.push(p[i][0], p[i][1])
  })
  return smooth(flat, closed)
}

// A closed hand-drawn form.
export function form(f: number[] | Pt[], seed = 1, amp = 0.45, step = 1.5): Curve {
  const s = sampleCurve(f, true, step)
  const p = wobble(s.p, amp, seed, true)
  return { p, c: s.c, d: curveD(p, s.c, true) }
}

// Hand-drawn oval (eyes, pupils, pores...) — 8 jittered points, never a true ellipse.
export function oval(cx: number, cy: number, rx: number, ry: number, rot = 0, seed = 1, irr = 0.06): number[] {
  const r = rng(seed)
  const out: number[] = []
  const cr = Math.cos((rot * Math.PI) / 180)
  const sr = Math.sin((rot * Math.PI) / 180)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (r() - 0.5) * 0.25
    const k = 1 + (r() - 0.5) * 2 * irr
    const x = Math.cos(a) * rx * k
    const y = Math.sin(a) * ry * k
    out.push(cx + x * cr - y * sr, cy + x * sr + y * cr)
  }
  return out
}

// Move / rotate / scale a flat point list (author parts once, place them anywhere).
export function place(f: number[], dx: number, dy: number, rot = 0, sx = 1, sy = sx): number[] {
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  const o: number[] = []
  for (let i = 0; i + 1 < f.length; i += 2) {
    const x = f[i] * sx
    const y = f[i + 1] * sy
    o.push(dx + x * c - y * s, dy + x * s + y * c)
  }
  return o
}

const smoothstep = (t: number) => {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

// Filled polygon around a centreline with a width per sample.
function ribbon(p: Pt[], w: number[], N: Pt[]): string {
  const L: number[] = []
  const R: number[] = []
  p.forEach((q, i) => {
    L.push(q[0] + (N[i][0] * w[i]) / 2, q[1] + (N[i][1] * w[i]) / 2)
    R.push(q[0] - (N[i][0] * w[i]) / 2, q[1] - (N[i][1] * w[i]) / 2)
  })
  const back: number[] = []
  for (let i = R.length - 2; i >= 0; i -= 2) back.push(R[i], R[i + 1])
  const a = smooth(L, false)
  const b = smooth(back, false).replace(/^M/, 'L')
  return a + b + 'Z'
}

export interface InkOpts {
  w?: number // heaviest width (shadow side)
  thin?: number // lightest width (lit side)
  light?: Pt // direction the key light comes FROM
  breaks?: number[] // extra stroke breaks, as fractions of the loop
  gap?: number // gap at each break (negative = strokes overshoot)
  taper?: number // taper length at stroke ends
  heavy?: [number, number, number, number][] // [x, y, radius, multiplier] — e.g. under overlaps
  noBreak?: boolean // single closed stroke (still tapered at the lit point)
}

// Variable-width contour of a closed form: several overlapping tapered strokes.
export function inkRing(cv: Curve, o: InkOpts = {}, seed = 7): string {
  const p = cv.p
  const n = p.length
  const w = o.w ?? 3.6
  const thin = o.thin ?? 0.9
  const lv = o.light ?? [-0.6, -0.8]
  const ll = Math.hypot(lv[0], lv[1]) || 1
  let area = 0
  for (let i = 0; i < n; i++) {
    const a = p[i]
    const b = p[(i + 1) % n]
    area += a[0] * b[1] - b[0] * a[1]
  }
  const sgn = area > 0 ? -1 : 1 // flips the left normal to point outward
  const N = normals(p, true).map((q) => [q[0] * sgn, q[1] * sgn] as Pt)
  const r = rng(seed)
  const ph = r() * 6.28
  const s = arcLen(p)
  const L = s[n - 1] + Math.hypot(p[0][0] - p[n - 1][0], p[0][1] - p[n - 1][1])
  const fac = N.map((q) => smoothstep((1 - (q[0] * lv[0] + q[1] * lv[1]) / ll) / 2 * 1.25 - 0.1))
  const width = p.map((q, i) => {
    let k = thin + (w - thin) * Math.pow(fac[i], 1.15)
    k *= 1 + 0.14 * Math.sin(s[i] * 0.35 + ph) + 0.08 * Math.sin(s[i] * 0.11 + ph * 2)
    for (const [hx, hy, hr, hm] of o.heavy ?? []) {
      const d = Math.hypot(q[0] - hx, q[1] - hy)
      if (d < hr) k *= 1 + (hm - 1) * smoothstep(1 - d / hr)
    }
    return k
  })
  // break at the most-lit point (+ requested extra breaks)
  let lit = 0
  for (let i = 1; i < n; i++) if (fac[i] < fac[lit]) lit = i
  const br = [s[lit] / L, ...(o.breaks ?? [])].map((t) => ((t % 1) + 1) % 1).sort((a, b) => a - b)
  const gap = o.gap ?? 1.6
  const taper = o.taper ?? 7
  let out = ''
  const count = o.noBreak ? 1 : br.length
  for (let k = 0; k < count; k++) {
    const t0 = br[k] * L + gap / 2
    const t1 = (k + 1 < br.length ? br[k + 1] * L : br[0] * L + L) - gap / 2
    const P: Pt[] = []
    const W: number[] = []
    const NN: Pt[] = []
    const tm = ((t0 % L) + L) % L
    let first = 0
    while (first < n - 1 && s[first] < tm) first++
    const startIdx = first + Math.floor(t0 / L) * n - 1
    for (let j = 0; j < n * 2; j++) {
      const idx = startIdx + j
      const i = ((idx % n) + n) % n
      const pos = s[i] + Math.floor(idx / n) * L
      if (pos > t1) break
      if (pos < t0) continue
      const e = Math.min(pos - t0, t1 - pos)
      P.push(p[i])
      NN.push(N[i])
      W.push(Math.max(0.12, width[i] * Math.pow(Math.min(1, e / taper), 0.6)))
    }
    if (P.length > 2) out += ribbon(P, W, NN)
  }
  return out
}

// Open tapered ink line (interior lines, creases, hatching, lashes).
export function inkLine(f: number[] | Pt[], w: number, seed = 3, t0 = 0.22, t1 = 0.32, amp = 0.25): string {
  const sc = sampleCurve(f, false, 1.2)
  const p = wobble(sc.p, amp, seed, false)
  if (p.length < 3) return ''
  const s = arcLen(p)
  const L = s[s.length - 1] || 1
  const W = s.map((v) => {
    const t = v / L
    const k = Math.min(1, t0 > 0 ? t / t0 : 1, t1 > 0 ? (1 - t) / t1 : 1)
    return Math.max(0.1, w * Math.pow(Math.max(0, k), 0.65))
  })
  return ribbon(p, W, normals(p, false))
}

// Tapered limb outline around a centreline (half-widths per control point).
export function tube(center: number[], half: number[], capK = 1): number[] {
  const sc = sampleCurve(center, false, 2)
  const p = sc.p
  const N = normals(p, false)
  const hw = sc.u.map((u) => {
    const i = Math.min(half.length - 2, Math.floor(u))
    const t = smoothstep(u - i)
    return half[i] + (half[i + 1] - half[i]) * t
  })
  const Lf: number[] = []
  const Rt: number[] = []
  p.forEach((q, i) => {
    Lf.push(q[0] + N[i][0] * hw[i], q[1] + N[i][1] * hw[i])
    Rt.push(q[0] - N[i][0] * hw[i], q[1] - N[i][1] * hw[i])
  })
  const cap = (q: Pt, nrm: Pt, r: number, dir: number) => {
    const o: number[] = []
    const tx = -nrm[1] * dir
    const ty = nrm[0] * dir
    for (let k = 1; k < 4; k++) {
      const a = (k / 4) * Math.PI
      o.push(q[0] + nrm[0] * r * Math.cos(a) + tx * r * Math.sin(a) * capK, q[1] + nrm[1] * r * Math.cos(a) + ty * r * Math.sin(a) * capK)
    }
    return o
  }
  const last = p.length - 1
  const out: number[] = [...Lf, ...cap(p[last], N[last], hw[last], -1)]
  for (let i = Rt.length - 2; i >= 0; i -= 2) out.push(Rt[i], Rt[i + 1])
  const c0 = cap(p[0], [-N[0][0], -N[0][1]], hw[0], -1)
  return out.concat(c0)
}

// Keep the part of a dense outline above / below a boundary y = g(x).
export function cut(p: Pt[], g: (x: number) => number, keep: 'above' | 'below'): Pt[] {
  const ins = (q: Pt) => (keep === 'above' ? q[1] <= g(q[0]) : q[1] >= g(q[0]))
  const cross = (a: Pt, b: Pt): Pt => {
    let lo = 0
    let hi = 1
    for (let k = 0; k < 18; k++) {
      const m = (lo + hi) / 2
      const q: Pt = [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m]
      if (ins(q) === ins(a)) lo = m
      else hi = m
    }
    return [a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo]
  }
  const out: Pt[] = []
  let exit: Pt | null = null
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    if (ins(a)) out.push(a)
    if (ins(a) !== ins(b)) {
      const x = cross(a, b)
      if (!ins(a) && exit) {
        // follow the boundary curve from where we left the region
        const steps = Math.ceil(Math.abs(x[0] - exit[0]) / 2)
        for (let k = 1; k < steps; k++) {
          const xx = exit[0] + ((x[0] - exit[0]) * k) / steps
          out.push([xx, g(xx)])
        }
      }
      out.push(x)
      if (ins(a)) exit = x
    }
  }
  if (exit && out.length && !ins(p[0])) {
    const x = out[0]
    const steps = Math.ceil(Math.abs(x[0] - exit[0]) / 2)
    for (let k = 1; k < steps; k++) {
      const xx = exit[0] + ((x[0] - exit[0]) * k) / steps
      out.push([xx, g(xx)])
    }
  }
  return out
}

export const polyD = (p: Pt[]) => p.map((q, i) => `${i ? 'L' : 'M'}${q2(q[0])} ${q2(q[1])}`).join('') + 'Z'

// Soft, irregular paint dab: nested hand-shaped blobs, each faint.
export function dab(cx: number, cy: number, rx: number, ry: number, rgb: string, alpha: number, seed = 1, rot = 0, rings = Math.max(5, Math.min(14, Math.round(Math.max(rx, ry) / 1.8)))): VectorPath[] {
  const base = oval(0, 0, 1, 1, 0, seed, 0.22)
  return Array.from({ length: rings }, (_, i) => {
    const k = 1 - (i / rings) * 0.62
    return { d: smooth(place(base, cx, cy, rot, rx * k, ry * k)), fill: `rgba(${rgb},${(alpha / rings).toFixed(3)})` }
  })
}

// Clip (and optionally blend) a list of paths to a shape.
export function within(clip: string, paths: VectorPath[], blend?: GlobalCompositeOperation): VectorPath[] {
  return paths.map((p) => ({ ...p, clip, blend: blend ?? p.blend }))
}

// Hatching along a guide curve: short tapered strokes at an angle (deg).
export function hatch(guide: number[], count: number, len: number, ang: number, w: number, seed = 5): string {
  const sc = sampleCurve(guide, false, 1)
  const p = sc.p
  const s = arcLen(p)
  const L = s[s.length - 1]
  const r = rng(seed)
  let out = ''
  for (let k = 0; k < count; k++) {
    const target = ((k + 0.5 + (r() - 0.5) * 0.5) / count) * L
    let i = 0
    while (i < p.length - 1 && s[i] < target) i++
    const a = ((ang + (r() - 0.5) * 10) * Math.PI) / 180
    const l = len * (0.65 + r() * 0.45)
    const x = p[i][0]
    const y = p[i][1]
    const bend = (r() - 0.5) * l * 0.18
    out += inkLine([x, y, x + Math.cos(a) * l * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * l * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l], w * (0.75 + r() * 0.4), seed + k, 0.12, 0.7, 0.1)
  }
  return out
}

// Paper / brush grain: tiny specks (clip it to the figure, multiply).
export function grain(x: number, y: number, w: number, h: number, count: number, seed: number, rmin = 0.18, rmax = 0.5): string {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < count; i++) d += circ(x + r() * w, y + r() * h, rmin + r() * (rmax - rmin))
  return d
}

// Short tapered strokes (fur, fabric weave, brush texture) scattered in a box.
export function strokesIn(x: number, y: number, w: number, h: number, count: number, len: number, ang: number, sw: number, seed: number): string {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < count; i++) {
    const cx = x + r() * w
    const cy = y + r() * h
    const a = ((ang + (r() - 0.5) * 30) * Math.PI) / 180
    const l = len * (0.6 + r() * 0.6)
    const dx = (Math.cos(a) * l) / 2
    const dy = (Math.sin(a) * l) / 2
    d += lens(cx - dx, cy - dy, cx + dx, cy + dy, sw * (0.6 + r() * 0.6))
  }
  return d
}

// ---- Sea sponge in square pants -------------------------------------------
// Key light: sunlight from the upper-left through the water surface.
// Cyan rim from the water on the right, warm bounce from the sand below.
export function sponge(): Art {
  const LT: Pt = [-0.62, -0.78] // key light from the upper-left
  const ink = (cv: Curve, o: InkOpts = {}, seed = 7): VectorPath => ({ d: inkRing(cv, { light: LT, ...o }, seed), fill: INK })
  const line = (f: number[], w: number, seed = 3, t0 = 0.22, t1 = 0.32, col = INK): VectorPath => ({ d: inkLine(f, w, seed, t0, t1), fill: col })
  const mul = (d: string, fill: Paint, clip: string, alpha = 1): VectorPath => ({ d, fill, clip, blend: 'multiply', alpha })
  const scr = (d: string, fill: Paint, clip: string, alpha = 1): VectorPath => ({ d, fill, clip, blend: 'screen', alpha })
  const CYAN = 'rgba(140,238,255,0.95)'
  const YEL = '#ffe24e'

  // ---- the sponge box: one wobbly silhouette (front + right side + top) ----
  const TF = [39, 28, 51, 24, 63, 27, 76, 22.5, 89, 26, 102, 21.5, 115, 25, 129, 21, 142, 25, 153, 20.5, 163, 25]
  const RF = [163, 25, 165.5, 41, 162, 57, 166, 73, 163, 90, 167, 106, 164, 122, 166, 138, 164, 154, 165.5, 170, 163, 185]
  const SIL = [
    39, 28, 47, 21, 59, 16.5, 71, 19, 84, 14, 97, 18, 110, 13, 124, 17, 137, 12.5, 150, 16, 161, 11.5, 171, 16.5,
    175, 33, 172, 49, 176.5, 65, 173, 82, 177.5, 98, 174, 114, 176.5, 130, 173.5, 146, 175, 162, 172, 178,
    163, 185.5, 132, 186.5, 101, 187.5, 70, 186.5, 41, 185.5,
    39, 169, 40.5, 153, 37, 138, 40, 122, 35.5, 106, 39, 90, 35.5, 74, 39, 58, 35.5, 42,
  ]
  const body = form(SIL, 11, 0.55)
  const B = body.d
  const gS = (x: number) => (x <= 164 ? 139.5 - (x - 39) * 0.008 : 138.5 - (x - 164) * 0.78)
  const gP = (x: number) => gS(x) + 12.5
  const yelP = polyD(cut(body.p, gS, 'above'))
  const shirtP = polyD(cut(cut(body.p, gS, 'below'), gP, 'above'))
  const pantsP = polyD(cut(body.p, gP, 'below'))
  const SIDE = smooth([...RF, 210, 185, 210, 10], true)
  const TOPR = smooth([...TF, 175, 0, 30, 0], true)

  // ---- limbs ----
  const HAND = [
    -5, 9, -6.5, 4, -10, 2, -14, -1.5, -14.5, -4.5, -12, -5.5, -8, -3, -8, -3, -8.5, -8, -9, -14, -7.5, -18, -4.5, -18.5, -3, -15, -2.5, -10.5, -2.5, -10.5,
    -1.5, -16.5, -0.5, -21, 2.5, -21.5, 4.5, -18.5, 4.2, -11, 4.2, -11, 6, -15.5, 8, -17.5, 10.5, -16.5, 10.8, -13.5, 9, -7, 10, -2.5, 9.5, 2.5, 6.5, 8,
  ]
  const HAND_REST = [
    -5, 8, -7, 2.5, -10.5, -0.5, -12.5, -4.5, -10.5, -6.8, -7.2, -4.6, -7.2, -4.6, -7.8, -10, -6.6, -15.5, -3.4, -18.6, 1.6, -19, 5.6, -17.2,
    8.4, -13, 9.2, -6, 8.6, 2, 6, 8,
  ]
  const limb = (center: number[], half: number[], seed: number): VectorPath[] => {
    const cv = form(tube(center, half), seed, 0.25, 1.2)
    return [
      { d: cv.d, fill: lin(center[0], center[1], center[center.length - 2], center[center.length - 1], 0, '#fff07a', 1, '#ffd94a') },
      mul(shift(cv.d, 1.6, 1.4), 'rgba(222,150,40,0.75)', cv.d),
      ink(cv, { w: 2.6, thin: 0.7, taper: 4 }, seed + 1),
    ]
  }
  const hand = (x: number, y: number, rot: number, s: number, seed: number, rest = false): VectorPath[] => {
    const cv = form(place(rest ? HAND_REST : HAND, x, y, rot, s), seed, 0.18, 1)
    const fold = (f: number[]) => line(place(f, x, y, rot, s), 0.9, seed + 3, 0.1, 0.6)
    return [
      { d: cv.d, fill: lin(x - 8, y - 12, x + 8, y + 8, 0, '#fff6a0', 0.5, YEL, 1, '#f2c53a') },
      mul(smooth(place([4, -10, 9.5, -6, 9, 3, 5, 8, 0, 6, 2, -2], x, y, rot, s)), 'rgba(226,150,40,0.6)', cv.d),
      ink(cv, { w: 2.2, thin: 0.6, taper: 3, gap: 1 }, seed + 1),
      ...(rest
        ? [fold([-2.6, -18.4, -2.2, -14, -2.6, -10]), fold([2.6, -18.6, 2.8, -14, 2.2, -10.5]), fold([-7.2, -4.6, -4.5, -2.5])]
        : [fold([-2.5, -10.5, -2.7, -6]), fold([4.2, -11, 4, -6.5]), fold([-8, -3, -5, -1])]),
    ]
  }
  const shoe = (f: number[], seed: number, toe: Pt): VectorPath[] => {
    const cv = form(f, seed, 0.3, 1.2)
    const S = cv.d
    return [
      { d: S, fill: lin(toe[0], toe[1] - 7, toe[0], toe[1] + 10, 0, '#4b4b55', 1, '#101016') },
      ...within(S, [...dab(toe[0], toe[1] - 2, 9, 4, '120,130,150', 0.45, seed)]),
      { d: smooth(place([-34, 7.2, -10, 8.4, 12, 8.1, 34, 7, 34, 22, -34, 22], toe[0], toe[1] - 1)), fill: '#26262e', clip: S },
      { d: inkLine(place([-22, 7.4, -2, 8.5, 20, 7.8], toe[0] + (toe[0] < 100 ? 6 : -6), toe[1] - 1), 1.3, seed, 0.15, 0.2), fill: INK },
      { d: inkLine(place([-20, 9.4, 0, 10.4, 18, 9.6], toe[0] + (toe[0] < 100 ? 6 : -6), toe[1] - 1), 0.7, seed + 4, 0.2, 0.3), fill: 'rgba(170,190,215,0.55)' },
      { d: inkLine(toe[0] < 100 ? [toe[0] + 14, toe[1] - 5, toe[0] + 10, toe[1] - 1, toe[0] + 11, toe[1] + 3] : [toe[0] - 14, toe[1] - 5, toe[0] - 10, toe[1] - 1, toe[0] - 11, toe[1] + 3], 1, seed + 5, 0.3, 0.4), fill: 'rgba(200,210,235,0.55)' },
      { d: hatch(toe[0] < 100 ? [toe[0] + 10, toe[1] + 7.5, toe[0] + 22, toe[1] + 6] : [toe[0] - 22, toe[1] + 6, toe[0] - 10, toe[1] + 7.5], 5, 3, 250, 0.6, seed + 6), fill: 'rgba(0,0,0,0.6)', clip: S },
      rimLight(S, lin(toe[0] - 20, 0, toe[0] + 20, 0, 0, T, 0.6, T, 1, CYAN), 1.3),
      ink(cv, { w: 2.7, thin: 0.8, taper: 5 }, seed + 1),
      { d: smooth(oval(toe[0] - 3, toe[1] - 4, 5, 1.8, toe[0] < 100 ? -12 : 12, seed, 0.15)), fill: 'rgba(255,255,255,0.75)' },
      { d: circ(toe[0] + (toe[0] < 100 ? 5 : -2), toe[1] - 5, 0.9), fill: 'rgba(255,255,255,0.9)' },
    ]
  }
  const sock = (center: number[], seed: number): VectorPath[] => {
    const cv = form(tube(center, [4.4, 4.0, 4.2]), seed, 0.2, 1)
    const S = cv.d
    const y0 = center[1]
    return [
      { d: S, fill: '#fbfcff' },
      { d: inkLine([center[0] - 6, y0 + 2.6, center[0], y0 + 3.2, center[0] + 6, y0 + 2.6], 2.1, seed, 0, 0), fill: '#e2372e', clip: S },
      { d: inkLine([center[0] - 6, y0 + 5.8, center[0], y0 + 6.4, center[0] + 6, y0 + 5.8], 2.1, seed + 1, 0, 0), fill: '#2f6fc0', clip: S },
      mul(shift(S, 2.2, 0), 'rgba(150,160,200,0.6)', S),
      mul(smooth([center[0] - 8, y0 - 1, center[0] + 8, y0 - 1, center[0] + 8, y0 + 2.5, center[0] - 8, y0 + 3.5]), 'rgba(120,110,150,0.5)', S),
      ink(cv, { w: 2, thin: 0.6, taper: 3 }, seed + 2),
    ]
  }

  // ---- pores: craters that follow each face in perspective ----
  type Pore = [number, number, number, number, number]
  const fp: Pore[] = [
    [58, 40, 6.5, 5, -14], [147, 46, 7.5, 6, 18], [108, 31, 4.2, 3.2, 6], [48, 118, 4.5, 6, -8], [152, 94, 5, 3.6, 22],
    [68, 131, 5.5, 4, -4], [140, 124, 6.5, 4.6, 12], [127, 34, 3.2, 2.6, 0], [46, 64, 2.6, 3.4, 0], [156, 66, 2.6, 2, 0],
    [116, 132, 2.6, 2, 0], [53, 88, 2.2, 1.8, 0], [88, 33, 2.4, 1.8, 0], [148, 108, 2.2, 1.7, 0],
  ]
  const sp: Pore[] = [[169.5, 46, 2.2, 5.5, 8], [170.5, 92, 1.8, 4.2, 6], [169, 121, 1.6, 3.6, 4], [171, 68, 1.1, 2.4, 0]]
  const tp: Pore[] = [[70, 19.5, 4.5, 1.5, -6], [118, 18.5, 3.6, 1.2, -4], [150, 17.5, 2.6, 0.9, -8]]
  const pores: VectorPath[] = []
  ;[...fp, ...sp, ...tp].forEach(([x, y, rx, ry, rot], i) => {
    const P = smooth(oval(x, y, rx, ry, rot, 40 + i, 0.16))
    pores.push({ d: P, fill: '#dcae2a' })
    pores.push(mul(smooth(oval(x - rx * 0.28, y - ry * 0.3, rx * 0.85, ry * 0.8, rot, 60 + i, 0.12)), '#b98617', P))
    const arc = (a0: number, a1: number) => {
      const o: number[] = []
      for (let k = 0; k <= 6; k++) {
        const a = ((a0 + ((a1 - a0) * k) / 6) * Math.PI) / 180
        const cr = Math.cos((rot * Math.PI) / 180)
        const sr = Math.sin((rot * Math.PI) / 180)
        const px = Math.cos(a) * rx
        const py = Math.sin(a) * ry
        o.push(x + px * cr - py * sr, y + px * sr + py * cr)
      }
      return o
    }
    if (rx > 2) {
      pores.push(line(arc(-10, 120), Math.min(1.3, rx * 0.2), 80 + i, 0.3, 0.3, 'rgba(255,252,214,0.95)'))
      pores.push(line(arc(160, 290), Math.min(1.1, rx * 0.16), 90 + i, 0.3, 0.4, 'rgba(120,70,0,0.55)'))
    }
  })

  // ---- face ----
  const EYE_L = [80, 39.5, 92.5, 43.5, 99.5, 55, 99, 69, 92.5, 79, 80.5, 81.5, 68.5, 78.5, 61, 69, 60.5, 55, 66.5, 44.5]
  const EYE_R = [122, 39, 133.5, 43.5, 140, 55.5, 139, 68.5, 133, 77.5, 121.5, 80, 110.5, 77.5, 103, 68.5, 102.5, 55.5, 108.5, 44]
  const eye = (pts: number[], ix: number, iy: number, ir: number, seed: number): VectorPath[] => {
    const cv = form(pts, seed, 0.3, 1)
    const E = cv.d
    const I = smooth(oval(ix, iy, ir, ir * 1.04, 0, seed + 1, 0.04))
    const Pu = smooth(oval(ix + 0.3, iy + 0.4, ir * 0.48, ir * 0.52, 0, seed + 2, 0.05))
    return [
      { d: E, fill: '#fbfdff' },
      ...within(E, [...dab(ix + 6, iy + 11, 14, 8, '170,190,225', 0.55, seed), ...dab(ix - 8, iy - 14, 12, 6, '190,205,235', 0.4, seed + 3)]),
      mul(smooth([pts[18] - 3, pts[19] - 4, pts[0], pts[1] - 6, pts[2] + 4, pts[3] - 2, pts[4] + 3, pts[5] + 4, pts[0] + 2, pts[1] + 5.5, pts[18] + 2, pts[19] + 4]), 'rgba(150,170,215,0.65)', E),
      { d: I, fill: radLit(ix, iy, ir * 1.3, 0, '#8fd4ff', 0.6, '#3b8fd6', 1, '#1d5aa0'), clip: E },
      { d: inkLine([ix - ir * 0.7, iy + ir * 0.35, ix, iy + ir * 0.82, ix + ir * 0.72, iy + ir * 0.3], 2.4, seed, 0.3, 0.3), fill: 'rgba(170,240,255,0.7)', clip: I, blend: 'screen' },
      { d: strokesIn(ix - ir, iy - ir, ir * 2, ir * 2, 14, ir * 0.55, 60, 0.35, seed), fill: 'rgba(20,60,120,0.4)', clip: I },
      mul(shift(I, 0, -ir * 0.9), 'rgba(20,50,110,0.55)', I),
      { d: inkRing(form(oval(ix, iy, ir, ir * 1.04, 0, seed + 1, 0.04), seed, 0.1), { light: [0.4, 0.9], w: 1.6, thin: 0.5, taper: 3 }, seed), fill: INK, clip: E },
      { d: Pu, fill: INK, clip: E },
      { d: smooth(oval(ix - ir * 0.36, iy - ir * 0.4, ir * 0.32, ir * 0.24, -30, seed + 5, 0.1)), fill: '#ffffff', clip: E },
      { d: circ(ix + ir * 0.4, iy + ir * 0.45, ir * 0.11), fill: 'rgba(255,255,255,0.9)', clip: E },
      { d: inkRing(cv, { light: [0.15, 1], w: 3.4, thin: 0.8, taper: 6, gap: 1.5 }, seed + 9), fill: INK },
    ]
  }
  const NOSE = form(tube([106, 77, 98.5, 81.5, 91, 84], [5.6, 5.0, 6.2], 1.15), 5, 0.25, 1)
  const MOUTH = form([54, 97.5, 70, 104, 88, 107.5, 104, 108.5, 122, 104.5, 136.5, 98.5, 146.5, 92.5, 143, 99.5, 134, 112.5, 118, 125.5, 100, 130.5, 82, 128, 67, 118, 58.5, 105], 21, 0.35, 1)
  const M = MOUTH.d
  const TOOTH_L = form([86.5, 104, 99, 105.5, 99, 105.5, 99.4, 113, 98.6, 120.5, 93.5, 122.6, 88.4, 120.8, 87, 114, 86.5, 104], 31, 0.2, 1)
  const TOOTH_R = form([101.5, 105.5, 113.5, 103.5, 113.5, 103.5, 114.4, 111, 113.6, 119, 108.6, 121.4, 103.2, 120.6, 101.8, 113, 101.5, 105.5], 33, 0.2, 1)
  const TONGUE = form([77, 125, 86, 117.5, 97, 119.5, 104, 117, 113, 116.5, 123, 121, 118, 129, 100, 133, 84, 131], 35, 0.3, 1)

  const COLLAR_L = form([87, 140.5, 100.5, 141.5, 100.5, 141.5, 99, 144, 95.5, 150.5, 95.5, 150.5, 91, 145.5, 87, 140.5], 41, 0.2, 1)
  const COLLAR_R = form([101.5, 141.5, 115.5, 139.5, 115.5, 139.5, 111.5, 144.5, 106.5, 150, 106.5, 150, 103, 144.5], 43, 0.2, 1)
  const KNOT = form([97, 142.5, 105.5, 142, 105.5, 142, 104.6, 148.5, 104.6, 148.5, 97.8, 148.8, 97.8, 148.8], 45, 0.15, 1)
  const TIE = form([97.8, 148.8, 104.6, 148.5, 104.6, 148.5, 108, 160, 101.5, 171, 101.5, 171, 94.6, 160.5], 47, 0.2, 1)
  const SLEEVE_L = form([47, 139.5, 39, 137.5, 31, 139, 26.5, 143.5, 27, 151, 33, 155.5, 41, 155, 47, 153], 51, 0.3, 1)
  const SLEEVE_R = form([163, 138, 171, 135, 179.5, 137, 184, 141.5, 183.5, 148.5, 177, 152.5, 169, 151.5, 163, 150], 53, 0.3, 1)

  const paths: VectorPath[] = [
    // cast shadow on the sand (light from the upper-left) + contact occlusion
    ...softShade(122, 215, 82, 8, 0.55, '6,40,70'),
    ...softShade(66, 214.5, 20, 2.6, 0.6, '4,24,40'),
    ...softShade(136, 214.5, 20, 2.6, 0.6, '4,24,40'),
    // waving arm (behind the box edge) and relaxed arm
    ...limb([44, 146, 31, 145, 19.5, 136.5, 14.5, 121, 15.5, 106], [3.3, 2.8, 3.0, 2.5, 2.7], 61),
    ...hand(16.5, 99, -12, 0.72, 63),
    { d: inkLine([4.5, 82, 5.5, 76, 9.5, 72.5], 1.3, 64, 0.3, 0.3) + inkLine([0.5, 79, 2, 71.5, 7.5, 67], 1.1, 66, 0.3, 0.3), fill: 'rgba(10,40,70,0.55)' },
    ...limb([172, 145, 184, 152, 189.5, 163, 186.5, 175], [3.2, 2.9, 2.7, 2.6], 65),
    ...hand(185.5, 181, 172, 0.66, 67, true),
    // legs, socks, shoes
    ...limb([72, 181, 69.5, 192.5, 71, 204], [3.0, 2.5, 2.8], 71),
    ...limb([131, 181, 133.5, 192, 131.5, 204], [3.0, 2.5, 2.8], 73),
    ...sock([69.8, 193, 70, 198.5, 71, 204], 75),
    ...sock([133.4, 193, 132.8, 198.5, 131.6, 204], 77),
    ...shoe(place([79, 197.5, 73, 195.8, 64, 196.2, 55, 199, 48.5, 203.5, 47.5, 208, 51.5, 211.6, 63, 212.4, 77, 212, 83.5, 209, 83.5, 202.5], 0, 4), 81, [58, 207]),
    ...shoe(place([123, 197.5, 131, 195.8, 140, 196.6, 149, 200.8, 154.5, 205.5, 152.5, 210.8, 140, 212.4, 125, 212, 118.5, 209, 118.5, 202.5], 0, 4), 83, [144, 207]),
    // shadow of the box on the leg tops
    ...[71, 131.5].map((x) => mul(smooth([x - 8, 180, x + 8, 180, x + 8, 186.5, x - 8, 188.5]), 'rgba(120,70,20,0.6)', B)),

    // ---- body ----
    { d: B, fill: lin(40, 20, 172, 182, 0, '#fff38a', 0.45, YEL, 1, '#f6cc3a') },
    ...within(yelP, [
      ...dab(64, 42, 30, 20, '255,253,215', 0.6, 1),
      ...dab(48, 80, 12, 26, '255,250,200', 0.35, 2, 10),
      ...dab(150, 118, 22, 30, '244,166,52', 0.32, 3),
      ...dab(104, 132, 50, 9, '238,160,50', 0.28, 4),
      ...dab(42, 122, 7, 22, '150,232,214', 0.32, 5),
      ...dab(120, 46, 18, 12, '255,236,140', 0.3, 6),
    ]),
    // cheek / face occlusion: soft warm cel shapes under the eyes and around the mouth
    mul(smooth([58, 82, 72, 86, 100, 88, 128, 85, 144, 80, 152, 92, 146, 106, 136, 98, 100, 96, 64, 100, 54, 104, 52, 92]), 'rgba(240,170,70,0.35)', yelP),
    mul(smooth([60, 112, 80, 132, 100, 138, 124, 132, 142, 112, 150, 122, 134, 140, 100, 141, 66, 140, 52, 124]), 'rgba(236,160,60,0.4)', yelP),
    // sponge texture: specks and tiny holes
    { d: grain(36, 14, 142, 128, 260, 3, 0.2, 0.62), fill: 'rgba(190,130,20,0.45)', clip: yelP, blend: 'multiply' },
    { d: grain(36, 14, 142, 128, 120, 4, 0.2, 0.5), fill: 'rgba(255,255,230,0.55)', clip: yelP },
    ...pores,
    // shirt
    { d: shirtP, fill: lin(0, 139, 0, 152, 0, '#ffffff', 1, '#e8ecf4') },
    ...within(shirtP, [...dab(60, 145, 22, 5, '255,255,255', 0.6, 7), ...dab(140, 147, 24, 6, '190,198,226', 0.5, 8)]),
    mul(smooth([38, 139, 168, 137, 168, 141.5, 120, 142.5, 80, 143, 38, 142.5]), 'rgba(150,140,175,0.5)', shirtP),
    { d: strokesIn(36, 139, 140, 14, 70, 2.2, 0, 0.18, 9), fill: 'rgba(120,130,170,0.35)', clip: shirtP },
    // pants
    { d: pantsP, fill: lin(40, 152, 160, 188, 0, '#bd8448', 0.5, '#a06a36', 1, '#74461d') },
    ...within(pantsP, [...dab(62, 166, 26, 10, '214,160,100', 0.45, 10), ...dab(146, 178, 22, 10, '80,44,20', 0.45, 11), ...dab(100, 182, 30, 4, '60,32,12', 0.4, 12)]),
    mul(smooth([38, 151, 168, 149, 168, 155, 120, 156, 80, 156.5, 38, 156]), 'rgba(70,35,10,0.55)', pantsP),
    { d: strokesIn(36, 152, 140, 36, 120, 2.6, 60, 0.2, 13), fill: 'rgba(60,30,10,0.35)', clip: pantsP },
    { d: strokesIn(36, 152, 140, 36, 60, 2.2, -60, 0.18, 14), fill: 'rgba(255,220,170,0.25)', clip: pantsP },
    line([46, 158.4, 52, 158.2, 58.5, 158.5], 3.4, 15, 0.12, 0.12),
    line([70, 158.3, 77, 158, 83.5, 158.3], 3.4, 16, 0.12, 0.12),
    line([118, 157.7, 125, 157.5, 131.5, 157.8], 3.4, 17, 0.12, 0.12),
    line([141, 157.5, 148, 157.2, 154.5, 157.4], 3.4, 18, 0.12, 0.12),
    line([167.5, 151, 170, 149, 172.5, 147.5], 2.8, 19, 0.12, 0.12),
    line([88, 176, 89.5, 181, 89, 186], 1.1, 20, 0.2, 0.4),
    line([116, 175, 114.5, 180.5, 115, 186], 1.1, 21, 0.2, 0.4),
    // side face in shadow (warm, bounced) and the bright top face
    mul(SIDE, lin(163, 0, 178, 0, 0, 'rgba(226,150,62,0.85)', 1, 'rgba(196,118,40,0.9)'), B),
    mul(SIDE, lin(0, 120, 0, 186, 0, 'rgba(255,255,255,0)', 1, 'rgba(150,90,40,0.5)'), B),
    ...within(B, [...dab(170, 60, 4, 22, '255,214,120', 0.35, 22)]),
    rimLight(B, lin(160, 0, 178, 0, 0, T, 0.72, T, 1, CYAN), 2.2),
    scr(TOPR, lin(0, 10, 0, 28, 0, 'rgba(255,252,210,0.85)', 1, 'rgba(255,252,210,0.35)'), B),
    { d: hatch([168, 150, 169, 165, 167.5, 180], 7, 6, 125, 0.8, 23), fill: 'rgba(60,30,10,0.7)', clip: B },
    { d: hatch([169, 104, 170.5, 118, 169.5, 132], 5, 5, 120, 0.7, 24), fill: 'rgba(120,70,10,0.55)', clip: B },
    // paper grain over the whole figure
    { d: grain(30, 8, 152, 182, 420, 5, 0.18, 0.42), fill: 'rgba(80,50,20,0.16)', clip: B, blend: 'multiply' },
    // interior edges (tapered, stopping short of the contour) and seams
    line([41, 27.5, 51, 24.3, 63, 27, 76, 22.8, 89, 26, 102, 21.8, 115, 25, 129, 21.3, 142, 25, 153, 20.8, 161, 24.5], 1.6, 25, 0.1, 0.25),
    line([163.5, 27, 165.5, 41, 162, 57, 166, 73, 163, 90, 167, 106, 164, 122, 166, 138, 164, 154, 165.5, 170, 163.4, 183], 1.7, 26, 0.12, 0.08),
    line([38, 139.6, 80, 139.2, 120, 138.9, 163, 138.6, 175, 129.5], 1.9, 27, 0.06, 0.1),
    line([38, 152.2, 80, 151.8, 120, 151.4, 163, 151.1, 175, 141.8], 2.4, 28, 0.04, 0.1),
    ink(body, { w: 4.6, thin: 1.1, taper: 9, breaks: [0.36, 0.78], gap: -2, heavy: [[118, 187, 30, 1.25]] }, 29),

    // ---- face ----
    // eyes cast a soft shadow on the face (light upper-left)
    mul(shift(smooth(EYE_L) + smooth(EYE_R), 3.2, 4.2), 'rgba(200,120,20,0.4)', yelP),
    ...eye(EYE_R, 120, 60.5, 9.2, 101),
    ...eye(EYE_L, 82, 61, 9.8, 111),
    // cheeks pushing up under the eyes
    line([66, 84.5, 72, 87, 79, 87.4], 1.2, 121, 0.3, 0.5),
    line([128, 84, 134, 83.5, 139, 80], 1.2, 122, 0.4, 0.3),
    // lashes
    line([69, 45, 66, 38.5, 62.5, 33.5], 2.3, 123, 0.05, 0.75),
    line([80, 40.5, 79.5, 33.5, 78, 28], 2.4, 124, 0.05, 0.75),
    line([91, 43, 94, 37, 98, 32.5], 2.2, 125, 0.05, 0.75),
    line([110.5, 43.5, 107.5, 37, 104.5, 32.5], 2.1, 126, 0.05, 0.75),
    line([122, 39.5, 122.5, 33, 124, 27.5], 2.3, 127, 0.05, 0.75),
    line([133, 43.5, 137, 37.5, 141.5, 33.5], 2.2, 128, 0.05, 0.75),
    // mouth: interior, tongue, buck teeth, lips
    { d: M, fill: lin(0, 98, 0, 130, 0, '#3a0a0c', 0.6, '#6a1a1c', 1, '#8a2a28') },
    { d: TONGUE.d, fill: lin(0, 116, 0, 133, 0, '#ff8f80', 1, '#d1544b'), clip: M },
    { d: smooth([86, 124, 96, 121, 104, 122, 112, 120.5, 116, 124, 108, 127, 92, 127.5]), fill: 'rgba(255,190,180,0.5)', clip: M },
    { d: inkLine([100.5, 121, 101, 125, 100, 129], 1, 131, 0.2, 0.5), fill: 'rgba(120,20,20,0.7)', clip: M },
    { d: smooth(oval(92, 123.2, 3.6, 1.2, -8, 132, 0.1)), fill: 'rgba(255,255,255,0.6)', clip: M },
    mul(smooth([52, 92, 100, 104, 150, 88, 146, 104, 100, 117, 56, 108]), 'rgba(40,0,0,0.55)', M),
    ...[TOOTH_L, TOOTH_R].flatMap((t, i) => [
      { d: t.d, fill: lin(0, 104, 0, 122, 0, '#ffffff', 0.7, '#f1f1ec', 1, '#cfd3d8') },
      mul(shift(t.d, 2.2, 0.5), 'rgba(170,175,200,0.6)', t.d),
      mul(smooth([80, 100, 120, 100, 120, 109, 80, 109]), 'rgba(120,90,90,0.4)', t.d),
      { d: smooth(oval(i ? 105 : 91, 110, 1.6, 3.4, 4, 140 + i, 0.1)), fill: 'rgba(255,255,255,0.95)' },
      ink(t, { w: 1.9, thin: 0.6, taper: 3, light: [-0.5, -0.2] }, 141 + i),
    ]),
    { d: inkRing(MOUTH, { light: [0.1, 1], w: 3.6, thin: 1.1, taper: 6, gap: -1.5, heavy: [[54, 97.5, 6, 1.4], [146.5, 92.5, 6, 1.4]] }, 151), fill: INK },
    // cheek bulges, dimples, blush, freckles
    line([47, 89, 50.5, 97, 56.5, 102.5], 1.8, 152, 0.3, 0.3),
    line([153, 84, 152, 92, 147, 98.5], 1.8, 153, 0.3, 0.3),
    ...within(yelP, [...dab(48, 99, 11, 9, '255,110,100', 0.4, 154), ...dab(151, 96, 10, 8.5, '255,110,100', 0.38, 155)]),
    { d: circ(45, 96, 1.2) + circ(50.5, 100.5, 1.1) + circ(46.5, 103, 1.3) + circ(149, 92.5, 1.2) + circ(154, 97, 1.1) + circ(150, 100.5, 1.2), fill: '#b04238' },
    // long nose: cast shadow, round shading, rim, specular
    mul(shift(NOSE.d, 3.8, 6), 'rgba(170,96,0,0.45)', yelP),
    { d: NOSE.d, fill: lin(88, 76, 104, 88, 0, '#fff6a4', 0.5, YEL, 1, '#f3c43c') },
    mul(smooth([84, 86, 92, 87.5, 100, 85.5, 108, 81, 110, 86, 98, 92, 86, 92]), 'rgba(232,150,50,0.75)', NOSE.d),
    { d: hatch([93, 88.5, 99, 87, 104, 84], 4, 3.2, 70, 0.6, 156), fill: 'rgba(120,60,0,0.7)', clip: NOSE.d },
    rimLight(NOSE.d, lin(86, 90, 100, 76, 0, CYAN, 0.35, T, 1, T), 1.2),
    { d: inkRing(NOSE, { w: 3, thin: 0.7, taper: 5, breaks: [0.5], gap: 3 }, 157), fill: INK },
    { d: smooth(oval(89, 81.2, 3.2, 1.6, -20, 158, 0.1)), fill: 'rgba(255,255,255,0.85)' },
    { d: circ(97.5, 78.6, 0.9), fill: 'rgba(255,255,255,0.8)' },

    // ---- collar, tie, sleeves ----
    mul(shift(TIE.d, 2.6, 2.4) + shift(COLLAR_L.d + COLLAR_R.d, 1.6, 2), 'rgba(80,60,90,0.4)', B),
    ...[COLLAR_L, COLLAR_R].flatMap((c, i) => [
      { d: c.d, fill: lin(0, 140, 0, 151, 0, '#ffffff', 1, '#dfe3ec') },
      mul(shift(c.d, i ? 2 : -2, 1.5), 'rgba(160,165,200,0.55)', c.d),
      ink(c, { w: 1.9, thin: 0.6, taper: 3 }, 161 + i),
    ]),
    { d: TIE.d, fill: lin(95, 0, 108, 0, 0, '#ff5d4d', 0.55, '#d92a20', 1, '#9a1812') },
    mul(smooth([102, 149, 106, 150, 108.5, 160, 102, 172, 102.5, 160]), 'rgba(120,10,10,0.55)', TIE.d),
    line([99.4, 152, 99.8, 158, 99.2, 164], 0.9, 163, 0.2, 0.4, 'rgba(255,220,210,0.85)'),
    line([103.5, 151, 102.6, 156], 0.8, 164, 0.2, 0.5),
    ink(TIE, { w: 2.1, thin: 0.6, taper: 3 }, 165),
    { d: KNOT.d, fill: lin(97, 0, 106, 0, 0, '#ff6a5a', 1, '#b31e16') },
    mul(shift(KNOT.d, 2.2, 1), 'rgba(110,10,10,0.5)', KNOT.d),
    ink(KNOT, { w: 1.9, thin: 0.6, taper: 2 }, 166),
    ...[SLEEVE_L, SLEEVE_R].flatMap((sl, i) => [
      { d: sl.d, fill: lin(0, 136, 0, 156, 0, '#ffffff', 1, '#d9deea') },
      mul(shift(sl.d, i ? 2.5 : 3, 2.2), 'rgba(150,155,195,0.6)', sl.d),
      { d: hatch(i ? [176, 150, 180, 148.5, 183, 146] : [30, 152, 35, 154, 41, 154.4], 4, 3, i ? 250 : 260, 0.6, 167 + i), fill: 'rgba(60,60,100,0.6)', clip: sl.d },
      line(i ? [170, 142, 174, 145, 176, 149.5] : [40, 141.5, 36, 145.5, 35, 150.5], 0.9, 169 + i, 0.3, 0.4),
      ink(sl, { w: 2.6, thin: 0.7, taper: 4 }, 171 + i),
    ]),
    // specular glints on the sponge body
    { d: inkLine([46, 36, 51, 30, 60, 28.5], 2.6, 181, 0.2, 0.5), fill: 'rgba(255,255,255,0.85)' },
    { d: circ(64, 30.5, 0.9), fill: 'rgba(255,255,255,0.85)' },
  ]
  return { viewW: 200, viewH: 220, paths }
}

// Underwater backdrop: surface glow, god rays, a hazy far reef, rock + coral
// + seaweed in the mid plane, bubbles, lit sand with caustics, vignette.
export function seaBackdrop(): Art {
  const paths: VectorPath[] = []
  // surface glow and rippling surface light
  paths.push({ d: rect(0, 0, 160, 46), fill: lin(0, 0, 0, 46, 0, 'rgba(200,248,255,0.55)', 1, 'rgba(200,248,255,0)'), blend: 'screen' })
  const sr0 = rng(21)
  let ripple = ''
  for (let i = 0; i < 9; i++) {
    const x = sr0() * 160
    const y = 2 + sr0() * 8
    ripple += `M${q2(x)} ${q2(y)}q4 -1.6 8 0t8 0`
  }
  paths.push({ d: ripple, stroke: 'rgba(230,252,255,0.45)', sw: 0.7, blend: 'screen' })
  // god rays from the upper-left
  const rays: [number, number, number][] = [[38, 6, 0.32], [50, 4, 0.22], [60, 8, 0.3], [72, 5, 0.2], [84, 7, 0.26], [97, 4, 0.18]]
  rays.forEach(([deg, w, a]) => {
    const A = (deg * Math.PI) / 180
    const W = (w * Math.PI) / 180
    const ox = 20
    const oy = -40
    paths.push({
      d: poly([ox, oy, ox + 200 * Math.cos(A - W / 2), oy + 200 * Math.sin(A - W / 2), ox + 200 * Math.cos(A + W / 2), oy + 200 * Math.sin(A + W / 2)]),
      fill: rad(ox, oy, 175, 0, `rgba(225,250,255,${a})`, 0.45, `rgba(225,250,255,${a * 0.6})`, 1, 'rgba(225,250,255,0)'),
      blend: 'screen',
    })
  })
  // faint flower-shaped "sky" spots
  const spots: [number, number, number, string][] = [[14, 14, 7, '#bfefff'], [132, 10, 6, '#c8ffe4'], [150, 46, 4.5, '#bfefff'], [104, 30, 4, '#e0d4ff'], [30, 44, 3.6, '#c8ffe4']]
  spots.forEach(([x, y, r, c]) => {
    let d = ''
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      d += circ(x + r * 0.6 * Math.cos(a), y + r * 0.6 * Math.sin(a), r * 0.55)
    }
    paths.push({ d, fill: c, alpha: 0.38 }, { d: circ(x, y, r * 0.32), fill: '#ffffff', alpha: 0.45 })
  })
  // far reef silhouette, swallowed by haze
  const fr = rng(13)
  const reef: number[] = []
  for (let x = -6; x <= 168; x += 8) reef.push(x, 70 - fr() * 9 - (x > 50 && x < 80 ? 6 : 0))
  paths.push({ d: smooth(reef, false) + 'L168 101L-6 101Z', fill: '#2a86bf' })
  paths.push({ d: rect(0, 52, 160, 49), fill: lin(0, 52, 0, 101, 0, 'rgba(60,160,215,0)', 1, 'rgba(60,160,215,0.35)') })
  // far seaweed (dim)
  const strand = (x: number, h: number, sway: number, base = 101) => {
    const pts: number[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      pts.push(x + Math.sin(t * 5 + x) * sway - 2 * (1 - t), base - h * t)
    }
    for (let i = 12; i >= 0; i--) {
      const t = i / 12
      pts.push(x + Math.sin(t * 5 + x) * sway + 2 * (1 - t) + 0.6, base - h * t)
    }
    return poly(pts)
  }
  paths.push({ d: [58, 66, 96, 104, 118].map((x, i) => strand(x, 26 + (i % 3) * 8, 2.2, 92)).join(''), fill: 'rgba(14,90,120,0.55)' })
  // mid-plane boulders (left): key light from the upper-left, cyan rim, moss
  const boulder = (pts: number[], kx: number, ky: number, r: number) => {
    const B = smooth(pts)
    paths.push({ d: B, fill: radLit(kx, ky, r, 0, '#8fb9c4', 0.5, '#4f7d8c', 1, '#244656') })
    paths.push(inside(B, rad(kx - r * 0.3, ky - r * 0.35, r * 1.4, 0, T, 0.5, T, 1, '#4a5a8a')))
    paths.push(rimLight(B, lin(kx - r, ky - r, kx + r, ky + r, 0, T, 0.62, T, 1, 'rgba(140,238,255,0.85)'), 0.9))
    paths.push({ d: B, stroke: 'rgba(8,30,50,0.75)', sw: 0.7 })
    paths.push({ d: ell(kx - r * 0.35, ky - r * 0.42, r * 0.3, r * 0.12), fill: 'rgba(220,250,255,0.45)', clip: B, blend: 'screen' })
  }
  boulder([30, 92, 28, 80, 34, 72, 44, 70, 52, 76, 54, 88, 50, 94], 40, 78, 18)
  boulder([-8, 96, -6, 76, 4, 66, 18, 63, 30, 68, 36, 80, 34, 94, 20, 98], 16, 74, 26)
  paths.push(...softShade(26, 96, 34, 3, 0.45, '4,30,50'))
  // branching coral (right)
  const coral = 'M140 90 Q139 80 134 74 M139 82 Q144 76 146 68 M137 78 Q131 72 132 64 M145 72 Q150 68 151 61'
  paths.push({ d: coral, stroke: 'rgba(8,30,50,0.75)', sw: 4.2 })
  paths.push({ d: coral, stroke: lin(130, 60, 152, 92, 0, '#ffb3c6', 1, '#d9577d'), sw: 3 })
  paths.push({ d: shift(coral, -0.5, -0.5), stroke: 'rgba(255,235,240,0.75)', sw: 0.8 })
  // near seaweed with light across the blades
  paths.push({ d: [10, 16, 150, 156].map((x, i) => strand(x, 40 + i * 5, 3)).join(''), fill: lin(0, 101, 0, 46, 0, '#1a7a50', 1, '#4cd08a'), stroke: 'rgba(6,40,30,0.7)', sw: 0.6 })
  paths.push({ d: [10, 16, 150, 156].map((x, i) => strand(x - 0.6, 40 + i * 5, 3)).join(''), fill: lin(0, 0, 160, 0, 0, 'rgba(200,255,220,0.25)', 1, 'rgba(200,255,220,0)'), blend: 'screen' })
  // bubbles: transparent spheres with rim + specular
  const r = rng(11)
  let bub = ''
  let hl = ''
  for (let i = 0; i < 16; i++) {
    const left = i < 5
    const bx = left ? 6 + r() * 40 : 108 + r() * 48
    const by = 10 + r() * 66
    const br = 1 + r() * 2.6
    bub += circ(bx, by, br)
    hl += circ(bx - br * 0.38, by - br * 0.38, br * 0.28)
  }
  paths.push({ d: bub, fill: 'rgba(255,255,255,0.1)', stroke: 'rgba(235,252,255,0.8)', sw: 0.55 }, { d: hl, fill: 'rgba(255,255,255,0.95)' })
  // sand dune: lit crest, shaded hollow, ripples and caustics
  const SAND = 'M-2 87 Q30 80 64 85 Q100 91 130 86 Q148 83 162 85 L162 101 L-2 101 Z'
  paths.push({ d: SAND, fill: lin(0, 82, 0, 101, 0, '#fbe6a8', 1, '#d2a75c') })
  paths.push(inside(SAND, rad(30, 84, 120, 0, T, 0.45, T, 1, '#b99a78')))
  paths.push({ d: 'M-2 87 Q30 80 64 85 Q100 91 130 86 Q148 83 162 85', stroke: 'rgba(255,255,235,0.75)', sw: 0.9 })
  let rip = ''
  for (let i = 0; i < 7; i++) rip += `M${8 + i * 22} ${93 + (i % 2) * 3}q5 -1.6 10 0`
  paths.push({ d: rip, stroke: 'rgba(160,110,50,0.4)', sw: 0.6 }, { d: shift(rip, -0.4, -0.6), stroke: 'rgba(255,250,220,0.6)', sw: 0.5 })
  const cr = rng(31)
  let caus = ''
  for (let i = 0; i < 14; i++) {
    const cx = cr() * 160
    const cy = 88 + cr() * 11
    const s = 2.5 + cr() * 3
    caus += smooth([cx - s, cy, cx - s * 0.1, cy - s * 0.18, cx + s, cy - s * 0.05], false)
  }
  paths.push({ d: caus, stroke: 'rgba(255,255,230,0.22)', sw: 0.6, clip: SAND, blend: 'screen' })
  const sr = rng(5)
  let sand = ''
  for (let i = 0; i < 40; i++) sand += circ(sr() * 160, 89 + sr() * 11, 0.3 + sr() * 0.45)
  paths.push({ d: sand, fill: '#b48843', alpha: 0.6 })
  // pebbles with soft shading
  ;[[40, 95, 2.4], [108, 97, 1.8], [134, 93, 1.4]].forEach(([x, y, s]) => {
    paths.push(...softShade(x + 0.8, y + s * 0.6, s * 1.2, s * 0.35, 0.35))
    paths.push({ d: ell(x, y, s, s * 0.62), fill: radLit(x, y, s, 0, '#ffffff', 0.5, '#e8d4b8', 1, '#a38a6a') })
  })
  // vignette
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(80, 46, 104, 0, T, 0.6, T, 1, 'rgba(0,30,70,0.55)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Pink frosted donut on a cloud ----------------------------------------
// Key light: the sun, upper-left. Sky-blue rim on the lower-right.

// Cartoon cloud with volume: one ink contour, lit top-left, blue core shadow,
// soft rim on the lower-right.
function puffCloud(cx: number, cy: number, s: number, ink = true): VectorPath[] {
  const U = union([
    circ(cx - 15 * s, cy + 3 * s, 10 * s),
    circ(cx - 2 * s, cy - 6 * s, 13.5 * s),
    circ(cx + 13 * s, cy - 1 * s, 10 * s),
    circ(cx + 23 * s, cy + 6 * s, 6.5 * s),
    ell(cx + 1 * s, cy + 8 * s, 27 * s, 6.5 * s),
  ])
  const out: VectorPath[] = []
  if (ink) out.push({ d: U, stroke: INK, sw: 4.6 * s })
  out.push(
    { d: U, fill: '#ffffff' },
    inside(U, rad(cx - 12 * s, cy - 14 * s, 44 * s, 0, T, 0.45, T, 0.8, '#c9dcf6', 1, '#a9c2ea')),
    inside(U, lin(0, cy + 2 * s, 0, cy + 15 * s, 0, T, 1, '#b4cbee'), 'multiply', 0.8),
    inside(U, lin(cx - 20 * s, cy - 15 * s, cx + 26 * s, cy + 15 * s, 0, T, 0.78, T, 1, 'rgba(255,246,220,0.55)'), 'screen'),
    { d: arcAlong(cx - 15 * s, cy + 3 * s, 10 * s, 10 * s, -50, 30, 10) + arcAlong(cx + 13 * s, cy - 1 * s, 10 * s, 10 * s, 150, 215, 10), stroke: 'rgba(150,180,225,0.6)', sw: 1.5 * s },
  )
  return out
}

export function sunnySky(): Art {
  const paths: VectorPath[] = []
  // sun in the top-left corner: hot core, bloom, rays fanning down-right
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(12, 4, 90, 0, 'rgba(255,250,215,0.95)', 0.12, 'rgba(255,240,180,0.6)', 0.4, 'rgba(255,230,170,0.18)', 1, 'rgba(255,230,170,0)'), blend: 'screen' })
  const rays: [number, number][] = [[12, 18], [26, 31], [40, 46], [55, 59], [68, 73]]
  rays.forEach(([a, b]) => {
    const A = (a * Math.PI) / 180
    const B = (b * Math.PI) / 180
    paths.push({ d: poly([12, 4, 12 + 200 * Math.cos(A), 4 + 200 * Math.sin(A), 12 + 200 * Math.cos(B), 4 + 200 * Math.sin(B)]), fill: rad(12, 4, 170, 0, 'rgba(255,252,230,0.32)', 1, 'rgba(255,252,230,0)'), blend: 'screen' })
  })
  paths.push({ d: circ(12, 4, 9), fill: rad(12, 4, 9, 0, '#ffffff', 0.6, 'rgba(255,250,220,0.9)', 1, 'rgba(255,240,190,0)') })
  // far clouds: no ink, hazy
  paths.push(...puffCloud(118, 22, 0.32, false).map((p) => ({ ...p, alpha: 0.55 })))
  paths.push(...puffCloud(40, 46, 0.24, false).map((p) => ({ ...p, alpha: 0.45 })))
  // cloud banks: far (hazy, bluish) then near (bright, shaded)
  const bank = (seed: number, y: number, rmin: number, rmax: number) => {
    const r = rng(seed)
    const parts: string[] = []
    for (let x = -6; x < 170; x += 9 + r() * 5) parts.push(circ(x, y - r() * 4, rmin + r() * (rmax - rmin)))
    parts.push(ell(80, y + 14, 130, 16))
    return union(parts)
  }
  const FAR = bank(3, 90, 7, 12)
  paths.push({ d: FAR, fill: '#cfe9fd' }, inside(FAR, lin(0, 80, 0, 101, 0, T, 1, '#a9cdf0')))
  const NEAR = bank(8, 98, 6, 10)
  paths.push({ d: NEAR, fill: '#ffffff' }, inside(NEAR, lin(0, 88, 0, 101, 0, T, 0.4, T, 1, '#b9d6f4')))
  paths.push(inside(NEAR, lin(0, 86, 0, 93, 0, 'rgba(255,250,230,0.6)', 1, T), 'screen'))
  // drifting sprinkles: big + sharp near, small + faded far
  const pal = ['#fff06a', '#52c8ff', '#ff8fc0', '#7ee787', '#b693ff', '#ff8a4c']
  const sr = rng(41)
  for (let i = 0; i < 16; i++) {
    const x = 6 + sr() * 150
    const y = 8 + sr() * 70
    if (x > 52 && x < 120 && y > 14) continue
    const near = sr() > 0.6
    const L = near ? 2.2 : 1.3
    const t = sr() * Math.PI
    const d = `M${q2(x - L * Math.cos(t))} ${q2(y - L * Math.sin(t))}L${q2(x + L * Math.cos(t))} ${q2(y + L * Math.sin(t))}`
    const c = pal[i % pal.length]
    if (near) paths.push({ d, stroke: INK, sw: 2.3 }, { d, stroke: c, sw: 1.3 }, { d: shift(d, -0.25, -0.3), stroke: 'rgba(255,255,255,0.7)', sw: 0.4 })
    else paths.push({ d, stroke: c, sw: 1, alpha: 0.55 })
  }
  return { viewW: 160, viewH: 101, paths }
}

export function donut(haze = 0): Art {
  const CX = 100
  const CY = 84
  // frosting outline: wavy outer edge with drips, inner hole wound the other way
  const drips: [number, number, number][] = [[0.38, 10, 0.12], [0.92, 20, 0.13], [1.46, 13, 0.15], [2.02, 23, 0.12], [2.6, 11, 0.14]]
  const frost = (ox: number, oy: number) => {
    const pts: number[] = []
    const N = 280
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const w = 1 + 0.03 * Math.sin(a * 7 + 0.6) + 0.018 * Math.sin(a * 12 + 1.3)
      let dy = 0
      for (const [a0, h, wd] of drips) {
        const u = (a - a0) / wd
        if (Math.abs(u) < 1) dy += h * Math.pow(1 - u * u, 0.7)
      }
      pts.push(CX + ox + 73 * w * Math.cos(a), CY + oy + 46 * w * Math.sin(a) + dy)
    }
    const hole: number[] = []
    for (let i = 90; i > 0; i--) {
      const a = (i / 90) * Math.PI * 2
      const w = 1 + 0.05 * Math.sin(a * 6 + 0.3)
      hole.push(CX + ox + 31 * w * Math.cos(a), CY - 3 + oy + 18 * w * Math.sin(a))
    }
    return poly(pts) + poly(hole)
  }
  const FROST = frost(0, 0)
  const DOUGH = 'M18 86 A82 54 0 0 1 182 86 L182 110 A82 54 0 0 1 18 110 Z'
  const SIDE = 'M18 86 A82 54 0 0 0 182 86 L182 110 A82 54 0 0 1 18 110 Z'
  const HOLE = ell(100, 80, 22, 12.5)

  // sprinkles, spread over the frosting ring without touching each other
  const pal = ['#fff06a', '#52c8ff', '#ffffff', '#7ee787', '#b693ff', '#ff8a4c']
  const rr = rng(7)
  const placed: [number, number][] = []
  let inkD = ''
  const byC = new Map<string, string>()
  for (let guard = 0; placed.length < 32 && guard < 3000; guard++) {
    const a = rr() * Math.PI * 2
    const rho = 0.6 + rr() * 0.3
    const x = CX + 73 * rho * Math.cos(a)
    const y = CY - 1 + 46 * rho * Math.sin(a)
    if (placed.some(([px, py]) => Math.hypot(px - x, (py - y) * 1.45) < 12)) continue
    placed.push([x, y])
    const t = rr() * Math.PI
    const L = 4.3
    const d = `M${q2(x - L * Math.cos(t))} ${q2(y - L * 0.62 * Math.sin(t))}L${q2(x + L * Math.cos(t))} ${q2(y + L * 0.62 * Math.sin(t))}`
    inkD += d
    const c = pal[placed.length % pal.length]
    byC.set(c, (byC.get(c) ?? '') + d)
  }
  const tips = drips.map(([a0, h]) => circ(CX + 73 * Math.cos(a0) - 1.8, CY + 46 * Math.sin(a0) + h - 4.5, 1.6)).join('')

  const BACK = union([circ(26, 166, 20), circ(52, 150, 26), circ(100, 140, 32), circ(150, 148, 27), circ(176, 164, 20), ell(100, 176, 94, 17)])
  const FRONT = union([circ(34, 182, 15), circ(62, 184, 17), circ(98, 186, 19), circ(136, 184, 17), circ(166, 181, 15), ell(100, 190, 82, 8)])
  const cloudShade = (U: string, y0: number, y1: number): VectorPath[] => [
    { d: U, fill: '#ffffff' },
    inside(U, lin(0, y0, 0, y1, 0, T, 0.35, T, 1, '#a4bfe8')),
    inside(U, lin(10, 0, 190, 0, 0, T, 0.6, T, 1, '#c3d4f0')),
    inside(U, lin(40, y0, 190, y1, 0, T, 0.8, T, 1, 'rgba(255,246,220,0.5)'), 'screen'),
  ]
  const paths: VectorPath[] = [
    // cloud cushion
    { d: BACK, stroke: INK, sw: 9 },
    ...cloudShade(BACK, 118, 194),
    // donut shadow on the cloud: offset to the lower-right, contact darker
    ...shadowOn(BACK, 112, 164, 84, 14, 0.5, '40,70,140'),
    ...shadowOn(BACK, 104, 160, 70, 7, 0.4, '30,50,110'),
    // dough: golden top, toasted side, pale equator band
    { d: DOUGH, fill: lin(0, 32, 0, 164, 0, '#ffd590', 0.5, '#eaa257', 1, '#b4652a') },
    { d: SIDE, fill: lin(0, 120, 0, 164, 0, T, 1, 'rgba(90,30,0,0.3)'), blend: 'multiply' },
    { d: arcAlong(100, 99, 82, 54, 8, 172, 40), stroke: 'rgba(255,230,175,0.7)', sw: 5, clip: DOUGH },
    inside(DOUGH, rad(64, 62, 150, 0, T, 0.5, T, 0.82, '#d68a52', 1, '#a95a30')),
    inside(DOUGH, rad(56, 58, 60, 0, 'rgba(255,240,200,0.6)', 1, 'rgba(255,240,200,0)'), 'screen'),
    rimLight(DOUGH, lin(40, 40, 180, 160, 0, T, 0.68, T, 1, 'rgba(165,220,255,0.95)'), 3),
    { d: DOUGH, stroke: INK, sw: 4.5 },
    // frosting: cast shadow, fill, core shadow, specular, rim, ink
    { d: frost(2.5, 4.5), fill: 'rgba(100,35,10,0.45)', clip: DOUGH, blend: 'multiply' },
    { d: FROST, fill: radLit(90, 72, 96, 0, '#ffd3e6', 0.45, '#f985bb', 1, '#d64a8c') },
    inside(FROST, rad(74, 60, 120, 0, T, 0.5, T, 0.85, '#d9579a', 1, '#b23a78')),
    { d: ell(66, 64, 26, 11), fill: rad(66, 64, 26, 0, 'rgba(255,255,255,0.7)', 1, 'rgba(255,255,255,0)'), clip: FROST, blend: 'screen' },
    rimLight(FROST, lin(50, 40, 175, 150, 0, T, 0.7, T, 1, 'rgba(190,230,255,0.9)'), 2.4),
    // the hole: deep, occluded
    { d: HOLE, fill: lin(0, 67, 0, 93, 0, '#2e1404', 0.5, '#6e3814', 1, '#c98843') },
    inside(HOLE, rad(100, 76, 22, 0, T, 0.5, T, 1, 'rgba(40,10,0,0.6)')),
    { d: FROST, stroke: INK, sw: 4 },
    { d: HOLE, stroke: INK, sw: 3.5 },
    // sprinkles: little shadow, ink, colour, tube highlight
    { d: shift(inkD, 1.1, 1.6), stroke: 'rgba(120,20,60,0.4)', sw: 4.2, clip: FROST, blend: 'multiply' },
    { d: inkD, stroke: INK, sw: 5.6 },
    ...[...byC.entries()].map(([c, d]) => ({ d, stroke: c, sw: 3.1 })),
    { d: shift(inkD, -0.55, -0.7), stroke: 'rgba(255,255,255,0.65)', sw: 1 },
    // speculars
    gloss(arcAlong(100, 84, 62, 37, 196, 246, 16), 5, 0.9),
    gloss(arcAlong(100, 81, 37, 22.5, 112, 150, 8), 2.6, 0.55),
    { d: tips + circ(37, 88, 2.2), fill: 'rgba(255,255,255,0.85)' },
    // front puffs tuck the donut into the cloud
    { d: FRONT, stroke: INK, sw: 8 },
    ...cloudShade(FRONT, 166, 199),
    { d: arcAlong(62, 184, 17, 17, 200, 250, 8) + arcAlong(98, 186, 19, 19, 200, 250, 8) + arcAlong(136, 184, 17, 17, 200, 250, 8), stroke: 'rgba(255,255,255,0.95)', sw: 2.4 },
    // twinkles
    { d: sparkle(24, 30, 9) + sparkle(192, 98, 5), fill: '#ffffff', stroke: INK, sw: 2.2 },
  ]
  if (haze > 0) paths.push({ d: BIG, fill: `rgba(178,218,250,${haze})`, blend: 'source-atop' })
  return { viewW: 200, viewH: 200, paths }
}

export function skyClouds(spots: [number, number, number][] = [[150, 12, 0.38], [88, 8, 0.3], [148, 90, 0.32]]): Art {
  return { viewW: 160, viewH: 101, paths: spots.flatMap(([x, y, s]) => puffCloud(x, y, s)) }
}

// ---- Green swirling portal + lab flask --------------------------------------
// Key light: the portal itself (emissive green, centre of the card); a cool
// ambient from the upper-left. Objects get green light on the side facing it.
export function alienWorld(): Art {
  const paths: VectorPath[] = []
  // nebula haze
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(96, 34, 80, 0, 'rgba(130,70,220,0.36)', 0.5, 'rgba(90,50,180,0.12)', 1, 'rgba(60,40,140,0)'), blend: 'screen' })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(150, 10, 50, 0, 'rgba(50,190,210,0.2)', 1, 'rgba(50,190,210,0)'), blend: 'screen' })
  // ringed planet, top-left, lit from the upper-left
  const P = circ(22, 20, 10)
  paths.push({ d: ell(22, 20, 19, 4.6), stroke: 'rgba(255,214,170,0.45)', sw: 1.4 })
  paths.push({ d: P, fill: radLit(22, 20, 10, 0, '#ffe2c0', 0.5, '#e08a6a', 1, '#7a3a5a') })
  paths.push({ d: 'M12 17 Q22 14 32 17 M12.5 23 Q22 21 31.5 24', stroke: 'rgba(120,50,70,0.35)', sw: 1.2, clip: P })
  paths.push(inside(P, rad(17, 14, 17, 0, T, 0.55, T, 1, '#3a2060')))
  paths.push(rimLight(P, lin(14, 12, 30, 28, 0, T, 0.7, T, 1, 'rgba(150,240,255,0.8)'), 1))
  paths.push({ d: arcAlong(22, 20, 19, 4.6, 0, 180, 16), stroke: 'rgba(255,220,180,0.85)', sw: 1.4 })
  // ridges: far (dim, hazy) then mid
  const ridge = (seed: number, base: number, amp: number, step: number) => {
    const r = rng(seed)
    const pts: number[] = []
    for (let x = -10; x <= 172; x += step) pts.push(x, base - r() * amp)
    return smooth(pts, false) + `L172 101L-10 101Z`
  }
  const R1 = ridge(4, 76, 12, 14)
  paths.push({ d: R1, fill: '#30286a' })
  paths.push({ d: rect(0, 60, 160, 41), fill: lin(0, 60, 0, 90, 0, 'rgba(120,100,220,0)', 1, 'rgba(120,100,220,0.25)'), blend: 'screen' })
  const R2 = ridge(9, 84, 8, 18)
  paths.push({ d: R2, fill: '#221a4c' })
  paths.push(inside(R2, rad(80, 84, 60, 0, 'rgba(150,255,90,0.35)', 1, 'rgba(150,255,90,0)'), 'screen'))
  // near ground, lit by the portal
  const GROUND = 'M-2 87 Q40 82 80 86 Q118 90 162 84 L162 101 L-2 101 Z'
  paths.push({ d: GROUND, fill: lin(0, 82, 0, 101, 0, '#3d2f73', 1, '#130d2a') })
  paths.push(inside(GROUND, rad(80, 87, 70, 0, 'rgba(170,255,100,0.55)', 0.4, 'rgba(140,240,90,0.18)', 1, 'rgba(140,240,90,0)'), 'screen'))
  paths.push(...glowPool(80, 88.5, 38, 6, 0.75, '200,255,130', 30, 'screen'))
  paths.push({ d: 'M-2 87 Q40 82 80 86 Q118 90 162 84', stroke: lin(0, 0, 160, 0, 0, 'rgba(190,170,255,0.3)', 0.5, 'rgba(210,255,150,0.75)', 1, 'rgba(190,170,255,0.3)'), sw: 0.7 })
  // craters: rim lit on the side facing the portal
  const crater = (x: number, y: number, rx: number) => {
    const C = ell(x, y, rx, rx * 0.28)
    return [
      { d: C, fill: 'rgba(10,6,30,0.6)' },
      inside(C, lin(x - rx, 0, x + rx, 0, 0, x < 80 ? T : 'rgba(170,255,120,0.35)', 0.5, T, 1, x < 80 ? 'rgba(170,255,120,0.35)' : T), 'screen'),
      { d: arcAlong(x, y, rx, rx * 0.28, 20, 160, 10), stroke: 'rgba(200,180,255,0.25)', sw: 0.5 },
    ]
  }
  paths.push(...crater(18, 95, 7), ...crater(52, 98, 4), ...crater(140, 94, 5), ...crater(116, 98.5, 3.4))
  paths.push({ d: ell(96, 93, 2.4, 1.3) + ell(130, 97, 1.8, 1) + ell(30, 90, 1.6, 0.9), fill: '#4b3d86' })
  // vignette
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(80, 50, 100, 0, T, 0.6, T, 1, 'rgba(0,0,20,0.6)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}

// Faceted crystals; the portal is to their right, so right facets glow green.
export function crystals(): Art {
  const paths: VectorPath[] = [...softShade(46, 104, 52, 6, 0.6, '0,0,10'), ...softShade(24, 104, 40, 4, 0.4, '0,0,10')]
  const xs: [number, number, number, number, number][] = [
    // base x, base y, height, half width, tilt
    [22, 104, 46, 7, -0.28], [72, 104, 40, 6.5, 0.32], [40, 104, 78, 10, -0.06], [58, 104, 58, 8.5, 0.16], [86, 104, 24, 5, 0.5],
  ]
  xs.forEach(([bx, by, h, w, t]) => {
    const ux = Math.sin(t)
    const uy = -Math.cos(t)
    const px = Math.cos(t)
    const py = Math.sin(t)
    const at = (u: number, v: number): [number, number] => [bx + ux * u + px * v, by + uy * u + py * v]
    const bl = at(0, -w)
    const br = at(0, w)
    const sl = at(h * 0.78, -w)
    const sr = at(h * 0.78, w)
    const tip = at(h, w * 0.15)
    const ridgeB = at(0, w * 0.25)
    const ridgeS = at(h * 0.8, w * 0.3)
    const L = poly([...bl, ...sl, ...tip, ...ridgeS, ...ridgeB])
    const R = poly([...ridgeB, ...ridgeS, ...tip, ...sr, ...br])
    const ALL = poly([...bl, ...sl, ...tip, ...sr, ...br])
    paths.push(
      { d: L, fill: lin(bl[0], bl[1], tip[0], tip[1], 0, '#1f1650', 1, '#4a3a9a') },
      { d: R, fill: lin(br[0], br[1], tip[0], tip[1], 0, '#2f9a66', 0.6, '#8af0b0', 1, '#e4ffd0') },
      inside(ALL, lin(0, by - h * 0.3, 0, by, 0, T, 1, 'rgba(20,10,50,0.65)')),
      { d: poly([...ridgeB, ...ridgeS], false), stroke: 'rgba(230,255,220,0.7)', sw: 1 },
      { d: poly([...sl, ...ridgeS, ...sr], false), stroke: 'rgba(200,180,255,0.35)', sw: 0.8 },
      rimLight(ALL, lin(bl[0], 0, br[0], 0, 0, T, 0.65, T, 1, 'rgba(190,255,140,0.9)'), 1.6),
      { d: ALL, stroke: INK, sw: 2.4 },
    )
  })
  paths.push({ d: sparkle(64, 34, 3.5) + sparkle(30, 58, 2.6), fill: '#f0ffd8' })
  return { viewW: 100, viewH: 110, paths }
}

export function portal(): Art {
  const CX = 100
  const CY = 106
  const ring = (rx: number, ry: number, amp: number, freq: number, ph: number) => {
    const pts: number[] = []
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2
      const k = 1 + amp * Math.sin(a * freq + ph) + amp * 0.5 * Math.sin(a * (freq * 2 + 1) + ph * 1.3)
      pts.push(CX + rx * k * Math.cos(a), CY + ry * k * Math.sin(a))
    }
    return poly(pts)
  }
  // tapered spiral arm; its centre drifts down-right so the vortex reads as a tunnel
  const arm = (phase: number, turns: number, wmax: number) => {
    const out: number[] = []
    const back: number[] = []
    const S = 56
    for (let i = 0; i <= S; i++) {
      const t = i / S
      const r = 0.05 + 0.9 * t
      const th = phase + t * turns * Math.PI * 2
      const w = wmax * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.85)
      const ox = CX + 7 * (1 - r)
      const oy = CY + 9 * (1 - r)
      out.push(ox + r * 64 * Math.cos(th), oy + r * 78 * Math.sin(th))
      back.push(ox + r * 64 * Math.cos(th - w), oy + r * 78 * Math.sin(th - w))
    }
    for (let i = back.length - 2; i >= 0; i -= 2) out.push(back[i], back[i + 1])
    return poly(out)
  }
  const RIM = ring(84, 98, 0.035, 9, 0.4)
  const DISC = ring(67, 81, 0.03, 11, 1.2)
  let darkArms = ''
  let lightArms = ''
  for (let k = 0; k < 3; k++) {
    darkArms += arm((k * 2 * Math.PI) / 3 + 0.9, 1.05, 0.62)
    lightArms += arm((k * 2 * Math.PI) / 3, 1.05, 0.5)
  }
  const drip = (x: number, len: number) => {
    const D = `M${x - 6} 196 Q${x - 5} ${204 + len * 0.5} ${x - 3.5} ${200 + len} Q${x} ${206 + len} ${x + 3.5} ${200 + len} Q${x + 5} ${204 + len * 0.5} ${x + 6} 196 Z`
    return [
      { d: D, fill: lin(0, 196, 0, 206 + len, 0, '#4fd23a', 1, '#2a9e35'), stroke: INK, sw: 2.4 },
      { d: ell(x - 1.6, 198 + len, 1.3, 2), fill: 'rgba(255,255,255,0.85)' },
    ] as VectorPath[]
  }
  const paths: VectorPath[] = [
    // emitted light, additive
    { d: ell(CX, CY, 108, 118), fill: rad(CX, CY, 106, 0, 'rgba(160,255,80,0.5)', 0.6, 'rgba(160,255,80,0.28)', 1, 'rgba(160,255,80,0)'), blend: 'lighter' },
    ...drip(76, 10),
    ...drip(126, 6),
    // gooey torus rim: form shading, outer occlusion, inner edge lit by the vortex
    { d: RIM, fill: radLit(CX - 8, CY - 16, 122, 0, '#c4ff78', 0.5, '#4fd23a', 1, '#12722b') },
    inside(RIM, rad(CX - 26, CY - 34, 150, 0, T, 0.55, T, 0.85, '#3a8a5a', 1, '#1d4a3a')),
    { d: DISC, stroke: 'rgba(210,255,140,0.9)', sw: 12, clip: RIM, blend: 'screen' },
    rimLight(RIM, lin(40, 30, 185, 205, 0, T, 0.72, T, 1, 'rgba(120,255,230,0.75)'), 3),
    { d: ell(CX - 48, CY - 56, 22, 12), fill: rad(CX - 48, CY - 56, 22, 0, 'rgba(255,255,240,0.85)', 1, 'rgba(255,255,240,0)'), clip: RIM, blend: 'screen' },
    { d: RIM, stroke: INK, sw: 4.5 },
    // vortex: tunnel rings, arms, white-hot core
    { d: DISC, fill: rad(CX + 7, CY + 9, 86, 0, '#fbffe2', 0.16, '#e6ff8e', 0.5, '#74de3e', 0.82, '#2a9e35', 1, '#0f5a22') },
    { d: ell(CX + 3, CY + 4, 52, 64) + ell(CX + 5, CY + 6, 36, 45), stroke: 'rgba(10,70,25,0.3)', sw: 2, clip: DISC },
    { d: darkArms, fill: 'rgba(16,100,36,0.45)', clip: DISC, blend: 'multiply' },
    { d: lightArms, fill: 'rgba(240,255,190,0.7)', clip: DISC, blend: 'screen' },
    inside(DISC, rad(CX + 7, CY + 9, 82, 0, T, 0.7, T, 1, 'rgba(0,40,10,0.7)')),
    { d: circ(CX + 7, CY + 9, 26), fill: rad(CX + 7, CY + 9, 26, 0, '#ffffff', 0.35, 'rgba(255,255,225,0.85)', 1, 'rgba(255,255,225,0)'), blend: 'lighter' },
    { d: DISC, stroke: 'rgba(8,50,18,0.85)', sw: 2.6 },
    // sharp gloss on the rim
    gloss(arcAlong(CX, CY, 77, 91, 198, 246, 16), 4, 0.9),
    gloss(arcAlong(CX, CY, 77, 91, 256, 266, 4), 2.6, 0.7),
    // floating goo spheres + sparks
    ...sphere(14, 126, 6.5, '#efffb0', '#7fe04a', '#1f7a2c', 'rgba(220,255,160,0.9)', 2.2, [1, -0.4]),
    ...sphere(188, 140, 7, '#efffb0', '#7fe04a', '#1f7a2c', 'rgba(220,255,160,0.9)', 2.2, [-1, -0.4]),
    ...sphere(30, 196, 4.5, '#efffb0', '#7fe04a', '#1f7a2c', 'rgba(220,255,160,0.9)', 2, [1, -0.6]),
    ...sphere(180, 34, 4.5, '#efffb0', '#7fe04a', '#1f7a2c', 'rgba(220,255,160,0.9)', 2, [-1, 0.6]),
    { d: sparkle(20, 52, 7) + sparkle(188, 86, 5.5) + sparkle(160, 208, 4.5), fill: '#efffbf', stroke: INK, sw: 1.8 },
  ]
  return { viewW: 200, viewH: 220, paths }
}

// Glass flask, lit by the portal on its left.
export function flask(): Art {
  const GLASS = 'M31 16 H49 V44 Q49 47 51 50 L71 96 Q76 110 62 110 H18 Q4 110 9 96 L29 50 Q31 47 31 44 Z'
  const LIQ = 'M21.5 70 Q40 66.5 58.5 70 L68 95.5 Q71.5 106.5 61 106.5 H19 Q8.5 106.5 12 95.5 Z'
  return {
    viewW: 80,
    viewH: 120,
    paths: [
      // cast shadow away from the portal + contact occlusion + green spill
      ...softShade(58, 112, 38, 5, 0.55, '0,0,10'),
      ...softShade(40, 110.5, 32, 3, 0.5, '0,0,10'),
      ...glowPool(36, 110, 34, 6, 0.5, '170,255,90', 30, 'screen'),
      { d: GLASS, fill: lin(8, 0, 72, 0, 0, 'rgba(200,255,200,0.5)', 0.5, 'rgba(170,200,255,0.22)', 1, 'rgba(60,70,140,0.55)') },
      { d: LIQ, fill: lin(0, 66, 0, 107, 0, '#d8ff7a', 0.6, '#5fd23e', 1, '#23902f') },
      inside(LIQ, lin(10, 0, 70, 0, 0, T, 0.55, T, 1, 'rgba(10,60,40,0.6)')),
      { d: LIQ, fill: rad(34, 92, 24, 0, 'rgba(240,255,190,0.65)', 1, 'rgba(240,255,190,0)'), clip: LIQ, blend: 'screen' },
      { d: ell(40, 70, 18.5, 3.2), fill: '#e8ffae', stroke: 'rgba(30,110,40,0.6)', sw: 1.2 },
      { d: circ(30, 92, 3.6) + circ(44, 84, 2.6) + circ(52, 97, 2.2) + circ(38, 100, 1.6), fill: 'rgba(255,255,255,0.25)', stroke: 'rgba(255,255,255,0.9)', sw: 1.2 },
      { d: 'M58 80 h-6 M61.5 88 h-6 M65 96 h-6', stroke: 'rgba(27,23,18,0.45)', sw: 1.6 },
      rimLight(GLASS, lin(6, 0, 74, 0, 0, 'rgba(200,255,140,0.95)', 0.25, T), 3),
      { d: GLASS, stroke: INK, sw: 4 },
      { d: rrect(27, 12, 26, 7, 3), fill: lin(27, 0, 53, 0, 0, '#e8ffe0', 1, '#8aa2c8'), stroke: INK, sw: 3 },
      { d: rrect(30.5, 1.5, 19, 12, 3), fill: lin(30, 0, 50, 0, 0, '#e2c07c', 1, '#7a4a27'), stroke: INK, sw: 3 },
      { d: circ(36, 6, 0.9) + circ(43, 9, 0.9) + circ(45, 5, 0.7), fill: 'rgba(80,40,10,0.5)' },
      gloss('M25.5 58 L15 90', 3.2, 0.9),
      gloss('M36 22 V38', 2.6, 0.8),
      { d: ell(20, 99, 1.4, 3), fill: 'rgba(255,255,255,0.7)' },
    ],
  }
}

export function starfield(seed: number, count = 70): Art {
  const r = rng(seed)
  let dim = ''
  let mid = ''
  const paths: VectorPath[] = []
  const bright: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const x = r() * 160
    const y = r() * 101
    const k = r()
    if (k < 0.6) dim += circ(x, y, 0.2 + r() * 0.22)
    else if (k < 0.93) mid += circ(x, y, 0.38 + r() * 0.3)
    else bright.push([x, y])
  }
  paths.push({ d: dim, fill: 'rgba(196,212,255,0.55)' }, { d: mid, fill: 'rgba(255,255,255,0.9)' })
  bright.forEach(([x, y]) => {
    paths.push({ d: circ(x, y, 3), fill: rad(x, y, 3, 0, 'rgba(200,220,255,0.55)', 1, 'rgba(200,220,255,0)') }, { d: circ(x, y, 0.8), fill: '#ffffff' })
  })
  // a few twinkles, kept to the right so titles stay clean
  for (let i = 0; i < 3; i++) {
    const x = 78 + r() * 78
    const y = 6 + r() * 88
    const s = 1.8 + r() * 1.4
    paths.push({ d: circ(x, y, s * 1.8), fill: rad(x, y, s * 1.8, 0, 'rgba(210,230,255,0.45)', 1, 'rgba(210,230,255,0)') }, { d: sparkle(x, y, s, 0.12), fill: '#ffffff' })
  }
  return { viewW: 160, viewH: 101, paths }
}

// ---- Lazy orange cat + lasagna ---------------------------------------------
// Key light: morning sun through the window, upper-left. Cool blue rim from
// the wall on the right, warm bounce from the tablecloth below.
export function kitchenWall(): Art {
  const paths: VectorPath[] = []
  // wallpaper: soft stripes with tiny diamonds
  let st = ''
  for (let x = 3; x < 160; x += 12) st += rect(x, 0, 5, 101)
  paths.push({ d: st, fill: 'rgba(255,255,255,0.1)' })
  let dd = ''
  for (let y = 6; y < 74; y += 12) for (let x = 11.5; x < 160; x += 12) dd += poly([x, y - 1.2, x + 1, y, x, y + 1.2, x - 1, y])
  paths.push({ d: dd, fill: 'rgba(255,255,255,0.22)' })
  // light falling off away from the window
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(26, 26, 140, 0, 'rgba(255,248,225,0.45)', 0.35, 'rgba(255,248,225,0.12)', 1, 'rgba(255,248,225,0)'), blend: 'screen' })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(40, 30, 150, 0, T, 0.55, T, 1, 'rgba(20,60,90,0.6)'), blend: 'multiply' })
  // window (upper-left): deep reveal, bright sky, mullions, sill, curtains
  const WIN = rrect(8, 6, 38, 44, 3)
  const SKY = rrect(12, 10, 30, 36, 1.5)
  paths.push({ d: shift(WIN, 1.6, 2), fill: 'rgba(10,40,60,0.3)' })
  paths.push({ d: WIN, fill: lin(8, 0, 46, 0, 0, '#ffffff', 1, '#dfe8ee'), stroke: INK, sw: 1.1 })
  paths.push({ d: SKY, fill: lin(0, 10, 0, 46, 0, '#fffbe6', 0.35, '#cdeeff', 1, '#8fd0f2') })
  paths.push({ d: ell(20, 18, 14, 10), fill: rad(20, 18, 14, 0, 'rgba(255,255,240,0.95)', 1, 'rgba(255,255,240,0)'), clip: SKY, blend: 'screen' })
  paths.push({ d: smooth([12, 40, 20, 35, 28, 38, 36, 34, 42, 37, 42, 46, 12, 46]), fill: 'rgba(120,190,140,0.55)', clip: SKY })
  paths.push({ d: SKY, stroke: 'rgba(27,23,18,0.55)', sw: 0.6 })
  paths.push({ d: 'M27 10 V46 M12 28 H42', stroke: '#ffffff', sw: 1.6 })
  paths.push({ d: 'M27 10 V46 M12 28 H42', stroke: 'rgba(27,23,18,0.3)', sw: 0.3 })
  paths.push({ d: rrect(5, 49, 44, 3.4, 1.2), fill: lin(0, 49, 0, 52.4, 0, '#ffffff', 1, '#c9d3dc'), stroke: INK, sw: 0.9 })
  paths.push(...softShade(28, 53.6, 22, 1.4, 0.35, '10,40,60'))
  const curtain = (x0: number, dir: number) => {
    const C = `M${x0} 3 Q${x0 + dir * 9} 3 ${x0 + dir * 10} 6 Q${x0 + dir * 6} 30 ${x0 + dir * 9} 58 L${x0} 58 Z`
    return [
      { d: C, fill: lin(x0, 0, x0 + dir * 10, 0, 0, '#ff8f7a', 1, '#d9483a') },
      inside(C, lin(x0, 0, x0 + dir * 10, 0, 0, T, 0.5, 'rgba(120,20,10,0.5)', 1, T)),
      { d: `M${x0 + dir * 3} 6 Q${x0 + dir * 3.5} 30 ${x0 + dir * 3} 56`, stroke: 'rgba(255,230,220,0.6)', sw: 0.6 },
      { d: C, stroke: INK, sw: 1 },
    ] as VectorPath[]
  }
  paths.push(...curtain(3, 1), ...curtain(51, -1))
  paths.push({ d: rrect(1, 1.5, 52, 2.4, 1.2), fill: lin(0, 1.5, 0, 3.9, 0, '#f0d9a8', 1, '#a8824a'), stroke: INK, sw: 0.7 })
  // wall clock stuck at 7 o'clock, with its shadow on the wall
  const cx = 144
  const cy = 16
  const RIMC = circ(cx, cy, 9.2)
  paths.push(...softShade(cx + 2.4, cy + 2.8, 10, 10, 0.4, '10,40,60'))
  paths.push({ d: RIMC, fill: radLit(cx, cy, 9.2, 0, '#ff9a80', 0.5, '#e04a33', 1, '#a82416') })
  paths.push(rimLight(RIMC, lin(cx - 9, cy - 9, cx + 9, cy + 9, 0, T, 0.7, T, 1, 'rgba(170,230,255,0.9)'), 0.8))
  paths.push({ d: RIMC, stroke: INK, sw: 1.1 })
  const FACE = circ(cx, cy, 7)
  paths.push({ d: FACE, fill: radLit(cx, cy, 7, 0, '#ffffff', 1, '#e6dcc4') })
  paths.push(inside(FACE, rad(cx - 3, cy - 3, 10, 0, T, 0.6, T, 1, 'rgba(100,70,40,0.5)')))
  paths.push({ d: FACE, stroke: INK, sw: 0.7 })
  let ticks = ''
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r0 = i % 3 === 0 ? 4.9 : 5.5
    ticks += `M${q2(cx + r0 * Math.cos(a))} ${q2(cy + r0 * Math.sin(a))}L${q2(cx + 6.2 * Math.cos(a))} ${q2(cy + 6.2 * Math.sin(a))}`
  }
  paths.push({ d: ticks, stroke: INK, sw: 0.5 })
  const ha = (120 * Math.PI) / 180
  const hands = `M${cx} ${cy}L${q2(cx + 3.4 * Math.cos(ha))} ${q2(cy + 3.4 * Math.sin(ha))}M${cx} ${cy}L${cx} ${cy - 5}`
  paths.push({ d: shift(hands, 0.5, 0.6), stroke: 'rgba(60,40,20,0.3)', sw: 0.8 })
  paths.push({ d: hands, stroke: INK, sw: 0.8 })
  paths.push({ d: circ(cx, cy, 0.8), fill: '#c4321f' })
  paths.push({ d: ell(cx - 3.4, cy - 3.6, 2.6, 1.3), fill: 'rgba(255,255,255,0.8)' })
  // table edge shadow on the wall
  paths.push({ d: rect(0, 66, 160, 10), fill: lin(0, 66, 0, 76, 0, T, 1, 'rgba(10,40,60,0.45)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}

// Sunbeam from the window across wall and table (drawn above the table,
// below the characters).
export function sunbeam(): Art {
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: poly([12, 10, 42, 10, 118, 101, 46, 101]), fill: lin(20, 10, 80, 101, 0, 'rgba(255,246,210,0.42)', 0.6, 'rgba(255,246,210,0.18)', 1, 'rgba(255,246,210,0)'), blend: 'screen' },
      { d: poly([36, 76, 90, 76, 108, 96, 50, 96]), fill: rad(68, 86, 36, 0, 'rgba(255,240,200,0.5)', 1, 'rgba(255,240,200,0)'), blend: 'screen' },
    ],
  }
}

// Red-and-white checked tablecloth seen in perspective (top + front drop).
export function checks(color = '#e0483a'): Art {
  const VX = 80
  const VY = -95
  const TOP = 17
  const H = 27
  const s = (y: number) => (y - VY) / -VY
  const X = (xb: number, y: number) => VX + (xb - VX) * s(y)
  const rows = [0, 3.4, 7.4, 12, TOP]
  let red = ''
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = -3; i < 19; i++) {
      if ((i + j) % 2 !== 0) continue
      const xb = i * 10
      const y0 = rows[j]
      const y1 = rows[j + 1]
      red += poly([X(xb, y0), y0, X(xb + 10, y0), y0, X(xb + 10, y1), y1, X(xb, y1), y1])
    }
  }
  const drop = [TOP, 22, H]
  for (let j = 0; j < 2; j++) {
    for (let i = -3; i < 19; i++) {
      if ((i + j + 4) % 2 !== 0) continue
      red += rect(X(i * 10, TOP), drop[j], X((i + 1) * 10, TOP) - X(i * 10, TOP), drop[j + 1] - drop[j])
    }
  }
  return {
    viewW: 160,
    viewH: H,
    paths: [
      { d: rect(-2, 0, 164, H), fill: lin(0, 0, 0, TOP, 0, '#f6efe2', 1, '#fffaf2') },
      { d: red, fill: color },
      { d: rect(-2, 0, 164, TOP), fill: lin(0, 0, 160, 0, 0, 'rgba(255,250,235,0.3)', 0.45, 'rgba(255,250,235,0)'), blend: 'screen' },
      { d: rect(-2, 0, 164, TOP), fill: lin(0, 0, 160, 0, 0, T, 0.5, T, 1, 'rgba(60,40,80,0.35)'), blend: 'multiply' },
      { d: rect(-2, 0, 164, 3), fill: lin(0, 0, 0, 3, 0, 'rgba(60,20,10,0.35)', 1, T), blend: 'multiply' },
      { d: rect(-2, TOP, 164, H - TOP), fill: lin(0, TOP, 0, H, 0, 'rgba(90,30,30,0.35)', 1, 'rgba(50,20,30,0.6)'), blend: 'multiply' },
      { d: `M-2 ${TOP}H162`, stroke: 'rgba(255,255,255,0.65)', sw: 0.6 },
      { d: 'M-2 0.2H162', stroke: 'rgba(40,15,5,0.35)', sw: 0.5 },
    ],
  }
}

export function lazyCat(): Art {
  const LT: Pt = [-0.7, -0.7] // sunbeam from the window, upper-left
  const ink = (cv: Curve, o: InkOpts = {}, seed = 7): VectorPath => ({ d: inkRing(cv, { light: LT, ...o }, seed), fill: INK })
  const line = (f: number[], w: number, seed = 3, t0 = 0.22, t1 = 0.32, col = INK): VectorPath => ({ d: inkLine(f, w, seed, t0, t1), fill: col })
  const mul = (d: string, fill: Paint, clip: string, alpha = 1): VectorPath => ({ d, fill, clip, blend: 'multiply', alpha })
  const CYAN = 'rgba(150,228,255,0.95)'
  const STRIPE = '#7a2e0e'
  const OR = lin(40, 30, 190, 190, 0, '#ffbf5c', 0.45, '#f79a34', 1, '#e57a22')

  // ---- one continuous silhouette: ears, head with cheek tufts, slumped body ----
  const SIL = [
    96, 33.5, 110, 30.5, 122, 33,
    128, 33.5, 140, 21, 151, 9.5, 151, 9.5, 158, 26, 162, 43,
    170, 53, 174.5, 65, 183.5, 72.5, 183.5, 72.5, 176, 79, 188, 85.5, 188, 85.5, 177, 91.5, 183, 99.5, 183, 99.5, 170, 104,
    177, 113, 187, 127, 193.5, 140, 199, 146, 199, 146, 195, 151, 197, 167, 191, 181, 183, 190,
    160, 194, 128, 196, 98, 196.5, 66, 194.5, 42, 188,
    31, 172, 28.5, 158, 24, 152, 24, 152, 30, 146, 33, 128, 44, 113, 51, 104.5,
    42, 101, 42, 101, 48.5, 95.5, 36, 90, 36, 90, 47, 84.5, 39.5, 77, 39.5, 77, 50, 71.5, 51.5, 59, 57, 47.5,
    58, 42, 62, 26, 66.5, 12, 66.5, 12, 76, 24, 86, 33.5,
  ]
  const body = form(SIL, 201, 0.5, 1.4)
  const B = body.d
  const BELLY = form([84, 118, 112, 112.5, 145, 117.5, 163, 138, 167, 166, 154, 189, 112, 197, 70, 191, 55, 168, 60, 138], 203, 0.6)
  const gNeck = (x: number) => 104 + Math.pow((x - 108) / 70, 2) * 8 // where the head overhangs the body
  const headP = polyD(cut(body.p, gNeck, 'above'))
  const bodyP = polyD(cut(body.p, gNeck, 'below'))

  // ---- tail curling up behind on the right ----
  const TAILC = [178, 183, 200, 184, 213, 170, 210, 150, 205.5, 136, 211, 121, 217, 114]
  const tail = form(tube(TAILC, [9, 8.4, 7.6, 6.8, 6.2, 5.6, 4.6], 1.4), 211, 0.55, 1.2)
  const TL = tail.d
  const tailStripes = (() => {
    const sc: number[][] = [[0.22, 2.4], [0.4, 2.2], [0.57, 2], [0.73, 1.8], [0.88, 1.5]]
    const pts = TAILC
    let d = ''
    sc.forEach(([t, w], i) => {
      const k = t * (pts.length / 2 - 1)
      const j = Math.min(pts.length / 2 - 2, Math.floor(k))
      const f = k - j
      const x = pts[j * 2] + (pts[j * 2 + 2] - pts[j * 2]) * f
      const y = pts[j * 2 + 1] + (pts[j * 2 + 3] - pts[j * 2 + 1]) * f
      const dx = pts[j * 2 + 2] - pts[j * 2]
      const dy = pts[j * 2 + 3] - pts[j * 2 + 1]
      const l = Math.hypot(dx, dy) || 1
      const nx = -dy / l
      const ny = dx / l
      const r = 11 - i * 1.2
      // bowed band across the tube: reads as wrapping round a cylinder
      d += inkLine([x + nx * r, y + ny * r, x + (dx / l) * 2.6, y + (dy / l) * 2.6, x - nx * r, y - ny * r], w * 1.6, 220 + i, 0.25, 0.25, 0.2)
    })
    return d
  })()

  // ---- arms + paws folded on the belly ----
  const arm = (center: number[], half: number[], seed: number) => form(tube(center, half, 1.2), seed, 0.4, 1.2)
  const NECK = (() => {
    const o: number[] = []
    for (let x = -10; x <= 230; x += 4) o.push(x, gNeck(x))
    return smooth([...o, 230, 230, -10, 230], true)
  })()
  const ARM_L = arm([61, 100, 56, 120, 62, 136, 77, 145, 89, 147], [13, 12, 10.5, 9.6, 9.4], 231)
  const ARM_R = arm([164, 100, 171, 120, 166, 136, 150, 145.5, 137, 147], [13, 12.5, 11, 10, 9.8], 233)
  const PAW_L = form([78, 139.5, 86, 136.5, 93, 136.8, 98.5, 139, 101, 143.5, 100, 148.5, 95, 152, 86, 152.5, 79, 150], 235, 0.3, 1)
  const PAW_R = form([150, 140, 142, 137, 134.5, 137.5, 128.5, 140, 126, 145, 127.5, 150, 133, 153, 142, 153, 149, 150], 237, 0.3, 1)

  // ---- hind feet, soles toward us (toe beans) ----
  const FOOT_L = form([52, 172, 63, 174, 70, 182, 68, 192, 58, 197.5, 44, 197, 35, 192, 34, 183, 41, 175], 241, 0.35, 1)
  const FOOT_R = form([176, 172, 188, 174, 197, 181, 198, 191, 190, 197.5, 175, 197.5, 167, 192, 166, 182, 169, 176], 243, 0.35, 1)
  const beans = (cx: number, cy: number, s: number, seed: number): VectorPath[] => {
    const main = form([cx - 6 * s, cy + 2 * s, cx - 3.5 * s, cy - 2 * s, cx, cy - 1 * s, cx + 3.5 * s, cy - 2 * s, cx + 6 * s, cy + 2 * s, cx + 3 * s, cy + 5.5 * s, cx - 3 * s, cy + 5.5 * s], seed, 0.15, 0.8)
    const toes = [[-7, -6.5, 2.2], [-2.3, -9.2, 2.3], [2.6, -9, 2.3], [7.2, -6, 2.1]]
    let td = ''
    toes.forEach(([x, y, r], i) => (td += smooth(oval(cx + x * s, cy + y * s, r * s, r * 1.2 * s, x * 3, seed + i, 0.1))))
    return [
      { d: main.d + td, fill: lin(0, cy - 11 * s, 0, cy + 6 * s, 0, '#ffc2cc', 1, '#e8869a') },
      { d: main.d + td, stroke: 'rgba(120,40,40,0.55)', sw: 0.7 },
      { d: smooth(oval(cx - 2 * s, cy + 0.5 * s, 2.2 * s, 1 * s, -10, seed + 9, 0.1)), fill: 'rgba(255,255,255,0.7)' },
    ]
  }

  // ---- face ----
  const F = (f: number[], k = 1.22) => f.map((v, i) => (i % 2 ? 66 + (v - 69) * k : 100 + (v - 100) * k))
  const EYE_L = F([86, 49, 95, 52, 99, 62, 98.5, 74, 93.5, 82, 85.5, 84, 77.5, 80, 73.5, 71, 74.5, 59, 79, 51.5])
  const EYE_R = F([113.5, 48, 123.5, 51.5, 128.5, 61.5, 128, 73.5, 123, 82, 113.5, 84.5, 105, 80.5, 100.5, 71, 101.5, 59, 106.5, 51])
  const eye = (pts: number[], ix: number, iy: number, lidY: number, lidTilt: number, seed: number): VectorPath[] => {
    const cv = form(pts, seed, 0.25, 1)
    const E = cv.d
    const I = smooth(oval(ix, iy, 7.4, 8.6, 0, seed + 1, 0.05))
    const LID = smooth([pts[18] - 6, lidY - lidTilt - 30, pts[4] + 6, lidY + lidTilt - 30, pts[4] + 6, lidY + lidTilt, (pts[4] + pts[18]) / 2, lidY + 2.6, pts[18] - 6, lidY - lidTilt])
    return [
      { d: E, fill: '#fbfcf4' },
      ...within(E, dab(ix + 4, iy + 6, 9, 6, '200,205,175', 0.45, seed)),
      { d: I, fill: radLit(ix, iy, 8, 0, '#eaff9a', 0.55, '#a6c83a', 1, '#5d8a1a'), clip: E },
      { d: smooth(oval(ix - 0.8, iy + 0.8, 2.8, 5.4, 0, seed + 2, 0.06)), fill: INK, clip: E },
      { d: circ(ix - 2.2, iy - 1.6, 1.5) + circ(ix + 2.2, iy + 3.4, 0.7), fill: '#ffffff', clip: E },
      // heavy lid + its shadow on the eyeball
      mul(shift(LID, 0, 3.2), 'rgba(120,90,110,0.5)', E),
      { d: LID, fill: lin(0, lidY - 22, 0, lidY + 2, 0, '#ffc463', 1, '#f0912c'), clip: E },
      mul(smooth([pts[18] - 4, lidY - 5, pts[4] + 4, lidY - 5, pts[4] + 4, lidY + 3, pts[18] - 4, lidY + 3]), 'rgba(220,120,50,0.6)', E),
      line([pts[18] + 0.5, lidY - lidTilt + 0.2, (pts[4] + pts[18]) / 2, lidY + 2.4, pts[4] - 0.5, lidY + lidTilt + 0.2], 2.6, seed + 4, 0.15, 0.15),
      line([pts[18] + 3, lidY - lidTilt - 3.5, (pts[4] + pts[18]) / 2, lidY - 1.4, pts[4] - 3, lidY + lidTilt - 3.5], 0.8, seed + 5, 0.3, 0.3, 'rgba(255,240,200,0.8)'),
      { d: inkRing(cv, { light: [0.3, 1], w: 2.7, thin: 0.8, taper: 5, gap: 1 }, seed + 9), fill: INK },
    ]
  }
  const MUZ_L = form(F([101, 84, 95, 82.5, 87, 84.5, 82.5, 90, 84.5, 96, 92, 98.5, 100, 96, 102.5, 90], 1.15), 251, 0.3, 1)
  const MUZ_R = form(F([101, 84, 108, 82, 116, 84, 120.5, 89.5, 118.5, 95.5, 110.5, 98.5, 103, 96, 100.5, 90], 1.15), 253, 0.3, 1)
  const NOSE = form(F([96.5, 80, 101.5, 78.6, 106, 80, 104.5, 84, 101.2, 86, 98, 84], 1.2), 255, 0.15, 0.8)

  const paths: VectorPath[] = [
    // cast shadow on the table (lower-right) + contact occlusion
    ...softShade(132, 194, 98, 10, 0.6, '60,20,30'),
    ...softShade(116, 195, 82, 4.5, 0.55, '60,20,30'),

    // tail behind the body
    { d: TL, fill: lin(176, 0, 218, 0, 0, '#f7a03c', 1, '#d97420') },
    { d: tailStripes, fill: STRIPE, clip: TL },
    mul(shift(TL, 3, 1.5), 'rgba(200,90,40,0.6)', TL),
    rimLight(TL, lin(196, 0, 220, 0, 0, T, 0.55, T, 1, CYAN), 1.8),
    { d: strokesIn(178, 110, 42, 86, 50, 3.4, 70, 0.32, 213), fill: 'rgba(130,50,10,0.45)', clip: TL },
    ink(tail, { w: 3.2, thin: 0.9, taper: 6, breaks: [0.5] }, 215),
    line([212.5, 120, 216, 113.5, 219.5, 110.5], 1.2, 216, 0.2, 0.6),

    // ---- body + head (one silhouette) ----
    { d: B, fill: OR },
    ...within(B, [
      ...dab(82, 52, 30, 20, '255,214,130', 0.55, 1),
      ...dab(58, 130, 16, 30, '255,200,110', 0.35, 2),
      ...dab(170, 150, 22, 40, '214,98,40', 0.45, 3),
      ...dab(150, 64, 18, 22, '226,120,44', 0.35, 4),
      ...dab(40, 160, 8, 18, '255,226,150', 0.3, 5),
      ...dab(120, 106, 46, 8, '190,80,30', 0.35, 6),
    ]),
    // stripes on forehead, cheeks and flanks — tapered, following the form
    { d: inkLine([104, 32, 103, 40, 101, 47], 3.4, 261, 0.1, 0.6) + inkLine([92, 34, 92.5, 40, 91.5, 45], 2.6, 262, 0.1, 0.6) + inkLine([116, 34.5, 115, 40, 112.5, 45], 2.6, 263, 0.1, 0.6), fill: STRIPE, clip: B },
    { d: inkLine([40, 84, 49, 85, 54, 87.5], 2.4, 264, 0.05, 0.6) + inkLine([43, 95, 50, 95, 54, 96.5], 2.1, 265, 0.05, 0.6), fill: STRIPE, clip: B },
    { d: inkLine([184, 82, 173, 83, 165, 86], 2.6, 266, 0.05, 0.6) + inkLine([180, 94, 171, 94.5, 165, 96.5], 2.3, 267, 0.05, 0.6), fill: STRIPE, clip: B },
    { d: inkLine([30, 140, 40, 142, 47, 146], 3, 268, 0.05, 0.6) + inkLine([28, 157, 38, 158, 45, 161], 3, 269, 0.05, 0.6) + inkLine([31, 172, 40, 172.5, 46, 175], 2.6, 270, 0.05, 0.6), fill: STRIPE, clip: B },
    { d: inkLine([196, 138, 184, 141, 175, 146], 3.2, 271, 0.05, 0.6) + inkLine([197, 156, 186, 157.5, 177, 161], 3.2, 272, 0.05, 0.6) + inkLine([193, 173, 183, 173.5, 176, 176], 2.8, 273, 0.05, 0.6), fill: STRIPE, clip: B },
    // belly: cream, slumped, with its own shading
    { d: BELLY.d, fill: lin(0, 112, 0, 196, 0, '#fff6dc', 1, '#f6dca6'), clip: bodyP },
    ...within(bodyP, [...dab(96, 132, 22, 16, '255,255,240', 0.5, 7), ...dab(150, 172, 18, 22, '226,176,130', 0.45, 8)]),
    mul(smooth([64, 168, 90, 186, 130, 190, 160, 170, 168, 160, 166, 196, 60, 198]), 'rgba(214,160,130,0.45)', BELLY.d),
    { d: strokesIn(60, 112, 110, 86, 70, 3, 95, 0.28, 9), fill: 'rgba(170,120,70,0.35)', clip: BELLY.d },
    line([60, 140, 58, 154, 62, 166], 1.1, 274, 0.3, 0.4, 'rgba(120,50,20,0.7)'),
    line([163, 140, 167, 156, 163, 172], 1.3, 275, 0.3, 0.4, 'rgba(120,50,20,0.75)'),
    // the big head casts a shadow onto the body: soft cel band + hatching
    mul(smooth([40, 102, 80, 110, 112, 113, 150, 110, 186, 100, 190, 122, 150, 126, 112, 124, 74, 124, 40, 120]), 'rgba(200,90,50,0.55)', bodyP),
    { d: hatch([70, 112.5, 108, 116, 150, 112], 12, 6, 95, 0.75, 276), fill: 'rgba(110,40,10,0.6)', clip: bodyP },
    // form shadow on the right side of head and body
    mul(smooth([150, 40, 168, 52, 182, 80, 172, 104, 160, 92, 164, 70]), 'rgba(214,110,60,0.55)', headP),
    mul(smooth([176, 116, 194, 140, 196, 172, 184, 192, 168, 190, 178, 160, 174, 130]), 'rgba(196,90,50,0.6)', B),
    { d: hatch([186, 150, 189, 168, 183, 184], 7, 6, 160, 0.8, 277), fill: 'rgba(110,40,10,0.6)', clip: B },
    rimLight(B, lin(150, 40, 200, 120, 0, T, 0.62, T, 1, CYAN), 2.6),
    // fur: short strokes at the edges and clump lines
    { d: strokesIn(30, 30, 166, 160, 260, 3.6, 80, 0.32, 278), fill: 'rgba(150,60,15,0.32)', clip: B },
    { d: strokesIn(30, 30, 166, 90, 90, 3, 60, 0.3, 279), fill: 'rgba(255,230,170,0.35)', clip: headP },
    line([173, 77, 168, 80, 164, 79], 1.2, 280, 0.2, 0.5),
    line([175, 92, 170, 94, 165, 93.5], 1.1, 281, 0.2, 0.5),
    line([46, 89, 51, 91, 55, 90], 1, 282, 0.2, 0.5),
    line([192, 147, 186, 149, 182, 148], 1.1, 283, 0.2, 0.5),
    line([27, 153, 32, 155, 36, 154], 1, 284, 0.2, 0.5),
    // inner ears
    { d: smooth([131, 37, 143, 25, 150, 16, 154, 30, 156, 42]), fill: lin(0, 16, 0, 44, 0, '#ffc6c6', 1, '#e88894'), clip: B },
    mul(smooth([150, 16, 154, 30, 157, 44, 150, 40]), 'rgba(160,60,80,0.45)', B),
    { d: smooth([68, 18, 78, 28, 84, 36, 70, 40, 65, 30]), fill: lin(0, 18, 0, 40, 0, '#ffc6c6', 1, '#e88894'), clip: B },
    { d: strokesIn(133, 20, 22, 22, 8, 4, 110, 0.35, 285) + strokesIn(67, 20, 14, 18, 6, 4, 70, 0.35, 286), fill: 'rgba(255,240,220,0.8)', clip: B },
    line([131, 37, 140, 28, 147, 21], 1.2, 287, 0.1, 0.5),
    line([86, 34, 78, 27.5, 72, 21], 1.1, 288, 0.1, 0.5),
    // paper grain
    { d: grain(24, 8, 196, 190, 520, 289, 0.18, 0.42), fill: 'rgba(90,40,10,0.18)', clip: B, blend: 'multiply' },
    // overlap line where the cheeks overhang the body
    line([52, 104, 80, 109.5, 112, 112, 146, 109.5, 170, 104], 2.2, 290, 0.08, 0.1),
    ink(body, { w: 4.4, thin: 1, taper: 9, breaks: [0.25, 0.62], gap: -2, heavy: [[110, 196, 40, 1.2]] }, 291),

    // ---- face ----
    mul(shift(smooth(EYE_L) + smooth(EYE_R), 3, 3.6), 'rgba(170,70,20,0.45)', headP),
    ...eye(EYE_L, 77, 72, 65, 1.8, 301),
    ...eye(EYE_R, 109, 71.5, 64, -2.2, 311),
    // smug brow marks, one lifted
    line([70, 43, 80, 41.5, 92, 43.5], 1.7, 321, 0.3, 0.3),
    line([105, 39, 117, 33, 131, 33.5], 2, 322, 0.3, 0.3),
    // muzzle puffs with whisker pores
    ...[MUZ_L, MUZ_R].flatMap((m, i) => [
      { d: m.d, fill: lin(0, 82, 0, 99, 0, '#fffaea', 1, '#f2d9a8') },
      mul(shift(m.d, 2.2, 2), 'rgba(214,160,110,0.6)', m.d),
      { d: strokesIn(i ? 101 : 80, 82, 22, 18, 10, 2.2, 90, 0.25, 323 + i), fill: 'rgba(170,120,70,0.4)', clip: m.d },
      ink(m, { w: 2.2, thin: 0.6, taper: 4, light: [-0.3, -1] }, 325 + i),
    ]),
    { d: circ(86, 88, 0.95) + circ(90.5, 91.5, 0.95) + circ(86.5, 93.5, 0.85) + circ(111.5, 87.5, 0.95) + circ(116, 91, 0.95) + circ(112, 93.5, 0.85), fill: 'rgba(120,70,30,0.65)' },
    // smug mouth: one corner lifted, cheek crease
    line([90, 100.5, 98, 102.5, 106, 101.8, 113, 99.5, 119.5, 95], 2, 327, 0.2, 0.15),
    line([119, 91.5, 121.5, 94.5, 121, 98.5], 1.3, 328, 0.3, 0.3),
    // nose
    mul(shift(NOSE.d, 1.4, 2), 'rgba(140,70,40,0.5)', MUZ_L.d + MUZ_R.d),
    { d: NOSE.d, fill: lin(96, 79, 106, 86, 0, '#ffb6c8', 1, '#d8507a') },
    ink(NOSE, { w: 1.8, thin: 0.6, taper: 2 }, 329),
    { d: smooth(oval(99.6, 80.4, 1.6, 0.8, -8, 330, 0.1)), fill: 'rgba(255,255,255,0.9)' },
    // whiskers: long tapered strokes
    { d: inkLine([84, 89, 70, 86, 52, 87], 1.2, 331, 0.05, 0.85) + inkLine([84, 93, 68, 94, 51, 98.5], 1.1, 332, 0.05, 0.85) + inkLine([118, 88, 134, 84.5, 152, 85.5], 1.2, 333, 0.05, 0.85) + inkLine([118, 92, 135, 92.5, 153, 96.5], 1.1, 334, 0.05, 0.85), fill: INK },

    // ---- arms + paws folded on the belly ----
    ...[[ARM_L, PAW_L, 0], [ARM_R, PAW_R, 1]].flatMap(([a, p, i]) => {
      const A = polyD(cut((a as Curve).p, gNeck, 'below'))
      const P = (p as Curve).d
      const right = i === 1
      return [
        mul(shift(A + P, 3.5, 3.5), 'rgba(150,70,40,0.5)', bodyP),
        { d: A, fill: OR },
        ...within(A, right ? dab(166, 132, 10, 16, '205,90,40', 0.45, 341) : dab(62, 118, 9, 12, '255,215,140', 0.5, 342)),
        { d: right ? inkLine([176, 124, 167, 124.5, 160, 128], 2.6, 343, 0.05, 0.5) + inkLine([168, 137, 160, 136, 153, 139], 2.4, 344, 0.05, 0.5) : inkLine([52, 122, 60, 122, 66, 126], 2.6, 345, 0.05, 0.5) + inkLine([62, 135, 70, 134.5, 75, 138.5], 2.3, 346, 0.05, 0.5), fill: STRIPE, clip: A },
        mul(shift(A, right ? 3 : 2.5, 2.5), 'rgba(205,100,50,0.55)', A),
        { d: strokesIn(right ? 135 : 48, 104, 44, 44, 30, 3, 70, 0.3, 347 + (i as number)), fill: 'rgba(150,60,15,0.35)', clip: A },
        ...(right ? [rimLight(A, lin(150, 0, 182, 0, 0, T, 0.6, T, 1, CYAN), 1.8)] : []),
        { d: inkRing(a as Curve, { light: LT, w: 3.2, thin: 0.8, taper: 6, breaks: [0.5] }, 351 + (i as number)), fill: INK, clip: NECK },
        { d: P, fill: lin(0, 136, 0, 153, 0, '#fff4dc', 1, '#f0cf98') },
        mul(shift(P, 2, 2.5), 'rgba(210,150,100,0.6)', P),
        ink(p as Curve, { w: 2.6, thin: 0.7, taper: 4 }, 353 + (i as number)),
        right ? line([138, 145.5, 137.5, 150, 138.5, 153], 1.1, 355, 0.2, 0.3) : line([90, 146, 90.5, 150, 89.5, 152.5], 1.1, 356, 0.2, 0.3),
        right ? line([131.5, 144, 131, 148, 132, 151.5], 1, 357, 0.2, 0.3) : line([95.5, 144.5, 96, 148, 95, 151], 1, 358, 0.2, 0.3),
      ]
    }),

    line([52, 104, 80, 109.5, 112, 112, 146, 109.5, 170, 104], 2.2, 290, 0.08, 0.1),
    // ---- hind feet, soles toward the viewer ----
    ...[[FOOT_L, 51, 186], [FOOT_R, 182, 186]].flatMap(([f, x, y], i) => {
      const F = (f as Curve).d
      return [
        { d: F, fill: lin(0, 172, 0, 198, 0, '#fff4dc', 1, '#efcb92') },
        mul(shift(F, i ? 3 : 2, 2.5), 'rgba(210,150,100,0.55)', F),
        ...beans(x as number, (y as number) + 2, 1.05, 361 + (i as number) * 10),
        ink(f as Curve, { w: 3, thin: 0.8, taper: 5, heavy: [[x as number, 198, 14, 1.3]] }, 381 + (i as number)),
      ]
    }),
  ]
  return { viewW: 220, viewH: 200, paths }
}

export function lasagna(): Art {
  // slice in 3/4 view: front face, right side face, cheesy top
  const L = 30
  const R = 94
  const Tp = 48
  const B = 80
  const DX = 18
  const DY = -10
  const layers: [number, string][] = [
    [Tp, '#e9a33c'], [Tp + 5, '#f8db7c'], [Tp + 9.5, '#c8361f'], [Tp + 15, '#fff2d0'], [Tp + 18.5, '#f8db7c'], [Tp + 23, '#c8361f'], [Tp + 28, '#f8db7c'],
  ]
  const front: VectorPath[] = []
  const side: VectorPath[] = []
  layers.forEach(([y0, c], i) => {
    const y1 = i + 1 < layers.length ? layers[i + 1][0] : B
    front.push({ d: rect(L, y0, R - L, y1 - y0), fill: c })
    side.push({ d: poly([R, y0, R + DX, y0 + DY, R + DX, y1 + DY, R, y1]), fill: shade(c, -0.3) })
  })
  const FRONT = rect(L, Tp, R - L, B - Tp)
  const SIDEF = poly([R, Tp, R + DX, Tp + DY, R + DX, B + DY, R, B])
  const SLICE = poly([L, Tp, L + DX, Tp + DY, R + DX, Tp + DY, R + DX, B + DY, R, B, L, B])
  const TOPFACE = poly([L, Tp, L + DX, Tp + DY, R + DX, Tp + DY, R, Tp])
  const PLATE = ell(70, 82, 64, 15)
  return {
    viewW: 140,
    viewH: 100,
    paths: [
      // plate shadow on the table (lower-right)
      ...softShade(80, 90, 66, 9, 0.45, '60,20,30'),
      { d: PLATE, fill: lin(0, 67, 0, 97, 0, '#ffffff', 1, '#c9d2de') },
      inside(PLATE, lin(6, 0, 134, 0, 0, T, 0.55, T, 1, '#a9b4cc')),
      { d: ell(70, 81, 48, 10), fill: lin(0, 71, 0, 91, 0, '#dfe6ef', 1, '#ffffff'), stroke: 'rgba(27,23,18,0.18)', sw: 1.5 },
      { d: PLATE, stroke: INK, sw: 3.5 },
      { d: arcAlong(70, 82, 58, 12, 190, 240, 10), stroke: 'rgba(255,255,255,0.95)', sw: 2 },
      // slice shadow on the plate + contact occlusion
      ...shadowOn(ell(70, 81, 48, 10), 84, 83, 46, 7, 0.75, '90,40,30'),
      { d: rect(L, B - 1, R - L + 4, 2.4), fill: 'rgba(60,20,10,0.3)' },
      // slice
      ...front,
      ...side,
      inside(FRONT, lin(0, Tp, 0, B, 0, T, 0.5, T, 1, 'rgba(120,40,30,0.4)')),
      inside(FRONT, lin(L, 0, R, 0, 0, 'rgba(255,245,210,0.35)', 0.4, T), 'screen'),
      inside(SIDEF, lin(R, 0, R + DX, 0, 0, T, 1, 'rgba(80,30,60,0.35)')),
      { d: TOPFACE, fill: lin(0, Tp + DY, 0, Tp, 0, '#ffe58a', 1, '#f6c24e') },
      { d: ell(52, 43, 4, 1.6) + ell(80, 41, 5, 1.8) + ell(98, 42, 3, 1.2) + ell(66, 45, 2.6, 1), fill: 'rgba(196,110,30,0.75)' },
      { d: ell(60, 41, 2.6, 1.1) + ell(90, 44.5, 2.4, 1), fill: '#c8361f' },
      // cheese drips over the front edge
      { d: `M${L} ${Tp}H${R}V${Tp + 3}Q${R - 4} ${Tp + 3} ${R - 6} ${Tp + 8}Q${R - 8} ${Tp + 12} ${R - 10} ${Tp + 7}Q${R - 13} ${Tp + 3} ${R - 20} ${Tp + 4}Q${R - 26} ${Tp + 4} ${R - 28} ${Tp + 10}Q${R - 30} ${Tp + 15} ${R - 33} ${Tp + 9}Q${R - 36} ${Tp + 3} ${R - 44} ${Tp + 4}Q${R - 50} ${Tp + 5} ${R - 52} ${Tp + 8}Q${R - 54} ${Tp + 11} ${R - 56} ${Tp + 6}Q${R - 58} ${Tp + 3} ${L} ${Tp + 3}Z`, fill: lin(0, Tp, 0, Tp + 14, 0, '#ffd760', 1, '#f2a93a') },
      { d: circ(R - 7.6, Tp + 9, 0.9) + circ(R - 29.6, Tp + 11, 0.9) + circ(R - 53.6, Tp + 8, 0.8), fill: 'rgba(255,255,255,0.9)' },
      { d: `M${R} ${Tp}V${B}M${L} ${Tp}H${R}L${R + DX} ${Tp + DY}`, stroke: INK, sw: 2.2 },
      { d: SLICE, stroke: INK, sw: 3.6 },
      // oily specular glints on the cheese
      { d: ell(46, 45.5, 5, 1.1) + ell(76, 43.2, 3, 0.8) + circ(88, 40.6, 0.8), fill: 'rgba(255,255,255,0.85)' },
      gloss(`M${L + 8} ${Tp - 3} L${L + 22} ${Tp - 7}`, 2.2, 0.8),
      // basil leaf
      { d: 'M70 40 Q78 32 88 36 Q80 44 70 40 Z', fill: lin(70, 34, 88, 42, 0, '#8fe36a', 1, '#2f8a32'), stroke: INK, sw: 2 },
      { d: 'M72 39.5 Q79 37 85 37', stroke: 'rgba(255,255,255,0.7)', sw: 1 },
      // steam, glowing in the sunbeam
      { d: 'M48 30 Q42 22 48 15 Q54 8 48 0 M68 27 Q62 18 68 11 Q74 4 69 -3 M88 29 Q82 21 88 14 Q94 7 89 1', stroke: 'rgba(255,255,255,0.35)', sw: 7 },
      { d: 'M48 30 Q42 22 48 15 Q54 8 48 0 M68 27 Q62 18 68 11 Q74 4 69 -3 M88 29 Q82 21 88 14 Q94 7 89 1', stroke: 'rgba(255,255,255,0.8)', sw: 3 },
    ],
  }
}

// ---- Flower-power mystery van -----------------------------------------------
// Key light: the full moon, upper-right (cool white). Purple ambient, pink rim
// on the left; the headlight and the mansion windows emit warm light.
function powerFlower(cx: number, cy: number, r: number): VectorPath[] {
  const petals: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    petals.push(circ(cx + r * 0.6 * Math.cos(a), cy + r * 0.6 * Math.sin(a), r * 0.48))
  }
  const U = union(petals)
  return [
    { d: U, stroke: INK, sw: Math.max(2.4, r * 0.36) },
    { d: U, fill: rad(cx + r * 0.4, cy - r * 0.4, r * 1.6, 0, '#ffd88a', 0.5, '#ff9b2e', 1, '#c4501a') },
    { d: circ(cx, cy, r * 0.36), fill: rad(cx + r * 0.1, cy - r * 0.12, r * 0.4, 0, '#fff7a8', 1, '#e0a01c'), stroke: INK, sw: Math.max(1.4, r * 0.15) },
    { d: circ(cx + r * 0.42, cy - r * 0.62, r * 0.13), fill: 'rgba(255,255,255,0.85)' },
  ]
}

export function mysteryVan(): Art {
  const BODY = 'M18 104 Q14 104 14 98 L14 40 Q14 21 34 21 L170 20 Q184 20 192 30 L214 60 Q230 64 232 80 L232 98 Q232 104 226 104 Z'
  const LOWER = 'M14 72 H229.8 Q232 76 232 82 L232 98 Q232 104 226 104 H18 Q14 104 14 98 Z'
  const GLASSP = lin(0, 30, 0, 58, 0, '#d9f2ff', 0.45, '#7cbde6', 1, '#355f9e')
  const wins = [rrect(28, 30, 40, 26, 6), rrect(76, 30, 40, 26, 6), rrect(124, 30, 32, 26, 6)]
  const SHIELD = 'M167 30 H185 Q189 30 191 33 L207 56 Q208.5 58.5 205 58.5 H171 Q167 58.5 167 54.5 Z'
  const GLASS = wins.join('') + SHIELD
  const MOONRIM = (x0: number, y0: number, x1: number, y1: number) => lin(x0, y0, x1, y1, 0, T, 0.65, T, 1, 'rgba(235,240,255,0.95)')
  const wheel = (x: number): VectorPath[] => {
    const W = circ(x, 107, 18)
    const H = circ(x, 107, 9.5)
    return [
      { d: W, fill: rad(x + 6, 101, 26, 0, '#5a5a6a', 0.6, '#1c1c24', 1, '#0a0a10') },
      { d: arcAlong(x, 107, 15, 15, 280, 350, 10), stroke: 'rgba(220,230,255,0.55)', sw: 2.4 },
      { d: W, stroke: INK, sw: 3.5 },
      { d: H, fill: lin(x - 9, 116, x + 9, 98, 0, '#7d8696', 0.55, '#d8dee6', 1, '#ffffff') },
      { d: arcAlong(x, 107, 6.5, 6.5, 290, 340, 6), stroke: '#ffffff', sw: 1.4 },
      { d: H, stroke: INK, sw: 2.2 },
      { d: circ(x, 107, 2.8), fill: '#5f6874' },
      { d: circ(x + 3.8, 103.4, 1.2), fill: '#ffffff' },
    ]
  }
  return {
    viewW: 300,
    viewH: 136,
    paths: [
      // headlight beam + pool of light on the road (additive)
      { d: poly([229, 76, 300, 64, 300, 126, 229, 86]), fill: lin(229, 0, 300, 0, 0, 'rgba(255,236,160,0.6)', 1, 'rgba(255,236,160,0)'), blend: 'screen' },
      ...glowPool(272, 125, 34, 6, 0.6, '255,230,150', 30, 'screen'),
      // moon shadow falls to the lower-left; occlusion right under the chassis
      ...softShade(104, 126, 120, 8, 0.6, '5,0,20'),
      ...softShade(122, 122, 100, 4, 0.55, '0,0,10'),
      // roof rack + luggage
      { d: rrect(48, 3, 30, 11, 2.5), fill: lin(48, 14, 78, 3, 0, '#7a4a20', 1, '#e0a868'), stroke: INK, sw: 2.4 },
      { d: 'M63 3 V14 M56 3 Q56 0 63 0 Q70 0 70 3', stroke: INK, sw: 1.8 },
      { d: rrect(86, 4, 36, 10, 5), fill: lin(0, 14, 0, 4, 0, '#a8304e', 1, '#ff9aaa'), stroke: INK, sw: 2.4 },
      { d: 'M96 4.5 V13.5 M112 4.5 V13.5', stroke: 'rgba(255,255,255,0.75)', sw: 1.6 },
      { d: 'M34 21 V14 M158 20 V14', stroke: INK, sw: 3 },
      { d: 'M28 14 H164', stroke: INK, sw: 4 },
      { d: 'M28 14 H164', stroke: lin(28, 0, 164, 0, 0, '#8a92a6', 1, '#f2f6ff'), sw: 1.6 },
      // body: teal top, blue skirt, orange stripe
      { d: BODY, fill: lin(0, 20, 0, 72, 0, '#8ff0d8', 1, '#2fb398') },
      { d: LOWER, fill: lin(0, 72, 0, 104, 0, '#5c9ef6', 1, '#264fae') },
      { d: 'M14 72 H229.8', stroke: INK, sw: 6.5 },
      { d: 'M14 72 H229.8', stroke: '#ffa133', sw: 3.4 },
      // glass with moon reflections
      { d: GLASS, fill: GLASSP },
      { d: poly([150, 30, 160, 30, 136, 58, 126, 58]) + poly([190, 30, 197, 30, 180, 58, 173, 58]) + poly([102, 30, 107, 30, 83, 58, 78, 58]), fill: 'rgba(255,255,255,0.45)', clip: GLASS, blend: 'screen' },
      { d: circ(196, 40, 3.2), fill: rad(196, 40, 6, 0, 'rgba(255,250,220,0.95)', 1, 'rgba(255,250,220,0)'), clip: GLASS, blend: 'screen' },
      inside(GLASS, lin(0, 30, 0, 58, 0, T, 0.55, T, 1, 'rgba(20,10,60,0.45)')),
      { d: GLASS, stroke: INK, sw: 3.5 },
      // door, handle, mirror
      { d: 'M162 25 V101', stroke: INK, sw: 2.6 },
      { d: rrect(149, 62, 9, 3.4, 1.7), fill: lin(0, 62, 0, 65.4, 0, '#ffffff', 1, '#8a94a4'), stroke: INK, sw: 1.8 },
      { d: 'M209 52 L213 47', stroke: INK, sw: 2.4 },
      { d: rrect(210, 40, 7, 9, 2.5), fill: lin(210, 0, 217, 0, 0, '#2a8c78', 1, '#7ff0d8'), stroke: INK, sw: 2.2 },
      // flowers
      ...powerFlower(24, 88, 7),
      ...powerFlower(98, 87, 10.5),
      ...powerFlower(132, 82, 7.5),
      ...powerFlower(152, 94, 6),
      ...powerFlower(50, 64, 5.5),
      ...powerFlower(142, 64, 5),
      // volume: moonlit top, core shadow toward the left and the bottom
      inside(BODY, lin(0, 20, 0, 40, 0, 'rgba(225,235,255,0.55)', 1, T), 'screen'),
      inside(BODY, lin(232, 0, 14, 0, 0, T, 0.45, T, 1, 'rgba(70,40,140,0.6)')),
      inside(BODY, lin(0, 20, 0, 104, 0, T, 0.6, T, 1, 'rgba(40,20,90,0.6)')),
      rimLight(BODY, lin(14, 0, 232, 0, 0, 'rgba(255,140,230,0.95)', 0.1, T), 2.8),
      rimLight(BODY, MOONRIM(60, 104, 232, 20), 2.6),
      // wheel arches
      { d: 'M33 104 A23 23 0 0 1 79 104 Z M165 104 A23 23 0 0 1 211 104 Z', fill: '#0e0920' },
      { d: BODY, stroke: INK, sw: 4.6 },
      { d: 'M33 104 A23 23 0 0 1 79 104 M165 104 A23 23 0 0 1 211 104', stroke: INK, sw: 3.6 },
      gloss('M60 26 L166 25.5 Q182 25.5 188 33', 2.6, 0.8),
      ...wheel(56),
      ...wheel(188),
      // chrome bumpers and lights
      { d: rrect(7, 94, 13, 9, 3) + rrect(223, 94, 15, 9, 3), fill: lin(0, 94, 0, 103, 0, '#ffffff', 0.45, '#c3cbd6', 1, '#5c6474'), stroke: INK, sw: 2.6 },
      { d: ell(232, 96, 3, 0.9) + ell(15, 96, 2.4, 0.8), fill: '#ffffff' },
      { d: rrect(12, 76, 5, 10, 2), fill: lin(0, 76, 0, 86, 0, '#ff8a7a', 1, '#c7261e'), stroke: INK, sw: 2 },
      { d: circ(14.5, 81, 7), fill: rad(14.5, 81, 7, 0, 'rgba(255,80,80,0.5)', 1, 'rgba(255,80,80,0)'), blend: 'screen' },
      { d: circ(229, 80, 22), fill: rad(229, 80, 22, 0, 'rgba(255,244,190,0.9)', 0.35, 'rgba(255,230,150,0.35)', 1, 'rgba(255,230,150,0)'), blend: 'screen' },
      { d: circ(228.5, 80, 5), fill: rad(228, 79.5, 5, 0, '#ffffff', 0.6, '#fff4b0', 1, '#f2c21c'), stroke: INK, sw: 2.4 },
    ],
  }
}

export function ghost(): Art {
  const LT: Pt = [0.7, -0.7] // the moon, upper-right
  const PINK = 'rgba(255,160,240,0.9)'
  const BODY = form([
    41, 7.5, 53, 9.5, 61.5, 18, 65, 31, 66.5, 45, 65.5, 58, 63, 68,
    61, 74.5, 58.5, 80, 58.5, 80, 55, 76, 51.5, 76.5, 49.5, 82.5, 49.5, 82.5, 45, 78, 40, 78.5, 35.5, 84, 35.5, 84,
    31, 79.5, 25, 80, 18, 86, 9, 85, 9, 85, 14, 80, 16, 70, 15, 56, 15.5, 40, 19.5, 24, 28.5, 12.5,
  ], 401, 0.4, 1)
  const Bd = BODY.d
  const ARM_L = form(tube([20, 46, 12, 41, 7, 33.5], [5.4, 4.2, 3.6], 1.1), 403, 0.25, 1)
  const ARM_R = form(tube([60, 48, 68, 52, 75, 50.5], [5.2, 4, 3.5], 1.1), 405, 0.25, 1)
  const EYE_L = form([32, 29.5, 36, 32, 36.8, 37.5, 35, 43, 31.2, 44, 28, 40.5, 27.6, 34.5, 29, 30.5], 407, 0.15, 0.8)
  const EYE_R = form([47.5, 28.5, 52, 31, 53, 37, 51, 42.5, 47, 44, 43.6, 40.5, 43.2, 34, 44.6, 30], 409, 0.15, 0.8)
  const MOUTH = form([35.5, 50, 40.5, 48.6, 45.5, 50.2, 46, 55, 42.5, 59.5, 38, 59, 35, 55], 411, 0.2, 0.8)
  const part = (cv: Curve, seed: number): VectorPath[] => [
    { d: cv.d, fill: lin(70, 10, 10, 80, 0, '#ffffff', 0.5, '#f0efff', 1, '#c9c4f0') },
    { d: shift(cv.d, -2.4, 2.2), fill: 'rgba(150,140,220,0.55)', clip: cv.d, blend: 'multiply' },
    rimLight(cv.d, lin(10, 0, 70, 0, 0, PINK, 0.4, T, 1, T), 1.4),
    { d: inkRing(cv, { light: LT, w: 2.4, thin: 0.6, taper: 4 }, seed), fill: INK },
  ]
  return {
    viewW: 80,
    viewH: 90,
    paths: [
      { d: ell(40, 46, 40, 44), fill: rad(40, 46, 42, 0, 'rgba(210,200,255,0.55)', 1, 'rgba(210,200,255,0)'), blend: 'screen' },
      ...part(ARM_L, 413),
      ...part(ARM_R, 421),
      { d: Bd, fill: lin(66, 10, 14, 84, 0, '#ffffff', 0.45, '#f4f3ff', 1, '#d2cdf4') },
      ...within(Bd, [
        ...dab(54, 22, 12, 10, '255,255,250', 0.7, 1),
        ...dab(26, 66, 12, 16, '170,160,230', 0.45, 2),
        ...dab(40, 74, 22, 6, '190,170,240', 0.4, 3),
        ...dab(60, 60, 6, 12, '255,230,250', 0.4, 4),
      ]),
      // hand-drawn cel shadow on the side away from the moon, plus hatching
      { d: smooth([22, 18, 17, 34, 17, 56, 18, 72, 12, 84, 26, 80, 36, 82, 40, 76, 30, 70, 25, 56, 25, 38, 30, 22]), fill: 'rgba(160,150,225,0.55)', clip: Bd, blend: 'multiply' },
      { d: hatch([18, 48, 19, 62, 21, 74], 6, 4.5, 35, 0.55, 415), fill: 'rgba(70,50,140,0.55)', clip: Bd },
      rimLight(Bd, lin(10, 0, 70, 0, 0, PINK, 0.35, T, 1, T), 2.2),
      { d: grain(8, 6, 62, 82, 120, 417, 0.15, 0.35), fill: 'rgba(80,60,140,0.18)', clip: Bd, blend: 'multiply' },
      { d: inkRing(BODY, { light: LT, w: 3, thin: 0.7, taper: 6, breaks: [0.55], gap: -1.5 }, 419), fill: INK },
      // face: big glossy eyes, raised brows, little "boo" mouth
      ...[EYE_L, EYE_R].flatMap((e, i) => [
        { d: e.d, fill: lin(0, 29, 0, 44, 0, '#2a1f40', 1, '#0c0814') },
        { d: smooth(oval(i ? 49.3 : 33.6, 33.6, 1.9, 2.4, 20, 423 + i, 0.1)), fill: '#ffffff' },
        { d: circ(i ? 46.4 : 30.6, 40.4, 0.8), fill: 'rgba(255,255,255,0.85)' },
        { d: inkRing(e, { light: [0, 1], w: 1.2, thin: 0.4, taper: 2 }, 425 + i), fill: INK },
      ]),
      { d: inkLine([27, 25.5, 31, 23, 35.5, 24.5], 1.4, 427, 0.3, 0.3) + inkLine([44, 23.5, 48.5, 21.5, 53, 23.5], 1.4, 428, 0.3, 0.3), fill: INK },
      { d: MOUTH.d, fill: lin(0, 49, 0, 60, 0, '#2a0c24', 1, '#6a2a50') },
      { d: smooth(oval(40.8, 57.2, 3.2, 1.6, 0, 429, 0.15)), fill: '#ff8fb8', clip: MOUTH.d },
      { d: inkRing(MOUTH, { light: [0, 1], w: 1.6, thin: 0.5, taper: 2 }, 430), fill: INK },
      ...within(Bd, [...dab(24.5, 47, 4.5, 3.2, '255,120,170', 0.5, 431), ...dab(56.5, 46, 4.5, 3.2, '255,120,170', 0.5, 432)]),
      { d: inkLine([57, 16, 61, 21, 63, 28], 1.8, 433, 0.2, 0.5), fill: 'rgba(255,255,255,0.95)' },
    ],
  }
}

export function hauntedNight(): Art {
  // bat silhouette: pointed wing tips, scalloped trailing edge, little ears
  const bat = (x: number, y: number, k: number) => {
    const P = (px: number, py: number) => `${q2(x + px * k)} ${q2(y + py * k)}`
    return (
      `M${P(0, -1)}Q${P(4, -5)} ${P(9, -5.5)}Q${P(13, -6)} ${P(16, -3.5)}Q${P(13, -2.5)} ${P(12, 1)}Q${P(10, -0.5)} ${P(7.5, 2)}` +
      `Q${P(5.5, 0.5)} ${P(3, 3)}Q${P(1.5, 2)} ${P(0, 4)}Q${P(-1.5, 2)} ${P(-3, 3)}Q${P(-5.5, 0.5)} ${P(-7.5, 2)}Q${P(-10, -0.5)} ${P(-12, 1)}` +
      `Q${P(-13, -2.5)} ${P(-16, -3.5)}Q${P(-13, -6)} ${P(-9, -5.5)}Q${P(-4, -5)} ${P(0, -1)}Z` +
      `M${P(-1.8, 0)}L${P(-1.5, -3.6)}L${P(-0.5, -1.6)}L${P(0.5, -1.6)}L${P(1.5, -3.6)}L${P(1.8, 0)}Q${P(1.8, 3)} ${P(0, 3.4)}Q${P(-1.8, 3)} ${P(-1.8, 0)}Z`
    )
  }
  const MX = 128
  const MY = 22
  const paths: VectorPath[] = []
  paths.push({ d: dots(46, 9, 160, 58, 0.18, 0.5), fill: 'rgba(255,255,255,0.55)' })
  // moon: wide bloom, faint moonbeams, craters with lit lower-left rims
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(MX, MY, 70, 0, 'rgba(255,240,200,0.55)', 0.2, 'rgba(230,210,255,0.25)', 1, 'rgba(200,180,255,0)'), blend: 'screen' })
  ;[[120, 128], [138, 146], [154, 160]].forEach(([a, b]) => {
    const A = (a * Math.PI) / 180
    const B = (b * Math.PI) / 180
    paths.push({ d: poly([MX, MY, MX + 160 * Math.cos(A), MY + 160 * Math.sin(A), MX + 160 * Math.cos(B), MY + 160 * Math.sin(B)]), fill: rad(MX, MY, 120, 0, 'rgba(230,225,255,0.16)', 1, 'rgba(230,225,255,0)'), blend: 'screen' })
  })
  const MOON = circ(MX, MY, 15)
  paths.push({ d: MOON, fill: rad(MX + 4, MY - 4, 20, 0, '#fffdf0', 0.6, '#ffefb8', 1, '#e2bf6a') })
  ;[[122, 17, 3, 2.6], [133.5, 26, 3.8, 3.3], [124.5, 29, 2, 1.7], [134, 15.5, 1.6, 1.4]].forEach(([x, y, rx, ry]) => {
    paths.push({ d: ell(x, y, rx, ry), fill: 'rgba(196,156,80,0.4)' }, { d: arcAlong(x, y, rx, ry, 100, 190, 8), stroke: 'rgba(255,255,240,0.6)', sw: 0.4 })
  })
  paths.push({ d: lens(100, 31, 148, 31.5, 2.4) + lens(118, 36, 158, 36, 1.8) + lens(92, 26.5, 114, 26, 1.2), fill: 'rgba(52,36,104,0.82)' })
  paths.push({ d: lens(100, 30, 148, 30.5, 0.8) + lens(118, 35.3, 158, 35.3, 0.6), fill: 'rgba(255,240,210,0.35)', blend: 'screen' })
  // far hills, then haze
  paths.push({ d: 'M-2 66 Q22 58 46 63 Q70 69 92 60 Q122 50 162 58 L162 101 L-2 101 Z', fill: '#2f2466' })
  paths.push({ d: rect(0, 55, 160, 46), fill: lin(0, 55, 0, 85, 0, 'rgba(150,130,230,0.05)', 1, 'rgba(150,130,230,0.3)'), blend: 'screen' })
  // mid hill with the mansion in front of the moon
  const HILL = 'M70 101 L70 80 Q96 60 118 58 Q142 57 162 66 L162 101 Z'
  paths.push({ d: HILL, fill: '#1f1748' })
  paths.push(rimLight(HILL, lin(70, 60, 162, 60, 0, T, 0.4, 'rgba(220,220,255,0.35)', 1, 'rgba(220,220,255,0.5)'), 0.8))
  const HOUSE =
    rect(104, 44, 26, 16) + poly([101.5, 44.5, 117, 34, 132.5, 44.5]) + rect(99, 36, 7, 24) + poly([98, 36.5, 102.5, 24, 107, 36.5]) +
    rect(126, 30, 8, 30) + poly([125, 30.5, 130, 15, 135, 30.5]) + rect(113, 32, 3, 6) + rect(96, 58, 42, 3)
  paths.push({ d: HOUSE, fill: '#150e33' })
  paths.push(inside(HOUSE, lin(96, 0, 136, 0, 0, T, 0.75, T, 1, 'rgba(230,220,255,0.3)'), 'screen'))
  const lit = rect(101, 40, 2.6, 3.4) + rect(108, 48, 3.4, 4) + rect(120, 48, 3.4, 4) + rect(128.6, 35, 2.8, 3.6) + rect(114.5, 53, 3.6, 7)
  ;[[102.3, 41.7], [109.7, 50], [121.7, 50], [130, 36.8], [116.3, 56.5]].forEach(([x, y]) => paths.push({ d: circ(x, y, 6), fill: rad(x, y, 6, 0, 'rgba(255,200,90,0.5)', 1, 'rgba(255,200,90,0)'), blend: 'screen' }))
  paths.push({ d: lit, fill: '#ffd47a' })
  // graveyard on the left, stones lit on their moon side
  const stone = (x: number, y: number, w: number, h: number) => `M${x} ${y}V${y - h + w / 2}Q${x} ${y - h} ${x + w / 2} ${y - h}Q${x + w} ${y - h} ${x + w} ${y - h + w / 2}V${y}Z`
  const STONES = stone(3, 71, 6, 8) + stone(13, 70, 5, 6.5) + stone(26, 72, 5.5, 7) + rect(21.2, 61.5, 1.6, 9.5) + rect(19, 63.6, 6, 1.6)
  paths.push({ d: STONES, fill: '#271e5a' })
  paths.push(inside(STONES, lin(0, 60, 32, 74, 0, T, 0.55, T, 1, 'rgba(200,200,255,0.35)'), 'screen'))
  paths.push(...softShade(14, 71.5, 20, 1.4, 0.5, '5,0,20'))
  // fog between the planes, then the road, then low fog
  paths.push({ d: lens(-10, 79, 72, 79, 3) + lens(56, 83, 130, 83, 2.6) + lens(104, 76.5, 170, 76.5, 2.6), fill: 'rgba(200,185,255,0.2)' })
  const ROAD = 'M-2 88 Q50 83 100 87 Q130 89.5 162 85.5 L162 101 L-2 101 Z'
  paths.push({ d: ROAD, fill: lin(0, 84, 0, 101, 0, '#2a1f58', 1, '#100a24') })
  paths.push(inside(ROAD, rad(MX, 80, 60, 0, 'rgba(210,200,255,0.2)', 1, 'rgba(210,200,255,0)'), 'screen'))
  paths.push({ d: 'M-2 88 Q50 83 100 87 Q130 89.5 162 85.5', stroke: 'rgba(200,190,255,0.35)', sw: 0.6 })
  paths.push({ d: lens(-8, 94, 66, 94, 2.2) + lens(70, 97, 170, 97, 2.2), fill: 'rgba(200,185,255,0.14)' })
  paths.push({ d: bat(MX - 4, 14, 0.42) + bat(100, 9, 0.36) + bat(150, 44, 0.32) + bat(62, 20, 0.3), fill: '#110a26' })
  // vignette
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(96, 40, 110, 0, T, 0.55, T, 1, 'rgba(5,0,20,0.6)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}
