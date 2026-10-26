import type { VectorPath } from '../../types'
import { circ, dots, ell, lin, pixels, poly, rad, radLit, rect, rng, star, type Art } from './kit'
import { rotEll } from './cardparts'
import { glow, mix, neon, rays, rgba, smooth, taper, vignette } from './core-vivid'

// Artwork for gaming, anime/manga, street, vintage, glass, gradient,
// geometric and futuristic collections. Lit scenes, no lettering.

const W = 160
const H = 101
const f = (v: number) => Math.round(v * 100) / 100

function tf(pts: number[], fn: (x: number, y: number) => [number, number]): number[] {
  const out: number[] = []
  for (let i = 0; i < pts.length; i += 2) out.push(...fn(pts[i], pts[i + 1]))
  return out
}

// ---- Arena: 3D bevelled esports shield (vector overlay) ---------------------------
export function esportsEmblem(): Art {
  const shield = 'M50 4 L92 16 L88 62 Q76 88 50 98 Q24 88 12 62 L8 16 Z'
  const panel = 'M50 13 L83 22 L80 59 Q70 80 50 89 Q30 80 20 59 L17 22 Z'
  const bolt = [57, 19, 31, 57, 47, 57, 39, 86, 72, 45, 55, 45, 64, 19]
  const boltAt = (ox: number, oy: number) => poly(tf(bolt, (x, y) => [x + ox, y + oy]))
  const paths: VectorPath[] = [
    // metal frame
    { d: shield, fill: lin(10, 4, 90, 98, 0, '#f6f9ff', 0.3, '#a9b6d4', 0.62, '#39435f', 1, '#8fa0c8') },
    { d: rect(50, 0, 50, 102), fill: 'rgba(10,20,60,0.32)', blend: 'multiply', clip: shield },
    { d: 'M50 4 L8 16 L12 62', stroke: 'rgba(255,255,255,0.9)', sw: 1.2 },
    { d: 'M92 16 L88 62 Q76 88 50 98', stroke: 'rgba(80,230,255,0.85)', sw: 1.1, blend: 'screen' },
    // bevel step
    { d: 'M50 9 L87 19.5 L84 60.5 Q73 84 50 93.5 Q27 84 16 60.5 L13 19.5 Z', stroke: 'rgba(20,30,60,0.55)', sw: 1.2 },
    // recessed panel with inner shadow
    { d: panel, fill: lin(20, 13, 80, 89, 0, '#2a7bff', 0.55, '#0c2f9a', 1, '#04103a') },
    { d: panel, fill: rad(34, 26, 46, 0, 'rgba(120,220,255,0.55)', 1, 'rgba(120,220,255,0)'), blend: 'screen' },
    { d: panel, stroke: 'rgba(0,5,30,0.7)', sw: 5, blend: 'multiply', clip: panel },
    { d: 'M17 22 L50 13 L83 22', stroke: 'rgba(255,255,255,0.35)', sw: 0.6, clip: 'M0 0H100V30H0Z' },
    // bolt: glow, extrusion, lit face, speculars
    { d: boltAt(0, 0), fill: 'rgba(255,170,0,0.5)', stroke: 'rgba(255,170,0,0.35)', sw: 7, blend: 'lighter' },
    ...[2.6, 2.1, 1.6, 1.1, 0.6].map((k) => ({ d: boltAt(k, k * 1.1), fill: mix('#5a2a00', '#c25e00', 1 - k / 2.6) })),
    { d: boltAt(0, 0), fill: lin(30, 19, 72, 86, 0, '#fffbe0', 0.45, '#ffc21a', 1, '#ff7a00') },
    { d: rect(50, 40, 40, 60), fill: 'rgba(160,60,0,0.3)', blend: 'multiply', clip: boltAt(0, 0) },
    { d: 'M57 19 L31 57 M39 86 L47 57', stroke: 'rgba(255,255,255,0.85)', sw: 0.7 },
    { d: boltAt(0, 0), stroke: '#3a1800', sw: 0.6 },
    // glass sheen
    { d: poly([0, 40, 60, 0, 72, 0, 0, 52]), fill: 'rgba(255,255,255,0.22)', blend: 'screen', clip: shield },
    { d: circ(26, 20, 2.2), fill: 'rgba(255,255,255,0.95)' },
  ]
  return { viewW: 100, viewH: 102, paths }
}

