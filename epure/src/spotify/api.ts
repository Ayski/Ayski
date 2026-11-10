// Client HTTP de l'API Web Spotify : jeton, erreurs lisibles, quotas (429) et hors-ligne.
// Tous les endpoints utilisés sont ceux encore ouverts en mode développement (migration
// de février 2026) : pas de recommendations, audio-features, related-artists, top tracks
// d'artiste, new-releases ni récupération en lot.

import { getAccessToken, refreshAccessToken } from './auth'
import type { SpDevice, SpPaging, SpPlayback, SpPlaylist, SpQueue, SpTrack, SpAlbum, SpArtist } from './types'

const BASE = 'https://api.spotify.com/v1'

export type ErrorKind =
  | 'auth'
  | 'premium'
  | 'scope'
  | 'forbidden'
  | 'no-device'
  | 'not-found'
  | 'rate'
  | 'offline'
  | 'unknown'

export class SpotifyError extends Error {
  constructor(
    public kind: ErrorKind,
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Jusqu'à quand Spotify nous demande de patienter (429). 0 = pas de limite en cours. */
let rateLimitedUntil = 0
export const rateLimitRemainingMs = () => Math.max(0, rateLimitedUntil - Date.now())

type Query = Record<string, string | number | boolean | undefined>

interface Options {
  query?: Query
  body?: unknown
  /** Les appels de fond (polling, synchro) abandonnent tout de suite pendant un 429. */
  background?: boolean
}

function describe403(reason: string, message: string): SpotifyError {
  const text = `${reason} ${message}`.toLowerCase()
  if (text.includes('premium')) {
    return new SpotifyError('premium', 403, 'Spotify Premium est requis pour contrôler la lecture.')
  }
  if (text.includes('scope')) {
    return new SpotifyError('scope', 403, 'Autorisation manquante : déconnecte-toi puis reconnecte-toi.')
  }
  return new SpotifyError(
    'forbidden',
    403,
    'Action refusée par Spotify (endpoint indisponible en mode développement, ou compte non ajouté à l’app).',
  )
}

async function request<T>(method: string, path: string, opts: Options = {}, retried = false): Promise<T> {
  if (rateLimitRemainingMs() > 0 && opts.background) {
    throw new SpotifyError('rate', 429, 'Spotify demande une pause.')
  }
  const token = await getAccessToken()
  if (!token) throw new SpotifyError('auth', 401, 'Session expirée.')

  const url = new URL(path.startsWith('http') ? path : BASE + path)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v))
  }

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new SpotifyError('offline', 0, 'Hors connexion.')
  }

  if (res.status === 401 && !retried) {
    // Jeton périmé : on le rafraîchit une fois, sinon retour à la connexion (géré par auth).
    const fresh = await refreshAccessToken()
    if (fresh) return request<T>(method, path, opts, true)
    throw new SpotifyError('auth', 401, 'Session expirée.')
  }

  if (res.status === 429) {
    const wait = Number(res.headers.get('Retry-After') ?? '5')
    rateLimitedUntil = Date.now() + (Number.isFinite(wait) ? wait : 5) * 1000
    throw new SpotifyError(
      'rate',
      429,
      wait > 120
        ? 'Quota Spotify atteint. L’app se met en pause un moment.'
        : `Spotify demande une pause de ${Math.ceil(wait)} s.`,
    )
  }

  if (!res.ok) {
    let reason = ''
    let message = ''
    try {
      const json = await res.json()
      reason = json?.error?.reason ?? ''
      message = json?.error?.message ?? ''
    } catch {
      /* corps vide ou non JSON */
    }
    if (res.status === 403) throw describe403(reason, message)
    if (res.status === 404) {
      if (reason === 'NO_ACTIVE_DEVICE' || /device/i.test(message)) {
        throw new SpotifyError('no-device', 404, 'Ouvre Spotify et lance un titre pour commencer.')
      }
      throw new SpotifyError('not-found', 404, 'Introuvable sur Spotify.')
    }
    throw new SpotifyError('unknown', res.status, message || `Erreur Spotify (${res.status}).`)
  }

  if (res.status === 204) return null as T
  // Certains endpoints du lecteur répondent 200 avec un corps vide ou non JSON.
  const text = await res.text()
  if (!text) return null as T
  try {
    return JSON.parse(text) as T
  } catch {
    return null as T
  }
}

