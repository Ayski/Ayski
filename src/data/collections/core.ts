import type { Layer } from '../../types'
import { backdrop, bg, brushed, guilloche, motif, text, title, vec, type Template } from '../builders'
import { chipArt, contactlessArt, laurel, snowflake, type Metal } from '../art/cardparts'
import { chevrons, decoFrame, eclipse, frostCracks, hexMicro, oneLine, onyxFacets, orb, stealthShapes } from '../art/core-lux'
import { glitchField, heartbeat, liquidBlobs, marble, miamiSunset, neonCity, pineForest, sunsetSea, waveBands } from '../art/core-vivid'
import { aurora, esportsEmblem, glassPanes, graffitiWall, hexField, hudRings, mangaPanel, pixelLandscape, prism, sakuraBranch, seventies } from '../art/core-world'

// Redesigned versions of the original 30 templates (same keys, so favourites
// and categories keep working). Entries here replace the legacy ones by key.

function chip(metal: Metal, x = 0.15, y = 0.45): Layer {
  return vec(chipArt(metal), x, y, 0.11)
}

function contactless(color: string, x = 0.885, y = 0.45): Layer {
  return vec(contactlessArt(color), x, y, 0.04)
}

export const CORE_V2: Template[] = [
  // ---- Black Edition --------------------------------------------------------
  {
    key: 'black-onyx',
    name: 'Onyx',
    category: 'Black Edition',
    background: bg({ kind: 'solid', color1: '#0a0a0c', finish: 'black', glow: 0.35 }),
    layers: [
      backdrop(onyxFacets()),
      chip('silver'),
      contactless('rgba(230,232,236,0.75)'),
      text('ONYX', { x: 0.08, y: 0.82, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.062, weight: 600, letterSpacing: 0.006, color: '#e8eaee' }),
      text('BLACK EDITION', { x: 0.92, y: 0.83, align: 'right', fontFamily: 'Inter', fontSize: 0.03, weight: 600, letterSpacing: 0.003, color: 'rgba(232,234,238,0.5)' }),
    ],
  },
  {
    key: 'black-eclipse',
    name: 'Eclipse',
    category: 'Black Edition',
    background: bg({ kind: 'radial', color1: '#17181d', color2: '#030304' }),
    layers: [
      backdrop(eclipse()),
      chip('gold', 0.15, 0.42),
      text('ECLIPSE', { x: 0.08, y: 0.78, align: 'left', fontFamily: 'Oswald', fontSize: 0.075, weight: 600, letterSpacing: 0.004, color: '#f3e4b0', shadow: true }),
      text('TOTALE', { x: 0.08, y: 0.89, align: 'left', fontFamily: 'Inter', fontSize: 0.03, weight: 600, letterSpacing: 0.004, color: 'rgba(243,228,176,0.55)' }),
    ],
  },

  // ---- Luxury Gold ---------------------------------------------------------
  {
    key: 'gold-imperial',
    name: 'Imperial Gold',
    category: 'Luxury Gold',
    background: bg({ kind: 'linear', color1: '#3a2c0d', color2: '#120e04', angle: 135, finish: 'gold', glow: 0.65 }),
    layers: [
      motif(guilloche('rgba(255,236,180,0.15)', 0.0012, 26)),
      vec(laurel(), 0.79, 0.43, 0.22),
      chip('gold'),
      text('IMPERIAL', { x: 0.08, y: 0.82, align: 'left', fontFamily: 'Playfair Display', fontSize: 0.07, weight: 700, letterSpacing: 0.004, color: '#fbecc1', shadow: true }),
      text('MMXXVI', { x: 0.92, y: 0.83, align: 'right', fontFamily: 'Playfair Display', fontSize: 0.035, weight: 500, letterSpacing: 0.004, color: 'rgba(251,236,193,0.6)' }),
    ],
  },
  {
    key: 'gold-royale',
    name: 'Royale',
    category: 'Luxury Gold',
    background: bg({ kind: 'radial', color1: '#4a1424', color2: '#14050b', finish: 'gloss', glow: 0.3 }),
    layers: [
      backdrop(decoFrame()),
      text('ROYALE', { y: 0.58, fontFamily: 'DM Serif Display', fontSize: 0.12, weight: 400, letterSpacing: 0.01, color: '#fff1c4', color2: '#c9952f', shadow: true }),
      text('MAISON · ÉDITION LIMITÉE', { y: 0.86, fontFamily: 'Inter', fontSize: 0.028, weight: 600, letterSpacing: 0.006, color: 'rgba(233,196,106,0.75)' }),
    ],
  },

  // ---- Silver Titanium -----------------------------------------------------
  {
    key: 'silver-titan',
    name: 'Titanium',
    category: 'Silver Titanium',
    background: bg({ kind: 'linear', color1: '#d3d8de', color2: '#7b828a', angle: 115, finish: 'silver', glow: 0.6 }),
    layers: [
      motif(brushed('rgba(255,255,255,0.12)', 90)),
      backdrop(hexMicro('rgba(0,0,0,0.06)')),
      chip('silver'),
      contactless('rgba(30,34,40,0.6)'),
      text('TITANIUM', { x: 0.08, y: 0.82, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.055, weight: 700, letterSpacing: 0.006, color: '#1d2126' }),
      text('Ti · 22', { x: 0.92, y: 0.83, align: 'right', fontFamily: 'Space Grotesk', fontSize: 0.035, weight: 500, color: 'rgba(29,33,38,0.55)' }),
    ],
  },
  {
    key: 'silver-frost',
    name: 'Frost',
    category: 'Silver Titanium',
    background: bg({ kind: 'linear', color1: '#9db8d6', color2: '#2b4766', angle: 135, finish: 'gloss', glow: 0.35 }),
    layers: [
      backdrop(frostCracks()),
      vec(snowflake(), 0.76, 0.46, 0.3, { opacity: 0.95 }),
      vec(snowflake(), 0.55, 0.2, 0.07, { opacity: 0.6 }),
      vec(snowflake(), 0.93, 0.83, 0.06, { opacity: 0.5 }),
      text('FROST', { x: 0.08, y: 0.78, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.075, weight: 700, letterSpacing: 0.006, color: '#ffffff', shadow: true }),
      text('ÉDITION GIVRE', { x: 0.08, y: 0.89, align: 'left', fontFamily: 'Inter', fontSize: 0.03, weight: 600, letterSpacing: 0.004, color: 'rgba(255,255,255,0.85)' }),
    ],
  },

  // ---- Carbon Fiber ----------------------------------------------------------
  {
    key: 'carbon-apex',
    name: 'Apex Carbon',
    category: 'Carbon Fiber',
    background: bg({ finish: 'carbon', color1: '#15161a', color2: '#0a0b0d' }),
    layers: [
      backdrop(chevrons()),
      chip('silver', 0.15, 0.42),
      text('APEX', { x: 0.08, y: 0.75, align: 'left', fontFamily: 'Oswald', fontSize: 0.11, weight: 700, letterSpacing: 0.006, color: '#fff1c2', color2: '#c9952f', shadow: true }),
      text('CARBON SERIES', { x: 0.08, y: 0.88, align: 'left', fontFamily: 'Inter', fontSize: 0.03, weight: 600, letterSpacing: 0.003, color: 'rgba(255,241,194,0.6)' }),
    ],
  },
  {
    key: 'carbon-stealth',
    name: 'Stealth',
    category: 'Carbon Fiber',
    background: bg({ finish: 'carbon', color1: '#121316', color2: '#060709' }),
    layers: [
      backdrop(stealthShapes()),
      chip('silver', 0.15, 0.48),
      contactless('rgba(155,140,255,0.85)', 0.9, 0.2),
      text('STEALTH', { x: 0.08, y: 0.2, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.055, weight: 600, letterSpacing: 0.008, color: '#e9e7ff' }),
    ],
  },

  // ---- Minimalist -----------------------------------------------------------
  {
    key: 'minimal-pure',
    name: 'Pure',
    category: 'Minimalist',
    background: bg({ kind: 'solid', color1: '#0e0f13', grain: 0.1 }),
    layers: [
      vec(orb(), 0.5, 0.42, 0.36),
      text('PURE', { y: 0.83, fontFamily: 'Inter', fontSize: 0.042, weight: 500, letterSpacing: 0.01, color: '#d9b45b' }),
    ],
  },
  {
    key: 'minimal-line',
    name: 'Ligne',
    category: 'Minimalist',
    background: bg({ kind: 'linear', color1: '#ffffff', color2: '#eef0f3', angle: 120, finish: 'gloss' }),
    layers: [
      backdrop(oneLine()),
      text('ligne', { x: 0.08, y: 0.87, align: 'left', fontFamily: 'Playfair Display', italic: true, fontSize: 0.075, weight: 500, color: '#111216' }),
    ],
  },

  // ---- Cyberpunk ------------------------------------------------------------
  {
    key: 'cyber-grid',
    name: 'Grid Runner',
    category: 'Cyberpunk',
    background: bg({ kind: 'linear', color1: '#1a0533', color2: '#05010d', angle: 90 }),
    layers: [
      backdrop(neonCity()),
      contactless('rgba(255,122,217,0.9)', 0.9, 0.16),
      text('RUNNER_01', { x: 0.07, y: 0.16, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.06, weight: 700, letterSpacing: 0.006, color: '#5ef0ff', outline: '#0a0420', outlineWidth: 0.08, shadow: true }),
      text('NIGHT CITY PASS', { x: 0.07, y: 0.26, align: 'left', fontFamily: 'Inter', fontSize: 0.028, weight: 600, letterSpacing: 0.004, color: 'rgba(255,122,217,0.9)' }),
    ],
  },
  {
    key: 'cyber-glitch',
    name: 'Glitch',
    category: 'Cyberpunk',
    background: bg({ kind: 'linear', color1: '#2a0845', color2: '#0a0220', angle: 45 }),
    layers: [
      backdrop(glitchField()),
      text('GLITCH', { x: 0.506, y: 0.5, fontFamily: 'Oswald', fontSize: 0.17, weight: 700, letterSpacing: 0.004, color: 'rgba(255,40,90,0.85)' }),
      text('GLITCH', { x: 0.494, y: 0.508, fontFamily: 'Oswald', fontSize: 0.17, weight: 700, letterSpacing: 0.004, color: 'rgba(0,240,255,0.85)' }),
      text('GLITCH', { x: 0.5, y: 0.504, fontFamily: 'Oswald', fontSize: 0.17, weight: 700, letterSpacing: 0.004, color: '#ffffff' }),
      text('SIGNAL PERDU', { y: 0.73, fontFamily: 'Space Grotesk', fontSize: 0.032, weight: 600, letterSpacing: 0.006, color: 'rgba(255,255,255,0.7)' }),
    ],
  },

  // ---- Neon -----------------------------------------------------------------
  {
    key: 'neon-pulse',
    name: 'Pulse',
    category: 'Neon',
    background: bg({ kind: 'radial', color1: '#160630', color2: '#05010d' }),
    layers: [
      backdrop(heartbeat()),
      text('PULSE', { x: 0.1, y: 0.24, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.07, weight: 700, letterSpacing: 0.008, color: '#efeaff', outline: '#7c5cff', outlineWidth: 0.05, shadow: true }),
      text('BPM 128', { x: 0.9, y: 0.24, align: 'right', fontFamily: 'Space Grotesk', fontSize: 0.035, weight: 600, color: 'rgba(182,168,255,0.85)' }),
    ],
  },
  {
    key: 'neon-miami',
    name: 'Miami',
    category: 'Neon',
    background: bg({ kind: 'linear', color1: '#ff7a59', color2: '#3a0d6b', angle: 90 }),
    layers: [
      backdrop(miamiSunset()),
      text('Miami', { x: 0.08, y: 0.3, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.14, weight: 400, color: '#fff0fa', outline: '#ff2fb3', outlineWidth: 0.08, shadow: true, rotation: -6 }),
      text('NIGHTS · 1986', { x: 0.09, y: 0.48, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.032, weight: 600, letterSpacing: 0.006, color: '#ffe0f3' }),
    ],
  },

  // ---- Abstract ---------------------------------------------------------------
  {
    key: 'abstract-flux',
    name: 'Flux',
    category: 'Abstract',
    background: bg({ kind: 'linear', color1: '#1b1f3a', color2: '#0b0e1d', angle: 135 }),
    layers: [
      backdrop(liquidBlobs()),
      text('FLUX', { x: 0.08, y: 0.86, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.065, weight: 700, letterSpacing: 0.008, color: '#ffffff' }),
    ],
  },
  {
    key: 'abstract-wave',
    name: 'Wave',
    category: 'Abstract',
    background: bg({ kind: 'linear', color1: '#d6f7ff', color2: '#7fdcef', angle: 90 }),
    layers: [
      backdrop(waveBands()),
      text('WAVE', { x: 0.08, y: 0.13, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.07, weight: 700, letterSpacing: 0.01, color: '#0a3a52' }),
      text('OCÉAN PACIFIQUE', { x: 0.08, y: 0.22, align: 'left', fontFamily: 'Inter', fontSize: 0.028, weight: 600, letterSpacing: 0.004, color: 'rgba(10,58,82,0.7)' }),
    ],
  },

  // ---- Marble -----------------------------------------------------------------
  {
    key: 'marble-noir',
    name: 'Marbre Noir',
    category: 'Marble',
    background: bg({ kind: 'radial', color1: '#2b2d33', color2: '#0b0c0f', finish: 'gloss' }),
    layers: [
      backdrop(marble(true)),
      chip('gold'),
      text('MARBRE', { x: 0.08, y: 0.84, align: 'left', fontFamily: 'DM Serif Display', fontSize: 0.07, weight: 400, letterSpacing: 0.01, color: '#f2f2f2' }),
    ],
  },
  {
    key: 'marble-blanc',
    name: 'Marbre Blanc',
    category: 'Marble',
    background: bg({ kind: 'radial', color1: '#ffffff', color2: '#dcdde2', finish: 'gloss' }),
    layers: [
      backdrop(marble(false)),
      chip('gold'),
      text('BLANC', { x: 0.08, y: 0.84, align: 'left', fontFamily: 'DM Serif Display', fontSize: 0.07, weight: 400, letterSpacing: 0.01, color: '#1d1f24' }),
    ],
  },

  // ---- Nature -------------------------------------------------------------------
  {
    key: 'nature-forest',
    name: 'Forêt',
    category: 'Nature',
    background: bg({ kind: 'linear', color1: '#a9c4bd', color2: '#4a6b66', angle: 90 }),
    layers: [
      backdrop(pineForest()),
      text('FORÊT', { x: 0.08, y: 0.2, align: 'left', fontFamily: 'DM Serif Display', fontSize: 0.08, weight: 400, letterSpacing: 0.01, color: '#f7f4ea', shadow: true }),
      text('Brume du matin', { x: 0.08, y: 0.31, align: 'left', fontFamily: 'Playfair Display', italic: true, fontSize: 0.04, weight: 500, color: 'rgba(247,244,234,0.85)' }),
    ],
  },
  {
    key: 'nature-sunset',
    name: 'Coucher',
    category: 'Nature',
    background: bg({ kind: 'linear', color1: '#ffb38a', color2: '#8a3f74', angle: 90 }),
    layers: [
      backdrop(sunsetSea()),
      text('Coucher', { x: 0.08, y: 0.2, align: 'left', fontFamily: 'Playfair Display', italic: true, fontSize: 0.09, weight: 700, color: '#fff6ec', shadow: true }),
      text('DE SOLEIL', { x: 0.08, y: 0.32, align: 'left', fontFamily: 'Inter', fontSize: 0.03, weight: 600, letterSpacing: 0.006, color: 'rgba(255,246,236,0.9)' }),
    ],
  },

  // ---- Gaming -----------------------------------------------------------------
  {
    key: 'gaming-arena',
    name: 'Arena',
    category: 'Gaming',
    background: bg({ kind: 'radial', color1: '#0d1b3a', color2: '#030714' }),
    layers: [
      backdrop(hexField()),
      vec(esportsEmblem(), 0.77, 0.5, 0.24, { shadow: true }),
      title('ARENA', { font: 'Bangers', y: 0.3, size: 0.16, color: '#ffffff', color2: '#7fe9ff', outline: '#04102a', letterSpacing: 0.006 }),
      text('SAISON 7 · RANKED', { x: 0.07, y: 0.48, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.032, weight: 700, letterSpacing: 0.004, color: '#2de2ff' }),
    ],
  },
  {
    key: 'gaming-pixel',
    name: 'Pixel',
    category: 'Gaming',
    background: bg({ kind: 'solid', color1: '#3b4cca' }),
    layers: [
      backdrop(pixelLandscape()),
      text('PIXEL', { x: 0.07, y: 0.15, align: 'left', fontFamily: 'Press Start 2P', fontSize: 0.075, weight: 400, color: '#ffffff', outline: '#1b1f5e', outlineWidth: 0.12, shadow: true }),
      text('NIVEAU 1-1', { x: 0.07, y: 0.27, align: 'left', fontFamily: 'Press Start 2P', fontSize: 0.03, weight: 400, color: '#fff3a0', outline: '#1b1f5e', outlineWidth: 0.15 }),
    ],
  },

  // ---- Anime / Manga -------------------------------------------------------------
  {
    key: 'anime-sakura',
    name: 'Sakura',
    category: 'Anime',
    background: bg({ kind: 'linear', color1: '#fff0f5', color2: '#ffc6da', angle: 90 }),
    layers: [
      backdrop(sakuraBranch()),
      text('さくら', { x: 0.08, y: 0.72, align: 'left', fontFamily: 'Playfair Display', fontSize: 0.13, weight: 500, color: '#9b2c56' }),
      text('SAKURA · PRINTEMPS', { x: 0.08, y: 0.87, align: 'left', fontFamily: 'Inter', fontSize: 0.028, weight: 600, letterSpacing: 0.004, color: 'rgba(155,44,86,0.75)' }),
    ],
  },
  {
    key: 'manga-ink',
    name: 'Encre',
    category: 'Manga',
    background: bg({ kind: 'solid', color1: '#f6f5f0' }),
    layers: [
      backdrop(mangaPanel()),
      text('ドン!', { x: 0.7, y: 0.52, fontFamily: 'Inter', fontSize: 0.22, weight: 800, color: '#111111', outline: '#ffffff', outlineWidth: 0.08, rotation: -8 }),
      text('ACTION', { x: 0.06, y: 0.13, align: 'left', fontFamily: 'Bangers', fontSize: 0.09, weight: 400, letterSpacing: 0.006, color: '#111111', outline: '#ffffff', outlineWidth: 0.12 }),
    ],
  },

  // ---- Streetwear / Vintage ---------------------------------------------------------
  {
    key: 'street-tag',
    name: 'Tag',
    category: 'Streetwear',
    background: bg({ kind: 'linear', color1: '#2c2c31', color2: '#151517', angle: 90, grain: 0.3 }),
    layers: [
      backdrop(graffitiWall()),
      text('STREET', { y: 0.5, fontFamily: 'Permanent Marker', fontSize: 0.17, weight: 400, color: '#ff5a00', color2: '#ffb000', outline: '#111111', outlineWidth: 0.1, shadow: true, rotation: -6 }),
      text('NO RULES', { y: 0.73, fontFamily: 'Bangers', fontSize: 0.055, weight: 400, letterSpacing: 0.006, color: '#ffe14d', rotation: -6 }),
    ],
  },
  {
    key: 'vintage-retro',
    name: 'Retro 70',
    category: 'Vintage',
    background: bg({ kind: 'solid', color1: '#f6e7c8', grain: 0.3 }),
    layers: [
      backdrop(seventies()),
      text('RETRO', { x: 0.07, y: 0.3, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.14, weight: 400, color: '#e2522b', color2: '#c2381a', outline: '#5a2e12', outlineWidth: 0.06 }),
      text('SEVENTIES', { x: 0.07, y: 0.46, align: 'left', fontFamily: 'DM Serif Display', fontSize: 0.045, weight: 400, letterSpacing: 0.008, color: '#7a4a24' }),
    ],
  },

  // ---- Glass / Gradient / Geometric / Futuristic ----------------------------------------
  {
    key: 'glass-aqua',
    name: 'Aqua Glass',
    category: 'Glass',
    background: bg({ kind: 'linear', color1: '#1d5163', color2: '#081c26', angle: 135, finish: 'glass', glow: 0.4 }),
    layers: [
      backdrop(glassPanes()),
      chip('silver'),
      text('AQUA', { x: 0.08, y: 0.84, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.07, weight: 700, letterSpacing: 0.008, color: '#e6fbff' }),
    ],
  },
  {
    key: 'gradient-aurora',
    name: 'Aurora',
    category: 'Gradient',
    background: bg({ kind: 'linear', color1: '#0d1f3d', color2: '#020611', angle: 90 }),
    layers: [
      backdrop(aurora()),
      text('AURORA', { x: 0.08, y: 0.87, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.07, weight: 700, letterSpacing: 0.01, color: '#e9fff6' }),
      text('BORÉALE', { x: 0.92, y: 0.88, align: 'right', fontFamily: 'Inter', fontSize: 0.03, weight: 600, letterSpacing: 0.004, color: 'rgba(160,255,210,0.75)' }),
    ],
  },
  {
    key: 'geo-prism',
    name: 'Prism',
    category: 'Geometric',
    background: bg({ kind: 'radial', color1: '#1a1d2b', color2: '#05060a' }),
    layers: [
      backdrop(prism()),
      text('PRISM', { x: 0.08, y: 0.2, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.065, weight: 700, letterSpacing: 0.01, color: '#ffffff' }),
      text('SPECTRE', { x: 0.08, y: 0.3, align: 'left', fontFamily: 'Inter', fontSize: 0.03, weight: 600, letterSpacing: 0.006, color: 'rgba(255,255,255,0.6)' }),
    ],
  },
  {
    key: 'futur-nexus',
    name: 'Nexus',
    category: 'Futuristic',
    background: bg({ kind: 'radial', color1: '#0b2238', color2: '#020812' }),
    layers: [
      backdrop(hexField('rgba(56,189,248,0.08)')),
      vec(hudRings(), 0.72, 0.5, 0.36),
      text('NEXUS', { x: 0.08, y: 0.3, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.075, weight: 700, letterSpacing: 0.01, color: '#d4f1ff', outline: '#0b4a6b', outlineWidth: 0.05, shadow: true }),
      text('ACCÈS NIVEAU 5', { x: 0.08, y: 0.42, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.03, weight: 600, letterSpacing: 0.004, color: 'rgba(56,189,248,0.9)' }),
    ],
  },
]
