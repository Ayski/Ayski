import type { VectorPath } from '../../types'
import { circ, dots, ell, gloss, INK, lin, poly, rad, radLit, rect, rng, rrect, shade, softShadow, type Art } from './kit'

// Parody illustrations of well-known cartoon universes, in a clean sticker style.
// Original drawings — no official logos, names or artwork.

// ---- Sea sponge in square pants -------------------------------------------
// Reference piece for the "clean" art style: light from the upper-left, a
// shaded base fill per shape, gloss highlights, consistent 3.5–5 unit ink.
export function sponge(): Art {
  const BODY = lin(30, 0, 175, 0, 0, '#fff27e', 0.5, '#ffe14f', 1, '#efc535')
  const pores: [number, number, number, number][] = [
    [56, 36, 7, 6], [148, 40, 8, 7], [104, 28, 5, 4], [50, 116, 5, 6], [156, 92, 5, 4], [70, 132, 6, 5], [144, 126, 7, 5], [126, 34, 4, 3],
  ]
  const limb = (d: string): VectorPath[] => [
    { d, stroke: INK, sw: 7.5 },
    { d, stroke: '#ffe14f', sw: 3.6 },
  ]
  const paths: VectorPath[] = [
    ...softShadow(100, 210, 62, 7, 0.32, '6,40,70'),
    // arms + hands (behind body)
    ...limb('M39 100 Q17 108 21 132'),
    ...limb('M161 100 Q183 108 179 130'),
    { d: circ(21, 135, 6.5) + circ(179, 133, 6.5), fill: '#ffe14f', stroke: INK, sw: 3 },
    // legs, socks, shoes
    ...limb('M74 180 L74 198'),
    ...limb('M126 180 L126 198'),
    { d: rrect(66, 186, 16, 12, 2) + rrect(118, 186, 16, 12, 2), fill: '#ffffff', stroke: INK, sw: 2.5 },
    { d: 'M66 190 H82 M118 190 H134', stroke: '#e2392f', sw: 2 },
    { d: 'M66 194 H82 M118 194 H134', stroke: '#2f6fc0', sw: 2 },
    { d: 'M56 205 Q56 197 70 197 Q86 197 87 205 Q87 211 71 211 Q56 211 56 205 Z M113 205 Q114 197 130 197 Q144 197 144 205 Q144 211 129 211 Q113 211 113 205 Z', fill: lin(0, 196, 0, 212, 0, '#4a4a4f', 1, '#0d0d10'), stroke: INK, sw: 2.5 },
    { d: 'M62 201 Q68 198 76 199 M119 200 Q126 198 134 199', stroke: 'rgba(255,255,255,0.55)', sw: 2 },
    // spongy body with shaded right side
    { d: 'M40 24 Q50 14 62 20 Q74 12 86 20 Q98 13 110 20 Q122 12 134 19 Q148 12 160 24 Q166 40 162 56 Q168 72 163 88 Q168 104 164 120 Q166 132 162 144 L38 146 Q34 132 37 120 Q32 104 37 88 Q32 72 37 56 Q32 40 40 24 Z', fill: BODY, stroke: INK, sw: 4.5 },
    { d: 'M146 22 Q156 18 160 24 Q166 40 162 56 Q168 72 163 88 Q168 104 164 120 Q166 132 162 144 L148 144 Q152 112 150 80 Q152 50 146 22 Z', fill: 'rgba(196,140,10,0.28)' },
    gloss('M47 36 Q53 27 66 27', 4.5, 0.85),
    { d: pores.map(([x, y, rx, ry]) => ell(x, y, rx, ry)).join(''), fill: '#d8b42a' },
    { d: pores.map(([x, y, rx, ry]) => ell(x + rx * 0.25, y + ry * 0.3, rx * 0.62, ry * 0.55)).join(''), fill: '#b9951c' },
    // shirt, collar, tie
    { d: 'M38 146 L162 144 L162 157 L38 159 Z', fill: lin(0, 144, 0, 159, 0, '#ffffff', 1, '#dfe4ea'), stroke: INK, sw: 3.5 },
    { d: 'M80 145 L94 156 L100 145 Z M120 145 L106 156 L100 145 Z', fill: '#ffffff', stroke: INK, sw: 2.5 },
    { d: rrect(95, 146, 10, 6, 2), fill: '#c7261e', stroke: INK, sw: 2 },
    { d: 'M96 152 L104 152 L107 161 L100 174 L93 161 Z', fill: lin(93, 0, 107, 0, 0, '#ef4a3f', 1, '#b3211a'), stroke: INK, sw: 2.5 },
    // square pants with belt
    { d: 'M38 159 L162 157 L160 182 L40 184 Z', fill: lin(0, 157, 0, 184, 0, '#a56d38', 1, '#7a4a20'), stroke: INK, sw: 3.5 },
    { d: 'M48 165 H60 M72 165 H84 M116 165 H128 M140 165 H152', stroke: INK, sw: 3.5 },
    { d: 'M100 168 V182', stroke: 'rgba(0,0,0,0.25)', sw: 2 },
    // eyes
    { d: circ(78, 64, 22) + circ(122, 64, 22), fill: radLit(100, 64, 60, 0, '#ffffff', 1, '#dfe7f1'), stroke: INK, sw: 3.5 },
    { d: circ(82, 67, 10.5), fill: radLit(82, 67, 10.5, 0, '#8fd0f7', 1, '#2a74b8'), stroke: INK, sw: 2 },
    { d: circ(118, 67, 10.5), fill: radLit(118, 67, 10.5, 0, '#8fd0f7', 1, '#2a74b8'), stroke: INK, sw: 2 },
    { d: circ(82, 67, 4.8) + circ(118, 67, 4.8), fill: INK },
    { d: circ(85.5, 63, 2.7) + circ(121.5, 63, 2.7), fill: '#ffffff' },
    { d: circ(79, 71, 1.2) + circ(115, 71, 1.2), fill: 'rgba(255,255,255,0.8)' },
    { d: 'M64 46 Q61 39 58 34 M77 42 Q77 35 76 29 M90 45 Q93 38 97 33 M110 45 Q107 38 103 33 M123 42 Q123 35 124 29 M136 46 Q139 39 142 34', stroke: INK, sw: 3.2 },
    // rosy cheeks + freckles
    { d: circ(52, 98, 12), fill: rad(52, 98, 12, 0, 'rgba(255,110,110,0.55)', 1, 'rgba(255,110,110,0)') },
    { d: circ(148, 98, 12), fill: rad(148, 98, 12, 0, 'rgba(255,110,110,0.55)', 1, 'rgba(255,110,110,0)') },
    { d: circ(48, 95, 1.5) + circ(54, 100, 1.5) + circ(50, 103, 1.5) + circ(146, 95, 1.5) + circ(152, 99, 1.5) + circ(148, 103, 1.5), fill: '#b5443f' },
    // open smile: interior, tongue, teeth, then the outline on top
    { d: 'M58 98 Q100 142 142 98 Q100 116 58 98 Z', fill: '#6e1a1a' },
    { d: 'M82 120 Q100 110 118 120 Q100 128 82 120 Z', fill: '#e8675d' },
    { d: rrect(88.5, 106, 10.5, 12, 2) + rrect(101, 106, 10.5, 12, 2), fill: '#ffffff', stroke: INK, sw: 2.2 },
    { d: 'M58 98 Q100 142 142 98 Q100 116 58 98 Z', stroke: INK, sw: 3.8 },
    { d: 'M53 94 Q55 100 60 100 M147 94 Q145 100 140 100', stroke: INK, sw: 2.5 },
    // long nose drawn last so it overlaps the smile
    { d: 'M100 72 Q128 70 125 87 Q121 97 104 89', fill: BODY, stroke: INK, sw: 3.5 },
    gloss('M106 76 Q116 75 120 80', 2.2, 0.75),
  ]
  return { viewW: 200, viewH: 220, paths }
}

