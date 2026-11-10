// État du lecteur Spotify : polling léger (3 s, en pause en arrière-plan), mises à jour
// optimistes des contrôles et retour à l'état réel en cas d'erreur.

import * as api from '../spotify/api'
import { SpotifyError } from '../spotify/api'
import { toTrack, type SpDevice, type SpPlayback, type Track } from '../spotify/types'
import { createStore, useStore } from './store'
import { toast, toastError } from './toast'
import { haptic } from './haptics'

export interface PlayerState {
  /** loading = premier appel, no-device = aucun appareil actif, idle = rien de lisible. */
  status: 'loading' | 'ready' | 'no-device' | 'idle'
  track: Track | null
  prev: Track | null
  /** Prochains titres de la file Spotify. */
  upcoming: Track[]
  isPlaying: boolean
  progressMs: number
  /** Instant de la mesure de progressMs (pour interpoler entre deux pollings). */
  progressAt: number
  device: SpDevice | null
  liked: boolean
  offline: boolean
}

export const playerStore = createStore<PlayerState>({
  status: 'loading',
  track: null,
  prev: null,
  upcoming: [],
  isPlaying: false,
  progressMs: 0,
  progressAt: Date.now(),
  device: null,
  liked: false,
  offline: typeof navigator !== 'undefined' && navigator.onLine === false,
})
export const usePlayer = <S,>(selector: (s: PlayerState) => S) => useStore(playerStore, selector)

const POLL_MS = 3000
/** Titres joués avant l'actuel pendant cette session (l'API n'expose pas le "précédent"). */
const trail: Track[] = []
/** État juste avant un swipe optimiste, pour y revenir si Spotify refuse ou fait autre chose. */
interface Snapshot {
  state: Pick<PlayerState, 'track' | 'prev' | 'upcoming' | 'isPlaying' | 'liked'>
  progress: number
  at: number
  trail: Track[]
}
/** Changement optimiste en attente de confirmation par Spotify. */
let pending: { id: string; fromId: string; until: number; snapshot: Snapshot } | null = null
/** Vrai tant qu'un swipe n'est pas confirmé : l'historique attend avant de compter quoi que ce soit. */
export const isPending = () => pending !== null
/** Numéro des appels à /me/player : une réponse arrivée en retard ne doit pas écraser une plus récente. */
let requestSeq = 0
let appliedSeq = 0
/** Dernière action de l'utilisateur : une réponse partie avant est périmée. */
let lastActionAt = 0

/** Annule l'affichage optimiste et revient à l'état d'avant le swipe. */
function rollback() {
  if (!pending) return
  const { snapshot } = pending
  pending = null
  trail.length = 0
  trail.push(...snapshot.trail)
  const now = Date.now()
  playerStore.set({
    ...snapshot.state,
    progressMs: snapshot.progress + (snapshot.state.isPlaying ? now - snapshot.at : 0),
    progressAt: now,
  })
}
let timer: ReturnType<typeof setTimeout> | undefined
let running = false

/** Position estimée à l'instant présent. */
export function currentProgress(s: PlayerState = playerStore.get()): number {
  if (!s.track) return 0
  const p = s.isPlaying ? s.progressMs + (Date.now() - s.progressAt) : s.progressMs
  return Math.max(0, Math.min(s.track.durationMs, p))
}

/** Donne un "précédent" de départ (dernier titre de l'historique Spotify). */
export function seedPrevious(track: Track) {
  const s = playerStore.get()
  if (!trail.length && s.track?.id !== track.id) {
    trail.push(track)
    playerStore.set({ prev: track })
  }
}

/** Applique un changement de titre, qu'il vienne d'un swipe ou de Spotify. */
function commitTrack(track: Track, extra: Partial<PlayerState> = {}) {
  const s = playerStore.get()
  if (s.track && s.track.id !== track.id) {
    if (trail[trail.length - 1]?.id === track.id) trail.pop() // retour en arrière
    else {
      trail.push(s.track)
      if (trail.length > 40) trail.shift()
    }
  }
  playerStore.set({
    track,
    prev: trail[trail.length - 1] ?? null,
    progressMs: 0,
    progressAt: Date.now(),
    liked: false,
    ...extra,
  })
  void checkLiked(track)
  setTimeout(() => void refreshQueue(), 350)
}

async function checkLiked(track: Track) {
  try {
    const [liked] = await api.libraryContains([track.uri])
    if (playerStore.get().track?.id === track.id) playerStore.set({ liked: !!liked })
  } catch {
    /* le cœur reste vide : sans gravité */
  }
}

function applyPlayback(pb: SpPlayback | null) {
  if (!pb || !pb.device) {
    rollback()
    playerStore.set({ status: 'no-device', isPlaying: false, device: null, offline: false })
    return
  }
  const track = toTrack(pb.item)
  const base: Partial<PlayerState> = { device: pb.device, offline: false }
  if (!track) {
    // Podcast, fichier local… : plus de titre affiché, sinon l'historique créditerait le dernier.
    rollback()
    playerStore.set({ ...base, status: 'idle', track: null, isPlaying: false })
    return
  }
  const now = Date.now()
  if (pending) {
    if (track.id === pending.id) {
      pending = null // Spotify confirme le swipe
    } else if (track.id === pending.fromId && now < pending.until) {
      // Spotify n'a pas encore pris en compte le swipe : on garde l'affichage optimiste.
      playerStore.set({ ...base, status: 'ready' })
      return
    } else {
      // Spotify joue autre chose que prévu (ou n'a pas bougé) : on repart de l'état réel.
      rollback()
    }
  }
  const timing = { isPlaying: pb.is_playing, progressMs: pb.progress_ms ?? 0, progressAt: now }
  if (playerStore.get().track?.id !== track.id) {
    commitTrack(track, { ...base, ...timing, status: 'ready' })
  } else {
    playerStore.set({ ...base, ...timing, status: 'ready' })
  }
}

