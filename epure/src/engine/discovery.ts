// Découverte : Last.fm propose des artistes et des titres proches de mes goûts, puis chaque
// suggestion est retrouvée sur Spotify par la recherche (10 résultats max) en vérifiant
// l'artiste ET le titre. Tout est mis en cache pour limiter les appels.

import * as api from '../spotify/api'
import { SpotifyError } from '../spotify/api'
import { toTrack, type Track } from '../spotify/types'
import { cacheGet, cacheSet } from '../db/db'
import { artistTopTracks, hasLastfm, similarArtists, similarTracks, type LfmTrack } from '../lastfm/lastfm'
import { addTracks, DAY, getPool, getStats } from './library'
import { getSeedArtists } from './sources'

/** Recherches Spotify maximum par remplissage, et délai minimum entre deux remplissages. */
const SEARCH_BUDGET = 8
const MIN_INTERVAL = 5 * 60_000
/** En dessous de ce stock de découvertes jamais écoutées, on en cherche d'autres. */
export const LOW_STOCK = 10

/** Normalise un nom pour comparer : minuscules, sans accents, parenthèses ni "feat.". */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s+(feat|ft)\.?\s.*$/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const shuffle = <T,>(list: T[]): T[] => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Nombre de découvertes pas encore écoutées dans le catalogue. */
export function discoveryStock(): number {
  const stats = getStats()
  let n = 0
  for (const t of getPool().values()) {
    if (t.sources.every((s) => s === 'discovery') && !stats.tracks.has(t.id)) n++
  }
  return n
}

let budget = 0

/** Retrouve une suggestion Last.fm sur Spotify ; null si rien ne correspond vraiment. */
async function resolve(s: LfmTrack): Promise<Track | null> {
  const wantedTitle = norm(s.title)
  const wantedArtist = norm(s.artist)
  if (!wantedTitle || !wantedArtist) return null
  const key = `sp:${wantedArtist}|${wantedTitle}`
  const cached = await cacheGet<Track | null>(key, 60 * DAY)
  if (cached !== undefined) return cached
  if (budget <= 0) return null
  budget--
  const results = await api.searchTracks(`track:"${s.title}" artist:"${s.artist}"`)
  const match =
    results
      .map((r) => toTrack(r))
      .find(
        (t) =>
          t !== null &&
          t.artists.some((a) => norm(a.name) === wantedArtist) &&
          (norm(t.name) === wantedTitle || norm(t.name).startsWith(wantedTitle + ' ')),
      ) ?? null
  await cacheSet(key, match)
  return match
}

let running = false
let lastRun = 0

/** Cherche de nouvelles découvertes. Renvoie le nombre de titres ajoutés. */
export async function refillDiscovery(): Promise<number> {
  if (!hasLastfm() || running || Date.now() - lastRun < MIN_INTERVAL) return 0
  running = true
  lastRun = Date.now()
  budget = SEARCH_BUDGET
  let added = 0
  try {
    const pool = getPool()
    const stats = getStats()
    const library = [...pool.values()].filter((t) => t.sources.some((s) => s !== 'discovery'))
    const knownArtists = new Set(library.flatMap((t) => t.artists.map((a) => norm(a.name))))

    // Graines : mes artistes du top Spotify, sinon ceux que j'écoute le plus en entier.
    let seeds = (await getSeedArtists()).map((a) => a.name)
    if (!seeds.length) {
      seeds = [...stats.artists.values()]
        .filter((a) => a.name)
        .sort((a, b) => b.completes + b.liked * 2 - (a.completes + a.liked * 2))
        .slice(0, 20)
        .map((a) => a.name)
    }

    const suggestions: { track: LfmTrack; via: string }[] = []

    // 1) artist.getSimilar → un titre phare d'un artiste voisin que je ne connais pas.
    for (const seed of shuffle(seeds).slice(0, 3)) {
      const similar = (await similarArtists(seed)).filter((n) => !knownArtists.has(norm(n)))
      for (const name of shuffle(similar.slice(0, 12)).slice(0, 2)) {
        const top = shuffle((await artistTopTracks(name)).slice(0, 5))[0]
        if (top) suggestions.push({ track: top, via: `proche de ${seed}` })
      }
    }

    // 2) track.getSimilar → des titres voisins d'un titre que j'aime.
    const lovedTracks = library.filter((t) => t.sources.includes('liked') || t.sources.includes('top'))
    for (const seed of shuffle(lovedTracks).slice(0, 2)) {
      const artist = seed.artists[0]?.name
      if (!artist) continue
      const similar = (await similarTracks(artist, seed.name)).filter((t) => norm(t.artist) !== norm(artist))
      for (const t of shuffle(similar.slice(0, 15)).slice(0, 2)) {
        suggestions.push({ track: t, via: `comme « ${seed.name} »` })
      }
    }

    const libraryKeys = new Set(library.map((t) => `${norm(t.artists[0]?.name ?? '')}|${norm(t.name)}`))
    for (const s of shuffle(suggestions)) {
      if (libraryKeys.has(`${norm(s.track.artist)}|${norm(s.track.title)}`)) continue
      const track = await resolve(s.track)
      if (track && !pool.has(track.id)) {
        await addTracks([track], 'discovery', s.via)
        added++
      }
    }
  } catch (e) {
    // Quota ou réseau : on arrête là, sans bruit ; les caches gardent ce qui a été trouvé.
    if (!(e instanceof SpotifyError)) console.warn('Découverte interrompue', e)
  } finally {
    running = false
  }
  return added
}