// Arena stage: LED gate, spotlight beams, haze, podium, cheering crowd.
export function arenaStage(): Art {
  const p: VectorPath[] = []
  const cx = 80
  const cy = 41
  p.push(glow(cx, cy, 90, '#1a4cff', 0.35))
  // hex panelling, only visible near the light
  p.push({ ...hexField('rgba(45,226,255,0.22)').paths[0], clip: circ(cx, cy, 60) })
  p.push({ d: rect(-2, -2, W + 4, H + 4), fill: rad(cx, cy, 70, 0.4, 'rgba(3,7,20,0)', 1, 'rgba(3,7,20,0.85)'), blend: 'multiply' })
  // LED gate rings behind the emblem
  const arc = (r: number, a0: number, a1: number) => {
    const pt = (a: number) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`
    return `M${pt(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1)}`
  }
  p.push(...neon(arc(33, Math.PI * 0.8, Math.PI * 2.2), '#2de2ff', 0.6))
  p.push(...neon(arc(39, Math.PI * 1.1, Math.PI * 1.45) + arc(39, Math.PI * 1.55, Math.PI * 1.9), '#ff3df0', 0.5))
  let ticks = ''
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    ticks += `M${f(cx + 43 * Math.cos(a))} ${f(cy + 43 * Math.sin(a))}L${f(cx + 45.5 * Math.cos(a))} ${f(cy + 45.5 * Math.sin(a))}`
  }
  p.push({ d: ticks, stroke: 'rgba(45,226,255,0.45)', sw: 0.5, blend: 'screen' })
  // spotlight beams from the rig
  const beams: [number, number, string][] = [
    [8, 64, '#2de2ff'],
    [34, 72, '#ff3df0'],
    [126, 88, '#ff3df0'],
    [152, 96, '#2de2ff'],
  ]
  let rig = ''
  for (const [sx, tx, c] of beams) {
    p.push({ d: poly([sx - 1, -1, sx + 1, -1, tx + 12, 78, tx - 12, 78]), fill: lin(sx, 0, tx, 78, 0, rgba(c, 0.55), 0.6, rgba(c, 0.12), 1, rgba(c, 0)), blend: 'screen' })
    p.push(glow(sx, 0, 9, c, 0.9), glow(sx, 0, 3, '#ffffff', 1))
    rig += rect(sx - 2, -1, 4, 2.4)
  }
  p.push({ d: 'M0 1.2H160', stroke: '#0a1020', sw: 1.6 }, { d: rig, fill: '#141a2c' })
  // smoke haze
  const r = rng(14)
  for (let i = 0; i < 7; i++) p.push({ d: ell(r() * 160, 52 + r() * 26, 20 + r() * 20, 5 + r() * 4), fill: rad(80, 70, 90, 0, 'rgba(120,170,255,0.12)', 1, 'rgba(120,170,255,0.03)'), blend: 'screen' })
  // emblem halo
  p.push(glow(cx, cy, 34, '#2de2ff', 0.45), glow(cx, cy + 6, 18, '#ffb800', 0.25))
  // podium in two tiers
  const tier = (y: number, rx: number, ry: number, hgt: number, top: string, side: string) => {
    p.push({ d: `M${cx - rx} ${y}A${rx} ${ry} 0 0 0 ${cx + rx} ${y}V${y + hgt}A${rx} ${ry} 0 0 1 ${cx - rx} ${y + hgt}Z`, fill: lin(cx - rx, 0, cx + rx, 0, 0, side, 0.45, mix(side, '#ffffff', 0.12), 1, mix(side, '#000000', 0.5)) })
    p.push({ d: ell(cx, y, rx, ry), fill: lin(0, y - ry, 0, y + ry, 0, mix(top, '#000000', 0.3), 1, top) })
    p.push(...neon(`M${cx - rx} ${y}A${rx} ${ry} 0 0 0 ${cx + rx} ${y}`, '#2de2ff', 0.45))
  }
  tier(80, 54, 7, 6, '#16234a', '#0a1430')
  tier(72, 38, 5, 6, '#1c2e60', '#0d1a40')
  p.push({ d: ell(cx, 72, 30, 3.6), fill: rad(cx, 72, 30, 0, 'rgba(120,230,255,0.55)', 1, 'rgba(120,230,255,0)'), blend: 'screen' })
  p.push({ d: ell(cx, 72.5, 14, 1.8), fill: 'rgba(0,0,10,0.55)', blend: 'multiply' })
  // crowd silhouettes, rim lit by the stage
  const crowd = (ox: number, oy: number) => {
    const rc = rng(61)
    let d = ''
    for (let x = -4; x < 166; x += 6 + rc() * 4) {
      const base = 94 + rc() * 5
      const hr = 3 + rc() * 1.4
      d += circ(x, base - hr * 1.2 + oy, hr) + `M${f(x - 5.5 + ox)} ${H + 3}Q${f(x - 5 + ox)} ${f(base + oy)} ${f(x + ox)} ${f(base + oy)}Q${f(x + 5 + ox)} ${f(base + oy)} ${f(x + 5.5 + ox)} ${H + 3}Z`
      if (rc() < 0.3) {
        const s = rc() < 0.5 ? -1 : 1
        d += taper([x + s * 3, base, x + s * 6, base - 9, x + s * 7, base - 15], 2, 1.4, ox, oy) + circ(x + s * 7 + ox, base - 16 + oy, 1.3)
      }
    }
    return d
  }
  p.push({ d: crowd(0, -0.5), fill: 'rgba(80,220,255,0.4)' })
  p.push({ d: crowd(0, 0), fill: '#02040c' })
  let phones = ''
  for (let i = 0; i < 9; i++) phones += circ(6 + r() * 148, 82 + r() * 8, 0.45)
  p.push({ d: phones, fill: '#ffffff' })
  p.push({ d: phones, stroke: 'rgba(255,255,255,0.25)', sw: 2.2, blend: 'lighter' })
  // confetti / sparks in the beams
  let conf = ''
  let conf2 = ''
  for (let i = 0; i < 40; i++) {
    const d = rect(r() * 160, 6 + r() * 60, 0.5 + r() * 0.6, 0.3 + r() * 0.4)
    if (r() < 0.5) conf += d
    else conf2 += d
  }
  p.push({ d: conf, fill: '#7ff6ff', blend: 'lighter', alpha: 0.8 }, { d: conf2, fill: '#ffd34d', blend: 'lighter', alpha: 0.8 })
  p.push(vignette(0.6))
  return { viewW: W, viewH: H, paths: p }
}

export function hexField(color = 'rgba(45,226,255,0.12)'): Art {
  let d = ''
  const s = 9
  const h = s * Math.sqrt(3)
  for (let row = 0; row * h * 0.5 < 112; row++) {
    for (let col = 0; col * s * 3 < 176; col++) {
      const cx = col * s * 3 + (row % 2 ? s * 1.5 : 0)
      const cy = row * h * 0.5
      const p: number[] = []
      for (let k = 0; k < 6; k++) p.push(cx + s * 0.92 * Math.cos((k * Math.PI) / 3), cy + s * 0.92 * Math.sin((k * Math.PI) / 3))
      d += poly(p)
    }
  }
  return { viewW: 160, viewH: 101, paths: [{ d, stroke: color, sw: 0.5 }] }
}

// ---- Pixel: 8-bit valley with shaded mountains, lake, knight, coins and bloom ----
export function pixelLandscape(): Art {
  const GW = 80
  const GH = 50
  const sunX = 62
  const sunY = 11
  const mtn = (x: number) => {
    const a = 22 + Math.abs(((x + 6) % 26) - 13) * 1.15
    const b = 26 + Math.abs(((x + 19) % 18) - 9) * 1.2
    return Math.min(a, b)
  }
  const hill = (x: number) => Math.round(35 + 2.2 * Math.sin(x / 7) + 1.2 * Math.sin(x / 3.1))
  const clouds: [number, number, number][] = [
    [14, 8, 4],
    [19, 7, 3],
    [10, 9, 3],
    [40, 14, 3],
    [44, 13, 3.5],
    [48, 14, 2.6],
  ]
  const trees: [number, number][] = [
    [6, 0],
    [27, 0],
    [72, 0],
    [33, 0],
  ]
  // 4x4 ordered (Bayer) dither thresholds
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
  const bay = (x: number, y: number) => (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16
  const skyKeys = '012345'
  const farM = (x: number) => 25 + Math.abs(((x + 30) % 34) - 17) * 0.7
  const rows: string[] = []
  for (let y = 0; y < GH; y++) {
    let row = ''
    for (let x = 0; x < GW; x++) {
      const b = bay(x, y)
      // sky: solid 16-bit style bands (dither rows read as dashes at this scale)
      let c = skyKeys[Math.min(skyKeys.length - 1, Math.floor(y / 6.4))]
      const dsun = Math.hypot(x - sunX, (y - sunY) * 1.05)
      if (dsun < 4.2) c = 'S'
      else if (dsun < 5.4) c = 's'
      else if (dsun < 10 && (10 - dsun) / 4.6 > b) c = 'h'
      for (const [ccx, ccy, cr] of clouds) {
        const dc = Math.hypot(x - ccx, (y - ccy) * 1.6)
        if (dc < cr) c = y > ccy + 0.4 ? 'v' : x > ccx + cr * 0.3 && y < ccy ? 'w' : 'u'
      }
      // far range: pale and hazy
      const fm = farM(x)
      if (y > fm) c = farM(x + 1) >= fm ? 'F' : 'f'
      // main range: lit / shaded flanks, snow caps
      const m = mtn(x)
      if (y > m) {
        const lit = mtn(x + 1) >= mtn(x)
        c = lit ? 'M' : 'N'
        if (m < 26 && y < m + 2.5) c = lit ? 'W' : 'X'
        else if (y - m > 6 && (y - m - 6) / 6 > b) c = lit ? 'N' : 'O'
      }
      // hills: highlight rim, lit / shaded slopes, darker with depth
      const hl = hill(x)
      if (y >= hl) {
        const lit = hill(x + 1) <= hl
        c = y === hl ? (lit ? 'g' : 'G') : lit ? 'G' : 'H'
        if (y - hl >= 4 || (y - hl === 3 && b < 0.5)) c = 'J'
      }
      if (y >= 41 && y <= 44) {
        c = y < 43 ? 'q' : 'p'
        if (Math.abs(x - sunX) < 4.5 - (y - 41) * 0.5 && (x + y) % 2 === 0) c = 'R'
        else if (y === 41 && x % 4 < 2) c = 'Q'
        else if ((x * 5 + y * 17) % 23 < 2) c = 'Q'
      }
      if (y === 45) c = 'g'
      if (y === 46) c = x % 5 === 1 ? 'g' : 'G'
      if (y >= 47) c = (x * 3 + y * 5) % 7 === 0 || y === 49 ? 'E' : 'D'
      row += c
    }
    rows.push(row)
  }
  const set = (x: number, y: number, c: string) => {
    if (y < 0 || y >= GH || x < 0 || x >= GW) return
    rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1)
  }
  // round trees standing on the hills
  for (const [tx] of trees) {
    const base = hill(tx)
    for (let k = 1; k <= 4; k++) set(tx - k, base + (k > 2 ? 1 : 0), 'J')
    set(tx, base - 1, 'K')
    set(tx, base - 2, 'K')
    for (let dy = -6; dy <= 0; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.hypot(dx, (dy + 3) * 1.1) >= 3.5) continue
        const ch = (dx > 0 && dy < -2) || dx - dy > 4 ? 't' : dx < 0 && dy > -2 ? 'U' : 'T'
        set(tx + dx, base - 3 + dy, ch)
      }
  }
  // floating brick platform + coins
  for (let x = 8; x < 20; x++) {
    set(x, 26, 'L')
    set(x, 27, (x - 8) % 4 === 3 ? 'm' : 'B')
    set(x, 28, (x - 6) % 4 === 3 ? 'm' : 'B')
    set(x, 29, 'm')
  }
  for (const cx of [10, 14, 18]) {
    for (let dy = 0; dy < 3; dy++) {
      set(cx, 21 + dy, dy === 0 ? 'o' : 'C')
      set(cx + 1, 21 + dy, 'n')
    }
  }
  // tiny knight on the shore
  const knight = ['..p..', '.hhh.', 'hhhhh', 'hvvhh', '.hhh.', '.aaaS', 'aaaaS', '.a.a.', '.k.k.']
  const pal: Record<string, string> = {
    0: '#1c2168', 1: '#28349a', 2: '#3a4fc4', 3: '#5770de', 4: '#8197f0', 5: '#b4b6f6',
    h: '#d6d0f4', S: '#fff8d0', s: '#ffd54a',
    w: '#ffffff', u: '#e4e8ff', v: '#a9b2ee', F: '#c2bdf0', f: '#a39ce0',
    M: '#a596e6', N: '#6b5fb0', O: '#4e4490', W: '#ffffff', X: '#cfd3ff',
    g: '#b8f56a', G: '#56c43c', H: '#34932f', J: '#226b28', q: '#3f6fe0', p: '#2c4fb8', Q: '#9fc4ff', R: '#ffe680',
    D: '#8a5a2c', E: '#5a3417', K: '#5a3417', T: '#1f9a3a', t: '#6fe05a', U: '#13602a',
    L: '#ffb07a', B: '#c8642c', m: '#6a2a10', C: '#ffd23a', n: '#b8860b', o: '#fff6c0',
  }
  // the knight is drawn in its own pass with its own palette
  const sprite = knight.map((line) => line.replace(/h/g, 'i').replace(/v/g, 'j').replace(/a/g, 'l').replace(/S/g, 'z'))
  const base = pixels(rows, pal, 2)
  const spritePaths = pixels(
    Array.from({ length: GH }, (_, y) => {
      const line = sprite[y - 36]
      return line ? '.'.repeat(44) + line + '.'.repeat(GW - 49) : '.'.repeat(GW)
    }),
    { p: '#ff4d4d', i: '#d0d6e8', j: '#20243a', l: '#3a6fe0', z: '#f4f6ff', k: '#20243a' },
    2,
  )
  return {
    viewW: 160,
    viewH: 100,
    paths: [
      ...base,
      ...spritePaths,
      glow(sunX * 2 + 1, sunY * 2 + 1, 60, '#ffe9a0', 0.38),
      glow(sunX * 2 + 1, sunY * 2 + 1, 18, '#fffbe0', 0.5),
      { d: rect(0, 46, 160, 30), fill: lin(0, 46, 0, 76, 0, 'rgba(255,230,190,0)', 0.6, 'rgba(255,230,190,0.16)', 1, 'rgba(255,230,190,0)'), blend: 'screen' },
      { d: rect(0, 82, 160, 8), fill: lin(0, 82, 0, 90, 0, 'rgba(255,240,160,0.18)', 1, 'rgba(255,240,160,0)'), blend: 'screen' },
      { d: rect(0, 0, 160, 100), fill: { kind: 'radial', cx: 80, cy: 50, r: 96, stops: [[0.5, 'rgba(10,10,40,0)'], [1, 'rgba(10,10,40,0.5)']] }, blend: 'multiply' },
    ],
  }
}

// ---- Sakura: blossoming branch, Fuji and pagoda in haze, god rays, bokeh ----------
export function sakuraBranch(): Art {
  const p: VectorPath[] = []
  const L = [26, 14]
  p.push({ d: rect(0, 0, W, H), fill: lin(0, 0, 0, H, 0, '#ffe3ee', 0.55, '#ffd0e0', 0.8, '#fbe2dc', 1, '#f6d2dc') })
  p.push(glow(L[0], L[1], 90, '#fff4e0', 0.75), glow(L[0], L[1], 16, '#ffffff', 0.9))
  // Fuji: snow cap, shaded right flank
  const fuji = smooth([-20, 80, 20, 66, 42, 50, 54, 40, 60, 39, 66, 40, 78, 50, 100, 66, 140, 80])
  const fujiD = fuji + 'L140 101L-20 101Z'
  p.push({ d: fujiD, fill: lin(0, 40, 0, 80, 0, '#c9a8cc', 1, '#e6c4d6') })
  p.push({ d: rect(60, 30, 90, 60), fill: lin(60, 0, 100, 0, 0, 'rgba(120,70,130,0.25)', 1, 'rgba(120,70,130,0.1)'), blend: 'multiply', clip: fujiD })
  const cap = 'M42 50 Q47 52 50 49 Q53 54 57 50 Q61 55 64 50 Q68 53 72 49 Q75 51 78 50 L66 40 Q60 38 54 40 Z'
  p.push({ d: cap, fill: lin(42, 40, 78, 54, 0, '#ffffff', 0.6, '#f4e8f4', 1, '#d8c4dc') })
  // pagoda
  let pag = ''
  for (let k = 0; k < 5; k++) {
    const y = 72 - k * 6
    const w = 15 - k * 2.2
    pag += `M${f(118 - w)} ${f(y)}Q${f(118 - w * 0.5)} ${f(y - 1.2)} 118 ${f(y - 3.4)}Q${f(118 + w * 0.5)} ${f(y - 1.2)} ${f(118 + w)} ${f(y)}Q118 ${f(y - 0.6)} ${f(118 - w)} ${f(y)}Z`
    pag += rect(118 - w * 0.55, y - 0.2, w * 1.1, 3.6)
  }
  pag += rect(117.6, 38, 0.8, 7)
  p.push({ d: pag, fill: '#b98aa8', alpha: 0.85 })
  // haze and distant blossom groves
  p.push({ d: rect(0, 58, W, 30), fill: lin(0, 58, 0, 88, 0, 'rgba(255,235,240,0)', 0.7, 'rgba(255,235,240,0.65)', 1, 'rgba(255,235,240,0.3)') })
  const rg = rng(5)
  let grove = ''
  for (let i = 0; i < 26; i++) grove += circ(rg() * 160, 80 + rg() * 6, 4 + rg() * 4)
  p.push({ d: grove, fill: '#f2b3cb', alpha: 0.75 })
  p.push({ d: `M-4 86 Q60 80 164 88 V105 H-4 Z`, fill: lin(0, 82, 0, 101, 0, '#e8a7c0', 1, '#c97a9e') })
  p.push(rays(L[0], L[1], 16, 170, Math.PI * 0.25, 1.1, '#fffaf0', 0.28, 7))
  // branch: rim copy toward the light, then bark
  const limbs: [number[], number, number][] = [
    [[168, 4, 140, 14, 116, 24, 96, 34, 76, 38, 58, 36], 6, 1.2],
    [[124, 21, 116, 10, 104, 4], 2.4, 0.8],
    [[100, 32, 96, 46, 88, 58, 82, 64], 2.8, 0.8],
    [[146, 12, 150, 26, 146, 40], 2.4, 0.7],
    [[80, 37, 70, 46, 62, 50], 1.8, 0.6],
  ]
  const bark = (ox: number, oy: number) => limbs.map(([pts, a, b]) => taper(pts, a, b, ox, oy)).join('')
  p.push({ d: bark(0.4, 1.2), fill: 'rgba(120,40,70,0.18)', blend: 'multiply' })
  p.push({ d: bark(-0.45, -0.5), fill: '#c99a8a' })
  p.push({ d: bark(0, 0), fill: lin(60, 0, 168, 0, 0, '#5a3434', 1, '#3a2024') })
  let knots = ''
  const rk = rng(3)
  for (let i = 0; i < 14; i++) {
    const x = 70 + rk() * 90
    knots += `M${f(x)} ${f(36 - (x - 70) * 0.3 + rk() * 2)}l${f(1.5 + rk())} ${f(-0.4)}`
  }
  p.push({ d: knots, stroke: 'rgba(20,5,10,0.45)', sw: 0.3 })
  // blossoms
  const petal = (cx: number, cy: number, a: number, len: number, wid: number) => {
    const pts: [number, number][] = [
      [0, 0], [wid, len * 0.3], [wid * 0.9, len * 0.92], [wid * 0.28, len], [0, len * 0.86], [-wid * 0.28, len], [-wid * 0.9, len * 0.92], [-wid, len * 0.3],
    ]
    const c = Math.cos(a)
    const s = Math.sin(a)
    const T = pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as [number, number])
    return `M${f(T[0][0])} ${f(T[0][1])}C${f(T[1][0])} ${f(T[1][1])} ${f(T[2][0])} ${f(T[2][1])} ${f(T[3][0])} ${f(T[3][1])}L${f(T[4][0])} ${f(T[4][1])}L${f(T[5][0])} ${f(T[5][1])}C${f(T[6][0])} ${f(T[6][1])} ${f(T[7][0])} ${f(T[7][1])} ${f(T[0][0])} ${f(T[0][1])}Z`
  }
  const blossom = (x: number, y: number, s: number, rot: number) => {
    let d = ''
    for (let k = 0; k < 5; k++) d += petal(x, y, rot + (k / 5) * Math.PI * 2, 5 * s, 2.6 * s)
    p.push({ d: circ(x + 1.2 * s, y + 1.6 * s, 5 * s), fill: rad(x + 1.2 * s, y + 1.6 * s, 5 * s, 0, 'rgba(140,40,80,0.25)', 1, 'rgba(140,40,80,0)'), blend: 'multiply' })
    p.push({ d, fill: rad(x, y, 5.2 * s, 0, '#e0558a', 0.3, '#ffb6d0', 0.75, '#fff0f6', 1, '#ffffff') })
    p.push({ d, fill: rad(x - 3 * s, y - 3 * s, 9 * s, 0.45, 'rgba(160,50,100,0)', 1, 'rgba(160,50,100,0.35)'), blend: 'multiply' })
    p.push({ d, stroke: 'rgba(200,80,130,0.35)', sw: 0.18 })
    let st = ''
    let tips = ''
    for (let k = 0; k < 7; k++) {
      const a = rot + (k / 7) * Math.PI * 2 + 0.3
      const e = [x + Math.cos(a) * 2 * s, y + Math.sin(a) * 2 * s]
      st += `M${f(x)} ${f(y)}L${f(e[0])} ${f(e[1])}`
      tips += circ(e[0], e[1], 0.22 * s)
    }
    p.push({ d: st, stroke: '#c2386c', sw: 0.15 * s }, { d: tips, fill: '#ffd36b' })
    p.push({ d: circ(x - 1.8 * s, y - 2 * s, 0.9 * s), fill: 'rgba(255,255,255,0.7)', blend: 'screen' })
  }
  const blooms: [number, number, number][] = [
    [140, 14, 1.25], [124, 22, 1.1], [112, 8, 0.95], [102, 30, 1.2], [92, 44, 1.05], [86, 60, 1.1], [150, 30, 0.95], [76, 40, 0.9],
    [62, 37, 0.8], [66, 49, 0.75], [132, 6, 0.85], [104, 4, 0.75], [146, 40, 0.8], [96, 52, 0.7],
  ]
  blooms.forEach(([x, y, s], i) => blossom(x, y, s, i * 0.7))
  let buds = ''
  for (const [x, y] of [[58, 34], [118, 28], [82, 66], [108, 2], [152, 44], [70, 52]]) buds += rotEll(x, y, 1.3, 0.9, 30)
  p.push({ d: buds, fill: radLit(80, 30, 60, 0, '#ff8fb5', 1, '#c2386c') })
  // falling petals: crisp midground, soft out-of-focus foreground
  const rf = rng(12)
  for (let i = 0; i < 16; i++) {
    const x = 6 + rf() * 140
    const y = 30 + rf() * 66
    const s = 0.35 + rf() * 0.3
    p.push({ d: petal(x, y, rf() * 6.28, 4 * s * 1.6, 2.4 * s * 1.6), fill: lin(x - 2, y - 2, x + 3, y + 3, 0, '#fff2f7', 1, '#f58bb4'), alpha: 0.9 })
  }
  for (const [x, y, rr] of [[14, 84, 9], [36, 96, 6], [6, 30, 7], [150, 92, 8]]) p.push({ d: circ(x, y, rr), fill: rad(x, y, rr, 0, 'rgba(255,170,205,0.55)', 0.7, 'rgba(255,170,205,0.35)', 1, 'rgba(255,170,205,0)') })
  let bokeh = ''
  for (let i = 0; i < 10; i++) bokeh += circ(rf() * 70, rf() * 60, 1 + rf() * 2.5)
  p.push({ d: bokeh, fill: 'rgba(255,255,255,0.35)', blend: 'screen' })
  p.push(vignette(0.18, 0.55, '160,60,100'))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Encre: katana clash, impact flash, speed lines, red sun, screentone --------------
export function mangaPanel(): Art {
  const p: VectorPath[] = []
  const ix = 80
  const iy = 52
  const INK2 = '#111'
  // red sun with screentone shading
  p.push({ d: circ(ix, iy - 4, 33), fill: radLit(ix, iy - 4, 33, 0, '#ff5a3c', 0.7, '#d8322a', 1, '#a81e1e') })
  let tone = ''
  for (let y = 0; y < H; y += 2.2) for (let x = (y / 2.2) % 2 ? 1.1 : 0; x < W; x += 2.2) {
    const dd = Math.hypot(x - (ix + 20), y - (iy + 16))
    const rr = Math.max(0, 0.75 - dd / 50)
    if (rr > 0.12) tone += circ(x, y, rr)
  }
  p.push({ d: tone, fill: 'rgba(90,10,10,0.55)', clip: circ(ix, iy - 4, 33) })
  // speed lines radiating from the clash
  const rs = rng(8)
  let speed = ''
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2 + rs() * 0.04
    const r0 = 36 + rs() * 22
    const w = 0.006 + rs() * 0.016
    speed += poly([ix + r0 * Math.cos(a), iy + r0 * Math.sin(a), ix + 160 * Math.cos(a - w), iy + 160 * Math.sin(a - w), ix + 160 * Math.cos(a + w), iy + 160 * Math.sin(a + w)])
  }
  p.push({ d: speed, fill: INK2 })
  // corner screentone
  let ct = ''
  for (let y = 0; y < H; y += 2) for (let x = (y / 2) % 2 ? 1 : 0; x < W; x += 2) {
    const dd = Math.min(Math.hypot(x, y), Math.hypot(W - x, H - y))
    const rr = 0.9 - dd / 40
    if (rr > 0.15) ct += circ(x, y, rr)
  }
  p.push({ d: ct, fill: INK2 })
  // katanas: blade facets, hamon, tsuba, wrapped hilt
  const katana = (hx: number, hy: number, tx: number, ty: number, bend: number) => {
    const dx = tx - hx
    const dy = ty - hy
    const len = Math.hypot(dx, dy)
    const ux = dx / len
    const uy = dy / len
    const nx = -uy
    const ny = ux
    const pt = (t: number, off: number) => {
      const b = Math.sin(t * Math.PI) * bend * 0 + t * t * bend
      return [hx + ux * len * t + nx * (off + b), hy + uy * len * t + ny * (off + b)]
    }
    const spine: number[] = []
    const ridge: number[] = []
    const edge: number[] = []
    for (let i = 0; i <= 20; i++) {
      const t = 0.26 + (i / 20) * 0.74
      const wd = 3.8 * (1 - Math.pow((t - 0.26) / 0.74, 6) * 0.9)
      spine.push(...pt(t, -wd * 0.45))
      ridge.push(...pt(t, -wd * 0.05))
      edge.push(...pt(t, wd * 0.55))
    }
    const tip = pt(1.02, 0.6)
    const upper = poly([...spine, ...tip, ...[...ridge].reverse().flatMap((_, k, arr) => (k % 2 === 0 ? [arr[k + 1], arr[k]] : []))])
    const lower = poly([...ridge, ...tip, ...[...edge].reverse().flatMap((_, k, arr) => (k % 2 === 0 ? [arr[k + 1], arr[k]] : []))])
    const full = poly([...spine, ...tip, ...[...edge].reverse().flatMap((_, k, arr) => (k % 2 === 0 ? [arr[k + 1], arr[k]] : []))])
    // motion streaks
    let streak = ''
    for (let k = 0; k < 5; k++) {
      const a = pt(0.5 + k * 0.1, 3 + k * 1.3)
      const b = pt(0.75 + k * 0.08, 3 + k * 1.3)
      streak += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`
    }
    p.push({ d: streak, stroke: INK2, sw: 0.4 })
    p.push({ d: full, fill: '#ffffff', stroke: INK2, sw: 1.6 })
    p.push({ d: upper, fill: lin(hx, hy, tx, ty, 0, '#9aa0a8', 0.45, '#f4f6f8', 0.55, '#ffffff', 1, '#7d838c') })
    p.push({ d: lower, fill: lin(hx, hy, tx, ty, 0, '#d8dce2', 0.5, '#ffffff', 1, '#c4c8cf') })
    let hamon = ''
    for (let i = 0; i <= 30; i++) {
      const t = 0.28 + (i / 30) * 0.68
      const q = pt(t, 0.55 + Math.sin(i * 1.7) * 0.25)
      hamon += `${i ? 'L' : 'M'}${f(q[0])} ${f(q[1])}`
    }
    p.push({ d: hamon, stroke: 'rgba(17,17,17,0.55)', sw: 0.25 })
    p.push({ d: poly([...ridge]), stroke: 'rgba(17,17,17,0.6)', sw: 0.25 })
    p.push({ d: full, stroke: INK2, sw: 0.7 })
    // habaki + tsuba + hilt
    const g0 = pt(0.24, 0)
    const ang = (Math.atan2(uy, ux) * 180) / Math.PI
    p.push({ d: rotEll(g0[0], g0[1], 1.6, 6.5, ang), fill: radLit(g0[0], g0[1], 6, 0, '#5a5a5a', 1, '#0a0a0a'), stroke: INK2, sw: 0.6 })
    p.push({ d: rotEll(g0[0] - ux * 0.4, g0[1] - uy * 0.4, 0.5, 5, ang), stroke: 'rgba(255,255,255,0.7)', sw: 0.35 })
    const h0 = pt(0.22, 0)
    const h1 = pt(-0.1, 0)
    p.push({ d: `M${f(h0[0])} ${f(h0[1])}L${f(h1[0])} ${f(h1[1])}`, stroke: INK2, sw: 4.6 })
    let wrap = ''
    for (let k = 0; k < 9; k++) {
      const c = pt(0.2 - k * 0.035, 0)
      wrap += poly([c[0] + ux * 1.4, c[1] + uy * 1.4, c[0] + nx * 1.6, c[1] + ny * 1.6, c[0] - ux * 1.4, c[1] - uy * 1.4, c[0] - nx * 1.6, c[1] - ny * 1.6])
    }
    p.push({ d: wrap, fill: '#ffffff', alpha: 0.9 })
  }
  katana(4, 112, 152, 8, -6)
  katana(156, 112, 8, 8, 6)
  // impact flash: inked starburst with a white core
  const burst = (ro: number, ri: number, n: number, seed: number) => {
    const rb = rng(seed)
    const pts: number[] = []
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2
      const r = i % 2 ? ri * (0.8 + rb() * 0.4) : ro * (0.6 + rb() * 0.6)
      pts.push(ix + r * Math.cos(a), iy + r * Math.sin(a) * 0.8)
    }
    return poly(pts)
  }
  p.push({ d: burst(24, 9, 16, 4), fill: '#ffffff', stroke: INK2, sw: 1.6 })
  p.push({ d: burst(14, 6, 12, 9), fill: '#ffffff', stroke: INK2, sw: 0.6 })
  p.push({ d: circ(ix, iy, 4), fill: '#ffffff' })
  // sparks and ink splatter
  let sparks = ''
  const rk = rng(21)
  for (let i = 0; i < 18; i++) {
    const a = rk() * Math.PI * 2
    const r0 = 10 + rk() * 10
    const r1 = r0 + 3 + rk() * 9
    sparks += `M${f(ix + r0 * Math.cos(a))} ${f(iy + r0 * Math.sin(a))}L${f(ix + r1 * Math.cos(a))} ${f(iy + r1 * Math.sin(a))}`
  }
  p.push({ d: sparks, stroke: INK2, sw: 0.6 })
  let splat = ''
  for (let i = 0; i < 26; i++) {
    const a = rk() * Math.PI * 2
    const r0 = 26 + rk() * 40
    splat += circ(ix + r0 * Math.cos(a), iy + r0 * Math.sin(a) * 0.75, 0.3 + rk() * 1.1)
  }
  p.push({ d: splat, fill: INK2 })
  p.push({ d: 'M3 3 H157 V98 H3 Z', stroke: INK2, sw: 2.6 })
  return { viewW: W, viewH: H, paths: p }
}

