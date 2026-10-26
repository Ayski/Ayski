import type {
  Background,
  CardProject,
  DrawLayer,
  FaceKey,
  ImageLayer,
  Layer,
  ShapeLayer,
  TextLayer,
} from '../types'
import { readFace } from '../types'

// ---- Image cache ------------------------------------------------------------
const imgCache = new Map<string, HTMLImageElement>()

export function getImage(src: string): HTMLImageElement | undefined {
  const cached = imgCache.get(src)
  if (cached && cached.complete && cached.naturalWidth > 0) return cached
  return undefined
}

export function preloadImage(src: string): Promise<HTMLImageElement> {
  const cached = imgCache.get(src)
  if (cached && cached.complete && cached.naturalWidth > 0) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imgCache.set(src, img)
      resolve(img)
    }
    img.onerror = reject
    img.src = src
  })
}

export async function preloadProject(project: CardProject): Promise<void> {
  const layers = [...project.layers, ...(project.back?.layers ?? [])]
  const srcs = layers.filter((l): l is ImageLayer => l.type === 'image').map((l) => l.src)
  await Promise.all(srcs.map((s) => preloadImage(s).catch(() => undefined)))
}

// ---- Helpers ----------------------------------------------------------------
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function filterString(l: ImageLayer): string {
  const parts: string[] = []
  parts.push(`brightness(${l.brightness}%)`)
  parts.push(`contrast(${l.contrast}%)`)
  parts.push(`saturate(${l.saturation}%)`)
  if (l.hue) parts.push(`hue-rotate(${l.hue}deg)`)
  if (l.blur) parts.push(`blur(${l.blur}px)`)
  switch (l.preset) {
    case 'noir':
      parts.push('grayscale(100%) contrast(130%)')
      break
    case 'mono':
      parts.push('grayscale(100%)')
      break
    case 'sepia':
      parts.push('sepia(80%)')
      break
    case 'warm':
      parts.push('sepia(25%) saturate(130%)')
      break
    case 'cool':
      parts.push('hue-rotate(-12deg) saturate(115%)')
      break
    case 'vivid':
      parts.push('saturate(150%) contrast(110%)')
      break
    case 'fade':
      parts.push('contrast(85%) brightness(108%) saturate(85%)')
      break
    default:
      break
  }
  return parts.join(' ')
}

