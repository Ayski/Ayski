import { backdrop, bg, vec, type Template } from '../builders'
import { contactlessArt } from '../art/cardparts'
import { glitchField, heartbeat, liquidBlobs, miamiSunset, neonCity, pineForest, sunsetSea, waveBands } from '../art/core-vivid'
import { arenaStage, aurora, esportsEmblem, graffitiWall, mangaPanel, nexusCore, pixelLandscape, prism, sakuraBranch, seventies } from '../art/core-world'

// Colourful / illustrated originals (Cyber, Neon, Abstract, Nature, Gaming, Anime,
// Manga, Street, Vintage, Gradient, Geometric, Futuristic). No text on the cards.

function contactless(color: string, x = 0.885, y = 0.45) {
  return vec(contactlessArt(color), x, y, 0.04)
}

export const CORE_VIVID: Template[] = [
  {
    key: 'cyber-grid',
    name: 'Grid Runner',
    category: 'Cyberpunk',
    background: bg({ kind: 'linear', color1: '#1a0533', color2: '#05010d', angle: 90 }),
    layers: [
      backdrop(neonCity()),
      contactless('rgba(255,122,217,0.9)', 0.9, 0.16),
    ],
  },
  {
    key: 'cyber-glitch',
    name: 'Glitch',
    category: 'Cyberpunk',
    background: bg({ kind: 'linear', color1: '#2a0845', color2: '#0a0220', angle: 45 }),
    layers: [
      backdrop(glitchField()),
    ],
  },
  {
    key: 'neon-pulse',
    name: 'Pulse',
    category: 'Neon',
    background: bg({ kind: 'radial', color1: '#160630', color2: '#05010d' }),
    layers: [
      backdrop(heartbeat()),
    ],
  },
  {
    key: 'neon-miami',
    name: 'Miami',
    category: 'Neon',
    background: bg({ kind: 'linear', color1: '#ff7a59', color2: '#3a0d6b', angle: 90 }),
    layers: [
      backdrop(miamiSunset()),
    ],
  },
  {
    key: 'abstract-flux',
    name: 'Flux',
    category: 'Abstract',
    background: bg({ kind: 'linear', color1: '#1b1f3a', color2: '#0b0e1d', angle: 135 }),
    layers: [
      backdrop(liquidBlobs()),
    ],
  },
  {
    key: 'abstract-wave',
    name: 'Wave',
    category: 'Abstract',
    background: bg({ kind: 'linear', color1: '#d6f7ff', color2: '#7fdcef', angle: 90 }),
    layers: [
      backdrop(waveBands()),
    ],
  },
  {
    key: 'nature-forest',
    name: 'Forêt',
    category: 'Nature',
    background: bg({ kind: 'linear', color1: '#a9c4bd', color2: '#4a6b66', angle: 90 }),
    layers: [
      backdrop(pineForest()),
    ],
  },
  {
    key: 'nature-sunset',
    name: 'Coucher',
    category: 'Nature',
    background: bg({ kind: 'linear', color1: '#ffb38a', color2: '#8a3f74', angle: 90 }),
    layers: [
      backdrop(sunsetSea()),
    ],
  },
  {
    key: 'gaming-arena',
    name: 'Arena',
    category: 'Gaming',
    background: bg({ kind: 'radial', color1: '#0d1b3a', color2: '#030714' }),
    layers: [
      backdrop(arenaStage()),
      vec(esportsEmblem(), 0.5, 0.41, 0.27, { shadow: { color: 'rgba(0,10,40,0.6)', blur: 6, dx: 0, dy: 4 } }),
    ],
  },
  {
    key: 'gaming-pixel',
    name: 'Pixel',
    category: 'Gaming',
    background: bg({ kind: 'solid', color1: '#3b4cca' }),
    layers: [
      backdrop(pixelLandscape()),
    ],
  },
  {
    key: 'anime-sakura',
    name: 'Sakura',
    category: 'Anime',
    background: bg({ kind: 'linear', color1: '#fff0f5', color2: '#ffc6da', angle: 90 }),
    layers: [
      backdrop(sakuraBranch()),
    ],
  },
  {
    key: 'manga-ink',
    name: 'Encre',
    category: 'Manga',
    background: bg({ kind: 'solid', color1: '#f6f5f0' }),
    layers: [
      backdrop(mangaPanel()),
    ],
  },
  {
    key: 'street-tag',
    name: 'Tag',
    category: 'Streetwear',
    background: bg({ kind: 'linear', color1: '#2c2c31', color2: '#151517', angle: 90, grain: 0.3 }),
    layers: [
      backdrop(graffitiWall()),
    ],
  },
  {
    key: 'vintage-retro',
    name: 'Retro 70',
    category: 'Vintage',
    background: bg({ kind: 'solid', color1: '#f6e7c8', grain: 0.3 }),
    layers: [
      backdrop(seventies()),
    ],
  },
  {
    key: 'gradient-aurora',
    name: 'Aurora',
    category: 'Gradient',
    background: bg({ kind: 'linear', color1: '#0d1f3d', color2: '#020611', angle: 90 }),
    layers: [
      backdrop(aurora()),
    ],
  },
  {
    key: 'geo-prism',
    name: 'Prism',
    category: 'Geometric',
    background: bg({ kind: 'radial', color1: '#1a1d2b', color2: '#05060a' }),
    layers: [
      backdrop(prism()),
    ],
  },
  {
    key: 'futur-nexus',
    name: 'Nexus',
    category: 'Futuristic',
    background: bg({ kind: 'radial', color1: '#0b2238', color2: '#020812' }),
    layers: [
      backdrop(nexusCore()),
    ],
  },
]
