import {
  CARD_ASPECT,
  uid,
  type Background,
  type CardProject,
  type DrawStroke,
  type Finish,
  type Layer,
} from '../types'
import { INK, star as starPath, type Art } from './art/kit'
import {
  checks,
  donut,
  flask,
  hauntedNight,
  lasagna,
  lazyCat,
  mysteryVan,
  portal,
  seaBackdrop,
  skyClouds,
  sponge,
  starfield,
} from './art/cartoons'
import {
  brickGround,
  checkerHills,
  crewmate,
  ghost,
  glouton,
  goldRings,
  grassBlock,
  hedgehog,
  hellfire,
  maze,
  pickaxe,
  pixelDemon,
  pixelMushroom,
  questionBlock,
} from './art/games'
import { dragon, knight, ninja, pirateGhost, robot, wizard } from './art/characters'
import {
  actionLines,
  comicsBackdrop,
  comicsBurst,
  greatWave,
  heroShield,
  idPattern,
  koi,
  outrun,
  palm,
  ringedPlanet,
  ripples,
  rocket,
  speechBubble,
  swallow,
  tattooHeart,
  tattooStars,
} from './art/scenes'

export interface Template {
  key: string
  name: string
  category: string
  background: Background
  layers: Layer[]
  badge?: string
}

// ---- small layer builders ---------------------------------------------------
let seq = 0
function lid(p: string) {
  return `${p}-${seq++}`
}

function text(
  t: string,
  opts: Partial<Layer> & { fontFamily?: string } = {},
): Layer {
  return {
    id: lid('t'),
    type: 'text',
    name: `Texte « ${t.slice(0, 12)} »`,
    x: 0.5,
    y: 0.8,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: t,
    fontFamily: 'Inter',
    fontSize: 0.1,
    color: '#F5F5F7',
    align: 'center',
    letterSpacing: 0,
    weight: 700,
    italic: false,
    shadow: false,
    ...(opts as object),
  } as Layer
}

function shape(opts: Partial<Layer>): Layer {
  return {
    id: lid('s'),
    type: 'shape',
    name: 'Forme',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    shape: 'roundRect',
    width: 0.3,
    height: 0.3,
    fill: '#D9B45B',
    stroke: '#00000000',
    strokeWidth: 0,
    cornerRadius: 0.04,
    ...(opts as object),
  } as Layer
}

function bg(b: Partial<Background>): Background {
  return {
    kind: 'linear',
    color1: '#171923',
    color2: '#08090D',
    angle: 135,
    finish: 'matte',
    grain: 0,
    glow: 0,
    ...b,
  }
}

// ---- vector motif builders (drawn as "draw" layers) -------------------------
// Coordinates are normalized to the card; y radii are multiplied by the aspect
// ratio so circles stay round on a card-shaped canvas.
const A = CARD_ASPECT

function motif(strokes: DrawStroke[], opacity = 1): Layer {
  return {
    id: lid('d'),
    type: 'draw',
    name: 'Motif',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    opacity,
    locked: false,
    visible: true,
    strokes,
  } as Layer
}

function seg(x1: number, y1: number, x2: number, y2: number, color: string, width: number): DrawStroke {
  return { color, width, points: [x1, y1, x2, y2] }
}

function wave(y: number, amp: number, cycles: number, color: string, width: number, phase = 0): DrawStroke {
  const points: number[] = []
  const steps = 90
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push(-0.02 + 1.04 * t, y + amp * Math.sin((t * cycles + phase) * Math.PI * 2))
  }
  return { color, width, points }
}

function ring(cx: number, cy: number, r: number, color: string, width: number): DrawStroke {
  const points: number[] = []
  const steps = 96
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    points.push(cx + r * Math.cos(a), cy + r * A * Math.sin(a))
  }
  return { color, width, points }
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number, color: string, width: number): DrawStroke {
  const points: number[] = []
  const steps = 28
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    points.push(cx + r * Math.cos(a), cy + r * A * Math.sin(a))
  }
  return { color, width, points }
}

// Spirograph-like engraving, as found on premium metal cards.
function guilloche(color: string, width: number, n: number, cx = 0.5, cy = 0.5, r = 0.3, off = 0.09): DrawStroke[] {
  const out: DrawStroke[] = []
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2
    out.push(ring(cx + off * Math.cos(t), cy + off * A * Math.sin(t), r, color, width))
  }
  return out
}

// Fine horizontal hairlines that read as brushed metal.
function brushed(color: string, count: number): DrawStroke[] {
  const out: DrawStroke[] = []
  for (let i = 0; i < count; i++) {
    const y = (i + 0.5) / count
    const jitter = ((i * 37) % 11) / 400
    out.push(seg(-0.02, y + jitter, 1.02, y - jitter, color, 0.0012))
  }
  return out
}

// EMV-style contact chip: a rounded plate plus engraved contact lines.
function chip(x: number, y: number, plate: string, lines = 'rgba(0,0,0,0.32)'): Layer[] {
  const hw = 0.055
  const hh = 0.0675
  const w = 0.004
  return [
    shape({ shape: 'roundRect', x, y, width: hw * 2, height: hh * 2, fill: plate, cornerRadius: 0.012 }),
    motif([
      seg(x - 0.018, y - hh, x - 0.018, y + hh, lines, w),
      seg(x + 0.018, y - hh, x + 0.018, y + hh, lines, w),
      seg(x - hw, y - 0.022, x - 0.018, y - 0.022, lines, w),
      seg(x - hw, y + 0.022, x - 0.018, y + 0.022, lines, w),
      seg(x + 0.018, y - 0.022, x + hw, y - 0.022, lines, w),
      seg(x + 0.018, y + 0.022, x + hw, y + 0.022, lines, w),
    ]),
  ]
}

// Contactless symbol: four concentric arcs.
function contactless(x: number, y: number, color: string): Layer {
  const a = (50 * Math.PI) / 180
  return motif([0.018, 0.032, 0.046, 0.06].map((r) => arc(x - 0.03, y, r, -a, a, color, 0.0055)))
}

// ---- illustration builders ---------------------------------------------------
interface VecOpts {
  rotation?: number
  sketch?: boolean
  opacity?: number
  locked?: boolean
}

// A vector illustration centred at (x, y), `width` as a fraction of the card.
function vec(art: Art, x: number, y: number, width: number, o: VecOpts = {}): Layer {
  return {
    id: lid('v'),
    type: 'vector',
    name: 'Illustration',
    x,
    y,
    scale: 1,
    rotation: o.rotation ?? 0,
    opacity: o.opacity ?? 1,
    locked: o.locked ?? false,
    visible: true,
    viewW: art.viewW,
    viewH: art.viewH,
    width,
    paths: art.paths,
    sketch: o.sketch ?? true,
  } as Layer
}

