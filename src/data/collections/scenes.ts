import { bg, vec, backdrop, type Template } from '../builders'
import { sponge } from '../art/cartoons'
import {
  boomBackdrop,
  boomBurst,
  heroCity,
  heroEmblem,
  outrunScene,
  neonPalmScene,
  flashPaper,
  tattooHeart,
  swallow,
  roseCluster,
  greatWave,
  koiPond,
  nebulaSky,
  ringedPlanet,
  moon,
  launchSky,
  rocket,
  licenceBackdrop,
  laminate,
  holoSeal,
} from '../art/scenes'

// Pure illustration cards (no text layers): one key light per scene.
const PAPER_SHADOW = { color: 'rgba(90,50,20,0.32)', blur: 4, dx: 3, dy: 4 }

export const SCENE_TEMPLATES: Template[] = [
  // ---- Comics ---------------------------------------------------------------
  {
    key: 'cmx-boom',
    name: 'BOOM!',
    category: 'Comics',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#ffd93b' }),
    layers: [backdrop(boomBackdrop()), vec(boomBurst(), 0.5, 0.5, 0.84)],
  },
  {
    key: 'cmx-heros',
    name: 'Super Carte',
    category: 'Comics',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#121a66', color2: '#ffd37a', angle: 90 }),
    layers: [backdrop(heroCity()), vec(heroEmblem(), 0.55, 0.45, 0.54, { rotation: -6 })],
  },

  // ---- Synthwave --------------------------------------------------------------
  {
    key: 'syn-outrun',
    name: 'Outrun',
    category: 'Synthwave',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#06011a', color2: '#05010d', angle: 90 }),
    layers: [backdrop(outrunScene())],
  },
  {
    key: 'syn-palmier',
    name: 'Nuit Néon',
    category: 'Synthwave',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#120430', color2: '#0a0320', angle: 90 }),
    layers: [backdrop(neonPalmScene())],
  },

  // ---- Old-school tattoo ------------------------------------------------------
  {
    key: 'tat-maman',
    name: 'Cœur Maman',
    category: 'Tatouage',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#efe2c4', grain: 0.35 }),
    layers: [
      backdrop(flashPaper([[18, 18, 5], [142, 18, 4.5], [146, 84, 4], [16, 84, 4.5]])),
      vec(tattooHeart(), 0.5, 0.5, 0.66, { shadow: PAPER_SHADOW }),
    ],
  },
  {
    key: 'tat-hirondelle',
    name: 'Hirondelle',
    category: 'Tatouage',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#efe2c4', grain: 0.35 }),
    layers: [
      backdrop(flashPaper([[80, 13, 4.5], [18, 86, 4], [142, 86, 4]])),
      vec(swallow(), 0.28, 0.4, 0.5, { shadow: PAPER_SHADOW }),
      vec(swallow(true), 0.72, 0.4, 0.5, { shadow: PAPER_SHADOW }),
      vec(roseCluster(), 0.5, 0.74, 0.4, { shadow: PAPER_SHADOW }),
    ],
  },

  // ---- Japan --------------------------------------------------------------------
  {
    key: 'jpn-vague',
    name: 'Grande Vague',
    category: 'Japon',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#efe3c6', grain: 0.35 }),
    layers: [backdrop(greatWave())],
  },
  {
    key: 'jpn-koi',
    name: 'Koï',
    category: 'Japon',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#1f7a80', color2: '#082a33' }),
    layers: [backdrop(koiPond())],
  },

  // ---- Space ------------------------------------------------------------------
  {
    key: 'spc-planete',
    name: 'Planète Anneau',
    category: 'Espace',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#1a2448', color2: '#03050c' }),
    layers: [
      backdrop(nebulaSky(51, 'violet', [16, 14])),
      vec(moon(), 0.13, 0.8, 0.07),
      vec(ringedPlanet(), 0.58, 0.55, 0.84, { rotation: -14 }),
    ],
  },
  {
    key: 'spc-fusee',
    name: 'Décollage',
    category: 'Espace',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#0b1640', color2: '#2a1170', angle: 135 }),
    layers: [
      backdrop(nebulaSky(63, 'blue', [14, 12])),
      vec(moon(), 0.87, 0.2, 0.08),
      backdrop(launchSky()),
      vec(rocket(), 0.6, 0.42, 0.22, { rotation: 32 }),
    ],
  },

  // ---- Parody ID (clearly fictional) ---------------------------------------------
  {
    key: 'par-permis',
    name: 'Permis de Nager',
    category: 'Parodie',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#f6fbff', color2: '#d9eaff', angle: 135 }),
    layers: [
      backdrop(licenceBackdrop()),
      vec(sponge(), 0.178, 0.582, 0.25),
      vec(sponge(), 0.9, 0.62, 0.1, { opacity: 0.2 }),
      vec(holoSeal(), 0.3, 0.8, 0.14),
      backdrop(laminate()),
    ],
  },
]
