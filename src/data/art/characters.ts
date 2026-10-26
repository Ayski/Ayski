import type { VectorPath } from '../../types'
import { circ, ell, lin, poly, rad, radLit, rect, rng, rrect, star } from './kit'
import { glow, r2, rgba } from './portrait-kit'

// Collectible character cards: portraits live in portraits-a/b/c.ts (one owner
// per file), full-card scenes live here.
export { PORTRAIT_W, PORTRAIT_H } from './portrait-kit'
export { knight, wizard } from './portraits-a'
export { ninja, robot } from './portraits-b'
export { dragon, pirateGhost } from './portraits-c'

// ---- Full-card scenes (card-frame units: 160 × H) -----------------------------------
// `cx` is the character's centre line, `fy` the plinth top. Key light: upper-left.
export interface Stage {
  W: number
  H: number
  cx: number
  fy: number
}

const lightRays = (x: number, y: number, angles: number[], len: number, c: string, a: number): VectorPath[] =>
  angles.map((ang, i) => {
    const w = 0.07 + (i % 2) * 0.04
    const a0 = ang - w
    const a1 = ang + w
    return {
      d: poly([x, y, x + len * Math.cos(a0), y + len * Math.sin(a0), x + len * Math.cos(a1), y + len * Math.sin(a1)]),
      fill: lin(x, y, x + len * Math.cos(ang), y + len * Math.sin(ang), 0, rgba(c, a), 1, rgba(c, 0)),
      blend: 'screen' as GlobalCompositeOperation,
    }
  })

function bokeh(s: Stage, n: number, seed: number, c: string, rmin: number, rmax: number, yMax = 1): VectorPath[] {
  const R = rng(seed)
  const out: VectorPath[] = []
  for (let i = 0; i < n; i++) {
    const x = R() * s.W
    const y = R() * s.H * yMax
    const r = rmin + R() * (rmax - rmin)
    out.push({ d: circ(x, y, r), fill: rad(x, y, r, 0, rgba(c, 0.55), 0.7, rgba(c, 0.25), 1, rgba(c, 0)), blend: 'screen' })
  }
  return out
}

function fogBand(s: Stage, y: number, h: number, c: string, a: number): VectorPath {
  return { d: rect(0, y - h, s.W, h * 2), fill: lin(0, y - h, 0, y + h, 0, rgba(c, 0), 0.5, rgba(c, a), 1, rgba(c, 0)), blend: 'screen' }
}

function dotsIn(w: number, h: number, n: number, seed: number): string {
  const R = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) d += circ(R() * w, R() * h, 0.15 + R() * 0.35)
  return d
}

export function knightScene(s: Stage): VectorPath[] {
  const { W, H, fy } = s
  const tower = (x: number, w: number, top: number, base: number) => {
    const m = w / 4
    return poly([x, base, x, top, x + m, top, x + m, top - 2, x + 2 * m, top - 2, x + 2 * m, top, x + 3 * m, top, x + 3 * m, top - 2, x + w, top - 2, x + w, base])
  }
  const roof = (x: number, w: number, top: number) => poly([x - 1.2, top - 2, x + w / 2, top - 12, x + w + 1.2, top - 2])
  return [
    { d: rect(0, 0, W, H), fill: lin(0, 0, 0, H, 0, '#163a7e', 0.45, '#4f8bd4', 0.75, '#ffcf96', 1, '#ff9f5e') },
    { d: circ(18, 14, 70), fill: rad(18, 14, 70, 0, 'rgba(255,240,200,0.75)', 0.3, 'rgba(255,220,160,0.25)', 1, 'rgba(255,200,140,0)'), blend: 'screen' },
    ...lightRays(10, -4, [0.45, 0.62, 0.8, 0.98, 1.15], 140, '255,240,200', 0.22),
    { d: ell(40, 18, 16, 3.2) + ell(50, 15, 10, 3) + ell(120, 26, 18, 3) + ell(132, 23, 10, 2.6) + ell(96, 10, 9, 2), fill: 'rgba(255,255,255,0.4)' },
    // distant hills + castle (atmospheric perspective: hazier further away)
    { d: `M0 ${fy - 16} Q30 ${fy - 26} 62 ${fy - 18} Q100 ${fy - 10} 160 ${fy - 24} L160 ${H} L0 ${H} Z`, fill: '#8aa2d0', alpha: 0.7 },
    { d: tower(92, 10, fy - 48, fy - 8) + tower(130, 11, fy - 56, fy - 8) + rect(88, fy - 30, 60, 22) + tower(14, 9, fy - 42, fy - 6) + rect(6, fy - 26, 26, 20), fill: '#4a68a6', alpha: 0.85 },
    { d: roof(92, 10, fy - 48) + roof(130, 11, fy - 56) + roof(14, 9, fy - 42), fill: '#3a5490', alpha: 0.9 },
    { d: rect(96, fy - 40, 2, 3.4) + rect(134.5, fy - 48, 2, 3.4) + rect(17.5, fy - 34, 2, 3.4) + rect(110, fy - 22, 2, 3) + rect(120, fy - 22, 2, 3), fill: '#ffd36b' },
    { d: `M97 ${fy - 60}V${fy - 66} M135.5 ${fy - 68}V${fy - 74} M18.5 ${fy - 54}V${fy - 60}`, stroke: '#2f4880', sw: 0.6 },
    { d: poly([97, fy - 66, 102, fy - 64.5, 97, fy - 63]) + poly([135.5, fy - 74, 140.5, fy - 72.5, 135.5, fy - 71]) + poly([18.5, fy - 60, 23.5, fy - 58.5, 18.5, fy - 57]), fill: '#e8433a' },
    fogBand(s, fy - 10, 9, '255,230,200', 0.45),
    // courtyard floor
    { d: `M0 ${fy - 6} L${W} ${fy - 6} L${W} ${H} L0 ${H} Z`, fill: lin(0, fy - 6, 0, H, 0, '#6a6f8a', 1, '#2a2f48') },
    { d: `M0 ${fy - 2}H${W} M0 ${fy + 4}H${W} M0 ${fy + 11}H${W}`, stroke: 'rgba(20,24,40,0.35)', sw: 0.4 },
    ...bokeh(s, 10, 3, '255,220,150', 0.8, 2.6, 0.75),
  ]
}

