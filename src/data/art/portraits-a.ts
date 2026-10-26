import type { VectorPath } from '../../types'
import { circ, ell, gloss, INK, lin, poly, rad, radLit, rng, rrect, star, type Art } from './kit'
import {
  PORTRAIT_W,
  PORTRAIT_H,
  mir,
  both,
  ink,
  glow,
  blush,
  ao,
  form,
  eye,
  STEEL,
  GOLD,
  SKIN,
  METAL_SH,
  SKIN_SH,
} from './portrait-kit'

// Knight and wizard portraits (140 × 200, flat-cut bust).

// ---- Knight: Sire Boulon ------------------------------------------------------
export function knight(): Art {
  const RIM = '255,186,110'
  const plume = 'M64 46 C58 24 72 8 92 6 C112 4 128 15 129 34 C122 27 114 25 107 27 C116 33 121 44 116 57 C110 46 102 41 93 43 C97 51 97 60 91 66 C87 55 79 49 68 51 Z'
  const breast = 'M34 152 L106 152 L113 200 L27 200 Z'
  const tabard = 'M50 158 L90 158 L94 200 L46 200 Z'
  const lame1 = 'M42 132 Q70 141 98 132 L102 146 Q70 157 38 146 Z'
  const lame2 = 'M38 146 Q70 157 102 146 L106 160 Q70 172 34 160 Z'
  const pauldronL = 'M4 200 L4 176 C4 152 20 140 40 140 C54 140 62 150 60 164 L56 200 Z'
  const pauldronR = mir(pauldronL)
  const helm = 'M30 94 C28 60 46 36 70 36 C94 36 112 60 110 94 L110 120 C110 132 100 138 88 140 L52 140 C40 138 30 132 30 120 Z'
  const opening = 'M44 80 C44 72 50 68 58 68 L82 68 C90 68 96 72 96 80 L96 108 C96 122 86 132 70 132 C54 132 44 122 44 108 Z'
  const face = 'M47.5 82 C47.5 76 52 72 58 72 L82 72 C88 72 92.5 76 92.5 82 L92.5 108 C92.5 120 84 128.5 70 128.5 C56 128.5 47.5 120 47.5 108 Z'
  const visor = 'M33 78 C33 56 49 43 70 43 C91 43 107 56 107 78 C99 69 86 64.5 70 64.5 C54 64.5 41 69 33 78 Z'
  const stache =
    'M70 108 C64 103.5 53 104 46 112 C44 115 45.5 118.5 48.5 116.5 C54 112.5 60 114.5 66 114.5 C68 114.5 70 112.5 70 111 C70 112.5 72 114.5 74 114.5 C80 114.5 86 112.5 91.5 116.5 C94.5 118.5 96 115 94 112 C87 104 76 103.5 70 108 Z'
  const hex: number[] = []
  for (let i = 0; i < 6; i++) hex.push(70 + 8.5 * Math.cos((i * Math.PI) / 3), 171 + 8.5 * Math.sin((i * Math.PI) / 3))
  const paths: VectorPath[] = [
    // plume
    ...form(plume, lin(70, 6, 122, 64, 0, '#ff7a63', 0.45, '#dc3029', 1, '#861414'), { shade: '#e09090', deep: '#702030', rim: RIM, sw: 3.2 }),
    ink('M72 40 C80 22 98 13 120 21 M80 46 C90 32 103 28 113 34 M87 54 C93 46 99 44 106 47', 1.8, 'rgba(110,10,14,0.75)'),
    gloss('M72 30 C77 17 89 11 103 11', 2.6, 0.8),
    // breastplate + tabard
    ...form(breast, STEEL(27, 113), { ...METAL_SH, rim: RIM }),
    ...form(tabard, lin(46, 0, 94, 0, 0, '#4a82de', 0.5, '#2457b0', 1, '#132f68'), { shade: '#8a9ad0', deep: '#3a3a70', sw: 2.6 }),
    ink('M53.5 162 L86.5 162 L89.8 200 M50.2 200 L53.5 162', 1.6, '#f2c14e'),
    ...form(poly(hex), radLit(70, 171, 9, 0, '#fff4b8', 0.6, '#f2c14e', 1, '#a8740e'), { shade: '#e0b080', deep: '#8a5020', sw: 2.2, hi: 0.6 }),
    { d: circ(70, 171, 3.4), fill: '#132f68', stroke: INK, sw: 1.8 },
    gloss('M64.5 166.5 L66.8 163.4', 1.4, 0.9),
    // gorget lames + occlusion under the helmet
    ...form(lame2, STEEL(34, 106), { ...METAL_SH, rim: RIM, sw: 3 }),
    ...form(lame1, STEEL(38, 102), { ...METAL_SH, rim: RIM, sw: 3 }),
    ao(70, 136, 30, lame1, '#3c4456', 0.35),
    ao(70, 156, 34, breast + tabard, '#5a6478', 0.3),
    // pauldrons: chrome with a horizon reflection band
    ...form(pauldronL, lin(4, 140, 60, 200, 0, '#ffffff', 0.32, '#c8d1db', 0.48, '#6e7886', 0.66, '#97a2b0', 1, '#56606c'), { ...METAL_SH, sw: 3.5 }),
    ...form(pauldronR, lin(80, 140, 136, 200, 0, '#dfe5ec', 0.32, '#a8b2be', 0.48, '#545e6b', 0.66, '#747f8d', 1, '#3a414b'), { ...METAL_SH, rim: RIM, rimW: 9 }),
    ink(both('M6 171 C14 159 34 155 59 163 M5 186 C16 175 36 173 57.5 179'), 2.2),
    { d: circ(14, 166, 1.9) + circ(26, 160, 1.9) + circ(40, 158, 1.9) + circ(126, 166, 1.9) + circ(114, 160, 1.9) + circ(100, 158, 1.9), fill: '#f2c14e', stroke: INK, sw: 1 },
    gloss('M11 160 C15 150 25 145 36 144.5', 3, 0.95),
    gloss('M14 150 L18 147', 1.2, 1),
    // helmet dome
    ...form(helm, STEEL(30, 110), { ...METAL_SH, rim: RIM, rimW: 9, sw: 3.8 }),
    gloss('M37 72 C39 57 49 45 61 41.5', 3.6, 0.95),
    { d: circ(36, 84, 1.7) + circ(38.5, 92, 1), fill: '#ffffff' },
    { d: circ(37, 130, 2) + circ(103, 130, 2) + circ(52, 136.5, 1.8) + circ(88, 136.5, 1.8), fill: '#545e6b', stroke: INK, sw: 1 },
    // face inside the helm
    { d: opening, fill: '#1e130c', stroke: INK, sw: 3 },
    ...form(face, SKIN(64, 92, 42), { ...SKIN_SH, sw: 0.01, ink: 'rgba(0,0,0,0)' }),
    { d: 'M47.5 82 C47.5 76 52 72 58 72 L82 72 C88 72 92.5 76 92.5 82 L92.5 90 C80 83 60 83 47.5 90 Z', fill: lin(0, 72, 0, 90, 0, '#7a4a3a', 1, '#ffffff'), clip: face, blend: 'multiply' },
    blush(54, 106, 6.5),
    blush(86, 106, 6.5),
    ...eye(58, 93, 6, 5.6, 3.7, '#9fd8ff', '#2a68b4', 0.6),
    ...eye(82, 93, 6, 5.6, 3.7, '#9fd8ff', '#2a68b4', -0.6),
    { d: 'M49.5 85.5 Q57 80.5 65.5 85 L64.5 88 Q57 84.5 50.5 88.5 Z' + mir('M49.5 85.5 Q57 80.5 65.5 85 L64.5 88 Q57 84.5 50.5 88.5 Z'), fill: '#7a3f1c', stroke: INK, sw: 1.4 },
    { d: 'M70.5 94 C68 99 65.5 102.5 67 105 C68.5 106.8 72.5 106.8 75 104.5 C74 101 72.5 97 70.5 94 Z', fill: '#e39a72', stroke: INK, sw: 1.8 },
    { d: circ(68.8, 102.6, 1.1), fill: 'rgba(255,255,255,0.75)' },
    { d: 'M64 121 Q70 124.5 76 121', stroke: INK, sw: 2 },
    ...form(stache, lin(0, 103, 0, 118, 0, '#f0b064', 1, '#a35a1f'), { shade: '#d8a080', deep: '#7a4020', sw: 2.4, hi: 0.4 }),
    gloss('M51 110 Q57 106.5 64 108', 1.5, 0.75),
    // raised visor
    ...form(visor, STEEL(33, 107), { ...METAL_SH, rim: RIM, sw: 3.5 }),
    ink('M53 53.5 L53 60 M61 50.5 L61 58 M79 50.5 L79 58 M87 53.5 L87 60', 2.1),
    ink('M70.8 44 L70.8 64', 1.4, 'rgba(255,255,255,0.7)'),
    ink('M69.2 44 L69.2 64', 1.4, 'rgba(20,26,36,0.55)'),
    gloss('M41 62 C45 54 55 48.5 63 47.5', 2.6, 0.95),
    { d: circ(34, 79, 4), fill: radLit(34, 79, 5, 0, '#fff4b8', 1, '#b07a12'), stroke: INK, sw: 2 },
    { d: circ(106, 79, 4), fill: radLit(106, 79, 5, 0, '#f2c14e', 1, '#8a5a08'), stroke: INK, sw: 2 },
    ...form(rrect(63.5, 32, 13, 9, 2.5), GOLD(63, 32, 77, 41), { box: [63.5, 32, 76.5, 41], shade: '#e0b080', deep: '#8a5020', sw: 2.2, hi: 0.6 }),
  ]
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths }
}

