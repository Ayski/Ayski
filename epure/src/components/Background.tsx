// Fond d'écran derrière toute l'interface : dégradé de la pochette, couleur unie ou image
// personnelle (photo, GIF, vidéo en boucle muette), avec fondu enchaîné entre deux fonds.

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useTransform } from 'framer-motion'
import { useBackgroundModel } from '../theme/apply'
import { motionOff, speedFactor, useSettings } from '../theme/settings'
import { swipeX } from './Carousel'

export function Background() {
  const model = useBackgroundModel()
  const blur = useSettings((s) => s.bgBlur)
  const brightness = useSettings((s) => s.bgBrightness)
  const saturation = useSettings((s) => s.bgSaturation)
  const dim = useSettings((s) => s.bgDim)
  const tint = useSettings((s) => s.tintWithCover)
  const parallax = useSettings((s) => s.parallax)
  // Parallaxe : le fond suit le doigt, mais bien moins vite que la pochette.
  // Borné à 14 px : le fond déborde de 4 % de chaque côté, jamais plus.
  const x = useTransform(swipeX, (v) => (parallax && !motionOff() ? Math.max(-14, Math.min(14, v * 0.07)) : 0))

  // iOS peut refuser ou suspendre la lecture automatique d'une vidéo (économie d'énergie,
  // retour d'arrière-plan) : on la relance au retour dans l'app et au premier toucher.
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const resume = () => {
      if (!document.hidden) void video.current?.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('pointerdown', resume)
    return () => {
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('pointerdown', resume)
    }
  }, [])

  const isImage = model.kind === 'image'
  // 600 ms quand la pochette change, 400 ms quand je change de fond.
  const duration = (isImage ? 0.4 : 0.6) * (speedFactor() || 0.001)
  const filter = isImage
    ? `blur(${blur}px) brightness(${brightness}%) saturate(${saturation}%)`
    : undefined

  return (
    <div className="bg" aria-hidden="true">
      <motion.div className="bg-move" style={{ x }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={model.key}
            className="bg-layer"
            style={{ background: model.paint, filter, scale: isImage && blur > 0 ? 1.08 : 1 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration, ease: 'easeInOut' } }}
            // L'ancien fond reste en dessous le temps du fondu, puis disparaît.
            exit={{ opacity: 1, transition: { duration } }}
          >
            {model.wallpaper &&
              (model.wallpaper.kind === 'video' ? (
                <video ref={video} src={model.wallpaper.url} autoPlay loop muted playsInline disablePictureInPicture />
              ) : (
                <img src={model.wallpaper.url} alt="" draggable={false} />
              ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      {isImage && tint && <div className="bg-tint" style={{ opacity: 0.55 }} />}
      {isImage && dim > 0 && <div className="bg-dim" style={{ opacity: dim / 100 }} />}
    </div>
  )
}