// Underwater backdrop: light shafts, two seaweed depth planes, bubbles, sand.
export function seaBackdrop(): Art {
  const paths: VectorPath[] = []
  // light shafts from the surface
  ;[
    [18, 30, 0.1], [52, 62, 0.07], [96, 104, 0.09], [130, 142, 0.06],
  ].forEach(([a, b, o]) => paths.push({ d: poly([a, 0, b, 0, b + 34, 101, a + 18, 101]), fill: `rgba(255,255,255,${o})` }))
  // flower-shaped "sky" spots, faint
  const spots: [number, number, number, string][] = [
    [16, 14, 7, '#bfefff'], [128, 10, 6, '#c8ffe4'], [150, 52, 5, '#bfefff'], [106, 36, 4, '#e0d4ff'],
  ]
  spots.forEach(([x, y, r, c]) => {
    let d = ''
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      d += circ(x + r * 0.6 * Math.cos(a), y + r * 0.6 * Math.sin(a), r * 0.55)
    }
    paths.push({ d, fill: c, alpha: 0.45 }, { d: circ(x, y, r * 0.32), fill: '#ffffff', alpha: 0.5 })
  })
  // seaweed: far plane (dim) then near plane
  const strand = (x: number, h: number, sway: number) => {
    const pts: number[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      pts.push(x + Math.sin(t * 5 + x) * sway - 2 * (1 - t), 101 - h * t)
    }
    for (let i = 12; i >= 0; i--) {
      const t = i / 12
      pts.push(x + Math.sin(t * 5 + x) * sway + 2 * (1 - t) + 0.6, 101 - h * t)
    }
    return poly(pts)
  }
  paths.push({ d: [96, 104, 118, 150, 156].map((x, i) => strand(x, 30 + (i % 3) * 9, 2.4)).join(''), fill: 'rgba(8,70,110,0.45)' })
  paths.push({ d: [140, 147].map((x, i) => strand(x, 42 + i * 8, 3)).join(''), fill: lin(0, 101, 0, 50, 0, '#1f8a5b', 1, '#3fc07d'), stroke: 'rgba(10,50,40,0.6)', sw: 0.6 })
  // bubbles with highlights
  const r = rng(11)
  let bub = ''
  let hl = ''
  for (let i = 0; i < 12; i++) {
    const bx = 112 + r() * 44
    const by = 14 + r() * 66
    const br = 1.2 + r() * 2.8
    bub += circ(bx, by, br)
    hl += circ(bx - br * 0.35, by - br * 0.35, br * 0.28)
  }
  paths.push({ d: bub, fill: 'rgba(255,255,255,0.12)', stroke: 'rgba(255,255,255,0.75)', sw: 0.6 }, { d: hl, fill: 'rgba(255,255,255,0.9)' })
  // sand with a lit edge and speckles
  paths.push({ d: 'M0 86 Q40 80 80 86 Q120 92 160 84 L160 101 L0 101 Z', fill: lin(0, 82, 0, 101, 0, '#f8e2a0', 1, '#d6ad62') })
  paths.push({ d: 'M0 86 Q40 80 80 86 Q120 92 160 84', stroke: 'rgba(255,255,255,0.6)', sw: 0.8 })
  const sr = rng(5)
  let sand = ''
  for (let i = 0; i < 40; i++) sand += circ(sr() * 160, 89 + sr() * 11, 0.3 + sr() * 0.45)
  paths.push({ d: sand, fill: '#b98d45', alpha: 0.7 })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Local drawing helpers --------------------------------------------------
const q2 = (v: number) => Math.round(v * 100) / 100

// Smooth curve through points (Catmull-Rom converted to cubic Béziers).
function smooth(pts: number[], close = true): string {
  const P: [number, number][] = []
  for (let i = 0; i < pts.length; i += 2) P.push([pts[i], pts[i + 1]])
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
function glowPool(cx: number, cy: number, rx: number, ry: number, alpha: number, color: string, steps = 16): VectorPath[] {
  return Array.from({ length: steps }, (_, i) => {
    const k = 1 - i / steps
    return { d: ell(cx, cy, rx * k, ry * k), fill: `rgba(${color},${(alpha / steps).toFixed(3)})` }
  })
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

// Shaded cartoon cloud: one ink contour around all puffs, gradient fill,
// faint creases where the front puffs overlap the main one.
function puffCloud(cx: number, cy: number, s: number, tint = '#c4dcf5'): VectorPath[] {
  const parts = [
    circ(cx - 15 * s, cy + 3 * s, 10 * s),
    circ(cx - 2 * s, cy - 6 * s, 13.5 * s),
    circ(cx + 13 * s, cy - 1 * s, 10 * s),
    circ(cx + 23 * s, cy + 6 * s, 6.5 * s),
    rrect(cx - 25 * s, cy + 1 * s, 54 * s, 13 * s, 6.5 * s),
  ]
  const fill = lin(0, cy - 20 * s, 0, cy + 14 * s, 0, '#ffffff', 0.5, '#f6faff', 1, tint)
  return [
    { d: parts.join(''), stroke: INK, sw: 4.6 * s },
    ...parts.map((d) => ({ d, fill })),
    { d: arcAlong(cx - 15 * s, cy + 3 * s, 10 * s, 10 * s, -50, 30, 10) + arcAlong(cx + 13 * s, cy - 1 * s, 10 * s, 10 * s, 150, 215, 10), stroke: tint, sw: 1.7 * s },
  ]
}

// ---- Pink frosted donut on a cloud ----------------------------------------
export function sunnySky(): Art {
  const paths: VectorPath[] = []
  // warm sun glow in the top-right corner + soft rays
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(150, 0, 80, 0, 'rgba(255,249,214,0.8)', 0.22, 'rgba(255,240,190,0.3)', 1, 'rgba(255,240,190,0)') })
  const rays: [number, number][] = [[112, 119], [131, 136], [150, 154], [165, 168]]
  rays.forEach(([a, b]) => {
    const A = (a * Math.PI) / 180
    const B = (b * Math.PI) / 180
    paths.push({ d: poly([150, 0, 150 + 190 * Math.cos(A), 190 * Math.sin(A), 150 + 190 * Math.cos(B), 190 * Math.sin(B)]), fill: rad(150, 0, 150, 0, 'rgba(255,255,255,0.18)', 1, 'rgba(255,255,255,0)') })
  })
  // far cloud bank (pale, no ink), then a nearer brighter one
  const bank = (seed: number, y: number, rmin: number, rmax: number) => {
    const r = rng(seed)
    let d = ''
    for (let x = -6; x < 170; x += 9 + r() * 5) d += circ(x, y - r() * 4, rmin + r() * (rmax - rmin))
    return d
  }
  paths.push({ d: bank(3, 92, 7, 12), fill: '#bfe2fb' }, { d: rect(-2, 90, 164, 12), fill: '#bfe2fb' })
  paths.push({ d: bank(8, 99, 6, 10), fill: lin(0, 86, 0, 101, 0, '#f4fbff', 1, '#d4ebfc') }, { d: rect(-2, 98, 164, 4), fill: '#d4ebfc' })
  return { viewW: 160, viewH: 101, paths }
}

