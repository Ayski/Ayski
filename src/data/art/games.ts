import type { VectorPath } from '../../types'
import { circ, ell, gloss, INK, lin, pixels, poly, rad, radLit, rect, rng, rrect, shade, softShadow, star, type Art } from './kit'

// Hand-made parody art of classic video-game universes (original drawings,
// no official logos, sprites ripped from games, or trademarked names).
// Pixel pieces are generated on a small grid with per-pixel lighting (light
// from the upper-left) and an automatic 1-pixel outline; vector pieces follow
// the shaded cartoon style of cartoons.ts (gradient fills, gloss, ink).

// ---- local helpers -------------------------------------------------------------
type Cell = string | null

// Tiny pixel canvas: paint cells with palette keys, then outline + export.
class Pix {
  g: Cell[][]
  constructor(
    public w: number,
    public h: number,
  ) {
    this.g = Array.from({ length: h }, () => Array<Cell>(w).fill(null))
  }
  get(x: number, y: number): Cell {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.g[y][x] : null
  }
  set(x: number, y: number, c: Cell) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c
  }
  // Run fn on every cell; a returned string paints it, null/undefined keeps it.
  each(fn: (x: number, y: number, cur: Cell) => Cell | undefined) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = fn(x, y, this.g[y][x])
        if (c) this.g[y][x] = c
      }
  }
  // 1-pixel outline around everything painted (4-neighbourhood).
  outline(c: string, diag = false) {
    const add: [number, number][] = []
    const nb = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]]
    this.each((x, y, cur) => {
      if (!cur && nb.some(([dx, dy]) => this.get(x + dx, y + dy))) add.push([x, y])
      return undefined
    })
    add.forEach(([x, y]) => this.set(x, y, c))
  }
  paths(pal: Record<string, string>, size: number, ox = 0, oy = 0): VectorPath[] {
    return pixels(this.g.map((r) => r.map((c) => c ?? '.').join('')), pal, size, ox, oy)
  }
}

// Lambert-ish lighting of a sphere point (nx, ny in -1..1), light upper-left.
function lambert(nx: number, ny: number): number {
  const z = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
  return -0.5 * nx - 0.62 * ny + 0.6 * z
}

function pick(v: number, tones: [number, string][]): string {
  for (const [t, c] of tones) if (v > t) return c
  return tones[tones.length - 1][1]
}

// Lighting with an arbitrary key direction (lx, ly: screen direction the
// light comes FROM, e.g. (-1,-1) = upper-left; lz = frontal component).
function lambertL(nx: number, ny: number, lx: number, ly: number, lz = 0.6): number {
  const z = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
  const k = Math.hypot(lx, ly, lz)
  return (nx * lx + ny * ly + z * lz) / k
}

const rgba = (rgb: string, a: number) => `rgba(${rgb},${a})`

// Core/form shadow: darkens a shape from its lit side to its far side.
function core(d: string, x0: number, y0: number, x1: number, y1: number, rgb = '40,20,70', a = 0.55, start = 0.4): VectorPath {
  return { d, fill: lin(x0, y0, x1, y1, 0, rgba(rgb, 0), start, rgba(rgb, 0), 1, rgba(rgb, a)), blend: 'multiply' }
}

// Rim light: inner band along the edge of a shape, fading toward the key side.
function rim(d: string, w: number, x0: number, y0: number, x1: number, y1: number, rgb = '255,255,255', a = 0.85, start = 0.55): VectorPath {
  return { d, stroke: lin(x0, y0, x1, y1, 0, rgba(rgb, 0), start, rgba(rgb, 0), 1, rgba(rgb, a)), sw: w * 2, clip: d, blend: 'screen' }
}

// Soft glow / bloom.
function glow(cx: number, cy: number, r: number, rgb: string, a = 0.6, blend: GlobalCompositeOperation = 'screen'): VectorPath {
  return { d: circ(cx, cy, r), fill: rad(cx, cy, r, 0, rgba(rgb, a), 0.4, rgba(rgb, a * 0.45), 1, rgba(rgb, 0)), blend }
}

// Shadow cast on the ground: stacked translucent ellipses, multiplied.
function castShadow(cx: number, cy: number, rx: number, ry: number, a = 0.5, rgb = '20,10,40'): VectorPath[] {
  return softShadow(cx, cy, rx, ry, a, rgb).map((p) => ({ ...p, blend: 'multiply' as GlobalCompositeOperation }))
}

// Transform an absolute M/L/Q/C/Z path: scale, rotate (deg), then translate.
function xf(d: string, dx: number, dy: number, rot = 0, s = 1): string {
  const c = Math.cos((rot * Math.PI) / 180)
  const sn = Math.sin((rot * Math.PI) / 180)
  const tok = d.match(/[MLQCZ]|-?\d*\.?\d+/g) ?? []
  let out = ''
  let pend: number | null = null
  for (const t of tok) {
    if (/[MLQCZ]/.test(t)) {
      out += t
      continue
    }
    const v = parseFloat(t)
    if (pend === null) pend = v
    else {
      const x = pend * s
      const y = v * s
      out += `${(dx + x * c - y * sn).toFixed(2)} ${(dy + x * sn + y * c).toFixed(2)} `
      pend = null
    }
  }
  return out
}

// Ink-outlined limb: thick ink stroke with a coloured core.
function limb(d: string, color: string, w = 8): VectorPath[] {
  return [
    { d, stroke: INK, sw: w },
    { d, stroke: color, sw: w - 4.4 },
  ]
}

// Soft cartoon cloud without ink: lit puffs over a shaded flat base.
function softCloud(cx: number, cy: number, s: number, alpha = 1): VectorPath[] {
  const puffs = [circ(cx - 12 * s, cy + 1 * s, 8 * s), circ(cx - 2 * s, cy - 5 * s, 11 * s), circ(cx + 11 * s, cy - 1 * s, 9 * s), rrect(cx - 20 * s, cy - 2 * s, 41 * s, 10 * s, 5 * s)]
  return [
    ...puffs.map((d) => ({ d, fill: lin(0, cy - 16 * s, 0, cy + 8 * s, 0, '#ffffff', 0.6, '#f4f9ff', 1, '#c9def5'), alpha })),
    { d: rrect(cx - 17 * s, cy + 4.5 * s, 35 * s, 3.5 * s, 1.75 * s), fill: 'rgba(120,160,215,0.25)', alpha },
  ]
}

// Stepped (pixel-quantised) silhouette from a height function.
function stepped(w: number, cell: number, base: number, height: (x: number) => number, fromTop = false): string {
  const pts: number[] = [0, base]
  for (let x = 0; x < w; x += cell) {
    const h = Math.round(height(x + cell / 2) / cell) * cell
    const y = fromTop ? base + h : base - h
    pts.push(x, y, x + cell, y)
  }
  pts.push(w, base)
  return poly(pts)
}