const get = <T>(path: string, query?: Query, background = false) => request<T>('GET', path, { query, background })

// ---------------------------------------------------------------- lecteur

export const getPlayback = () => get<SpPlayback | null>('/me/player', { additional_types: 'track' }, true)
export const getQueue = () => get<SpQueue | null>('/me/player/queue', undefined, true)
export const getDevices = async () => (await get<{ devices: SpDevice[] }>('/me/player/devices'))?.devices ?? []

export const play = (body?: { uris?: string[]; context_uri?: string; position_ms?: number }, deviceId?: string) =>
  request<null>('PUT', '/me/player/play', { query: { device_id: deviceId }, body: body ?? {} })
export const pause = () => request<null>('PUT', '/me/player/pause')
export const next = () => request<null>('POST', '/me/player/next')
export const previous = () => request<null>('POST', '/me/player/previous')
export const seek = (positionMs: number) =>
  request<null>('PUT', '/me/player/seek', { query: { position_ms: Math.round(positionMs) } })
export const transfer = (deviceId: string, startPlaying = true) =>
  request<null>('PUT', '/me/player', { body: { device_ids: [deviceId], play: startPlaying } })
export const addToQueue = (uri: string) => request<null>('POST', '/me/player/queue', { query: { uri } })

export const getRecentlyPlayed = async () =>
  (
    await get<SpPaging<{ track: SpTrack; played_at: string }>>(
      '/me/player/recently-played',
      { limit: 50 },
      true,
    )
  )?.items ?? []

// ---------------------------------------------------------------- bibliothèque
// Endpoints génériques (février 2026) : ils prennent des URIs Spotify, pas des identifiants.

export const saveToLibrary = (uris: string[]) =>
  request<null>('PUT', '/me/library', { query: { uris: uris.join(',') } })
export const removeFromLibrary = (uris: string[]) =>
  request<null>('DELETE', '/me/library', { query: { uris: uris.join(',') } })
export const libraryContains = async (uris: string[]) =>
  (await get<boolean[]>('/me/library/contains', { uris: uris.join(',') }, true)) ?? []

/** Parcourt une liste paginée, page après page, jusqu'à `max` éléments. */
async function* paginate<T>(path: string, query: Query, max: number): AsyncGenerator<T[]> {
  let url: string | null = path
  let q: Query | undefined = { limit: 50, ...query }
  let seen = 0
  while (url && seen < max) {
    const page: SpPaging<T> | null = await get<SpPaging<T>>(url, q, true)
    if (!page?.items?.length) return
    seen += page.items.length
    yield page.items
    url = page.next
    q = undefined // "next" contient déjà tous les paramètres
  }
}

export const savedTracks = (max: number) => paginate<{ track: SpTrack }>('/me/tracks', {}, max)
export const savedAlbums = (max: number) =>
  paginate<{ album: SpAlbum & { tracks?: SpPaging<SpTrack> } }>('/me/albums', {}, max)
export const myPlaylists = (max: number) => paginate<SpPlaylist>('/me/playlists', {}, max)

/**
 * Titres d'une playlist via /items (ex-/tracks). Selon la version de l'API, le titre est
 * sous "item" ou sous "track" (qui peut alors être un simple booléen) : on lit les deux.
 */
export async function* playlistItems(playlistId: string, max: number): AsyncGenerator<SpTrack[]> {
  type Entry = { item?: SpTrack | null; track?: SpTrack | boolean | null }
  for await (const page of paginate<Entry>(`/playlists/${playlistId}/items`, {}, max)) {
    yield page
      .map((e) => (e.item && typeof e.item === 'object' ? e.item : typeof e.track === 'object' ? e.track : null))
      .filter((t): t is SpTrack => t !== null)
  }
}

export const topTracks = async (range: 'short_term' | 'medium_term' | 'long_term') =>
  (await get<SpPaging<SpTrack>>('/me/top/tracks', { limit: 50, time_range: range }, true))?.items ?? []
export const topArtists = async (range: 'short_term' | 'medium_term' | 'long_term') =>
  (await get<SpPaging<SpArtist>>('/me/top/artists', { limit: 50, time_range: range }, true))?.items ?? []

/** Recherche de titres : 10 résultats maximum en mode développement. */
export const searchTracks = async (q: string) =>
  (await get<{ tracks?: SpPaging<SpTrack> }>('/search', { q, type: 'track', limit: 10 }, true))?.tracks?.items ?? []