// Full-card decor, locked so taps go to the characters drawn on top.
function backdrop(art: Art, o: VecOpts = {}): Layer {
  return vec(art, 0.5, 0.5, 1, { sketch: false, locked: true, ...o })
}

interface CharacterCard {
  key: string
  name: string
  kind: string
  art: Art
  colors: [string, string]
  accent: string
  stats: [string, number][]
  stars: number
  rarity: string
  finish?: Finish
}

// Collectible trading-card layout: framed portrait, name, type, stat bars, stars.
function characterCard(c: CharacterCard): Template {
  const starsArt: Art = {
    viewW: 100,
    viewH: 22,
    paths: [
      {
        d: Array.from({ length: c.stars }, (_, i) => starPath(90 - i * 20, 11, 9, 4)).join(''),
        fill: c.accent,
        stroke: INK,
        sw: 1.6,
      },
    ],
  }
  const layers: Layer[] = [
    shape({ shape: 'roundRect', x: 0.5, y: 0.5, width: 0.95, height: 0.91, fill: 'rgba(0,0,0,0)', stroke: c.accent, strokeWidth: 0.006, cornerRadius: 0.05 }),
    shape({ shape: 'roundRect', x: 0.27, y: 0.52, width: 0.4, height: 0.76, fill: 'rgba(255,255,255,0.08)', stroke: c.accent, strokeWidth: 0.004, cornerRadius: 0.03 }),
    shape({ shape: 'circle', x: 0.27, y: 0.5, width: 0.32, height: 0.32 * A, fill: c.accent, opacity: 0.22 }),
    vec(c.art, 0.27, 0.53, 0.29),
    vec(starsArt, 0.82, 0.875, 0.17, { sketch: false }),
    text(c.name, { x: 0.52, y: 0.21, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.09, weight: 400, color: '#ffffff', shadow: true }),
    text(c.kind, { x: 0.52, y: 0.33, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.042, weight: 700, letterSpacing: 0.004, color: c.accent }),
  ]
  c.stats.forEach(([label, v], i) => {
    const y = 0.5 + i * 0.13
    layers.push(
      text(`${label} ${v}`, { x: 0.52, y, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.042, weight: 700, color: '#ffffff' }),
      shape({ shape: 'roundRect', x: 0.795, y, width: 0.25, height: 0.045, fill: 'rgba(255,255,255,0.16)', cornerRadius: 0.01 }),
      shape({ shape: 'roundRect', x: 0.67 + (0.25 * v) / 200, y, width: (0.25 * v) / 100, height: 0.045, fill: c.accent, cornerRadius: 0.01 }),
    )
  })
  return {
    key: c.key,
    name: c.name,
    category: 'Personnages',
    badge: c.rarity,
    background: bg({ kind: 'radial', color1: c.colors[0], color2: c.colors[1], finish: c.finish ?? 'gloss', glow: 0.35, grain: 0.08 }),
    layers,
  }
}