// ---- One-eyed floating demon (pixel art) + hellfire -------------------------
// Key light: the lava pool at the lower-left. Rim: the fire behind, upper-right.
const DEMON_KEY: [number, number] = [-0.55, 0.6]
export function pixelDemon(): Art {
  const p = new Pix(36, 35)
  const cx = 18
  const cy = 20.5
  const rx = 14
  const ry = 12.5
  const [lx, ly] = DEMON_KEY
  const horns = new Set<string>()
  const horn = (pts: number[], t0: number) => {
    const [x0, y0, ax, ay, bx, by, x1, y1] = pts
    for (let i = 0; i <= 90; i++) {
      const t = i / 90
      const u = 1 - t
      const hx = u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1
      const hy = u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1
      const r = t0 * (1 - t) + 0.55 * t
      for (let y = Math.floor(hy - r - 1); y <= hy + r + 1; y++)
        for (let x = Math.floor(hx - r - 1); x <= hx + r + 1; x++) {
          const ox = x + 0.5 - hx
          const oy = y + 0.5 - hy
          if (ox * ox + oy * oy > r * r) continue
          const k = (lx * ox + ly * oy) / Math.max(r, 0.7)
          const rimSide = (0.7 * ox - 0.7 * oy) / Math.max(r, 0.7)
          horns.add(`${x},${y}`)
          if (rimSide > 0.45) p.set(x, y, 'Y')
          else if (t > 0.78) p.set(x, y, k > 0.1 ? 'B' : 'n')
          else p.set(x, y, k > 0.3 ? 'b' : k < -0.25 ? 'n' : 'B')
        }
    }
  }
  horn([11, 13, 3, 13, 0.5, 6, 5, 0.8], 3.2)
  horn([25, 13, 33, 13, 35.5, 6, 31, 0.8], 3.2)
  // body: form shading from the key, dark core, hot rim from behind
  const bodyTone = (x: number, y: number) => {
    const nx = (x + 0.5 - cx) / rx
    const ny = (y + 0.5 - cy) / ry
    const d = nx * nx + ny * ny
    if (d > 1) return null
    const back = 0.7 * nx - 0.7 * ny
    if (d > 0.86 && back > 0.45) return 'Y'
    if (d > 0.7 && back > 0.5) return 'O'
    return pick(lambertL(nx, ny, lx, ly, 0.75), [[0.9, 'H'], [0.66, 'L'], [0.3, 'R'], [-0.05, 'D'], [-9, 'E']])
  }
  p.each((x, y) => bodyTone(x, y))
  // ambient occlusion where the horns meet the skull
  p.each((x, y, cur) => {
    if (!cur || horns.has(`${x},${y}`)) return null
    const near = [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1], [0, -2]].some(([dx, dy]) => horns.has(`${x + dx},${y + dy}`))
    const darker: Record<string, string> = { H: 'L', L: 'R', R: 'D', D: 'E', O: 'D', Y: 'O', E: 'E' }
    return near ? darker[cur] : null
  })
  // big single eye with an angry lid
  const ex = 18
  const ey = 16.6
  const erx = 6.6
  const ery = 5.6
  const brow = (x: number) => 13.3 - Math.abs(x + 0.5 - ex) * 0.32
  p.each((x, y) => {
    const nx = (x + 0.5 - ex) / erx
    const ny = (y + 0.5 - ey) / ery
    const d = nx * nx + ny * ny
    if (d > 1.45) return null
    if (d > 1) return 'E'
    if (y + 0.5 < brow(x) + 0.5) return bodyTone(x, y)
    if (y + 0.5 < brow(x) + 1.5) return 'v' // lid casts a little shadow on the eyeball
    return lambertL(nx * 0.8, ny * 0.8, lx, ly) > 0.4 ? 'W' : 'w'
  })
  // glowing iris + slit pupil + specular (toward the key)
  p.each((x, y) => {
    const ix = (x + 0.5 - 19) / 3.6
    const iy = (y + 0.5 - 17.4) / 3.8
    const d = ix * ix + iy * iy
    if (d > 1 || y + 0.5 < brow(x) + 0.5) return null
    return d < 0.3 ? 'Y' : d < 0.62 ? 'G' : 'g'
  })
  for (let y = 15; y <= 20; y++) if (y + 0.5 > brow(19) + 0.5) p.set(19, y, 'K')
  p.set(17, 19, 'W')
  p.set(17, 18, 'W')
  p.set(21, 16, 'W')
  // brow ridge (V shape)
  p.each((x, y) => (x >= 10 && x <= 25 && Math.abs(y + 0.5 - brow(x)) < 0.8 ? 'E' : null))
  // toothy grin, lit from below
  const yt = (x: number) => 24.4 - 0.032 * (x + 0.5 - 18) ** 2
  const yb = (x: number) => 29.6 - 0.062 * (x + 0.5 - 18) ** 2
  const mouth = new Set<string>()
  p.each((x, y) => {
    const c = y + 0.5
    if (x < 8 || x > 27 || yb(x) - yt(x) < 0.8 || c < yt(x) || c > yb(x)) return null
    mouth.add(`${x},${y}`)
    const fang = x === 12 || x === 23 ? 1.4 : 0
    const up = (x % 3 === 0 ? 0 : 1.7) + fang
    const lo = (x + 1) % 3 === 0 ? 0 : 1.3
    if (c < yt(x) + up) return x % 3 === 2 ? 't' : 'T'
    if (c > yb(x) - lo) return (x + 1) % 3 === 2 ? 't' : 'T'
    if (c > yb(x) - 2.2 && Math.abs(x + 0.5 - 18) < 4) return Math.abs(x + 0.5 - 18) > 2.6 ? 'p' : 'P'
    return 'M'
  })
  p.each((x, y, cur) => {
    if (!cur || mouth.has(`${x},${y}`)) return null
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => mouth.has(`${x + dx},${y + dy}`)) ? 'K' : null
  })
  p.outline('K')
  const S = 5
  return {
    viewW: 180,
    viewH: 175,
    paths: [
      ...p.paths(
        {
          K: '#14030a', E: '#3e0512', D: '#7a0c1e', R: '#c0182c', L: '#f0453a', H: '#ff9a5e', O: '#ff7a2a', Y: '#ffd36a',
          b: '#fff1d0', B: '#d8b07a', n: '#7a5230', W: '#ffffff', w: '#c9b9b0', v: '#9c8c86', G: '#62ff4e', g: '#1c9a30',
          M: '#2a0208', T: '#fffaf0', t: '#d4c19c', P: '#ff7a6a', p: '#c03a4c',
        },
        S,
      ),
      // emissive eye bloom + warm bounce on the lit cheek
      glow(19 * S, 17.4 * S, 34, '120,255,90', 0.5),
      glow(19 * S, 17.4 * S, 12, '220,255,180', 0.55),
      { d: ell(cx * S, cy * S, rx * S, ry * S), fill: rad(4 * S, 33 * S, 150, 0, 'rgba(255,170,60,0.4)', 0.5, 'rgba(255,170,60,0.12)', 1, 'rgba(255,170,60,0)'), blend: 'screen' },
    ],
  }
}

// Pointy spires: the tallest of several triangles at each x.
function spires(x: number, peaks: [number, number, number][]): number {
  return Math.max(0, ...peaks.map(([px, h, slope]) => h - Math.abs(x - px) * slope))
}

// Full-card hell cavern. Key light = lava pool at the lower-left (it throws the
// demon's shadow up onto the back wall); a fire curtain behind gives the rim.
export function hellScene(): Art {
  const paths: VectorPath[] = []
  const r = rng(66)
  // back wall, warm-lit from the lava below-left
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(18, 112, 175, 0, 'rgba(255,120,40,0.6)', 0.45, 'rgba(150,25,10,0.28)', 1, 'rgba(0,0,0,0)'), blend: 'screen' })
  // wall texture: faint stepped strata
  paths.push({ d: stepped(160, 2.5, 30, (x) => 6 + 3 * Math.sin(x * 0.21) + 2 * Math.sin(x * 0.57), true), fill: 'rgba(0,0,0,0.12)', blend: 'multiply' })
  paths.push({ d: stepped(160, 2.5, 52, (x) => 5 + 3 * Math.sin(x * 0.17 + 2) + 2 * Math.sin(x * 0.7), true), fill: 'rgba(0,0,0,0.1)', blend: 'multiply' })
  // the demon's shadow, cast up and to the right on the wall
  for (let i = 0; i < 5; i++) {
    const k = 1 + i * 0.07
    const sx = 120
    const sy = 24
    const d = ell(sx, sy, 27 * k, 24 * k) + poly([sx - 20 * k, sy - 14 * k, sx - 30 * k, sy - 40 * k, sx - 12 * k, sy - 20 * k]) + poly([sx + 20 * k, sy - 14 * k, sx + 26 * k, sy - 42 * k, sx + 10 * k, sy - 22 * k])
    paths.push({ d, fill: 'rgba(30,0,8,0.22)', blend: 'multiply' })
  }
  // stalactites: far (dim) then near (dark)
  paths.push({ d: stepped(160, 2.5, -1, (x) => spires(x, [[8, 16, 1.4], [30, 10, 1.1], [52, 18, 1.6], [76, 9, 1], [98, 14, 1.5], [124, 20, 1.2], [150, 15, 1.4]]) + 3, true), fill: 'rgba(30,4,8,0.75)' })
  paths.push({ d: stepped(160, 2.5, -1, (x) => spires(x, [[2, 22, 1.2], [20, 12, 1.4], [62, 8, 1.2], [138, 10, 1.3], [158, 24, 1.1]]) + 1, true), fill: '#120205' })
  // pixel lava fall on the right, with bloom
  paths.push(glow(144, 66, 36, '255,120,30', 0.5))
  const lf = new Pix(8, 33)
  for (let y = 0; y < 33; y++) {
    const o = Math.round(Math.sin(y * 0.45) * 0.8 + (y > 26 ? (y - 26) * 0.3 : 0))
    const w = 3 + (y > 26 ? Math.floor((y - 26) / 2) : 0)
    for (let x = -w; x <= w; x++) {
      const a = Math.abs(x)
      lf.set(4 + x + o, y, a === w ? 'R' : a === w - 1 ? 'O' : a === 0 && (y % 6) < 3 ? 'W' : (y + x * 3) % 9 === 0 ? 'O' : 'Y')
    }
  }
  paths.push(...lf.paths({ R: '#d8321a', O: '#ff8a24', Y: '#ffd25a', W: '#fff6c8' }, 2.5, 133, 0))
  // rock pillars at the sides, rim-lit on the lava-facing side
  const pillarL = stepped(160, 2.5, 101, (x) => (x < 14 ? 78 - x * 1.2 : 0))
  paths.push({ d: pillarL, fill: lin(0, 0, 18, 0, 0, '#2a0806', 1, '#120204') })
  const ledge = stepped(160, 2.5, 101, (x) => (x > 100 ? spires(x, [[124, 28, 0.9], [156, 34, 0.6]]) : 0))
  paths.push({ d: ledge, fill: lin(100, 70, 160, 101, 0, '#3a0d08', 0.5, '#1c0506', 1, '#0c0103') })
  paths.push(rim(ledge, 1.6, 150, 90, 104, 74, '255,140,50', 0.9, 0.3))
  // fire curtain behind the floor line: back-lights the demon
  const cell = 2.5
  const back = new Pix(64, 14)
  for (let x = 0; x < 64; x++) {
    const h = Math.round(6 + 3 * Math.sin(x * 0.4 + 1) + 2.5 * Math.sin(x * 1.1) + (x > 20 && x < 44 ? 3 : 0))
    for (let y = 0; y < h; y++) back.set(x, 13 - y, y < h * 0.4 ? 'O' : y < h * 0.75 ? 'R' : 'D')
  }
  paths.push(...back.paths({ D: '#7a0c14', R: '#c8261a', O: '#ff7a1f' }, cell, 0, 82 - 14 * cell).map((q) => ({ ...q, alpha: 0.85 })))
  paths.push(glow(80, 80, 60, '255,90,20', 0.35))
  // volumetric rays rising from the lava, fanning up-right
  ;[[0, 12, 0.07], [18, 30, 0.05], [34, 44, 0.06]].forEach(([a0, a1, o]) =>
    paths.push({ d: poly([a0, 101, a1, 101, 160, (a1 - 60) * 0.6, 160, (a0 - 80) * 0.6]), fill: lin(0, 101, 120, 0, 0, `rgba(255,180,90,${o * 2})`, 1, 'rgba(255,180,90,0)'), blend: 'screen' }),
  )
  // floor of dark rock with glowing pixel cracks
  const floor = stepped(160, 2.5, 101, (x) => 18 + (x > 90 ? 1 : 0) - (x < 50 ? 1 : 0))
  paths.push({ d: floor, fill: lin(0, 80, 0, 101, 0, '#3a0c08', 1, '#100204') })
  paths.push(rim(floor, 0.9, 0, 101, 0, 80, '255,170,80', 0.8, 0.7))
  // thin glowing seams + lit rock slabs on the floor
  const seams = rect(66, 87.5, 12.5, 1.25) + rect(77.5, 88.75, 6.25, 1.25) + rect(104, 92.5, 15, 1.25) + rect(118.75, 91.25, 7.5, 1.25) + rect(134, 86.25, 12.5, 1.25) + rect(88, 97.5, 10, 1.25)
  paths.push({ d: seams, fill: 'rgba(255,120,30,0.5)', stroke: 'rgba(255,120,30,0.35)', sw: 2, blend: 'screen' })
  paths.push({ d: seams, fill: '#ffc23a' })
  paths.push({ d: rect(92, 82.5, 10, 2.5) + rect(122, 84, 12.5, 2.5) + rect(146, 90, 10, 2.5), fill: 'rgba(255,150,80,0.18)', blend: 'screen' })
  // contact shadow + AO on the floor under the floating demon
  paths.push(...castShadow(84, 86, 24, 3, 0.6, '20,0,5'))
  // lava pool in the foreground-left: the key light
  const pool = stepped(160, 2.5, 101, (x) => (x < 88 ? 13 + 2 * Math.sin(x * 0.15) - Math.max(0, x - 70) * 0.6 : 0))
  paths.push(glow(30, 96, 70, '255,140,40', 0.55))
  paths.push({ d: pool, fill: lin(0, 86, 0, 101, 0, '#fff3b0', 0.3, '#ffc53a', 0.7, '#ff7a1a', 1, '#e0401a') })
  paths.push({ d: rect(15, 95, 7.5, 2.5) + rect(17.5, 92.5, 2.5, 2.5) + rect(45, 97.5, 10, 2.5) + rect(65, 95, 5, 2.5), fill: '#b8301a' })
  paths.push({ d: rect(5, 90, 5, 1.2) + rect(30, 92.5, 7.5, 1.2) + rect(55, 91.25, 5, 1.2), fill: '#fffbe0', alpha: 0.7 })
  // pixel flames licking up from the pool
  const pf = new Pix(36, 16)
  for (let x = 0; x < 36; x++) {
    const base = Math.max(0, 9 - x * 0.18) + 3 * Math.sin(x * 0.7 + 1) + 2 * Math.sin(x * 1.6)
    ;([['D', 1, 1], ['R', 0.75, 5], ['O', 0.52, 9], ['Y', 0.3, 13]] as [string, number, number][]).forEach(([c, k, seed]) => {
      const rr = rng(seed * 100 + x)
      const hgt = Math.round(base * k + (rr() - 0.4) * 2)
      for (let y = 0; y < hgt; y++) pf.set(x, 15 - y, c)
    })
  }
  paths.push(...pf.paths({ D: '#b3141c', R: '#ec3a1c', O: '#ff9a24', Y: '#ffe27a' }, cell, -2, 92 - 16 * cell))
  // embers drifting up-right
  const byC: Record<string, string> = {}
  for (let i = 0; i < 50; i++) {
    const t = r()
    const x = Math.round((8 + t * 140 + (r() - 0.5) * 30) / cell) * cell
    const y = Math.round((92 - t * 80 - r() * 14) / cell) * cell
    if (Math.abs(x - 80) < 30 && y > 8 && y < 76) continue
    const s = r() < 0.3 ? cell : cell * 0.6
    const c = r() < 0.4 ? '#ffe27a' : r() < 0.6 ? '#ff9a24' : '#ff4a2a'
    byC[c] = (byC[c] ?? '') + rect(x, y, s, s)
  }
  Object.entries(byC).forEach(([c, d]) => paths.push({ d, fill: c }))
  // low heat haze + vignette
  paths.push({ d: rect(0, 62, 160, 24), fill: lin(0, 62, 0, 86, 0, 'rgba(255,90,40,0)', 0.6, 'rgba(255,90,40,0.12)', 1, 'rgba(255,90,40,0)'), blend: 'screen' })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(70, 56, 105, 0.45, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.7)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Blue speedy hedgehog ----------------------------------------------------