export function wizardScene(s: Stage): VectorPath[] {
  const { W, H, cx, fy } = s
  const hy = 34
  const R = rng(9)
  let sparkles = ''
  for (let i = 0; i < 12; i++) sparkles += star(R() * W, R() * H * 0.8, 1.2 + R() * 1.1, 0.35, 4, 0)
  let runes = ''
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    const rr = 27
    runes += i % 4 === 0 ? star(cx + rr * Math.cos(a), hy + rr * Math.sin(a), 1.3, 0.55, 4, 0) : circ(cx + rr * Math.cos(a), hy + rr * Math.sin(a), 0.5)
  }
  const tri = (rot: number) => {
    const p: number[] = []
    for (let i = 0; i < 3; i++) {
      const a = rot + (i / 3) * Math.PI * 2
      p.push(cx + 22 * Math.cos(a), hy + 22 * Math.sin(a))
    }
    return poly(p)
  }
  return [
    { d: rect(0, 0, W, H), fill: lin(0, 0, 0, H, 0, '#0c0628', 0.55, '#2e1272', 1, '#5a2296') },
    { d: circ(14, 18, 50), fill: rad(14, 18, 50, 0, 'rgba(255,110,220,0.45)', 1, 'rgba(255,110,220,0)'), blend: 'screen' },
    { d: circ(140, 70, 55), fill: rad(140, 70, 55, 0, 'rgba(80,220,255,0.35)', 1, 'rgba(80,220,255,0)'), blend: 'screen' },
    { d: circ(100, 20, 36), fill: rad(100, 20, 36, 0, 'rgba(160,120,255,0.3)', 1, 'rgba(160,120,255,0)'), blend: 'screen' },
    { d: dotsIn(W, H * 0.85, 70, 4), fill: '#ffffff', alpha: 0.75 },
    { d: sparkles, fill: '#ffffff' },
    // crescent moon = key light
    glow(20, 16, 22, '255,240,200', 0.5),
    { d: 'M22 8 A9 9 0 1 0 24 25 A7 7 0 1 1 22 8 Z', fill: radLit(18, 16, 10, 0, '#fffbe6', 1, '#ffd88a') },
    // magic circle behind the head
    glow(cx, hy, 40, '200,160,255', 0.5),
    { d: circ(cx, hy, 30) + circ(cx, hy, 24), stroke: 'rgba(255,216,120,0.7)', sw: 0.7, blend: 'screen' },
    { d: tri(-Math.PI / 2) + tri(Math.PI / 2), stroke: 'rgba(255,216,120,0.4)', sw: 0.6, blend: 'screen' },
    { d: runes, fill: 'rgba(255,224,140,0.9)' },
    fogBand(s, fy - 6, 10, '190,150,255', 0.4),
    // glowing rune ring on the floor
    { d: rect(0, fy - 4, W, H), fill: lin(0, fy - 4, 0, H, 0, 'rgba(30,10,70,0)', 1, 'rgba(20,6,50,0.9)') },
    { d: ell(cx, fy + 1, 46, 7.5), stroke: 'rgba(255,216,120,0.55)', sw: 0.8, blend: 'screen' },
    { d: ell(cx, fy + 1, 40, 6.2), stroke: 'rgba(160,220,255,0.45)', sw: 0.5, blend: 'screen' },
    ...bokeh(s, 12, 21, '200,170,255', 0.8, 3, 0.8),
  ]
}

