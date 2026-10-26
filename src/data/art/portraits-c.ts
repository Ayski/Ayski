import type { Paint, VectorPath } from '../../types'
import { circ, ell, gloss, INK, lin, poly, rad, radLit, rrect, type Art } from './kit'
import {
  PORTRAIT_W,
  PORTRAIT_H,
  r2,
  rgba,
  mir,
  both,
  ink,
  glow,
  blush,
  ao,
  form,
  GOLD,
} from './portrait-kit'

// Dragon and ghost-pirate portraits (140 × 200, flat-cut bust).

// ---- Dragon: Aurum --------------------------------------------------------------
export function dragon(): Art {
  const RIM = '255,150,60'
  const wing = 'M50 134 L22 36 C17 50 10 60 3 66 Q15 76 8 93 Q22 99 16 119 Q30 117 40 131 Z'
  const horn = 'M47 66 C34 50 28 30 34 7 C40 26 52 38 65 50 Z'
  const frill = 'M38 84 L19 76 L26 88 L14 95 L28 101 L20 111 L40 105 Z'
  const head = 'M34 92 C32 64 48 48 70 48 C92 48 108 64 106 92 C106 106 102 114 96 120 L44 120 C38 114 34 106 34 92 Z'
  const brow = 'M37 75 C46 72 58 75 67 81 L63.5 85.5 C56 81 47 79.5 40 80.5 Z'
  const eyeShape = 'M42.5 88 C46 79.5 59.5 79 65 87.5 C61 95 47 95.5 42.5 88 Z'
  const neck = 'M43 116 L97 116 L106 162 L34 162 Z'
  const chest = 'M4 200 C8 178 22 162 44 156 L96 156 C118 162 132 178 136 200 Z'
  const belly = 'M53 120 L87 120 L93 200 L47 200 Z'
  const snout = 'M44 113 C43 101 54 96 70 96 C86 96 97 101 96 113 C95 127 85 136 70 136 C55 136 45 127 44 113 Z'
  const GOLDSH = { shade: '#d89c5c', deep: '#7a3a08', term: 0.36, hi: 0.5 }
  let scales = ''
  for (let row = 0; row < 6; row++) {
    const y = 164 + row * 6.5
    const half = 30 + row * 9
    for (let x = 70 - half; x < 70 + half - 6; x += 9) {
      const xx = x + (row % 2 ? 4.5 : 0)
      if (xx > 47 && xx < 87) continue
      scales += `M${r2(xx)} ${r2(y)}q4.5 5 9 0`
    }
  }
  let bands = ''
  for (let i = 0; i < 6; i++) {
    const y = 134 + i * 12
    const hw = 16.5 + i * 0.9
    bands += `M${r2(70 - hw)} ${y}Q70 ${y + 4} ${r2(70 + hw)} ${y}`
  }
  const MEMB = { shade: '#d07070', deep: '#401010', hi: 0.2 }
  const paths: VectorPath[] = [
    // wings
    ...form(wing, lin(9, 40, 46, 134, 0, '#e0502e', 0.5, '#9a2014', 1, '#4a0a06'), { ...MEMB, sw: 3 }),
    ...form(mir(wing), lin(131, 40, 94, 134, 0, '#c03c22', 0.5, '#7a160c', 1, '#3a0604'), { ...MEMB, rim: RIM, rimW: 8, sw: 3 }),
    ink(both('M22 38 L4.5 65 M22.5 39 L9 92 M23.5 40 L17 118'), 3.4),
    ink(both('M22 38 L4.5 65 M22.5 39 L9 92 M23.5 40 L17 118'), 1.6, '#f2c14e'),
    ...form(poly([51, 133, 45.5, 135, 19.5, 39, 24.5, 35.5]), GOLD(19, 36, 51, 135), { ...GOLDSH, sw: 2 }),
    ...form(poly([89, 133, 94.5, 135, 120.5, 39, 115.5, 35.5]), lin(89, 36, 121, 135, 0, '#f2c14e', 0.6, '#b07a12', 1, '#6e4606'), { ...GOLDSH, rim: RIM, sw: 2 }),
    { d: poly([22, 37, 18, 27, 25.5, 33.5]) + poly([118, 37, 122, 27, 114.5, 33.5]), fill: '#fff4d0', stroke: INK, sw: 1.6 },
    // horns
    ...form(horn, lin(30, 8, 64, 60, 0, '#fffcef', 0.5, '#efe0b0', 1, '#ad9150'), { shade: '#d8c8a0', deep: '#6a5428', sw: 3.2, hi: 0.5 }),
    ...form(mir(horn), lin(110, 8, 76, 60, 0, '#f2e6c2', 0.5, '#d6c28a', 1, '#8e7438'), { shade: '#d8c8a0', deep: '#6a5428', rim: RIM, sw: 3.2 }),
    ink(both('M38.5 45 Q44 43 48.5 47 M36 33 Q41 32 44.5 36 M36.5 21 Q39.5 21 41.5 24.5'), 1.6, '#9a7e40'),
    gloss('M36 30 C35 22 35.5 15 36.5 11', 2, 0.95),
    // neck + chest
    ...form(neck, lin(34, 0, 106, 0, 0, '#ffe07a', 0.45, '#eab43c', 1, '#9a6610'), { ...GOLDSH, rim: RIM, sw: 3.4 }),
    ...form(chest, lin(4, 156, 136, 200, 0, '#ffe68a', 0.4, '#efb83e', 0.75, '#c08514', 1, '#7a4c06'), { ...GOLDSH, rim: RIM, rimW: 9 }),
    { d: scales, stroke: 'rgba(140,90,8,0.75)', sw: 1.4, clip: chest },
    gloss('M12 182 C18 170 28 162 40 158', 3, 0.85),
    ...form(belly, lin(47, 0, 93, 0, 0, '#fffbe2', 0.5, '#f7dc96', 1, '#d0a04a'), { ...GOLDSH, sw: 2.8 }),
    ink(bands, 1.8, '#b98a34'),
    ao(70, 120, 30, neck + belly, '#8a4a10', 0.45),
    // frills + jaw spikes
    ...form(frill, lin(7, 70, 40, 115, 0, '#ff8a3c', 1, '#b8301a'), { ...MEMB, sw: 2.8 }),
    ...form(mir(frill), lin(133, 70, 100, 115, 0, '#e8642c', 1, '#8e2210'), { ...MEMB, rim: RIM, sw: 2.8 }),
    ink(both('M37 90 L24 87 M37 98 L26 100'), 1.4, 'rgba(110,20,0,0.6)'),
    { d: poly([39, 106, 26, 117, 42, 115]) + poly([101, 106, 114, 117, 98, 115]), fill: lin(0, 106, 0, 117, 0, '#ff9a4a', 1, '#b8301a'), stroke: INK, sw: 2.2 },
    { d: poly([58, 52, 62, 39, 67, 50]) + poly([73, 50, 78, 39, 82, 52]), fill: lin(0, 38, 0, 52, 0, '#ff9a4a', 1, '#c4401a'), stroke: INK, sw: 2.2 },
    // head
    ...form(head, radLit(60, 72, 62, 0, '#fff3a8', 0.45, '#f2c14e', 1, '#a8700e'), { ...GOLDSH, rim: RIM, rimW: 9, sw: 3.8 }),
    gloss('M40 76 C41 64 49 55 59 51.5', 3.2, 0.95),
    glow(70, 63, 9, '255,60,90', 0.55),
    { d: 'M70 57 L74.5 63 L70 69 L65.5 63 Z', fill: radLit(70, 63, 7, 0, '#ffd0dc', 0.45, '#ff3a5a', 1, '#8a0a24'), stroke: INK, sw: 1.8 },
    { d: circ(68.6, 61.4, 1.1), fill: '#ffffff' },
    ink('M51 71 q3.5 3.5 7 0 M58 71 q3.5 3.5 7 0 M75 71 q3.5 3.5 7 0 M82 71 q3.5 3.5 7 0 M57 58 q3 3 6 0 M77 58 q3 3 6 0', 1.4, 'rgba(160,100,10,0.6)'),
    ink('M40 100 q3 3 6 0 M43 106 q3 3 6 0 M94 100 q3 3 6 0 M91 106 q3 3 6 0', 1.4, 'rgba(140,90,8,0.7)'),
    // glowing eyes
    glow(54, 87, 15, '255,190,60', 0.6, 'lighter'),
    glow(86, 87, 15, '255,190,60', 0.6, 'lighter'),
    { d: eyeShape, fill: radLit(54, 86, 11, 0, '#fffbd0', 0.45, '#ffc02a', 1, '#e0661a'), stroke: INK, sw: 2.4 },
    { d: mir(eyeShape), fill: radLit(86, 86, 11, 0, '#fffbd0', 0.45, '#ffc02a', 1, '#e0661a'), stroke: INK, sw: 2.4 },
    { d: ell(55, 87.5, 1.9, 5.6) + ell(85, 87.5, 1.9, 5.6), fill: INK },
    { d: circ(51.2, 85, 1.5) + circ(81.2, 85, 1.5), fill: '#ffffff' },
    ...form(brow + mir(brow), lin(0, 68, 0, 86, 0, '#f7c24a', 1, '#b47610'), { box: [37, 72, 103, 86], ...GOLDSH, sw: 2.4 }),
    // snout
    ...form(snout, radLit(62, 104, 40, 0, '#fff8d0', 0.5, '#f8d47e', 1, '#c48a1c'), { ...GOLDSH, rim: RIM, sw: 3.4 }),
    { d: 'M50 106 C52 100.5 60 98.5 70 98.5 C80 98.5 88 100.5 90 106 C84 104 76 103.5 70 103.5 C64 103.5 56 104 50 106 Z', fill: 'rgba(255,255,255,0.45)' },
    ink('M51.5 105 Q56 99.5 63.5 101 M88.5 105 Q84 99.5 76.5 101', 1.6, 'rgba(120,70,0,0.7)'),
    { d: 'M54 107 C56 103 61 102 64 104.5 C61 105 58 106.5 56.5 109 Z' + mir('M54 107 C56 103 61 102 64 104.5 C61 105 58 106.5 56.5 109 Z'), fill: INK },
    { d: 'M47 118 C56 128 84 128 93 117', stroke: INK, sw: 2.6 },
    { d: poly([55, 123.4, 58, 131, 61.2, 125]) + poly([85, 123.4, 82, 131, 78.8, 125]), fill: '#ffffff', stroke: INK, sw: 1.6 },
    ink('M44.8 115 Q45.8 119.5 49.6 120 M95.2 114 Q94.2 118.5 90.4 119', 2),
    ink('M61 131.5 q9 3.5 18 0', 1.4, 'rgba(160,100,10,0.6)'),
  ]
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths }
}