const HB = '#2f74e8' // hedgehog blue
const HB_D = '#1a479f'
const PEACH = '#f7c99b'

function sneaker(x: number, y: number, rot: number, s = 1): VectorPath[] {
  const t = (d: string) => xf(d, x, y, rot, s)
  return [
    { d: t('M-9 -18 L7 -18 L7 -8 L-9 -8 Z'), fill: lin(x - 9 * s, 0, x + 7 * s, 0, 0, '#ffffff', 1, '#d7dde6'), stroke: INK, sw: 3 },
    { d: t('M-13 -4 Q-13 -13 0 -12 Q15 -11 25 -5 Q35 1 33 8 L-15 8 Q-18 2 -13 -4 Z'), fill: lin(x, y - 13 * s, x, y + 8 * s, 0, '#ff5a4d', 0.55, '#e0262a', 1, '#a3141c'), stroke: INK, sw: 3.5 },
    core(t('M-13 -4 Q-13 -13 0 -12 Q15 -11 25 -5 Q35 1 33 8 L-15 8 Q-18 2 -13 -4 Z'), x - 10, y - 14, x + 20, y + 10, '90,0,30', 0.5),
    { d: t('M-3 -12 Q2 -12 7 -11 L4 7 L-6 7 Z'), fill: lin(x, y - 12 * s, x, y + 7 * s, 0, '#ffffff', 1, '#cfd6df'), stroke: INK, sw: 2.5 },
    { d: t('M-3 -3 L5 -3 L4.5 2 L-3.5 2 Z'), fill: '#f5c518', stroke: INK, sw: 1.8 },
    { d: t('M-16 6 L34 6 Q36 12 29 13 L-12 13 Q-18 12 -16 6 Z'), fill: lin(x, y + 6 * s, x, y + 13 * s, 0, '#ffffff', 1, '#b9c2cc'), stroke: INK, sw: 3 },
    gloss(t('M11 -8 Q19 -6 25 -2'), 2.6, 0.85),
    { d: t('M14 -7 L17 -6.5'), stroke: '#ffffff', sw: 2.4 },
  ]
}

function glove(x: number, y: number, rot: number, s = 1): VectorPath[] {
  const t = (d: string) => xf(d, x, y, rot, s)
  return [
    { d: t('M-14 -7 Q-16 0 -14 7 L-7 7 Q-9 0 -7 -7 Z'), fill: '#eef1f5', stroke: INK, sw: 3 },
    { d: t('M-7 -9 Q3 -13 9 -6 Q13 0 9 7 Q3 13 -7 9 Q-10 0 -7 -9 Z'), fill: radLit(x, y, 12 * s, 0, '#ffffff', 0.7, '#f1f3f7', 1, '#c9d0da'), stroke: INK, sw: 3.5 },
    core(t('M-7 -9 Q3 -13 9 -6 Q13 0 9 7 Q3 13 -7 9 Q-10 0 -7 -9 Z'), x - 8, y - 10, x + 9, y + 10, '70,80,140', 0.45),
    { d: t('M1 -6 Q6 -5 7 -1 M1 1 Q6 2 6 6'), stroke: 'rgba(27,23,18,0.55)', sw: 1.8 },
  ]
}

export function hedgehog(): Art {
  const QUILL = lin(20, 24, 120, 130, 0, '#64a4ff', 0.45, HB, 1, HB_D)
  const HEAD = radLit(126, 72, 46, 0, '#72aeff', 0.55, HB, 1, '#1c4dab')
  const quills =
    'M136 32 C118 10 60 4 24 28 C54 36 80 48 98 54 C70 40 30 42 6 66 C40 72 70 78 92 80 C64 72 34 84 14 110 C48 104 76 102 98 100 C80 104 62 120 50 140 C80 132 104 120 120 108 Z'
  const paths: VectorPath[] = [
    // speed streaks
    { d: 'M0 92 H8 M30 150 H70', stroke: 'rgba(255,255,255,0.85)', sw: 4 },
    ...castShadow(152, 194, 62, 6, 0.5, '10,50,20'),
    ...castShadow(168, 191, 22, 3, 0.45, '5,30,10'),
    // far arm reaching forward (behind the body)
    ...limb('M138 118 Q154 128 168 124', PEACH, 9),
    ...glove(173, 123, -8, 0.9),
    // far leg kicked back
    ...limb('M114 146 Q100 160 82 158', HB, 10),
    ...sneaker(78, 156, 140, 0.9),
    // quills with a shaded underside and lit upper edge
    { d: quills, fill: QUILL, stroke: INK, sw: 4.5 },
    {
      d:
        'M98 54 C80 48 54 36 24 28 C56 32 82 40 104 46 Z M92 80 C70 78 40 72 6 66 C40 70 70 72 96 72 Z' +
        'M98 100 C76 102 48 104 14 110 C46 100 74 96 98 92 Z M120 108 C104 120 80 132 50 140 C78 126 98 114 114 102 Z',
      fill: 'rgba(10,30,95,0.38)',
    },
    core(quills, 40, 14, 110, 130, '10,20,80', 0.6, 0.35),
    rim(quills, 2.6, 60, 20, 100, 140, '190,235,255', 0.9, 0.6),
    gloss('M114 22 Q86 13 52 22', 3.4, 0.6),
    gloss('M84 53 Q58 50 30 62', 3, 0.5),
    gloss('M80 83 Q56 85 36 99', 2.8, 0.45),
    gloss('M86 108 Q72 116 62 128', 2.6, 0.4),
    // torso + belly
    { d: 'M108 108 Q98 138 112 152 Q128 162 144 148 Q152 128 144 104 Z', fill: lin(100, 0, 150, 0, 0, '#4c8cf5', 1, HB_D), stroke: INK, sw: 4 },
    { d: 'M124 112 Q116 134 126 148 Q138 152 142 138 Q144 122 138 108 Z', fill: lin(0, 108, 0, 152, 0, '#ffe0bd', 1, '#e9ad78') },
    core('M108 108 Q98 138 112 152 Q128 162 144 148 Q152 128 144 104 Z', 104, 108, 148, 152, '20,20,80', 0.55),
    // near leg planted forward
    ...limb('M132 148 Q150 150 156 158 Q162 166 160 174', HB, 10),
    ...sneaker(162, 178, -6, 1.02),
    // ears (behind the head)
    { d: 'M142 40 Q150 22 162 10 Q168 28 164 46 Z', fill: lin(0, 10, 0, 46, 0, '#3f82ef', 1, HB_D), stroke: INK, sw: 4 },
    { d: 'M106 42 Q108 20 116 4 Q130 18 138 36 Z', fill: lin(0, 4, 0, 42, 0, '#64a4ff', 1, HB), stroke: INK, sw: 4 },
    { d: 'M114 36 Q115 24 118 15 Q125 24 129 34 Z', fill: lin(0, 15, 0, 36, 0, '#ffd8b4', 1, '#e8a878') },
    // head
    { d: circ(126, 72, 42), fill: HEAD, stroke: INK, sw: 4.5 },
    core(circ(126, 72, 42), 96, 40, 160, 110, '10,20,90', 0.65, 0.42),
    rim(circ(126, 72, 42), 3, 110, 50, 160, 112, '200,240,255', 0.95, 0.55),
    gloss('M92 64 Q96 42 116 34', 4.5, 0.6),
    // muzzle + smile
    { d: 'M116 98 Q120 85 138 85 Q156 81 170 86 Q183 91 181 105 Q177 120 156 121 Q132 123 122 114 Q112 106 116 98 Z', fill: lin(0, 86, 0, 123, 0, '#ffe4c8', 0.6, PEACH, 1, '#e09c68'), stroke: INK, sw: 4 },
    core('M116 98 Q120 85 138 85 Q156 81 170 86 Q183 91 181 105 Q177 120 156 121 Q132 123 122 114 Q112 106 116 98 Z', 130, 86, 170, 124, '140,50,20', 0.5),
    gloss('M123 96 Q129 89 140 89', 2.4, 0.75),
    { d: 'M146 111 Q160 117 172 107', stroke: INK, sw: 3.5 },
    { d: 'M170 104 Q175 105 175 110', stroke: INK, sw: 2.5 },
    // nose
    { d: ell(179, 92, 6, 5.2), fill: radLit(179, 92, 6, 0, '#5a5560', 1, '#0d0d10'), stroke: INK, sw: 2.5 },
    { d: circ(177.3, 90, 1.6), fill: 'rgba(255,255,255,0.85)' },
    // eyes: ink pass then white fill so the two ovals merge
    { d: ell(142, 65, 13, 18.5) + ell(161, 66, 9.5, 17), stroke: INK, sw: 7.5 },
    { d: ell(142, 65, 13, 18.5), fill: radLit(150, 61, 28, 0, '#ffffff', 1, '#d8e2ee') },
    { d: ell(161, 66, 9.5, 17), fill: radLit(150, 61, 28, 0, '#ffffff', 1, '#d8e2ee') },
    { d: 'M145 45 Q151 53 152.5 62 Q155 53 160 47 L158 41 L146 41 Z', fill: HEAD },
    { d: 'M145 46.5 Q151 53 152.5 62 Q155 53 159.5 48', stroke: INK, sw: 3 },
    { d: ell(149, 69, 7, 10.5), fill: radLit(149, 69, 10, 0, '#9af286', 1, '#1f8a3a'), stroke: INK, sw: 1.6 },
    { d: ell(166, 69.5, 5.4, 10), fill: radLit(166, 69.5, 9, 0, '#9af286', 1, '#1f8a3a'), stroke: INK, sw: 1.6 },
    { d: ell(150.6, 70, 3.6, 6) + ell(167.3, 70.5, 2.9, 5.6), fill: INK },
    { d: circ(152.8, 65, 2.6) + circ(169, 65.5, 2.1), fill: '#ffffff' },
    { d: circ(147, 75, 1.2) + circ(164.5, 75, 1), fill: 'rgba(255,255,255,0.85)' },
    // near arm swinging back
    ...limb('M122 118 Q106 132 92 124', PEACH, 9),
    ...glove(87, 121, 200, 0.95),
  ]
  return { viewW: 220, viewH: 200, paths }
}

