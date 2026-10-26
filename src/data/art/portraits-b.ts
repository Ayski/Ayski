import type { VectorPath } from '../../types'
import { circ, ell, gloss, INK, lin, poly, radLit, rect, rng, rrect, star, type Art } from './kit'
import {
  PORTRAIT_W,
  PORTRAIT_H,
  mir,
  ink,
  glow,
  ao,
  form,
  STEEL,
  GOLD,
  SKIN,
  METAL_SH,
  SKIN_SH,
} from './portrait-kit'

// Ninja and robot portraits (140 × 200, flat-cut bust).

// ---- Ninja: Kagero ------------------------------------------------------------
export function ninja(): Art {
  const RIM = '255,130,80'
  const hood = 'M28 102 C26 62 44 40 70 40 C96 40 114 62 112 102 C112 132 96 152 70 152 C44 152 28 132 28 102 Z'
  const slit = 'M33 86 C50 79 90 79 107 86 L106 106 C90 100 50 100 34 106 Z'
  const brow = 'M40 86.5 L66 89.5 L66.5 93 L42 90.8 Z'
  const almond = 'M44 94.5 C48 88 61 87.5 67 92.5 C63 99.5 50 100.5 44 94.5 Z'
  const shoulders = 'M4 200 C6 174 22 158 46 152 L94 152 C118 158 134 174 136 200 Z'
  const scarf = 'M38 144 C54 156 86 156 102 144 L106 160 C86 172 54 172 34 160 Z'
  const band = 'M27 70 C48 60 92 60 113 70 L113 82 C92 72 48 72 27 82 Z'
  const tail1 = 'M106 70 C120 60 128 47 137 33 C140 52 133 67 114 80 Z'
  const tail2 = 'M108 77 C122 74 132 79 138 90 C128 91 117 91 107 88 Z'
  const g0 = [41, 66]
  const g1 = [19, 22]
  const dx = g1[0] - g0[0]
  const dy = g1[1] - g0[1]
  const L = Math.hypot(dx, dy)
  const nx = (-dy / L) * 4.6
  const ny = (dx / L) * 4.6
  const grip = poly([g0[0] + nx, g0[1] + ny, g1[0] + nx, g1[1] + ny, g1[0] - nx, g1[1] - ny, g0[0] - nx, g0[1] - ny])
  let wraps = ''
  for (let i = 1; i < 7; i++) {
    const t = i / 7
    const cx = g0[0] + dx * t
    const cy = g0[1] + dy * t
    wraps += poly([cx + nx, cy + ny, cx + (dx / L) * 2.6, cy + (dy / L) * 2.6, cx - nx, cy - ny, cx - (dx / L) * 2.6, cy - (dy / L) * 2.6])
  }
  const CLOTH = { shade: '#7078a8', deep: '#1e1c38', term: 0.34, hi: 0.3 }
  const RED = { shade: '#e09090', deep: '#6a1a30', hi: 0.35 }
  const paths: VectorPath[] = [
    // katana grip behind the head
    { d: grip, fill: lin(15, 20, 45, 66, 0, '#3b3046', 1, '#17121d'), stroke: INK, sw: 2.6 },
    { d: wraps, fill: '#c9a24a', stroke: INK, sw: 1 },
    ...form(circ(18.5, 21, 5), GOLD(14, 16, 24, 26), { box: [13.5, 16, 23.5, 26], shade: '#e0b080', deep: '#8a5020', sw: 2.2, hi: 0.6 }),
    ...form(ell(42, 68, 9, 4.5), GOLD(33, 64, 51, 72), { box: [33, 63.5, 51, 72.5], shade: '#e0b080', deep: '#8a5020', sw: 2.4 }),
    // headband tails
    ...form(tail1, lin(106, 70, 137, 33, 0, '#c41e1e', 1, '#ff6a50'), { ...RED, rim: RIM, sw: 2.8 }),
    ...form(tail2, lin(107, 77, 138, 90, 0, '#a81818', 1, '#e8433a'), { ...RED, rim: RIM, sw: 2.8 }),
    ink('M113 71 C121 64 127 56 132 47 M114 83 C121 82 127 83 132 86', 1.4, 'rgba(110,0,10,0.6)'),
    // shoulders, strap, scarf
    ...form(shoulders, lin(4, 152, 136, 200, 0, '#4c5a86', 0.5, '#2a3352', 1, '#141a32'), { ...CLOTH, rim: RIM, rimW: 9 }),
    ink('M20 180 C26 172 34 168 44 166 M118 182 C114 174 108 170 100 168 M26 196 C30 186 36 180 44 176', 1.8, 'rgba(0,0,0,0.4)'),
    ...form('M30 157 L118 200 L100 200 L23 166 Z', lin(30, 157, 110, 200, 0, '#b07040', 1, '#5a3418'), { shade: '#c09080', deep: '#5a3020', sw: 2.6 }),
    { d: circ(52, 172, 4.6), stroke: INK, sw: 4.6 },
    { d: circ(52, 172, 4.6), stroke: '#d8dfe6', sw: 2.2 },
    ...form(scarf, lin(34, 144, 106, 172, 0, '#ff5a4a', 0.5, '#d42a26', 1, '#7e1012'), { ...RED, rim: RIM, sw: 3 }),
    ink('M44 152 C58 160 82 160 96 152', 1.6, 'rgba(110,0,10,0.6)'),
    ao(70, 150, 30, scarf, '#6a1a2a', 0.4),
    // hooded head
    ...form(hood, radLit(58, 82, 72, 0, '#5a6894', 0.5, '#2e3858', 1, '#141a2e'), { ...CLOTH, rim: RIM, rimW: 10, sw: 3.8 }),
    gloss('M38 72 C40 58 50 48 62 44.5', 3, 0.55),
    ink('M44 124 Q70 135 96 124 M52 138 Q70 145 88 138', 2, 'rgba(0,0,0,0.45)'),
    ink('M45 122 Q60 129 70 130', 1.4, 'rgba(255,255,255,0.16)'),
    ink('M62 112 Q70 108 78 112', 1.6, 'rgba(255,255,255,0.18)'),
    ink('M70 41 L70 62', 1.8, 'rgba(0,0,0,0.4)'),
    // eye slit
    ...form(slit, SKIN(62, 92, 40), { ...SKIN_SH, sw: 3 }),
    { d: 'M33 86 C50 79 90 79 107 86 L106.8 91.5 C90 85 50 85 33.3 91.5 Z', fill: lin(0, 82, 0, 92, 0, '#8a4a3a', 1, '#ffffff'), clip: slit, blend: 'multiply' },
    { d: almond, fill: radLit(55, 93, 12, 0, '#ffffff', 1, '#d6dde8'), stroke: INK, sw: 1.8 },
    { d: mir(almond), fill: radLit(85, 93, 12, 0, '#ffffff', 1, '#d6dde8'), stroke: INK, sw: 1.8 },
    { d: circ(57.5, 94, 3.8), fill: radLit(57.5, 94, 3.8, 0, '#ffe08a', 1, '#b8520a'), clip: almond },
    { d: circ(82.5, 94, 3.8), fill: radLit(82.5, 94, 3.8, 0, '#ffe08a', 1, '#b8520a'), clip: mir(almond) },
    { d: circ(57.5, 94, 1.8) + circ(82.5, 94, 1.8), fill: INK },
    { d: circ(59, 92.6, 1.15) + circ(84, 92.6, 1.15), fill: '#ffffff' },
    { d: brow + mir(brow), fill: INK },
    // headband + steel plate
    ...form(band, lin(0, 60, 0, 82, 0, '#ff6a56', 0.5, '#d42a26', 1, '#8e1414'), { ...RED, rim: RIM, sw: 3 }),
    gloss('M32 72 C46 66 56 64 64 63.5', 1.8, 0.6),
    ...form(rrect(54.5, 60.5, 31, 15.5, 3.2), STEEL(54, 86), { box: [54.5, 60.5, 85.5, 76], ...METAL_SH, rim: RIM, sw: 2.4 }),
    { d: star(70, 68.3, 6, 2, 4, -45), fill: '#3c444f' },
    { d: circ(70, 68.3, 1.3), fill: '#c9d1da' },
    { d: circ(58, 64, 1.2) + circ(82, 64, 1.2) + circ(58, 72.5, 1.2) + circ(82, 72.5, 1.2), fill: '#4b5562' },
    gloss('M57.5 63 L64 63', 1.3, 1),
  ]
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths }
}

