// Mes playlists : en toucher une la lance en mode intelligent (anti-répétition appliquée).

import { useEffect, useState } from 'react'
import { startPlaylist } from '../engine/flow'
import { loadPlaylists, type PlaylistInfo } from '../engine/sources'
import { toastError } from '../state/toast'
import { useSettings } from '../theme/settings'
import { Icon } from './Icons'
import { Sheet } from './Sheet'

export function PlaylistsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [playlists, setPlaylists] = useState<PlaylistInfo[] | null>(null)
  const activeId = useSettings((s) => (s.mode === 'playlist' ? s.playlistId : null))

  useEffect(() => {
    if (!open) return
    let alive = true
    loadPlaylists()
      .then((list) => alive && setPlaylists(list))
      .catch((e) => {
        if (alive) setPlaylists([])
        toastError(e)
      })
    return () => {
      alive = false
    }
  }, [open])

  return (
    <Sheet open={open} onClose={onClose} title="Mes playlists" tall>
      {playlists === null && <p className="blank">Chargement…</p>}
      {playlists?.length === 0 && <p className="blank">Aucune playlist trouvée sur ton compte.</p>}
      <ul className="list">
        {playlists?.map((p) => (
          <li key={p.id}>
            <button
              className="row playlist-row"
              onClick={() => {
                void startPlaylist(p.id, p.name)
                onClose()
              }}
            >
              {p.image ? (
                <img className="row-art" src={p.image} alt="" draggable={false} />
              ) : (
                <span className="row-art round">
                  <Icon.note />
                </span>
              )}
              <span className="row-text">
                <span className="row-title" style={{ display: 'block' }}>
                  {p.name}
                </span>
                <span className="row-sub" style={{ display: 'block' }}>
                  {[p.owner, p.total ? `${p.total} titres` : ''].filter(Boolean).join(' · ')}
                </span>
              </span>
              {activeId === p.id ? <span className="tag">En cours</span> : <span className="row-btn"><Icon.play /></span>}
            </button>
          </li>
        ))}
      </ul>
      {!!playlists?.length && <p className="hint">La playlist est jouée dans le désordre intelligent : les titres trop entendus se reposent.</p>}
    </Sheet>
  )
}
