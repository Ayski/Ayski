import { backdrop, bg, vec, type Template } from '../builders'
import { chipArt, contactlessArt } from '../art/cardparts'
import {
  cairn,
  carbonStripes,
  clousDeParis,
  engineRings,
  holoGem,
  holoPrism,
  kraftSeal,
  marbleLux,
  pearlFolds,
  platineSunray,
  ribbedNoir,
  roseSatin,
  transitLines,
} from '../art/core-lux'

// Collection Signature (inspired by the skin styles shared around AirCard;
// original artwork, no third-party logos, brands or real card data). No text:
// lit, shaded vector art with a single key light from the top-left.

export const SIGNATURE_TEMPLATES: Template[] = [
  {
    key: 'sig-obsidian',
    name: 'Obsidian Metal',
    category: 'Black Edition',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#26282d', color2: '#050506', finish: 'black', glow: 0.3, grain: 0.08 }),
    layers: [
      backdrop(engineRings()),
      vec(chipArt('silver'), 0.15, 0.45, 0.11),
      vec(contactlessArt('rgba(255,255,255,0.6)'), 0.265, 0.45, 0.04),
    ],
  },
  {
    key: 'sig-noir-absolu',
    name: 'Noir Absolu',
    category: 'Black Edition',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#111114', finish: 'matte', grain: 0.12 }),
    layers: [
      backdrop(ribbedNoir()),
      vec(chipArt('silver'), 0.15, 0.42, 0.11),
    ],
  },
  {
    key: 'sig-galet',
    name: 'Galet',
    category: 'Minimalist',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#f1f0ed', color2: '#cfccc6', finish: 'matte', grain: 0.08 }),
    layers: [backdrop(cairn())],
  },
  {
    key: 'sig-blanc-pur',
    name: 'Blanc Pur',
    category: 'Minimalist',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#ffffff', color2: '#e9ebf0', angle: 120, finish: 'gloss' }),
    layers: [
      backdrop(pearlFolds()),
      vec(chipArt('silver'), 0.15, 0.42, 0.11),
    ],
  },
  {
    key: 'sig-carton',
    name: 'Carton Officiel',
    category: 'Vintage',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#cfa86c', color2: '#a87f45', angle: 120, finish: 'matte', grain: 0.4 }),
    layers: [
      backdrop(kraftSeal()),
      vec(chipArt('gold'), 0.15, 0.45, 0.11),
    ],
  },
  {
    key: 'sig-or-grave',
    name: 'Or Gravé',
    category: 'Luxury Gold',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#9a7a40', color2: '#45320f', angle: 135, finish: 'gold', glow: 0.35 }),
    layers: [
      backdrop(clousDeParis()),
      vec(chipArt('gold'), 0.15, 0.45, 0.11),
    ],
  },
  {
    key: 'sig-or-rose',
    name: 'Or Rose',
    category: 'Luxury Gold',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#f2c4b3', color2: '#9c5b4f', angle: 125, finish: 'gloss', glow: 0.35, grain: 0.05 }),
    layers: [
      backdrop(roseSatin()),
      vec(chipArt('rose'), 0.15, 0.45, 0.11),
    ],
  },
  {
    key: 'sig-platine',
    name: 'Platine',
    category: 'Silver Titanium',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#dfe2e6', color2: '#8c939b', angle: 110, finish: 'silver', glow: 0.35 }),
    layers: [
      backdrop(platineSunray()),
      vec(chipArt('silver'), 0.15, 0.45, 0.11),
      vec(contactlessArt('rgba(30,32,36,0.55)'), 0.265, 0.45, 0.04),
    ],
  },
  {
    key: 'sig-holo',
    name: 'Holographique',
    category: 'Glass',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#ffd6f2', color2: '#b6f0ff', angle: 120, finish: 'glass', glow: 0.5 }),
    layers: [
      backdrop(holoPrism()),
      vec(holoGem(), 0.72, 0.5, 0.3, { shadow: { color: 'rgba(80,40,120,0.35)', blur: 5, dx: 3, dy: 5 } }),
      vec(chipArt('silver'), 0.15, 0.45, 0.11),
    ],
  },
  {
    key: 'sig-transit',
    name: 'Transit',
    category: 'Futuristic',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#0f5b4f', color2: '#0a2f3a', angle: 135 }),
    layers: [
      backdrop(transitLines()),
      vec(contactlessArt('rgba(255,255,255,0.7)'), 0.9, 0.17, 0.04),
    ],
  },
  {
    key: 'sig-marbre-or',
    name: 'Marbre Or',
    category: 'Marble',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#f9f6ef', color2: '#d9d2c4', finish: 'gloss', grain: 0.1 }),
    layers: [
      backdrop(marbleLux('or')),
      vec(chipArt('gold'), 0.15, 0.45, 0.11),
    ],
  },
  {
    key: 'sig-carbone-rouge',
    name: 'Carbone Rouge',
    category: 'Carbon Fiber',
    badge: 'Nouveau',
    background: bg({ finish: 'carbon', color1: '#141518', color2: '#08090a' }),
    layers: [
      backdrop(carbonStripes()),
      vec(chipArt('silver'), 0.15, 0.45, 0.11),
    ],
  },
]
