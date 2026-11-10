// Sélecteur d'appareil (Spotify Connect).

import { useEffect, useState } from 'react'
import * as api from '../spotify/api'
import type { SpDevice } from '../spotify/types'
import { refresh } from '../state/player'
import { toastError } from '../state/toast'
import { Icon } from './Icons'
import { Sheet } from './Sheet'

export function DevicesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [devices, setDevices] = useState<SpDevice[] | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    setDevices(null)
    api
      .getDevices()
      .then((list) => alive && setDevices(list))
      .catch((e) => {
        if (alive) setDevices([])
        toastError(e)
      })
    return () => {
      alive = false
    }
  }, [open])

  const choose = (device: SpDevice) => {
    if (!device.id || device.is_active) return onClose()
    api
      .transfer(device.id)
      .then(() => setTimeout(() => void refresh(), 800), toastError)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Appareils">
      {devices === null && <p className="blank">Recherche des appareils…</p>}
      {devices?.length === 0 && (
        <div className="blank">
          <p style={{ margin: '0 0 14px' }}>Ouvre Spotify et lance un titre pour commencer.</p>
          <a className="btn ghost small" href="https://open.spotify.com" target="_blank" rel="noreferrer">
            <Icon.spotify /> Ouvrir Spotify
          </a>
        </div>
      )}
      <ul className="list">
        {devices?.map((d) => (
          <li key={d.id ?? d.name}>
            <button className="row playlist-row" disabled={d.is_restricted} onClick={() => choose(d)}>
              <span className="row-art round">
                <Icon.devices />
              </span>
              <span className="row-text">
                <span className="row-title" style={{ display: 'block' }}>
                  {d.name}
                </span>
                <span className="row-sub" style={{ display: 'block' }}>
                  {d.is_restricted ? 'Non contrôlable à distance' : d.type}
                </span>
              </span>
              {d.is_active && <span className="tag">Actif</span>}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
