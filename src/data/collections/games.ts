import { text, bg, vec, backdrop, type Template } from '../builders'
import { skyClouds, starfield } from '../art/cartoons'
import { pixelDemon, hellfire, hedgehog, goldRings, checkerHills, pixelMushroom, questionBlock, brickGround, glouton, ghost, maze, grassBlock, pickaxe, crewmate } from '../art/games'

export const GAME_TEMPLATES: Template[] = [
  {
    key: 'drw-enfer',
    name: 'Enfer.exe',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'radial', color1: '#3a0a0a', color2: '#000000' }),
    layers: [
      vec(hellfire(), 0.5, 0.86, 1.04, { sketch: false, locked: true }),
      vec(pixelDemon(), 0.73, 0.4, 0.3, { sketch: false }),
      text('ENFER', { x: 0.07, y: 0.28, align: 'left', fontFamily: 'Press Start 2P', fontSize: 0.1, weight: 400, color: '#ff3b30', shadow: true }),
      text('.EXE', { x: 0.07, y: 0.43, align: 'left', fontFamily: 'Press Start 2P', fontSize: 0.07, weight: 400, color: '#ffc93c', shadow: true }),
      text('MODE CAUCHEMAR', { x: 0.07, y: 0.56, align: 'left', fontFamily: 'Press Start 2P', fontSize: 0.032, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-herisson',
    name: 'Hérisson Turbo',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'linear', color1: '#2f7bff', color2: '#bfe8ff', angle: 90 }),
    layers: [
      backdrop(checkerHills()),
      vec(hedgehog(), 0.67, 0.42, 0.36),
      vec(goldRings(), 0.2, 0.6, 0.26, { sketch: false }),
      text('TURBO!', { x: 0.06, y: 0.2, align: 'left', fontFamily: 'Bangers', fontSize: 0.16, weight: 400, letterSpacing: 0.01, color: '#ffe14d', shadow: true }),
      text('plus rapide que ton banquier', { x: 0.06, y: 0.36, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.042, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-champi',
    name: 'Champi 1-UP',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'solid', color1: '#5c94fc' }),
    layers: [
      vec(brickGround(), 0.5, 0.93, 1.02, { sketch: false, locked: true }),
      vec(skyClouds([[22, 18, 0.5], [142, 16, 0.42]]), 0.5, 0.5, 1, { sketch: false, locked: true }),
      vec(pixelMushroom(), 0.28, 0.655, 0.22, { sketch: false }),
      vec(questionBlock(), 0.64, 0.3, 0.12, { sketch: false }),
      text('?', { x: 0.64, y: 0.31, fontFamily: 'Press Start 2P', fontSize: 0.1, weight: 400, color: '#7a3b00' }),
      text('1-UP', { x: 0.7, y: 0.6, fontFamily: 'Press Start 2P', fontSize: 0.1, weight: 400, color: '#ffffff', shadow: true }),
      text('UNE VIE EN PLUS', { x: 0.7, y: 0.73, fontFamily: 'Press Start 2P', fontSize: 0.03, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-glouton',
    name: 'Glouton',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'solid', color1: '#000000' }),
    layers: [
      backdrop(maze()),
      vec(glouton(), 0.45, 0.5, 0.62, { sketch: false }),
      vec(ghost('#ff3b3b'), 0.86, 0.5, 0.12, { sketch: false }),
      text('GLOUTON', { x: 0.5, y: 0.09, fontFamily: 'Press Start 2P', fontSize: 0.055, weight: 400, color: '#ffe600' }),
      text('HI-SCORE 999990', { x: 0.5, y: 0.92, fontFamily: 'Press Start 2P', fontSize: 0.032, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-bloc',
    name: 'Bloc Creuseur',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'linear', color1: '#7ec8ff', color2: '#d2f0ff', angle: 90 }),
    layers: [
      vec(grassBlock(), 0.27, 0.55, 0.3, { sketch: false }),
      vec(pickaxe(), 0.68, 0.6, 0.26, { sketch: false }),
      text('CREUSE.', { x: 0.94, y: 0.18, align: 'right', fontFamily: 'Press Start 2P', fontSize: 0.07, weight: 400, color: '#ffffff', shadow: true }),
      text('POSE.', { x: 0.94, y: 0.32, align: 'right', fontFamily: 'Press Start 2P', fontSize: 0.07, weight: 400, color: '#3f8f2a', shadow: true }),
    ],
  },
  {
    key: 'drw-suspect',
    name: 'Suspect',
    category: 'Dessins',
    badge: 'Jeu',
    background: bg({ kind: 'radial', color1: '#1b1f3b', color2: '#05060f' }),
    layers: [
      backdrop(starfield(29)),
      vec(crewmate(), 0.73, 0.52, 0.26),
      text('SUS', { x: 0.07, y: 0.3, align: 'left', fontFamily: 'Bangers', fontSize: 0.22, weight: 400, letterSpacing: 0.02, color: '#d7263d', shadow: true }),
      text("C'ÉTAIT PAS MOI", { x: 0.07, y: 0.53, align: 'left', fontFamily: 'Bangers', fontSize: 0.075, weight: 400, letterSpacing: 0.01, color: '#ffffff' }),
      text('(…peut-être un peu)', { x: 0.07, y: 0.66, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.045, weight: 400, color: '#9fd9f2' }),
    ],
  },
]