export function ninjaScene(s: Stage): VectorPath[] {
  const { W, H, cx, fy } = s
  const sx = cx - 4
  const sy = 36
  const stalk = (x: number, w: number) => {
    let d = rect(x, 0, w, H)
    for (let y = 9; y < H; y += 17) d += rrect(x - 0.7, y, w + 1.4, 1.6, 0.8)
    return d
  }
  const leaf = (x: number, y: number, len: number, ang: number) => {
    const c = Math.cos(ang)
    const sn = Math.sin(ang)
    const tx = x + c * len
    const ty = y + sn * len
    const mx = x + c * len * 0.5
    const my = y + sn * len * 0.5
    return `M${r2(x)} ${r2(y)}Q${r2(mx - sn * len * 0.18)} ${r2(my + c * len * 0.18)} ${r2(tx)} ${r2(ty)}Q${r2(mx + sn * len * 0.18)} ${r2(my - c * len * 0.18)} ${r2(x)} ${r2(y)}Z`
  }
  const R = rng(31)
  let petals = ''
  for (let i = 0; i < 16; i++) petals += leaf(6 + R() * (W - 12), 6 + R() * H * 0.75, 1.8 + R() * 1.6, R() * 6)
  return [
    { d: rect(0, 0, W, H), fill: lin(0, 0, 0, H, 0, '#26092a', 0.35, '#8a1d3c', 0.7, '#e85a34', 1, '#ffb45a') },
    glow(sx, sy, 60, '255,190,130', 0.55),
    { d: circ(sx, sy, 27), fill: lin(0, sy - 27, 0, sy + 27, 0, '#fff6dc', 1, '#ffbe74') },
    { d: rrect(sx - 46, sy + 6, 50, 2.6, 1.3) + rrect(sx + 6, sy + 15, 46, 2.2, 1.1) + rrect(sx - 30, sy - 12, 30, 1.8, 0.9), fill: 'rgba(110,24,52,0.55)' },
    // far mountains, then mist
    { d: `M0 ${fy - 14} L18 ${fy - 30} L30 ${fy - 22} L46 ${fy - 36} L64 ${fy - 20} L90 ${fy - 32} L112 ${fy - 18} L134 ${fy - 34} L160 ${fy - 20} L160 ${H} L0 ${H} Z`, fill: '#6a1838', alpha: 0.75 },
    fogBand(s, fy - 12, 10, '255,190,170', 0.4),
    { d: `M0 ${fy - 4} Q${cx} ${fy - 10} ${W} ${fy - 3} L${W} ${H} L0 ${H} Z`, fill: lin(0, fy - 8, 0, H, 0, '#3a0c26', 1, '#16040e') },
    // bamboo framing the scene
    { d: stalk(17, 1.8) + stalk(24, 1.2), fill: '#5a1430', alpha: 0.6 },
    { d: stalk(7, 3.6) + stalk(12.5, 2.2), fill: '#22081a' },
    { d: leaf(9, 20, 11, -0.4) + leaf(9, 21, 10, 0.5) + leaf(13, 46, 10, 0.2) + leaf(14, 47, 8, -0.6) + leaf(9, 70, 9, 0.35) + leaf(14, 30, 9, 0.9), fill: '#22081a' },
    { d: leaf(100, 6, 12, 2.2) + leaf(100, 6, 10, 2.8) + leaf(104, 4, 11, 1.6) + leaf(94, 3, 9, 2.6), fill: '#22081a', alpha: 0.9 },
    { d: petals, fill: '#ffd0d8', alpha: 0.8 },
    ...bokeh(s, 8, 12, '255,200,160', 1, 3, 0.7),
  ]
}

function gear(cx: number, cy: number, r: number, teeth: number): string {
  const pts: number[] = []
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2
    const rr = i % 4 < 2 ? r : r * 0.8
    pts.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
  }
  return poly(pts) + circ(cx, cy, r * 0.38)
}

