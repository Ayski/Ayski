import { CARD_ASPECT, uid, type Background, type CardProject, type Layer } from '../types'

export interface Template {
  key: string
  name: string
  category: string
  background: Background
  layers: Layer[]
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
]

export const CATEGORIES: string[] = [
  'Tous',
  ...Array.from(new Set(TEMPLATES.map((t) => t.category))),
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
