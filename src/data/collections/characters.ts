import { text, shape, bg, vec, A, type Template } from '../builders'
import { knight, wizard, ninja, robot, dragon, pirateGhost } from '../art/characters'
import type { Finish, Layer } from '../../types'
import { INK, star as starPath, type Art } from '../art/kit'

interface CharacterCard {
  key: string
  name: string
  kind: string
  art: Art
  colors: [string, string]
  accent: string
  stats: [string, number][]
  stars: number
  rarity: string
  finish?: Finish
}

// Collectible trading-card layout: framed portrait, name, type, stat bars, stars.
function characterCard(c: CharacterCard): Template {
  const starsArt: Art = {
    viewW: 100,
    viewH: 22,
    paths: [
      {
        d: Array.from({ length: c.stars }, (_, i) => starPath(90 - i * 20, 11, 9, 4)).join(''),
        fill: c.accent,
        stroke: INK,
        sw: 1.6,
      },
    ],
  }
  const layers: Layer[] = [
    shape({ shape: 'roundRect', x: 0.5, y: 0.5, width: 0.95, height: 0.91, fill: 'rgba(0,0,0,0)', stroke: c.accent, strokeWidth: 0.006, cornerRadius: 0.05 }),
    shape({ shape: 'roundRect', x: 0.27, y: 0.52, width: 0.4, height: 0.76, fill: 'rgba(255,255,255,0.08)', stroke: c.accent, strokeWidth: 0.004, cornerRadius: 0.03 }),
    shape({ shape: 'circle', x: 0.27, y: 0.5, width: 0.32, height: 0.32 * A, fill: c.accent, opacity: 0.22 }),
    vec(c.art, 0.27, 0.53, 0.29),
    vec(starsArt, 0.82, 0.875, 0.17, { sketch: false }),
    text(c.name, { x: 0.52, y: 0.21, align: 'left', fontFamily: 'Luckiest Guy', fontSize: 0.09, weight: 400, color: '#ffffff', shadow: true }),
    text(c.kind, { x: 0.52, y: 0.33, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.042, weight: 700, letterSpacing: 0.004, color: c.accent }),
  ]
  c.stats.forEach(([label, v], i) => {
    const y = 0.5 + i * 0.13
    layers.push(
      text(`${label} ${v}`, { x: 0.52, y, align: 'left', fontFamily: 'Space Grotesk', fontSize: 0.042, weight: 700, color: '#ffffff' }),
      shape({ shape: 'roundRect', x: 0.795, y, width: 0.25, height: 0.045, fill: 'rgba(255,255,255,0.16)', cornerRadius: 0.01 }),
      shape({ shape: 'roundRect', x: 0.67 + (0.25 * v) / 200, y, width: (0.25 * v) / 100, height: 0.045, fill: c.accent, cornerRadius: 0.01 }),
    )
  })
  return {
    key: c.key,
    name: c.name,
    category: 'Personnages',
    badge: c.rarity,
    background: bg({ kind: 'radial', color1: c.colors[0], color2: c.colors[1], finish: c.finish ?? 'gloss', glow: 0.35, grain: 0.08 }),
    layers,
  }
}

export const CHARACTER_TEMPLATES: Template[] = [
  characterCard({
    key: 'chr-chevalier',
    name: 'Sire Boulon',
    kind: 'CHEVALIER · ACIER',
    art: knight(),
    colors: ['#1e3a5f', '#0b1626'],
    accent: '#ffd166',
    stats: [['ATK', 82], ['DEF', 96], ['VIT', 41]],
    stars: 3,
    rarity: 'Rare',
  }),
  characterCard({
    key: 'chr-mage',
    name: 'Mage Zéphyr',
    kind: 'MAGE · COSMOS',
    art: wizard(),
    colors: ['#3c1a78', '#12062b'],
    accent: '#c7a6ff',
    stats: [['MAG', 98], ['DEF', 38], ['VIT', 64]],
    stars: 4,
    rarity: 'Épique',
  }),
  characterCard({
    key: 'chr-ninja',
    name: 'Kagero',
    kind: 'NINJA · OMBRE',
    art: ninja(),
    colors: ['#2b2b33', '#0a0a0d'],
    accent: '#ff4d4d',
    stats: [['ATK', 88], ['DEF', 52], ['VIT', 99]],
    stars: 4,
    rarity: 'Épique',
  }),
  characterCard({
    key: 'chr-robot',
    name: 'R-0B1N',
    kind: 'ROBOT · ROUILLE',
    art: robot(),
    colors: ['#334155', '#0f172a'],
    accent: '#5ef0ff',
    stats: [['ATK', 70], ['DEF', 90], ['VIT', 30]],
    stars: 2,
    rarity: 'Commun',
  }),
  characterCard({
    key: 'chr-dragon',
    name: 'Aurum',
    kind: 'DRAGON · OR',
    art: dragon(),
    colors: ['#6b4500', '#1a1000'],
    accent: '#ffd84d',
    stats: [['ATK', 99], ['DEF', 88], ['VIT', 77]],
    stars: 5,
    rarity: 'Légendaire',
    finish: 'gold',
  }),
  characterCard({
    key: 'chr-pirate',
    name: 'Cap. Brume',
    kind: 'SPECTRE · MER',
    art: pirateGhost(),
    colors: ['#0f3b4a', '#041318'],
    accent: '#8fe3ff',
    stats: [['ATK', 66], ['DEF', 48], ['VIT', 85]],
    stars: 3,
    rarity: 'Rare',
  }),
]
