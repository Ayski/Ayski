import { bg, vec, backdrop, type Template } from '../builders'
import { starfield } from '../art/cartoons'
import {
  pixelDemon, hellScene, hedgehog, goldRings, hillZone, pixelMushroom, questionBlock, brickBlock, warpPipe, mushroomKingdom,
  glouton, ghost, neonMaze, grassBlock, pickaxe, blockWorld, crewmate, spaceScene,
} from '../art/games'

export const GAME_TEMPLATES: Template[] = [
  {
    key: 'drw-enfer',
    name: 'Enfer.exe',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'radial', color1: '#4a0d0a', color2: '#0a0102' }),
    layers: [
      backdrop(hellScene()),
      vec(pixelDemon(), 0.52, 0.44, 0.39),
    ],
  },
  {
    key: 'drw-herisson',
    name: 'Hérisson Turbo',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'linear', color1: '#2a6ff0', color2: '#c4e9ff', angle: 90 }),
    layers: [
      backdrop(hillZone()),
      backdrop(goldRings()),
      vec(hedgehog(), 0.5, 0.47, 0.5, { rotation: 5, shadow: { color: 'rgba(0,30,80,0.28)', blur: 6, dx: 3, dy: 4 } }),
    ],
  },
  {
    key: 'drw-champi',
    name: 'Champi 1-UP',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'linear', color1: '#4f8cfa', color2: '#a9d2ff', angle: 90 }),
    layers: [
      backdrop(mushroomKingdom()),
      vec(warpPipe(), 0.89, 0.674, 0.12),
      vec(brickBlock(), 0.4, 0.19, 0.1, { shadow: { color: 'rgba(40,20,0,0.3)', blur: 4, dx: 2, dy: 3 } }),
      vec(questionBlock(), 0.5, 0.17, 0.1, { shadow: { color: 'rgba(40,20,0,0.35)', blur: 4, dx: 2, dy: 3 } }),
      vec(brickBlock(), 0.6, 0.19, 0.1, { shadow: { color: 'rgba(40,20,0,0.3)', blur: 4, dx: 2, dy: 3 } }),
      vec(pixelMushroom(), 0.5, 0.616, 0.3, { shadow: { color: 'rgba(20,40,80,0.3)', blur: 5, dx: 3, dy: 3 } }),
    ],
  },
  {
    key: 'drw-glouton',
    name: 'Glouton',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'solid', color1: '#05060f' }),
    layers: [
      backdrop(neonMaze()),
      vec(glouton(), 0.27, 0.51, 0.27),
      vec(ghost('#ff7ad9'), 0.87, 0.48, 0.125),
      vec(ghost('#ff3b3b'), 0.75, 0.505, 0.15),
    ],
  },
  {
    key: 'drw-bloc',
    name: 'Bloc Creuseur',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'linear', color1: '#6fb9f5', color2: '#d4efff', angle: 90 }),
    layers: [
      backdrop(blockWorld()),
      vec(grassBlock(), 0.35, 0.44, 0.36),
      vec(pickaxe(), 0.74, 0.45, 0.34, { rotation: -8 }),
    ],
  },
  {
    key: 'drw-suspect',
    name: 'Suspect',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'radial', color1: '#1d2250', color2: '#04050d' }),
    layers: [
      backdrop(starfield(29)),
      backdrop(spaceScene()),
      vec(crewmate(), 0.5, 0.47, 0.36, { rotation: 14, shadow: { color: 'rgba(0,0,0,0.5)', blur: 8, dx: 4, dy: 6 } }),
    ],
  },
]