// ---- Ghost pirate: Cap. Brume -----------------------------------------------------
export function pirateGhost(): Art {
  const RIM = '143,227,255'
  const headD = 'M31 102 C31 73 48 58 70 58 C92 58 109 73 109 102 C109 118 108 132 104 145 C99 139 93 141 88.5 149 C83 141 76 141 70 151 C64 141 57 141 51.5 149 C47 141 41 139 36 145 C32 132 31 118 31 102 Z'
  const coat = 'M4 200 C6 174 20 156 44 148 L96 148 C120 156 134 174 136 200 Z'
  const lapel = 'M45 149 L69 181 L60 200 L42 200 L37 168 Z'
  const epaulette = 'M8 170 C11 155 25 148 42 150 C45 158 42 165 35 170 Z'
  const crown = 'M36 64 C36 36 52 23 70 23 C88 23 104 36 104 64 Z'
  const brimD = 'M9 65 C17 44 38 46 50 55 C58 42 82 42 90 55 C102 46 123 44 131 65 C110 73 90 75 70 77 C50 75 30 73 9 65 Z'
  const half = 'M70 110.5 C64 105.5 55 105.5 49 109.5 C45.5 112 41 111 40.5 107.5 C40.2 104.4 43.6 102.8 45.6 104.8 C46.8 106 45.8 107.8 44.4 107.4 C45.6 109 48 108 51 106.6 C58 103.6 65 104.6 70 107.5 Z'
  let fringe = ''
  for (let i = 0; i < 6; i++) {
    const x = 11.5 + i * 4.4
    fringe += `M${r2(x)} ${r2(170 - i * 0.2)}L${r2(x - 0.6)} ${r2(178 - (i % 2) * 1.5)}`
  }
  const GHOST: Paint = radLit(58, 84, 70, 0, 'rgba(250,254,255,0.97)', 0.55, 'rgba(206,240,250,0.94)', 1, 'rgba(120,196,222,0.9)')
  const COAT = { shade: '#d89098', deep: '#4a1020', hi: 0.25 }
  const GOLDSH = { shade: '#e8b878', deep: '#8a4a10', hi: 0.5 }
  const paths: VectorPath[] = [
    glow(70, 104, 64, '143,227,255', 0.4),
    // captain's coat with lace jabot
    ...form(coat, lin(4, 148, 136, 200, 0, '#dc4e54', 0.45, '#a0202c', 1, '#420a14'), { ...COAT, rim: RIM, rimW: 9 }),
    ...form('M58 148 L82 148 L77 178 L70 186 L63 178 Z', lin(58, 148, 82, 186, 0, '#ffffff', 1, '#c9d6e0'), { shade: '#c0c8e0', deep: '#7080a0', sw: 2.2 }),
    ink('M61 157 Q70 161 79 157 M62.5 166 Q70 170 77.5 166 M64.5 175 Q70 179 75.5 175', 1.5, '#8fa3b4'),
    ...form(lapel, lin(37, 149, 69, 200, 0, '#c8383f', 1, '#5a0c16'), { ...COAT, sw: 2.6 }),
    ...form(mir(lapel), lin(103, 149, 71, 200, 0, '#922028', 1, '#3e0610'), { ...COAT, rim: RIM, sw: 2.6 }),
    ink('M44 153 L65.5 182 M96 153 L74.5 182', 1.6, '#f2c14e'),
    { d: circ(44, 182, 2.6) + circ(96, 182, 2.6) + circ(43, 193, 2.6) + circ(97, 193, 2.6), fill: radLit(44, 182, 3, 0, '#fff4b8', 1, '#b07a12'), stroke: INK, sw: 1.2 },
    ...form(epaulette, GOLD(8, 148, 42, 170), { ...GOLDSH, sw: 2.4 }),
    ...form(mir(epaulette), lin(132, 148, 98, 170, 0, '#f2c14e', 0.6, '#b07a12', 1, '#6e4606'), { ...GOLDSH, rim: RIM, sw: 2.4 }),
    ink(both(fringe), 1.8, '#d9a52e'),
    gloss('M13 162 C17 156 25 153 33 153', 2, 0.9),
    // spectral glow spilling onto the coat
    { d: ell(70, 150, 46, 18), fill: rad(70, 148, 46, 0, 'rgba(143,227,255,0.5)', 1, 'rgba(143,227,255,0)'), clip: coat, blend: 'screen' },
    // ghost head with a wavy hem
    { d: headD, fill: GHOST },
    { d: headD, fill: rad(56, 80, 90, 0, '#ffffff', 0.5, '#ffffff', 0.75, '#a8d0e8', 1, '#5a8aa8'), clip: headD, blend: 'multiply' },
    { d: headD, stroke: lin(31, 70, 109, 130, 0, rgba(RIM, 0), 0.6, rgba(RIM, 0), 1, rgba(RIM, 1)), sw: 10, clip: headD, blend: 'screen' },
    { d: headD, stroke: '#24566a', sw: 3.6 },
    gloss('M38 96 C39 84 45 74 54 68.5', 3.2, 0.95),
    ink('M44 136 Q46 128 52 124 M60 140 Q62 134 66 131', 1.6, 'rgba(255,255,255,0.55)'),
    blush(46, 114, 7, '120,190,255', 0.45),
    blush(94, 114, 7, '120,190,255', 0.45),
    { d: circ(107.5, 124, 3.4), stroke: INK, sw: 3.2 },
    { d: circ(107.5, 124, 3.4), stroke: '#f2c14e', sw: 1.5 },
    // eye patch + glowing eye
    ink('M33 77 C50 84 84 95.5 104 102', 2.6),
    { d: 'M45 86 C45 80 64 80 64 86 C64 96 58 101 54.5 101 C51 101 45 96 45 86 Z', fill: lin(45, 80, 64, 101, 0, '#3a3a46', 1, '#0c0c12'), stroke: INK, sw: 2.2 },
    gloss('M49 85 Q53 82.5 58 83', 1.4, 0.65),
    glow(85, 92, 18, '120,230,255', 0.7, 'lighter'),
    { d: ell(85, 91, 8, 9), fill: '#0d3a4a', stroke: INK, sw: 2.4 },
    { d: circ(85, 92, 4.4), fill: radLit(85, 92, 4.6, 0, '#ffffff', 0.4, '#8fe3ff', 1, '#1aa0d0') },
    { d: circ(83.6, 90.4, 1.3), fill: '#ffffff' },
    ink('M75 78.5 Q86 73 95 79.5', 2.8),
    // grin, gold tooth, curly moustache
    { d: 'M52 113 C60 126 81 127 92 110 C80 117 62 119 52 113 Z', fill: lin(0, 110, 0, 126, 0, '#1a4a5c', 1, '#062430'), stroke: INK, sw: 2.6 },
    { d: rrect(73.5, 115.2, 5.4, 5, 1.2), fill: radLit(76, 117, 4, 0, '#fff4b8', 1, '#c48a1c'), stroke: INK, sw: 1.2 },
    { d: half + mir(half), fill: lin(0, 103, 0, 112, 0, '#ffffff', 1, '#bfe6f2'), stroke: '#24566a', sw: 1.8 },
    // hat (occludes the top of the head)
    { d: ell(70, 74, 40, 8), fill: rad(70, 72, 40, 0, '#5a8aa8', 1, '#ffffff'), clip: headD, blend: 'multiply' },
    ...form(crown, lin(36, 0, 104, 0, 0, '#50505e', 0.5, '#28283a', 1, '#101018'), { shade: '#9090b0', deep: '#202030', rim: RIM, sw: 3.4, hi: 0.3 }),
    ink('M63 37 L77 47 M77 37 L63 47', 5),
    ink('M63 37 L77 47 M77 37 L63 47', 2.6, '#f4f1e6'),
    { d: circ(70, 33, 6), fill: radLit(70, 33, 6.5, 0, '#ffffff', 1, '#d6d0be'), stroke: INK, sw: 1.8 },
    { d: circ(67.8, 32.6, 1.6) + circ(72.2, 32.6, 1.6) + poly([70, 35, 68.8, 37, 71.2, 37]), fill: INK },
    ...form(brimD, lin(0, 42, 0, 77, 0, '#3e3e4c', 1, '#0a0a10'), { shade: '#9090b0', deep: '#202030', rim: RIM, sw: 3.6, hi: 0.3 }),
    ink('M12 63 C20 48 38 49.5 50.5 58.5 C58 46.5 82 46.5 89.5 58.5 C102 49.5 120 48 128 63', 2.2, '#f2c14e'),
    gloss('M18 58 C24 51 34 50 42 53', 1.8, 0.5),
  ]
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths }
}

