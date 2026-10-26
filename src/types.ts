// Shared data model for Card Skin Studio.
// Positions/sizes are normalized (0..1) relative to the card bounding box so a
// project renders identically at any resolution (live preview and export).

export type LayerType = 'image' | 'text' | 'shape'

export interface BaseLayer {
  id: string
  type: LayerType
  name: string
  x: number // center X, normalized 0..1
  y: number // center Y, normalized 0..1
  scale: number // multiplier
  rotation: number // degrees
  opacity: number // 0..1
  locked: boolean
  visible: boolean
}

export interface ImageLayer extends BaseLayer {
  type: 'image'
  src: string // dataURL (downscaled on import)
  naturalWidth: number
  naturalHeight: number
  // CSS-filter style adjustments (percent / deg / px)
  brightness: number // 100 = neutral
  contrast: number // 100 = neutral
  saturation: number // 100 = neutral
  hue: number // 0 deg neutral
  blur: number // px
  preset: FilterPreset
  fit: number // base width as fraction of card width (before scale)
}

export type FilterPreset =
  | 'none'
  | 'noir'
  | 'mono'
  | 'warm'
  | 'cool'
  | 'vivid'
  | 'fade'
  | 'sepia'

export interface TextLayer extends BaseLayer {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number // fraction of card height
  color: string
  align: CanvasTextAlign
  letterSpacing: number // fraction of card width
  weight: number // 400..800
  italic: boolean
  shadow: boolean
}

export type ShapeKind = 'rect' | 'roundRect' | 'circle' | 'line' | 'triangle'

export interface ShapeLayer extends BaseLayer {
  type: 'shape'
  shape: ShapeKind
  width: number // fraction of card width
  height: number // fraction of card height
  fill: string
  stroke: string
  strokeWidth: number // fraction of card width
  cornerRadius: number // fraction of card width
}

export type Layer = ImageLayer | TextLayer | ShapeLayer

export type Finish =
  | 'matte'
  | 'gloss'
  | 'gold'
  | 'silver'
  | 'carbon'
  | 'glass'
  | 'black'

export interface Background {
  kind: 'solid' | 'linear' | 'radial'
  color1: string
  color2: string
  angle: number // deg
  finish: Finish
  grain: number // 0..1
  glow: number // 0..1 directional sheen strength
}

export interface CardProject {
  id: string
  name: string
  category: string
  createdAt: number
  updatedAt: number
  favorite: boolean
  aspect: number // width / height
  background: Background
  layers: Layer[]
  thumbnail?: string // small dataURL cache
}

export const CARD_ASPECT = 1.586 // ISO/IEC 7810 ID-1 (85.6 × 53.98 mm)

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
