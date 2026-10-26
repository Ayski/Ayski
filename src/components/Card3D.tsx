import { useState } from 'react'
import CardPreview from './CardPreview'
import type { CardProject, DrawStroke, FaceKey } from '../types'

interface Props {
  project: CardProject
  width?: number
  face?: FaceKey // controlled face; if omitted, component manages its own
  showGrid?: boolean
  interactive?: boolean
  drawMode?: boolean
  brushColor?: string
  brushWidth?: number
  onSelect?: (id: string | null) => void
  onMove?: (id: string, x: number, y: number) => void
  onStroke?: (s: DrawStroke) => void
  tappableFlip?: boolean // tap the card to flip (uncontrolled previews)
  maxWidth?: number
}

export default function Card3D({
  project,
  width = 1000,
  face,
  showGrid = false,
  interactive = false,
  drawMode = false,
  brushColor,
  brushWidth,
  onSelect,
  onMove,
  onStroke,
  tappableFlip = false,
  maxWidth,
}: Props) {
  const [internal, setInternal] = useState<FaceKey>('front')
  const current = face ?? internal
  const back = current === 'back'

  function onCardClick() {
    if (tappableFlip && !interactive && !drawMode) {
      setInternal((f) => (f === 'front' ? 'back' : 'front'))
    }
  }

  return (
    <div className="card3d-wrap" style={maxWidth ? { maxWidth } : undefined}>
      <div
        className="card3d"
        style={{ transform: `rotateY(${back ? 180 : 0}deg)` }}
        onClick={onCardClick}
      >
        <div className="card3d-face" style={{ pointerEvents: back ? 'none' : 'auto' }}>
          <CardPreview
            project={project}
            width={width}
            faceKey="front"
            showGrid={showGrid}
            interactive={interactive && !back}
            drawMode={drawMode && !back}
            brushColor={brushColor}
            brushWidth={brushWidth}
            onSelect={onSelect}
            onMove={onMove}
            onStroke={onStroke}
          />
        </div>
        <div className="card3d-face card3d-back" style={{ pointerEvents: back ? 'auto' : 'none' }}>
          <CardPreview
            project={project}
            width={width}
            faceKey="back"
            showGrid={showGrid}
            interactive={interactive && back}
            drawMode={drawMode && back}
            brushColor={brushColor}
            brushWidth={brushWidth}
            onSelect={onSelect}
            onMove={onMove}
            onStroke={onStroke}
          />
        </div>
      </div>
    </div>
  )
}
