import { useEffect, useRef, useState } from 'react'
import type { CardProject, DrawStroke, FaceKey, Layer } from '../types'
import { readFace } from '../types'
import { preloadProject, renderCard, strokePath } from '../studio/render'

interface Props {
  project: CardProject
  width?: number // internal render resolution
  showGrid?: boolean
  faceKey?: FaceKey
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onMove?: (id: string, x: number, y: number) => void
  interactive?: boolean
  // drawing mode
  drawMode?: boolean
  brushColor?: string
  brushWidth?: number // fraction of card width
  onStroke?: (s: DrawStroke) => void
  lazy?: boolean // only render once scrolled near the viewport
}

// ImageBitmaps rather than spare canvases: iOS Safari caps total canvas memory.
const bitmapCache = new WeakMap<CardProject, Map<string, ImageBitmap>>()

function storeBitmap(project: CardProject, key: string, src: HTMLCanvasElement) {
  if (typeof createImageBitmap === 'undefined') return
  createImageBitmap(src)
    .then((bmp) => {
      let byKey = bitmapCache.get(project)
      if (!byKey) bitmapCache.set(project, (byKey = new Map()))
      byKey.set(key, bmp)
    })
    .catch(() => undefined)
}

// Image layers and web fonts load asynchronously; everything else paints at once.
function needsAssets(project: CardProject): boolean {
  const layers = [...project.layers, ...(project.back?.layers ?? [])]
  return layers.some((l) => l.type === 'image' || l.type === 'text')
}

function hitTest(project: CardProject, faceKey: FaceKey, nx: number, ny: number): Layer | null {
  const layers = readFace(project, faceKey).layers
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i]
    if (!l.visible || l.locked || l.type === 'draw') continue
    let hw = 0.18
    let hh = 0.18
    if (l.type === 'shape') {
      hw = (l.width * l.scale) / 2
      hh = (l.height * l.scale) / 2
    } else if (l.type === 'text') {
      hw = Math.max(0.12, (l.text.length * l.fontSize * 0.3 * l.scale) / project.aspect)
      hh = (l.fontSize * l.scale) / 2 + 0.04
    } else if (l.type === 'image') {
      hw = (l.fit * l.scale) / 2
      hh = hw * (l.naturalHeight / l.naturalWidth) * project.aspect
    } else if (l.type === 'vector') {
      hw = (l.width * l.scale) / 2
      hh = hw * (l.viewH / l.viewW) * project.aspect
    }
    if (Math.abs(nx - l.x) <= hw + 0.03 && Math.abs(ny - l.y) <= hh + 0.03) return l
  }
  return null
}

export default function CardPreview({
  project,
  width = 1000,
  showGrid = false,
  faceKey = 'front',
  onSelect,
  onMove,
  interactive = false,
  drawMode = false,
  brushColor = '#D9B45B',
  brushWidth = 0.012,
  onStroke,
  lazy = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(!lazy)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const stroke = useRef<number[] | null>(null)

  useEffect(() => {
    if (visible || !rootRef.current || typeof IntersectionObserver === 'undefined') {
      if (!visible) setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    io.observe(rootRef.current)
    return () => io.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return
    const h = Math.round(width / project.aspect)
    canvas.width = width
    canvas.height = h
    if (overlayRef.current) {
      overlayRef.current.width = width
      overlayRef.current.height = h
    }
    const ctx = canvas.getContext('2d')!
    // Lazy catalogue thumbnails are cached per project object, so scrolling back
    // or switching tabs does not repaint heavy illustrations. Live previews
    // (Studio, 3D view) are never cached: each edit is a new project object.
    const cacheable = lazy && !interactive && !drawMode && !showGrid
    const key = `${width}|${faceKey}`
    const hit = cacheable ? bitmapCache.get(project)?.get(key) : undefined
    if (hit) {
      ctx.clearRect(0, 0, width, h)
      ctx.drawImage(hit, 0, 0)
      return
    }
    const draw = () => {
      if (cancelled) return
      renderCard(ctx, project, { width, showGrid, radius: h * 0.08, face: faceKey })
      if (cacheable) storeBitmap(project, key, canvas)
    }
    if (!needsAssets(project)) {
      // Pure vector/shape art: one synchronous paint is final.
      draw()
      return
    }
    preloadProject(project).then(() => {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw)
      else draw()
    })
    // Quick first paint while images and fonts load (not cached).
    renderCard(ctx, project, { width, showGrid, radius: h * 0.08, face: faceKey })
    return () => {
      cancelled = true
    }
  }, [project, width, showGrid, faceKey, visible, interactive, drawMode, lazy])

  function toNorm(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      nx: (e.clientX - rect.left) / rect.width,
      ny: (e.clientY - rect.top) / rect.height,
    }
  }

  function renderOverlayStroke() {
    const o = overlayRef.current
    if (!o || !stroke.current) return
    const octx = o.getContext('2d')!
    octx.clearRect(0, 0, o.width, o.height)
    strokePath(octx, { color: brushColor, width: brushWidth, points: stroke.current }, o.width, o.height)
  }

  function onDown(e: React.PointerEvent) {
    if (drawMode) {
      const { nx, ny } = toNorm(e)
      stroke.current = [clamp(nx), clamp(ny)]
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      renderOverlayStroke()
      return
    }
    if (!interactive) return
    const { nx, ny } = toNorm(e)
    const hit = hitTest(project, faceKey, nx, ny)
    if (hit) {
      onSelect?.(hit.id)
      drag.current = { id: hit.id, startX: nx, startY: ny, origX: hit.x, origY: hit.y }
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    } else {
      onSelect?.(null)
    }
  }

  function onMovePtr(e: React.PointerEvent) {
    if (drawMode && stroke.current) {
      const { nx, ny } = toNorm(e)
      stroke.current.push(clamp(nx), clamp(ny))
      renderOverlayStroke()
      return
    }
    if (!interactive || !drag.current) return
    const { nx, ny } = toNorm(e)
    const d = drag.current
    const x = Math.max(-0.1, Math.min(1.1, d.origX + (nx - d.startX)))
    const y = Math.max(-0.1, Math.min(1.1, d.origY + (ny - d.startY)))
    onMove?.(d.id, x, y)
  }

  function onUp() {
    if (drawMode && stroke.current) {
      if (stroke.current.length >= 2) {
        onStroke?.({ color: brushColor, width: brushWidth, points: stroke.current })
      }
      stroke.current = null
      const o = overlayRef.current
      if (o) o.getContext('2d')!.clearRect(0, 0, o.width, o.height)
      return
    }
    drag.current = null
  }

  return (
    <div
      ref={rootRef}
      className="card-preview"
      style={{ aspectRatio: String(project.aspect) }}
      onPointerDown={onDown}
      onPointerMove={onMovePtr}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <canvas ref={canvasRef} />
      <canvas ref={overlayRef} className="draw-overlay" />
    </div>
  )
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}