// ---- Robot: R-0B1N --------------------------------------------------------------
function rust(x: number, y: number, r: number, seed: number): VectorPath[] {
  const R = rng(seed)
  const blobPts = (rr: number, ox: number, oy: number) => {
    const pts: number[] = []
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      const k = rr * (0.62 + R() * 0.5)
      pts.push(x + ox + k * Math.cos(a), y + oy + k * 0.78 * Math.sin(a))
    }
    return poly(pts)
  }
  let specks = ''
  for (let i = 0; i < 5; i++) specks += circ(x + (R() - 0.5) * r * 1.4, y + (R() - 0.5) * r, 0.5 + R() * 0.7)
  return [
    { d: blobPts(r * 1.15, 0, 0), fill: 'rgba(150,70,24,0.35)' },
    { d: blobPts(r, 0, 0), fill: radLit(x, y, r * 1.1, 0, '#eea060', 0.55, '#c2602a', 1, '#8a3a16') },
    { d: blobPts(r * 0.45, r * 0.15, r * 0.1), fill: '#7a2c0e', alpha: 0.75 },
    { d: specks, fill: '#5e220a', alpha: 0.8 },
  ]
}

export function robot(): Art {
  const RIM = '94,240,255'
  const head = rrect(20, 48, 100, 84, 20)
  const body = 'M6 200 C6 174 18 154 42 148 L98 148 C122 154 134 174 134 200 Z'
  const visor = rrect(30, 63, 80, 54, 14)
  const PAINT = { ...METAL_SH, shade: '#9fb0c4', deep: '#3c4a5e' }
  const paths: VectorPath[] = [
    // antenna with a warm beacon
    glow(70, 17, 20, '255,170,60', 0.6, 'lighter'),
    ink('M70 46 L70 23', 5),
    ink('M70 46 L70 23', 2.4, '#c4ced8'),
    { d: circ(70, 17, 6.5), fill: radLit(70, 17, 7, 0, '#fff6d0', 0.4, '#ffb020', 1, '#c84e14'), stroke: INK, sw: 2.4 },
    { d: circ(68, 15, 1.8), fill: '#ffffff' },
    ...form(rrect(61, 40, 18, 10, 3), STEEL(61, 79), { box: [61, 40, 79, 50], ...METAL_SH, sw: 2.4 }),
    // ears
    ...form(rrect(8, 74, 16, 34, 6), lin(8, 0, 24, 0, 0, '#dfe6ed', 1, '#76838f'), { box: [8, 74, 24, 108], ...PAINT, sw: 3 }),
    ...form(rrect(116, 74, 16, 34, 6), lin(116, 0, 132, 0, 0, '#aab6c2', 1, '#46505c'), { box: [116, 74, 132, 108], ...PAINT, rim: RIM, sw: 3 }),
    { d: circ(15, 91, 3.6) + circ(125, 91, 3.6), fill: '#4b5562', stroke: INK, sw: 1.6 },
    // neck + body
    ...form(rect(54, 128, 32, 22), lin(54, 0, 86, 0, 0, '#5a6573', 0.3, '#9aa6b3', 1, '#2c333c'), { box: [54, 128, 86, 150], ...PAINT, sw: 3 }),
    ink('M54 135 H86 M54 141 H86', 1.6, 'rgba(0,0,0,0.5)'),
    ...form(body, lin(6, 148, 134, 200, 0, '#e8eff4', 0.3, '#adbcca', 0.62, '#748597', 1, '#414c59'), { ...PAINT, rim: RIM, rimW: 9 }),
    ao(70, 150, 34, body, '#4a5568', 0.35),
    ink('M34 152 C30 170 30 186 32 200 M106 152 C110 170 110 186 108 200', 2),
    gloss('M14 176 C18 162 26 154 36 151', 3, 0.9),
    ...rust(24, 178, 9, 3),
    ...rust(114, 168, 7, 8),
    ...form(rrect(46, 160, 48, 34, 6), lin(46, 160, 94, 194, 0, '#4a5562', 1, '#1f252d'), { box: [46, 160, 94, 194], ...PAINT, sw: 2.6, hi: 0.15 }),
    glow(57, 170, 8, '255,80,80', 0.8, 'lighter'),
    glow(70, 170, 8, '255,210,80', 0.8, 'lighter'),
    glow(83, 170, 8, '120,255,140', 0.8, 'lighter'),
    { d: circ(57, 170, 3.2), fill: radLit(57, 170, 3.4, 0, '#ffe0e0', 1, '#e02a2a'), stroke: INK, sw: 1.2 },
    { d: circ(70, 170, 3.2), fill: radLit(70, 170, 3.4, 0, '#fff4c0', 1, '#e0a010'), stroke: INK, sw: 1.2 },
    { d: circ(83, 170, 3.2), fill: radLit(83, 170, 3.4, 0, '#e0ffe0', 1, '#20b040'), stroke: INK, sw: 1.2 },
    ink('M54 181 H86 M54 186.5 H86', 2, '#0d1116'),
    { d: circ(40, 158, 1.8) + circ(100, 158, 1.8) + circ(16, 192, 1.8) + circ(124, 192, 1.8), fill: '#4b5562', stroke: INK, sw: 0.8 },
    // head (casts occlusion on the neck first)
    ao(70, 132, 22, rect(54, 128, 32, 22), '#1a2028', 0.5),
    ...form(head, lin(20, 48, 120, 132, 0, '#f6f9fb', 0.22, '#ccd6df', 0.5, '#98a7b5', 0.78, '#6c7b8a', 1, '#4a5663'), { box: [20, 48, 120, 132], ...PAINT, rim: RIM, rimW: 10, sw: 4 }),
    ink('M24 60 Q70 55 116 60', 1.4, 'rgba(20,26,36,0.45)'),
    gloss('M29 68 C30 58 37 53 48 52', 3.6, 1),
    gloss('M54 52 L80 52', 2, 0.55),
    ...rust(100, 58, 9, 21),
    ink('M98 64 Q99 71 97 77 M104 63 Q105 67 104 70', 1.6, 'rgba(160,70,24,0.8)'),
    ...rust(33, 120, 7, 14),
    { d: circ(29, 57, 2.4) + circ(29, 123, 2.4) + circ(111, 123, 2.4), fill: radLit(29, 57, 3, 0, '#e6edf3', 1, '#56606d'), stroke: INK, sw: 1.1 },
    // visor glass
    { d: visor, fill: lin(0, 63, 0, 117, 0, '#1f3846', 1, '#081016'), stroke: INK, sw: 3.2 },
    { d: poly([44, 63, 58, 63, 40, 117, 32, 117]), fill: 'rgba(255,255,255,0.07)', clip: visor },
    ink('M37 75 C40 69 47 66.5 57 66.5', 2.4, 'rgba(255,255,255,0.35)'),
    // eyes: glowing optic + camera lens, with bloom
    glow(54, 87, 26, '94,240,255', 0.55, 'lighter'),
    { d: circ(54, 87, 12.5), fill: '#0d3440', stroke: '#5ef0ff', sw: 2 },
    { d: circ(54, 87, 8.5), fill: radLit(54, 87, 9, 0, '#f0ffff', 0.45, '#5ef0ff', 1, '#138fb0') },
    { d: circ(54, 87, 3.4), fill: '#062a36' },
    { d: circ(57, 83.6, 2.2) + circ(50.5, 90.5, 0.9), fill: '#ffffff' },
    glow(89, 88, 17, '94,240,255', 0.35, 'lighter'),
    { d: circ(89, 88, 9.5), fill: '#26323c', stroke: '#9aabba', sw: 2 },
    { d: circ(89, 88, 6.2), fill: radLit(89, 88, 6.5, 0, '#c8fbff', 0.5, '#2ab8d8', 1, '#0a3a4a'), stroke: INK, sw: 1.2 },
    { d: circ(89, 88, 2.4), fill: '#041820' },
    { d: circ(91, 85.6, 1.5), fill: '#ffffff' },
    ink('M57 104 Q70 112 83 104', 8, 'rgba(94,240,255,0.25)'),
    ink('M57 104 Q70 112 83 104', 2.8, '#8ef6ff'),
    { d: rrect(36, 100, 8, 3.5, 1.7) + rrect(96, 100, 8, 3.5, 1.7), fill: '#ff7aa8', alpha: 0.85 },
  ]
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths }
}