// Spinning gold rings scattered around the hero, each with a warm bloom.
export function goldRings(): Art {
  const spots: [number, number, number][] = [
    [10, 64, 0.2], [14, 50, 0.7], [22, 38, 1.2], [33, 28, 1.7], [128, 28, 0.4], [139, 39, 0.9], [148, 52, 1.4],
  ]
  const paths: VectorPath[] = []
  spots.forEach(([x, y, ph]) => {
    const ry = 4.6
    const rx = Math.max(0.7, ry * Math.abs(Math.cos(ph)))
    paths.push(glow(x, y, 10, '255,210,60', 0.5))
    paths.push({ d: ell(x, y, rx, ry), stroke: INK, sw: 3.2 })
    paths.push({ d: ell(x, y, rx, ry), stroke: lin(x - rx, y - ry, x + rx, y + ry, 0, '#fff6b8', 0.4, '#f7c81e', 1, '#b8720a'), sw: 1.9 })
    paths.push({ d: `M${x - rx * 0.8} ${y - ry * 0.35} Q${x - rx * 0.6} ${y - ry * 0.95} ${x} ${y - ry}`, stroke: 'rgba(255,255,255,0.95)', sw: 0.6 })
    paths.push({ d: star(x - rx * 0.6, y - ry * 0.75, 1.8, 0.4, 4, 0), fill: '#ffffff' })
  })
  return { viewW: 160, viewH: 101, paths }
}

// Seaside hill-zone backdrop: far mountains, sea, mid hills, checkered ground.
export function hillZone(): Art {
  const paths: VectorPath[] = []
  // key light: low sun at the upper-left, with bloom and rays
  ;[[-4, 30, 0.12], [40, 62, 0.08], [86, 104, 0.07], [130, 140, 0.05]].forEach(([a0, a1, o]) =>
    paths.push({ d: poly([4, 4, a1, 101, a0, 101]), fill: lin(4, 4, 90, 101, 0, `rgba(255,250,220,${o * 2.2})`, 1, 'rgba(255,250,220,0)'), blend: 'screen' }),
  )
  paths.push(glow(8, 6, 46, '255,248,220', 0.75))
  paths.push({ d: circ(8, 6, 7), fill: radLit(8, 6, 7, 0, '#ffffff', 1, '#fff2b0') })
  paths.push(...softCloud(18, 10, 0.32, 0.55), ...softCloud(144, 16, 0.42, 0.9), ...softCloud(84, 8, 0.28, 0.7))
  // far mountains (hazy)
  paths.push({ d: 'M0 64 L0 52 Q10 44 18 50 L28 40 Q34 36 40 42 L52 54 Q62 46 72 52 L84 44 Q90 40 96 46 L110 56 Q122 46 134 50 L146 38 Q152 34 158 42 L160 46 L160 64 Z', fill: lin(0, 36, 0, 64, 0, '#a9c9f2', 1, '#c9e2fa') })
  paths.push({ d: 'M28 40 Q34 36 40 42 L36 44 L32 41 Z M84 44 Q90 40 96 46 L92 47 L88 45 Z M146 38 Q152 34 158 42 L154 43 L150 40 Z', fill: '#f2f8ff' })
  paths.push({ d: rect(0, 40, 160, 26), fill: lin(0, 40, 0, 66, 0, 'rgba(230,245,255,0)', 1, 'rgba(230,245,255,0.45)') })
  // sea with shimmer
  paths.push({ d: rect(0, 60, 160, 14), fill: lin(0, 60, 0, 74, 0, '#5fb4f5', 1, '#2d7fd6') })
  paths.push({ d: 'M8 63 H22 M40 65 H48 M70 62 H86 M108 64 H118 M136 62 H150 M20 68 H30 M90 67 H100 M124 69 H140', stroke: 'rgba(255,255,255,0.7)', sw: 0.8 })
  // mid hills with dim checks + palms
  const mid = 'M-4 82 Q10 62 30 66 Q46 70 56 76 Q74 60 98 66 Q116 72 124 78 Q140 62 164 68 L164 86 L-4 86 Z'
  paths.push({ d: mid, fill: lin(0, 60, 0, 86, 0, '#5ccf63', 1, '#2f9e44') })
  let mc = ''
  for (let y = 74; y < 86; y += 4) for (let x = 0; x < 160; x += 4) if (((x + y) / 4) % 2 === 0) mc += rect(x, y, 4, 4)
  paths.push({ d: mc, fill: 'rgba(20,90,30,0.18)' })
  paths.push({ d: 'M-4 82 Q10 62 30 66 Q46 70 56 76 Q74 60 98 66 Q116 72 124 78 Q140 62 164 68', stroke: 'rgba(255,255,255,0.45)', sw: 0.7 })
  const palm = (x: number, y: number, s: number): VectorPath[] => [
    { d: `M${x} ${y} Q${x + 2 * s} ${y - 10 * s} ${x - 1 * s} ${y - 20 * s}`, stroke: '#7a4a24', sw: 1.6 * s },
    {
      d:
        `M${x - s} ${y - 20 * s} Q${x - 8 * s} ${y - 24 * s} ${x - 12 * s} ${y - 17 * s} Q${x - 7 * s} ${y - 20 * s} ${x - s} ${y - 19 * s} Z` +
        `M${x - s} ${y - 20 * s} Q${x + 7 * s} ${y - 25 * s} ${x + 11 * s} ${y - 17 * s} Q${x + 6 * s} ${y - 20 * s} ${x - s} ${y - 19 * s} Z` +
        `M${x - s} ${y - 20 * s} Q${x - 4 * s} ${y - 28 * s} ${x - 9 * s} ${y - 27 * s} Q${x - 4 * s} ${y - 26 * s} ${x - s} ${y - 20 * s} Z` +
        `M${x - s} ${y - 20 * s} Q${x + 4 * s} ${y - 28 * s} ${x + 9 * s} ${y - 26 * s} Q${x + 4 * s} ${y - 25 * s} ${x - s} ${y - 20 * s} Z`,
      fill: '#2a8a3c',
    },
  ]
  paths.push(...palm(142, 70, 0.9), ...palm(64, 72, 0.7))
  // foreground: grass ledge over a checkered dirt bank
  const top = 81
  paths.push({ d: rect(0, top, 160, 22), fill: '#a8571b' })
  let ck = ''
  for (let y = 0; y < 3; y++) for (let x = -1; x < 17; x++) if ((x + y) % 2 === 0) ck += rect(x * 10 + 4, top + 2 + y * 8, 10, 8)
  paths.push({ d: ck, fill: '#e08b3a' })
  paths.push({ d: rect(0, top, 160, 22), fill: lin(0, top, 0, 101, 0, 'rgba(0,0,0,0)', 1, 'rgba(60,20,0,0.45)') })
  let grass = `M0 ${top - 2}`
  for (let x = 0; x <= 160; x += 8) grass += `L${x} ${top - 2}`
  grass += `L160 ${top + 3}`
  for (let x = 160; x >= 0; x -= 8) grass += `Q${x - 4} ${top + 8} ${x - 8} ${top + 3}`
  grass += 'Z'
  paths.push({ d: grass, fill: lin(0, top - 2, 0, top + 8, 0, '#7ee35b', 0.5, '#43c03a', 1, '#2b8a2e'), stroke: INK, sw: 0.9 })
  paths.push({ d: `M0 ${top - 1} H160`, stroke: 'rgba(255,255,255,0.55)', sw: 0.7 })
  return { viewW: 160, viewH: 101, paths }
}

