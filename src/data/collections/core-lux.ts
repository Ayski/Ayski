import type { Layer } from '../../types'
import { backdrop, bg, vec, type Template } from '../builders'
import { chipArt, contactlessArt, type Metal } from '../art/cardparts'
import {
  chevrons,
  crown,
  decoFrame,
  decoVelvet,
  eclipse,
  frostCracks,
  glassLux,
  goldSunray,
  iceCrystal,
  marbleLux,
  medallion,
  oneLine,
  onyxFacets,
  orb,
  stealthShapes,
  titanium,
} from '../art/core-lux'

// Luxury / metal / minimal originals (Black, Gold, Silver, Carbon, Minimal, Marble, Glass).
// No text on the cards: lit, shaded artwork carries the design (key light top-left).

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
    background: bg({ kind: 'solid', color1: '#0a0a0c', finish: 'black', glow: 0.25 }),
    layers: [
      backdrop(onyxFacets()),
      chip('silver'),
      contactless('rgba(230,232,236,0.75)', 0.265, 0.45),
    ],
  },
  {
    key: 'black-eclipse',
    name: 'Eclipse',
    category: 'Black Edition',
    background: bg({ kind: 'radial', color1: '#15161c', color2: '#020203' }),
    layers: [
      backdrop(eclipse()),
      chip('gold', 0.15, 0.42),
    ],
  },
  {
    key: 'gold-imperial',
    name: 'Imperial Gold',
    category: 'Luxury Gold',
    background: bg({ kind: 'linear', color1: '#9a7a40', color2: '#45320f', angle: 135, finish: 'gold', glow: 0.35 }),
    layers: [
      backdrop(goldSunray()),
      vec(medallion(), 0.73, 0.5, 0.4, { shadow: { color: 'rgba(40,22,0,0.55)', blur: 5, dx: 3, dy: 5 } }),
      chip('gold'),
    ],
  },
  {
    key: 'gold-royale',
    name: 'Royale',
    category: 'Luxury Gold',
    background: bg({ kind: 'radial', color1: '#5a1528', color2: '#16040b', finish: 'matte', grain: 0.12 }),
    layers: [
      backdrop(decoVelvet()),
      backdrop(decoFrame(), { shadow: { color: 'rgba(0,0,0,0.6)', blur: 2.5, dx: 1.2, dy: 1.8 } }),
      vec(crown(), 0.5, 0.36, 0.22, { shadow: { color: 'rgba(20,0,5,0.6)', blur: 5, dx: 3, dy: 5 } }),
    ],
  },
  {
    key: 'silver-titan',
    name: 'Titanium',
    category: 'Silver Titanium',
    background: bg({ kind: 'linear', color1: '#d6dbe1', color2: '#8a9199', angle: 115, finish: 'silver', glow: 0.35 }),
    layers: [
      backdrop(titanium()),
      chip('silver'),
      contactless('rgba(30,34,40,0.6)', 0.265, 0.45),
    ],
  },
  {
    key: 'silver-frost',
    name: 'Frost',
    category: 'Silver Titanium',
    background: bg({ kind: 'linear', color1: '#a9c4e0', color2: '#24405f', angle: 135, finish: 'gloss', glow: 0.3 }),
    layers: [
      backdrop(frostCracks()),
      vec(iceCrystal(), 0.74, 0.5, 0.42, { shadow: { color: 'rgba(8,24,50,0.5)', blur: 4, dx: 3, dy: 5 } }),
      vec(iceCrystal(), 0.42, 0.2, 0.08, { opacity: 0.75, shadow: { color: 'rgba(8,24,50,0.4)', blur: 3, dx: 2, dy: 3 } }),
      vec(iceCrystal(), 0.94, 0.86, 0.07, { opacity: 0.6 }),
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
    background: bg({ kind: 'solid', color1: '#0e0f13', grain: 0.06 }),
    layers: [
      backdrop(orb()),
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
      backdrop(marbleLux('noir')),
      chip('gold'),
    ],
  },
  {
    key: 'marble-blanc',
    name: 'Marbre Blanc',
    category: 'Marble',
    background: bg({ kind: 'radial', color1: '#ffffff', color2: '#dcdde2', finish: 'gloss' }),
    layers: [
      backdrop(marbleLux('blanc')),
      chip('gold'),
    ],
  },
  {
    key: 'glass-aqua',
    name: 'Aqua Glass',
    category: 'Glass',
    background: bg({ kind: 'linear', color1: '#1d5163', color2: '#081c26', angle: 135, finish: 'glass', glow: 0.3 }),
    layers: [
      backdrop(glassLux()),
      chip('silver'),
    ],
  },
]
