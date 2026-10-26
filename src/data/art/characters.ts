import type { Paint, VectorPath } from '../../types'
import { circ, ell, gloss, INK, lin, poly, rad, radLit, rect, rng, rrect, star, type Art } from './kit'

// Original characters for the collectible "character cards".
// Each portrait is a sculpted bust authored in a 140 × 200 box, cut flat at
// the bottom so it sits on the card's plinth. One key light from the
// upper-left on every card; a coloured rim light from the scene on the right.

export const PORTRAIT_W = 140
export const PORTRAIT_H = 200

// ---- local helpers -------------------------------------------------------------
const r2 = (v: number) => Math.round(v * 100) / 100
const rgba = (c: string, a: number) => `rgba(${c},${a})`
type BBox = [number, number, number, number]

// Mirror a path (absolute M/L/C/Q/S/T commands only) around a vertical axis.
function mir(d: string, ax = 70): string {
  return d.replace(/([MLCQST])([^MLCQSTZ]*)/g, (_m, c: string, args: string) => {
    const nums = args.trim().split(/[\s,]+/).filter(Boolean).map(Number)
    return c + nums.map((v, i) => (i % 2 === 0 ? r2(2 * ax - v) : v)).join(' ')
  })
}
const both = (d: string, ax = 70) => d + mir(d, ax)

// Bounding box of a path written with absolute coordinate pairs.
function bb(d: string): BBox {
  const v = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i + 1 < v.length; i += 2) {
    x0 = Math.min(x0, v[i])
    x1 = Math.max(x1, v[i])
    y0 = Math.min(y0, v[i + 1])
    y1 = Math.max(y1, v[i + 1])
  }
  return [x0, y0, x1, y1]
}

const ink = (d: string, sw = 2.2, color: Paint = INK): VectorPath => ({ d, stroke: color, sw })
const glow = (x: number, y: number, r: number, c: string, a = 0.6, blend: GlobalCompositeOperation = 'screen'): VectorPath => ({
  d: circ(x, y, r),
  fill: rad(x, y, r, 0, rgba(c, a), 0.4, rgba(c, +(a * 0.35).toFixed(3)), 1, rgba(c, 0)),
  blend,
})
const blush = (x: number, y: number, r: number, c = '255,110,110', a = 0.5): VectorPath => ({
  d: circ(x, y, r),
  fill: rad(x, y, r, 0, rgba(c, a), 1, rgba(c, 0)),
})
// Ambient occlusion: a soft multiply spot limited to `clip`.
const ao = (x: number, y: number, r: number, clip: string, color = '#6a5a70', sy = 1): VectorPath => ({
  d: ell(x, y, r, r * sy),
  fill: rad(x, y, r, 0, color, 1, '#ffffff'),
  clip,
  blend: 'multiply',
})

interface FormOpts {
  sw?: number
  ink?: Paint
  shade?: string // core-shadow tint (multiplied)
  deep?: string // occlusion tint at the far side
  term?: number // terminator position 0..1 (smaller = more shadow)
  hi?: number // key-light sheen strength
  rim?: string // rim-light colour "r,g,b"
  rimW?: number
  box?: BBox
}

// A lit volume: base fill, multiply core shadow away from the upper-left key,
// a soft screen sheen toward the key, a coloured rim on the far edge, ink.
function form(d: string, fill: Paint, o: FormOpts = {}): VectorPath[] {
  const [x0, y0, x1, y1] = o.box ?? bb(d)
  const w = x1 - x0
  const h = y1 - y0
  const lx = x0 + w * 0.28
  const ly = y0 + h * 0.2
  const R = Math.hypot(w, h) * 0.86
  const t = o.term ?? 0.36
  const out: VectorPath[] = [{ d, fill }]
  out.push({
    d,
    fill: rad(lx, ly, R, 0, '#ffffff', t, '#ffffff', Math.min(0.97, t + 0.16), o.shade ?? '#9a8cb4', 1, o.deep ?? '#54486e'),
    clip: d,
    blend: 'multiply',
  })
  if ((o.hi ?? 0.35) > 0) {
    out.push({ d, fill: rad(lx, ly, Math.max(w, h) * 0.42, 0, rgba('255,255,255', o.hi ?? 0.35), 1, 'rgba(255,255,255,0)'), clip: d, blend: 'screen' })
  }
  if (o.rim) {
    out.push({
      d,
      stroke: lin(x0, y0 + h * 0.2, x1, y1 - h * 0.1, 0, rgba(o.rim, 0), 0.62, rgba(o.rim, 0), 1, rgba(o.rim, 1)),
      sw: o.rimW ?? 7,
      clip: d,
      blend: 'screen',
    })
  }
  out.push({ d, stroke: o.ink ?? INK, sw: o.sw ?? 3.5 })
  return out
}

// Lit eye: white, gradient iris, pupil and specular dots.
function eye(x: number, y: number, rx: number, ry: number, irisR: number, light: string, dark: string, dx = 0): VectorPath[] {
  const white = ell(x, y, rx, ry)
  return [
    { d: white, fill: radLit(x, y, Math.max(rx, ry) * 1.3, 0, '#ffffff', 1, '#cfd7e4') },
    { d: circ(x + dx, y + 0.4, irisR), fill: radLit(x + dx, y + 0.4, irisR, 0, light, 1, dark), clip: white },
    { d: circ(x + dx, y + 0.4, irisR * 0.48), fill: INK, clip: white },
    { d: ell(x, y - ry * 0.55, rx * 1.1, ry * 0.6), fill: 'rgba(60,40,80,0.28)', clip: white, blend: 'multiply' },
    { d: white, stroke: INK, sw: 2 },
    { d: circ(x + dx + irisR * 0.38, y - irisR * 0.32, irisR * 0.32), fill: '#ffffff' },
    { d: circ(x + dx - irisR * 0.35, y + irisR * 0.45, irisR * 0.14), fill: 'rgba(255,255,255,0.85)' },
  ]
}

const STEEL = (x0: number, x1: number): Paint =>
  lin(x0, 0, x1, 0, 0, '#8a95a3', 0.12, '#e6ecf2', 0.28, '#ffffff', 0.44, '#b8c2cd', 0.62, '#8a95a4', 0.84, '#5f6977', 1, '#454d58')
const GOLD = (x0: number, y0: number, x1: number, y1: number): Paint =>
  lin(x0, y0, x1, y1, 0, '#fff4b8', 0.35, '#f2c14e', 0.7, '#c98f1c', 1, '#8a5a08')
const SKIN = (x: number, y: number, r: number): Paint => radLit(x, y, r, 0, '#ffe4ca', 0.55, '#f6be96', 1, '#dc9470')
const METAL_SH = { shade: '#8a96ae', deep: '#363e54', term: 0.36, hi: 0.55 }
const SKIN_SH = { shade: '#eaaca4', deep: '#b06878', term: 0.46, hi: 0.3 }

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