export function donut(): Art {
  const CX = 100
  const CY = 84
  // frosting outline (outer wavy edge with drips + inner hole), optionally offset
  const frost = (ox: number, oy: number) => {
    const drips: [number, number, number][] = [[0.38, 10, 0.12], [0.92, 20, 0.13], [1.46, 13, 0.15], [2.02, 23, 0.12], [2.6, 11, 0.14]]
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
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2
      const w = 1 + 0.05 * Math.sin(a * 6 + 0.3)
      hole.push(CX + ox + 31 * w * Math.cos(a), CY - 3 + oy + 18 * w * Math.sin(a))
    }
    return poly(pts) + poly(hole)
  }
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

  const cloudBack = [circ(26, 166, 20), circ(52, 150, 26), circ(100, 140, 32), circ(150, 148, 27), circ(176, 164, 20), rrect(6, 158, 188, 32, 16)]
  const cloudFill = lin(0, 120, 0, 194, 0, '#ffffff', 0.5, '#eef6ff', 1, '#b4cfee')
  const cloudFront = [circ(34, 182, 15), circ(62, 184, 17), circ(98, 186, 19), circ(136, 184, 17), circ(166, 181, 15), rrect(20, 180, 160, 16, 8)]
  const paths: VectorPath[] = [
    // cloud cushion
    { d: cloudBack.join(''), stroke: INK, sw: 9 },
    ...cloudBack.map((d) => ({ d, fill: cloudFill })),
    ...softShadow(104, 162, 84, 14, 0.42, '40,80,150'),
    // dough body: golden top, toasted side, pale equator band
    { d: DOUGH, fill: lin(0, 32, 0, 164, 0, '#ffd08a', 0.5, '#eaa257', 1, '#b4652a') },
    { d: ell(100, 86, 82, 54), fill: radLit(100, 86, 90, 0, 'rgba(255,236,190,0.55)', 1, 'rgba(255,236,190,0)') },
    { d: arcAlong(100, 98, 82, 54, 8, 172, 40), stroke: 'rgba(255,228,170,0.6)', sw: 5 },
    { d: SIDE, fill: lin(18, 0, 182, 0, 0, 'rgba(110,45,5,0)', 0.55, 'rgba(110,45,5,0.12)', 1, 'rgba(110,45,5,0.4)') },
    { d: DOUGH, stroke: INK, sw: 4.5 },
    // frosting: cast shadow, fill, lower-right shade, ink
    { d: frost(2, 4), fill: 'rgba(110,40,10,0.35)', rule: 'evenodd' },
    { d: frost(0, 0), fill: radLit(92, 74, 96, 0, '#ffd0e4', 0.45, '#f985bb', 1, '#d64a8c'), rule: 'evenodd' },
    { d: frost(0, 0), fill: lin(40, 40, 175, 150, 0, 'rgba(150,20,80,0)', 0.55, 'rgba(150,20,80,0)', 1, 'rgba(150,20,80,0.32)'), rule: 'evenodd' },
    { d: frost(0, 0), stroke: INK, sw: 4 },
    // the hole
    { d: HOLE, fill: lin(0, 67, 0, 93, 0, '#3f1d08', 0.55, '#7c4119', 1, '#c98843'), stroke: INK, sw: 3.5 },
    // sprinkles: ink first, colours on top
    { d: inkD, stroke: INK, sw: 5.6 },
    ...[...byC.entries()].map(([c, d]) => ({ d, stroke: c, sw: 3.1 })),
    // gloss
    gloss(arcAlong(100, 84, 62, 37, 196, 248, 16), 5, 0.85),
    gloss(arcAlong(100, 81, 37, 22.5, 112, 150, 8), 2.6, 0.55),
    { d: circ(37, 88, 2.4), fill: 'rgba(255,255,255,0.8)' },
    // front puffs tuck the donut into the cloud
    { d: cloudFront.join(''), stroke: INK, sw: 8 },
    ...cloudFront.map((d) => ({ d, fill: lin(0, 164, 0, 200, 0, '#ffffff', 0.45, '#eef6ff', 1, '#a9c6ea') })),
    { d: arcAlong(62, 184, 17, 17, 200, 250, 8) + arcAlong(98, 186, 19, 19, 200, 250, 8) + arcAlong(136, 184, 17, 17, 200, 250, 8), stroke: 'rgba(255,255,255,0.9)', sw: 2.4 },
    // twinkles
    { d: sparkle(24, 30, 9) + sparkle(184, 26, 6.5) + sparkle(192, 98, 5), fill: '#ffffff', stroke: INK, sw: 2.2 },
  ]
  return { viewW: 200, viewH: 200, paths }
}

export function skyClouds(spots: [number, number, number][] = [[150, 12, 0.38], [88, 8, 0.3], [148, 90, 0.32]]): Art {
  return { viewW: 160, viewH: 101, paths: spots.flatMap(([x, y, s]) => puffCloud(x, y, s)) }
}

