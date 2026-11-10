// Messages discrets en bas de l'écran (erreurs, confirmations).

import { SpotifyError } from '../spotify/api'
import { createStore } from './store'

export interface Toast {
  id: number
  text: string
}

export const toastStore = createStore<{ toasts: Toast[] }>({ toasts: [] })
let seq = 0

export function toast(text: string, durationMs = 3200) {
  // Pas de doublon : un message identique déjà affiché n'est pas répété.
  if (toastStore.get().toasts.some((t) => t.text === text)) return
  const id = ++seq
  toastStore.set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text }] }))
  setTimeout(() => toastStore.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), durationMs)
}

/** Affiche une erreur d'API de façon lisible (les erreurs d'authentification sont gérées ailleurs). */
export function toastError(e: unknown) {
  if (e instanceof SpotifyError) {
    if (e.kind !== 'auth') toast(e.message)
  } else {
    toast('Une erreur inattendue est survenue.')
  }
}
