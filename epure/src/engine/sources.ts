// Sources de titres : likes, playlists, albums sauvegardés, tops. La synchronisation tourne
// en fond, au plus une fois par jour, en espaçant les appels pour ménager le quota.

import * as api from '../spotify/api'
import { SpotifyError } from '../spotify/api'
import { toTrack, type SpPlaylist, type Track } from '../spotify/types'
import { cacheGet, cacheSet } from '../db/db'
import { settingsStore } from '../theme/settings'
import { applyLibrarySync, DAY, engineStore } from './library'

const LIMITS = { liked: 2000, playlists: 25, perPlaylist: 300, albums: 100 }
const PAUSE_MS = 220
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface PlaylistInfo {
  id: string
  name: string
  image: string
  owner: string
  total: number
}
export interface SeedArtist {
  id: string
  name: string
}

const toInfo = (p: SpPlaylist): PlaylistInfo => ({
  id: p.id,
  name: p.name,
  image: p.images?.[0]?.url ?? '',
  owner: p.owner?.display_name ?? '',
  total: p.items?.total ?? p.tracks?.total ?? 0,
})

/** Mes playlists (cache d'une heure pour ne pas rappeler l'API à chaque ouverture). */
export async function loadPlaylists(force = false): Promise<PlaylistInfo[]> {
  if (!force) {
    const cached = await cacheGet<PlaylistInfo[]>('playlists', 3_600_000)
    if (cached) return cached
  }
  const list: PlaylistInfo[] = []
  for await (const page of api.myPlaylists(200)) list.push(...page.filter(Boolean).map(toInfo))
  await cacheSet('playlists', list)
  return list
}

type Fresh = Map<string, { track: Track; sources: Set<string> }>
const add = (fresh: Fresh, track: Track | null, source: string) => {
  if (!track) return
  const entry = fresh.get(track.id) ?? { track, sources: new Set<string>() }
  entry.sources.add(source)
  fresh.set(track.id, entry)
}

/** Charge tous les titres d'une playlist dans le catalogue (mode "Depuis cette playlist"). */
export async function syncPlaylist(id: string, max = 1000) {
  const source = `playlist:${id}`
  const fresh: Fresh = new Map()
  for await (const page of api.playlistItems(id, max)) {
    page.forEach((t) => add(fresh, toTrack(t), source))
    await sleep(PAUSE_MS)
  }
  await applyLibrarySync(fresh, (s) => s === source)
  return fresh.size
}

let running = false

/**
 * Synchronise la bibliothèque. Chaque source est indépendante : un 403 sur l'une (endpoint
 * fermé en mode développement) n'empêche pas les autres. Une source en échec n'est pas
 * "couverte" : ses titres déjà connus sont conservés tels quels.
 */
export async function syncLibrary(force = false) {
  if (running) return
  if (!force && (await cacheGet<number>('library-sync', DAY))) return
  running = true
  const fresh: Fresh = new Map()
  const covered = new Set<string>()
  const status = (text: string | null) => engineStore.set({ syncing: text })
  let aborted = false

  /** Exécute une étape ; s'arrête net si Spotify impose une pause ou si le réseau tombe. */
  const step = async (label: string, kind: string, run: () => Promise<void>) => {
    if (aborted) return
    status(label)
    try {
      await run()
      covered.add(kind)
    } catch (e) {
      if (e instanceof SpotifyError && (e.kind === 'rate' || e.kind === 'offline' || e.kind === 'auth')) {
        aborted = true
      }
    }
  }

  await step('Titres likés…', 'liked', async () => {
    for await (const page of api.savedTracks(LIMITS.liked)) {
      page.forEach((i) => add(fresh, toTrack(i.track), 'liked'))
      await sleep(PAUSE_MS)
    }
  })

  await step('Tops…', 'top', async () => {
    const artists = new Map<string, SeedArtist>()
    for (const range of ['short_term', 'medium_term'] as const) {
      ;(await api.topTracks(range)).forEach((t) => add(fresh, toTrack(t), 'top'))
      ;(await api.topArtists(range)).forEach((a) => artists.set(a.id, { id: a.id, name: a.name }))
      await sleep(PAUSE_MS)
    }
    // Les artistes préférés servent de graines à la découverte Last.fm.
    await cacheSet('top-artists', [...artists.values()])
  })

  await step('Albums…', 'album', async () => {
    for await (const page of api.savedAlbums(LIMITS.albums)) {
      for (const { album } of page) {
        // Les titres d'un album n'ont pas de champ "album" : on leur donne celui du parent.
        album?.tracks?.items?.forEach((t) => add(fresh, toTrack(t, album), 'album'))
      }
      await sleep(PAUSE_MS)
    }
  })

  await step('Playlists…', 'playlist', async () => {
    const playlists = (await loadPlaylists(true)).slice(0, LIMITS.playlists)
    for (const [i, p] of playlists.entries()) {
      status(`Playlists… ${i + 1}/${playlists.length}`)
      try {
        for await (const page of api.playlistItems(p.id, LIMITS.perPlaylist)) {
          page.forEach((t) => add(fresh, toTrack(t), `playlist:${p.id}`))
          await sleep(PAUSE_MS)
        }
      } catch (e) {
        // Une playlist illisible (403) est ignorée ; une pause imposée arrête tout.
        if (e instanceof SpotifyError && e.kind !== 'forbidden' && e.kind !== 'not-found') throw e
      }
    }
  })

  // La playlist du mode "Depuis cette playlist" est chargée en entier à part : on n'y touche pas.
  const active = `playlist:${settingsStore.get().playlistId}`
  const covers = (s: string) => (s.startsWith('playlist:') ? covered.has('playlist') && s !== active : covered.has(s))
  if (covered.size) await applyLibrarySync(fresh, covers)
  if (!aborted) await cacheSet('library-sync', Date.now())
  status(null)
  running = false
}

export const getSeedArtists = async () => (await cacheGet<SeedArtist[]>('top-artists', 30 * DAY)) ?? []