// ---- 1-UP mushroom and "?" block (pixel art) ---------------------------------
export function pixelMushroom(): Art {
  const p = new Pix(24, 22)
  const cx = 12
  // stem
  const half = (y: number) => (y <= 18 ? 5.4 : y === 19 ? 4.8 : 3.8)
  p.each((x, y) => {
    if (y < 12 || y > 20) return null
    const dx = x + 0.5 - cx
    if (Math.abs(dx) > half(y)) return null
    if (y === 12) return 'r'
    const v = -dx / half(y) * 0.6 - (y - 16) * 0.12
    return pick(v, [[0.25, 'q'], [-0.35, 's'], [-9, 'r']])
  })
  // eyes
  ;[[9, 14], [10, 14], [9, 15], [10, 15], [9, 16], [10, 16], [13, 14], [14, 14], [13, 15], [14, 15], [13, 16], [14, 16]].forEach(([x, y]) => p.set(x, y, 'K'))
  p.set(9, 14, 'e')
  p.set(13, 14, 'e')
  // cap dome + rounded rim
  const spots: [number, number, number][] = [[12, 5.2, 3.4], [3.2, 9.6, 2.6], [20.8, 9.6, 2.6], [7.4, 2.4, 1.3], [16.8, 2.6, 1.2]]
  p.each((x, y) => {
    const px = x + 0.5
    const py = y + 0.5
    const nx = (px - cx) / 11.6
    const ny = py <= 10.5 ? (py - 10.5) / 10 : (py - 10.5) / 2.6
    if (nx * nx + ny * ny > 1) return null
    const v = lambert(nx, Math.min(ny, 0.2) * 0.9 - 0.1) - (ny > 0.3 ? 0.45 : 0)
    const sp = spots.find(([sx, sy, sr]) => (px - sx) ** 2 + (py - sy) ** 2 < sr * sr)
    if (sp) return pick(v, [[0.6, 'W'], [0.15, 'w'], [-9, 'v']])
    return pick(v, [[0.82, 'h'], [0.42, 'G'], [-0.05, 'g'], [-9, 'd']])
  })
  // cool sky rim on the side away from the sun, white specular on the cap
  p.each((x, y, cur) => {
    if (!cur || cur === 'K' || cur === 'e') return null
    if (!p.get(x + 1, y) && y >= 3) return y <= 12 ? (cur === 'W' || cur === 'w' || cur === 'v' ? 'c' : 'm') : 'c'
    if (!p.get(x + 1, y + 1) && !p.get(x, y + 1) && y <= 12 && x > 12) return 'm'
    return null
  })
  ;[[6, 3], [7, 3], [6, 4], [12, 3], [13, 3]].forEach(([x, y]) => p.set(x, y, 'e'))
  p.outline('K')
  return {
    viewW: 168,
    viewH: 154,
    paths: p.paths(
      { K: '#17120c', h: '#8ef07a', G: '#34c24f', g: '#1d8f3a', d: '#0f5a26', W: '#ffffff', w: '#e1e8e3', v: '#c3d1c8', q: '#fff6e2', s: '#f5d6a4', r: '#d4a46a', e: '#ffffff', c: '#d8f4ff', m: '#7fd6c8' },
      7,
    ),
  }
}

