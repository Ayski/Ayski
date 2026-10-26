import { useEffect, useRef } from 'react'
import type { CardProject, Layer } from '../types'
import { preloadProject, renderCard } from '../studio/render'

interface Props {
  project: CardProject
  width?: number // internal render resolution
  showGrid?: boolean
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onMove?: (id: string, x: number, y: number) => void
  interactive?: boolean
}

function hitTest(project: CardProject, nx: number, ny: number): Layer | null {
  // iterate topmost first; approximate bounding boxes (rotation ignored)
  for (let i = project.layers.length - 1; i >= 0; i--) {
    const l = project.layers[i]
    if (!l.visible || l.locked) continue
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
    }
    if (Math.abs(nx - l.x) <= hw + 0.03 && Math.abs(ny - l.y) <= hh + 0.03) return l
  }
  return null
}

export default function CardPreview({
  project,
  width = 1000,
  showGrid = false,
  selectedId,
  onSelect,
  onMove,
  interactive = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  // (re)render whenever the project changes
  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return
    const h = Math.round(width / project.aspect)
    canvas.width = width
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    const draw = () =>
      !cancelled && renderCard(ctx, project, { width, showGrid, radius: h * 0.08 })
    // ensure fonts + images are ready for an accurate frame
    preloadProject(project).then(() => {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw)
      else draw()
    })
    draw()
    return () => {
      cancelled = true
    }
  }, [project, width, showGrid])

  function toNorm(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      nx: (e.clientX - rect.left) / rect.width,
      ny: (e.clientY - rect.top) / rect.height,
    }
  }

  function onDown(e: React.PointerEvent) {
    if (!interactive) return
    const { nx, ny } = toNorm(e)
    const hit = hitTest(project, nx, ny)
    if (hit) {
      onSelect?.(hit.id)
      drag.current = { id: hit.id, startX: nx, startY: ny, origX: hit.x, origY: hit.y }
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    } else {
      onSelect?.(null)
    }
  }

  function onMovePtr(e: React.PointerEvent) {
    if (!interactive || !drag.current) return
    const { nx, ny } = toNorm(e)
    const d = drag.current
    const x = Math.max(-0.1, Math.min(1.1, d.origX + (nx - d.startX)))
    const y = Math.max(-0.1, Math.min(1.1, d.origY + (ny - d.startY)))
    onMove?.(d.id, x, y)
  }

  function onUp() {
    drag.current = null
  }

  return (
    <div
      className="card-preview"
      style={selectedId !== undefined ? { outline: 'none' } : undefined}
      onPointerDown={onDown}
      onPointerMove={onMovePtr}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
