import { CARD_ASPECT, type Background, type DrawStroke, type Layer, type VectorPath, type VectorShadow } from '../types'
import type { Art } from './art/kit'
import { chipArt, contactlessArt, type Metal } from './art/cardparts'

// Shared building blocks used by every template collection.

export interface Template {
  key: string
  name: string
  category: string
  background: Background
  layers: Layer[]
  badge?: string
}

// ---- small layer builders ---------------------------------------------------
let seq = 0
export function lid(p: string) {
  return `${p}-${seq++}`
}

export function text(
  t: string,
  opts: Partial<Layer> & { fontFamily?: string } = {},
): Layer {
  return {
    id: lid('t'),
    type: 'text',
    name: `Texte « ${t.slice(0, 12)} »`,
    x: 0.5,
    y: 0.8,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: t,
    fontFamily: 'Inter',
    fontSize: 0.1,
    color: '#F5F5F7',
    align: 'center',
    letterSpacing: 0,
    weight: 700,
    italic: false,
    shadow: false,
    ...(opts as object),
  } as Layer
}

export function shape(opts: Partial<Layer>): Layer {
  return {
    id: lid('s'),
    type: 'shape',
    name: 'Forme',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    shape: 'roundRect',
    width: 0.3,
    height: 0.3,
    fill: '#D9B45B',
    stroke: '#00000000',
    strokeWidth: 0,
    cornerRadius: 0.04,
    ...(opts as object),
  } as Layer
}

export function bg(b: Partial<Background>): Background {
  return {
    kind: 'linear',
    color1: '#171923',
    color2: '#08090D',
    angle: 135,
    finish: 'matte',
    grain: 0,
    glow: 0,
    ...b,
  }
}

// ---- vector motif builders (drawn as "draw" layers) -------------------------
// Coordinates are normalized to the card; y radii are multiplied by the aspect
// ratio so circles stay round on a card-shaped canvas.
export const A = CARD_ASPECT

export function motif(strokes: DrawStroke[], opacity = 1): Layer {
  return {
    id: lid('d'),
    type: 'draw',
    name: 'Motif',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    opacity,
    locked: false,
    visible: true,
    strokes,
  } as Layer
}

export function seg(x1: number, y1: number, x2: number, y2: number, color: string, width: number): DrawStroke {
  return { color, width, points: [x1, y1, x2, y2] }
}

export function wave(y: number, amp: number, cycles: number, color: string, width: number, phase = 0): DrawStroke {
  const points: number[] = []
  const steps = 90
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push(-0.02 + 1.04 * t, y + amp * Math.sin((t * cycles + phase) * Math.PI * 2))
  }
  return { color, width, points }
}

export function ring(cx: number, cy: number, r: number, color: string, width: number): DrawStroke {
  const points: number[] = []
  const steps = 96
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    points.push(cx + r * Math.cos(a), cy + r * A * Math.sin(a))
  }
  return { color, width, points }
}

export function arc(cx: number, cy: number, r: number, a0: number, a1: number, color: string, width: number): DrawStroke {
  const points: number[] = []
  const steps = 28
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    points.push(cx + r * Math.cos(a), cy + r * A * Math.sin(a))
  }
  return { color, width, points }
}

// Spirograph-like engraving, as found on premium metal cards.
export function guilloche(color: string, width: number, n: number, cx = 0.5, cy = 0.5, r = 0.3, off = 0.09): DrawStroke[] {
  const out: DrawStroke[] = []
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2
    out.push(ring(cx + off * Math.cos(t), cy + off * A * Math.sin(t), r, color, width))
  }
  return out
}

// Fine horizontal hairlines that read as brushed metal.
export function brushed(color: string, count: number): DrawStroke[] {
  const out: DrawStroke[] = []
  for (let i = 0; i < count; i++) {
    const y = (i + 0.5) / count
    const jitter = ((i * 37) % 11) / 400
    out.push(seg(-0.02, y + jitter, 1.02, y - jitter, color, 0.0012))
  }
  return out
}

