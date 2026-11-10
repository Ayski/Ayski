// Écran principal : carrousel de pochettes, titre, progression, contrôles et navigation.

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { engineStore } from '../engine/library'
import { useFlow } from '../engine/flow'
import { artistLine, openUrl } from '../spotify/types'
import { skip, toggleLike, togglePlay, usePlayer } from '../state/player'
import { useStore } from '../state/store'
import { uiStore } from '../theme/apply'
import { speedFactor, useSettings } from '../theme/settings'
import { Carousel } from './Carousel'
import { CustomizePanel } from './CustomizePanel'
import { DevicesSheet } from './DevicesSheet'
import { Icon } from './Icons'
import { ModeSheet, modeLabel } from './ModeSheet'
import { PlaylistsSheet } from './PlaylistsSheet'
import { Progress } from './Progress'
import { QueueSheet } from './QueueSheet'
import { StatsSheet } from './StatsSheet'
import { TrackMenu } from './TrackMenu'

type Panel = 'customize' | 'queue' | 'playlists' | 'stats' | 'devices' | 'mode' | 'track' | null

export function NowPlaying() {
  const status = usePlayer((s) => s.status)
  const track = usePlayer((s) => s.track)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const liked = usePlayer((s) => s.liked)
  const offline = usePlayer((s) => s.offline)
  const device = usePlayer((s) => s.device?.name)
  const syncing = useStore(engineStore, (s) => s.syncing)
  const mode = useSettings((s) => s.mode)
  const playlistName = useSettings((s) => s.playlistName)
  const flowEnabled = useSettings((s) => s.flowEnabled)
  const debug = useSettings((s) => s.debug)
  const reason = useFlow((s) => s.note)
  const [panel, setPanel] = useState<Panel>(null)
  const close = () => setPanel(null)

  // L'écran affiché décide du fond quand "fond différent par écran" est actif.
  useEffect(() => {
    uiStore.set({ screen: panel === 'playlists' ? 'playlists' : panel === 'stats' ? 'stats' : 'now' })
  }, [panel])

  const speed = speedFactor()
  const noDevice = status === 'no-device' || (status === 'idle' && !track)

  return (
    <main className="app">
      <header className="topbar">
        <button className="icon-btn glass" onClick={() => setPanel('devices')} aria-label={`Appareils${device ? ` (${device})` : ''}`}>
          <Icon.devices />
        </button>
        <button className="chip glass" onClick={() => setPanel('mode')} aria-label="Mode de lecture">
          <i className="dot" style={{ opacity: flowEnabled ? 1 : 0.3 }} />
          <span>{flowEnabled ? `Flow · ${modeLabel(mode, playlistName)}` : 'Flow désactivé'}</span>
          <Icon.chevron />
        </button>
        <button className="icon-btn glass" onClick={() => setPanel('customize')} aria-label="Personnaliser">
          <Icon.palette />
        </button>
      </header>

      {offline ? (
        <div className="banner glass">Hors connexion</div>
      ) : syncing ? (
        <div className="banner glass">Synchronisation · {syncing}</div>
      ) : debug && reason ? (
        <div className="banner glass">{reason}</div>
      ) : null}

      {noDevice ? (
        <div className="stage" style={{ touchAction: 'auto' }}>
          <div className="empty glass">
            <h2>Rien en lecture</h2>
            <p>Ouvre Spotify et lance un titre pour commencer.</p>
            <a className="btn" href="https://open.spotify.com" target="_blank" rel="noreferrer">
              <Icon.spotify /> Ouvrir Spotify
            </a>
            <button className="btn ghost small" onClick={() => setPanel('devices')}>
              Choisir un appareil
            </button>
          </div>
        </div>
      ) : (
        <Carousel onSwipeUp={() => setPanel('customize')} />
      )}

      <div className="meta">
        <div className="meta-text">
          {/* Le texte change en fondu, calé sur le glissement de la pochette. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={track?.id ?? 'vide'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 * speed }}
            >
              <div className="title">{track?.name ?? (status === 'loading' ? ' ' : 'Aucun titre')}</div>
              <div className="artist">{track ? artistLine(track) : ' '}</div>
            </motion.div>
          </AnimatePresence>
        </div>
        <button className="icon-btn" onClick={() => setPanel('track')} disabled={!track} aria-label="Options du titre">
          <Icon.more />
        </button>
        <button className="icon-btn like" onClick={toggleLike} disabled={!track} aria-pressed={liked} aria-label={liked ? 'Retirer des titres likés' : 'Liker ce titre'}>
          {Icon.heart(liked)}
        </button>
      </div>

      {track ? (
        <a className="spotify-link" href={openUrl(track)} target="_blank" rel="noreferrer">
          <Icon.spotify /> Ouvrir dans Spotify
        </a>
      ) : (
        <span className="spotify-link">
          <Icon.spotify /> Spotify
        </span>
      )}

      <Progress />

      <div className="controls">
        <button className="icon-btn" onClick={() => skip(-1)} aria-label="Titre précédent">
          <Icon.prev />
        </button>
        <button className="play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Lecture'}>
          {isPlaying ? <Icon.pause /> : <Icon.play />}
        </button>
        <button className="icon-btn" onClick={() => skip(1)} aria-label="Titre suivant">
          <Icon.next />
        </button>
      </div>

      <nav className="nav glass" aria-label="Écrans">
        <button onClick={() => setPanel('queue')}>
          <Icon.queue />
          File
        </button>
        <button onClick={() => setPanel('playlists')}>
          <Icon.playlists />
          Playlists
        </button>
        <button onClick={() => setPanel('stats')}>
          <Icon.stats />
          Stats
        </button>
      </nav>

      <CustomizePanel open={panel === 'customize'} onClose={close} />
      <QueueSheet open={panel === 'queue'} onClose={close} />
      <PlaylistsSheet open={panel === 'playlists'} onClose={close} />
      <StatsSheet open={panel === 'stats'} onClose={close} />
      <DevicesSheet open={panel === 'devices'} onClose={close} />
      <ModeSheet open={panel === 'mode'} onClose={close} />
      <TrackMenu track={track} open={panel === 'track'} onClose={close} />
    </main>
  )
}
