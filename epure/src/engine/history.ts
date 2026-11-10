// Historique local : mesure la durée réellement écoutée de chaque titre, détecte les skips
// et comble les trous avec /me/player/recently-played quand l'app était fermée.

import * as api from '../spotify/api'
import { toTrack, type Track } from '../spotify/types'
import { currentProgress, playerStore, seedPrevious } from '../state/player'
import { addTracks, getPlays, recordPlay } from './library'

interface Session {
  track: Track
  startedAt: number
  listenedMs: number
  lastTick: number
  lastProgress: number
  wasPlaying: boolean
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
  const skipped = !away && isSkip(s.listenedMs, s.track.durationMs)
  const artist = s.track.artists[0]
  void recordPlay({
    trackId: s.track.id,
    artistId: artist?.id ?? '',
    artistName: artist?.name ?? '',
    at: s.startedAt,
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
  if (session && p.track?.id === session.track.id) {
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
    if (dt < AWAY_MS && session.wasPlaying) session.listenedMs += dt
    finalize(session, dt >= AWAY_MS)
  }
  session = p.track
    ? { track: p.track, startedAt: now, listenedMs: 0, lastTick: now, lastProgress: progress, wasPlaying: p.isPlaying }
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
      const already = known.some((p) => p.trackId === track.id && Math.abs(p.at - endedAt) < window)
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