/** Interroge Spotify une fois. */
export async function refresh() {
  const seq = ++requestSeq
  const startedAt = Date.now()
  try {
    const playback = await api.getPlayback()
    // Réponse dépassée par une plus récente, ou partie avant la dernière action : on l'ignore.
    if (seq < appliedSeq || startedAt < lastActionAt) return
    appliedSeq = seq
    applyPlayback(playback)
  } catch (e) {
    if (!(e instanceof SpotifyError)) return
    if (e.kind === 'offline') playerStore.set({ offline: true })
    else if (e.kind === 'premium' || e.kind === 'scope' || e.kind === 'forbidden') {
      // Refus durable : on le dit (une seule fois) au lieu de rester sur un écran vide.
      toastError(e)
      if (playerStore.get().status === 'loading') playerStore.set({ status: 'idle' })
    } else if (e.kind === 'rate' && playerStore.get().status === 'loading') {
      toastError(e)
    }
    // Sinon : on réessaiera au prochain tour, sans casser l'interface.
  }
}

export async function refreshQueue() {
  try {
    const q = await api.getQueue()
    const current = playerStore.get().track
    if (!q || (pending && q.currently_playing?.id !== current?.id)) return
    const upcoming = q.queue.map((t) => toTrack(t)).filter((t): t is Track => t !== null)
    playerStore.set({ upcoming })
  } catch {
    /* la file est un bonus d'affichage */
  }
}

function loop() {
  clearTimeout(timer)
  if (!running || document.hidden) return
  timer = setTimeout(async () => {
    await refresh()
    loop()
  }, POLL_MS)
}
function onVisibility() {
  if (document.hidden) clearTimeout(timer)
  else if (running) {
    void refresh()
    loop()
  }
}
const onOnline = () => {
  playerStore.set({ offline: false })
  void refresh()
}
const onOffline = () => playerStore.set({ offline: true })

export function startPolling() {
  if (running) return
  running = true
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  void refresh()
  loop()
}
export function stopPolling() {
  running = false
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
}

/** Deux vérifications rapprochées après une action, pour confirmer vite l'état réel. */
function confirmSoon() {
  setTimeout(() => void refresh(), 500)
  setTimeout(() => void refresh(), 1500)
}

function fail(e: unknown) {
  rollback()
  toastError(e)
  void refresh()
}

// ---------------------------------------------------------------- contrôles

export function togglePlay() {
  const s = playerStore.get()
  haptic()
  if (s.status === 'no-device') {
    toast('Ouvre Spotify et lance un titre pour commencer.')
    return
  }
  const playing = !s.isPlaying
  lastActionAt = Date.now()
  playerStore.set({ isPlaying: playing, progressMs: currentProgress(s), progressAt: Date.now() })
  ;(playing ? api.play() : api.pause()).then(confirmSoon, fail)
}

/**
 * Titre suivant (1) ou précédent (-1). L'affichage change tout de suite si la cible est
 * connue ; renvoie false sinon (l'animation attendra la réponse de Spotify).
 */
export function skip(dir: 1 | -1): boolean {
  const s = playerStore.get()
  haptic()
  if (s.status === 'no-device') {
    toast('Ouvre Spotify et lance un titre pour commencer.')
    return false
  }
  const target = dir === 1 ? s.upcoming[0] : s.prev
  lastActionAt = Date.now()
  if (target && s.track) {
    pending = {
      id: target.id,
      fromId: s.track.id,
      until: Date.now() + 3500,
      snapshot: {
        state: { track: s.track, prev: s.prev, upcoming: s.upcoming, isPlaying: s.isPlaying, liked: s.liked },
        progress: currentProgress(s),
        at: Date.now(),
        trail: [...trail],
      },
    }
    commitTrack(target, {
      isPlaying: true,
      upcoming: dir === 1 ? s.upcoming.slice(1) : [s.track, ...s.upcoming],
    })
  }
  ;(dir === 1 ? api.next() : api.previous()).then(confirmSoon, fail)
  return !!(target && s.track)
}

export function seekTo(ms: number) {
  lastActionAt = Date.now()
  playerStore.set({ progressMs: ms, progressAt: Date.now() })
  api.seek(ms).then(() => setTimeout(() => void refresh(), 700), fail)
}

export function toggleLike() {
  const s = playerStore.get()
  if (!s.track) return
  const track = s.track
  const liked = !s.liked
  haptic()
  playerStore.set({ liked })
  ;(liked ? api.saveToLibrary([track.uri]) : api.removeFromLibrary([track.uri])).catch((e) => {
    if (playerStore.get().track?.id === track.id) playerStore.set({ liked: !liked })
    toastError(e)
  })
}
