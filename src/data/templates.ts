import { CARD_ASPECT, uid, type CardProject, type Layer } from '../types'
import { SIGNATURE_TEMPLATES } from './collections/signature'
import { CARTOON_TEMPLATES } from './collections/cartoons'
import { GAME_TEMPLATES } from './collections/games'
import { CHARACTER_TEMPLATES } from './collections/characters'
import { SCENE_TEMPLATES } from './collections/scenes'
import { CORE_V2 } from './collections/core'

import type { Template } from './builders'

export type { Template } from './builders'

export const TEMPLATES: Template[] = [
  ...CORE_V2,
  ...SIGNATURE_TEMPLATES,
  ...CARTOON_TEMPLATES,
  ...GAME_TEMPLATES,
  ...CHARACTER_TEMPLATES,
  ...SCENE_TEMPLATES,
]

export const NEW_FILTER = 'Nouveautés'

const FEATURED = ['Dessins', 'Personnages']
const ALL_CATEGORIES = Array.from(new Set(TEMPLATES.map((t) => t.category)))

export const CATEGORIES: string[] = [
  'Tous',
  NEW_FILTER,
  ...FEATURED.filter((c) => ALL_CATEGORIES.includes(c)),
  ...ALL_CATEGORIES.filter((c) => !FEATURED.includes(c)),
]

// Thumbnails reuse one stable project per template so grids do not re-render
// every card on each keystroke (templateToProject creates fresh ids each call).
const previewCache = new WeakMap<Template, CardProject>()
export function templatePreview(t: Template): CardProject {
  let p = previewCache.get(t)
  if (!p) {
    p = templateToProject(t)
    previewCache.set(t, p)
  }
  return p
}

export function templateToProject(t: Template): CardProject {
  // deep clone layers and give fresh ids
  const layers: Layer[] = JSON.parse(JSON.stringify(t.layers))
  layers.forEach((l) => (l.id = uid()))
  return {
    id: uid(),
    name: t.name,
    category: t.category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false,
    aspect: CARD_ASPECT,
    background: JSON.parse(JSON.stringify(t.background)),
    layers,
  }
}

export function blankProject(name = 'Nouveau design'): CardProject {
  return {
    id: uid(),
    name,
    category: 'Custom Photo',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    favorite: false,
    aspect: CARD_ASPECT,
    background: {
      kind: 'linear',
      color1: '#171923',
      color2: '#08090D',
      angle: 135,
      finish: 'matte',
      grain: 0,
      glow: 0.2,
    },
    layers: [],
  }
}
