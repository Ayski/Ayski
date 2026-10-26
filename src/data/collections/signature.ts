import { A, backdrop, bg, brushed, chip, contactless, guilloche, motif, ring, seg, shape, wave, type Template } from '../builders'
import { holoFoil } from '../art/core-world'

// Collection Signature (inspired by the skin styles shared around AirCard;
// original artwork, no third-party logos, brands or real card data). No text.

export const SIGNATURE_TEMPLATES: Template[] = [
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
    ],
  },
  {
    key: 'sig-holo',
    name: 'Holographique',
    category: 'Glass',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#ffd6f2', color2: '#b6f0ff', angle: 120, finish: 'glass', glow: 0.6 }),
    layers: [
      backdrop(holoFoil()),
      ...chip(0.15, 0.45, '#dfe1e5'),
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
    ],
  },
]
