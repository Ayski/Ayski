// Historique local : mesure la durée réellement écoutée de chaque titre, détecte les skips
// et comble les trous avec /me/player/recently-played quand l'app était fermée.

import * as api from '../spotify/api'
import { toTrack, type Track } from '../spotify/types'
import { currentProgress, isPending, playerStore, seedPrevious } from '../state/player'
import { addTracks, getPlays, recordPlay } from './library'

interface Session {
  track: Track
  startedAt: number
  listenedMs: number
  lastTick: number
  lastProgress: number
  wasPlaying: boolean
  /** Compteur figé pendant un swipe pas encore confirmé par Spotify. */
  frozen: boolean
}

let session: Session | null = null
/** Au-delà de ce délai sans mise à jour, l'app était en arrière-plan. */
const AWAY_MS = 8000

const skipListeners = new Set<(track: Track) => void>()
/** Prévenu quand un titre vient d'être skippé (le moteur ajuste alors ses choix). */
export function onSkip(fn: (track: Track) => void) {
  skipListeners.add(fn)
  return () => {
    skipListeners.delete(fn)
  }
}

/** Skip = passé avant 30 s ou avant la moitié du titre. */
export const isSkip = (listenedMs: number, durationMs: number) =>
  listenedMs < 30_000 || listenedMs < durationMs * 0.5

function finalize(s: Session, away: boolean) {
  // Changement survenu app fermée : on ne sait pas ce qui a été écouté. On ne garde que
  // les écoutes déjà longues ; le reste sera rattrapé par recently-played.
  if (away && s.listenedMs < 30_000) return
  if (s.listenedMs < 1500) return
  const now = Date.now()
  // Déjà rattrapée par recently-played (retour dans l'app) : pas de doublon.
  const synced = getPlays().some(
    (p) =>
      p.source === 'sync' &&
      p.trackId === s.track.id &&
      p.at + p.durationMs > s.startedAt - 60_000 &&
      p.at + p.durationMs < now + 180_000,
  )
  if (synced) return
  const skipped = !away && isSkip(s.listenedMs, s.track.durationMs)
  const artist = s.track.artists[0]
  void recordPlay({
    trackId: s.track.id,
    artistId: artist?.id ?? '',
    artistName: artist?.name ?? '',
    at: s.startedAt,
    endedAt: now,
    listenedMs: Math.round(s.listenedMs),
    durationMs: s.track.durationMs,
    skipped,
    source: 'live',
  })
  void addTracks([s.track], 'history')
  if (skipped) skipListeners.forEach((fn) => fn(s.track))
}

function observe() {
  const p = playerStore.get()
  const now = Date.now()
  const progress = currentProgress(p)
  if (isPending()) {
    // Swipe optimiste : on arrête le compteur du titre quitté et on attend la confirmation.
    // Si Spotify refuse, ce titre reprend son écoute sans avoir été compté comme un skip.
    if (session && !session.frozen) {
      const dt = now - session.lastTick
      if (dt < AWAY_MS && session.wasPlaying) session.listenedMs += dt
      session.frozen = true
    }
    return
  }
  // État pas encore rafraîchi après une longue absence : on attend le prochain vrai relevé,
  // sinon la position extrapolée ferait croire à une écoute complète.
  if (p.isPlaying && now - p.progressAt >= AWAY_MS) return
  if (session && p.track?.id === session.track.id) {
    if (session.frozen) {
      session.frozen = false
      session.lastTick = now
    }
    const dt = now - session.lastTick
    if (dt < AWAY_MS) {
      if (session.wasPlaying) session.listenedMs += dt
    } else if (progress > session.lastProgress) {
      // Retour au premier plan sur le même titre : la position a avancé d'autant.
      session.listenedMs += progress - session.lastProgress
    }
    session.lastTick = now
    session.lastProgress = progress
    session.wasPlaying = p.isPlaying
    return
  }
  if (session) {
    const dt = now - session.lastTick
    if (!session.frozen && dt < AWAY_MS && session.wasPlaying) session.listenedMs += dt
    finalize(session, !session.frozen && dt >= AWAY_MS)
  }
  session = p.track
    ? // Titre pris en route (app ouverte au milieu) : ce qui a déjà été joué compte, sinon une
      // fin naturelle passerait pour un skip.
      { track: p.track, startedAt: now, listenedMs: progress > 5000 ? progress : 0, lastTick: now, lastProgress: progress, wasPlaying: p.isPlaying, frozen: false }
    : null
}

let lastSync = 0

/** Rattrape les 50 dernières écoutes connues de Spotify (au lancement et au retour dans l'app). */
export async function syncRecentlyPlayed() {
  if (Date.now() - lastSync < 120_000) return
  lastSync = Date.now()
  try {
    const items = await api.getRecentlyPlayed()
    const known = getPlays()
    const current = playerStore.get().track
    const tracks: Track[] = []
    // Du plus ancien au plus récent.
    for (const item of [...items].reverse()) {
      const track = toTrack(item.track)
      const endedAt = Date.parse(item.played_at)
      if (!track || !Number.isFinite(endedAt)) continue
      tracks.push(track)
      const window = track.durationMs + 180_000
      // Écoute en direct : on compare à son intervalle réel (une pause peut l'avoir allongée).
      const already = known.some(
        (p) =>
          p.trackId === track.id &&
          (p.endedAt
            ? endedAt > p.at - 60_000 && endedAt < p.endedAt + 180_000
            : Math.abs(p.at - endedAt) < window),
      )
      if (already) continue
      await recordPlay({
        trackId: track.id,
        artistId: track.artists[0]?.id ?? '',
        artistName: track.artists[0]?.name ?? '',
        at: endedAt - track.durationMs,
        // Spotify ne remonte que les écoutes de plus de 30 s : on les compte comme complètes.
        listenedMs: track.durationMs,
        durationMs: track.durationMs,
        skipped: false,
        source: 'sync',
      })
    }
    await addTracks(tracks, 'history')
    const last = [...tracks].reverse().find((t) => t.id !== current?.id)
    if (last) seedPrevious(last)
  } catch {
    lastSync = 0 // on retentera au prochain retour dans l'app
  }
}

let started = false
export function startHistory() {
  if (started) return
  started = true
  playerStore.subscribe(observe)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void syncRecentlyPlayed()
  })
  void syncRecentlyPlayed()
}