// ---- Green swirling portal + lab flask --------------------------------------
export function alienWorld(): Art {
  const paths: VectorPath[] = []
  // nebula haze (kept off the title side)
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(118, 30, 72, 0, 'rgba(130,70,220,0.34)', 0.5, 'rgba(90,50,180,0.12)', 1, 'rgba(60,40,140,0)') })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(14, 6, 46, 0, 'rgba(50,190,210,0.16)', 1, 'rgba(50,190,210,0)') })
  // tiny ringed planet, far away
  paths.push({ d: ell(146, 15, 9, 2.4), stroke: 'rgba(255,214,170,0.55)', sw: 0.8 })
  paths.push({ d: circ(146, 15, 4.6), fill: radLit(146, 15, 4.6, 0, '#ffd9b0', 1, '#c86a5a') })
  paths.push({ d: arcAlong(146, 15, 9, 2.4, 0, 180, 12), stroke: 'rgba(255,214,170,0.8)', sw: 0.8 })
  // ridges: far (dim) then mid
  const ridge = (seed: number, base: number, amp: number, step: number) => {
    const r = rng(seed)
    const pts: number[] = []
    for (let x = -10; x <= 172; x += step) pts.push(x, base - r() * amp)
    return smooth(pts, false) + `L172 101L-10 101Z`
  }
  paths.push({ d: ridge(4, 76, 12, 14), fill: '#2e2660' })
  paths.push({ d: ridge(9, 84, 8, 18), fill: '#211a4a' })
  // near ground
  const GROUND = 'M-2 87 Q40 81 80 86 Q118 91 162 84 L162 101 L-2 101 Z'
  paths.push({ d: GROUND, fill: lin(0, 82, 0, 101, 0, '#3d2f73', 1, '#150f2e') })
  paths.push(...glowPool(109, 88.5, 46, 7, 0.6, '170,255,90'))
  paths.push({ d: 'M-2 87 Q40 81 80 86 Q118 91 162 84', stroke: 'rgba(190,170,255,0.35)', sw: 0.7 })
  // craters and pebbles
  const crater = (x: number, y: number, rx: number) => [
    { d: ell(x, y, rx, rx * 0.28), fill: 'rgba(10,6,30,0.55)' },
    { d: arcAlong(x, y, rx, rx * 0.28, 20, 160, 10), stroke: 'rgba(190,170,255,0.3)', sw: 0.6 },
  ]
  paths.push(...crater(30, 94, 7), ...crater(64, 97.5, 4), ...crater(146, 93, 5))
  paths.push({ d: ell(84, 92, 2.4, 1.3) + ell(132, 96, 1.8, 1) + ell(12, 90, 1.6, 0.9), fill: '#4b3d86' })
  return { viewW: 160, viewH: 101, paths }
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
  // tapered spiral arm inside the vortex; its centre drifts down-right (tunnel depth)
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
  const goo = (x: number, y: number, r: number): VectorPath[] => [
    { d: circ(x, y, r), fill: radLit(x, y, r, 0, '#e4ff9a', 0.6, '#7fe04a', 1, '#2f9b35'), stroke: INK, sw: 2.2 },
    { d: circ(x - r * 0.35, y - r * 0.38, r * 0.25), fill: '#ffffff' },
  ]
  let darkArms = ''
  let lightArms = ''
  for (let k = 0; k < 3; k++) {
    darkArms += arm((k * 2 * Math.PI) / 3 + 0.9, 1.05, 0.62)
    lightArms += arm((k * 2 * Math.PI) / 3, 1.05, 0.5)
  }
  const paths: VectorPath[] = [
    { d: ell(CX, CY, 104, 116), fill: rad(CX, CY, 112, 0, 'rgba(160,255,80,0.45)', 0.6, 'rgba(160,255,80,0.3)', 1, 'rgba(160,255,80,0)') },
    // gooey rim
    { d: RIM, fill: radLit(CX - 8, CY - 16, 122, 0, '#c4ff78', 0.5, '#4fd23a', 1, '#12722b') },
    { d: RIM, fill: lin(40, 30, 180, 205, 0, 'rgba(0,50,20,0)', 0.5, 'rgba(0,50,20,0)', 1, 'rgba(0,50,20,0.5)') },
    { d: RIM, stroke: INK, sw: 4.5 },
    // vortex
    { d: DISC, fill: rad(CX + 7, CY + 9, 86, 0, '#fbffe2', 0.16, '#e6ff8e', 0.5, '#74de3e', 0.82, '#2a9e35', 1, '#14692a'), stroke: 'rgba(8,50,18,0.85)', sw: 2.6 },
    { d: darkArms, fill: 'rgba(16,100,36,0.42)' },
    { d: lightArms, fill: 'rgba(240,255,190,0.62)' },
    { d: circ(CX + 7, CY + 9, 20), fill: rad(CX + 7, CY + 9, 20, 0, '#ffffff', 0.45, 'rgba(255,255,225,0.75)', 1, 'rgba(255,255,225,0)') },
    // highlights on the rim
    gloss(arcAlong(CX, CY, 76, 90, 196, 248, 16), 4.5, 0.75),
    gloss(arcAlong(CX, CY, 76, 90, 258, 268, 4), 3, 0.6),
    { d: arcAlong(CX, CY, 77, 91, 20, 80, 14), stroke: 'rgba(0,40,10,0.35)', sw: 3.5 },
    // floating goo and sparks
    ...goo(16, 128, 6.5),
    ...goo(188, 142, 7),
    ...goo(30, 196, 4.5),
    ...goo(180, 36, 4.5),
    { d: sparkle(20, 52, 7) + sparkle(188, 86, 5.5) + sparkle(160, 205, 4.5), fill: '#efffbf', stroke: INK, sw: 1.8 },
  ]
  return { viewW: 200, viewH: 220, paths }
}

export function flask(): Art {
  const GLASS = 'M31 16 H49 V44 Q49 47 51 50 L71 96 Q76 110 62 110 H18 Q4 110 9 96 L29 50 Q31 47 31 44 Z'
  const LIQ = 'M21.5 70 Q40 66.5 58.5 70 L68 95.5 Q71.5 106.5 61 106.5 H19 Q8.5 106.5 12 95.5 Z'
  return {
    viewW: 80,
    viewH: 120,
    paths: [
      ...softShadow(40, 112, 34, 5, 0.5, '0,0,0'),
      ...glowPool(40, 110, 30, 5, 0.4, '170,255,90'),
      { d: GLASS, fill: lin(8, 0, 72, 0, 0, 'rgba(235,250,255,0.6)', 0.5, 'rgba(190,225,255,0.28)', 1, 'rgba(140,180,230,0.55)') },
      { d: LIQ, fill: lin(0, 66, 0, 107, 0, '#d2ff72', 0.6, '#5fd23e', 1, '#23902f') },
      { d: LIQ, fill: lin(10, 0, 70, 0, 0, 'rgba(0,60,20,0)', 0.6, 'rgba(0,60,20,0)', 1, 'rgba(0,60,20,0.35)') },
      { d: ell(40, 70, 18.5, 3.2), fill: '#e2ffa0', stroke: 'rgba(30,110,40,0.6)', sw: 1.2 },
      { d: circ(30, 92, 3.6) + circ(44, 84, 2.6) + circ(52, 97, 2.2) + circ(38, 100, 1.6), fill: 'rgba(255,255,255,0.25)', stroke: 'rgba(255,255,255,0.9)', sw: 1.2 },
      { d: 'M58 80 h-6 M61.5 88 h-6 M65 96 h-6', stroke: 'rgba(27,23,18,0.45)', sw: 1.6 },
      { d: GLASS, stroke: INK, sw: 4 },
      { d: rrect(27, 12, 26, 7, 3), fill: lin(0, 12, 0, 19, 0, '#f2fbff', 1, '#b9d4ea'), stroke: INK, sw: 3 },
      { d: rrect(30.5, 1.5, 19, 12, 3), fill: lin(30, 0, 50, 0, 0, '#e2b07c', 1, '#9a6237'), stroke: INK, sw: 3 },
      { d: circ(36, 6, 0.9) + circ(43, 9, 0.9) + circ(45, 5, 0.7), fill: 'rgba(80,40,10,0.5)' },
      gloss('M25.5 58 L15 90', 3.2, 0.85),
      gloss('M36 22 V38', 2.6, 0.75),
      gloss('M16 97 Q15 101 18 103', 2, 0.6),
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
export function kitchenWall(): Art {
  const paths: VectorPath[] = []
  // wallpaper: soft stripes with tiny diamonds
  let st = ''
  for (let x = 3; x < 160; x += 12) st += rect(x, 0, 5, 101)
  paths.push({ d: st, fill: 'rgba(255,255,255,0.1)' })
  let dd = ''
  for (let y = 6; y < 74; y += 12) for (let x = 11.5; x < 160; x += 12) dd += poly([x, y - 1.2, x + 1, y, x, y + 1.2, x - 1, y])
  paths.push({ d: dd, fill: 'rgba(255,255,255,0.22)' })
  // window light from the upper-left, vignette, table shadow on the wall
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(18, -6, 120, 0, 'rgba(255,250,228,0.32)', 1, 'rgba(255,250,228,0)') })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(70, 40, 118, 0.5, 'rgba(8,40,60,0)', 1, 'rgba(8,40,60,0.38)') })
  paths.push({ d: rect(0, 66, 160, 10), fill: lin(0, 66, 0, 76, 0, 'rgba(10,40,60,0)', 1, 'rgba(10,40,60,0.28)') })
  // wall clock stuck at 7 o'clock
  const cx = 144
  const cy = 16
  paths.push({ d: circ(cx + 1, cy + 1.6, 9.4), fill: 'rgba(10,40,60,0.25)' })
  paths.push({ d: circ(cx, cy, 9.2), fill: radLit(cx, cy, 9.2, 0, '#ff8a6e', 1, '#c4321f'), stroke: INK, sw: 1.1 })
  paths.push({ d: circ(cx, cy, 7), fill: radLit(cx, cy, 7, 0, '#ffffff', 1, '#eadfc8'), stroke: INK, sw: 0.7 })
  let ticks = ''
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r0 = i % 3 === 0 ? 4.9 : 5.5
    ticks += `M${q2(cx + r0 * Math.cos(a))} ${q2(cy + r0 * Math.sin(a))}L${q2(cx + 6.2 * Math.cos(a))} ${q2(cy + 6.2 * Math.sin(a))}`
  }
  paths.push({ d: ticks, stroke: INK, sw: 0.5 })
  const ha = (120 * Math.PI) / 180
  paths.push({ d: `M${cx} ${cy}L${q2(cx + 3.4 * Math.cos(ha))} ${q2(cy + 3.4 * Math.sin(ha))}M${cx} ${cy}L${cx} ${cy - 5}`, stroke: INK, sw: 0.8 })
  paths.push({ d: circ(cx, cy, 0.8), fill: '#c4321f' })
  paths.push(gloss(arcAlong(cx, cy, 8.1, 8.1, 200, 250, 8), 0.7, 0.75))
  return { viewW: 160, viewH: 101, paths }
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
      { d: rect(-2, 0, 164, TOP), fill: lin(0, 0, 160, 0, 0, 'rgba(255,255,255,0.18)', 0.5, 'rgba(255,255,255,0)', 1, 'rgba(60,10,0,0.12)') },
      { d: rect(-2, 0, 164, 2.5), fill: lin(0, 0, 0, 2.5, 0, 'rgba(60,20,10,0.25)', 1, 'rgba(60,20,10,0)') },
      { d: rect(-2, TOP, 164, H - TOP), fill: lin(0, TOP, 0, H, 0, 'rgba(70,20,10,0.22)', 1, 'rgba(70,20,10,0.4)') },
      { d: `M-2 ${TOP}H162`, stroke: 'rgba(255,255,255,0.55)', sw: 0.6 },
      { d: 'M-2 0.2H162', stroke: 'rgba(40,15,5,0.35)', sw: 0.5 },
    ],
  }
}

