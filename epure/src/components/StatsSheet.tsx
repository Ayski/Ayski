// Mes stats : titres et artistes les plus écoutés (historique local), titres au repos,
// titres adorés et titres bannis — tous modifiables.

import { useMemo } from 'react'
import { love } from '../engine/flow'
import { allFlagged, getPlays, getPool, getStats, setFlag, useEngineVersion } from '../engine/library'
import { ago } from '../engine/scoring'
import type { PoolTrack } from '../db/db'
import { artistLine } from '../spotify/types'
import { Section } from './Controls'
import { Sheet } from './Sheet'

function TrackRow({ track, sub, rank, action }: { track: PoolTrack; sub: string; rank?: number; action?: React.ReactNode }) {
  return (
    <li className="row">
      {rank !== undefined && <span className="row-rank">{rank}</span>}
      <img className="row-art" src={track.thumb} alt="" draggable={false} />
      <div className="row-text">
        <div className="row-title">{track.name}</div>
        <div className="row-sub">{sub}</div>
      </div>
      {action}
    </li>
  )
}

export function StatsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const version = useEngineVersion()

  const data = useMemo(() => {
    if (!open) return null
    const stats = getStats()
    const pool = getPool()
    const now = Date.now()
    const known = [...stats.tracks.entries()]
      .map(([id, s]) => ({ track: pool.get(id), s }))
      .filter((x): x is { track: PoolTrack; s: typeof x.s } => !!x.track)
    return {
      total: getPlays().length,
      topTracks: [...known].filter((x) => x.s.count > 0).sort((a, b) => b.s.count - a.s.count).slice(0, 10),
      topArtists: [...stats.artists.values()].filter((a) => a.completes > 0 && a.name).sort((a, b) => b.completes - a.completes).slice(0, 10),
      resting: known.filter((x) => x.s.restUntil > now).sort((a, b) => a.s.restUntil - b.s.restUntil),
      flagged: allFlagged().map((f) => ({ f, track: pool.get(f.trackId) })).filter((x): x is { f: typeof x.f; track: PoolTrack } => !!x.track),
      now,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, version])

  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

  return (
    <Sheet open={open} onClose={onClose} title="Mes stats" tall>
      {data && (
        <>
          <p className="hint" style={{ marginTop: 0 }}>
            {data.total ? `${plural(data.total, 'écoute')} enregistrées sur ce téléphone.` : 'Aucune écoute enregistrée pour l’instant : écoute quelques titres et reviens ici.'}
          </p>

          {data.topTracks.length > 0 && (
            <Section title="Titres les plus écoutés">
              <ul className="list">
                {data.topTracks.map(({ track, s }, i) => (
                  <TrackRow key={track.id} track={track} rank={i + 1} sub={`${artistLine(track)} · ${plural(s.count, 'écoute')}`} />
                ))}
              </ul>
            </Section>
          )}

          {data.topArtists.length > 0 && (
            <Section title="Artistes les plus écoutés">
              <ul className="list">
                {data.topArtists.map((a, i) => (
                  <li key={a.name} className="row">
                    <span className="row-rank">{i + 1}</span>
                    <span className="row-art round">{a.name.slice(0, 1).toUpperCase()}</span>
                    <div className="row-text">
                      <div className="row-title">{a.name}</div>
                      <div className="row-sub">
                        {plural(a.completes, 'écoute')}
                        {a.skips ? ` · ${plural(a.skips, 'skip')}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Au repos">
            {data.resting.length === 0 && <p className="blank">Aucun titre au repos.</p>}
            <ul className="list">
              {data.resting.map(({ track, s }) => {
                const loved = data.flagged.some((x) => x.f.trackId === track.id && x.f.loved)
                return (
                  <TrackRow
                    key={track.id}
                    track={track}
                    sub={`${plural(s.recent14, 'écoute')} en 14 j · encore ${ago(s.restUntil - data.now)}`}
                    action={
                      <button className="row-btn pill" onClick={() => void love(track, !loved)}>
                        {loved ? 'Réveillé' : 'Réveiller'}
                      </button>
                    }
                  />
                )
              })}
            </ul>
          </Section>

          <Section title="Adorés">
            {!data.flagged.some((x) => x.f.loved) && <p className="blank">« Je l’adore, repasse-le » depuis le menu d’un titre.</p>}
            <ul className="list">
              {data.flagged.filter((x) => x.f.loved).map(({ track }) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  sub={artistLine(track)}
                  action={
                    <button className="row-btn pill" onClick={() => void setFlag(track.id, { loved: false })}>
                      Retirer
                    </button>
                  }
                />
              ))}
            </ul>
          </Section>

          <Section title="Bannis">
            {!data.flagged.some((x) => x.f.banned) && <p className="blank">Aucun titre banni.</p>}
            <ul className="list">
              {data.flagged.filter((x) => x.f.banned).map(({ track }) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  sub={artistLine(track)}
                  action={
                    <button className="row-btn pill" onClick={() => void setFlag(track.id, { banned: false })}>
                      Rétablir
                    </button>
                  }
                />
              ))}
            </ul>
          </Section>
        </>
      )}
    </Sheet>
  )
}
