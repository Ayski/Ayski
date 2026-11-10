// Racine : connexion ou lecteur, et démarrage des services (polling, historique, moteur).

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Background } from './components/Background'
import { Login } from './components/Login'
import { NowPlaying } from './components/NowPlaying'
import { Toasts } from './components/Toasts'
import { startFlow } from './engine/flow'
import { startHistory } from './engine/history'
import { loadEngineData } from './engine/library'
import { syncLibrary } from './engine/sources'
import { handleCallback, isLoggedIn, scheduleRefresh, subscribeAuth } from './spotify/auth'
import { startPolling, stopPolling } from './state/player'
import { useTheme } from './theme/apply'
import { loadWallpapers } from './wallpaper/wallpapers'

export function App() {
  const loggedIn = useSyncExternalStore(subscribeAuth, isLoggedIn)
  /** Vrai tant que le retour de Spotify (/callback) n'est pas traité. */
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useTheme()

  useEffect(() => {
    void loadWallpapers()
    void handleCallback().then((message) => {
      setError(message)
      setBooting(false)
    })
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    scheduleRefresh()
    startPolling()
    // Le moteur démarre une fois ses données locales chargées.
    void loadEngineData().then(() => {
      startHistory()
      startFlow()
      void syncLibrary()
    })
    return stopPolling
  }, [loggedIn])

  return (
    <>
      <Background />
      {booting ? null : loggedIn ? <NowPlaying /> : <Login error={error} />}
      <Toasts />
    </>
  )
}