export function lazyCat(): Art {
  const O = lin(30, 0, 190, 0, 0, '#ffbe5c', 0.5, '#f69a2c', 1, '#dc7418')
  const HEAD_FILL = radLit(104, 64, 96, 0, '#ffc66e', 0.55, '#f69a2c', 1, '#d06a12')
  const CREAM = lin(0, 92, 0, 118, 0, '#fff8e4', 1, '#f3d79e')
  const STRIPE = '#3a1f0c'
  const HEAD = smooth([
    110, 26, 142, 28, 166, 40, 180, 62, 186, 78, 198, 86, 184, 93, 192, 104, 172, 111, 150, 123, 110, 129, 70, 123, 48, 111, 28, 104, 36, 93, 22, 86, 34, 78, 40, 62, 54, 40, 78, 28,
  ])
  const BODY = smooth([66, 112, 110, 106, 154, 112, 176, 140, 182, 170, 172, 186, 110, 191, 48, 186, 38, 170, 44, 140])
  const ARM_L = 'M58 122 Q42 158 56 184 L92 184 Q86 156 86 126 Z'
  const ARM_R = 'M162 122 Q178 158 164 184 L128 184 Q134 156 134 126 Z'
  const lid = (cx: number): string => {
    const e = Math.asin(3 / 23)
    const pts: number[] = []
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - e + (i / 24) * (Math.PI + 2 * e)
      pts.push(cx + 19 * Math.cos(a), 76 + 23 * Math.sin(a))
    }
    return poly(pts, false) + `Q${cx} 84 ${q2(pts[0])} ${q2(pts[1])}Z`
  }
  const eye = (cx: number, ix: number): VectorPath[] => [
    { d: ell(cx, 76, 19, 23), fill: radLit(cx, 76, 26, 0, '#ffffff', 0.7, '#f2f5f9', 1, '#cdd6e2'), stroke: INK, sw: 3.5 },
    { d: circ(ix, 86, 9.5), fill: radLit(ix, 86, 9.5, 0, '#eef98a', 1, '#6f9a1e'), stroke: INK, sw: 2 },
    { d: circ(ix, 87, 4.6), fill: INK },
    { d: circ(ix + 3, 83.6, 2.4), fill: '#ffffff' },
    { d: circ(ix - 3, 90.5, 1.1), fill: 'rgba(255,255,255,0.85)' },
    { d: lid(cx), fill: HEAD_FILL, stroke: INK, sw: 3.5 },
  ]
  const paths: VectorPath[] = [
    ...softShadow(112, 189, 86, 9, 0.38, '60,20,0'),
    // tail curling up behind
    { d: 'M166 182 Q214 184 206 146 Q202 124 216 108', stroke: INK, sw: 19 },
    { d: 'M166 182 Q214 184 206 146 Q202 124 216 108', stroke: lin(160, 0, 216, 0, 0, '#f69a2c', 1, '#d87016'), sw: 13 },
    { d: lens(198, 172, 212, 166, 2.2) + lens(200, 146, 214, 144, 2.2) + lens(203, 126, 216, 124, 2), fill: STRIPE },
    // body + belly
    { d: BODY, fill: O, stroke: INK, sw: 4.5 },
    { d: BODY, fill: lin(40, 0, 182, 0, 0, 'rgba(120,40,0,0)', 0.6, 'rgba(120,40,0,0)', 1, 'rgba(120,40,0,0.3)') },
    { d: ell(110, 160, 34, 26), fill: CREAM },
    { d: lens(40, 146, 60, 150, 3) + lens(39, 160, 58, 163, 3) + lens(180, 146, 160, 150, 3) + lens(181, 160, 162, 163, 3), fill: STRIPE },
    // ears (behind head)
    { d: 'M42 66 L47 24 Q49 10 61 16 L98 40 Z M178 66 L173 24 Q171 10 159 16 L122 40 Z', fill: HEAD_FILL, stroke: INK, sw: 4.5 },
    { d: 'M55 52 L57 30 Q58 24 64 28 L84 41 Z M165 52 L163 30 Q162 24 156 28 L136 41 Z', fill: lin(0, 24, 0, 52, 0, '#ffc4c4', 1, '#ee8f97') },
    // head
    { d: HEAD, fill: HEAD_FILL, stroke: INK, sw: 4.8 },
    { d: HEAD, fill: lin(60, 40, 190, 128, 0, 'rgba(140,50,0,0)', 0.6, 'rgba(140,50,0,0)', 1, 'rgba(140,50,0,0.32)') },
    gloss(arcAlong(110, 74, 62, 40, 205, 248, 14), 4.2, 0.6),
    { d: lens(110, 27, 110, 49, 3.4) + lens(97, 29, 100, 46, 2.7) + lens(123, 29, 120, 46, 2.7), fill: STRIPE },
    { d: lens(25, 87, 46, 88, 2.4) + lens(33, 99, 50, 97, 2.2) + lens(195, 87, 174, 88, 2.4) + lens(187, 99, 170, 97, 2.2), fill: STRIPE },
    // sleepy eyes
    ...eye(91.5, 86),
    ...eye(128.5, 120),
    // muzzle, nose, bored mouth, whiskers
    { d: ell(99, 105, 14, 10.5) + ell(121, 105, 14, 10.5), stroke: INK, sw: 6 },
    { d: ell(99, 105, 14, 10.5), fill: CREAM },
    { d: ell(121, 105, 14, 10.5), fill: CREAM },
    { d: 'M110 99 Q111 106 110 113', stroke: INK, sw: 2.4 },
    { d: circ(95, 106, 1.1) + circ(101, 109, 1.1) + circ(96, 111, 1.1) + circ(125, 106, 1.1) + circ(119, 109, 1.1) + circ(124, 111, 1.1), fill: 'rgba(120,60,20,0.6)' },
    { d: 'M103 95 Q110 90.5 117 95 Q114.5 101.5 110 102.5 Q105.5 101.5 103 95 Z', fill: radLit(110, 96, 8, 0, '#ffb3c8', 1, '#e0557f'), stroke: INK, sw: 2.4 },
    { d: circ(107.5, 95, 1.4), fill: 'rgba(255,255,255,0.85)' },
    { d: 'M103 120.5 Q110 117.5 117 120.5', stroke: INK, sw: 2.6 },
    { d: 'M85 102 Q68 98 50 100 M85 108 Q68 108 49 113 M135 102 Q152 98 170 100 M135 108 Q152 108 171 113', stroke: INK, sw: 1.8 },
    // arms + paws resting on the table, one holding a fork
    { d: ARM_L, fill: O, stroke: INK, sw: 4.2 },
    { d: lens(46, 150, 62, 152, 2.4) + lens(47, 166, 62, 167, 2.4), fill: STRIPE },
    { d: ARM_R, fill: O, stroke: INK, sw: 4.2 },
    { d: lens(174, 150, 158, 152, 2.4) + lens(173, 166, 158, 167, 2.4), fill: STRIPE },
    { d: ell(74, 184, 21, 11) + ell(146, 184, 21, 11), fill: lin(0, 173, 0, 195, 0, '#ffc066', 1, '#e07f1e'), stroke: INK, sw: 4 },
    { d: 'M68 187 V193 M78 187 V193 M140 187 V193 M150 187 V193', stroke: INK, sw: 2.2 },
    gloss(arcAlong(74, 184, 15, 6.5, 200, 250, 8), 2.2, 0.6),
    gloss(arcAlong(146, 184, 15, 6.5, 200, 250, 8), 2.2, 0.6),
  ]
  return { viewW: 220, viewH: 200, paths }
}