// ---- Tag: lit brick wall, wildstyle bubble mascot with crown and arrows, spray can ---
export function graffitiWall(): Art {
  const p: VectorPath[] = []
  const FLOOR = 90
  // bricks with individual tint, bevel highlight and lower shadow
  const rb = rng(31)
  const tints = ['#6b3a30', '#7a4234', '#5e3029', '#84483a', '#6f3c2c']
  const byTint = new Map<string, string>()
  let hi = ''
  let lo = ''
  for (let row = 0; row * 6 < FLOOR; row++) {
    const y = row * 6
    for (let x = row % 2 ? -6.5 : 0; x < W; x += 13) {
      const t = tints[Math.floor(rb() * tints.length)]
      byTint.set(t, (byTint.get(t) ?? '') + rect(x + 0.4, y + 0.4, 12.2, 5.2))
      hi += `M${f(x + 0.6)} ${f(y + 0.7)}h11.8`
      lo += `M${f(x + 0.6)} ${f(y + 5.4)}h11.8`
    }
  }
  p.push({ d: rect(0, 0, W, FLOOR), fill: '#2a2224' })
  for (const [t, d] of byTint) p.push({ d, fill: t })
  p.push({ d: hi, stroke: 'rgba(255,220,190,0.18)', sw: 0.35 }, { d: lo, stroke: 'rgba(0,0,0,0.35)', sw: 0.5 })
  // street lamp key light from the upper left
  p.push({ d: rect(0, 0, W, FLOOR), fill: rad(34, -12, 150, 0, 'rgba(0,0,0,0)', 0.45, 'rgba(10,5,15,0.35)', 1, 'rgba(10,5,15,0.85)'), blend: 'multiply' })
  p.push(glow(34, -4, 70, '#ffb86b', 0.35))
  // spray halos behind the piece
  p.push(glow(80, 48, 46, '#ff3d9a', 0.3), glow(118, 30, 28, '#ffd23a', 0.22), glow(44, 60, 30, '#2bd9ff', 0.25))

  // ---- the piece (no letters): bubble forms, arrows, crown, mascot -----------------
  const blobs = [
    smooth([22, 60, 30, 46, 46, 44, 58, 52, 56, 68, 44, 76, 28, 74], true),
    smooth([102, 58, 116, 50, 132, 54, 138, 66, 128, 78, 110, 76], true),
  ]
  const arrowR = taper([96, 42, 112, 30, 126, 24], 9, 5) + poly([122, 15, 140, 20, 128, 34])
  const arrowL = taper([58, 68, 46, 78, 32, 80], 7, 4.5) + poly([36, 72, 20, 81, 36, 88])
  const mascot = smooth([80, 28, 96, 33, 101, 49, 95, 65, 80, 70, 65, 65, 59, 49, 64, 33], true)
  const crown = poly([66, 30, 64, 15, 72, 22, 80, 11, 88, 22, 96, 15, 94, 30])
  const shapes: [string, string, string, number, number, number][] = [
    [blobs[0], '#ff5fae', '#ff9a3a', 40, 60, 18],
    [blobs[1], '#ff5fae', '#ff9a3a', 120, 64, 18],
    [arrowR, '#ffe14d', '#ff7a1a', 118, 28, 18],
    [arrowL, '#7df9ff', '#2b7bff', 40, 84, 16],
    [mascot, '#8ff7ff', '#2a6bff', 80, 49, 22],
    [crown, '#fff1a0', '#ffb400', 80, 22, 12],
  ]
  const shift = (d: string, dx: number, dy: number) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a, b) => `${f(+a + dx)} ${f(+b + dy)}`)
  const all = shapes.map((s) => s[0]).join('')
  // white cloud outline, 3D block extrusion, black keyline
  p.push({ d: all, stroke: '#e9f6ff', sw: 6.5 })
  p.push({ d: shift(all, 2.6, 2.6), stroke: '#e9f6ff', sw: 6.5 })
  for (let k = 7; k >= 1; k--) p.push({ d: shift(all, k * 0.4, k * 0.4), fill: mix('#1c0b3a', '#4a1f7a', 1 - k / 7), stroke: '#14072a', sw: 1.6 })
  p.push({ d: all, stroke: '#14072a', sw: 2.2 })
  for (const [d, a, b, sx, sy, sr] of shapes) {
    p.push({ d, fill: lin(0, sy - sr, 0, sy + sr, 0, a, 1, b) })
    // form shading: light top-left, core shadow bottom-right
    p.push({ d, fill: rad(sx - sr * 0.4, sy - sr * 0.45, sr * 1.9, 0.45, 'rgba(60,0,80,0)', 1, 'rgba(60,0,80,0.5)'), blend: 'multiply' })
  }
  // fill fade bands and highlight dashes
  p.push({ d: rect(0, 54, W, 2) + rect(0, 59, W, 1.2), fill: 'rgba(255,255,255,0.25)', clip: blobs.join('') + mascot })
  p.push({ d: 'M27 55 Q31 48 39 47 M106 57 Q112 53 118 53 M100 37 Q106 32 112 29 M66 38 Q69 32 75 30', stroke: 'rgba(255,255,255,0.9)', sw: 1.1 })
  p.push({ d: circ(42, 47.5, 0.8) + circ(121, 52.5, 0.7) + circ(78, 29.5, 0.8), fill: '#ffffff' })
  // mascot face: big eyes looking up-right, grin
  for (const ex of [73, 88]) {
    p.push({ d: ell(ex, 46, 5.2, 6.4), fill: radLit(ex, 46, 6.4, 0, '#ffffff', 1, '#c8d8f0'), stroke: '#14072a', sw: 1.1 })
    p.push({ d: circ(ex + 1.6, 44.6, 2.6), fill: '#14072a' })
    p.push({ d: circ(ex + 0.8, 43.6, 0.9), fill: '#ffffff' })
  }
  p.push({ d: 'M72 57 Q80 64 89 56 Q80 60 72 57 Z', fill: '#14072a', stroke: '#14072a', sw: 1 })
  p.push({ d: 'M77 59.5 Q80.5 62.5 84 59.5 Q81 61 77 59.5 Z', fill: '#ff4f7a' })
  // crown jewels
  p.push({ d: circ(80, 25, 1.6) + circ(70, 26.5, 1.2) + circ(90, 26.5, 1.2), fill: radLit(80, 25, 2, 0, '#ffffff', 0.4, '#ff3d7f', 1, '#8a0a3a') })
  // drips
  const rd = rng(7)
  let drips = ''
  let drops = ''
  for (const [x, y, c] of [[30, 74, 0], [48, 75, 0], [74, 69, 1], [86, 69, 1], [112, 77, 0], [126, 77, 0], [95, 64, 1]] as [number, number, number][]) {
    const len = 4 + rd() * 9
    drips += `M${x} ${y}v${f(len)}`
    drops += ell(x, y + len + 0.5, 0.75, 1)
    void c
  }
  p.push({ d: drips, stroke: '#ff5fae', sw: 1.1 }, { d: drops, fill: '#ff5fae' })
  // sparkles and overspray dots
  p.push({ d: star(146, 44, 4, 0.8, 4, 0) + star(16, 34, 3, 0.6, 4, 0) + star(136, 84, 2.4, 0.5, 4, 0) + star(56, 22, 2.4, 0.5, 4, 0), fill: '#ffffff' })
  p.push({ d: dots(60, 4, 160, 88, 0.12, 0.35), fill: 'rgba(255,120,200,0.35)' })
  // paint sits in the brick: mortar shows through, lamp light falls off
  let mortar = ''
  for (let row = 0; row * 6 < FLOOR; row++) {
    const y = row * 6
    mortar += `M0 ${y}H${W}`
    for (let x = row % 2 ? -6.5 : 0; x < W; x += 13) mortar += `M${f(x)} ${y}v6`
  }
  p.push({ d: mortar, stroke: 'rgba(20,10,10,0.3)', sw: 0.6, blend: 'multiply' })
  p.push({ d: rect(0, 0, W, FLOOR), fill: rad(34, -12, 160, 0.3, 'rgba(0,0,0,0)', 1, 'rgba(10,5,20,0.55)'), blend: 'multiply' })
  // sidewalk + occlusion at the wall base
  p.push({ d: rect(0, FLOOR, W, H - FLOOR), fill: lin(0, FLOOR, 0, H, 0, '#3a3438', 1, '#151215') })
  p.push({ d: rect(0, FLOOR - 4, W, 4), fill: lin(0, FLOOR - 4, 0, FLOOR, 0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.55)'), blend: 'multiply' })
  p.push({ d: `M0 ${FLOOR}H${W}`, stroke: 'rgba(255,220,190,0.18)', sw: 0.4 })
  // spray can lying on the pavement
  const cy = 95
  p.push({ d: ell(132, cy + 3.6, 16, 2), fill: 'rgba(0,0,0,0.55)', blend: 'multiply' })
  p.push({ d: `M118 ${cy - 3.4}H140Q143 ${cy - 3.4} 143 ${cy}Q143 ${cy + 3.4} 140 ${cy + 3.4}H118Z`, fill: lin(0, cy - 3.4, 0, cy + 3.4, 0, '#ff9ac8', 0.3, '#ff3d9a', 0.75, '#8a0a4a', 1, '#c2306e') })
  p.push({ d: ell(118, cy, 1.5, 3.4), fill: lin(0, cy - 3.4, 0, cy + 3.4, 0, '#e8e8f0', 1, '#6a6a78') })
  p.push({ d: `M113 ${cy - 2.6}H118V${cy + 2.6}H113Q111 ${cy + 2.6} 111 ${cy}Q111 ${cy - 2.6} 113 ${cy - 2.6}Z`, fill: lin(0, cy - 2.6, 0, cy + 2.6, 0, '#f4f4fa', 0.4, '#b8b8c8', 1, '#4a4a58') })
  p.push({ d: rect(109.6, cy - 0.8, 1.6, 1.6), fill: '#222' })
  p.push({ d: `M120 ${cy - 2.4}H140`, stroke: 'rgba(255,255,255,0.7)', sw: 0.6 })
  p.push({ d: ell(116, cy + 3.2, 14, 1.6), fill: rad(116, cy + 3.2, 14, 0, 'rgba(255,60,150,0.25)', 1, 'rgba(255,60,150,0)'), blend: 'screen' })
  p.push(vignette(0.45))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Retro 70: bevelled groovy stripes, sunburst, shaded daisies ----------------------
export function seventies(): Art {
  const p: VectorPath[] = []
  const sx = 124
  const sy = 30
  // sunburst
  let burst = ''
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2
    const a1 = a0 + Math.PI / 24
    burst += poly([sx, sy, sx + 140 * Math.cos(a0), sy + 140 * Math.sin(a0), sx + 140 * Math.cos(a1), sy + 140 * Math.sin(a1)])
  }
  p.push({ d: burst, fill: rad(sx, sy, 120, 0, 'rgba(242,182,61,0.4)', 1, 'rgba(242,182,61,0)') })
  p.push(glow(sx, sy, 40, '#ffd27a', 0.5, 'multiply'))
  p.push({ d: circ(sx, sy, 17), fill: radLit(sx, sy, 17, 0, '#ffe7a0', 0.5, '#f7a63a', 1, '#e0602a') })
  let ht = ''
  for (let y = sy - 17; y < sy + 17; y += 1.6) for (let x = sx - 17; x < sx + 17; x += 1.6) {
    const r = 0.1 + Math.max(0, (x - sx + y - sy) / 34) * 0.55
    if (r > 0.15) ht += circ(x, y, r)
  }
  p.push({ d: ht, fill: 'rgba(170,40,20,0.35)', clip: circ(sx, sy, 17) })
  // stripes, drawn from the bottom up so each casts a shadow onto the one below
  const colors = ['#5a2e1a', '#c4421f', '#e8742a', '#f2a83a', '#f6cf62']
  const curve = (x: number, k: number) => 104 - x * 0.32 + 8 * Math.sin(x / 21 + 0.6) - k * 8.2
  const band = (k: number, ox = 0, oy = 0) => {
    const top: number[] = []
    const bot: number[] = []
    for (let x = -6; x <= 166; x += 6) {
      top.push(x + ox, curve(x, k) - 7.4 + oy)
      bot.push(x + ox, curve(x, k) + oy)
    }
    return { d: smooth(top) + 'L' + smooth([...bot].reverse().flatMap((_, i, arr) => (i % 2 === 0 ? [arr[i + 1], arr[i]] : []))).slice(1) + 'Z', top: smooth(top) }
  }
  const below: number[] = []
  for (let x = -6; x <= 166; x += 6) below.push(x, curve(x, 0) - 1)
  p.push({ d: smooth(below) + `L166 ${H + 4}L-6 ${H + 4}Z`, fill: lin(0, 60, 0, H, 0, '#4a2414', 1, '#2a1208') })
  colors.forEach((c, k) => {
    const b = band(k)
    const sh = band(k, -1.4, 2.2)
    p.push({ d: sh.d, fill: 'rgba(90,30,10,0.35)', blend: 'multiply' })
    p.push({ d: b.d, fill: lin(0, curve(80, k) - 9, 0, curve(80, k) + 2, 0, mix(c, '#ffffff', 0.18), 0.5, c, 1, mix(c, '#000000', 0.28)) })
    p.push({ d: b.top, stroke: 'rgba(255,245,220,0.55)', sw: 0.5, clip: b.d })
  })
  // daisies with soft shadow, domed hearts
  const daisy = (x: number, y: number, s: number) => {
    let petals = ''
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * 360
      const ra = (a * Math.PI) / 180
      petals += rotEll(x + 4.2 * s * Math.cos(ra), y + 4.2 * s * Math.sin(ra), 3.4 * s, 1.3 * s, a)
    }
    p.push({ d: circ(x + 1.2 * s, y + 1.6 * s, 8 * s), fill: rad(x + 1.2 * s, y + 1.6 * s, 8 * s, 0, 'rgba(90,40,10,0.3)', 1, 'rgba(90,40,10,0)'), blend: 'multiply' })
    p.push({ d: petals, fill: '#fffaf0', stroke: 'rgba(140,90,40,0.35)', sw: 0.25 })
    p.push({ d: petals, fill: rad(x - 3 * s, y - 3 * s, 10 * s, 0.4, 'rgba(160,110,60,0)', 1, 'rgba(160,110,60,0.45)'), blend: 'multiply' })
    p.push({ d: circ(x, y, 2.4 * s), fill: radLit(x, y, 2.4 * s, 0, '#ffe680', 0.6, '#f2a83a', 1, '#b4581a') })
  }
  daisy(22, 20, 1.3)
  daisy(44, 12, 0.8)
  daisy(14, 44, 0.75)
  daisy(150, 90, 0.9)
  p.push({ d: star(70, 18, 3, 0.8, 4, 0) + star(92, 46, 2, 0.5, 4, 0) + star(34, 34, 2, 0.5, 4, 0), fill: '#e2522b' })
  p.push(vignette(0.22, 0.5, '120,60,20'))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Aurora: curtain rays over snowy peaks, mirrored in a still lake ----------------
export function aurora(): Art {
  const p: VectorPath[] = []
  const LAKE = 74
  p.push({ d: rect(0, 0, W, LAKE + 1), fill: lin(0, 0, 0, LAKE, 0, '#020512', 0.5, '#061c34', 1, '#0d3a48') })
  p.push({ d: dots(110, 21, 160, 60, 0.12, 0.42), fill: 'rgba(230,245,255,0.8)' })
  const rs = rng(4)
  for (let i = 0; i < 6; i++) p.push(glow(rs() * 160, rs() * 40, 2.5, '#dff4ff', 0.9))
  // curtains: ribbon body + vertical ray streaks + bright lower fringe
  type Cur = { y: number; amp: number; ph: number; h: number; c1: string; c2: string; seed: number }
  const curtains: Cur[] = [
    { y: 44, amp: 8, ph: 0.4, h: 30, c1: '#4dffb0', c2: '#8a5cff', seed: 3 },
    { y: 34, amp: 7, ph: 2.2, h: 26, c1: '#5affd0', c2: '#3a9cff', seed: 5 },
    { y: 52, amp: 5, ph: 4.1, h: 18, c1: '#9dff6a', c2: '#ff5ac8', seed: 8 },
  ]
  const curtain = (c: Cur, mirror: number | null, alpha: number) => {
    const base: [number, number][] = []
    for (let x = -6; x <= 166; x += 5) base.push([x, c.y + Math.sin(x / 24 + c.ph) * c.amp + Math.sin(x / 9 + c.ph * 2) * 1.6])
    const my = (y: number) => (mirror === null ? y : 2 * mirror - y)
    const top = base.map(([x, y]) => [x + 6, my(y - c.h * (1.5 + 0.2 * Math.sin(x / 13 + c.ph)))])
    const d = smooth(base.flatMap(([x, y]) => [x, my(y)])) + 'L' + smooth([...top].reverse().flat()).slice(1) + 'Z'
    const yMid = my(c.y)
    const yTop = my(c.y - c.h)
    p.push({ d, fill: lin(0, yMid + (mirror === null ? 6 : -6), 0, yTop, 0, rgba(c.c1, 0.0), 0.15, rgba(c.c1, 0.5 * alpha), 0.5, rgba(c.c1, 0.16 * alpha), 0.85, rgba(c.c2, 0.06 * alpha), 1, rgba(c.c2, 0)), blend: 'lighter' })
    const r = rng(c.seed)
    for (let i = 0; i < 30; i++) {
      const k = Math.floor(r() * base.length)
      const [x, y] = base[k]
      const len = c.h * (0.5 + r() * 0.8)
      const x0 = x + r() * 4
      const y0 = my(y + 1)
      const y1 = my(y - len)
      p.push({ d: `M${f(x0)} ${f(y0)}L${f(x0 + 4)} ${f(y1)}`, stroke: lin(0, y0, 0, y1, 0, rgba(c.c1, 0.3 * alpha), 0.5, rgba(c.c2, 0.1 * alpha), 1, rgba(c.c2, 0)), sw: 0.6 + r() * 1.6, blend: 'lighter' })
    }
    p.push({ d: smooth(base.flatMap(([x, y]) => [x, my(y)])), stroke: rgba(c.c1, 0.55 * alpha), sw: 0.7, blend: 'lighter' })
    p.push({ d: smooth(base.flatMap(([x, y]) => [x, my(y)])), stroke: rgba(c.c1, 0.12 * alpha), sw: 4, blend: 'lighter' })
  }
  curtains.forEach((c) => curtain(c, null, 1))
  // ambient green on the horizon
  p.push({ d: rect(0, 40, W, 36), fill: lin(0, 40, 0, LAKE, 0, 'rgba(60,255,170,0)', 1, 'rgba(60,255,170,0.18)'), blend: 'screen' })
  // snowy peaks, lit on their left flanks by the aurora
  const peaks = [-6, LAKE, 8, 60, 20, 66, 38, 46, 50, 58, 62, 52, 78, 66, 96, 50, 110, 40, 124, 56, 140, 48, 166, 64, 166, LAKE]
  const mtn = poly(peaks)
  p.push({ d: mtn, fill: lin(0, 40, 0, LAKE, 0, '#2a4a66', 1, '#0b1a2c') })
  let litFaces = ''
  let snow = ''
  for (let i = 2; i < peaks.length - 4; i += 2) {
    const [x0, y0, x1, y1] = [peaks[i], peaks[i + 1], peaks[i + 2], peaks[i + 3]]
    if (y1 < y0) {
      litFaces += poly([x0, y0, x1, y1, x1 + 2, LAKE, x0, LAKE])
    }
    if (y1 < 54) snow += poly([x1, y1, x1 - 5, y1 + 6, x1 - 2, y1 + 5, x1, y1 + 8, x1 + 3, y1 + 5, x1 + 6, y1 + 7])
  }
  p.push({ d: litFaces, fill: lin(0, 40, 0, LAKE, 0, 'rgba(120,255,200,0.35)', 1, 'rgba(120,255,200,0)'), blend: 'screen', clip: mtn })
  p.push({ d: snow, fill: lin(0, 40, 0, 60, 0, '#f0fff8', 1, '#9ad8d0') })
  p.push({ d: poly(peaks.slice(2, -2), false), stroke: 'rgba(160,255,215,0.55)', sw: 0.4, blend: 'screen' })
  // shoreline firs
  let firs = `M-6 ${LAKE + 1}`
  const rf = rng(9)
  for (let x = -6; x < 166; x += 2 + rf() * 3) {
    const h = 3 + rf() * 6
    firs += `L${f(x)} ${f(LAKE - 0.5)}L${f(x + 1.2)} ${f(LAKE - h)}L${f(x + 2.4)} ${f(LAKE - 0.5)}`
  }
  firs += `L166 ${LAKE + 1}Z`
  p.push({ d: firs, fill: '#030810' })
  // lake: mirrored sky, curtains and mountains
  p.push({ d: rect(0, LAKE, W, H - LAKE), fill: lin(0, LAKE, 0, H, 0, '#0b2c3c', 1, '#020812') })
  curtains.forEach((c) => curtain(c, LAKE, 0.55))
  p.push({ d: poly(tf(peaks, (x, y) => [x, 2 * LAKE - y])), fill: 'rgba(5,15,28,0.85)' })
  p.push({ d: firs.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a, b) => `${a} ${f(2 * LAKE - +b)}`), fill: '#02060c' })
  let rip = ''
  for (let i = 0; i < 40; i++) {
    const y = LAKE + 2 + rf() * 26
    rip += `M${f(rf() * 160)} ${f(y)}h${f(3 + rf() * 10)}`
  }
  p.push({ d: rip, stroke: 'rgba(160,255,220,0.18)', sw: 0.35, blend: 'screen' })
  p.push({ d: rect(0, LAKE, W, H - LAKE), fill: lin(0, LAKE, 0, H, 0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,10,0.6)'), blend: 'multiply' })
  p.push({ d: `M0 ${LAKE}H${W}`, stroke: 'rgba(140,255,210,0.35)', sw: 0.3, blend: 'screen' })
  p.push(vignette(0.5))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Prism: glass prism on a glossy floor, beam dispersed into a blooming spectrum ---
export function prism(): Art {
  const p: VectorPath[] = []
  const FL = 70
  const A = [70, 20]
  const B = [96, 68]
  const C = [44, 68]
  const o = [9, -4]
  const A2 = [A[0] + o[0], A[1] + o[1]]
  const B2 = [B[0] + o[0], B[1] + o[1]]
  const C2 = [C[0] + o[0], C[1] + o[1]]
  // floor
  p.push({ d: rect(0, FL - 6, W, H), fill: lin(0, FL - 6, 0, H, 0, 'rgba(30,34,50,0)', 0.2, 'rgba(30,34,50,0.7)', 1, 'rgba(4,5,10,0.95)') })
  p.push({ d: `M0 ${FL - 4}H${W}`, stroke: 'rgba(160,170,220,0.12)', sw: 0.4 })
  // floating background crystals (out of focus)
  const crystal = (x: number, y: number, s: number, a: number) => {
    const top = poly([x, y - 6 * s, x + 4 * s, y, x, y + 6 * s, x - 4 * s, y])
    p.push({ d: top, fill: lin(x - 4 * s, y - 6 * s, x + 4 * s, y + 6 * s, 0, rgba('#c8d4ff', 0.35 * a), 1, rgba('#3a4070', 0.2 * a)) })
    p.push({ d: poly([x, y - 6 * s, x + 4 * s, y, x, y + 6 * s]), fill: rgba('#0a0c18', 0.35 * a) })
    p.push({ d: top, stroke: rgba('#e0e6ff', 0.4 * a), sw: 0.3 })
  }
  crystal(20, 22, 1.2, 0.6)
  crystal(140, 14, 0.9, 0.5)
  crystal(30, 50, 0.6, 0.4)
  crystal(150, 54, 0.7, 0.35)
  // incoming white beam
  const entry = [57.5, 45]
  p.push(...neon(`M-4 58L${entry[0]} ${entry[1]}`, '#e8ecff', 1.1))
  p.push({ d: poly([-4, 54, entry[0], entry[1] - 0.6, entry[0], entry[1] + 0.6, -4, 62]), fill: lin(0, 0, 60, 0, 0, 'rgba(220,230,255,0)', 1, 'rgba(220,230,255,0.15)'), blend: 'screen' })
  // spectrum out of the right face
  const spectrum = ['#ff2d55', '#ff8a1c', '#ffe14d', '#3ddc6a', '#22b8ff', '#7c5cff']
  const ex = [84, 45]
  const fan = (mirror: boolean, a: number, clip?: string) =>
    spectrum.forEach((c, i) => {
      const y0 = ex[1] - 1.5 + i * 0.7
      const y1 = ex[1] - 1.5 + (i + 1) * 0.7
      const t0 = 18 + i * 7.4
      const t1 = 18 + (i + 1) * 7.4
      const m = (y: number) => (mirror ? 2 * FL - y : y)
      const d = poly([ex[0], m(y0), 162, m(t0), 162, m(t1), ex[0], m(y1)])
      p.push({ d, fill: lin(ex[0], 0, 162, 0, 0, rgba(c, 0.95 * a), 1, rgba(c, 0.55 * a)), blend: 'lighter', clip })
    })
  p.push({ d: poly([ex[0], ex[1] - 4, 162, 6, 162, 72, ex[0], ex[1] + 5]), fill: lin(ex[0], 0, 162, 0, 0, 'rgba(255,255,255,0.12)', 1, 'rgba(255,255,255,0.02)'), blend: 'screen' })
  fan(false, 1)
  // floor reflection of the spectrum, fading with distance
  fan(true, 0.28, rect(0, FL, W, H - FL))
  p.push({ d: rect(0, FL, W, H - FL), fill: lin(0, FL, 0, H, 0, 'rgba(4,5,10,0)', 1, 'rgba(4,5,10,0.9)'), blend: 'multiply' })
  // cast shadow + rainbow caustic on the floor
  p.push({ d: poly([C[0], C[1], B[0], B[1], B2[0] + 22, B2[1] + 6, C2[0] + 18, C2[1] + 6]), fill: 'rgba(0,0,0,0.4)', blend: 'multiply' })
  p.push({ d: ell(112, 72, 20, 2.4), fill: lin(92, 0, 132, 0, 0, 'rgba(255,60,90,0.4)', 0.3, 'rgba(255,220,80,0.45)', 0.6, 'rgba(60,220,120,0.4)', 1, 'rgba(120,90,255,0.35)'), blend: 'lighter' })
  // the prism: back faces (seen through glass), side face, front face
  const front = poly([...A, ...B, ...C])
  const side = poly([...A, ...A2, ...B2, ...B])
  p.push({ d: poly([...A2, ...B2, ...C2]), stroke: 'rgba(200,210,255,0.22)', sw: 0.4 })
  p.push({ d: `M${C[0]} ${C[1]}L${C2[0]} ${C2[1]}`, stroke: 'rgba(200,210,255,0.2)', sw: 0.4 })
  p.push({ d: side, fill: lin(A[0], A[1], B2[0], B2[1], 0, 'rgba(160,190,255,0.22)', 1, 'rgba(60,80,160,0.12)') })
  p.push({ d: front, fill: lin(C[0], A[1], B[0], B[1], 0, 'rgba(255,255,255,0.26)', 0.5, 'rgba(200,215,255,0.08)', 1, 'rgba(120,140,220,0.16)') })
  // internal refracted beam, starting to split
  p.push({ d: poly([entry[0], entry[1] - 0.7, ex[0], ex[1] - 1.6, ex[0], ex[1] + 2.6, entry[0], entry[1] + 0.7]), fill: lin(entry[0], 0, ex[0], 0, 0, 'rgba(255,255,255,0.75)', 1, 'rgba(255,220,240,0.6)'), blend: 'lighter' })
  // edges, speculars and blooms
  p.push({ d: front + `M${A[0]} ${A[1]}L${A2[0]} ${A2[1]}L${B2[0]} ${B2[1]}L${B[0]} ${B[1]}`, stroke: 'rgba(235,240,255,0.85)', sw: 0.55 })
  p.push({ d: `M${A[0]} ${A[1]}L${C[0]} ${C[1]}`, stroke: 'rgba(255,255,255,0.9)', sw: 1.1, blend: 'screen' })
  p.push({ d: poly([A[0] - 1, A[1] + 5, A[0] + 1.5, A[1] + 5, C[0] + 10, C[1] - 4, C[0] + 6, C[1] - 4]), fill: 'rgba(255,255,255,0.18)', blend: 'screen' })
  p.push(glow(entry[0], entry[1], 10, '#ffffff', 0.7), glow(ex[0], ex[1], 14, '#ffd6f0', 0.6), glow(A[0], A[1], 5, '#ffffff', 0.6))
  // prism reflection in the floor
  p.push({ d: poly([C[0], C[1], B[0], B[1], A[0], 2 * C[1] - A[1]]), fill: lin(0, C[1], 0, C[1] + 26, 0, 'rgba(200,215,255,0.12)', 1, 'rgba(200,215,255,0)') })
  // dust in the beam
  const r = rng(3)
  let dust = ''
  for (let i = 0; i < 40; i++) {
    const x = 90 + r() * 70
    const y = ex[1] + (x - ex[0]) * (-0.35 + r() * 0.75)
    dust += circ(x, y, 0.15 + r() * 0.25)
  }
  p.push({ d: dust, fill: 'rgba(255,255,255,0.7)', blend: 'lighter' })
  p.push(vignette(0.55))
  return { viewW: W, viewH: H, paths: p }
}

// ---- Nexus: reactor core with orbital rings, light column, holo panels, grid floor --
export function nexusCore(color = '#38bdf8'): Art {
  const p: VectorPath[] = []
  const cx = 80
  const cy = 42
  const HZ = 68
  p.push(glow(cx, cy, 95, '#0e5a9a', 0.5))
  // gate rings behind the core
  let ticks = ''
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2
    const r0 = i % 5 ? 38 : 35.5
    ticks += `M${f(cx + r0 * Math.cos(a))} ${f(cy + r0 * Math.sin(a))}L${f(cx + 40 * Math.cos(a))} ${f(cy + 40 * Math.sin(a))}`
  }
  p.push({ d: ticks, stroke: rgba(color, 0.45), sw: 0.35, blend: 'screen' })
  const arc = (r: number, a0: number, a1: number) => {
    const pt = (a: number) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`
    return `M${pt(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1)}`
  }
  p.push(...neon(arc(44, -2.6, -0.5) + arc(44, 0.6, 1.4), color, 0.45))
  p.push({ d: arc(31, -1.2, 1.9) + arc(31, 2.4, 3.9), stroke: rgba(color, 0.55), sw: 1.4, blend: 'screen' })
  // floor grid + reflection
  p.push({ d: rect(0, HZ, W, H - HZ), fill: lin(0, HZ, 0, H, 0, 'rgba(2,8,18,0.6)', 1, 'rgba(0,2,8,0.95)') })
  let grid = ''
  for (let i = -18; i <= 18; i++) grid += `M${f(cx + i * 3)} ${HZ}L${f(cx + i * 20)} ${H + 2}`
  for (let k = 1; k <= 9; k++) grid += `M0 ${f(HZ + (H - HZ) * Math.pow(k / 9, 2))}H${W}`
  p.push({ d: grid, stroke: rgba(color, 0.12), sw: 1.4, blend: 'lighter', clip: rect(0, HZ, W, H) })
  p.push({ d: grid, stroke: rgba(color, 0.5), sw: 0.3, blend: 'lighter', clip: rect(0, HZ, W, H) })
  p.push({ d: rect(0, HZ, W, 10), fill: lin(0, HZ, 0, HZ + 10, 0, rgba(color, 0.35), 1, rgba(color, 0)), blend: 'screen' })
  p.push({ d: ell(cx, HZ + 8, 34, 6), fill: rad(cx, HZ + 8, 34, 0, 'rgba(120,220,255,0.45)', 1, 'rgba(120,220,255,0)'), blend: 'screen' })
  // light column
  p.push({ d: rect(cx - 3, 0, 6, H), fill: lin(cx - 3, 0, cx + 3, 0, 0, rgba(color, 0), 0.5, rgba('#bff0ff', 0.35), 1, rgba(color, 0)), blend: 'lighter' })
  p.push({ d: `M${cx} 0V${H}`, stroke: lin(0, 0, 0, H, 0, 'rgba(220,250,255,0.1)', 0.42, 'rgba(220,250,255,0.9)', 1, 'rgba(220,250,255,0.1)'), sw: 0.5, blend: 'lighter' })
  // holographic side panels in perspective
  const panel = (pts: number[], seed: number, flip: boolean) => {
    const d = poly(pts)
    p.push({ d, fill: rgba(color, 0.07), blend: 'screen' })
    p.push(...neon(d, color, 0.3))
    const [x0, y0, x1, y1, , , , y3] = pts
    const r = rng(seed)
    let bars = ''
    for (let i = 0; i < 7; i++) {
      const t = 0.12 + i * 0.1
      const bx = x0 + (x1 - x0) * t
      const top = y0 + (y1 - y0) * t
      const bot = y3 + (pts[5] - y3) * t
      const hh = (bot - top) * (0.2 + r() * 0.35)
      bars += rect(bx, bot - 3 - hh, (x1 - x0) * 0.05, hh)
    }
    p.push({ d: bars, fill: rgba(color, 0.6), blend: 'lighter' })
    let wave = ''
    for (let i = 0; i <= 20; i++) {
      const t = 0.1 + i * 0.04
      const x = x0 + (x1 - x0) * t
      const yb = y0 + (y1 - y0) * t + 4 + Math.sin(i * 1.3 + seed) * 1.6
      wave += `${i ? 'L' : 'M'}${f(x)} ${f(yb)}`
    }
    p.push({ d: wave, stroke: rgba('#bff0ff', 0.8), sw: 0.35, blend: 'lighter' })
    const ccx = flip ? x1 - (x1 - x0) * 0.2 : x0 + (x1 - x0) * 0.82
    p.push({ d: circ(ccx, (y0 + y3) / 2 + 1, 2.6), stroke: rgba(color, 0.7), sw: 0.4, blend: 'lighter' })
  }
  panel([10, 24, 40, 30, 40, 54, 10, 58], 3, false)
  panel([120, 30, 150, 24, 150, 58, 120, 54], 7, true)
  // data links into the core
  p.push({ d: `M40 42 Q58 40 ${cx - 12} ${cy}M120 42 Q102 40 ${cx + 12} ${cy}`, stroke: rgba(color, 0.5), sw: 0.35, blend: 'lighter' })
  // orbital rings: back halves, core, front halves
  const rings: [number, number, number][] = [
    [26, 7, -18],
    [22, 5.5, 22],
    [17, 15, 80],
  ]
  const half = (rx: number, ry: number, deg: number, front: boolean) => {
    const a = (deg * Math.PI) / 180
    const c = Math.cos(a)
    const s = Math.sin(a)
    const y0 = front ? 0 : -ry - 3
    const y1 = front ? ry + 3 : 0
    const pts = [[-rx - 3, y0], [rx + 3, y0], [rx + 3, y1], [-rx - 3, y1]].flatMap(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c])
    return poly(pts)
  }
  for (const [rx, ry, deg] of rings) p.push(...neon(rotEll(cx, cy, rx, ry, deg), color, 0.4).map((q) => ({ ...q, clip: half(rx, ry, deg, false), alpha: 0.6 })))
  p.push(glow(cx, cy, 30, color, 0.8), glow(cx, cy, 16, '#e0faff', 0.8))
  p.push({ d: circ(cx, cy, 10), fill: radLit(cx, cy, 10, 0, '#ffffff', 0.35, '#bff0ff', 0.75, color, 1, '#0b4a7a') })
  let swirl = ''
  for (let k = 0; k < 3; k++) {
    const pts: number[] = []
    for (let i = 0; i <= 30; i++) {
      const t = i / 30
      const a = k * 2.1 + t * 4
      const r = 2 + t * 7
      pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.8)
    }
    swirl += smooth(pts)
  }
  p.push({ d: swirl, stroke: 'rgba(230,252,255,0.55)', sw: 0.35, blend: 'lighter', clip: circ(cx, cy, 10) })
  p.push({ d: circ(cx, cy, 10), stroke: 'rgba(255,255,255,0.6)', sw: 0.4 })
  p.push({ d: ell(cx - 3.5, cy - 4, 3, 1.6), fill: 'rgba(255,255,255,0.85)' })
  for (const [rx, ry, deg] of rings) p.push(...neon(rotEll(cx, cy, rx, ry, deg), color, 0.45).map((q) => ({ ...q, clip: half(rx, ry, deg, true) })))
  // satellites on the rings
  let nodes = ''
  rings.forEach(([rx, ry, deg], i) => {
    const t = 0.6 + i * 1.9
    const a = (deg * Math.PI) / 180
    const x = rx * Math.cos(t)
    const y = ry * Math.sin(t)
    nodes += circ(cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a), 0.9)
  })
  p.push({ d: nodes, fill: '#ffffff' }, { d: nodes, stroke: rgba(color, 0.4), sw: 2.4, blend: 'lighter' })
  // particles
  const r = rng(17)
  let parts = ''
  for (let i = 0; i < 50; i++) {
    const a = r() * Math.PI * 2
    const d = 14 + Math.pow(r(), 0.7) * 60
    parts += circ(cx + d * Math.cos(a), cy + d * Math.sin(a) * 0.7, 0.15 + r() * 0.35)
  }
  p.push({ d: parts, fill: 'rgba(190,240,255,0.8)', blend: 'lighter' })
  p.push(vignette(0.6))
  return { viewW: W, viewH: H, paths: p }
}

// Frosted glass panes with refraction edges and caustic lines.
export function glassPanes(): Art {
  const pane = (pts: number[], tint: string) => [
    { d: poly(pts), fill: tint },
    { d: poly(pts), stroke: 'rgba(255,255,255,0.55)', sw: 0.8 },
  ]
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: circ(120, 30, 26), fill: rad(120, 30, 26, 0, 'rgba(120,255,240,0.45)', 1, 'rgba(120,255,240,0)') },
      { d: circ(40, 80, 30), fill: rad(40, 80, 30, 0, 'rgba(150,120,255,0.4)', 1, 'rgba(150,120,255,0)') },
      ...pane([70, 14, 146, 24, 136, 74, 60, 64], 'rgba(255,255,255,0.12)'),
      ...pane([96, 40, 154, 50, 146, 94, 88, 86], 'rgba(255,255,255,0.08)'),
      { d: 'M74 18 L142 27', stroke: 'rgba(255,255,255,0.8)', sw: 1.2 },
      { d: 'M84 30 Q100 40 118 34 Q132 30 140 40 M80 46 Q98 54 116 48', stroke: 'rgba(255,255,255,0.25)', sw: 0.6 },
    ],
  }
}

// HUD rings with ticks, arcs and a glowing core.
export function hudRings(color = '#38bdf8'): Art {
  let ticks = ''
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    const r0 = i % 5 ? 40 : 37
    ticks += `M${(50 + r0 * Math.cos(a)).toFixed(2)} ${(50 + r0 * Math.sin(a)).toFixed(2)}L${(50 + 43 * Math.cos(a)).toFixed(2)} ${(50 + 43 * Math.sin(a)).toFixed(2)}`
  }
  const arc = (r: number, a0: number, a1: number) => {
    const p = (a: number) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`
    return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`
  }
  return {
    viewW: 100,
    viewH: 100,
    paths: [
      { d: circ(50, 50, 48), fill: rad(50, 50, 48, 0, 'rgba(56,189,248,0.18)', 1, 'rgba(56,189,248,0)') },
      { d: ticks, stroke: color, sw: 0.7, alpha: 0.8 },
      { d: arc(32, -1.2, 1.6) + arc(32, 2.2, 3.6), stroke: color, sw: 2.4, alpha: 0.9 },
      { d: arc(24, 0.4, 4.2), stroke: color, sw: 0.8, alpha: 0.7 },
      { d: circ(50, 50, 10), fill: radLit(50, 50, 10, 0, '#e0f7ff', 0.5, color, 1, '#0b4a6b') },
      { d: circ(50, 50, 15), stroke: color, sw: 0.6, alpha: 0.6 },
      { d: rect(49.4, 2, 1.2, 8) + rect(49.4, 90, 1.2, 8), fill: color },
    ],
  }
}

// Iridescent holographic foil: shifting colour ribbons, sheen, glitter, rings.
export function holoFoil(): Art {
  const r = rng(55)
  const hues = ['#ff7ad9', '#7ee8ff', '#b8ff7a', '#a98bff', '#ffd27a']
  const paths: VectorPath[] = []
  hues.forEach((c, i) => {
    const y0 = -18 + i * 26
    const top: [number, number][] = []
    for (let x = -10; x <= 170; x += 6) top.push([x, y0 + x * 0.22 + 7 * Math.sin(x / 19 + i * 1.3)])
    const thick = 15 + (i % 2) * 5
    const d =
      'M' + top.map(([x, y]) => `${x} ${y.toFixed(1)}`).join('L') +
      'L' + [...top].reverse().map(([x, y]) => `${x} ${(y + thick).toFixed(1)}`).join('L') + 'Z'
    paths.push({ d, fill: lin(0, 0, 160, 101, 0, c, 0.5, hues[(i + 2) % hues.length], 1, hues[(i + 4) % hues.length]), alpha: 0.42 })
  })
  let rings = ''
  for (let k = 1; k <= 7; k++) rings += circ(124, 30, k * 4.5)
  paths.push({ d: rings, stroke: 'rgba(255,255,255,0.35)', sw: 0.35 })
  paths.push({ d: poly([30, 0, 58, 0, 118, 101, 90, 101]), fill: lin(30, 0, 118, 101, 0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,0.35)', 1, 'rgba(255,255,255,0)') })
  let glitter = ''
  let sparks = ''
  for (let i = 0; i < 60; i++) glitter += circ(r() * 160, r() * 101, 0.2 + r() * 0.45)
  for (let i = 0; i < 8; i++) sparks += star(r() * 160, r() * 101, 2.2, 0.4, 4, 0)
  paths.push({ d: glitter, fill: 'rgba(255,255,255,0.75)' }, { d: sparks, fill: 'rgba(255,255,255,0.9)' })
  return { viewW: 160, viewH: 101, paths }
}
