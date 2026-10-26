import { text, bg, vec, backdrop, title, type Template } from '../builders'
import { sponge, seaBackdrop, donut, skyClouds, portal, flask, starfield, lazyCat, lasagna, checks, mysteryVan, hauntedNight } from '../art/cartoons'

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
    background: bg({ kind: 'linear', color1: '#6ec6ff', color2: '#2f8fe0', angle: 90 }),
    layers: [
      backdrop(skyClouds()),
      vec(donut(), 0.71, 0.5, 0.36, { rotation: -8 }),
      text('MMMH…', { x: 0.07, y: 0.33, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.12, weight: 400, color: '#ffd23f', shadow: true }),
      text('DONUTS', { x: 0.07, y: 0.5, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.15, weight: 400, color: '#f47fb2', shadow: true }),
      text('glaçage rose, vermicelles en option', { x: 0.07, y: 0.67, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.042, weight: 400, color: '#ffffff' }),
    ],
  },
  {
    key: 'drw-portail',
    name: 'Portail Vert',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'radial', color1: '#16213e', color2: '#05050f' }),
    layers: [
      backdrop(starfield(17)),
      vec(portal(), 0.69, 0.5, 0.42, { sketch: false }),
      vec(flask(), 0.89, 0.7, 0.11, { rotation: 14 }),
      text('PORTAIL', { x: 0.07, y: 0.33, align: 'left', fontFamily: 'Bangers', fontSize: 0.16, weight: 400, letterSpacing: 0.01, color: '#9ef01a', shadow: true }),
      text('VERT', { x: 0.07, y: 0.51, align: 'left', fontFamily: 'Bangers', fontSize: 0.16, weight: 400, letterSpacing: 0.01, color: '#ffffff', shadow: true }),
      text('aller-retour inter-dimensions', { x: 0.07, y: 0.68, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.042, weight: 400, color: '#c9f75a' }),
    ],
  },
  {
    key: 'drw-chat',
    name: 'Chat Lasagne',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'solid', color1: '#fde8c8', grain: 0.15 }),
    layers: [
      vec(checks(), 0.5, 0.95, 1.04, { sketch: false, locked: true }),
      vec(lazyCat(), 0.72, 0.43, 0.38),
      vec(lasagna(), 0.25, 0.73, 0.3),
      text('JE DÉTESTE', { x: 0.06, y: 0.17, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.085, weight: 400, color: '#c0392b' }),
      text('LES LUNDIS', { x: 0.06, y: 0.31, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.085, weight: 400, color: '#1b1712' }),
    ],
  },
  {
    key: 'drw-van',
    name: 'Van Mystère',
    category: 'Dessins',
    badge: 'Animé',
    background: bg({ kind: 'linear', color1: '#1b1036', color2: '#4a3a86', angle: 90 }),
    layers: [
      backdrop(hauntedNight()),
      vec(mysteryVan(), 0.6, 0.63, 0.62),
      text('LE VAN', { x: 0.06, y: 0.15, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.09, weight: 400, color: '#9fe870', shadow: true }),
      text('MYSTÈRE', { x: 0.06, y: 0.28, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.11, weight: 400, color: '#f59e2b', shadow: true }),
    ],
  },
]