export function lasagna(): Art {
  // slice in 3/4 view: front face, right side face, cheesy top
  const L = 30
  const R = 94
  const T = 48
  const B = 80
  const DX = 18
  const DY = -10
  const layers: [number, string][] = [
    [T, '#e9a33c'], [T + 5, '#f8db7c'], [T + 9.5, '#c8361f'], [T + 15, '#fff2d0'], [T + 18.5, '#f8db7c'], [T + 23, '#c8361f'], [T + 28, '#f8db7c'],
  ]
  const front: VectorPath[] = []
  const side: VectorPath[] = []
  layers.forEach(([y0, c], i) => {
    const y1 = i + 1 < layers.length ? layers[i + 1][0] : B
    front.push({ d: rect(L, y0, R - L, y1 - y0), fill: c })
    side.push({ d: poly([R, y0, R + DX, y0 + DY, R + DX, y1 + DY, R, y1]), fill: shade(c, -0.25) })
  })
  const SLICE = poly([L, T, L + DX, T + DY, R + DX, T + DY, R + DX, B + DY, R, B, L, B])
  const TOPFACE = poly([L, T, L + DX, T + DY, R + DX, T + DY, R, T])
  return {
    viewW: 140,
    viewH: 100,
    paths: [
      ...softShadow(70, 88, 66, 8, 0.4, '60,20,0'),
      // plate
      { d: ell(70, 82, 64, 15), fill: lin(0, 67, 0, 97, 0, '#ffffff', 1, '#cfd8e3'), stroke: INK, sw: 3.5 },
      { d: ell(70, 81, 48, 10), fill: lin(0, 71, 0, 91, 0, '#e6ecf3', 1, '#ffffff'), stroke: 'rgba(27,23,18,0.18)', sw: 1.5 },
      ...softShadow(74, 81, 46, 6, 0.45, '60,20,0'),
      // slice
      ...front,
      ...side,
      { d: TOPFACE, fill: lin(0, T + DY, 0, T, 0, '#ffe58a', 1, '#f6c24e') },
      { d: ell(52, 43, 4, 1.6) + ell(80, 41, 5, 1.8) + ell(98, 42, 3, 1.2) + ell(66, 45, 2.6, 1), fill: 'rgba(196,110,30,0.75)' },
      { d: ell(60, 41, 2.6, 1.1) + ell(90, 44.5, 2.4, 1), fill: '#c8361f' },
      // cheese drips over the front edge
      { d: `M${L} ${T}H${R}V${T + 3}Q${R - 4} ${T + 3} ${R - 6} ${T + 8}Q${R - 8} ${T + 12} ${R - 10} ${T + 7}Q${R - 13} ${T + 3} ${R - 20} ${T + 4}Q${R - 26} ${T + 4} ${R - 28} ${T + 10}Q${R - 30} ${T + 15} ${R - 33} ${T + 9}Q${R - 36} ${T + 3} ${R - 44} ${T + 4}Q${R - 50} ${T + 5} ${R - 52} ${T + 8}Q${R - 54} ${T + 11} ${R - 56} ${T + 6}Q${R - 58} ${T + 3} ${L} ${T + 3}Z`, fill: lin(0, T, 0, T + 14, 0, '#ffd760', 1, '#f2a93a') },
      { d: SLICE, fill: lin(L, 0, R + DX, 0, 0, 'rgba(255,255,255,0.08)', 0.6, 'rgba(0,0,0,0)', 1, 'rgba(60,10,0,0.12)') },
      { d: `M${R} ${T}V${B}M${L} ${T}H${R}L${R + DX} ${T + DY}`, stroke: INK, sw: 2.2 },
      { d: SLICE, stroke: INK, sw: 3.6 },
      gloss(`M${L + 8} ${T - 3} L${L + 22} ${T - 7}`, 2.2, 0.8),
      // basil leaf
      { d: 'M70 40 Q78 32 88 36 Q80 44 70 40 Z', fill: lin(70, 34, 88, 42, 0, '#7fd35a', 1, '#2f8a32'), stroke: INK, sw: 2 },
      { d: 'M72 39.5 Q79 37 85 37', stroke: 'rgba(255,255,255,0.6)', sw: 1 },
      // steam
      { d: 'M48 30 Q42 22 48 15 Q54 8 48 0 M68 27 Q62 18 68 11 Q74 4 69 -3 M88 29 Q82 21 88 14 Q94 7 89 1', stroke: 'rgba(255,255,255,0.75)', sw: 3.6 },
    ],
  }
}

