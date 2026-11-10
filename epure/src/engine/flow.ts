// Epure Flow : tient un plan des prochains titres et garde toujours 3 titres d'avance dans
// la file Spotify (POST /me/player/queue). L'API ne permet ni de retirer ni de réordonner
// un titre déjà envoyé : seuls les titres "pas encore envoyés" du plan sont modifiables.

import * as api from '../spotify/api'
import { SpotifyError } from '../spotify/api'
import type { Track } from '../spotify/types'
import { createStore, useStore } from '../state/store'
import { playerStore, refresh, refreshQueue, skip } from '../state/player'
import { toast, toastError } from '../state/toast'
import { settingsStore, setSettings, type FlowMode } from '../theme/settings'
import { discoveryStock, LOW_STOCK, refillDiscovery } from './discovery'
import { onSkip } from './history'
import { engineStore, getPlays, getPool, setFlag } from './library'
import { pickTracks, recentArtistsFromHistory, type Scored } from './scoring'
import { syncPlaylist } from './sources'
import { hasLastfm } from '../lastfm/lastfm'

export interface Planned extends Scored {
  /** Déjà dans la file Spotify (donc verrouillé). */
  sent: boolean
}

/** Titres gardés d'avance dans la file Spotify, et taille du plan local. */
const AHEAD = 3
const PLAN_SIZE = 8

export const flowStore = createStore<{
  plan: Planned[]
  /** Progression de "Préparer 20 titres". */
  preparing: { done: number; total: number } | null
  /** Message d'état (catalogue vide, playlist épuisée…). */
  note: string | null
}>({ plan: [], preparing: null, note: null })
export const useFlow = <S,>(selector: (s: ReturnType<typeof flowStore.get>) => S) => useStore(flowStore, selector)

export const MODE_ADVENTURE: Record<Exclude<FlowMode, 'playlist'>, number> = {
  comfort: 20,
  balance: 50,
  discovery: 80,
}

/** Nombre de titres à garder envoyés (3, ou plus pendant "Préparer 20 titres"). */
let target = AHEAD
let busy = false
let again = false

const PLAN_KEY = 'epure.plan'

/** Le plan survit à la fermeture de l'app : sans ça, chaque ouverture renverrait 3 titres. */
function setPlan(plan: Planned[]) {
  flowStore.set({ plan })
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
  } catch {
    /* plan en mémoire seulement */
  }
}

/** Vrai tant que le plan restauré n'a pas été comparé à la vraie file Spotify. */
let needsReconcile = false
function restorePlan() {
  try {
    const plan = JSON.parse(localStorage.getItem(PLAN_KEY) ?? '[]') as Planned[]
    if (Array.isArray(plan) && plan.length) {
      flowStore.set({ plan })
      needsReconcile = plan.some((p) => p.sent)
    }
  } catch {
    /* plan illisible : on repart de zéro */
  }
}

function fillPlan(plan: Planned[], size: number): Planned[] {
  if (plan.length >= size) return plan
  const s = settingsStore.get()
  const current = playerStore.get().track
  const exclude = new Set(plan.map((p) => p.track.id))
  if (current) exclude.add(current.id)
  // Ce qui attend déjà dans la file Spotify (suite d'un album, ajout manuel) n'est pas reproposé.
  playerStore.get().upcoming.forEach((t) => exclude.add(t.id))
  const recentArtists = [
    ...recentArtistsFromHistory(),
    ...(current?.artists[0] ? [current.artists[0].id] : []),
    ...plan.map((p) => p.track.artists[0]?.id ?? ''),
  ]
  const playlist = s.mode === 'playlist' ? s.playlistId : null
  const picks = pickTracks(size - plan.length, {
    exclude,
    recentArtists,
    adventure: playlist ? 0 : s.adventure / 100,
    playlistId: playlist,
  })
  return [...plan, ...picks.map((p) => ({ ...p, sent: false }))]
}

