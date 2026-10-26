import type { Template } from '../builders'
import { CORE_LUX } from './core-lux'
import { CORE_VIVID } from './core-vivid'

// The 30 original templates, kept in their historical order (favourites and
// categories rely on these keys).
const ORDER = [
  'black-onyx',
  'black-eclipse',
  'gold-imperial',
  'gold-royale',
  'silver-titan',
  'silver-frost',
  'carbon-apex',
  'carbon-stealth',
  'minimal-pure',
  'minimal-line',
  'cyber-grid',
  'cyber-glitch',
  'neon-pulse',
  'neon-miami',
  'abstract-flux',
  'abstract-wave',
  'marble-noir',
  'marble-blanc',
  'nature-forest',
  'nature-sunset',
  'gaming-arena',
  'gaming-pixel',
  'anime-sakura',
  'manga-ink',
  'street-tag',
  'vintage-retro',
  'glass-aqua',
  'gradient-aurora',
  'geo-prism',
  'futur-nexus',
]

const ALL = new Map([...CORE_LUX, ...CORE_VIVID].map((t) => [t.key, t]))
export const CORE_V2: Template[] = ORDER.map((k) => ALL.get(k)).filter((t): t is Template => Boolean(t))