// ---- Backgrounds & finishes -------------------------------------------------
function paintBackground(
  ctx: CanvasRenderingContext2D,
  bg: Background,
  w: number,
  h: number,
) {
  ctx.save()
  if (bg.kind === 'solid') {
    ctx.fillStyle = bg.color1
    ctx.fillRect(0, 0, w, h)
  } else if (bg.kind === 'radial') {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
    g.addColorStop(0, bg.color1)
    g.addColorStop(1, bg.color2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  } else {
    const a = (bg.angle * Math.PI) / 180
    const cx = w / 2
    const cy = h / 2
    const dx = Math.cos(a) * w
    const dy = Math.sin(a) * h
    const g = ctx.createLinearGradient(cx - dx / 2, cy - dy / 2, cx + dx / 2, cy + dy / 2)
    g.addColorStop(0, bg.color1)
    g.addColorStop(1, bg.color2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
  paintFinish(ctx, bg, w, h)
}

function paintFinish(ctx: CanvasRenderingContext2D, bg: Background, w: number, h: number) {
  ctx.save()
  switch (bg.finish) {
    case 'gold':
      metallic(ctx, w, h, ['#5a4415', '#d9b45b', '#fff1c9', '#b8923f', '#d9b45b', '#7a5e22'])
      break
    case 'silver':
      metallic(ctx, w, h, ['#6b7078', '#c8ccd2', '#ffffff', '#9aa0a8', '#c8ccd2', '#71767e'])
      break
    case 'carbon':
      carbon(ctx, w, h)
      break
    case 'glass':
      glass(ctx, w, h)
      break
    case 'gloss':
      gloss(ctx, w, h)
      break
    case 'black':
      blackPremium(ctx, w, h)
      break
    case 'matte':
    default:
      break
  }
  // directional glow / sheen
  if (bg.glow > 0) {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, `rgba(255,255,255,0)`)
    g.addColorStop(0.45, `rgba(255,255,255,${0.18 * bg.glow})`)
    g.addColorStop(0.55, `rgba(255,255,255,${0.04 * bg.glow})`)
    g.addColorStop(1, `rgba(255,255,255,0)`)
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }
  if (bg.grain > 0) grain(ctx, w, h, bg.grain)
  ctx.restore()
}

function metallic(ctx: CanvasRenderingContext2D, w: number, h: number, stops: string[]) {
  ctx.globalCompositeOperation = 'overlay'
  const g = ctx.createLinearGradient(0, 0, w, h)
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // base tint beneath for color accuracy
  ctx.globalCompositeOperation = 'soft-light'
  ctx.fillStyle = stops[1]
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
}

function carbon(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cell = Math.max(6, Math.round(w / 48))
  const tile = document.createElement('canvas')
  tile.width = cell * 2
  tile.height = cell * 2
  const t = tile.getContext('2d')!
  t.fillStyle = '#131417'
  t.fillRect(0, 0, cell * 2, cell * 2)
  t.fillStyle = '#1c1e22'
  t.fillRect(0, 0, cell, cell)
  t.fillRect(cell, cell, cell, cell)
  const gg = t.createLinearGradient(0, 0, cell, cell)
  gg.addColorStop(0, 'rgba(255,255,255,0.10)')
  gg.addColorStop(1, 'rgba(0,0,0,0.25)')
  t.fillStyle = gg
  t.fillRect(0, 0, cell, cell)
  t.fillRect(cell, cell, cell, cell)
  const pat = ctx.createPattern(tile, 'repeat')!
  ctx.globalAlpha = 0.9
  ctx.fillStyle = pat
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 1
}

function glass(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, 'rgba(255,255,255,0.22)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.05)')
  g.addColorStop(1, 'rgba(255,255,255,0.14)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = Math.max(1, w / 320)
  roundRectPath(ctx, w * 0.03, h * 0.05, w * 0.94, h * 0.9, h * 0.12)
  ctx.stroke()
}

function gloss(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h * 0.6)
  g.addColorStop(0, 'rgba(255,255,255,0.28)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.05)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function blackPremium(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.5, h * 0.5, w * 0.9)
  g.addColorStop(0, 'rgba(40,42,48,0.9)')
  g.addColorStop(0.6, 'rgba(14,15,18,0.95)')
  g.addColorStop(1, 'rgba(4,4,6,1)')
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  gloss(ctx, w, h)
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const n = Math.round((w * h) / 42)
  ctx.save()
  for (let i = 0; i < n; i++) {
    const a = Math.random() * amount * 0.5
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
  }
  ctx.restore()
}

// ---- Layer drawing ----------------------------------------------------------
function drawImageLayer(ctx: CanvasRenderingContext2D, l: ImageLayer, w: number, h: number) {
  const img = getImage(l.src)
  if (!img) return
  const baseW = w * l.fit * l.scale
  const ratio = l.naturalHeight / l.naturalWidth || 1
  const baseH = baseW * ratio
  ctx.save()
  ctx.translate(l.x * w, l.y * h)
  ctx.rotate((l.rotation * Math.PI) / 180)
  ctx.globalAlpha = l.opacity
  ctx.filter = filterString(l)
  ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH)
  ctx.filter = 'none'
  ctx.restore()
}

function drawShapeLayer(ctx: CanvasRenderingContext2D, l: ShapeLayer, w: number, h: number) {
  const sw = l.width * w * l.scale
  const sh = l.height * h * l.scale
  ctx.save()
  ctx.translate(l.x * w, l.y * h)
  ctx.rotate((l.rotation * Math.PI) / 180)
  ctx.globalAlpha = l.opacity
  ctx.fillStyle = l.fill
  ctx.strokeStyle = l.stroke
  ctx.lineWidth = l.strokeWidth * w
  const stroke = l.strokeWidth > 0
  switch (l.shape) {
    case 'rect':
      ctx.fillRect(-sw / 2, -sh / 2, sw, sh)
      if (stroke) ctx.strokeRect(-sw / 2, -sh / 2, sw, sh)
      break
    case 'roundRect':
      roundRectPath(ctx, -sw / 2, -sh / 2, sw, sh, l.cornerRadius * w)
      ctx.fill()
      if (stroke) ctx.stroke()
      break
    case 'circle':
      ctx.beginPath()
      ctx.ellipse(0, 0, sw / 2, sh / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      if (stroke) ctx.stroke()
      break
    case 'line':
      ctx.beginPath()
      ctx.moveTo(-sw / 2, 0)
      ctx.lineTo(sw / 2, 0)
      ctx.lineWidth = Math.max(l.strokeWidth * w, sh)
      ctx.strokeStyle = l.fill
      ctx.stroke()
      break
    case 'triangle':
      ctx.beginPath()
      ctx.moveTo(0, -sh / 2)
      ctx.lineTo(sw / 2, sh / 2)
      ctx.lineTo(-sw / 2, sh / 2)
      ctx.closePath()
      ctx.fill()
      if (stroke) ctx.stroke()
      break
  }
  ctx.restore()
}

function drawTextLayer(ctx: CanvasRenderingContext2D, l: TextLayer, w: number, h: number) {
  const size = l.fontSize * h * l.scale
  ctx.save()
  ctx.translate(l.x * w, l.y * h)
  ctx.rotate((l.rotation * Math.PI) / 180)
  ctx.globalAlpha = l.opacity
  const style = l.italic ? 'italic ' : ''
  ctx.font = `${style}${l.weight} ${size}px ${l.fontFamily}`
  ctx.fillStyle = l.color
  ctx.textAlign = l.align
  ctx.textBaseline = 'middle'
  if (l.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = size * 0.14
    ctx.shadowOffsetY = size * 0.06
  }
  const spacing = l.letterSpacing * w
  if (spacing === 0) {
    ctx.fillText(l.text, 0, 0)
  } else {
    // manual letter spacing for cross-browser fidelity
    const chars = [...l.text]
    const widths = chars.map((c) => ctx.measureText(c).width + spacing)
    const total = widths.reduce((a, b) => a + b, 0) - spacing
    let cursor = l.align === 'center' ? -total / 2 : l.align === 'right' ? -total : 0
    const prevAlign = ctx.textAlign
    ctx.textAlign = 'left'
    chars.forEach((c, i) => {
      ctx.fillText(c, cursor, 0)
      cursor += widths[i]
    })
    ctx.textAlign = prevAlign
  }
  ctx.restore()
}

export function strokePath(
  ctx: CanvasRenderingContext2D,
  s: { color: string; width: number; points: number[] },
  w: number,
  h: number,
) {
  const p = s.points
  if (p.length < 2) return
  ctx.strokeStyle = s.color
  ctx.lineWidth = Math.max(1, s.width * w)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(p[0] * w, p[1] * h)
  if (p.length === 2) {
    // a single tap: draw a dot
    ctx.lineTo(p[0] * w + 0.01, p[1] * h)
  } else {
    // smooth with quadratic midpoints
    for (let i = 2; i < p.length - 2; i += 2) {
      const x = p[i] * w
      const y = p[i + 1] * h
      const xn = p[i + 2] * w
      const yn = p[i + 3] * h
      ctx.quadraticCurveTo(x, y, (x + xn) / 2, (y + yn) / 2)
    }
    ctx.lineTo(p[p.length - 2] * w, p[p.length - 1] * h)
  }
  ctx.stroke()
}

function drawDrawLayer(ctx: CanvasRenderingContext2D, l: DrawLayer, w: number, h: number) {
  ctx.save()
  ctx.globalAlpha = l.opacity
  for (const s of l.strokes) strokePath(ctx, s, w, h)
  ctx.restore()
}

function drawLayer(ctx: CanvasRenderingContext2D, l: Layer, w: number, h: number) {
  if (!l.visible) return
  if (l.type === 'image') drawImageLayer(ctx, l, w, h)
  else if (l.type === 'shape') drawShapeLayer(ctx, l, w, h)
  else if (l.type === 'draw') drawDrawLayer(ctx, l, w, h)
  else drawTextLayer(ctx, l, w, h)
}

// ---- Public API -------------------------------------------------------------
export interface RenderOptions {
  width: number // target pixel width of the card
  showGrid?: boolean
  radius?: number // corner radius in px; defaults to 8% of height
  face?: FaceKey // which side to render (default front)
}

export function renderCard(ctx: CanvasRenderingContext2D, project: CardProject, opts: RenderOptions) {
  const w = opts.width
  const h = w / project.aspect
  const r = opts.radius ?? h * 0.08
  const face = readFace(project, opts.face ?? 'front')
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  roundRectPath(ctx, 0, 0, w, h, r)
  ctx.clip()
  paintBackground(ctx, face.background, w, h)
  for (const layer of face.layers) drawLayer(ctx, layer, w, h)
  if (opts.showGrid) drawGrid(ctx, w, h)
  ctx.restore()
  // subtle edge for depth
  ctx.save()
  roundRectPath(ctx, 0.5, 0.5, w - 1, h - 1, r)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
  return { w, h }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 1
  for (let i = 1; i < 3; i++) {
    const x = (w / 3) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let i = 1; i < 3; i++) {
    const y = (h / 3) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.restore()
}

// Render to an offscreen canvas and return a dataURL (export / thumbnail).
export async function exportProject(
  project: CardProject,
  width: number,
  type: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.95,
  transparent = false,
  face: FaceKey = 'front',
): Promise<string> {
  await preloadProject(project)
  const h = Math.round(width / project.aspect)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width)
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  // JPEG has no alpha; for PNG keep the rounded-corner area transparent only
  // when explicitly requested, otherwise paint an opaque backdrop.
  if (type === 'image/jpeg' || !transparent) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  renderCard(ctx, project, { width: Math.round(width), radius: h * 0.08, face })
  return canvas.toDataURL(type, quality)
}

export async function makeThumbnail(project: CardProject, width = 360): Promise<string> {
  return exportProject(project, width, 'image/jpeg', 0.8)
}
