// Shared data model for Card Skin Studio.
// Positions/sizes are normalized (0..1) relative to the card bounding box so a
// project renders identically at any resolution (live preview and export).

export type LayerType = 'image' | 'text' | 'shape' | 'draw'

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

// A freehand stroke. `points` are flattened [x0,y0,x1,y1,...] normalized to the
// card (0..1). `width` is a fraction of the card width so it scales on export.
export interface DrawStroke {
  color: string
  width: number
  points: number[]
}

export interface DrawLayer extends BaseLayer {
  type: 'draw'
  strokes: DrawStroke[]
}

export type Layer = ImageLayer | TextLayer | ShapeLayer | DrawLayer

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

// A single side of the card.
export interface CardFace {
  background: Background
  layers: Layer[]
}

export type FaceKey = 'front' | 'back'

export interface CardProject {
  id: string
  name: string
  category: string
  createdAt: number
  updatedAt: number
  favorite: boolean
  aspect: number // width / height
  // The front face is stored at the top level (keeps older saved projects valid).
  background: Background
  layers: Layer[]
  // The back face is optional; created on demand when first edited.
  back?: CardFace
  thumbnail?: string // small dataURL cache
}

export const CARD_ASPECT = 1.586 // ISO/IEC 7810 ID-1 (85.6 × 53.98 mm)

export function defaultBackBackground(): Background {
  return {
    kind: 'linear',
    color1: '#101218',
    color2: '#070809',
    angle: 115,
    finish: 'matte',
    grain: 0,
    glow: 0.15,
  }
}

// Read a face from a project (front is top-level; back may be absent).
export function readFace(p: CardProject, which: FaceKey): CardFace {
  if (which === 'back') return p.back ?? { background: defaultBackBackground(), layers: [] }
  return { background: p.background, layers: p.layers }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
