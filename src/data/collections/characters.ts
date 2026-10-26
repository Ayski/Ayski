import { bg, vec, backdrop, A, type Template } from '../builders'
import {
  knight,
  wizard,
  ninja,
  robot,
  dragon,
  pirateGhost,
  knightScene,
  wizardScene,
  ninjaScene,
  robotScene,
  dragonScene,
  ghostScene,
  PORTRAIT_W,
  PORTRAIT_H,
  type Stage,
} from '../art/characters'
import type { Finish, Layer, Paint, VectorPath } from '../../types'
import { INK, lin, rad, rrect, rect, ell, shade, star as starPath, poly, circ, type Art } from '../art/kit'

type Rarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire'
type StatKey = 'ATK' | 'DEF' | 'VIT' | 'MAG'

interface CharacterCard {
  key: string
  name: string
  kind: string
  art: Art
  scene: (s: Stage) => VectorPath[]
  colors: [string, string]
  accent: string
  stats: [StatKey, number][]
  stars: number
  rarity: Rarity
  finish?: Finish
}

// ---- rarity colour language (no text: metal, gems, pips and foil only) ----------
// Commun → silver, Rare → blue steel, Épique → amethyst, Légendaire → gold foil.
interface RarityLook {
  hi: string
  lt: string
  md: string
  dk: string
  dd: string
  gem: string
  gems: boolean
  sideGems: boolean
  foil: number // holographic sheen strength (0 = none)
}

const RARITY: Record<Rarity, RarityLook> = {
  Commun: { hi: '#ffffff', lt: '#dfe5ec', md: '#9aa5b1', dk: '#5a6470', dd: '#2f353d', gem: '#cfd8e3', gems: false, sideGems: false, foil: 0 },
  Rare: { hi: '#f2fbff', lt: '#a6d9ff', md: '#3f8fd8', dk: '#1d4f8f', dd: '#0d2346', gem: '#4fb4ff', gems: true, sideGems: false, foil: 0 },
  Épique: { hi: '#fbefff', lt: '#ddb6ff', md: '#9d5cf0', dk: '#5a2aa8', dd: '#250d50', gem: '#d77bff', gems: true, sideGems: true, foil: 0.2 },
  Légendaire: { hi: '#fffbe0', lt: '#ffe48a', md: '#e8b23a', dk: '#9a6a0e', dd: '#4a2e02', gem: '#ff4d6d', gems: true, sideGems: true, foil: 0.36 },
}

const metal = (r: RarityLook, x0: number, y0: number, x1: number, y1: number): Paint =>
  lin(x0, y0, x1, y1, 0, r.md, 0.14, r.hi, 0.28, r.lt, 0.46, r.dk, 0.6, r.lt, 0.78, r.md, 0.9, r.hi, 1, r.dk)

const foil = (a: number): Paint =>
  lin(
    0, 0, 160, 101,
    0, 'rgba(255,255,255,0)',
    0.22, `rgba(255,120,210,${a})`,
    0.36, `rgba(120,220,255,${a})`,
    0.5, `rgba(255,255,170,${a})`,
    0.64, `rgba(170,255,200,${a})`,
    0.8, `rgba(255,140,220,${a})`,
    1, 'rgba(255,255,255,0)',
  )

