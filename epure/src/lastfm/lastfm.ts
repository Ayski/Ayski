// Client Last.fm (API publique en lecture, clé gratuite). Sert uniquement à trouver des
// artistes et des titres proches de mes goûts ; chaque réponse est mise en cache 14 jours.

import { cacheGet, cacheSet } from '../db/db'

const KEY = import.meta.env.VITE_LASTFM_API_KEY ?? ''
const BASE = 'https://ws.audioscrobbler.com/2.0/'
const TTL = 14 * 86_400_000

export const hasLastfm = () => KEY.length > 0

export interface LfmTrack {
  artist: string
  title: string
}

async function call<T>(params: Record<string, string>): Promise<T | null> {
  if (!hasLastfm()) return null
  const cacheKey = 'lfm:' + Object.values(params).join('|').toLowerCase()
  const cached = await cacheGet<T>(cacheKey, TTL)
  if (cached !== undefined) return cached
  try {
    const url = new URL(BASE)
    Object.entries({ ...params, api_key: KEY, format: 'json', autocorrect: '1' }).forEach(([k, v]) =>
      url.searchParams.set(k, v),
    )
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as T & { error?: number }
    if (json.error) return null
    await cacheSet(cacheKey, json)
    return json
  } catch {
    return null
  }
}

/** Artistes similaires (artist.getSimilar). */
export async function similarArtists(artist: string): Promise<string[]> {
  const json = await call<{ similarartists?: { artist?: { name: string }[] } }>({
    method: 'artist.getsimilar',
    artist,
    limit: '20',
  })
  return json?.similarartists?.artist?.map((a) => a.name) ?? []
}

/** Titres les plus connus d'un artiste (artist.getTopTracks), pour choisir quoi lui faire jouer. */
export async function artistTopTracks(artist: string): Promise<LfmTrack[]> {
  const json = await call<{ toptracks?: { track?: { name: string; artist: { name: string } }[] } }>({
    method: 'artist.gettoptracks',
    artist,
    limit: '8',
  })
  return json?.toptracks?.track?.map((t) => ({ artist: t.artist.name, title: t.name })) ?? []
}

/** Titres similaires à un titre (track.getSimilar). */
export async function similarTracks(artist: string, track: string): Promise<LfmTrack[]> {
  const json = await call<{ similartracks?: { track?: { name: string; artist: { name: string } }[] } }>({
    method: 'track.getsimilar',
    artist,
    track,
    limit: '20',
  })
  return json?.similartracks?.track?.map((t) => ({ artist: t.artist.name, title: t.name })) ?? []
}