// ---- Flower-power mystery van -----------------------------------------------
function powerFlower(cx: number, cy: number, r: number): VectorPath[] {
  const petals: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    petals.push(circ(cx + r * 0.6 * Math.cos(a), cy + r * 0.6 * Math.sin(a), r * 0.48))
  }
  const pf = radLit(cx, cy, r * 1.15, 0, '#ffd27a', 0.6, '#ff9b2e', 1, '#e0661a')
  return [
    { d: petals.join(''), stroke: INK, sw: Math.max(2.4, r * 0.36) },
    ...petals.map((d) => ({ d, fill: pf })),
    { d: circ(cx, cy, r * 0.36), fill: radLit(cx, cy, r * 0.36, 0, '#fff7a8', 1, '#f2b81c'), stroke: INK, sw: Math.max(1.4, r * 0.15) },
    { d: circ(cx - r * 0.42, cy - r * 0.62, r * 0.13), fill: 'rgba(255,255,255,0.8)' },
  ]
}

export function mysteryVan(): Art {
  const BODY = 'M18 104 Q14 104 14 98 L14 40 Q14 21 34 21 L170 20 Q184 20 192 30 L214 60 Q230 64 232 80 L232 98 Q232 104 226 104 Z'
  const LOWER = 'M14 72 H229.8 Q232 76 232 82 L232 98 Q232 104 226 104 H18 Q14 104 14 98 Z'
  const GLASS = lin(0, 30, 0, 58, 0, '#e8f9ff', 0.5, '#96d4f0', 1, '#4a8cc2')
  const wins = [rrect(28, 30, 40, 26, 6), rrect(76, 30, 40, 26, 6), rrect(124, 30, 32, 26, 6)]
  const SHIELD = 'M167 30 H185 Q189 30 191 33 L207 56 Q208.5 58.5 205 58.5 H171 Q167 58.5 167 54.5 Z'
  const wheel = (x: number): VectorPath[] => [
    { d: circ(x, 107, 18), fill: radLit(x, 107, 18, 0, '#50505c', 1, '#101016'), stroke: INK, sw: 3.5 },
    { d: circ(x, 107, 9.5), fill: radLit(x, 107, 9.5, 0, '#ffffff', 0.6, '#cfd6de', 1, '#8a94a1'), stroke: INK, sw: 2.2 },
    { d: circ(x, 107, 2.8), fill: '#5f6874' },
    gloss(arcAlong(x, 107, 14, 14, 200, 250, 8), 2, 0.35),
  ]
  return {
    viewW: 240,
    viewH: 136,
    paths: [
      ...softShadow(122, 126, 116, 8, 0.55, '5,0,20'),
      // roof rack + luggage
      { d: rrect(48, 3, 30, 11, 2.5), fill: lin(0, 3, 0, 14, 0, '#d79a5a', 1, '#8a5527'), stroke: INK, sw: 2.4 },
      { d: 'M63 3 V14 M56 3 Q56 0 63 0 Q70 0 70 3', stroke: INK, sw: 1.8 },
      { d: rrect(86, 4, 36, 10, 5), fill: lin(0, 4, 0, 14, 0, '#ff8fa0', 1, '#c4385a'), stroke: INK, sw: 2.4 },
      { d: 'M96 4.5 V13.5 M112 4.5 V13.5', stroke: 'rgba(255,255,255,0.75)', sw: 1.6 },
      { d: 'M34 21 V14 M158 20 V14', stroke: INK, sw: 3 },
      { d: 'M28 14 H164', stroke: INK, sw: 4 },
      { d: 'M28 14 H164', stroke: '#c9d1da', sw: 1.6 },
      // body: teal top, blue skirt, orange stripe
      { d: BODY, fill: lin(0, 20, 0, 72, 0, '#93f2da', 1, '#2fb398') },
      { d: LOWER, fill: lin(0, 72, 0, 104, 0, '#5c9ef6', 1, '#264fae') },
      { d: BODY, fill: lin(14, 0, 232, 0, 0, 'rgba(0,20,60,0)', 0.55, 'rgba(0,20,60,0)', 1, 'rgba(0,20,60,0.2)') },
      { d: 'M14 72 H229.8', stroke: INK, sw: 6.5 },
      { d: 'M14 72 H229.8', stroke: '#ffa133', sw: 3.4 },
      gloss('M21 36 Q21 27 34 26.5 L166 25.5', 3.2, 0.7),
      // glass
      { d: wins.join('') + SHIELD, fill: GLASS, stroke: INK, sw: 3.5 },
      { d: 'M40 33 L32 45 M48 33 L37 50 M88 33 L80 45 M96 33 L85 50 M136 33 L128 45 M143 33 L133 49 M180 33 L174 44 M188 34 L179 51', stroke: 'rgba(255,255,255,0.6)', sw: 2.6 },
      // door, handle, mirror
      { d: 'M162 25 V101', stroke: INK, sw: 2.6 },
      { d: rrect(149, 62, 9, 3.4, 1.7), fill: '#e3e8ee', stroke: INK, sw: 1.8 },
      { d: 'M209 52 L213 47', stroke: INK, sw: 2.4 },
      { d: rrect(210, 40, 7, 9, 2.5), fill: '#3bc0a2', stroke: INK, sw: 2.2 },
      // flowers
      ...powerFlower(24, 88, 7),
      ...powerFlower(98, 87, 10.5),
      ...powerFlower(132, 82, 7.5),
      ...powerFlower(152, 94, 6),
      ...powerFlower(50, 64, 5.5),
      ...powerFlower(142, 64, 5),
      // wheel arches
      { d: 'M33 104 A23 23 0 0 1 79 104 Z M165 104 A23 23 0 0 1 211 104 Z', fill: '#140e28' },
      { d: BODY, stroke: INK, sw: 4.6 },
      { d: 'M33 104 A23 23 0 0 1 79 104 M165 104 A23 23 0 0 1 211 104', stroke: INK, sw: 3.6 },
      ...wheel(56),
      ...wheel(188),
      // bumpers and lights
      { d: rrect(7, 94, 13, 9, 3) + rrect(223, 94, 15, 9, 3), fill: lin(0, 94, 0, 103, 0, '#f6f8fb', 1, '#97a1ad'), stroke: INK, sw: 2.6 },
      { d: rrect(12, 76, 5, 10, 2), fill: lin(0, 76, 0, 86, 0, '#ff8a7a', 1, '#c7261e'), stroke: INK, sw: 2 },
      { d: circ(229, 80, 16), fill: rad(229, 80, 16, 0, 'rgba(255,240,170,0.75)', 1, 'rgba(255,240,170,0)') },
      { d: circ(228.5, 80, 5), fill: radLit(228.5, 80, 5, 0, '#ffffff', 0.5, '#fff1a0', 1, '#f2b81c'), stroke: INK, sw: 2.4 },
    ],
  }
}

