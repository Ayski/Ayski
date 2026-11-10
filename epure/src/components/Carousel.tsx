// Carrousel de pochettes : la pochette suit le doigt, part avec un ressort au-delà du seuil
// (30 % de la largeur ou vitesse suffisante), et la suivante prend sa place. Le même
// mouvement est rejoué quand le titre change ailleurs (fin du morceau, action dans Spotify).

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { animate, motion, motionValue, type PanInfo } from 'framer-motion'
import type { Track } from '../spotify/types'
import { skip, usePlayer } from '../state/player'
import { loadImage } from '../theme/colors'
import { motionOff, speedFactor } from '../theme/settings'
import { Icon } from './Icons'

/** Décalage horizontal du carrousel, partagé avec le fond (effet parallaxe). */
export const swipeX = motionValue(0)
/** 0 → 1 quand le doigt se pose : les pochettes voisines s'écartent un peu, pour inviter au swipe. */
const press = motionValue(0)
/** Écart, en pixels, des pochettes voisines quand le doigt est posé. */
const PEEK = 14

interface Shown {
  prev: Track | null
  cur: Track | null
  next: Track | null
  next2: Track | null
}

/** Position et aspect d'une pochette selon sa place (0 = centre) et le décalage en cours. */
function place(el: HTMLElement, index: number, x: number, spacing: number, empty: boolean) {
  const p = index + (spacing ? x / spacing : 0)
  const d = Math.abs(p)
  const side = Math.min(d, 1)
  // Les voisines restent en retrait derrière la pochette centrale : plus petites, un peu
  // transparentes, et elles s'écartent légèrement dès que le doigt se pose.
  const scale = 1 - 0.18 * side
  const opacity = empty && index !== 0 ? 0 : d <= 1 ? 1 - 0.42 * d : Math.max(0, 0.58 * (2 - d))
  const peek = Math.sign(p) * side * press.get() * PEEK
  el.style.transform = `translate3d(${p * spacing + peek}px,0,${-side * 60}px) rotateY(${-p * 14}deg) scale(${scale})`
  el.style.opacity = String(opacity)
  el.style.zIndex = String(100 - Math.round(d * 40))
}

function Slot({
  track,
  index,
  spacing,
  onTap,
}: {
  track: Track | null
  index: number
  spacing: number
  onTap?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Le style est écrit directement dans le DOM à chaque mouvement : aucun rendu React
  // pendant le geste, donc 60 images par seconde (transform et opacity uniquement).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const empty = !track
    const draw = () => place(el, index, swipeX.get(), spacing, empty)
    draw()
    const stopX = swipeX.on('change', draw)
    const stopPress = press.on('change', draw)
    return () => {
      stopX()
      stopPress()
    }
  }, [index, spacing, track])

  return (
    <div ref={ref} className="slot" onClick={onTap}>
      {track?.image ? (
        <div className="cover">
          <img src={track.image} alt={index === 0 ? `Pochette de ${track.album}` : ''} draggable={false} />
        </div>
      ) : (
        <div className="cover cover-empty">{index === 0 && <Icon.note />}</div>
      )}
    </div>
  )
}