/** Une passe du moteur : met le plan à jour puis complète la file Spotify. */
async function tick() {
  if (busy) {
    again = true
    return
  }
  const settings = settingsStore.get()
  const player = playerStore.get()
  if (!settings.flowEnabled || !engineStore.get().ready || player.status !== 'ready' || !player.track) return
  busy = true
  try {
    // 1) Le titre en cours sort du plan, avec tout ce qui le précédait.
    let plan = flowStore.get().plan
    if (needsReconcile) {
      // Après une réouverture : un titre "envoyé" qui n'est plus dans la file a déjà été joué.
      const queue = await api.getQueue()
      const ids = new Set(queue?.queue.map((t) => t.id))
      plan = plan.filter((p) => !p.sent || ids.has(p.track.id))
      needsReconcile = false
    }
    const index = plan.findIndex((p) => p.track.id === player.track!.id)
    if (index >= 0) plan = plan.slice(index + 1)

    // 2) On complète le plan avec de nouveaux choix.
    const size = Math.max(PLAN_SIZE, target)
    plan = fillPlan(plan, size)
    setPlan(plan)
    flowStore.set({
      note: plan.length
        ? null
        : getPool().size === 0
          ? 'Ta bibliothèque se charge…'
          : 'Tous les titres disponibles sont au repos. Change de mode ou réduis le repos.',
    })

    // 3) Stock de découvertes bas : on en cherche en fond, puis on repasse.
    if (settings.mode !== 'playlist' && settings.adventure > 0 && hasLastfm() && discoveryStock() < LOW_STOCK) {
      void refillDiscovery().then((n) => n > 0 && void tick())
    }

    // 4) On envoie à Spotify ce qu'il manque pour avoir `target` titres d'avance.
    let sentNow = false
    for (;;) {
      plan = flowStore.get().plan
      const sent = plan.filter((p) => p.sent).length
      const nextUp = plan.find((p) => !p.sent)
      if (sent >= target || !nextUp) break
      await api.addToQueue(nextUp.track.uri)
      sentNow = true
      setPlan(flowStore.get().plan.map((p) => (p.track.id === nextUp.track.id ? { ...p, sent: true } : p)))
      const prep = flowStore.get().preparing
      if (prep) flowStore.set({ preparing: { ...prep, done: Math.min(prep.total, sent + 1) } })
      await new Promise((r) => setTimeout(r, 180))
    }
    if (sentNow) void refreshQueue()
  } catch (e) {
    // 429 : on se tait et on réessaiera ; le reste mérite un message.
    if (!(e instanceof SpotifyError && (e.kind === 'rate' || e.kind === 'offline'))) toastError(e)
  } finally {
    busy = false
    if (again) {
      again = false
      void tick()
    }
  }
}

/** Jette les choix pas encore envoyés (changement de mode, skip…) et en refait. */
function replan(keep: (p: Planned) => boolean = () => false) {
  setPlan(flowStore.get().plan.filter((p) => p.sent || keep(p)))
  void tick()
}

// ---------------------------------------------------------------- actions de l'interface

export function setMode(mode: Exclude<FlowMode, 'playlist'>) {
  setSettings({ mode, adventure: MODE_ADVENTURE[mode], flowEnabled: true })
}

/** Réordonne les titres pas encore envoyés (les envoyés restent en tête, dans l'ordre). */
export function reorderPlan(ids: string[]) {
  const plan = flowStore.get().plan
  const sent = plan.filter((p) => p.sent)
  const byId = new Map(plan.filter((p) => !p.sent).map((p) => [p.track.id, p]))
  setPlan([...sent, ...ids.map((id) => byId.get(id)).filter((p): p is Planned => !!p)])
}

export function removePlanned(id: string) {
  setPlan(flowStore.get().plan.filter((p) => p.sent || p.track.id !== id))
  void tick()
}