export function robotScene(s: Stage): VectorPath[] {
  const { W, H, cx, fy } = s
  let grid = ''
  for (let x = 3; x < W; x += 6) grid += `M${x} 0V${fy}`
  for (let y = 3; y < fy; y += 6) grid += `M0 ${y}H${W}`
  let floor = ''
  for (let i = -14; i <= 14; i++) floor += `M${r2(cx + i * 4)} ${fy - 4}L${r2(cx + i * 16)} ${H}`
  for (let k = 1; k < 6; k++) {
    const y = fy - 4 + (H - fy + 4) * Math.pow(k / 6, 1.6)
    floor += `M0 ${r2(y)}H${W}`
  }
  return [
    { d: rect(0, 0, W, H), fill: lin(0, 0, 0, H, 0, '#0a1e2a', 0.6, '#154052', 1, '#0a1820') },
    { d: grid, stroke: 'rgba(94,240,255,0.09)', sw: 0.3 },
    { d: gear(12, 18, 16, 10), fill: 'rgba(4,20,28,0.6)', stroke: 'rgba(94,240,255,0.25)', sw: 0.5, rule: 'evenodd' },
    { d: gear(146, 52, 20, 12), fill: 'rgba(4,20,28,0.55)', stroke: 'rgba(94,240,255,0.22)', sw: 0.5, rule: 'evenodd' },
    { d: gear(118, 14, 9, 8), fill: 'rgba(4,20,28,0.5)', stroke: 'rgba(94,240,255,0.22)', sw: 0.5, rule: 'evenodd' },
    { d: `M0 44H14L19 49V66 M160 26H130L125 31V40`, stroke: 'rgba(94,240,255,0.45)', sw: 0.6 },
    { d: circ(19, 66, 1.2) + circ(125, 40, 1.2), fill: '#5ef0ff' },
    // hanging work lamp = key light (upper-left)
    { d: `M24 0V7`, stroke: '#0a1418', sw: 0.8 },
    ...lightRays(24, 11, [0.7, 0.95, 1.2], 110, '255,240,200', 0.2),
    glow(24, 13, 14, '255,240,200', 0.8),
    { d: 'M18 12 Q24 4 30 12 Z', fill: '#2a3a44', stroke: '#0a1418', sw: 0.5 },
    glow(cx, 44, 44, '94,240,255', 0.3),
    fogBand(s, fy - 8, 9, '94,240,255', 0.18),
    { d: rect(0, fy - 4, W, H), fill: lin(0, fy - 4, 0, H, 0, '#12303e', 1, '#050d12') },
    { d: floor, stroke: 'rgba(94,240,255,0.22)', sw: 0.4 },
    ...bokeh(s, 8, 5, '94,240,255', 0.8, 2.4, 0.7),
  ]
}

export function dragonScene(s: Stage): VectorPath[] {
  const { W, H, cx, fy } = s
  const R = rng(77)
  let embers = ''
  for (let i = 0; i < 40; i++) embers += circ(R() * W, R() * H * 0.85, 0.25 + R() * 0.7)
  let coins = ''
  let coinsHi = ''
  for (let i = 0; i < 60; i++) {
    const x = R() * W
    const spread = 1 - Math.min(1, Math.abs(x - cx) / 80)
    const y = fy + 2 - R() * 12 * spread
    coins += ell(x, y, 2.6, 1.3)
    coinsHi += ell(x - 0.6, y - 0.4, 1.2, 0.5)
  }
  return [
    { d: rect(0, 0, W, H), fill: rad(cx - 6, 40, 110, 0, '#fff4b0', 0.18, '#ffc449', 0.5, '#d9541e', 1, '#3a0a04') },
    ...lightRays(cx - 6, 40, Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2), 130, '255,240,170', 0.16),
    // volcanic peaks with lava veins
    { d: `M0 ${fy} L0 ${fy - 34} L12 ${fy - 46} L20 ${fy - 40} L34 ${fy - 26} L40 ${fy} Z`, fill: '#4a1206' },
    { d: `M160 ${fy} L160 ${fy - 40} L146 ${fy - 54} L138 ${fy - 46} L120 ${fy - 30} L110 ${fy} Z`, fill: '#4a1206' },
    { d: `M0 ${fy} L0 ${fy - 34} L12 ${fy - 46} L20 ${fy - 40} L34 ${fy - 26} L40 ${fy} Z`, fill: lin(0, fy - 46, 30, fy, 0, 'rgba(255,170,80,0.35)', 0.5, 'rgba(255,170,80,0)', 1, 'rgba(0,0,0,0)'), blend: 'screen' },
    { d: poly([12, fy - 46, 15, fy - 41, 11, fy - 40, 8, fy - 42]) + poly([146, fy - 54, 149, fy - 49, 145, fy - 48, 142, fy - 50]), fill: '#ff8a2a', blend: 'screen' },
    fogBand(s, fy - 12, 10, '255,170,90', 0.35),
    { d: embers, fill: '#ffd36b', alpha: 0.9, blend: 'screen' },
    ...bokeh(s, 12, 8, '255,190,90', 1, 3.2, 0.8),
    // gold hoard floor
    { d: `M0 ${fy - 6} Q${cx} ${fy - 14} ${W} ${fy - 6} L${W} ${H} L0 ${H} Z`, fill: lin(0, fy - 12, 0, H, 0, '#c8861c', 1, '#4a2604') },
    { d: coins, fill: lin(0, fy - 12, 0, fy + 4, 0, '#fff0a0', 1, '#c48a1c'), stroke: 'rgba(90,50,0,0.7)', sw: 0.35 },
    { d: coinsHi, fill: 'rgba(255,255,230,0.7)' },
  ]
}

