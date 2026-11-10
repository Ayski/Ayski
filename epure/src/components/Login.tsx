// Écran de connexion.

import { useState } from 'react'
import { login } from '../spotify/auth'
import { Icon } from './Icons'

export function Login({ error }: { error: string | null }) {
  const [busy, setBusy] = useState(false)
  return (
    <main className="login">
      <img className="login-mark" src="/favicon.svg" alt="" />
      <h1>Epure</h1>
      <p>Ta musique, sans le superflu. Une lecture intelligente qui ne te repasse pas toujours les mêmes titres.</p>
      {error && <p className="login-error">{error}</p>}
      {!import.meta.env.VITE_SPOTIFY_CLIENT_ID && (
        <p className="login-error">Configuration incomplète : la variable VITE_SPOTIFY_CLIENT_ID est absente.</p>
      )}
      <button
        className="btn"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void login()
        }}
      >
        <Icon.spotify /> Se connecter avec Spotify
      </button>
      <p className="login-note">
        Spotify Premium requis. La musique est jouée par l’app Spotify ; Epure l’affiche et la pilote. Aucune donnée ne
        quitte ton téléphone.
      </p>
    </main>
  )
}