// ---- 28 original templates --------------------------------------------------
export const TEMPLATES: Template[] = [
  {
    key: 'black-onyx',
    name: 'Onyx',
    category: 'Black Edition',
    background: bg({ kind: 'radial', color1: '#23262E', color2: '#050506', finish: 'black', glow: 0.5 }),
    layers: [text('ONYX', { y: 0.78, letterSpacing: 0.04, weight: 800, color: '#F5F5F7', fontSize: 0.11 })],
  },
  {
    key: 'black-eclipse',
    name: 'Eclipse',
    category: 'Black Edition',
    background: bg({ kind: 'linear', color1: '#0B0C10', color2: '#1A1C22', finish: 'gloss', angle: 120 }),
    layers: [
      shape({ shape: 'circle', x: 0.72, y: 0.3, width: 0.5, height: 0.8, fill: '#D9B45B', opacity: 0.12 }),
      text('ECLIPSE', { y: 0.82, align: 'left', x: 0.1, weight: 700, fontFamily: 'Oswald', fontSize: 0.1 }),
    ],
  },
  {
    key: 'gold-imperial',
    name: 'Imperial Gold',
    category: 'Luxury Gold',
    background: bg({ kind: 'linear', color1: '#2a2109', color2: '#0b0a05', finish: 'gold', angle: 140, glow: 0.7 }),
    layers: [text('IMPERIAL', { y: 0.8, color: '#F3E4B0', fontFamily: 'Playfair Display', weight: 700, fontSize: 0.1, letterSpacing: 0.02 })],
  },
  {
    key: 'gold-royale',
    name: 'Royale',
    category: 'Luxury Gold',
    background: bg({ kind: 'radial', color1: '#3a2c0d', color2: '#0a0803', finish: 'gold', glow: 0.6 }),
    layers: [
      shape({ shape: 'roundRect', x: 0.5, y: 0.5, width: 0.9, height: 0.82, fill: '#00000000', stroke: '#D9B45B', strokeWidth: 0.006, cornerRadius: 0.05 }),
      text('ROYALE', { y: 0.5, fontFamily: 'DM Serif Display', color: '#F3E4B0', fontSize: 0.13, weight: 400 }),
    ],
  },
  {
    key: 'silver-titan',
    name: 'Titanium',
    category: 'Silver Titanium',
    background: bg({ kind: 'linear', color1: '#2b2e33', color2: '#0f1113', finish: 'silver', angle: 120, glow: 0.6 }),
    layers: [text('TITANIUM', { y: 0.82, color: '#E8EBEF', fontFamily: 'Space Grotesk', letterSpacing: 0.03, fontSize: 0.085, weight: 500 })],
  },
  {
    key: 'silver-frost',
    name: 'Frost',
    category: 'Silver Titanium',
    background: bg({ kind: 'linear', color1: '#3b4047', color2: '#1a1d21', finish: 'silver', angle: 60 }),
    layers: [
      shape({ shape: 'line', x: 0.5, y: 0.68, width: 0.8, height: 0.004, fill: '#BFC4CC' }),
      text('FROST', { y: 0.58, color: '#F5F5F7', fontFamily: 'Oswald', fontSize: 0.1 }),
    ],
  },
  {
    key: 'carbon-apex',
    name: 'Apex Carbon',
    category: 'Carbon Fiber',
    background: bg({ finish: 'carbon', color1: '#15161a', color2: '#0a0b0d' }),
    layers: [text('APEX', { y: 0.82, x: 0.12, align: 'left', color: '#D9B45B', fontFamily: 'Oswald', fontSize: 0.1, weight: 700 })],
  },
  {
    key: 'carbon-stealth',
    name: 'Stealth',
    category: 'Carbon Fiber',
    background: bg({ finish: 'carbon', color1: '#121316', color2: '#060709' }),
    layers: [
      shape({ shape: 'triangle', x: 0.82, y: 0.78, width: 0.22, height: 0.22, fill: '#8B7CFF', opacity: 0.8 }),
      text('STEALTH', { y: 0.2, x: 0.12, align: 'left', color: '#F5F5F7', fontFamily: 'Space Grotesk', fontSize: 0.07, letterSpacing: 0.04 }),
    ],
  },
  {
    key: 'minimal-pure',
    name: 'Pure',
    category: 'Minimalist',
    background: bg({ kind: 'solid', color1: '#0E0F13', finish: 'matte' }),
    layers: [shape({ shape: 'circle', x: 0.5, y: 0.42, width: 0.16, height: 0.26, fill: '#D9B45B' }), text('PURE', { y: 0.72, color: '#F5F5F7', fontSize: 0.075, letterSpacing: 0.06, weight: 500 })],
  },
  {
    key: 'minimal-line',
    name: 'Ligne',
    category: 'Minimalist',
    background: bg({ kind: 'solid', color1: '#F5F5F7', finish: 'matte' }),
    layers: [
      shape({ shape: 'line', x: 0.5, y: 0.5, width: 0.7, height: 0.004, fill: '#08090D' }),
      text('ligne', { y: 0.64, color: '#08090D', fontFamily: 'Playfair Display', italic: true, fontSize: 0.09, weight: 500 }),
    ],
  },
  {
    key: 'cyber-grid',
    name: 'Grid Runner',
    category: 'Cyberpunk',
    background: bg({ kind: 'linear', color1: '#1a0b2e', color2: '#05010f', angle: 160, glow: 0.4 }),
    layers: [
      shape({ shape: 'rect', x: 0.5, y: 0.5, width: 1, height: 0.02, fill: '#8B7CFF', opacity: 0.4 }),
      text('RUNNER_01', { y: 0.84, x: 0.1, align: 'left', color: '#8B7CFF', fontFamily: 'Space Grotesk', fontSize: 0.075, letterSpacing: 0.02 }),
    ],
  },
  {
    key: 'cyber-glitch',
    name: 'Glitch',
    category: 'Cyberpunk',
    background: bg({ kind: 'linear', color1: '#2a0845', color2: '#0a0220', angle: 45, glow: 0.5 }),
    layers: [text('GLITCH', { y: 0.5, color: '#F5F5F7', fontFamily: 'Oswald', fontSize: 0.16, weight: 700, letterSpacing: 0.01 })],
  },
  {
    key: 'neon-pulse',
    name: 'Pulse',
    category: 'Neon',
    background: bg({ kind: 'radial', color1: '#15052a', color2: '#05010d', glow: 0.3 }),
    layers: [
      shape({ shape: 'roundRect', x: 0.5, y: 0.5, width: 0.82, height: 0.7, fill: '#00000000', stroke: '#8B7CFF', strokeWidth: 0.01, cornerRadius: 0.06 }),
      text('PULSE', { y: 0.5, color: '#C9B8FF', fontFamily: 'Space Grotesk', fontSize: 0.12, weight: 700, shadow: true }),
    ],
  },
  {
    key: 'neon-miami',
    name: 'Miami',
    category: 'Neon',
    background: bg({ kind: 'linear', color1: '#ff2d95', color2: '#2d1b69', angle: 135 }),
    layers: [text('MIAMI', { y: 0.78, color: '#F5F5F7', fontFamily: 'Oswald', fontSize: 0.13, weight: 700, italic: true, shadow: true })],
  },
  {
    key: 'abstract-flux',
    name: 'Flux',
    category: 'Abstract',
    background: bg({ kind: 'linear', color1: '#1f2937', color2: '#0b1220', angle: 110 }),
    layers: [
      shape({ shape: 'circle', x: 0.25, y: 0.3, width: 0.4, height: 0.65, fill: '#8B7CFF', opacity: 0.5 }),
      shape({ shape: 'circle', x: 0.72, y: 0.7, width: 0.45, height: 0.72, fill: '#D9B45B', opacity: 0.4 }),
    ],
  },
  {
    key: 'abstract-wave',
    name: 'Wave',
    category: 'Abstract',
    background: bg({ kind: 'radial', color1: '#0d3b4f', color2: '#04131a' }),
    layers: [
      shape({ shape: 'circle', x: 0.5, y: 1.05, width: 1.4, height: 1.1, fill: '#1EA7C4', opacity: 0.5 }),
      text('WAVE', { y: 0.28, color: '#CFF4FF', fontFamily: 'Space Grotesk', fontSize: 0.1, letterSpacing: 0.05 }),
    ],
  },
  {
    key: 'marble-noir',
    name: 'Marbre Noir',
    category: 'Marble',
    background: bg({ kind: 'radial', color1: '#2a2d35', color2: '#0a0b0e', grain: 0.4, finish: 'gloss' }),
    layers: [
      shape({ shape: 'line', x: 0.4, y: 0.4, width: 0.7, height: 0.002, fill: '#BFC4CC', rotation: 28, opacity: 0.5 }),
      shape({ shape: 'line', x: 0.6, y: 0.6, width: 0.5, height: 0.002, fill: '#D9B45B', rotation: 20, opacity: 0.6 }),
      text('MARBRE', { y: 0.85, color: '#F5F5F7', fontFamily: 'Playfair Display', fontSize: 0.075, letterSpacing: 0.08 }),
    ],
  },
  {
    key: 'marble-blanc',
    name: 'Marbre Blanc',
    category: 'Marble',
    background: bg({ kind: 'radial', color1: '#FFFFFF', color2: '#D7D9DE', grain: 0.25 }),
    layers: [
      shape({ shape: 'line', x: 0.45, y: 0.45, width: 0.6, height: 0.003, fill: '#9aa0a8', rotation: 32, opacity: 0.6 }),
      text('BLANC', { y: 0.82, color: '#1a1c22', fontFamily: 'DM Serif Display', fontSize: 0.09 }),
    ],
  },
  {
    key: 'nature-forest',
    name: 'Forêt',
    category: 'Nature',
    background: bg({ kind: 'linear', color1: '#14361f', color2: '#05140b', angle: 150 }),
    layers: [text('FORÊT', { y: 0.82, color: '#CFE8D6', fontFamily: 'Playfair Display', fontSize: 0.09, italic: true })],
  },
  {
    key: 'nature-sunset',
    name: 'Coucher',
    category: 'Nature',
    background: bg({ kind: 'linear', color1: '#ff7e5f', color2: '#4a1942', angle: 90 }),
    layers: [shape({ shape: 'circle', x: 0.5, y: 0.6, width: 0.3, height: 0.48, fill: '#FFD79A', opacity: 0.9 }), text('SUNSET', { y: 0.86, color: '#2a0a1f', fontFamily: 'Oswald', fontSize: 0.07, letterSpacing: 0.05 })],
  },
  {
    key: 'gaming-arena',
    name: 'Arena',
    category: 'Gaming',
    background: bg({ kind: 'linear', color1: '#0f172a', color2: '#020617', angle: 135, glow: 0.4 }),
    layers: [
      shape({ shape: 'triangle', x: 0.5, y: 0.45, width: 0.3, height: 0.3, fill: '#22d3ee', opacity: 0.9 }),
      text('ARENA', { y: 0.82, color: '#22d3ee', fontFamily: 'Oswald', fontSize: 0.1, weight: 700, letterSpacing: 0.04 }),
    ],
  },
  {
    key: 'gaming-pixel',
    name: 'Pixel',
    category: 'Gaming',
    background: bg({ kind: 'solid', color1: '#101820', finish: 'matte' }),
    layers: [
      shape({ shape: 'rect', x: 0.3, y: 0.4, width: 0.08, height: 0.13, fill: '#39FF14' }),
      shape({ shape: 'rect', x: 0.4, y: 0.5, width: 0.08, height: 0.13, fill: '#39FF14', opacity: 0.6 }),
      text('PIXEL', { y: 0.82, color: '#39FF14', fontFamily: 'Space Grotesk', fontSize: 0.09, letterSpacing: 0.05 }),
    ],
  },
  {
    key: 'anime-sakura',
    name: 'Sakura',
    category: 'Anime',
    background: bg({ kind: 'linear', color1: '#ffd9e8', color2: '#ff9ec4', angle: 120 }),
    layers: [
      shape({ shape: 'circle', x: 0.78, y: 0.25, width: 0.14, height: 0.22, fill: '#ffffff', opacity: 0.7 }),
      text('さくら', { y: 0.8, color: '#7a1d44', fontFamily: 'Playfair Display', fontSize: 0.12 }),
    ],
  },
  {
    key: 'manga-ink',
    name: 'Encre',
    category: 'Manga',
    background: bg({ kind: 'solid', color1: '#F5F5F7', finish: 'matte' }),
    layers: [
      shape({ shape: 'triangle', x: 0.5, y: 0.5, width: 1.5, height: 1, fill: '#08090D', opacity: 1, rotation: 12 }),
      text('ACTION', { y: 0.3, color: '#F5F5F7', fontFamily: 'Oswald', fontSize: 0.11, weight: 700, italic: true }),
    ],
  },
  {
    key: 'street-tag',
    name: 'Tag',
    category: 'Streetwear',
    background: bg({ kind: 'linear', color1: '#1c1c1c', color2: '#000000', angle: 90 }),
    layers: [
      shape({ shape: 'rect', x: 0.5, y: 0.55, width: 0.9, height: 0.16, fill: '#FF5A00', rotation: -6 }),
      text('STREET', { y: 0.55, color: '#08090D', fontFamily: 'Oswald', fontSize: 0.11, weight: 700, rotation: -6 }),
    ],
  },
  {
    key: 'vintage-retro',
    name: 'Retro 70',
    category: 'Vintage',
    background: bg({ kind: 'linear', color1: '#e8a23d', color2: '#8c3b1b', angle: 160, grain: 0.3 }),
    layers: [
      shape({ shape: 'line', x: 0.5, y: 0.7, width: 0.8, height: 0.01, fill: '#2a1206' }),
      text('RETRO', { y: 0.6, color: '#2a1206', fontFamily: 'DM Serif Display', fontSize: 0.12 }),
    ],
  },
  {
    key: 'glass-aqua',
    name: 'Aqua Glass',
    category: 'Glass',
    background: bg({ kind: 'linear', color1: '#1b4a5a', color2: '#0a1f29', finish: 'glass', glow: 0.5 }),
    layers: [text('AQUA', { y: 0.82, color: '#DFF6FF', fontFamily: 'Space Grotesk', fontSize: 0.1, weight: 500, letterSpacing: 0.04 })],
  },
  {
    key: 'gradient-aurora',
    name: 'Aurora',
    category: 'Gradient',
    background: bg({ kind: 'linear', color1: '#8B7CFF', color2: '#1EA7C4', angle: 135, glow: 0.3 }),
    layers: [text('AURORA', { y: 0.82, color: '#F5F5F7', fontFamily: 'Space Grotesk', fontSize: 0.1, weight: 700 })],
  },
  {
    key: 'geo-prism',
    name: 'Prism',
    category: 'Geometric',
    background: bg({ kind: 'solid', color1: '#0b0f1a', finish: 'matte' }),
    layers: [
      shape({ shape: 'triangle', x: 0.35, y: 0.5, width: 0.4, height: 0.6, fill: '#8B7CFF', opacity: 0.8 }),
      shape({ shape: 'triangle', x: 0.6, y: 0.55, width: 0.4, height: 0.6, fill: '#D9B45B', opacity: 0.7, rotation: 180 }),
      text('PRISM', { y: 0.88, color: '#F5F5F7', fontSize: 0.06, letterSpacing: 0.06 }),
    ],
  },
  {
    key: 'futur-nexus',
    name: 'Nexus',
    category: 'Futuristic',
    background: bg({ kind: 'radial', color1: '#102a43', color2: '#020913', glow: 0.5, finish: 'gloss' }),
    layers: [
      shape({ shape: 'circle', x: 0.5, y: 0.45, width: 0.5, height: 0.8, fill: '#00000000', stroke: '#38bdf8', strokeWidth: 0.004 }),
      shape({ shape: 'circle', x: 0.5, y: 0.45, width: 0.3, height: 0.48, fill: '#00000000', stroke: '#38bdf8', strokeWidth: 0.003, opacity: 0.6 }),
      text('NEXUS', { y: 0.86, color: '#9fe3ff', fontFamily: 'Space Grotesk', fontSize: 0.07, letterSpacing: 0.06 }),
    ],
  },

  // ---- Collection Signature (inspired by the skin styles shared around AirCard;
  //      original artwork — no third-party logos, brands or real card data) ----
  {
    key: 'sig-obsidian',
    name: 'Obsidian Metal',
    category: 'Black Edition',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#2a2c31', color2: '#050506', finish: 'black', glow: 0.55, grain: 0.15 }),
    layers: [
      motif(guilloche('rgba(255,255,255,0.07)', 0.0015, 18)),
      ...chip(0.17, 0.45, '#c8ccd2'),
      contactless(0.87, 0.45, 'rgba(255,255,255,0.6)'),
      text('VOTRE NOM', { x: 0.08, y: 0.7, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.055, letterSpacing: 0.008, weight: 500, color: '#cfd2d7' }),
      text('OBSIDIAN', { x: 0.08, y: 0.84, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.07, letterSpacing: 0.015, weight: 500, color: '#e3e5e8' }),
    ],
  },
  {
    key: 'sig-noir-absolu',
    name: 'Noir Absolu',
    category: 'Black Edition',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#0b0b0d', finish: 'matte', grain: 0.25 }),
    layers: [
      motif(Array.from({ length: 30 }, (_, i) => seg(-0.6 + i * 0.06, 1.05, 0.06 + i * 0.06, -0.05, 'rgba(255,255,255,0.045)', 0.002))),
      ...chip(0.17, 0.42, '#9aa0a8'),
      text('NOIR', { y: 0.8, fontFamily: 'DM Serif Display', fontSize: 0.09, letterSpacing: 0.03, weight: 400, color: '#BFC4CC' }),
    ],
  },
  {
    key: 'sig-galet',
    name: 'Galet',
    category: 'Minimalist',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#f4f5f7', color2: '#d8dade', finish: 'matte' }),
    layers: [
      shape({ shape: 'circle', x: 0.5, y: 0.45, width: 0.12, height: 0.12 * A, fill: '#2b2d31' }),
      motif([ring(0.5, 0.45, 0.095, 'rgba(43,45,49,0.35)', 0.003)]),
      text('galet', { y: 0.84, fontSize: 0.045, letterSpacing: 0.015, weight: 500, color: '#6b6f76' }),
    ],
  },
  {
    key: 'sig-blanc-pur',
    name: 'Blanc Pur',
    category: 'Minimalist',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#ffffff', color2: '#eceef2', angle: 120, finish: 'gloss' }),
    layers: [
      ...chip(0.17, 0.42, '#dfe1e5', 'rgba(0,0,0,0.18)'),
      shape({ shape: 'line', x: 0.5, y: 0.78, width: 0.12, height: 0.004, fill: '#111216' }),
      text('PUR', { y: 0.86, fontSize: 0.04, letterSpacing: 0.03, weight: 600, color: '#111216' }),
    ],
  },
  {
    key: 'sig-carton',
    name: 'Carton Officiel',
    category: 'Vintage',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#c9a46a', finish: 'matte', grain: 0.55 }),
    layers: [
      motif(Array.from({ length: 15 }, (_, i) => wave(i / 14, 0.006, 18, 'rgba(90,60,20,0.16)', 0.003, i * 0.13))),
      shape({ shape: 'rect', x: 0.2, y: 0.12, width: 0.3, height: 0.12, fill: 'rgba(235,225,195,0.78)', rotation: -8 }),
      motif([
        { color: '#2a1d0e', width: 0.006, points: [0.145, 0.4125, 0.255, 0.4125, 0.255, 0.5475, 0.145, 0.5475, 0.145, 0.4125] },
        seg(0.182, 0.4125, 0.182, 0.5475, '#2a1d0e', 0.005),
        seg(0.218, 0.4125, 0.218, 0.5475, '#2a1d0e', 0.005),
        seg(0.145, 0.48, 0.182, 0.48, '#2a1d0e', 0.005),
        seg(0.218, 0.48, 0.255, 0.48, '#2a1d0e', 0.005),
      ]),
      text('CARTE OFFICIELLE', { x: 0.08, y: 0.76, align: 'left', fontFamily: 'Courier New', fontSize: 0.07, weight: 700, color: '#2a1d0e', rotation: -2 }),
      text('(en carton)', { x: 0.08, y: 0.88, align: 'left', fontFamily: 'Playfair Display', italic: true, fontSize: 0.05, weight: 500, color: '#3b2a14' }),
    ],
  },
  {
    key: 'sig-or-grave',
    name: 'Or Gravé',
    category: 'Luxury Gold',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#3a2c0d', color2: '#120e04', angle: 135, finish: 'gold', glow: 0.65 }),
    layers: [
      motif(guilloche('rgba(255,236,180,0.18)', 0.0015, 22)),
      ...chip(0.17, 0.45, '#f1d58b'),
      text('GOLD', { x: 0.92, y: 0.2, align: 'right', fontFamily: 'DM Serif Display', fontSize: 0.09, letterSpacing: 0.02, weight: 400, color: '#fbecc1' }),
      text('VOTRE NOM', { x: 0.08, y: 0.84, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.05, letterSpacing: 0.012, weight: 500, color: '#f3e4b0' }),
    ],
  },
  {
    key: 'sig-or-rose',
    name: 'Or Rose',
    category: 'Luxury Gold',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#f2c4b3', color2: '#9c5b4f', angle: 125, finish: 'gloss', glow: 0.5, grain: 0.1 }),
    layers: [
      motif([0.3, 0.42, 0.54].map((y, i) => wave(y, 0.03, 1.4, 'rgba(255,255,255,0.22)', 0.002, i * 0.2))),
      ...chip(0.17, 0.45, '#f6d7c9', 'rgba(120,60,50,0.3)'),
      text('ROSE', { y: 0.8, fontFamily: 'Playfair Display', italic: true, fontSize: 0.085, weight: 500, color: '#fff5f0' }),
    ],
  },
  {
    key: 'sig-platine',
    name: 'Platine',
    category: 'Silver Titanium',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#dfe2e6', color2: '#8c939b', angle: 110, finish: 'silver', glow: 0.6 }),
    layers: [
      motif(brushed('rgba(255,255,255,0.14)', 60)),
      ...chip(0.17, 0.45, '#e9ebee', 'rgba(0,0,0,0.25)'),
      contactless(0.87, 0.45, 'rgba(30,32,36,0.55)'),
      text('PLATINE', { x: 0.08, y: 0.84, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.06, letterSpacing: 0.02, weight: 700, color: '#1d2025' }),
    ],
  },
  {
    key: 'sig-holo',
    name: 'Holographique',
    category: 'Glass',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#ff9ad5', color2: '#7ee7ff', angle: 120, finish: 'glass', glow: 0.8 }),
    layers: [
      shape({ shape: 'circle', x: 0.25, y: 0.3, width: 0.45, height: 0.45 * A, fill: '#8B7CFF', opacity: 0.35 }),
      shape({ shape: 'circle', x: 0.8, y: 0.75, width: 0.4, height: 0.4 * A, fill: '#5ef0ff', opacity: 0.3 }),
      motif([0.35, 0.5, 0.65].map((y, i) => wave(y, 0.04, 1.2, 'rgba(255,255,255,0.35)', 0.003, i * 0.25))),
      text('HOLO', { y: 0.8, fontFamily: 'Space Grotesk', fontSize: 0.1, weight: 700, color: '#ffffff', shadow: true }),
    ],
  },
  {
    key: 'sig-transit',
    name: 'Transit',
    category: 'Futuristic',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#0f5b4f', color2: '#0a2f3a', angle: 135 }),
    layers: [
      motif([
        seg(0.08, 0.36, 0.92, 0.36, '#ffcc33', 0.012),
        { color: '#4fd1c5', width: 0.012, points: [0.08, 0.6, 0.38, 0.6, 0.52, 0.48, 0.92, 0.48] },
      ]),
      ...[
        [0.2, 0.36],
        [0.5, 0.36],
        [0.8, 0.36],
        [0.38, 0.6],
        [0.7, 0.48],
      ].map(([x, y]) =>
        shape({ shape: 'circle', x, y, width: 0.026, height: 0.026 * A, fill: '#ffffff', stroke: '#0a2f3a', strokeWidth: 0.004 }),
      ),
      contactless(0.9, 0.17, 'rgba(255,255,255,0.7)'),
      text('TRANSIT', { x: 0.08, y: 0.83, align: 'left', fontFamily: 'Oswald', fontSize: 0.08, letterSpacing: 0.02, weight: 600, color: '#e9fffb' }),
    ],
  },
  {
    key: 'sig-marbre-or',
    name: 'Marbre Or',
    category: 'Marble',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#f7f5f0', color2: '#d8d3c8', finish: 'gloss', grain: 0.2 }),
    layers: [
      motif([
        wave(0.3, 0.08, 0.9, 'rgba(120,120,120,0.22)', 0.002, 0.1),
        wave(0.55, 0.1, 0.7, 'rgba(201,162,74,0.75)', 0.003, 0.35),
        wave(0.62, 0.06, 1.1, 'rgba(201,162,74,0.45)', 0.0018, 0.6),
        wave(0.78, 0.07, 0.8, 'rgba(120,120,120,0.18)', 0.002, 0.8),
      ]),
      text('MARBRE', { y: 0.86, fontFamily: 'DM Serif Display', fontSize: 0.075, letterSpacing: 0.025, weight: 400, color: '#3a3326' }),
    ],
  },
  {
    key: 'sig-carbone-rouge',
    name: 'Carbone Rouge',
    category: 'Carbon Fiber',
    badge: 'Nouveau',
    background: bg({ finish: 'carbon', color1: '#141518', color2: '#08090a' }),
    layers: [
      shape({ shape: 'rect', x: 0.78, y: 0.5, width: 0.06, height: 1.2, fill: '#e0312e' }),
      shape({ shape: 'rect', x: 0.86, y: 0.5, width: 0.015, height: 1.2, fill: '#e0312e' }),
      ...chip(0.17, 0.45, '#c8ccd2'),
      text('SPORT', { x: 0.08, y: 0.84, align: 'left', fontFamily: 'Oswald', italic: true, fontSize: 0.08, weight: 700, letterSpacing: 0.03, color: '#f5f5f7' }),
    ],
  },

  // ---- Dessins: hand-drawn parodies (5 cartoons, 6 video games) ------------
  {
    key: 'drw-eponge',
    name: 'Éponge des Mers',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'radial', color1: '#5cc8f2', color2: '#0b5c9a' }),
    layers: [
      backdrop(seaBackdrop()),
      vec(sponge(), 0.73, 0.5, 0.3, { rotation: 4 }),
      text('ÉPONGE', { x: 0.07, y: 0.32, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.15, weight: 400, color: '#f7e04b', shadow: true }),
      text('DES MERS', { x: 0.07, y: 0.48, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.11, weight: 400, color: '#ffffff', shadow: true }),
      text('« Je suis prêt ! »', { x: 0.07, y: 0.65, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.055, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-donut',
    name: 'Mmmh… Donut',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'linear', color1: '#6ec6ff', color2: '#2f8fe0', angle: 90 }),
    layers: [
      backdrop(skyClouds()),
      vec(donut(), 0.71, 0.5, 0.36, { rotation: -8 }),
      text('MMMH…', { x: 0.07, y: 0.33, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.12, weight: 400, color: '#ffd23f', shadow: true }),
      text('DONUTS', { x: 0.07, y: 0.5, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.15, weight: 400, color: '#f47fb2', shadow: true }),
      text('glaçage rose, vermicelles en option', { x: 0.07, y: 0.67, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.042, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-portail',
    name: 'Portail Vert',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'radial', color1: '#16213e', color2: '#05050f' }),
    layers: [
      backdrop(starfield(17)),
      vec(portal(), 0.69, 0.5, 0.42, { sketch: false }),
      vec(flask(), 0.89, 0.7, 0.11, { rotation: 14 }),
      text('PORTAIL', { x: 0.07, y: 0.33, align: 'left', fontFamily: 'Bangers', fontSize: 0.16, weight: 400, letterSpacing: 0.01, color: '#9ef01a', shadow: true }),
      text('VERT', { x: 0.07, y: 0.51, align: 'left', fontFamily: 'Bangers', fontSize: 0.16, weight: 400, letterSpacing: 0.01, color: '#ffffff', shadow: true }),
      text('aller-retour inter-dimensions', { x: 0.07, y: 0.68, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.042, weight: 400, color: '#c9f75a' }),
    ],
  },
  {
    key: 'drw-chat',
    name: 'Chat Lasagne',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'solid', color1: '#fde8c8', grain: 0.15 }),
    layers: [
      vec(checks(), 0.5, 0.95, 1.04, { sketch: false, locked: true }),
      vec(lazyCat(), 0.72, 0.43, 0.38),
      vec(lasagna(), 0.25, 0.73, 0.3),
      text('JE DÉTESTE', { x: 0.06, y: 0.17, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.085, weight: 400, color: '#c0392b' }),
      text('LES LUNDIS', { x: 0.06, y: 0.31, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.085, weight: 400, color: '#1b1712' }),
    ],
  },
  {
    key: 'drw-van',
    name: 'Van Mystère',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'linear', color1: '#1b1036', color2: '#4a3a86', angle: 90 }),
    layers: [
      backdrop(hauntedNight()),
      vec(mysteryVan(), 0.6, 0.63, 0.62),
      text('LE VAN', { x: 0.06, y: 0.15, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.09, weight: 400, color: '#9fe870', shadow: true }),
      text('MYSTÈRE', { x: 0.06, y: 0.28, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.11, weight: 400, color: '#f59e2b', shadow: true }),
    ],
  },
  {
    key: 'drw-enfer',
    name: 'Enfer.exe',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'radial', color1: '#3a0a0a', color2: '#000000' }),
    layers: [
      vec(hellfire(), 0.5, 0.86, 1.04, { sketch: false, locked: true }),
      vec(pixelDemon(), 0.73, 0.4, 0.3, { sketch: false }),
      text('ENFER', { x: 0.07, y: 0.28, align: 'left', fontFamily: 'Press Start 2P', fontSize: 0.1, weight: 400, color: '#ff3b30', shadow: true }),
      text('.EXE', { x: 0.07, y: 0.43, align: 'left', fontFamily: 'Press Start 2P', fontSize: 0.07, weight: 400, color: '#ffc93c', shadow: true }),
      text('MODE CAUCHEMAR', { x: 0.07, y: 0.56, align: 'left', fontFamily: 'Press Start 2P', fontSize: 0.032, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-herisson',
    name: 'Hérisson Turbo',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'linear', color1: '#2f7bff', color2: '#bfe8ff', angle: 90 }),
    layers: [
      backdrop(checkerHills()),
      vec(hedgehog(), 0.67, 0.42, 0.36),
      vec(goldRings(), 0.2, 0.6, 0.26, { sketch: false }),
      text('TURBO!', { x: 0.06, y: 0.2, align: 'left', fontFamily: 'Bangers', fontSize: 0.16, weight: 400, letterSpacing: 0.01, color: '#ffe14d', shadow: true }),
      text('plus rapide que ton banquier', { x: 0.06, y: 0.36, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.042, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-champi',
    name: 'Champi 1-UP',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'solid', color1: '#5c94fc' }),
    layers: [
      vec(brickGround(), 0.5, 0.93, 1.02, { sketch: false, locked: true }),
      vec(skyClouds([[22, 18, 0.5], [142, 16, 0.42]]), 0.5, 0.5, 1, { sketch: false, locked: true }),
      vec(pixelMushroom(), 0.28, 0.655, 0.22, { sketch: false }),
      vec(questionBlock(), 0.64, 0.3, 0.12, { sketch: false }),
      text('?', { x: 0.64, y: 0.31, fontFamily: 'Press Start 2P', fontSize: 0.1, weight: 400, color: '#7a3b00' }),
      text('1-UP', { x: 0.7, y: 0.6, fontFamily: 'Press Start 2P', fontSize: 0.1, weight: 400, color: '#ffffff', shadow: true }),
      text('UNE VIE EN PLUS', { x: 0.7, y: 0.73, fontFamily: 'Press Start 2P', fontSize: 0.03, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-glouton',
    name: 'Glouton',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'solid', color1: '#000000' }),
    layers: [
      backdrop(maze()),
      vec(glouton(), 0.45, 0.5, 0.62, { sketch: false }),
      vec(ghost('#ff3b3b'), 0.86, 0.5, 0.12, { sketch: false }),
      text('GLOUTON', { x: 0.5, y: 0.09, fontFamily: 'Press Start 2P', fontSize: 0.055, weight: 400, color: '#ffe600' }),
      text('HI-SCORE 999990', { x: 0.5, y: 0.92, fontFamily: 'Press Start 2P', fontSize: 0.032, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-bloc',
    name: 'Bloc Creuseur',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'linear', color1: '#7ec8ff', color2: '#d2f0ff', angle: 90 }),
    layers: [
      vec(grassBlock(), 0.27, 0.55, 0.3, { sketch: false }),
      vec(pickaxe(), 0.68, 0.6, 0.26, { sketch: false }),
      text('CREUSE.', { x: 0.94, y: 0.18, align: 'right', fontFamily: 'Press Start 2P', fontSize: 0.07, weight: 400, color: '#ffffff', shadow: true }),
      text('POSE.', { x: 0.94, y: 0.32, align: 'right', fontFamily: 'Press Start 2P', fontSize: 0.07, weight: 400, color: '#3f8f2a', shadow: true }),
    ],
  },
  {
    key: 'drw-suspect',
    name: 'Suspect',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'radial', color1: '#1b1f3b', color2: '#05060f' }),
    layers: [
      backdrop(starfield(29)),
      vec(crewmate(), 0.73, 0.52, 0.26),
      text('SUS', { x: 0.07, y: 0.3, align: 'left', fontFamily: 'Bangers', fontSize: 0.22, weight: 400, letterSpacing: 0.02, color: '#d7263d', shadow: true }),
      text("C'ÉTAIT PAS MOI", { x: 0.07, y: 0.53, align: 'left', fontFamily: 'Bangers', fontSize: 0.075, weight: 400, letterSpacing: 0.01, color: '#ffffff' }),
      text('(…peut-être un peu)', { x: 0.07, y: 0.66, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.045, weight: 400, color: '#9fd9f2' }),
    ],
  },

  // ---- Personnages: collectible character cards ------------------------------
  characterCard({
    key: 'chr-chevalier',
    name: 'Sire Boulon',
    kind: 'CHEVALIER · ACIER',
    art: knight(),
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
    colors: ['#6b4500', '#1a1000'],
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
    colors: ['#0f3b4a', '#041318'],
    accent: '#8fe3ff',
    stats: [['ATK', 66], ['DEF', 48], ['VIT', 85]],
    stars: 3,
    rarity: 'Rare',
  }),

  // ---- Comics ---------------------------------------------------------------
  {
    key: 'cmx-boom',
    name: 'BOOM!',
    category: 'Comics',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#ffd23f' }),
    layers: [
      backdrop(comicsBackdrop('rgba(230,57,70,0.35)')),
      backdrop(actionLines()),
      vec(comicsBurst(), 0.5, 0.5, 0.7),
      text('BOOM!', { y: 0.52, fontFamily: 'Bangers', fontSize: 0.26, weight: 400, letterSpacing: 0.02, color: '#ffffff', shadow: true, rotation: -6 }),
    ],
  },
  {
    key: 'cmx-heros',
    name: 'Super Carte',
    category: 'Comics',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#4cc9f0', color2: '#4361ee', angle: 135 }),
    layers: [
      backdrop(comicsBackdrop('rgba(255,255,255,0.16)')),
      backdrop(actionLines('rgba(255,255,255,0.22)')),
      vec(heroShield(), 0.25, 0.53, 0.28),
      vec(speechBubble(), 0.68, 0.34, 0.54),
      text("C'EST MOI QUI", { x: 0.69, y: 0.25, fontFamily: 'Bangers', fontSize: 0.075, weight: 400, letterSpacing: 0.01, color: '#1b1712' }),
      text('PAIE !', { x: 0.69, y: 0.38, fontFamily: 'Bangers', fontSize: 0.1, weight: 400, letterSpacing: 0.01, color: '#e63946' }),
      text('SUPER CARTE', { x: 0.69, y: 0.79, fontFamily: 'Bangers', fontSize: 0.1, weight: 400, letterSpacing: 0.02, color: '#ffe066', shadow: true }),
    ],
  },

  // ---- Synthwave --------------------------------------------------------------
  {
    key: 'syn-outrun',
    name: 'Outrun',
    category: 'Synthwave',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#12002b', color2: '#4a0a5e', angle: 90 }),
    layers: [
      backdrop(outrun()),
      text('OUTRUN', { y: 0.86, fontFamily: 'Bangers', fontSize: 0.12, weight: 400, letterSpacing: 0.04, color: '#5ef0ff', shadow: true }),
    ],
  },
  {
    key: 'syn-palmier',
    name: 'Nuit Néon',
    category: 'Synthwave',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#3a0d6b', color2: '#ff6ec7', angle: 90 }),
    layers: [
      backdrop(outrun()),
      vec(palm(), 0.1, 0.5, 0.22, { sketch: false }),
      vec(palm(), 0.92, 0.56, 0.2, { sketch: false, rotation: 6 }),
      text('NUIT NÉON', { y: 0.86, fontFamily: 'Permanent Marker', fontSize: 0.09, weight: 400, color: '#ffe66d', shadow: true }),
    ],
  },

  // ---- Old-school tattoo ------------------------------------------------------
  {
    key: 'tat-maman',
    name: 'Cœur Maman',
    category: 'Tatouage',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#f3e6c8', grain: 0.3 }),
    layers: [
      backdrop(tattooStars()),
      vec(tattooHeart(), 0.5, 0.5, 0.52),
      text('MAMAN', { y: 0.55, fontFamily: 'DM Serif Display', fontSize: 0.085, weight: 400, letterSpacing: 0.02, color: '#1b1712' }),
    ],
  },
  {
    key: 'tat-hirondelle',
    name: 'Hirondelle',
    category: 'Tatouage',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#efe3c8', grain: 0.3 }),
    layers: [
      backdrop(tattooStars()),
      vec(swallow(), 0.52, 0.42, 0.6),
      text('LIBERTÉ', { y: 0.87, fontFamily: 'DM Serif Display', fontSize: 0.085, weight: 400, letterSpacing: 0.03, color: '#1d3557' }),
    ],
  },

  // ---- Japan --------------------------------------------------------------------
  {
    key: 'jpn-vague',
    name: 'Grande Vague',
    category: 'Japon',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#f1e4c8', grain: 0.35 }),
    layers: [
      backdrop(greatWave()),
      text('VAGUE', { x: 0.06, y: 0.13, align: 'left', fontFamily: 'DM Serif Display', fontSize: 0.075, weight: 400, letterSpacing: 0.02, color: '#1d3f72' }),
    ],
  },
  {
    key: 'jpn-koi',
    name: 'Koï',
    category: 'Japon',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#1f6f78', color2: '#0b2f36' }),
    layers: [
      backdrop(ripples()),
      vec(koi(), 0.52, 0.52, 0.6, { rotation: -8 }),
      text('KOÏ', { x: 0.07, y: 0.85, align: 'left', fontFamily: 'DM Serif Display', fontSize: 0.08, weight: 400, letterSpacing: 0.03, color: '#ffe9d6' }),
    ],
  },

  // ---- Space ------------------------------------------------------------------
  {
    key: 'spc-planete',
    name: 'Planète Anneau',
    category: 'Espace',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#1b2a4a', color2: '#03050c' }),
    layers: [
      backdrop(starfield(51)),
      vec(ringedPlanet(), 0.63, 0.52, 0.6, { rotation: -12 }),
      text('ORBITE', { x: 0.06, y: 0.14, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.075, weight: 700, letterSpacing: 0.03, color: '#e9c46a' }),
    ],
  },
  {
    key: 'spc-fusee',
    name: 'Décollage',
    category: 'Espace',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#0b1d51', color2: '#311b92', angle: 135 }),
    layers: [
      backdrop(starfield(63)),
      vec(rocket(), 0.74, 0.5, 0.2, { rotation: 28 }),
      text('DÉCOLLAGE', { x: 0.06, y: 0.3, align: 'left', fontFamily: 'Bangers', fontSize: 0.13, weight: 400, letterSpacing: 0.01, color: '#ffffff', shadow: true }),
      text('IMMÉDIAT', { x: 0.06, y: 0.47, align: 'left', fontFamily: 'Bangers', fontSize: 0.13, weight: 400, letterSpacing: 0.01, color: '#ffe066', shadow: true }),
      text('3… 2… 1…', { x: 0.06, y: 0.65, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.055, weight: 400, color: '#4dabf7' }),
    ],
  },

  // ---- Parody ID (clearly fictional) ---------------------------------------------
  {
    key: 'par-permis',
    name: 'Permis de Nager',
    category: 'Parodie',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#eef6ff', color2: '#cfe4ff', angle: 135, finish: 'gloss' }),
    layers: [
      backdrop(idPattern()),
      text('PERMIS DE NAGER', { x: 0.05, y: 0.11, align: 'left', fontFamily: 'Oswald', fontSize: 0.085, weight: 700, letterSpacing: 0.01, color: '#ffffff' }),
      text('FOND MARIN', { x: 0.95, y: 0.11, align: 'right', fontFamily: 'Oswald', fontSize: 0.05, weight: 600, color: '#bfdbfe' }),
      shape({ shape: 'roundRect', x: 0.19, y: 0.6, width: 0.26, height: 0.6, fill: '#ffffff', stroke: '#1d4ed8', strokeWidth: 0.004, cornerRadius: 0.015 }),
      vec(sponge(), 0.19, 0.6, 0.21),
      text('NOM : L’ÉPONGE', { x: 0.37, y: 0.33, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.045, weight: 700, color: '#0f172a' }),
      text('ADRESSE : 124 rue de l’Ananas', { x: 0.37, y: 0.44, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.04, weight: 500, color: '#0f172a' }),
      text('CATÉGORIE : pêche aux méduses', { x: 0.37, y: 0.54, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.04, weight: 500, color: '#0f172a' }),
      text('VALABLE : pour toujours', { x: 0.37, y: 0.64, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.04, weight: 500, color: '#0f172a' }),
      text('L’Éponge', { x: 0.37, y: 0.82, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.075, weight: 400, color: '#1d4ed8', rotation: -4 }),
    ],
  },
]