function hexA(hex: string, a: number): string {
  const v = hex.replace('#', '')
  const [rr, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
  return `rgba(${rr},${g},${b},${a})`
}

// ---- layout (view box = whole card, 160 wide) ------------------------------------
const W = 160
const H = W / A
const CX = 57 // character centre line
const FY = 86 // plinth top
const BUST_W = 58
const BUST_H = (BUST_W * PORTRAIT_H) / PORTRAIT_W
const PL_RX = 31
const PL_H = 9
const PANEL = { x: 108, y: 9, w: 44, h: 83 }
const PCX = PANEL.x + PANEL.w / 2
const STAT_Y = [55, 68, 81]
const PIP_X = 124.5
const OUTER = rrect(0, 0, W, H, 8)
const INNER = rrect(3.2, 3.2, W - 6.4, H - 6.4, 5.2)

// Map a local ornament path (corner at origin, axes pointing inward) to a card corner.
function corner(d: string, sx: number, sy: number): string {
  const ox = sx > 0 ? 0 : W
  const oy = sy > 0 ? 0 : H
  return d.replace(/([MLQ])([^MLQZ]*)/g, (_m, c: string, args: string) => {
    const v = args.trim().split(/[\s,]+/).filter(Boolean).map(Number)
    return c + v.map((n, i) => Math.round((i % 2 === 0 ? ox + sx * n : oy + sy * n) * 100) / 100).join(' ')
  })
}

function statIcon(k: StatKey, x: number, y: number): string {
  if (k === 'ATK') {
    return (
      poly([x - 2.6, y + 2.6, x + 2.2, y - 2.2, x + 2.9, y - 2.9, x + 2.6, y - 1.6, x - 1.9, y + 3.3]) +
      poly([x - 3.4, y + 1.0, x - 1.0, y + 3.4, x - 0.4, y + 2.8, x - 2.8, y + 0.4])
    )
  }
  if (k === 'DEF') return `M${x} ${y - 3.2}L${x + 2.9} ${y - 2.1}Q${x + 2.9} ${y + 1.9} ${x} ${y + 3.4}Q${x - 2.9} ${y + 1.9} ${x - 2.9} ${y - 2.1}Z`
  if (k === 'VIT') return poly([x + 0.9, y - 3.4, x - 2.4, y + 0.5, x - 0.2, y + 0.5, x - 0.9, y + 3.4, x + 2.4, y - 0.6, x + 0.2, y - 0.6])
  return starPath(x, y, 3.4, 1.1, 4, 0)
}

// Faceted gem with bloom, used for the rarity crest and the plinth jewel.
function gem(x: number, y: number, r: number, c: string, bloom = 1): VectorPath[] {
  const oct = (rr: number) => {
    const p: number[] = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      p.push(x + rr * Math.cos(a), y + rr * Math.sin(a))
    }
    return p
  }
  const o = oct(r)
  const inn = oct(r * 0.52)
  let facets = ''
  for (let i = 0; i < 8; i++) facets += `M${o[i * 2].toFixed(2)} ${o[i * 2 + 1].toFixed(2)}L${inn[i * 2].toFixed(2)} ${inn[i * 2 + 1].toFixed(2)}`
  return [
    { d: circ(x, y, r * 3.2), fill: rad(x, y, r * 3.2, 0, hexA(c, 0.55 * bloom), 0.4, hexA(c, 0.18 * bloom), 1, hexA(c, 0)), blend: 'screen' },
    { d: poly(o), fill: lin(x - r, y - r, x + r, y + r, 0, shade(c, 0.6), 0.45, c, 1, shade(c, -0.6)), stroke: INK, sw: r * 0.16 },
    { d: poly(inn), fill: lin(x - r, y - r, x + r, y + r, 0, shade(c, 0.85), 1, shade(c, -0.15)) },
    { d: facets, stroke: 'rgba(255,255,255,0.35)', sw: r * 0.07 },
    { d: poly([x - r * 0.55, y - r * 0.2, x - r * 0.2, y - r * 0.6, x - r * 0.05, y - r * 0.45, x - r * 0.42, y - r * 0.05]), fill: 'rgba(255,255,255,0.85)' },
    { d: circ(x + r * 0.42, y + r * 0.38, r * 0.1), fill: 'rgba(255,255,255,0.8)' },
  ]
}

