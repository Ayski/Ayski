import { text, shape, bg, vec, backdrop, type Template } from '../builders'
import { sponge, starfield } from '../art/cartoons'
import { comicsBurst, comicsBackdrop, actionLines, heroShield, speechBubble, outrun, palm, tattooHeart, swallow, tattooStars, greatWave, koi, ripples, ringedPlanet, rocket, idPattern } from '../art/scenes'

export const SCENE_TEMPLATES: Template[] = [
  // ---- Comics ---------------------------------------------------------------
  {
    key: 'cmx-boom',
    name: 'BOOM!',
    category: 'Comics',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#ffd23f' }),
    layers: [
      backdrop(comicsBackdrop('rgba(230,57,70,0.35)')),
      backdrop(actionLines()),
      vec(comicsBurst(), 0.5, 0.5, 0.7),
      text('BOOM!', { y: 0.52, fontFamily: 'Bangers', fontSize: 0.26, weight: 400, letterSpacing: 0.02, color: '#ffffff', shadow: true, rotation: -6 }),
    ],
  },
  {
    key: 'cmx-heros',
    name: 'Super Carte',
    category: 'Comics',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#4cc9f0', color2: '#4361ee', angle: 135 }),
    layers: [
      backdrop(comicsBackdrop('rgba(255,255,255,0.16)')),
      backdrop(actionLines('rgba(255,255,255,0.22)')),
      vec(heroShield(), 0.25, 0.53, 0.28),
      vec(speechBubble(), 0.68, 0.34, 0.54),
      text("C'EST MOI QUI", { x: 0.69, y: 0.25, fontFamily: 'Bangers', fontSize: 0.075, weight: 400, letterSpacing: 0.01, color: '#1b1712' }),
      text('PAIE !', { x: 0.69, y: 0.38, fontFamily: 'Bangers', fontSize: 0.1, weight: 400, letterSpacing: 0.01, color: '#e63946' }),
      text('SUPER CARTE', { x: 0.69, y: 0.79, fontFamily: 'Bangers', fontSize: 0.1, weight: 400, letterSpacing: 0.02, color: '#ffe066', shadow: true }),
    ],
  },

  // ---- Synthwave --------------------------------------------------------------
  {
    key: 'syn-outrun',
    name: 'Outrun',
    category: 'Synthwave',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#12002b', color2: '#4a0a5e', angle: 90 }),
    layers: [
      backdrop(outrun()),
      text('OUTRUN', { y: 0.86, fontFamily: 'Bangers', fontSize: 0.12, weight: 400, letterSpacing: 0.04, color: '#5ef0ff', shadow: true }),
    ],
  },
  {
    key: 'syn-palmier',
    name: 'Nuit Néon',
    category: 'Synthwave',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#3a0d6b', color2: '#ff6ec7', angle: 90 }),
    layers: [
      backdrop(outrun()),
      vec(palm(), 0.1, 0.5, 0.22, { sketch: false }),
      vec(palm(), 0.92, 0.56, 0.2, { sketch: false, rotation: 6 }),
      text('NUIT NÉON', { y: 0.86, fontFamily: 'Permanent Marker', fontSize: 0.09, weight: 400, color: '#ffe66d', shadow: true }),
    ],
  },

  // ---- Old-school tattoo ------------------------------------------------------
  {
    key: 'tat-maman',
    name: 'Cœur Maman',
    category: 'Tatouage',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#f3e6c8', grain: 0.3 }),
    layers: [
      backdrop(tattooStars()),
      vec(tattooHeart(), 0.5, 0.5, 0.52),
      text('MAMAN', { y: 0.55, fontFamily: 'DM Serif Display', fontSize: 0.085, weight: 400, letterSpacing: 0.02, color: '#1b1712' }),
    ],
  },
  {
    key: 'tat-hirondelle',
    name: 'Hirondelle',
    category: 'Tatouage',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#efe3c8', grain: 0.3 }),
    layers: [
      backdrop(tattooStars()),
      vec(swallow(), 0.52, 0.42, 0.6),
      text('LIBERTÉ', { y: 0.87, fontFamily: 'DM Serif Display', fontSize: 0.085, weight: 400, letterSpacing: 0.03, color: '#1d3557' }),
    ],
  },

  // ---- Japan --------------------------------------------------------------------
  {
    key: 'jpn-vague',
    name: 'Grande Vague',
    category: 'Japon',
    badge: 'Nouveau',
    background: bg({ kind: 'solid', color1: '#f1e4c8', grain: 0.35 }),
    layers: [
      backdrop(greatWave()),
      text('VAGUE', { x: 0.06, y: 0.13, align: 'left', fontFamily: 'DM Serif Display', fontSize: 0.075, weight: 400, letterSpacing: 0.02, color: '#1d3f72' }),
    ],
  },
  {
    key: 'jpn-koi',
    name: 'Koï',
    category: 'Japon',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#1f6f78', color2: '#0b2f36' }),
    layers: [
      backdrop(ripples()),
      vec(koi(), 0.52, 0.52, 0.6, { rotation: -8 }),
      text('KOÏ', { x: 0.07, y: 0.85, align: 'left', fontFamily: 'DM Serif Display', fontSize: 0.08, weight: 400, letterSpacing: 0.03, color: '#ffe9d6' }),
    ],
  },

  // ---- Space ------------------------------------------------------------------
  {
    key: 'spc-planete',
    name: 'Planète Anneau',
    category: 'Espace',
    badge: 'Nouveau',
    background: bg({ kind: 'radial', color1: '#1b2a4a', color2: '#03050c' }),
    layers: [
      backdrop(starfield(51)),
      vec(ringedPlanet(), 0.63, 0.52, 0.6, { rotation: -12 }),
      text('ORBITE', { x: 0.06, y: 0.14, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.075, weight: 700, letterSpacing: 0.03, color: '#e9c46a' }),
    ],
  },
  {
    key: 'spc-fusee',
    name: 'Décollage',
    category: 'Espace',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#0b1d51', color2: '#311b92', angle: 135 }),
    layers: [
      backdrop(starfield(63)),
      vec(rocket(), 0.74, 0.5, 0.2, { rotation: 28 }),
      text('DÉCOLLAGE', { x: 0.06, y: 0.3, align: 'left', fontFamily: 'Bangers', fontSize: 0.13, weight: 400, letterSpacing: 0.01, color: '#ffffff', shadow: true }),
      text('IMMÉDIAT', { x: 0.06, y: 0.47, align: 'left', fontFamily: 'Bangers', fontSize: 0.13, weight: 400, letterSpacing: 0.01, color: '#ffe066', shadow: true }),
      text('3… 2… 1…', { x: 0.06, y: 0.65, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.055, weight: 400, color: '#4dabf7' }),
    ],
  },

  // ---- Parody ID (clearly fictional) ---------------------------------------------
  {
    key: 'par-permis',
    name: 'Permis de Nager',
    category: 'Parodie',
    badge: 'Nouveau',
    background: bg({ kind: 'linear', color1: '#eef6ff', color2: '#cfe4ff', angle: 135, finish: 'gloss' }),
    layers: [
      backdrop(idPattern()),
      text('PERMIS DE NAGER', { x: 0.05, y: 0.11, align: 'left', fontFamily: 'Oswald', fontSize: 0.085, weight: 700, letterSpacing: 0.01, color: '#ffffff' }),
      text('FOND MARIN', { x: 0.95, y: 0.11, align: 'right', fontFamily: 'Oswald', fontSize: 0.05, weight: 600, color: '#bfdbfe' }),
      shape({ shape: 'roundRect', x: 0.19, y: 0.6, width: 0.26, height: 0.6, fill: '#ffffff', stroke: '#1d4ed8', strokeWidth: 0.004, cornerRadius: 0.015 }),
      vec(sponge(), 0.19, 0.6, 0.21),
      text('NOM : L’ÉPONGE', { x: 0.37, y: 0.33, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.045, weight: 700, color: '#0f172a' }),
      text('ADRESSE : 124 rue de l’Ananas', { x: 0.37, y: 0.44, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.04, weight: 500, color: '#0f172a' }),
      text('CATÉGORIE : pêche aux méduses', { x: 0.37, y: 0.54, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.04, weight: 500, color: '#0f172a' }),
      text('VALABLE : pour toujours', { x: 0.37, y: 0.64, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.04, weight: 500, color: '#0f172a' }),
      text('L’Éponge', { x: 0.37, y: 0.82, align: 'left', fontFamily: 'Permanent Marker', fontSize: 0.075, weight: 400, color: '#1d4ed8', rotation: -4 }),
    ],
  },
]
