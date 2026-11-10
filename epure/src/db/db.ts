// Base IndexedDB locale (via idb) : historique d'écoute, catalogue de titres, drapeaux
// (banni / adoré), cache des appels externes et fonds d'écran. Rien ne quitte le téléphone.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Track } from '../spotify/types'

/** Une écoute enregistrée. */
export interface Play {
  key?: number
  trackId: string
  artistId: string
  artistName: string
  /** Début de l'écoute (ms epoch). */
  at: number
  /** Fin de l'écoute, pour les écoutes observées en direct (pauses comprises). */
  endedAt?: number
  /** Durée réellement écoutée. */
  listenedMs: number
  durationMs: number
  /** Passé avant 30 s ou avant la moitié du titre. */
  skipped: boolean
  /** "live" = observé par l'app, "sync" = rattrapé via recently-played. */
  source: 'live' | 'sync'
}

/** Titre du catalogue local, avec la liste de ses provenances. */
export interface PoolTrack extends Track {
  /** "liked", "album", "top", "history", "discovery" ou "playlist:<id>". */
  sources: string[]
  /** Pour une découverte : d'où vient la suggestion ("proche de …"). */
  via?: string
}

export interface Flags {
  trackId: string
  banned?: boolean
  /** "Je l'adore, repasse-le" : ignore la mise au repos. */
  loved?: boolean
}

export interface Wallpaper {
  id: string
  kind: 'image' | 'gif' | 'video'
  blob: Blob
  thumb: Blob
  /** Luminance moyenne 0..1, pour le contraste automatique. */
  luminance: number
  createdAt: number
}

interface CacheEntry {
  key: string
  value: unknown
  at: number
}

interface Schema extends DBSchema {
  plays: { key: number; value: Play; indexes: { at: number; trackId: string } }
  tracks: { key: string; value: PoolTrack }
  flags: { key: string; value: Flags }
  cache: { key: string; value: CacheEntry }
  wallpapers: { key: string; value: Wallpaper }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null
export function db() {
  dbPromise ??= openDB<Schema>('epure', 1, {
    upgrade(d) {
      const plays = d.createObjectStore('plays', { keyPath: 'key', autoIncrement: true })
      plays.createIndex('at', 'at')
      plays.createIndex('trackId', 'trackId')
      d.createObjectStore('tracks', { keyPath: 'id' })
      d.createObjectStore('flags', { keyPath: 'trackId' })
      d.createObjectStore('cache', { keyPath: 'key' })
      d.createObjectStore('wallpapers', { keyPath: 'id' })
    },
  })
  return dbPromise
}

// ---------------------------------------------------------------- cache clé / valeur

/** Lit une valeur du cache si elle a moins de `maxAgeMs`. */
export async function cacheGet<T>(key: string, maxAgeMs: number): Promise<T | undefined> {
  try {
    const entry = await (await db()).get('cache', key)
    if (!entry || Date.now() - entry.at > maxAgeMs) return undefined
    return entry.value as T
  } catch {
    return undefined
  }
}
export async function cacheSet(key: string, value: unknown) {
  try {
    await (await db()).put('cache', { key, value, at: Date.now() })
  } catch {
    /* stockage plein ou indisponible : le cache est facultatif */
  }
}

// ---------------------------------------------------------------- lectures globales

export const allTracks = async () => (await db()).getAll('tracks')
export const allPlays = async () => (await db()).getAll('plays')
export const allFlags = async () => (await db()).getAll('flags')