// Backdrop: scene, plinth with cast shadows, and the stat plaque.
function stageArt(c: CharacterCard, r: RarityLook): Art {
  const p: VectorPath[] = []
  const stage: Stage = { W, H, cx: CX, fy: FY }
  p.push(...c.scene(stage))
  // character back-light halo to separate the silhouette
  p.push({ d: circ(CX, 46, 46), fill: rad(CX, 46, 46, 0, hexA(c.accent, 0.28), 0.5, hexA(c.accent, 0.1), 1, hexA(c.accent, 0)), blend: 'screen' })
  // plinth: cast shadow on the floor (key light upper-left → falls lower-right)
  p.push({ d: ell(CX + 12, FY + PL_H + 1, PL_RX + 14, 5), fill: rad(CX + 12, FY + PL_H + 1, PL_RX + 14, 0, 'rgba(0,0,0,0.55)', 1, 'rgba(0,0,0,0)'), blend: 'multiply' })
  const stone0 = shade(c.colors[0], 0.25)
  const stone1 = shade(c.colors[1], -0.2)
  const body = `M${CX - PL_RX} ${FY}L${CX - PL_RX} ${FY + PL_H}A${PL_RX} 5.5 0 0 0 ${CX + PL_RX} ${FY + PL_H}L${CX + PL_RX} ${FY}Z`
  p.push({ d: body, fill: lin(CX - PL_RX, 0, CX + PL_RX, 0, 0, shade(stone0, 0.2), 0.3, stone0, 0.75, c.colors[1], 1, stone1), stroke: INK, sw: 0.9 })
  p.push({ d: `M${CX - PL_RX} ${FY + 2.4}A${PL_RX} 5.5 0 0 0 ${CX + PL_RX} ${FY + 2.4}`, stroke: INK, sw: 2.2 })
  p.push({ d: `M${CX - PL_RX} ${FY + 2.4}A${PL_RX} 5.5 0 0 0 ${CX + PL_RX} ${FY + 2.4}`, stroke: metal(r, CX - PL_RX, 0, CX + PL_RX, 0), sw: 1.2 })
  p.push({ d: `M${CX - PL_RX + 1} ${FY + PL_H - 0.4}A${PL_RX} 5.5 0 0 0 ${CX + PL_RX - 1} ${FY + PL_H - 0.4}`, stroke: 'rgba(0,0,0,0.35)', sw: 0.6 })
  // rim light on the plinth's right edge
  p.push({ d: `M${CX + PL_RX - 0.6} ${FY}V${FY + PL_H}`, stroke: hexA(c.accent, 0.6), sw: 0.8, blend: 'screen' })
  const top = ell(CX, FY, PL_RX, 5.5)
  p.push({ d: top, fill: lin(CX - PL_RX, FY - 5, CX + PL_RX, FY + 5, 0, shade(stone0, 0.45), 0.6, shade(stone0, 0.1), 1, c.colors[1]), stroke: INK, sw: 0.9 })
  p.push({ d: top, stroke: metal(r, CX - PL_RX, 0, CX + PL_RX, 0), sw: 0.45 })
  // contact shadow of the bust on the plinth top + ambient occlusion
  p.push({ d: ell(CX + 4, FY + 0.8, BUST_W * 0.5, 4), fill: rad(CX + 4, FY + 0.8, BUST_W * 0.5, 0, 'rgba(0,0,0,0.6)', 0.7, 'rgba(0,0,0,0.25)', 1, 'rgba(0,0,0,0)'), clip: top, blend: 'multiply' })
  p.push(...gem(CX, FY + 6.4, 1.9, r.gem, 0.6))
  // stat plaque (glass + rarity metal)
  const plq = rrect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 5)
  p.push({ d: rrect(PANEL.x + 1.2, PANEL.y + 1.6, PANEL.w, PANEL.h, 5), fill: 'rgba(0,0,0,0.35)', blend: 'multiply' })
  p.push({ d: plq, fill: lin(0, PANEL.y, 0, PANEL.y + PANEL.h, 0, 'rgba(12,14,30,0.8)', 1, 'rgba(6,8,16,0.92)') })
  p.push({ d: plq, fill: lin(PANEL.x, PANEL.y, PANEL.x + PANEL.w * 0.7, PANEL.y + PANEL.h * 0.5, 0, 'rgba(255,255,255,0.14)', 0.45, 'rgba(255,255,255,0.03)', 0.46, 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,0)'), blend: 'screen' })
  p.push({ d: plq, stroke: INK, sw: 1.8 }, { d: plq, stroke: metal(r, PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h), sw: 0.8 })
  // crest: rarity gem in a starburst setting
  const cy = 22.5
  p.push({ d: starPath(PCX, cy, 10.5, 6.5, 8, -90 + 22.5), fill: metal(r, PCX - 10, cy - 10, PCX + 10, cy + 10), stroke: INK, sw: 0.6 })
  p.push({ d: circ(PCX, cy, 7.4), fill: lin(0, cy - 7, 0, cy + 7, 0, r.dd, 1, shade(r.dd, -0.4)), stroke: INK, sw: 0.6 })
  p.push(...gem(PCX, cy, 5.6, r.gem))
  if (r.sideGems) {
    for (const s of [-1, 1]) {
      const wx = PCX + s * 13
      p.push({ d: poly([PCX + s * 8, cy - 2.4, wx + s * 4, cy - 4.4, wx, cy, wx + s * 4, cy + 4.4, PCX + s * 8, cy + 2.4]), fill: metal(r, wx - 4, cy - 4, wx + 4, cy + 4), stroke: INK, sw: 0.5 })
    }
  }
  // star pips
  let on = ''
  let off = ''
  for (let i = 0; i < 5; i++) {
    const s = starPath(PCX + (i - 2) * 7.6, 38.5, 3.2, 1.4)
    if (i < c.stars) on += s
    else off += s
  }
  if (on) {
    p.push({ d: on, fill: lin(0, 35, 0, 42, 0, '#fffbd0', 0.45, '#ffd23f', 1, '#e08a10'), stroke: INK, sw: 0.6 })
  }
  if (off) p.push({ d: off, fill: 'rgba(0,0,0,0.45)', stroke: 'rgba(255,255,255,0.25)', sw: 0.4 })
  p.push({ d: `M${PANEL.x + 5} 46H${PANEL.x + PANEL.w - 5}`, stroke: lin(PANEL.x, 0, PANEL.x + PANEL.w, 0, 0, hexA(r.lt, 0), 0.5, hexA(r.lt, 0.7), 1, hexA(r.lt, 0)), sw: 0.4 })
  // stat rows: medallion icon + 10 lit pips (value / 10)
  c.stats.forEach(([k, v], i) => {
    const y = STAT_Y[i]
    const mx = PANEL.x + 8
    p.push({ d: circ(mx, y, 5.2), fill: metal(r, mx - 5, y - 5, mx + 5, y + 5), stroke: INK, sw: 0.6 })
    p.push({ d: circ(mx, y, 4), fill: rad(mx - 1, y - 1, 5, 0, shade(c.colors[0], 0.1), 1, shade(c.colors[1], -0.3)) })
    p.push({ d: statIcon(k, mx, y), fill: lin(0, y - 3.4, 0, y + 3.4, 0, shade(c.accent, 0.6), 1, c.accent), stroke: INK, sw: 0.45 })
    const lit = Math.round(v / 10)
    let dOn = ''
    let dOff = ''
    for (let j = 0; j < 10; j++) {
      const px = PIP_X + j * 2.45
      const d = rrect(px, y - 2.8, 1.95, 5.6, 0.5)
      if (j < lit) dOn += d
      else dOff += d
    }
    if (dOn) {
      p.push({ d: dOn, fill: lin(0, y - 2.8, 0, y + 2.8, 0, shade(c.accent, 0.7), 0.45, c.accent, 1, shade(c.accent, -0.4)), stroke: 'rgba(0,0,0,0.6)', sw: 0.25 })
    }
    if (dOff) p.push({ d: dOff, fill: 'rgba(0,0,0,0.5)', stroke: 'rgba(255,255,255,0.12)', sw: 0.25 })
  })
  return { viewW: W, viewH: H, paths: p }
}

// Overlay on top of the bust: vignette, foil sheen, frame ring and corner bosses.
function frameArt(r: RarityLook): Art {
  const p: VectorPath[] = []
  p.push({ d: rect(0, 0, W, H), fill: rad(CX + 8, 44, 112, 0, '#ffffff', 0.55, '#ffffff', 1, '#4a4a66'), blend: 'multiply' })
  if (r.foil) {
    p.push({ d: poly([46, 0, 66, 0, 34, H, 14, H]) + poly([74, 0, 80, 0, 48, H, 42, H]), fill: `rgba(255,255,255,${(r.foil * 0.22).toFixed(3)})`, blend: 'screen' })
  }
  // inner bevel shadow just inside the ring
  p.push({ d: INNER, stroke: 'rgba(0,0,0,0.55)', sw: 3.4, clip: INNER, blend: 'multiply' })
  const ring = OUTER + INNER
  p.push({ d: ring, rule: 'evenodd', fill: metal(r, 0, 0, W, H) })
  if (r.foil) p.push({ d: ring, rule: 'evenodd', fill: foil(r.foil), blend: 'screen' })
  p.push({ d: INNER, stroke: INK, sw: 0.8 })
  p.push({ d: rrect(1.4, 1.4, W - 2.8, H - 2.8, 6.8), stroke: 'rgba(255,255,255,0.45)', sw: 0.35 })
  const armD = 'M9.6 4.1 Q17 3.5 25 4.6 Q17 7.4 10.2 8.4 Z M4.1 9.6 Q3.5 17 4.6 25 Q7.4 17 8.4 10.2 Z'
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
    p.push({ d: corner(armD, sx, sy), fill: metal(r, 0, 0, W, H), stroke: INK, sw: 0.55 })
    const gx = sx > 0 ? 6.9 : W - 6.9
    const gy = sy > 0 ? 6.9 : H - 6.9
    p.push({ d: circ(gx + 0.5, gy + 0.7, 4), fill: 'rgba(0,0,0,0.35)', blend: 'multiply' })
    p.push({ d: circ(gx, gy, 3.9), fill: lin(gx - 3.9, gy - 3.9, gx + 3.9, gy + 3.9, 0, r.hi, 0.4, r.md, 1, r.dd), stroke: INK, sw: 0.7 })
    p.push({ d: circ(gx, gy, 2.9), stroke: 'rgba(255,255,255,0.35)', sw: 0.3 })
    if (r.gems) {
      p.push({ d: poly([gx, gy - 2.3, gx + 2.3, gy, gx, gy + 2.3, gx - 2.3, gy]), fill: lin(gx - 2.3, gy - 2.3, gx + 2.3, gy + 2.3, 0, '#ffffff', 0.3, r.gem, 1, shade(r.gem, -0.55)), stroke: INK, sw: 0.45 })
      p.push({ d: circ(gx, gy, 6), fill: rad(gx, gy, 6, 0, hexA(r.gem, 0.4), 1, hexA(r.gem, 0)), blend: 'screen' })
    } else {
      p.push({ d: circ(gx, gy, 1.5), fill: lin(gx - 1.5, gy - 1.5, gx + 1.5, gy + 1.5, 0, '#ffffff', 1, '#59626d'), stroke: INK, sw: 0.4 })
    }
  }
  if (r.sideGems) {
    for (const x of [1.6, W - 1.6]) {
      const y = H / 2
      p.push({ d: poly([x, y - 4, x + 2, y, x, y + 4, x - 2, y]), fill: lin(x - 2, y - 4, x + 2, y + 4, 0, '#ffffff', 0.3, r.gem, 1, shade(r.gem, -0.55)), stroke: INK, sw: 0.4 })
    }
  }
  for (const x of [W / 2 - 34, W / 2 + 34]) {
    for (const y of [1.6, H - 1.6]) p.push({ d: circ(x, y, 0.9), fill: r.hi, stroke: INK, sw: 0.3 })
  }
  return { viewW: W, viewH: H, paths: p }
}