// EMV contact chip (bevelled vector plate). The plate colour picks the metal.
export function chip(x: number, y: number, plate: string, _lines?: string): Layer[] {
  const v = plate.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
  const metal: Metal = r - b > 60 && g - b > 30 ? 'gold' : r - b > 25 ? 'rose' : 'silver'
  return [vec(chipArt(metal), x, y, 0.11)]
}

// Contactless symbol.
export function contactless(x: number, y: number, color: string): Layer {
  return vec(contactlessArt(color), x, y, 0.04)
}

// ---- illustration builders ---------------------------------------------------
export interface VecOpts {
  rotation?: number
  sketch?: boolean
  opacity?: number
  locked?: boolean
  shadow?: VectorShadow | boolean // true = default soft drop shadow
}

const DEFAULT_SHADOW: VectorShadow = { color: 'rgba(0,0,0,0.35)', blur: 8, dx: 0, dy: 6 }

// A vector illustration centred at (x, y), `width` as a fraction of the card.
// Store path strings that repeat (a silhouette reused as fill, clip and ink)
// once in `defs`, referenced as "#i". Keeps templates and saved projects small.
function intern(paths: VectorPath[]): { paths: VectorPath[]; defs?: string[] } {
  const count = new Map<string, number>()
  const bump = (d?: string) => d && d.length >= 64 && count.set(d, (count.get(d) ?? 0) + 1)
  for (const p of paths) {
    bump(p.d)
    bump(p.clip)
  }
  const index = new Map<string, number>()
  const defs: string[] = []
  const ref = (d: string) => {
    if ((count.get(d) ?? 0) < 2) return d
    let i = index.get(d)
    if (i === undefined) {
      i = defs.push(d) - 1
      index.set(d, i)
    }
    return `#${i}`
  }
  if (![...count.values()].some((n) => n > 1)) return { paths }
  const out = paths.map((p) => (p.clip ? { ...p, d: ref(p.d), clip: ref(p.clip) } : { ...p, d: ref(p.d) }))
  return { paths: out, defs }
}

export function vec(art: Art, x: number, y: number, width: number, o: VecOpts = {}): Layer {
  const { paths, defs } = intern(art.paths)
  return {
    id: lid('v'),
    type: 'vector',
    name: 'Illustration',
    x,
    y,
    scale: 1,
    rotation: o.rotation ?? 0,
    opacity: o.opacity ?? 1,
    locked: o.locked ?? false,
    visible: true,
    viewW: art.viewW,
    viewH: art.viewH,
    width,
    paths,
    defs,
    sketch: o.sketch ?? false,
    shadow: o.shadow === true ? DEFAULT_SHADOW : o.shadow || undefined,
  } as Layer
}

// Full-card decor, locked so taps go to the characters drawn on top.
export function backdrop(art: Art, o: VecOpts = {}): Layer {
  return vec(art, 0.5, 0.5, 1, { sketch: false, locked: true, ...o })
}

export interface TitleOpts {
  x?: number
  y?: number
  align?: CanvasTextAlign
  size?: number
  font?: string
  color?: string
  color2?: string // vertical gradient bottom colour
  outline?: string
  outlineWidth?: number
  rotation?: number
  letterSpacing?: number
  shadow?: boolean
}

// Poster / comic-book title: thick dark outline, optional gradient, soft shadow.
export function title(t: string, o: TitleOpts = {}): Layer {
  return text(t, {
    x: o.x ?? 0.07,
    y: o.y ?? 0.3,
    align: o.align ?? 'left',
    fontFamily: o.font ?? 'Luckiest Guy',
    fontSize: o.size ?? 0.14,
    weight: 400,
    color: o.color ?? '#ffffff',
    color2: o.color2,
    outline: o.outline ?? '#1b1712',
    outlineWidth: o.outlineWidth ?? 0.11,
    rotation: o.rotation ?? 0,
    letterSpacing: o.letterSpacing ?? 0.004,
    shadow: o.shadow ?? true,
  } as Partial<Layer>)
}
