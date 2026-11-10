// Données du moteur gardées en mémoire (écoutes, catalogue, drapeaux) et statistiques
// dérivées. IndexedDB sert de stockage durable ; la mémoire sert aux calculs rapides.

import { allFlags, allPlays, allTracks, db, type Flags, type Play, type PoolTrack } from '../db/db'
import type { Track } from '../spotify/types'
import { createStore, useStore } from '../state/store'
import { settingsStore } from '../theme/settings'

export const DAY = 86_400_000

/** `version` augmente à chaque changement de données : les écrans s'y abonnent. */
export const engineStore = createStore<{ version: number; ready: boolean; syncing: string | null }>({
  version: 0,
  ready: false,
  syncing: null,
})
export const useEngineVersion = () => useStore(engineStore, (s) => s.version)

let plays: Play[] = []
const pool = new Map<string, PoolTrack>()
const flags = new Map<string, Flags>()

const bump = () => engineStore.set((s) => ({ version: s.version + 1 }))

export async function loadEngineData() {
  try {
    const [p, t, f] = await Promise.all([allPlays(), allTracks(), allFlags()])
    plays = p
    pool.clear()
    t.forEach((x) => pool.set(x.id, x))
    flags.clear()
    f.forEach((x) => flags.set(x.trackId, x))
  } catch {
    /* IndexedDB indisponible : le moteur tourne à vide mais l'app reste utilisable */
  }
  engineStore.set((s) => ({ ready: true, version: s.version + 1 }))
}

export const getPlays = () => plays
export const getPool = () => pool
export const getFlags = (id: string) => flags.get(id)
export const allFlagged = () => [...flags.values()]

export async function recordPlay(play: Play) {
  plays.push(play)
  bump()
  try {
    await (await db()).add('plays', play)
  } catch {
    /* l'écoute reste comptée pour cette session */
  }
}

/** Ajoute des titres au catalogue en fusionnant leurs provenances. */
export async function addTracks(tracks: Track[], source: string, via?: string) {
  const changed: PoolTrack[] = []
  for (const t of tracks) {
    const existing = pool.get(t.id)
    if (existing?.sources.includes(source)) continue
    const merged: PoolTrack = {
      ...existing,
      ...t,
      sources: [...(existing?.sources ?? []), source],
      via: existing?.via ?? via,
    }
    pool.set(t.id, merged)
    changed.push(merged)
  }
  if (!changed.length) return
  bump()
  try {
    const tx = (await db()).transaction('tracks', 'readwrite')
    await Promise.all(changed.map((t) => tx.store.put(t)))
    await tx.done
  } catch {
    /* catalogue en mémoire seulement */
  }
}

/**
 * Remplace les provenances "bibliothèque" après une synchronisation : tout titre qui
 * portait une provenance couverte par `covers` la perd, sauf s'il figure dans `fresh`.
 * Un titre retiré de mes likes ou d'une playlist disparaît donc du catalogue.
 */
export async function applyLibrarySync(
  fresh: Map<string, { track: Track; sources: Set<string> }>,
  covers: (source: string) => boolean,
) {
  const puts: PoolTrack[] = []
  const deletes: string[] = []
  for (const [id, t] of pool) {
    if (!t.sources.some(covers)) continue
    const kept = t.sources.filter((s) => !covers(s))
    const f = fresh.get(id)
    if (!f && !kept.length) {
      pool.delete(id)
      deletes.push(id)
    } else if (!f) {
      const next = { ...t, sources: kept }
      pool.set(id, next)
      puts.push(next)
    }
  }
  for (const [id, f] of fresh) {
    const existing = pool.get(id)
    const kept = (existing?.sources ?? []).filter((s) => !covers(s))
    const next: PoolTrack = { ...existing, ...f.track, sources: [...new Set([...kept, ...f.sources])] }
    pool.set(id, next)
    puts.push(next)
  }
  bump()
  try {
    const tx = (await db()).transaction('tracks', 'readwrite')
    await Promise.all([...puts.map((t) => tx.store.put(t)), ...deletes.map((id) => tx.store.delete(id))])
    await tx.done
  } catch {
    /* catalogue en mémoire seulement */
  }
}

export async function setFlag(trackId: string, patch: Partial<Flags>) {
  const next = { ...(flags.get(trackId) ?? { trackId }), ...patch }
  const empty = !next.banned && !next.loved
  if (empty) flags.delete(trackId)
  else flags.set(trackId, next)
  bump()
  try {
    const d = await db()
    if (empty) await d.delete('flags', trackId)
    else await d.put('flags', next)
  } catch {
    /* drapeau en mémoire seulement */
  }
}

// ---------------------------------------------------------------- statistiques

export interface TrackStats {
  /** Écoutes complètes (non skippées). */
  count: number
  /** Écoutes complètes sur les 14 derniers jours. */
  recent14: number
  /** Dernière écoute, skip compris. */
  lastAt: number
  skips: number
  skipRate: number
  /** Fin de la mise au repos (0 = pas au repos). */
  restUntil: number
}
export interface ArtistStats {
  name: string
  completes: number
  skips: number
  /** Nombre de titres likés de cet artiste. */
  liked: number
}
export interface Stats {
  tracks: Map<string, TrackStats>
  artists: Map<string, ArtistStats>
}

let cached: { version: number; rest: number; at: number; stats: Stats } | null = null

/** Statistiques par titre et par artiste, recalculées seulement quand les données changent. */
export function getStats(): Stats {
  const version = engineStore.get().version
  const rest = settingsStore.get().restBaseDays
  const now = Date.now()
  if (cached && cached.version === version && cached.rest === rest && now - cached.at < 60_000) {
    return cached.stats
  }
  const tracks = new Map<string, TrackStats>()
  const artists = new Map<string, ArtistStats>()
  const artist = (id: string, name: string) => {
    let a = artists.get(id)
    if (!a) artists.set(id, (a = { name, completes: 0, skips: 0, liked: 0 }))
    return a
  }
  for (const p of plays) {
    let t = tracks.get(p.trackId)
    if (!t) tracks.set(p.trackId, (t = { count: 0, recent14: 0, lastAt: 0, skips: 0, skipRate: 0, restUntil: 0 }))
    const a = artist(p.artistId, p.artistName)
    if (p.skipped) {
      t.skips++
      a.skips++
    } else {
      t.count++
      a.completes++
      if (now - p.at < 14 * DAY) t.recent14++
    }
    if (p.at > t.lastAt) t.lastAt = p.at
  }
  for (const t of tracks.values()) {
    t.skipRate = t.skips / Math.max(1, t.skips + t.count)
    // Repos : dès 2 écoutes en 14 jours, et d'autant plus long que le titre a tourné.
    if (t.recent14 >= 2) t.restUntil = t.lastAt + rest * (t.recent14 - 1) * DAY
  }
  for (const t of pool.values()) {
    if (t.sources.includes('liked') && t.artists[0]) artist(t.artists[0].id, t.artists[0].name).liked++
  }
  cached = { version, rest, at: now, stats: { tracks, artists } }
  return cached.stats
}

/** Un titre est-il au repos en ce moment (et pas forcé par "Je l'adore") ? */
export function isResting(id: string, stats = getStats()): boolean {
  const s = stats.tracks.get(id)
  return !!s && s.restUntil > Date.now() && !flags.get(id)?.loved
}
