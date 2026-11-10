// Fonds d'écran personnels : import, compression, stockage IndexedDB, export / import.
// Les fichiers restent sur le téléphone : aucun envoi réseau.

import { db, type Wallpaper } from '../db/db'
import { createStore, useStore } from '../state/store'
import { averageLuminance } from '../theme/colors'
import { DEFAULTS, settingsStore, setSettings, THEME_KEYS, type Screen, type Settings } from '../theme/settings'

/** Fond prêt à l'affichage (URL locale "blob:"). */
export interface WallpaperView {
  id: string
  kind: Wallpaper['kind']
  url: string
  thumbUrl: string
  luminance: number
}

export const wallpaperStore = createStore<{ list: WallpaperView[] }>({ list: [] })
export const useWallpapers = () => useStore(wallpaperStore, (s) => s.list)

const MAX_SIDE = 2000
const MAX_GIF = 15 * 1024 * 1024
const MAX_VIDEO = 40 * 1024 * 1024

const toView = (w: Wallpaper): WallpaperView => ({
  id: w.id,
  kind: w.kind,
  url: URL.createObjectURL(w.blob),
  thumbUrl: URL.createObjectURL(w.thumb),
  luminance: w.luminance,
})

export async function loadWallpapers() {
  try {
    const all = await (await db()).getAll('wallpapers')
    all.sort((a, b) => a.createdAt - b.createdAt)
    wallpaperStore.set({ list: all.map(toView) })
  } catch {
    /* IndexedDB indisponible : pas de fonds personnels */
  }
}

/** Le fond à afficher pour un écran donné, selon l'option "fond différent par écran". */
export function wallpaperFor(screen: Screen, s: Settings, list: WallpaperView[]): WallpaperView | null {
  if (s.bgMode !== 'image') return null
  const id = (s.perScreen ? s.screenWallpapers[screen] : null) ?? s.wallpaperId
  return list.find((w) => w.id === id) ?? null
}

const canvasBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

/** Encode en WebP ; Safari ne sait pas toujours l'écrire et rend alors du PNG : repli JPEG. */
async function encode(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  const webp = await canvasBlob(canvas, 'image/webp', quality)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await canvasBlob(canvas, 'image/jpeg', quality)
  if (!jpeg) throw new Error('encodage impossible')
  return jpeg
}

function drawThumb(source: CanvasImageSource, sw: number, sh: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 180
  canvas.height = 320
  const ctx = canvas.getContext('2d')!
  // Cadrage "cover" : on remplit la vignette portrait sans déformer.
  const scale = Math.max(canvas.width / sw, canvas.height / sh)
  ctx.drawImage(source, (canvas.width - sw * scale) / 2, (canvas.height - sh * scale) / 2, sw * scale, sh * scale)
  return canvas
}

async function store(kind: Wallpaper['kind'], blob: Blob, thumbCanvas: HTMLCanvasElement): Promise<string> {
  const wallpaper: Wallpaper = {
    id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2),
    kind,
    blob,
    thumb: await encode(thumbCanvas, 0.7),
    luminance: averageLuminance(thumbCanvas),
    createdAt: Date.now(),
  }
  await (await db()).put('wallpapers', wallpaper)
  wallpaperStore.set((s) => ({ list: [...s.list, toView(wallpaper)] }))
  return wallpaper.id
}

/** Zone choisie dans le recadrage, en pixels de l'image d'origine. */
export interface Crop {
  x: number
  y: number
  width: number
  height: number
}

