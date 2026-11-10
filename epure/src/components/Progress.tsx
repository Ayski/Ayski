// Barre de progression fine et déplaçable. Entre deux pollings, la position est interpolée
// localement et dessinée image par image (transform uniquement, sans rendu React).

import { useEffect, useRef, useState } from 'react'
import { currentProgress, playerStore, seekTo, usePlayer } from '../state/player'

const format = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Progress() {
  const duration = usePlayer((s) => s.track?.durationMs ?? 0)
  const track = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const elapsed = useRef<HTMLSpanElement>(null)
  const remaining = useRef<HTMLSpanElement>(null)
  /** Position choisie au doigt pendant un déplacement (null sinon). */
  const scrub = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let frame = 0
    let lastText = ''
    const draw = () => {
      const ms = scrub.current ?? currentProgress(playerStore.get())
      const ratio = duration ? Math.min(1, ms / duration) : 0
      const width = track.current?.offsetWidth ?? 0
      if (fill.current) fill.current.style.transform = `scaleX(${ratio})`
      if (knob.current) knob.current.style.transform = `translate3d(${ratio * width}px,0,0)`
      const text = format(ms)
      if (text !== lastText) {
        lastText = text
        if (elapsed.current) elapsed.current.textContent = text
        if (remaining.current) remaining.current.textContent = '-' + format(duration - ms)
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [duration])

  const positionFrom = (clientX: number) => {
    const rect = track.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration
  }

  return (
    <div className="progress">
      <div
        ref={track}
        className="progress-track"
        role="slider"
        aria-label="Position dans le titre"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration / 1000)}
        aria-valuenow={Math.round(currentProgress() / 1000)}
        tabIndex={0}
        onPointerDown={(e) => {
          if (!duration) return
          e.currentTarget.setPointerCapture(e.pointerId)
          scrub.current = positionFrom(e.clientX)
          setDragging(true)
        }}
        onPointerMove={(e) => {
          if (scrub.current !== null) scrub.current = positionFrom(e.clientX)
        }}
        onPointerUp={() => {
          if (scrub.current !== null) seekTo(scrub.current)
          scrub.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          scrub.current = null
          setDragging(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seekTo(Math.min(duration, currentProgress() + 5000))
          if (e.key === 'ArrowLeft') seekTo(Math.max(0, currentProgress() - 5000))
        }}
      >
        <div className="progress-rail" />
        <div ref={fill} className="progress-fill" />
        <div ref={knob} className="progress-knob" style={{ opacity: dragging ? 1 : 0 }} />
      </div>
      <div className="progress-times">
        <span ref={elapsed}>0:00</span>
        <span ref={remaining}>-0:00</span>
      </div>
    </div>
  )
}