/** "Préparer 20 titres" : remplit la file Spotify avant de fermer l'app. */
export async function prepare(count = 20) {
  if (playerStore.get().status !== 'ready') {
    toast('Ouvre Spotify et lance un titre pour commencer.')
    return
  }
  target = count
  flowStore.set({ preparing: { done: flowStore.get().plan.filter((p) => p.sent).length, total: count } })
  await tick()
  // Attend la fin des passes en cours.
  while (busy) await new Promise((r) => setTimeout(r, 200))
  const sent = flowStore.get().plan.filter((p) => p.sent).length
  target = AHEAD
  flowStore.set({ preparing: null })
  toast(sent >= count ? `${sent} titres prêts dans la file Spotify.` : `${sent} titres prêts (catalogue épuisé ou pause Spotify).`)
}

/** "Ne plus me le proposer". */
export async function ban(track: Track) {
  await setFlag(track.id, { banned: true, loved: false })
  setPlan(flowStore.get().plan.filter((p) => p.sent || p.track.id !== track.id))
  if (playerStore.get().track?.id === track.id) skip(1)
  toast('Ce titre ne sera plus proposé.')
}

/** "Je l'adore, repasse-le" : le titre ignore la mise au repos. */
export async function love(track: Track, loved: boolean) {
  await setFlag(track.id, { loved, banned: false })
  toast(loved ? 'Noté : il reviendra même s’il est au repos.' : 'Il suivra de nouveau les règles de repos.')
}

/** Lance une playlist en mode intelligent : anti-répétition appliquée à ses titres. */
export async function startPlaylist(id: string, name: string) {
  try {
    toast(`Préparation de « ${name} »…`)
    const count = await syncPlaylist(id)
    if (!count) {
      toast('Impossible de lire les titres de cette playlist.')
      return
    }
    setSettings({ mode: 'playlist', playlistId: id, playlistName: name, flowEnabled: true })
    const [first] = pickTracks(1, {
      exclude: new Set(),
      recentArtists: recentArtistsFromHistory(),
      adventure: 0,
      playlistId: id,
    })
    if (!first) {
      toast('Tous les titres de cette playlist sont au repos.')
      return
    }
    setPlan(flowStore.get().plan.filter((p) => p.sent))
    await api.play({ uris: [first.track.uri] })
    setTimeout(() => void refresh(), 600)
  } catch (e) {
    toastError(e)
  }
}

// ---------------------------------------------------------------- démarrage

let started = false
export function startFlow() {
  if (started) return
  started = true
  restorePlan()

  // Nouveau titre, lecteur prêt : on vérifie l'avance.
  let lastTrack: string | null = null
  let lastStatus = playerStore.get().status
  playerStore.subscribe(() => {
    const p = playerStore.get()
    if (p.track?.id !== lastTrack || p.status !== lastStatus) {
      lastTrack = p.track?.id ?? null
      lastStatus = p.status
      void tick()
    }
  })

  // Changement de mode, d'aventure ou de playlist : les choix non envoyés sont refaits.
  let key = ''
  const modeKey = () => {
    const s = settingsStore.get()
    return [s.flowEnabled, s.mode, s.adventure, s.playlistId, s.restBaseDays].join('|')
  }
  key = modeKey()
  settingsStore.subscribe(() => {
    const k = modeKey()
    if (k !== key) {
      key = k
      replan()
    }
  })

  // Catalogue enrichi (synchro, découvertes) alors que le plan est court : on complète.
  let version = engineStore.get().version
  engineStore.subscribe(() => {
    const v = engineStore.get().version
    if (v !== version) {
      version = v
      if (flowStore.get().plan.length < PLAN_SIZE) void tick()
    }
  })

  // Un skip ajuste la suite : on retire les choix non envoyés du même artiste.
  onSkip((track) => {
    const artist = track.artists[0]?.id
    replan((p) => p.track.artists[0]?.id !== artist)
  })

  void tick()
}

/** Nombre d'écoutes enregistrées (affiché dans les stats). */
export const playCount = () => getPlays().length