export function Carousel({ onSwipeUp }: { onSwipeUp: () => void }) {
  const track = usePlayer((s) => s.track)
  const prev = usePlayer((s) => s.prev)
  const upcoming = usePlayer((s) => s.upcoming)
  const target: Shown = { prev, cur: track, next: upcoming[0] ?? null, next2: upcoming[1] ?? null }
  const targetRef = useRef(target)
  targetRef.current = target

  const [shown, setShown] = useState<Shown>(target)
  const shownRef = useRef(shown)
  shownRef.current = shown
  const animating = useRef(false)
  const velocity = useRef(0)
  const dragged = useRef(false)

  // Espacement entre deux pochettes, mesuré sur la pochette centrale.
  const stage = useRef<HTMLDivElement>(null)
  const [spacing, setSpacing] = useState(0)
  useLayoutEffect(() => {
    const measure = () => {
      const slot = stage.current?.querySelector<HTMLElement>('.slot')
      if (slot) setSpacing(slot.offsetWidth * 0.8)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (stage.current) observer.observe(stage.current)
    return () => observer.disconnect()
  }, [])

  // Le titre a changé (swipe optimiste ou changement venu de Spotify) : on joue la transition.
  useEffect(() => {
    const from = shownRef.current
    if (!track || !from.cur || track.id === from.cur.id || motionOff() || !spacing) {
      setShown(targetRef.current)
      swipeX.set(0)
      return
    }
    // Vers la droite si on revient au précédent, vers la gauche sinon.
    const dir = from.prev?.id === track.id && from.next?.id !== track.id ? 1 : -1
    // La pochette qui arrive est placée du bon côté avant de glisser.
    setShown(dir === -1 ? { ...from, next: track } : { ...from, prev: track })
    animating.current = true
    const speed = speedFactor()
    const controls = animate(swipeX, dir * spacing, {
      type: 'spring',
      stiffness: 240 / (speed * speed),
      damping: 28 / speed,
      mass: 1,
      velocity: velocity.current,
      restDelta: 0.5,
    })
    velocity.current = 0
    void controls.then(() => {
      // Échange sans à-coup : les pochettes changent de place dans la même image que le
      // retour à zéro du décalage (elles sont identifiées par titre, donc non rechargées).
      flushSync(() => setShown(targetRef.current))
      swipeX.set(0)
      animating.current = false
    })
    return () => {
      controls.stop()
      animating.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id])

  // Voisins mis à jour (file rechargée) sans changement de titre.
  useEffect(() => {
    if (!animating.current) setShown(targetRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prev?.id, upcoming[0]?.id, upcoming[1]?.id])

  // Préchargement des pochettes à venir, pour qu'aucune n'apparaisse en clignotant.
  useEffect(() => {
    ;[prev, ...upcoming.slice(0, 3)].forEach((t) => t?.image && void loadImage(t.image).catch(() => {}))
  }, [prev, upcoming])

  const back = () => {
    if (motionOff()) swipeX.set(0)
    else animate(swipeX, 0, { type: 'spring', stiffness: 320, damping: 32 })
  }

  const onPan = (_: unknown, info: PanInfo) => {
    if (animating.current) return
    const { x, y } = info.offset
    if (Math.abs(x) < Math.abs(y) && Math.abs(swipeX.get()) < 2) return // geste vertical
    dragged.current = true
    // Résistance élastique s'il n'y a rien de connu dans cette direction.
    const hasTarget = x < 0 ? !!shownRef.current.next : !!shownRef.current.prev
    swipeX.set(hasTarget ? x : x * 0.35)
  }

  const onPanEnd = (_: unknown, info: PanInfo) => {
    setTimeout(() => (dragged.current = false), 50)
    const { x, y } = info.offset
    if (Math.abs(swipeX.get()) < 2) {
      // Swipe vers le haut : ouvre le panneau de personnalisation.
      if (y < -70 && Math.abs(y) > Math.abs(x) * 1.5) onSwipeUp()
      return
    }
    if (animating.current) return
    const width = stage.current?.offsetWidth ?? 320
    const fast = Math.abs(info.velocity.x) > 450 && Math.sign(info.velocity.x) === Math.sign(x)
    if (Math.abs(x) > width * 0.3 || fast) {
      velocity.current = info.velocity.x
      // Mise à jour optimiste : l'animation part tout de suite, l'appel API en parallèle.
      if (skip(x < 0 ? 1 : -1)) return
      velocity.current = 0
    }
    back()
  }

  // Doigt posé : les voisines s'écartent ; doigt levé : elles reviennent.
  const setPress = (value: number) => {
    if (motionOff()) press.set(0)
    else animate(press, value, { type: 'spring', stiffness: 380, damping: 26 })
  }

  const tap = (dir: 1 | -1) => () => {
    if (!dragged.current && !animating.current) skip(dir)
  }

  // Une clé par titre : React déplace les éléments au lieu de recharger les images.
  const slots: { track: Track | null; index: number; key: string }[] = []
  const seen = new Map<string, number>()
  ;[shown.prev, shown.cur, shown.next, shown.next2].forEach((t, i) => {
    const id = t?.id ?? `vide-${i}`
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    slots.push({ track: t, index: i - 1, key: n ? `${id}-${n}` : id })
  })

  return (
    <motion.div
      ref={stage}
      className="stage"
      onPan={onPan}
      onPanEnd={onPanEnd}
      onPointerDown={() => setPress(1)}
      onPointerUp={() => setPress(0)}
      onPointerCancel={() => setPress(0)}
      onPointerLeave={() => setPress(0)}
    >
      {slots.map((s) => (
        <Slot
          key={s.key}
          track={s.track}
          index={s.index}
          spacing={spacing}
          onTap={s.index === 1 ? tap(1) : s.index === -1 ? tap(-1) : undefined}
        />
      ))}
    </motion.div>
  )
}
