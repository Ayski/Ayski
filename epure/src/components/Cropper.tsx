// Recadrage simple avant d'enregistrer un fond : on déplace l'image au doigt et on zoome
// (pincement ou curseur) pour choisir la zone visible en portrait.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Crop } from '../wallpaper/wallpapers'

interface Props {
  image: HTMLImageElement
  onCancel: () => void
  onConfirm: (crop: Crop) => void
}

export function Cropper({ image, onCancel, onConfirm }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const [frame, setFrame] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [busy, setBusy] = useState(false)
  /** Décalage du centre de l'image par rapport au centre du cadre, en pixels écran. */
  const offset = useRef({ x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)

  const iw = image.naturalWidth
  const ih = image.naturalHeight

  // Le cadre a les proportions de l'écran, pour voir exactement ce qui sera affiché.
  useLayoutEffect(() => {
    const measure = () => {
      const box = area.current?.getBoundingClientRect()
      if (!box) return
      const ratio = window.innerWidth / window.innerHeight
      const h = Math.min(box.height, box.width / ratio)
      setFrame({ w: h * ratio, h })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  /** Échelle minimale pour que l'image couvre tout le cadre. */
  const base = frame.w ? Math.max(frame.w / iw, frame.h / ih) : 1
  const scale = base * zoom

  const apply = (z = zoom) => {
    const s = base * z
    // L'image doit toujours couvrir le cadre : on borne le décalage.
    const maxX = Math.max(0, (iw * s - frame.w) / 2)
    const maxY = Math.max(0, (ih * s - frame.h) / 2)
    offset.current.x = Math.min(maxX, Math.max(-maxX, offset.current.x))
    offset.current.y = Math.min(maxY, Math.max(-maxY, offset.current.y))
    if (img.current) {
      img.current.style.transform = `translate(-50%, -50%) translate3d(${offset.current.x}px, ${offset.current.y}px, 0) scale(${s})`
    }
  }
  useEffect(() => apply())

  const confirm = () => {
    setBusy(true)
    const width = frame.w / scale
    const height = frame.h / scale
    onConfirm({
      x: iw / 2 - offset.current.x / scale - width / 2,
      y: ih / 2 - offset.current.y / scale - height / 2,
      width,
      height,
    })
  }

  return (
    <div className="cropper" role="dialog" aria-modal="true" aria-label="Recadrer le fond d'écran">
      <h2>Choisis la zone visible</h2>
      <p>Déplace l’image et zoome pour cadrer ton fond.</p>
      <div className="crop-area" ref={area}>
        <div
          className="crop-frame"
          style={{ width: frame.w, height: frame.h }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            pinch.current = null
          }}
          onPointerMove={(e) => {
            const previous = pointers.current.get(e.pointerId)
            if (!previous) return
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            const points = [...pointers.current.values()]
            if (points.length === 1) {
              offset.current.x += e.clientX - previous.x
              offset.current.y += e.clientY - previous.y
              apply()
            } else if (points.length === 2) {
              const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
              pinch.current ??= { distance, zoom }
              setZoom(Math.min(4, Math.max(1, (pinch.current.zoom * distance) / pinch.current.distance)))
            }
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId)
            pinch.current = null
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId)
            pinch.current = null
          }}
        >
          <img ref={img} src={image.src} alt="" width={iw} height={ih} style={{ width: iw, height: ih }} draggable={false} />
        </div>
      </div>
      <input
        type="range"
        aria-label="Zoom"
        min={1}
        max={4}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
      />
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>
          Annuler
        </button>
        <button className="btn" onClick={confirm} disabled={busy || !frame.w}>
          {busy ? 'Enregistrement…' : 'Utiliser ce fond'}
        </button>
      </div>
    </div>
  )
}
