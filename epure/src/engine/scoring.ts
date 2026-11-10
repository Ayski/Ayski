// Cœur d'Epure Flow : note chaque titre candidat puis compose une suite qui respecte les
// règles d'anti-répétition (repos, pas deux fois le même artiste d'affilée, 2 sur 10 max).

import type { PoolTrack } from '../db/db'
import { DAY, getFlags, getPlays, getPool, getStats, type Stats } from './library'

export interface Scored {
  track: PoolTrack
  score: number
  /** Raison principale, affichée en petit dans la file. */
  reason: string
  /** Détail du score (mode debug). */
  parts: Record<string, number>
  discovery: boolean
}

/** "3 jours", "2 semaines", "4 mois"… */
export function ago(ms: number): string {
  const days = ms / DAY
  if (days < 1) return 'quelques heures'
  if (days < 2) return 'hier'
  if (days < 14) return `${Math.round(days)} jours`
  if (days < 60) return `${Math.round(days / 7)} semaines`
  return `${Math.round(days / 30)} mois`
}

/** Note un titre ; null s'il est exclu (banni, au repos, ou entendu il y a moins de 6 h). */
export function scoreTrack(track: PoolTrack, stats: Stats, now: number, rand: () => number): Scored | null {
  const flags = getFlags(track.id)
  if (flags?.banned) return null
  const st = stats.tracks.get(track.id)
  const loved = !!flags?.loved
  if (st && !loved) {
    if (st.restUntil > now) return null
    if (now - st.lastAt < 6 * 3_600_000) return null
  }
  const artist = stats.artists.get(track.artists[0]?.id ?? '')
  const parts: Record<string, number> = {}

  if (st) {
    // Fraîcheur : monte doucement avec le temps écoulé (≈ 63 % du maximum après 3 semaines).
    parts['fraîcheur'] = 40 * (1 - Math.exp(-(now - st.lastAt) / (21 * DAY)))
    if (st.recent14) parts['écoutes récentes'] = -12 * st.recent14
    if (st.skips) parts['skips'] = -(st.skips >= 2 ? 60 : 25) * st.skipRate
  } else {
    parts['jamais écouté'] = 30
  }
  if (artist) {
    const taste = ((artist.completes - 2 * artist.skips) / (artist.completes + artist.skips + 3)) * 10
    const bonus = Math.max(-10, Math.min(15, taste + Math.min(artist.liked, 5) * 1.5))
    if (bonus) parts['artiste'] = bonus
  }
  if (loved) parts['adoré'] = 25
  parts['hasard'] = rand() * 18

  const discovery = !st && track.sources.every((s) => s === 'discovery')
  let reason: string
  if (loved) reason = 'Tu l’adores'
  else if (discovery) reason = track.via ? `Découverte · ${track.via}` : 'Découverte'
  else if (!st) reason = 'Jamais écouté ici'
  else reason = `Pas entendu depuis ${ago(now - st.lastAt)}`
  if (!discovery && (parts['artiste'] ?? 0) > 8) reason += ' · artiste apprécié'

  const score = Object.values(parts).reduce((a, b) => a + b, 0)
  return { track, score, reason, parts, discovery }
}

export interface PickOptions {
  /** Titres à ne pas reproposer (en cours, déjà planifiés). */
  exclude: Set<string>
  /** Artistes des derniers titres, du plus ancien au plus récent. */
  recentArtists: string[]
  /** Probabilité, de 0 à 1, qu'un choix soit une découverte. */
  adventure: number
  /** Limite le choix à une playlist ("Depuis cette playlist"). */
  playlistId?: string | null
  rand?: () => number
}

/** Les artistes des dernières écoutes enregistrées (pour amorcer la fenêtre de 10). */
export function recentArtistsFromHistory(max = 9): string[] {
  return getPlays()
    .slice(-max)
    .map((p) => p.artistId)
}

/** Choisit `n` titres, dans l'ordre où ils seront joués. */
export function pickTracks(n: number, opts: PickOptions): Scored[] {
  const rand = opts.rand ?? Math.random
  const stats = getStats()
  const now = Date.now()
  const source = opts.playlistId ? `playlist:${opts.playlistId}` : null

  const known: Scored[] = []
  const fresh: Scored[] = []
  for (const track of getPool().values()) {
    if (opts.exclude.has(track.id)) continue
    if (source && !track.sources.includes(source)) continue
    const scored = scoreTrack(track, stats, now, rand)
    if (scored) (scored.discovery ? fresh : known).push(scored)
  }
  known.sort((a, b) => b.score - a.score)
  fresh.sort((a, b) => b.score - a.score)

  const window = opts.recentArtists.slice(-9)
  const result: Scored[] = []

  // Règles d'artiste, de la plus stricte à la plus souple (petites bibliothèques).
  const rules: ((artistId: string) => boolean)[] = [
    (a) => window[window.length - 1] !== a && window.filter((x) => x === a).length < 2,
    (a) => window[window.length - 1] !== a,
    () => true,
  ]

  for (let i = 0; i < n; i++) {
    const wantFresh = !source && rand() < opts.adventure
    const buckets = wantFresh ? [fresh, known] : [known, fresh]
    let chosen: Scored | undefined
    for (const rule of rules) {
      for (const bucket of buckets) {
        const index = bucket.findIndex((s) => rule(s.track.artists[0]?.id ?? ''))
        if (index >= 0) {
          chosen = bucket.splice(index, 1)[0]
          break
        }
      }
      if (chosen) break
    }
    if (!chosen) break
    result.push(chosen)
    window.push(chosen.track.artists[0]?.id ?? '')
    if (window.length > 9) window.shift()
  }
  return result
}
