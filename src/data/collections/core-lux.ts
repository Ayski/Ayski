import type { Layer } from '../../types'
import { backdrop, bg, brushed, guilloche, motif, vec, type Template } from '../builders'
import { chipArt, contactlessArt, laurel, snowflake, type Metal } from '../art/cardparts'
import { chevrons, decoFrame, eclipse, frostCracks, hexMicro, oneLine, onyxFacets, orb, stealthShapes } from '../art/core-lux'
import { marble } from '../art/core-vivid'
import { glassPanes } from '../art/core-world'

// Luxury / metal / minimal originals (Black, Gold, Silver, Carbon, Minimal, Marble, Glass).
// No text on the cards: the artwork carries the design.

function chip(metal: Metal, x = 0.15, y = 0.45): Layer {
  return vec(chipArt(metal), x, y, 0.11)
}

function contactless(color: string, x = 0.885, y = 0.45): Layer {
  return vec(contactlessArt(color), x, y, 0.04)
}

export const CORE_LUX: Template[] = [
  {
    key: 'black-onyx',
    name: 'Onyx',
    category: 'Black Edition',
    background: bg({ kind: 'solid', color1: '#0a0a0c', finish: 'black', glow: 0.35 }),
    layers: [
      backdrop(onyxFacets()),
      chip('silver'),
      contactless('rgba(230,232,236,0.75)'),
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
    ],
  },
  {
    key: 'gold-imperial',
    name: 'Imperial Gold',
    category: 'Luxury Gold',
    background: bg({ kind: 'linear', color1: '#3a2c0d', color2: '#120e04', angle: 135, finish: 'gold', glow: 0.65 }),
    layers: [
      motif(guilloche('rgba(255,236,180,0.15)', 0.0012, 26)),
      vec(laurel(), 0.79, 0.43, 0.22),
      chip('gold'),
    ],
  },
  {
    key: 'gold-royale',
    name: 'Royale',
    category: 'Luxury Gold',
    background: bg({ kind: 'radial', color1: '#4a1424', color2: '#14050b', finish: 'gloss', glow: 0.3 }),
    layers: [
      backdrop(decoFrame()),
    ],
  },
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
    ],
  },
  {
    key: 'carbon-apex',
    name: 'Apex Carbon',
    category: 'Carbon Fiber',
    background: bg({ finish: 'carbon', color1: '#15161a', color2: '#0a0b0d' }),
    layers: [
      backdrop(chevrons()),
      chip('silver', 0.15, 0.42),
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
    ],
  },
  {
    key: 'minimal-pure',
    name: 'Pure',
    category: 'Minimalist',
    background: bg({ kind: 'solid', color1: '#0e0f13', grain: 0.1 }),
    layers: [
      vec(orb(), 0.5, 0.42, 0.36),
    ],
  },
  {
    key: 'minimal-line',
    name: 'Ligne',
    category: 'Minimalist',
    background: bg({ kind: 'linear', color1: '#ffffff', color2: '#eef0f3', angle: 120, finish: 'gloss' }),
    layers: [
      backdrop(oneLine()),
    ],
  },
  {
    key: 'marble-noir',
    name: 'Marbre Noir',
    category: 'Marble',
    background: bg({ kind: 'radial', color1: '#2b2d33', color2: '#0b0c0f', finish: 'gloss' }),
    layers: [
      backdrop(marble(true)),
      chip('gold'),
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
    ],
  },
  {
    key: 'glass-aqua',
    name: 'Aqua Glass',
    category: 'Glass',
    background: bg({ kind: 'linear', color1: '#1d5163', color2: '#081c26', angle: 135, finish: 'glass', glow: 0.4 }),
    layers: [
      backdrop(glassPanes()),
      chip('silver'),
    ],
  },
]