export function ghost(): Art {
  const BODY = 'M14 42 Q14 8 40 8 Q66 8 66 42 L66 74 Q63 81 58 76 Q53 71 48 77 Q44 82 40 77 Q36 71 32 77 Q27 82 22 76 Q17 71 14 76 Z'
  return {
    viewW: 80,
    viewH: 90,
    paths: [
      { d: ell(40, 44, 40, 44), fill: rad(40, 44, 42, 0, 'rgba(220,210,255,0.4)', 1, 'rgba(220,210,255,0)') },
      { d: 'M15 46 Q4 46 6 56 Q12 57 16 52 Z M65 46 Q76 44 75 34 Q69 34 65 40 Z', fill: '#e9ebff', stroke: INK, sw: 3 },
      { d: BODY, fill: lin(14, 0, 66, 0, 0, '#ffffff', 0.6, '#eef0ff', 1, '#c4c8f0') },
      { d: BODY, stroke: INK, sw: 3.6 },
      gloss('M21 34 Q22 17 36 14', 3.2, 0.95),
      { d: ell(31, 38, 5, 7) + ell(49, 38, 5, 7), fill: INK },
      { d: circ(32.6, 35.5, 1.8) + circ(50.6, 35.5, 1.8), fill: '#ffffff' },
      { d: ell(40, 52, 4, 5), fill: '#3a1530', stroke: INK, sw: 2 },
      { d: circ(25, 47, 4.5), fill: rad(25, 47, 4.5, 0, 'rgba(255,120,170,0.55)', 1, 'rgba(255,120,170,0)') },
      { d: circ(55, 47, 4.5), fill: rad(55, 47, 4.5, 0, 'rgba(255,120,170,0.55)', 1, 'rgba(255,120,170,0)') },
    ],
  }
}

export function hauntedNight(): Art {
  // bat silhouette: pointed wing tips, scalloped trailing edge, little ears
  const bat = (x: number, y: number, k: number) => {
    const T = (px: number, py: number) => `${q2(x + px * k)} ${q2(y + py * k)}`
    return (
      `M${T(0, -1)}Q${T(4, -5)} ${T(9, -5.5)}Q${T(13, -6)} ${T(16, -3.5)}Q${T(13, -2.5)} ${T(12, 1)}Q${T(10, -0.5)} ${T(7.5, 2)}` +
      `Q${T(5.5, 0.5)} ${T(3, 3)}Q${T(1.5, 2)} ${T(0, 4)}Q${T(-1.5, 2)} ${T(-3, 3)}Q${T(-5.5, 0.5)} ${T(-7.5, 2)}Q${T(-10, -0.5)} ${T(-12, 1)}` +
      `Q${T(-13, -2.5)} ${T(-16, -3.5)}Q${T(-13, -6)} ${T(-9, -5.5)}Q${T(-4, -5)} ${T(0, -1)}Z` +
      `M${T(-1.8, 0)}L${T(-1.5, -3.6)}L${T(-0.5, -1.6)}L${T(0.5, -1.6)}L${T(1.5, -3.6)}L${T(1.8, 0)}Q${T(1.8, 3)} ${T(0, 3.4)}Q${T(-1.8, 3)} ${T(-1.8, 0)}Z`
    )
  }
  const paths: VectorPath[] = []
  paths.push({ d: dots(46, 9, 160, 58, 0.18, 0.5), fill: 'rgba(255,255,255,0.55)' })
  // moon with halo, craters and a wisp of cloud
  paths.push({ d: circ(126, 24, 40), fill: rad(126, 24, 40, 0, 'rgba(255,240,190,0.5)', 0.35, 'rgba(255,230,170,0.16)', 1, 'rgba(255,230,170,0)') })
  paths.push({ d: circ(126, 24, 14), fill: radLit(126, 24, 14, 0, '#fffcea', 0.6, '#ffedb0', 1, '#e8c56e') })
  paths.push({ d: ell(121, 19, 2.8, 2.4) + ell(131.5, 28, 3.6, 3.1) + ell(122.5, 31, 1.8, 1.6) + ell(132, 17.5, 1.5, 1.3), fill: 'rgba(200,160,80,0.35)' })
  paths.push({ d: lens(98, 31, 146, 31.5, 2.4) + lens(116, 36, 156, 36, 1.8) + lens(90, 26.5, 112, 26, 1.2), fill: 'rgba(52,36,104,0.82)' })
  paths.push({ d: bat(124, 15, 0.42) + bat(100, 9, 0.36) + bat(148, 46, 0.32), fill: '#110a26' })
  // far hills
  paths.push({ d: 'M-2 70 Q22 61 46 67 Q70 73 92 63 Q122 52 162 61 L162 101 L-2 101 Z', fill: '#2d2262' })
  // gravestones on the far hill
  const stone = (x: number, y: number, w: number, h: number) => `M${x} ${y}V${y - h + w / 2}Q${x} ${y - h} ${x + w / 2} ${y - h}Q${x + w} ${y - h} ${x + w} ${y - h + w / 2}V${y}Z`
  paths.push({ d: stone(10, 70, 5, 6) + stone(20, 69.5, 4, 5) + stone(36, 72, 4.5, 5.5) + rect(29.2, 63.5, 1.4, 7.5) + rect(27.4, 65.2, 5, 1.4), fill: '#221a50' })
  // mid hill with the haunted mansion against the moon
  paths.push({ d: 'M58 101 L58 80 Q86 60 110 58 Q138 57 162 68 L162 101 Z', fill: '#1f1748' })
  const HOUSE =
    rect(94, 44, 26, 16) + poly([91.5, 44.5, 107, 34, 122.5, 44.5]) + rect(89, 36, 7, 24) + poly([88, 36.5, 92.5, 24, 97, 36.5]) +
    rect(116, 30, 8, 30) + poly([115, 30.5, 120, 15, 125, 30.5]) + rect(103, 32, 3, 6) + rect(86, 58, 42, 3)
  paths.push({ d: HOUSE, fill: '#150e33' })
  const lit = rect(91, 40, 2.6, 3.4) + rect(98, 48, 3.4, 4) + rect(110, 48, 3.4, 4) + rect(118.6, 35, 2.8, 3.6) + rect(104.5, 53, 3.6, 7)
  paths.push({ d: circ(100, 50, 12), fill: rad(100, 50, 12, 0, 'rgba(255,200,90,0.22)', 1, 'rgba(255,200,90,0)') })
  paths.push({ d: lit, fill: '#ffcf6b' })
  // gnarled tree on the right edge
  paths.push({ d: 'M162 101 L150 101 Q154 84 151 72 Q148 62 141 56 L143 54 Q151 60 154 68 Q156 58 152 48 L155 47 Q160 58 158 72 Q158 86 162 92 Z', fill: '#100a24' })
  paths.push({ d: 'M150 64 Q142 60 136 62 M146 58 Q144 50 138 47 M153 52 Q150 44 152 38 M157 60 Q162 52 162 46', stroke: '#100a24', sw: 1.2 })
  // drifting fog, then the near ground
  paths.push({ d: lens(-10, 81, 72, 81, 3) + lens(56, 84.5, 130, 84.5, 2.6) + lens(104, 78.5, 170, 78.5, 2.6), fill: 'rgba(190,175,255,0.17)' })
  paths.push({ d: 'M-2 90 Q50 84 100 88.5 Q130 91 162 86.5 L162 101 L-2 101 Z', fill: lin(0, 85, 0, 101, 0, '#2a1f55', 1, '#120c26') })
  paths.push({ d: 'M-2 90 Q50 84 100 88.5 Q130 91 162 86.5', stroke: 'rgba(190,175,255,0.3)', sw: 0.6 })
  paths.push({ d: lens(-8, 94, 66, 94, 2.2) + lens(70, 97, 170, 97, 2.2), fill: 'rgba(190,175,255,0.13)' })
  return { viewW: 160, viewH: 101, paths }
}
