import { bg, vec, backdrop, type Template } from '../builders'
import {
  sponge, seaBackdrop, donut, sunnySky, skyClouds, portal, flask, crystals, starfield, alienWorld,
  lazyCat, lasagna, checks, kitchenWall, sunbeam, mysteryVan, ghost, hauntedNight,
} from '../art/cartoons'

// Text-free cartoon cards: the illustration fills the whole card.
// A transparent layer shadow forces off-screen rendering, which the distant
// donut's 'source-atop' haze relies on.
const OFFSCREEN = { color: 'rgba(0,0,0,0)', blur: 0.1, dx: 0, dy: 0 }

export const CARTOON_TEMPLATES: Template[] = [
  {
    key: 'drw-eponge',
    name: 'Éponge des Mers',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'linear', color1: '#5fd0f7', color2: '#073566', angle: 90 }),
    layers: [
      backdrop(seaBackdrop()),
      vec(sponge(), 0.54, 0.565, 0.4, { rotation: 2, shadow: { color: 'rgba(0,30,70,0.3)', blur: 5, dx: 2, dy: 3 } }),
    ],
  },
  {
    key: 'drw-donut',
    name: 'Mmmh… Donut',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'linear', color1: '#8fd8ff', color2: '#2f8fe0', angle: 90 }),
    layers: [
      backdrop(sunnySky()),
      vec(donut(0.55), 0.17, 0.42, 0.16, { rotation: 14, shadow: OFFSCREEN }),
      backdrop(skyClouds([[132, 14, 0.4], [150, 58, 0.24]])),
      vec(donut(), 0.58, 0.55, 0.5, { rotation: -4, shadow: { color: 'rgba(0,40,90,0.25)', blur: 6, dx: 2, dy: 4 } }),
    ],
  },
  {
    key: 'drw-portail',
    name: 'Portail Vert',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'radial', color1: '#1c2550', color2: '#05050f' }),
    layers: [
      backdrop(starfield(17)),
      backdrop(alienWorld()),
      vec(crystals(), 0.15, 0.7, 0.26),
      vec(portal(), 0.5, 0.455, 0.46),
      vec(flask(), 0.83, 0.725, 0.12, { rotation: 5 }),
    ],
  },
  {
    key: 'drw-chat',
    name: 'Chat Lasagne',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'linear', color1: '#a9e3f0', color2: '#4fa9cc', angle: 90 }),
    layers: [
      backdrop(kitchenWall()),
      vec(checks(), 0.5, 0.875, 1.04, { locked: true }),
      backdrop(sunbeam()),
      vec(lasagna(), 0.27, 0.78, 0.32),
      vec(lazyCat(), 0.66, 0.55, 0.48),
    ],
  },
  {
    key: 'drw-van',
    name: 'Van Mystère',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'linear', color1: '#120b2e', color2: '#4a3a86', angle: 90 }),
    layers: [
      backdrop(hauntedNight()),
      vec(ghost(), 0.17, 0.28, 0.12, { rotation: -10, opacity: 0.96 }),
      vec(mysteryVan(), 0.565, 0.665, 0.825),
    ],
  },
]