// ---- Wizard: Mage Zéphyr ------------------------------------------------------
export function wizard(): Art {
  const RIM = '140,230,255'
  const robe = 'M4 200 C6 172 22 154 48 146 L92 146 C118 154 134 172 136 200 Z'
  const hair = 'M33 84 C23 90 22 104 29 112 C26 121 32 130 41 128 L49 96 Z'
  const head = ell(70, 96, 25, 24)
  const beard = 'M42 98 C35 124 39 152 51 172 C57 182 64 192 70 199 C76 192 83 182 89 172 C101 152 105 124 98 98 C92 111 82 116 70 116 C58 116 48 111 42 98 Z'
  const brow = 'M43 89 C44 80 56 77 66 83.5 C63 84 61 85.5 60 88 C56 84.5 50 85.5 43 89 Z'
  const stache =
    'M70 110 C62 104 50 106 44 116 C42 120 44 122.5 47 120.5 C52 114.5 60 116.5 66 118 C68 118 70 116 70 115 C70 116 72 118 74 118 C80 116.5 88 114.5 93 120.5 C96 122.5 98 120 96 116 C90 106 78 104 70 110 Z'
  const hat = 'M28 72 C46 58 55 36 61 20 C65 10 76 3 91 5 C102 7 108 15 106 25 C99 17 89 16 83 22 C80 35 92 57 112 72 Z'
  const brim = ell(70, 74, 56, 10.5)
  const band = 'M31 66 C55 60 85 60 109 66 L111 72 C85 66.5 55 66.5 29 72 Z'
  const orb = circ(116, 150, 12.5)
  const R = rng(5)
  let sparkle = ''
  for (let i = 0; i < 9; i++) {
    const x = 14 + R() * 112
    const y = 160 + R() * 38
    if (Math.abs(x - 70) < 26) continue
    sparkle += star(x, y, 2.6, 1.1, 4, 0)
  }
  const paths: VectorPath[] = [
    // robe
    ...form(robe, lin(4, 146, 136, 200, 0, '#8a6cf0', 0.45, '#5638bc', 1, '#2a1666'), { shade: '#a090d0', deep: '#3a2070', rim: RIM, rimW: 9 }),
    { d: sparkle, fill: '#ffd84d', alpha: 0.9 },
    ink('M48 147 C52 162 56 178 58 200 M92 147 C88 162 84 178 82 200', 5.4),
    ink('M48 147 C52 162 56 178 58 200 M92 147 C88 162 84 178 82 200', 2.8, '#f2c14e'),
    ink('M30 168 C34 178 36 188 36 200 M110 168 C106 178 104 188 104 200', 2, 'rgba(20,0,60,0.4)'),
    // glow from the orb on the robe
    { d: ell(116, 170, 30, 22), fill: rad(116, 168, 30, 0, 'rgba(120,220,255,0.55)', 1, 'rgba(120,220,255,0)'), clip: robe, blend: 'screen' },
    // hair + head
    ...form(hair, lin(22, 90, 50, 128, 0, '#ffffff', 1, '#cdd2de'), { shade: '#c8c8e0', deep: '#8080a8', sw: 2.6 }),
    ...form(mir(hair), lin(90, 90, 118, 128, 0, '#eef0f5', 1, '#b9bfcd'), { shade: '#c8c8e0', deep: '#8080a8', rim: RIM, sw: 2.6 }),
    ...form(head, SKIN(64, 90, 32), { ...SKIN_SH, box: [45, 72, 95, 120], sw: 3.2 }),
    blush(52, 102, 6),
    blush(88, 102, 6),
    ...eye(58, 93, 5, 5.4, 3.5, '#dcc4ff', '#6a3ad0', 0.4),
    ...eye(82, 93, 5, 5.4, 3.5, '#dcc4ff', '#6a3ad0', -0.4),
    ...[58, 82].flatMap((x): VectorPath[] => [
      { d: `M${x - 6} 91.8Q${x} 87.4 ${x + 6} 91.8L${x + 6} 86L${x - 6} 86Z`, fill: SKIN(64, 90, 32) },
      ink(`M${x - 5.3} 91.5Q${x} 87.8 ${x + 5.3} 91.5`, 2),
    ]),
    // beard, mouth, moustache, nose
    ...form(beard, lin(40, 100, 100, 200, 0, '#ffffff', 0.55, '#e8ebf2', 1, '#b4bbcc'), { shade: '#c4c4e0', deep: '#7070a0', rim: RIM, rimW: 8, sw: 3.4 }),
    ao(70, 112, 26, beard, '#8a8ab0', 0.4),
    ink('M56 128 C53 146 57 162 64 177 M70 124 C70 142 70 162 70 186 M84 128 C87 146 83 162 76 177 M48 120 C46 134 48 146 52 156 M92 120 C94 134 92 146 88 156', 1.7, '#a9b0c4'),
    gloss('M45 112 C43 124 44 136 48 146', 2.4, 0.95),
    { d: 'M63 120 Q70 125 77 120 Q70 122 63 120 Z', fill: '#7a2a2a', stroke: INK, sw: 1.6 },
    ...form(stache, lin(0, 104, 0, 122, 0, '#ffffff', 1, '#c9cedb'), { shade: '#c8c8e0', deep: '#8080a8', sw: 2.4 }),
    ...form(circ(70, 103, 6.5), radLit(70, 103, 7, 0, '#ffc7b0', 1, '#d9745c'), { box: [63.5, 96.5, 76.5, 109.5], ...SKIN_SH, sw: 2.3, hi: 0.5 }),
    { d: circ(67.8, 100.6, 1.8), fill: 'rgba(255,255,255,0.9)' },
    // hat
    ...form(hat, lin(28, 0, 112, 0, 0, '#9174f6', 0.4, '#5a3ccc', 1, '#2a146e'), { shade: '#a090d8', deep: '#2a1060', rim: RIM, rimW: 9, sw: 3.8 }),
    gloss('M45 60 C53 48 58 34 63 22', 2.6, 0.6),
    glow(105, 27, 12, '255,220,120', 0.7),
    { d: star(105, 27, 6.2, 2.7), fill: radLit(105, 27, 7, 0, '#fff7c2', 1, '#e8a417'), stroke: INK, sw: 1.8 },
    { d: star(56, 52, 4.6, 2) + star(88, 56, 3.4, 1.5) + star(71, 33, 2.8, 1.2) + star(42, 64, 2.4, 1), fill: '#ffd84d' },
    { d: 'M74 40 A7 7 0 1 0 76 54 A5.4 5.4 0 1 1 74 40 Z', fill: '#ffe680' },
    ...form(brim, lin(14, 64, 126, 84, 0, '#7a5eec', 0.5, '#452cae', 1, '#1e0e56'), { box: [14, 63.5, 126, 84.5], shade: '#9a8ad0', deep: '#2a1060', rim: RIM, sw: 3.6 }),
    ink('M22 73 Q70 61 118 73', 1.8, 'rgba(255,255,255,0.32)'),
    ...form(band, GOLD(30, 60, 30, 72), { shade: '#e0b080', deep: '#8a5020', sw: 2.4, hi: 0.6 }),
    glow(70, 67, 9, '120,230,255', 0.6),
    { d: 'M70 61.5 L75 67 L70 72.5 L65 67 Z', fill: radLit(70, 67, 6, 0, '#e6fbff', 0.5, '#4fd6ff', 1, '#1a6ab0'), stroke: INK, sw: 1.8 },
    // brim shadow on the face, then the brows on top
    { d: ell(70, 86, 30, 7), fill: rad(70, 84, 30, 0, '#9a6a8a', 1, '#ffffff'), clip: head + hair + mir(hair), blend: 'multiply' },
    ...form(brow + mir(brow), lin(0, 77, 0, 89, 0, '#ffffff', 1, '#cfd3de'), { box: [43, 77, 97, 89], shade: '#d0d0e8', deep: '#9090b8', sw: 2, hi: 0.2 }),
    // floating orb: bloom, glass sphere, orbit ring
    glow(116, 150, 40, '150,225,255', 0.5, 'lighter'),
    { d: 'M96 153 A20 5.5 0 0 1 136 153', stroke: 'rgba(255,224,140,0.85)', sw: 1.6 },
    { d: orb, fill: radLit(116, 150, 13, 0, '#ffffff', 0.3, '#b8f2ff', 0.7, '#5a7cf0', 1, '#3a2ab0') },
    { d: circ(119, 154, 9), fill: rad(119, 154, 9, 0, 'rgba(255,255,255,0.7)', 1, 'rgba(160,230,255,0)'), clip: orb, blend: 'screen' },
    { d: orb, stroke: INK, sw: 2.6 },
    ink('M110 154 C106 148 112 141 118 144 C123 146 122 153 117 153', 1.6, 'rgba(255,255,255,0.8)'),
    gloss('M108 145 C109 141 112 139 115 138.5', 2.4, 1),
    { d: 'M96 153 A20 5.5 0 0 0 136 153', stroke: '#ffe08a', sw: 1.8 },
    { d: circ(134.5, 151.5, 1.6), fill: '#ffffff' },
    { d: star(132, 134, 3.4, 1, 4, 0) + star(102, 132, 2.4, 0.8, 4, 0) + star(130, 168, 2, 0.7, 4, 0), fill: '#ffffff' },
  ]
  return { viewW: PORTRAIT_W, viewH: PORTRAIT_H, paths }
}