// Collectible trading-card layout without any text: a full-bleed lit scene, the
// character as a bust on a plinth, a glass plaque with stars and stat pips, and an
// ornate frame whose metal, gems and foil carry the rarity.
function characterCard(c: CharacterCard): Template {
  const r = RARITY[c.rarity]
  const layers: Layer[] = [
    backdrop(stageArt(c, r)),
    vec(c.art, CX / W, (FY + 1 - BUST_H / 2) / H, BUST_W / W),
    backdrop(frameArt(r)),
  ]
  return {
    key: c.key,
    name: c.name,
    category: 'Personnages',
    badge: c.rarity,
    background: bg({ kind: 'radial', color1: c.colors[0], color2: c.colors[1], finish: c.finish ?? 'gloss', glow: 0.2, grain: 0.06 }),
    layers,
  }
}

export const CHARACTER_TEMPLATES: Template[] = [
  characterCard({
    key: 'chr-chevalier',
    name: 'Sire Boulon',
    kind: 'CHEVALIER · ACIER',
    art: knight(),
    scene: knightScene,
    colors: ['#1e3a5f', '#0b1626'],
    accent: '#ffd166',
    stats: [['ATK', 82], ['DEF', 96], ['VIT', 41]],
    stars: 3,
    rarity: 'Rare',
  }),
  characterCard({
    key: 'chr-mage',
    name: 'Mage Zéphyr',
    kind: 'MAGE · COSMOS',
    art: wizard(),
    scene: wizardScene,
    colors: ['#3c1a78', '#12062b'],
    accent: '#c7a6ff',
    stats: [['MAG', 98], ['DEF', 38], ['VIT', 64]],
    stars: 4,
    rarity: 'Épique',
  }),
  characterCard({
    key: 'chr-ninja',
    name: 'Kagero',
    kind: 'NINJA · OMBRE',
    art: ninja(),
    scene: ninjaScene,
    colors: ['#2b2b33', '#0a0a0d'],
    accent: '#ff4d4d',
    stats: [['ATK', 88], ['DEF', 52], ['VIT', 99]],
    stars: 4,
    rarity: 'Épique',
  }),
  characterCard({
    key: 'chr-robot',
    name: 'R-0B1N',
    kind: 'ROBOT · ROUILLE',
    art: robot(),
    scene: robotScene,
    colors: ['#334155', '#0f172a'],
    accent: '#5ef0ff',
    stats: [['ATK', 70], ['DEF', 90], ['VIT', 30]],
    stars: 2,
    rarity: 'Commun',
  }),
  characterCard({
    key: 'chr-dragon',
    name: 'Aurum',
    kind: 'DRAGON · OR',
    art: dragon(),
    scene: dragonScene,
    colors: ['#6a240c', '#1c0603'],
    accent: '#ffd84d',
    stats: [['ATK', 99], ['DEF', 88], ['VIT', 77]],
    stars: 5,
    rarity: 'Légendaire',
    finish: 'gold',
  }),
  characterCard({
    key: 'chr-pirate',
    name: 'Cap. Brume',
    kind: 'SPECTRE · MER',
    art: pirateGhost(),
    scene: ghostScene,
    colors: ['#0f3b4a', '#041318'],
    accent: '#8fe3ff',
    stats: [['ATK', 66], ['DEF', 48], ['VIT', 85]],
    stars: 3,
    rarity: 'Rare',
  }),
]