export function questionBlock(): Art {
  const p = new Pix(16, 16)
  p.each((x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return 'K'
    if (y === 1 || x === 1) return x === 14 || y === 14 ? 'd' : 'h'
    if (y === 14 || x === 14) return 'D'
    if (y === 13 || x === 13) return 'd'
    return x + y < 9 ? 'y' : 'Y'
  })
  ;[[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([x, y]) => {
    p.set(x, y, 'D')
    p.set(x + 1, y + 1, 'd')
  })
  const q = ['..XXXX..', '.XX..XX.', '.XX..XX.', '.....XX.', '....XX..', '...XX...', '...XX...', '........', '...XX...']
  q.forEach((row, j) => [...row].forEach((c, i) => c === 'X' && p.set(4 + i + 1, 3 + j + 1, 'D')))
  q.forEach((row, j) => [...row].forEach((c, i) => c === 'X' && p.set(4 + i, 3 + j, i < 3 && j < 3 ? 'W' : 'w')))
  return { viewW: 100, viewH: 100, paths: p.paths({ K: '#2a1300', D: '#8a4500', d: '#c97a00', Y: '#f8b400', y: '#ffcc33', h: '#fff1b0', W: '#ffffff', w: '#fff1d6' }, 6.25) }
}

export function brickBlock(): Art {
  const p = new Pix(16, 16)
  p.each((x, y) => {
    const row = Math.floor(y / 4)
    const off = row % 2 ? 4 : 0
    const bx = (x + off) % 8
    if (y % 4 === 3 || bx === 7) return 'K'
    if (y % 4 === 0 || bx === 0) return 'h'
    if (y % 4 === 2 || bx === 6) return 'd'
    return 'B'
  })
  p.each((x, y) => (x === 0 || y === 0 ? 'h' : x === 15 || y === 15 ? 'K' : null))
  return { viewW: 100, viewH: 100, paths: p.paths({ K: '#2a0d00', h: '#ff9a5c', B: '#cf5a1e', d: '#8f3010' }, 6.25) }
}

// Green warp pipe (pixel-banded), lit from the left.
export function warpPipe(): Art {
  const band = (x: number, w: number, y: number, h: number): VectorPath[] => {
    const cols = ['#bff59a', '#7fe05a', '#3fbf3a', '#2a9a2e', '#1f7a26', '#155a1c']
    const ws = [0.08, 0.1, 0.32, 0.2, 0.18, 0.12]
    let cx = x
    return ws.map((k, i) => {
      const d = rect(cx, y, w * k + 0.3, h)
      cx += w * k
      return { d, fill: cols[i] }
    })
  }
  return {
    viewW: 60,
    viewH: 100,
    paths: [
      ...band(8, 44, 22, 78),
      { d: rect(8, 22, 44, 78), stroke: '#0e2a10', sw: 2.4 },
      { d: rect(8, 22, 44, 8), fill: 'rgba(0,30,0,0.35)', blend: 'multiply' },
      ...band(2, 56, 2, 20),
      { d: rect(2, 2, 56, 20), stroke: '#0e2a10', sw: 2.6 },
      { d: rect(6, 5, 44, 2), fill: 'rgba(255,255,255,0.6)' },
    ],
  }
}

// Pixel cloud: union of circles on a coarse grid, top-lit, outlined.
function pixCloud(cx: number, cy: number, cell: number, puffs: [number, number, number][], outline = '#5c7fb8'): VectorPath[] {
  const w = 28
  const h = 14
  const p = new Pix(w, h)
  p.each((x, y) => {
    const inside = puffs.some(([px, py, pr]) => (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 < pr * pr) || (y >= 8 && y <= 11 && x >= 3 && x <= 24)
    if (!inside) return null
    return y > 9.5 ? 'b' : y > 8.5 ? 'm' : 'W'
  })
  p.outline('K')
  return p.paths({ K: outline, b: '#bcd4f5', m: '#e6f0ff', W: '#ffffff' }, cell, cx - (w * cell) / 2, cy - (h * cell) / 2)
}

// Pixel hill with highlight dots, quantised to a grid.
function pixHill(cx: number, base: number, r: number, cell: number, tones: [string, string, string, string]): VectorPath[] {
  const cols = Math.ceil((2 * r) / cell) + 2
  const rows = Math.ceil(r / cell) + 1
  const p = new Pix(cols, rows)
  p.each((x, y) => {
    const px = (x + 0.5) * cell - cell - r
    const py = (y + 0.5) * cell - rows * cell
    if (px * px + py * py > r * r) return null
    const v = lambert(px / r, (py + r * 0.35) / r)
    return v > 0.78 ? 'h' : v > 0.25 ? 'G' : 'g'
  })
  p.outline('K')
  return p.paths({ K: tones[0], g: tones[1], G: tones[2], h: tones[3] }, cell, cx - r - cell, base - rows * cell)
}

// Sky scene: sun rays, pixel clouds, two planes of hills, bushes, brick floor,
// plus the cast shadows of the mushroom (centre) and the pipe (right).
export function mushroomKingdom(): Art {
  const paths: VectorPath[] = []
  paths.push({ d: rect(0, 0, 160, 101), fill: lin(0, 0, 0, 101, 0, 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,0.35)') })
  ;[[-6, 24, 0.1], [36, 58, 0.07], [84, 104, 0.06]].forEach(([a0, a1, o]) =>
    paths.push({ d: poly([0, 0, a1, 101, a0, 101]), fill: lin(0, 0, 80, 101, 0, `rgba(255,250,220,${o * 2.4})`, 1, 'rgba(255,250,220,0)'), blend: 'screen' }),
  )
  paths.push(glow(4, 2, 40, '255,250,225', 0.8))
  paths.push(...pixCloud(20, 10, 1.1, [[9, 7, 4.5], [15, 5, 5.5], [21, 8, 3.8]], '#8aa6d8'))
  paths.push(...pixCloud(142, 12, 1.2, [[9, 7, 4.5], [15, 5, 5.5], [21, 8, 3.8]], '#8aa6d8'))
  paths.push(...pixCloud(112, 34, 0.8, [[9, 7, 4.5], [15, 5, 5.5], [21, 8, 3.8]], '#9cb4e0'))
  // far hills (hazy) then near bushes
  paths.push(...pixHill(118, 84, 24, 2, ['#6f9fb0', '#8cbccb', '#9fcfd8', '#c2e6ea']))
  paths.push(...pixHill(18, 84, 20, 2, ['#6f9fb0', '#8cbccb', '#9fcfd8', '#c2e6ea']))
  paths.push({ d: rect(0, 58, 160, 26), fill: lin(0, 58, 0, 84, 0, 'rgba(220,240,255,0)', 1, 'rgba(220,240,255,0.35)') })
  paths.push(...pixHill(30, 84, 11, 2, ['#1f5f2a', '#2f9a3c', '#45bf52', '#8fe59a']))
  paths.push(...pixHill(108, 84, 9, 2, ['#1f5f2a', '#2f9a3c', '#45bf52', '#8fe59a']))
  // glow behind the "?" block + sparkles
  paths.push(glow(80, 20, 22, '255,220,120', 0.55))
  const spark = (x: number, y: number, k: number) => rect(x - k / 2, y - 2.5 * k, k, 5 * k) + rect(x - 2.5 * k, y - k / 2, 5 * k, k)
  paths.push({ d: spark(56, 44, 0.9) + spark(104, 52, 0.7) + spark(60, 64, 0.5) + spark(98, 36, 0.6) + spark(80, 34, 0.5), fill: '#ffffff' })
  paths.push(glow(56, 44, 5, '255,255,255', 0.6), glow(104, 52, 4, '255,255,255', 0.5))
  // bricks
  const top = 84
  const bw = 16
  const bh = 8.5
  let base = ''
  let hi = ''
  let lo = ''
  let mortar = ''
  for (let row = 0; row < 2; row++) {
    const y = top + row * bh
    for (let x = row % 2 ? -bw / 2 : 0; x < 160; x += bw) {
      base += rect(x, y, bw, bh)
      hi += rect(x + 1, y + 1, bw - 2, 1.2) + rect(x + 1, y + 1, 1.2, bh - 2)
      lo += rect(x + 1, y + bh - 2.2, bw - 2, 1.2) + rect(x + bw - 2.2, y + 1, 1.2, bh - 2)
      mortar += `M${x} ${y}V${y + bh}`
    }
    mortar += `M0 ${y}H160`
  }
  paths.push({ d: base, fill: '#cf5a1e' }, { d: hi, fill: '#ff9a5c' }, { d: lo, fill: '#8f3010' }, { d: mortar, stroke: '#2a0d00', sw: 1.1 })
  paths.push({ d: rect(0, top, 160, 101 - top), fill: lin(0, top, 0, 101, 0, 'rgba(0,0,0,0)', 1, 'rgba(40,10,0,0.4)'), blend: 'multiply' })
  // contact shadows / AO where the mushroom and the pipe meet the floor
  paths.push(...castShadow(86, top + 0.6, 26, 3.2, 0.6, '60,15,0'))
  paths.push(...castShadow(146, top + 0.6, 14, 2.6, 0.55, '60,15,0'))
  paths.push({ d: rect(0, top, 160, 1.2), fill: 'rgba(255,220,180,0.5)', blend: 'screen' })
  paths.push({ d: `M0 ${top}H160`, stroke: '#2a0d00', sw: 1.2 })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Hungry yellow eater in a neon maze ------------------------------------------
export function glouton(open = 36): Art {
  const a = (open * Math.PI) / 180
  const R = 50
  const c = 60
  const ux = c + R * Math.cos(a)
  const uy = c - R * Math.sin(a)
  const ly = c + R * Math.sin(a)
  const pie = `M${c + 4} ${c}L${ux.toFixed(2)} ${uy.toFixed(2)}A${R} ${R} 0 1 0 ${ux.toFixed(2)} ${ly.toFixed(2)}Z`
  const paths: VectorPath[] = [
    ...castShadow(68, 117, 42, 4.5, 0.7, '0,0,20'),
    { d: 'M-2 40 H10 M-6 60 H6 M-2 80 H10', stroke: 'rgba(255,230,0,0.55)', sw: 3.5 },
    { d: pie, fill: radLit(60, 60, 54, 0, '#fff7a8', 0.45, '#ffe11a', 0.85, '#f2b200', 1, '#c98a00') },
    // inner lips: the cut faces of the mouth, a touch darker
    { d: `M${c + 4} ${c}L${ux.toFixed(2)} ${uy.toFixed(2)}`, stroke: '#d99100', sw: 5 },
    { d: `M${c + 4} ${c}L${ux.toFixed(2)} ${ly.toFixed(2)}`, stroke: '#b97400', sw: 5 },
    core(pie, 30, 24, 96, 104, '150,60,0', 0.6, 0.35),
    rim(pie, 4, 40, 40, 100, 110, '90,140,255', 0.95, 0.55),
    { d: pie, stroke: INK, sw: 4.5 },
    gloss('M22 44 Q30 22 54 15', 5, 0.8),
    { d: circ(30, 32, 3), fill: 'rgba(255,255,255,0.8)' },
    // eye
    { d: ell(62, 30, 7.5, 9), fill: radLit(62, 30, 10, 0, '#ffffff', 1, '#d9dee8'), stroke: INK, sw: 2.6 },
    { d: ell(64.5, 31, 4, 5.4), fill: INK },
    { d: circ(66, 28.5, 1.8), fill: '#ffffff' },
    { d: circ(63, 34, 0.8), fill: 'rgba(255,255,255,0.8)' },
    { d: 'M52 17 Q61 13 72 18', stroke: INK, sw: 3 },
  ]
  return { viewW: 124, viewH: 124, paths }
}

export function ghost(color = '#ff3b3b', look = -1): Art {
  let skirt = 'M90 52 L90 96'
  const feet = 4
  const fw = 78 / feet
  for (let i = 0; i < feet; i++) {
    const x0 = 90 - i * fw
    skirt += `Q${(x0 - fw * 0.15).toFixed(1)} ${110} ${(x0 - fw * 0.5).toFixed(1)} ${108}Q${(x0 - fw * 0.85).toFixed(1)} ${106} ${(x0 - fw).toFixed(1)} ${i === feet - 1 ? 96 : 94}`
  }
  const body = skirt + 'L12 52 A39 39 0 0 1 90 52 Z'
  const ix = 4.5 * look
  return {
    viewW: 102,
    viewH: 120,
    paths: [
      ...castShadow(57, 116, 36, 3.5, 0.7, '0,0,20'),
      { d: body, fill: radLit(51, 52, 62, 0, shade(color, 0.45), 0.5, color, 1, shade(color, -0.45)) },
      core(body, 20, 20, 90, 110, '60,0,40', 0.6, 0.35),
      rim(body, 4, 40, 40, 96, 110, '90,140,255', 0.95, 0.55),
      { d: body, stroke: INK, sw: 4.5 },
      gloss('M20 46 Q24 26 42 18', 4.5, 0.6),
      { d: ell(36, 50, 11, 14) + ell(64, 50, 11, 14), fill: radLit(50, 48, 30, 0, '#ffffff', 1, '#d6dceb'), stroke: INK, sw: 2.6 },
      { d: circ(36 + ix, 53, 6.4) + circ(64 + ix, 53, 6.4), fill: radLit(50, 52, 20, 0, '#6f8bff', 1, '#1c2fc4') },
      { d: circ(36 + ix * 1.1, 53.5, 3.2) + circ(64 + ix * 1.1, 53.5, 3.2), fill: INK },
      { d: circ(38 + ix, 50.5, 1.8) + circ(66 + ix, 50.5, 1.8), fill: '#ffffff' },
    ],
  }
}

export function neonMaze(): Art {
  const walls =
    rrect(3, 3, 154, 95, 8) +
    rrect(14, 11, 34, 9, 4.5) + rrect(62, 11, 36, 9, 4.5) + rrect(112, 11, 34, 9, 4.5) +
    rrect(14, 81, 34, 9, 4.5) + rrect(62, 81, 36, 9, 4.5) + rrect(112, 81, 34, 9, 4.5)
  const paths: VectorPath[] = [
    { d: rect(0, 0, 160, 101), fill: rad(80, 52, 95, 0, '#18205a', 0.55, '#080b26', 1, '#020208') },
    // faint floor grid for depth
    { d: Array.from({ length: 21 }, (_, i) => `M${i * 8} 0V101`).join('') + Array.from({ length: 13 }, (_, i) => `M0 ${i * 8 + 2}H160`).join(''), stroke: 'rgba(80,110,255,0.07)', sw: 0.4 },
    // neon tubes with bloom
    { d: walls, stroke: 'rgba(60,90,255,0.22)', sw: 8, blend: 'lighter' },
    { d: walls, stroke: 'rgba(70,100,255,0.35)', sw: 4.6, blend: 'lighter' },
    { d: walls, stroke: '#3a5cff', sw: 3 },
    { d: walls, stroke: '#04051a', sw: 1.2 },
    { d: walls, stroke: 'rgba(190,205,255,0.7)', sw: 0.35 },
  ]
  // small dots in the side corridors
  let dots = ''
  const dot = (x: number, y: number) => (dots += circ(x, y, 0.85))
  for (let y = 26; y <= 74; y += 8) dot(8.5, y), dot(151.5, y)
  for (const x of [55, 105]) dot(x, 15.5), dot(x, 85.5)
  paths.push({ d: dots, fill: '#ffd9ae', alpha: 0.8 })
  // pellets along the main corridor + power pellet, each with bloom
  const px = [60, 69, 78, 87]
  px.forEach((x) => paths.push(glow(x, 50.5, 3.6, '255,205,150', 0.5)))
  paths.push({ d: px.map((x) => circ(x, 50.5, 1.4)).join(''), fill: '#ffe2c0' })
  paths.push(glow(97, 50.5, 9, '255,220,170', 0.6, 'lighter'))
  paths.push({ d: circ(97, 50.5, 2.9), fill: radLit(97, 50.5, 2.9, 0, '#ffffff', 1, '#ffc58a') })
  // the hero's warm light spilling on the floor + CRT scanlines
  paths.push(glow(46, 52, 34, '255,220,60', 0.16))
  paths.push({ d: Array.from({ length: 50 }, (_, i) => rect(0, i * 2.02, 160, 0.5)).join(''), fill: 'rgba(0,0,0,0.18)', blend: 'multiply' })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(80, 50, 100, 0.55, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.55)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Grass block + diamond pickaxe (pixel art) -------------------------------
// Isometric cube: each 16×16 face texture is mapped onto a parallelogram, one
// quad per texel, darkened per face (light from the upper-left).
export function grassBlock(): Art {
  const s = 6
  const c = 0.866 * s
  const O = [84, 3]
  const N = 16
  const grass = ['#5aa83a', '#6fbf45', '#4a9230', '#8bd85e', '#3d7f27']
  const dirt = ['#8b5a2b', '#a06b38', '#6f4521', '#5a3619', '#9a9a9a', '#767676']
  const r = rng(42)
  const top: number[][] = []
  const side: number[][] = []
  const pickG = () => { const v = r(); return v < 0.5 ? 0 : v < 0.72 ? 1 : v < 0.9 ? 2 : v < 0.96 ? 3 : 4 }
  for (let v = 0; v < N; v++) {
    top.push(Array.from({ length: N }, pickG))
  }
  const drip = Array.from({ length: N }, () => 3 + (r() < 0.55 ? 1 : 0) + (r() < 0.2 ? 1 : 0))
  for (let v = 0; v < N; v++) {
    side.push(
      Array.from({ length: N }, (_, u) => {
        if (v < drip[u]) return 10 + pickG()
        const k = r()
        return k < 0.48 ? 0 : k < 0.68 ? 1 : k < 0.84 ? 2 : k < 0.92 ? 3 : k < 0.97 ? 4 : 5
      }),
    )
  }
  const color = (idx: number, amt: number) => shade(idx >= 10 ? grass[idx - 10] : dirt[idx], amt)
  const byColor = new Map<string, string>()
  const quad = (p0: number[], eu: number[], ev: number[], u: number, v: number, col: string) => {
    const pt = (a: number, b: number) => [p0[0] + a * eu[0] + b * ev[0], p0[1] + a * eu[1] + b * ev[1]]
    const q = [pt(u, v), pt(u + 1.04, v), pt(u + 1.04, v + 1.04), pt(u, v + 1.04)].flat()
    byColor.set(col, (byColor.get(col) ?? '') + poly(q))
  }
  const L = [O[0] - N * c, O[1] + N * s * 0.5]
  const F = [O[0], O[1] + N * s]
  for (let v = 0; v < N; v++)
    for (let u = 0; u < N; u++) {
      quad(O, [c, s / 2], [-c, s / 2], u, v, shade(grass[top[v][u]], 0.04))
      quad(L, [c, s / 2], [0, s], u, v, color(side[v][u], -0.12))
      quad(F, [c, -s / 2], [0, s], u, v, color(side[v][N - 1 - u], -0.36))
    }
  const leftFace = poly([L[0], L[1], F[0], F[1], F[0], F[1] + N * s, L[0], L[1] + N * s])
  const rightFace = poly([F[0], F[1], O[0] + N * c, O[1] + N * s * 0.5, O[0] + N * c, O[1] + N * s * 1.5, F[0], F[1] + N * s])
  const topFace = poly([O[0], O[1], O[0] + N * c, O[1] + N * s * 0.5, F[0], F[1], L[0], L[1]])
  const sil = poly([O[0], O[1], O[0] + N * c, O[1] + N * s * 0.5, O[0] + N * c, O[1] + N * s * 1.5, F[0], F[1] + N * s, L[0], L[1] + N * s, L[0], L[1]])
  return {
    viewW: 168,
    viewH: 200,
    paths: [
      ...[...byColor.entries()].map(([fill, d]) => ({ d, fill })),
      { d: `M${L[0]} ${L[1]}L${F[0]} ${F[1]}L${O[0] + N * c} ${O[1] + N * s * 0.5}M${F[0]} ${F[1]}V${F[1] + N * s}`, stroke: 'rgba(20,30,10,0.55)', sw: 1.6 },
      { d: `M${L[0] + 1.5} ${L[1]}L${O[0]} ${O[1] + 1.2}L${O[0] + N * c - 1.5} ${O[1] + N * s * 0.5}`, stroke: 'rgba(255,255,255,0.45)', sw: 1.6 },
      // faces: green bounce light low on the sides, deeper core on the right face
      { d: leftFace, fill: lin(0, L[1] + N * s * 0.4, 0, F[1] + N * s, 0, 'rgba(120,200,90,0)', 1, 'rgba(120,200,90,0.3)'), blend: 'screen' },
      { d: rightFace, fill: lin(F[0], 0, O[0] + N * c, 0, 0, 'rgba(20,10,40,0.05)', 1, 'rgba(20,10,40,0.35)'), blend: 'multiply' },
      { d: topFace, fill: lin(L[0], O[1], O[0] + N * c, F[1], 0, 'rgba(255,250,210,0.28)', 0.6, 'rgba(255,250,210,0)'), blend: 'screen' },
      rim(rightFace, 2.2, F[0], F[1], O[0] + N * c, O[1] + N * s, '200,235,255', 0.8, 0.5),
      { d: sil, stroke: '#14200c', sw: 3.2 },
    ],
  }
}

export function pickaxe(): Art {
  const p = new Pix(24, 24)
  // handle: 2-pixel diagonal from bottom-left up to the head, with wood grain
  for (let x = 1; x <= 16; x++) {
    p.set(x, 22 - x, x % 5 === 0 ? 'w' : 'l')
    p.set(x, 23 - x, x % 5 === 2 ? 'W' : 'w')
  }
  // curved diamond head, symmetric about the handle axis
  const C = [4.5, 19.5]
  const R = 15
  const a0 = -95
  const a1 = 5
  p.each((x, y) => {
    const dx = x + 0.5 - C[0]
    const dy = y + 0.5 - C[1]
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI
    if (ang < a0 || ang > a1) return null
    const t = (ang - a0) / (a1 - a0)
    const th = 0.8 + 3.3 * Math.sin(Math.PI * t)
    const dist = Math.hypot(dx, dy)
    const d = dist - R
    if (Math.abs(d) > th / 2 + 0.2) return null
    const k = d / (th / 2 + 0.2)
    const facing = (-0.6 * dx - 0.8 * dy) / dist // outward normal · light
    const v = k > 0 ? k * (0.55 + 0.45 * facing) : k
    if (t < 0.06 || t > 0.94) return 'B'
    return pick(v, [[0.38, 'D'], [0.02, 'C'], [-0.5, 'B'], [-9, 'A']])
  })
  // binding where the handle meets the head
  ;[[14, 8], [15, 8], [14, 9], [15, 7]].forEach(([x, y]) => p.set(x, y, 'W'))
  p.outline('K')
  ;[[6, 5], [9, 4], [10, 4]].forEach(([x, y]) => p.get(x, y) && p.get(x, y) !== 'K' && p.set(x, y, 'E'))
  return {
    viewW: 192,
    viewH: 192,
    paths: [
      glow(112, 72, 70, '120,255,230', 0.35),
      ...p.paths({ K: '#0c1b1a', A: '#0e6458', B: '#1aa58e', C: '#3fe3c8', D: '#a8fff0', E: '#ffffff', W: '#4a2c12', w: '#7a4e24', l: '#b07e45' }, 8),
      glow(52, 40, 10, '255,255,255', 0.8),
      { d: star(52, 40, 9, 1.6, 4, 0) + star(150, 118, 6, 1.2, 4, 0), fill: '#ffffff' },
    ],
  }
}

// Blocky world backdrop: square sun, flat clouds, two planes of voxel hills.
export function blockWorld(): Art {
  const paths: VectorPath[] = []
  ;[[-4, 26, 0.1], [40, 64, 0.07], [92, 112, 0.06]].forEach(([a0, a1, o]) =>
    paths.push({ d: poly([15, 15, a1, 101, a0, 101]), fill: lin(15, 15, 90, 101, 0, `rgba(255,250,215,${o * 2.4})`, 1, 'rgba(255,250,215,0)'), blend: 'screen' }),
  )
  paths.push(glow(15, 15, 36, '255,250,215', 0.7))
  paths.push({ d: rect(9, 9, 12, 12), fill: 'rgba(255,250,210,0.5)' }, { d: rect(11, 11, 8, 8), fill: '#fffbe0' })
  const flat = (x: number, y: number, w: number, a: number) => {
    paths.push({ d: rect(x, y, w, 4) + rect(x + 4, y - 3, w - 10, 3), fill: '#ffffff', alpha: a }, { d: rect(x, y + 3, w, 1.2), fill: '#d8e8f6', alpha: a })
  }
  flat(34, 14, 26, 0.85)
  flat(78, 8, 18, 0.6)
  flat(128, 46, 22, 0.55)
  // far voxel hills (hazy)
  paths.push({ d: stepped(160, 4, 101, (x) => 28 + 9 * Math.sin(x * 0.045 + 1) + 5 * Math.sin(x * 0.13)), fill: '#9dc8b4' })
  paths.push({ d: stepped(160, 4, 101, (x) => 24 + 7 * Math.sin(x * 0.06 + 3) + 4 * Math.sin(x * 0.17 + 1) + (x > 120 ? 6 : 0)), fill: '#7fb596' })
  // near ground: grass cap + dirt with texture
  const gh = (x: number) => 15 + (x > 76 && x < 96 ? 0 : 4) + (x > 140 ? 4 : 0)
  const grassTop = stepped(160, 4, 101, gh)
  paths.push({ d: grassTop, fill: '#7a5230' })
  const r = rng(9)
  let dk = ''
  let lt = ''
  let st = ''
  for (let x = 0; x < 160; x += 2)
    for (let y = 101 - 2; y > 101 - gh(x); y -= 2) {
      const k = r()
      if (k < 0.16) dk += rect(x, y, 2, 2)
      else if (k < 0.3) lt += rect(x, y, 2, 2)
      else if (k < 0.33) st += rect(x, y, 2, 2)
    }
  paths.push({ d: dk, fill: '#5c3b1f' }, { d: lt, fill: '#94653b' }, { d: st, fill: '#8d8d8d' })
  let cap = ''
  let capHi = ''
  for (let x = 0; x < 160; x += 4) {
    const y = 101 - Math.round(gh(x + 2) / 4) * 4
    cap += rect(x, y, 4, 4) + (r() < 0.5 ? rect(x + (r() < 0.5 ? 0 : 2), y + 4, 2, 2) : '')
    capHi += rect(x, y, 4, 1.2)
  }
  paths.push({ d: cap, fill: '#5fae3b' }, { d: capHi, fill: '#8bd85e' })
  paths.push({ d: grassTop, stroke: 'rgba(20,40,10,0.5)', sw: 0.6 })
  paths.push(...castShadow(54, 81.6, 18, 2.4, 0.6, '20,40,10'))
  paths.push(...castShadow(118, 81.6, 18, 2.2, 0.5, '20,40,10'))
  paths.push({ d: rect(0, 58, 160, 24), fill: lin(0, 58, 0, 82, 0, 'rgba(230,245,255,0)', 1, 'rgba(230,245,255,0.35)') })
  const spark = (x: number, y: number, k: number) => rect(x - k / 2, y - 2.5 * k, k, 5 * k) + rect(x - 2.5 * k, y - k / 2, 5 * k, k)
  paths.push({ d: spark(140, 26, 0.8) + spark(92, 18, 0.6) + spark(150, 60, 0.6), fill: '#ffffff' })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Suspicious space crewmate ----------------------------------------------
export function crewmate(color = '#e0283f'): Art {
  const dark = shade(color, -0.42)
  const BODY = 'M42 146 L42 74 Q42 22 90 22 Q138 22 138 74 L138 146 Q138 162 122 162 L108 162 Q97 162 97 150 L97 140 L83 140 L83 150 Q83 162 72 162 L58 162 Q42 162 42 146 Z'
  const paths: VectorPath[] = [
    // backpack
    { d: rrect(16, 70, 34, 70, 13), fill: lin(16, 0, 50, 0, 0, shade(color, 0.12), 1, dark), stroke: INK, sw: 4.5 },
    gloss('M23 84 Q24 77 31 76', 3, 0.5),
    core(rrect(16, 70, 34, 70, 13), 16, 70, 50, 140, '40,0,40', 0.5, 0.3),
    // body
    { d: BODY, fill: lin(42, 0, 138, 0, 0, shade(color, 0.28), 0.45, color, 1, shade(color, -0.3)) },
    { d: 'M120 34 Q138 50 138 74 L138 146 Q138 162 122 162 L108 162 Q118 150 118 128 L120 60 Q122 44 120 34 Z', fill: 'rgba(40,0,20,0.28)' },
    { d: 'M42 128 Q90 140 138 128 L138 146 Q138 162 122 162 L108 162 Q97 162 97 150 L97 140 L83 140 L83 150 Q83 162 72 162 L58 162 Q42 162 42 146 Z', fill: 'rgba(40,0,20,0.22)' },
    core(BODY, 50, 30, 140, 150, '40,0,40', 0.6, 0.38),
    rim(BODY, 4, 70, 60, 140, 160, '120,230,255', 0.95, 0.55),
    { d: BODY, stroke: INK, sw: 5 },
    { d: 'M83 140 L83 128', stroke: 'rgba(27,23,18,0.5)', sw: 2.5 },
    gloss('M52 64 Q56 36 82 30', 5, 0.6),
    { d: circ(60, 44, 2.6), fill: 'rgba(255,255,255,0.7)' },
    // visor
    { d: 'M86 46 L126 46 Q148 46 148 66 Q148 86 126 86 L86 86 Q66 86 66 66 Q66 46 86 46 Z', fill: lin(0, 46, 0, 86, 0, '#e3f7ff', 0.45, '#9fdcf3', 1, '#3d8db5'), stroke: INK, sw: 4.5 },
    { d: 'M72 74 Q100 84 142 74 Q140 84 126 86 L86 86 Q74 86 72 74 Z', fill: 'rgba(20,70,110,0.35)' },
    { d: 'M78 78 Q104 86 140 76 Q138 84 126 86 L86 86 Q78 86 78 78 Z', fill: 'rgba(120,240,255,0.55)', blend: 'screen' },
    rim('M86 46 L126 46 Q148 46 148 66 Q148 86 126 86 L86 86 Q66 86 66 66 Q66 46 86 46 Z', 3, 90, 50, 140, 90, '160,245,255', 0.9, 0.55),
    { d: 'M86 55 L118 55', stroke: '#ffffff', sw: 6 },
    { d: circ(129, 55, 2.6), fill: '#ffffff' },
    // sweat drop
    { d: 'M150 30 Q156 40 156 44 Q156 50 150 50 Q144 50 144 44 Q144 40 150 30 Z', fill: lin(0, 30, 0, 50, 0, '#e6f8ff', 1, '#6cc6f0'), stroke: INK, sw: 2.6 },
    { d: circ(148, 44, 1.4), fill: '#ffffff' },
  ]
  return { viewW: 170, viewH: 184, paths }
}

// Deep-space backdrop: nebula glows, ringed planet, distant stars.
export function spaceScene(): Art {
  const paths: VectorPath[] = []
  paths.push({ d: circ(120, 30, 60), fill: rad(120, 30, 60, 0, 'rgba(160,70,220,0.35)', 1, 'rgba(160,70,220,0)') })
  paths.push({ d: circ(30, 90, 55), fill: rad(30, 90, 55, 0, 'rgba(40,160,220,0.28)', 1, 'rgba(40,160,220,0)') })
  paths.push({ d: circ(150, 92, 40), fill: rad(150, 92, 40, 0, 'rgba(230,60,120,0.22)', 1, 'rgba(230,60,120,0)') })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(80, 50, 100, 0.55, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.5)'), blend: 'multiply' })
  // big twinkles
  paths.push({ d: star(60, 8, 2.2, 0.5, 4, 0) + star(98, 86, 1.8, 0.45, 4, 0) + star(156, 40, 1.6, 0.4, 4, 0), fill: '#ffffff' })
  // key light: a bright star at the upper-left, with flare
  paths.push(glow(14, 12, 40, '255,240,220', 0.55))
  paths.push(glow(14, 12, 10, '255,255,255', 0.9))
  paths.push({ d: star(14, 12, 13, 0.9, 4, 0) + star(14, 12, 6, 0.6, 4, 45), fill: '#ffffff' })
  paths.push({ d: poly([14, 12, 170, 58, 150, 112]), fill: lin(14, 12, 140, 90, 0, 'rgba(255,240,220,0.16)', 1, 'rgba(255,240,220,0)'), blend: 'screen' })
  paths.push({ d: poly([14, 12, 120, 112, 70, 112]), fill: lin(14, 12, 90, 100, 0, 'rgba(255,240,220,0.08)', 1, 'rgba(255,240,220,0)'), blend: 'screen' })
  ;[[52, 36, 3, '160,200,255'], [78, 52, 1.8, '255,180,220']].forEach(([x, y, rr, c]) => paths.push(glow(x as number, y as number, rr as number, c as string, 0.5)))
  // small ringed planet, far away (left)
  const px = 26
  const py = 74
  const pr = 8
  paths.push({ d: ell(px, py, pr * 2.1, pr * 0.55), stroke: 'rgba(255,220,170,0.4)', sw: 1.2 })
  paths.push({ d: circ(px, py, pr), fill: radLit(px, py, pr, 0, '#ffd6a0', 0.55, '#e0773f', 1, '#4a1838') })
  paths.push(rim(circ(px, py, pr), 1, px - pr, py - pr, px + pr, py + pr, '255,200,170', 0.7, 0.6))
  paths.push({ d: `M${px - pr * 2.1} ${py} Q${px} ${py + pr * 1.2} ${px + pr * 2.1} ${py}`, stroke: lin(px - 16, 0, px + 16, 0, 0, 'rgba(255,235,190,0.95)', 1, 'rgba(255,200,150,0.5)'), sw: 1.3 })
  // distant ship
  const ship = 'M120 16 L142 14 Q150 15 152 18 Q150 21 142 22 L120 20 Z'
  paths.push({ d: ship, fill: lin(0, 14, 0, 22, 0, '#cfd6ea', 1, '#5a6280') })
  paths.push({ d: 'M120 16 L114 15 L114 21 L120 20 Z', fill: '#3a4060' })
  paths.push(glow(113, 18, 5, '120,200,255', 0.8, 'lighter'))
  paths.push({ d: rect(126, 17, 1.2, 1.2) + rect(130, 16.8, 1.2, 1.2) + rect(134, 16.6, 1.2, 1.2) + rect(138, 16.4, 1.2, 1.2), fill: '#fff2a8' })
  // tumbling debris lit from the upper-left
  ;[[34, 30, 2.4], [150, 66, 3], [92, 92, 1.8]].forEach(([x, y, rr]) => {
    const d = poly([x - rr, y, x - rr * 0.3, y - rr, x + rr, y - rr * 0.5, x + rr * 0.8, y + rr * 0.7, x - rr * 0.2, y + rr])
    paths.push({ d, fill: lin(x - rr, y - rr, x + rr, y + rr, 0, '#a7a3b8', 1, '#2a2638') })
  })
  // big planet rising from the bottom-right corner, with an atmosphere rim
  const bx = 130
  const by = 128
  const br = 44
  paths.push({ d: circ(bx, by, br + 10), fill: rad(bx, by, br + 10, 0.78, 'rgba(110,200,255,0.35)', 1, 'rgba(110,200,255,0)') })
  paths.push({ d: circ(bx, by, br), fill: rad(bx - 26, by - 46, 78, 0, '#9fe6f5', 0.35, '#3d8cc0', 0.75, '#1a3266', 1, '#111a3c') })
  paths.push({ d: `M${bx - 40} ${by - 16} Q${bx} ${by - 30} ${bx + 42} ${by - 20} M${bx - 43} ${by - 6} Q${bx} ${by - 18} ${bx + 44} ${by - 10}`, stroke: 'rgba(255,255,255,0.14)', sw: 3 })
  paths.push({ d: ell(bx - 14, by - 30, 6, 2.6) + ell(bx + 16, by - 34, 4, 1.8), fill: 'rgba(20,50,100,0.35)' })
  paths.push({ d: circ(bx, by, br), stroke: lin(bx - 40, by - 40, bx + 30, by - 20, 0, 'rgba(210,248,255,0.9)', 1, 'rgba(210,248,255,0)'), sw: 1.1 })
  return { viewW: 160, viewH: 101, paths }
}
