// Types minimaux de l'API Web Spotify (seulement les champs utilisés), et le format
// compact "Track" que toute l'app manipule.

export interface SpImage {
  url: string
  width?: number | null
  height?: number | null
}
export interface SpArtist {
  id: string
  name: string
  uri?: string
}
export interface SpAlbum {
  id: string
  name: string
  images?: SpImage[]
  uri?: string
}
export interface SpTrack {
  id: string | null
  uri: string
  name: string
  type?: string
  duration_ms: number
  is_local?: boolean
  artists: SpArtist[]
  album?: SpAlbum
}
export interface SpDevice {
  id: string | null
  name: string
  type: string
  is_active: boolean
  is_restricted?: boolean
  volume_percent?: number | null
}
export interface SpPlayback {
  device?: SpDevice
  is_playing: boolean
  progress_ms: number | null
  item: SpTrack | null
  currently_playing_type?: string
  context?: { uri: string; type: string } | null
}
export interface SpQueue {
  currently_playing: SpTrack | null
  queue: SpTrack[]
}
export interface SpPaging<T> {
  items: T[]
  next: string | null
  total?: number
}
export interface SpPlaylist {
  id: string
  name: string
  uri: string
  images?: SpImage[] | null
  owner?: { display_name?: string | null }
  // Renommé "items" en février 2026 ; on lit les deux par prudence.
  items?: { total?: number }
  tracks?: { total?: number }
}

/** Titre au format compact, stocké tel quel dans IndexedDB. */
export interface Track {
  id: string
  uri: string
  name: string
  artists: { id: string; name: string }[]
  album: string
  albumId?: string
  /** Pochette grande (affichage) et petite (listes). */
  image: string
  thumb: string
  durationMs: number
}

/** Convertit un titre Spotify ; null pour les fichiers locaux, épisodes, etc. */
export function toTrack(t: SpTrack | null | undefined, fallbackAlbum?: SpAlbum): Track | null {
  if (!t || typeof t !== 'object' || !t.id || t.is_local || (t.type && t.type !== 'track')) return null
  const album = t.album ?? fallbackAlbum
  const images = album?.images ?? []
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: (t.artists ?? []).map((a) => ({ id: a.id, name: a.name })),
    album: album?.name ?? '',
    albumId: album?.id,
    image: images[0]?.url ?? '',
    thumb: (images[images.length - 1] ?? images[0])?.url ?? '',
    durationMs: t.duration_ms,
  }
}

export const artistLine = (t: Track) => t.artists.map((a) => a.name).join(', ')
export const openUrl = (t: Track) => `https://open.spotify.com/track/${t.id}`
