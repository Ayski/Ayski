import type {
  Background,
  CardProject,
  DrawLayer,
  FaceKey,
  ImageLayer,
  Layer,
  ShapeLayer,
  Paint,
  TextLayer,
  VectorLayer,
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

// Canvas text does not trigger web-font downloads by itself, so request every
// face used by the project's text layers before drawing.
const fontLoads = new Map<string, Promise<unknown>>()
function loadFont(family: string, weight: number, italic: boolean): Promise<unknown> {
  const spec = `${italic ? 'italic ' : ''}${weight} 32px "${family}"`
  let p = fontLoads.get(spec)
  if (!p) {
    p = document.fonts?.load ? document.fonts.load(spec).catch(() => undefined) : Promise.resolve()
    fontLoads.set(spec, p)
  }
  return p
}

export async function preloadProject(project: CardProject): Promise<void> {
  const layers = [...project.layers, ...(project.back?.layers ?? [])]
  const srcs = layers.filter((l): l is ImageLayer => l.type === 'image').map((l) => l.src)
  const fonts = layers
    .filter((l): l is TextLayer => l.type === 'text')
    .map((l) => loadFont(l.fontFamily, l.weight, l.italic))
  await Promise.all([...srcs.map((s) => preloadImage(s).catch(() => undefined)), ...fonts])
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
  // Quote the family: names such as "Press Start 2P" are not valid bare identifiers.
  ctx.font = `${style}${l.weight} ${size}px "${l.fontFamily}", sans-serif`
  ctx.textAlign = l.align
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  // Glyph placement (manual letter spacing keeps output identical everywhere).
  const spacing = l.letterSpacing * w
  const runs: [string, number][] = []
  if (spacing === 0) {
    runs.push([l.text, 0])
  } else {
    const chars = [...l.text]
    const widths = chars.map((c) => ctx.measureText(c).width + spacing)
    const total = widths.reduce((a, b) => a + b, 0) - spacing
    let cursor = l.align === 'center' ? -total / 2 : l.align === 'right' ? -total : 0
    chars.forEach((c, i) => {
      runs.push([c, cursor])
      cursor += widths[i]
    })
    ctx.textAlign = 'left'
  }

  const shadowOn = () => {
    if (!l.shadow) return
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = size * 0.14
    ctx.shadowOffsetY = size * 0.06
  }
  const shadowOff = () => {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  }

  // Outline first (it carries the shadow), then the fill on top without shadow.
  const ow = (l.outlineWidth ?? 0) * size
  shadowOn()
  if (l.outline && ow > 0) {
    ctx.strokeStyle = l.outline
    ctx.lineWidth = ow * 2
    for (const [t, x] of runs) ctx.strokeText(t, x, 0)
    shadowOff()
  }
  if (l.color2) {
    const g = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.45)
    g.addColorStop(0, l.color)
    g.addColorStop(1, l.color2)
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = l.color
  }
  for (const [t, x] of runs) ctx.fillText(t, x, 0)
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

const pathCache = new Map<string, Path2D>()
function toPath(d: string): Path2D {
  let p = pathCache.get(d)
  if (!p) {
    p = new Path2D(d)
    pathCache.set(d, p)
  }
  return p
}

// Resolve a paint (flat colour or gradient) in the current, view-scaled space.
function paint(ctx: CanvasRenderingContext2D, p: Paint): string | CanvasGradient {
  if (typeof p === 'string') return p
  const g =
    p.kind === 'linear'
      ? ctx.createLinearGradient(p.x0, p.y0, p.x1, p.y1)
      : ctx.createRadialGradient(p.fx ?? p.cx, p.fy ?? p.cy, 0, p.cx, p.cy, p.r)
  for (const [o, c] of p.stops) g.addColorStop(o, c)
  return g
}

// Resolve a "#i" reference into the layer's shared path table.
function deref(l: VectorLayer, d: string): string {
  return d.charCodeAt(0) === 35 ? (l.defs?.[Number(d.slice(1))] ?? '') : d
}

function paintPaths(ctx: CanvasRenderingContext2D, l: VectorLayer) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const base = ctx.globalAlpha
  for (const p of l.paths) {
    const path = toPath(deref(l, p.d))
    const scoped = Boolean(p.clip || p.blend)
    if (scoped) {
      ctx.save()
      if (p.clip) ctx.clip(toPath(deref(l, p.clip)))
      if (p.blend) ctx.globalCompositeOperation = p.blend
    }
    ctx.globalAlpha = base * (p.alpha ?? 1)
    if (p.fill) {
      ctx.fillStyle = paint(ctx, p.fill)
      ctx.fill(path, p.rule ?? 'nonzero')
    }
    if (p.stroke) {
      ctx.strokeStyle = paint(ctx, p.stroke)
      ctx.lineWidth = p.sw ?? 3
      ctx.stroke(path)
      if (l.sketch && (p.sw ?? 3) >= 2) {
        // second, slightly offset pass gives a hand-inked look
        ctx.save()
        ctx.globalAlpha = base * (p.alpha ?? 1) * 0.45
        ctx.translate(0.9, -0.7)
        ctx.lineWidth = (p.sw ?? 3) * 0.55
        ctx.stroke(path)
        ctx.restore()
      }
    }
    if (scoped) ctx.restore()
  }
  ctx.globalAlpha = base
}

function drawVectorLayer(ctx: CanvasRenderingContext2D, l: VectorLayer, w: number, h: number) {
  const boxW = l.width * w * l.scale
  const k = boxW / l.viewW
  const boxH = l.viewH * k
  ctx.save()
  ctx.translate(l.x * w, l.y * h)
  ctx.rotate((l.rotation * Math.PI) / 180)
  ctx.globalAlpha = l.opacity
  if (l.shadow && boxW > 1) {
    // Render once off-screen, then stamp it with a single soft shadow so
    // overlapping shapes do not stack darker shadows.
    const s = l.shadow
    const pad = Math.ceil((s.blur * 2 + Math.max(Math.abs(s.dx), Math.abs(s.dy))) * k) + 2
    const off = document.createElement('canvas')
    off.width = Math.ceil(boxW + pad * 2)
    off.height = Math.ceil(boxH + pad * 2)
    const o = off.getContext('2d')!
    o.translate(pad, pad)
    o.scale(k, k)
    paintPaths(o, l)
    ctx.shadowColor = s.color
    ctx.shadowBlur = s.blur * k
    ctx.shadowOffsetX = s.dx * k
    ctx.shadowOffsetY = s.dy * k
    ctx.drawImage(off, -boxW / 2 - pad, -boxH / 2 - pad)
  } else {
    ctx.translate(-boxW / 2, -boxH / 2)
    ctx.scale(k, k)
    paintPaths(ctx, l)
  }
  ctx.restore()
}

function drawLayer(ctx: CanvasRenderingContext2D, l: Layer, w: number, h: number) {
  if (!l.visible) return
  if (l.type === 'image') drawImageLayer(ctx, l, w, h)
  else if (l.type === 'shape') drawShapeLayer(ctx, l, w, h)
  else if (l.type === 'draw') drawDrawLayer(ctx, l, w, h)
  else if (l.type === 'vector') drawVectorLayer(ctx, l, w, h)
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