export const NEW_FILTER = 'Nouveautés'

const FEATURED = ['Dessins', 'Personnages']
const ALL_CATEGORIES = Array.from(new Set(TEMPLATES.map((t) => t.category)))

export const CATEGORIES: string[] = [
  'Tous',
  NEW_FILTER,
  ...FEATURED.filter((c) => ALL_CATEGORIES.includes(c)),
  ...ALL_CATEGORIES.filter((c) => !FEATURED.includes(c)),
]

export function templateToProject(t: Template): CardProject {
  // deep clone layers and give fresh ids
  const layers: Layer[] = JSON.parse(JSON.stringify(t.layers))
  layers.forEach((l) => (l.id = uid()))
  return {
    id: uid(),
    name: t.name,
    category: t.category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false,
    aspect: CARD_ASPECT,
    background: JSON.parse(JSON.stringify(t.background)),
    layers,
  }
}

export function blankProject(name = 'Nouveau design'): CardProject {
  return {
    id: uid(),
    name,
    category: 'Custom Photo',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false,
    aspect: CARD_ASPECT,
    background: {
      kind: 'linear',
      color1: '#171923',
      color2: '#08090D',
      angle: 135,
      finish: 'matte',
      grain: 0,
      glow: 0.2,
    },
    layers: [],
  }
}
