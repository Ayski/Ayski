// Sélecteur du mode de lecture intelligente et curseur "Niveau d'aventure".

import { MODE_ADVENTURE, setMode } from '../engine/flow'
import { hasLastfm } from '../lastfm/lastfm'
import { setSettings, useSettings, type FlowMode } from '../theme/settings'
import { Section, Slider, Toggle } from './Controls'
import { Icon } from './Icons'
import { Sheet } from './Sheet'

const MODES: { id: Exclude<FlowMode, 'playlist'>; label: string; hint: string; icon: () => JSX.Element }[] = [
  { id: 'comfort', label: 'Confort', hint: '80 % de titres connus, pas entendus récemment', icon: Icon.sofa },
  { id: 'balance', label: 'Équilibre', hint: 'Moitié titres connus, moitié découvertes', icon: Icon.balance },
  { id: 'discovery', label: 'Découverte', hint: '80 % de nouveaux titres d’artistes proches', icon: Icon.compass },
]

export const modeLabel = (mode: FlowMode, playlistName: string | null) =>
  mode === 'playlist' ? (playlistName ?? 'Playlist') : (MODES.find((m) => m.id === mode)?.label ?? '')

export function ModeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings((x) => x)

  return (
    <Sheet open={open} onClose={onClose} title="Epure Flow">
      <div className="card">
        <Toggle
          label="Lecture intelligente"
          hint="Garde 3 titres d’avance dans la file Spotify"
          checked={s.flowEnabled}
          onChange={(flowEnabled) => setSettings({ flowEnabled })}
        />
      </div>

      <Section title="Mode">
        <div className="modes">
          {MODES.map((m) => (
            <button key={m.id} className="mode-card" aria-pressed={s.flowEnabled && s.mode === m.id} onClick={() => setMode(m.id)}>
              <m.icon />
              <span>
                <b>{m.label}</b>
                <small>{m.hint}</small>
              </span>
            </button>
          ))}
          {s.mode === 'playlist' && (
            <div className="mode-card" aria-pressed={s.flowEnabled}>
              <Icon.playlists />
              <span>
                <b>Depuis cette playlist</b>
                <small>{s.playlistName} · anti-répétition appliquée à ses titres</small>
              </span>
            </div>
          )}
        </div>
        <p className="hint">Pour le mode « Depuis cette playlist », choisis une playlist dans « Playlists ».</p>
      </Section>

      {s.mode !== 'playlist' && (
        <Section title="Niveau d'aventure">
          <div className="card">
            <Slider
              label="Part de découvertes"
              value={s.adventure}
              min={0}
              max={100}
              step={5}
              format={(v) => `${v} %`}
              onChange={(adventure) => {
                // Le curseur affine le mode : on affiche celui dont il est le plus proche.
                const nearest = MODES.reduce((best, m) =>
                  Math.abs(MODE_ADVENTURE[m.id] - adventure) < Math.abs(MODE_ADVENTURE[best.id] - adventure) ? m : best,
                )
                setSettings({ adventure, mode: nearest.id })
              }}
            />
          </div>
          {!hasLastfm() && (
            <p className="hint">
              Sans clé Last.fm, les « découvertes » sont les titres de ta bibliothèque que tu n’as jamais écoutés ici.
            </p>
          )}
        </Section>
      )}
    </Sheet>
  )
}
