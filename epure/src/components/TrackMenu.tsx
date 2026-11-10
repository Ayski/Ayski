// Menu du titre en cours : l'adorer, le bannir, l'ouvrir dans Spotify.

import { ban, love } from '../engine/flow'
import { getFlags, getStats, isResting, useEngineVersion } from '../engine/library'
import { ago } from '../engine/scoring'
import { openUrl, type Track } from '../spotify/types'
import { Icon } from './Icons'
import { Sheet } from './Sheet'

export function TrackMenu({ track, open, onClose }: { track: Track | null; open: boolean; onClose: () => void }) {
  useEngineVersion()
  if (!track) return null
  const loved = !!getFlags(track.id)?.loved
  const stats = getStats().tracks.get(track.id)
  const summary = stats
    ? `${stats.count} écoute${stats.count > 1 ? 's' : ''} · ${stats.skips} skip${stats.skips > 1 ? 's' : ''} · dernière il y a ${ago(Date.now() - stats.lastAt)}${isResting(track.id) ? ' · au repos' : ''}`
    : 'Première écoute enregistrée sur ce téléphone.'

  return (
    <Sheet open={open} onClose={onClose} title={track.name}>
      <p className="hint" style={{ marginTop: 0 }}>
        {summary}
      </p>
      <div className="modes" style={{ marginTop: 16 }}>
        <button
          className="mode-card"
          aria-pressed={loved}
          onClick={() => {
            void love(track, !loved)
            onClose()
          }}
        >
          {Icon.heart(loved)}
          <span>
            <b>Je l’adore, repasse-le</b>
            <small>{loved ? 'Actif : touche pour revenir aux règles de repos' : 'Ce titre ignore la mise au repos'}</small>
          </span>
        </button>
        <button
          className="mode-card"
          onClick={() => {
            void ban(track)
            onClose()
          }}
        >
          <Icon.ban />
          <span>
            <b>Ne plus me le proposer</b>
            <small>Le moteur ne le choisira plus (modifiable dans Mes stats)</small>
          </span>
        </button>
        <a className="mode-card" href={openUrl(track)} target="_blank" rel="noreferrer">
          <Icon.spotify />
          <span>
            <b>Ouvrir dans Spotify</b>
            <small>Voir le titre dans l’app officielle</small>
          </span>
        </a>
      </div>
    </Sheet>
  )
}
