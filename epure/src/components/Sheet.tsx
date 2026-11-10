// Panneau en verre dépoli qui monte du bas de l'écran. On le ferme en tirant l'en-tête
// vers le bas, en touchant l'arrière-plan ou avec la croix.

import { useEffect, useState, type ReactNode } from 'react'
import { motion, useDragControls } from 'framer-motion'
import { speedFactor } from '../theme/settings'
import { Icon } from './Icons'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  /** Occupe presque tout l'écran (listes longues). */
  tall?: boolean
  /** Bouton d'action à droite du titre. */
  action?: ReactNode
  children: ReactNode
}

export function Sheet({ open, onClose, title, tall, action, children }: Props) {
  const controls = useDragControls()
  const speed = speedFactor()
  const transition = speed
    ? ({ type: 'spring', stiffness: 330 / (speed * speed), damping: 34 / speed } as const)
    : ({ duration: 0 } as const)

  // Le panneau reste monté le temps de sa sortie. On gère ça à la main plutôt qu'avec
  // AnimatePresence : une liste qui change pendant la fermeture bloquerait le démontage.
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), 450 * speed + 50)
    return () => clearTimeout(timer)
  }, [open, speed])
  if (!mounted) return null

  return (
    <>
      <motion.div
        className="sheet-backdrop"
        style={{ pointerEvents: open ? 'auto' : 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 * speed }}
        onClick={onClose}
      />
      <motion.section
        className={tall ? 'sheet tall' : 'sheet'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        style={{ pointerEvents: open ? 'auto' : 'none' }}
        initial={{ y: '100%' }}
        animate={{ y: open ? 0 : '100%' }}
        transition={transition}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose()
        }}
      >
        <header className="sheet-head" onPointerDown={(e) => controls.start(e)}>
          <div className="sheet-grip" />
          <div className="sheet-title">
            <h2>{title}</h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onPointerDown={(e) => e.stopPropagation()}>
              {action}
              <button className="icon-btn" onClick={onClose} aria-label="Fermer">
                <Icon.close />
              </button>
            </div>
          </div>
        </header>
        <div className="sheet-body">{children}</div>
      </motion.section>
    </>
  )
}