export function ghostScene(s: Stage): VectorPath[] {
  const { W, H, fy } = s
  const mx = 22
  const my = 18
  const hz = fy - 12
  let wave = `M0 ${hz}`
  for (let x = 0; x < W; x += 6) wave += `Q${r2(x + 1.5)} ${hz - 1.6} ${r2(x + 3)} ${hz}T${r2(x + 6)} ${hz}`
  wave += `L${W} ${H}L0 ${H}Z`
  const ship = (x: number, y: number, k: number): VectorPath[] => [
    { d: poly([x - 8 * k, y - 2 * k, x + 8 * k, y - 2 * k, x + 6 * k, y + 1.4 * k, x - 6 * k, y + 1.4 * k]), fill: '#0a2a38' },
    { d: `M${x} ${y - 2 * k}V${y - 20 * k} M${x - 5 * k} ${y - 2 * k}V${y - 14 * k}`, stroke: '#0a2a38', sw: 0.8 * k },
    { d: poly([x + 0.4, y - 19 * k, x + 6 * k, y - 17 * k, x + 5.5 * k, y - 11 * k, x + 0.4, y - 9 * k]) + poly([x - 4.6 * k, y - 13.5 * k, x - 0.6, y - 12 * k, x - 0.8, y - 7 * k, x - 4.6 * k, y - 6 * k]), fill: '#123e50' },
  ]
  return [
    { d: rect(0, 0, W, H), fill: lin(0, 0, 0, H, 0, '#03121a', 0.5, '#0e3a4e', 1, '#1d6a82') },
    { d: dotsIn(W, H * 0.6, 40, 12), fill: '#ffffff', alpha: 0.7 },
    // moon = key light (upper-left)
    glow(mx, my, 40, '200,245,255', 0.55),
    { d: circ(mx, my, 9), fill: radLit(mx, my, 9.5, 0, '#ffffff', 1, '#bfe6f2') },
    ...[[mx + 10, my + 8, 16], [mx - 6, my + 10, 11], [70, 12, 14], [118, 24, 20]].map(([x, y, r]): VectorPath => ({ d: ell(x, y, r, r * 0.22), fill: rad(x, y, r, 0, 'rgba(6,30,44,0.4)', 0.6, 'rgba(6,30,44,0.22)', 1, 'rgba(6,30,44,0)') })),
    ...lightRays(mx, my, [0.55, 0.8, 1.05], 120, '200,245,255', 0.12),
    ...ship(128, hz, 1.1),
    ...ship(24, hz + 1, 0.7),
    { d: wave, fill: lin(0, hz, 0, H, 0, '#0b3a4e', 1, '#03141c') },
    { d: `M0 ${hz - 0.2}H${W}`, stroke: 'rgba(160,230,250,0.4)', sw: 0.4 },
    { d: `M${mx - 10} ${hz + 3}H${mx + 14} M${mx - 6} ${hz + 6}H${mx + 10} M${mx - 3} ${hz + 9}H${mx + 6}`, stroke: 'rgba(220,250,255,0.4)', sw: 0.5 },
    fogBand(s, fy - 6, 10, '180,235,250', 0.3),
    fogBand(s, fy + 8, 8, '180,235,250', 0.18),
    ...bokeh(s, 9, 41, '143,227,255', 0.8, 2.6, 0.85),
  ]
}
