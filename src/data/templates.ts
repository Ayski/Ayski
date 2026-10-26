import { CARD_ASPECT, uid, type CardProject, type Layer } from '../types'
import { A, bg, brushed, chip, contactless, guilloche, motif, ring, seg, shape, text, wave, type Template } from './builders'
import { CARTOON_TEMPLATES } from './collections/cartoons'
import { GAME_TEMPLATES } from './collections/games'
import { CHARACTER_TEMPLATES } from './collections/characters'
import { SCENE_TEMPLATES } from './collections/scenes'

export type { Template } from './builders'

// ---- 28 original templates --------------------------------------------------
const CORE_TEMPLATES: Template[] = [
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
]

export const TEMPLATES: Template[] = [
  ...CORE_TEMPLATES,
  ...CARTOON_TEMPLATES,
  ...GAME_TEMPLATES,
  ...CHARACTER_TEMPLATES,
  ...SCENE_TEMPLATES,
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
