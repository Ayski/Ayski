import { text, bg, vec, backdrop, title, type Template } from '../builders'
import {
  sponge, seaBackdrop, donut, skyClouds, sunnySky, portal, flask, starfield, alienWorld, lazyCat, lasagna, checks, kitchenWall, mysteryVan, ghost, hauntedNight,
} from '../art/cartoons'

export const CARTOON_TEMPLATES: Template[] = [
  {
    key: 'drw-eponge',
    name: 'Éponge des Mers',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'linear', color1: '#55c6f4', color2: '#0a4f8c', angle: 90 }),
    layers: [
      backdrop(seaBackdrop()),
      vec(sponge(), 0.735, 0.615, 0.31, { rotation: 2, shadow: { color: 'rgba(0,30,70,0.35)', blur: 6, dx: 0, dy: 4 } }),
      title('ÉPONGE', { y: 0.31, size: 0.165, color: '#fff35c', color2: '#ffb300' }),
      title('DES MERS', { y: 0.48, size: 0.115, color: '#ffffff', color2: '#cdeeff' }),
      text('« Je suis prêt ! »', { x: 0.075, y: 0.66, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.056, weight: 400, color: '#ffffff', outline: '#0b3a63', outlineWidth: 0.09 }),
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
      backdrop(skyClouds([[22, 11, 0.3], [124, 11, 0.42]])),
      vec(donut(), 0.725, 0.55, 0.42, { rotation: -4, shadow: { color: 'rgba(0,40,90,0.25)', blur: 6, dx: 0, dy: 4 } }),
      title('MMMH…', { y: 0.3, size: 0.12, color: '#fff7b0', color2: '#ffc21a' }),
      title('DONUTS', { y: 0.47, size: 0.165, color: '#ffc6de', color2: '#f2559b' }),
      text('glaçage rose & vermicelles', { x: 0.07, y: 0.645, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.044, weight: 400, color: '#ffffff', outline: '#0f4c8a', outlineWidth: 0.08 }),
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
      vec(portal(), 0.69, 0.47, 0.4, { shadow: { color: 'rgba(120,255,60,0.35)', blur: 10, dx: 0, dy: 0 } }),
      vec(flask(), 0.9, 0.73, 0.1, { rotation: 6 }),
      title('PORTAIL', { y: 0.31, size: 0.17, font: 'Bangers', color: '#dcff66', color2: '#5fd629', letterSpacing: 0.01 }),
      title('VERT', { y: 0.49, size: 0.17, font: 'Bangers', color: '#ffffff', color2: '#c4ecff', letterSpacing: 0.01 }),
      text('aller-retour inter-dimensions', { x: 0.07, y: 0.655, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.042, weight: 400, color: '#c9f75a', outline: '#0b1630', outlineWidth: 0.08 }),
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
      vec(lazyCat(), 0.72, 0.53, 0.42, { shadow: { color: 'rgba(40,20,0,0.25)', blur: 6, dx: 0, dy: 3 } }),
      vec(lasagna(), 0.3, 0.78, 0.3),
      title('JE DÉTESTE', { y: 0.2, size: 0.1, color: '#ffffff', color2: '#ffe2c4' }),
      title('LES LUNDIS', { y: 0.35, size: 0.125, color: '#ffc457', color2: '#f2781e' }),
      text('« Réveillez-moi mardi. »', { x: 0.07, y: 0.495, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.044, weight: 400, color: '#ffffff', outline: '#155a78', outlineWidth: 0.08 }),
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
      vec(ghost(), 0.585, 0.2, 0.075, { rotation: -8, opacity: 0.95 }),
      vec(mysteryVan(), 0.62, 0.7, 0.6, { shadow: { color: 'rgba(0,0,0,0.35)', blur: 6, dx: 0, dy: 4 } }),
      title('LE VAN', { y: 0.17, size: 0.1, color: '#d2ff8a', color2: '#5fcf3a' }),
      title('MYSTÈRE', { y: 0.31, size: 0.135, color: '#ffd96b', color2: '#ff8a1e' }),
      text('enquêtes & frissons', { x: 0.07, y: 0.445, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.044, weight: 400, color: '#ffffff', outline: '#1b1036', outlineWidth: 0.08 }),
    ],
  },
]