/** Enregistre une photo recadrée, redimensionnée (2000 px max) et compressée. */
export async function addImage(image: HTMLImageElement, crop: Crop): Promise<string> {
  const scale = Math.min(1, MAX_SIDE / Math.max(crop.width, crop.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(crop.width * scale)
  canvas.height = Math.round(crop.height * scale)
  canvas.getContext('2d')!.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
  return store('image', await encode(canvas), drawThumb(canvas, canvas.width, canvas.height))
}

/** Enregistre un GIF animé ou une courte vidéo tels quels (les recompresser casserait l'animation). */
export async function addAnimated(file: File): Promise<string> {
  const isVideo = file.type.startsWith('video/')
  if (file.size > (isVideo ? MAX_VIDEO : MAX_GIF)) {
    throw new Error(isVideo ? 'Vidéo trop lourde (40 Mo maximum).' : 'GIF trop lourd (15 Mo maximum).')
  }
  const url = URL.createObjectURL(file)
  try {
    if (isVideo) {
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.preload = 'auto'
      video.autoplay = true
      video.src = url
      const unreadable = new Error('Vidéo illisible sur cet appareil.')
      const wait = (event: 'loadeddata' | 'seeked') =>
        new Promise<void>((resolve, reject) => {
          video.addEventListener(event, () => resolve(), { once: true })
          video.addEventListener('error', () => reject(unreadable), { once: true })
          setTimeout(() => reject(unreadable), 8000)
        })
      // iOS ne charge les images d'une vidéo que si elle est lancée : on la joue (muette),
      // puis on se place un peu après le début pour une vignette qui ne soit pas noire.
      const loaded = wait('loadeddata')
      void video.play().catch(() => {})
      await loaded
      const seeked = wait('seeked')
      video.currentTime = 0.1
      await seeked.catch(() => {})
      video.pause()
      return await store('video', file, drawThumb(video, video.videoWidth, video.videoHeight))
    }
    const img = new Image()
    img.src = url
    await img.decode()
    return await store('gif', file, drawThumb(img, img.naturalWidth, img.naturalHeight))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function deleteWallpaper(id: string) {
  const view = wallpaperStore.get().list.find((w) => w.id === id)
  await (await db()).delete('wallpapers', id)
  wallpaperStore.set((s) => ({ list: s.list.filter((w) => w.id !== id) }))
  if (view) {
    // Après le fondu de sortie du fond, qui affiche encore cette image un instant.
    setTimeout(() => {
      URL.revokeObjectURL(view.url)
      URL.revokeObjectURL(view.thumbUrl)
    }, 1500)
  }
  // On nettoie les réglages qui pointaient vers ce fond.
  const s = settingsStore.get()
  const screens = Object.fromEntries(Object.entries(s.screenWallpapers).filter(([, v]) => v !== id))
  const remaining = wallpaperStore.get().list
  setSettings({
    screenWallpapers: screens,
    wallpaperId: s.wallpaperId === id ? (remaining[remaining.length - 1]?.id ?? null) : s.wallpaperId,
    bgMode: s.bgMode === 'image' && !remaining.length ? 'dynamic' : s.bgMode,
  })
}

// ---------------------------------------------------------------- export / import du thème

interface ThemeFile {
  app: 'epure'
  version: 1
  settings: Partial<Settings>
  wallpapers: { id: string; kind: Wallpaper['kind']; luminance: number; data: string; thumb: string }[]
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
const fromDataUrl = async (data: string) => (await fetch(data)).blob()

/** Seuil au-delà duquel on prévient que le fichier d'export est lourd. */
export const HEAVY_EXPORT = 8 * 1024 * 1024

/** Au-delà de cette taille, un fond (vidéo lourde) n'est pas mis dans l'export. */
const MAX_EXPORTED = 12 * 1024 * 1024

/** Construit le fichier JSON du thème, fonds d'écran encodés compris. */
export async function exportTheme(): Promise<{ blob: Blob; skipped: number }> {
  const s = settingsStore.get()
  const settings: Partial<Settings> = {}
  for (const k of THEME_KEYS) (settings as Record<string, unknown>)[k] = s[k]
  const stored = await (await db()).getAll('wallpapers')
  // Tout encoder en mémoire d'un coup peut faire fermer l'app : les fonds trop lourds restent
  // sur le téléphone et ne partent pas dans le fichier.
  const all = stored.filter((w) => w.blob.size <= MAX_EXPORTED)
  const file: ThemeFile = {
    app: 'epure',
    version: 1,
    settings,
    wallpapers: await Promise.all(
      all.map(async (w) => ({
        id: w.id,
        kind: w.kind,
        luminance: w.luminance,
        data: await toDataUrl(w.blob),
        thumb: await toDataUrl(w.thumb),
      })),
    ),
  }
  return {
    blob: new Blob([JSON.stringify(file)], { type: 'application/json' }),
    skipped: stored.length - all.length,
  }
}

const HEX = /^#[0-9a-f]{6}$/i
const ENUMS: Partial<Record<keyof Settings, string[]>> = {
  theme: ['deep', 'light', 'pastel', 'neon', 'mono', 'amoled'],
  animSpeed: ['slow', 'normal', 'fast', 'off'],
  bgMode: ['dynamic', 'solid', 'image'],
}

/** Une valeur importée n'est acceptée que si elle a exactement la forme attendue. */
function isValidSetting(key: keyof Settings, value: unknown): boolean {
  if (value === undefined) return false
  if (key === 'wallpaperId') return value === null || typeof value === 'string'
  if (key === 'accent' || key === 'bgSolid') return typeof value === 'string' && HEX.test(value)
  if (key === 'screenWallpapers') {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every((v) => typeof v === 'string')
    )
  }
  const allowed = ENUMS[key]
  if (allowed) return typeof value === 'string' && allowed.includes(value)
  if (typeof DEFAULTS[key] === 'number') return typeof value === 'number' && Number.isFinite(value)
  return typeof value === typeof DEFAULTS[key]
}

/** Applique un fichier de thème. Lève une erreur lisible s'il n'est pas valide. */
export async function importTheme(file: File) {
  let parsed: ThemeFile
  try {
    parsed = JSON.parse(await file.text()) as ThemeFile
  } catch {
    throw new Error('Ce fichier n’est pas un thème Epure valide.')
  }
  if (parsed?.app !== 'epure' || typeof parsed.settings !== 'object') {
    throw new Error('Ce fichier n’est pas un thème Epure valide.')
  }
  const d = await db()
  for (const w of parsed.wallpapers ?? []) {
    if (!w?.id || !/^data:(image|video)\//.test(w.data ?? '') || !/^data:image\//.test(w.thumb ?? '')) continue
    await d.put('wallpapers', {
      id: w.id,
      kind: w.kind,
      luminance: Number(w.luminance) || 0.2,
      blob: await fromDataUrl(w.data),
      thumb: await fromDataUrl(w.thumb),
      createdAt: Date.now(),
    })
  }
  wallpaperStore.get().list.forEach((w) => {
    URL.revokeObjectURL(w.url)
    URL.revokeObjectURL(w.thumbUrl)
  })
  await loadWallpapers()
  // On ne reprend que les clés connues, avec le bon type.
  const patch: Partial<Settings> = {}
  for (const k of THEME_KEYS) {
    const value = (parsed.settings as Record<string, unknown>)[k]
    if (isValidSetting(k, value)) (patch as Record<string, unknown>)[k] = value
  }
  setSettings(patch)
}
