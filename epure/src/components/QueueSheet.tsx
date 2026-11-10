// File d'attente : les prochains titres choisis par Epure Flow, avec la raison du choix.
// Les titres déjà envoyés à Spotify sont verrouillés ; les suivants se réordonnent.

import { Reorder, useDragControls } from 'framer-motion'
import { flowStore, prepare, removePlanned, reorderPlan, useFlow, type Planned } from '../engine/flow'
import { artistLine } from '../spotify/types'
import { useSettings } from '../theme/settings'
import { Section } from './Controls'
import { Icon } from './Icons'
import { Sheet } from './Sheet'

function Debug({ item }: { item: Planned }) {
  return (
    <div className="row-debug">
      score {item.score.toFixed(1)} ={' '}
      {Object.entries(item.parts)
        .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v.toFixed(1)}`)
        .join(' · ')}
    </div>
  )
}

function Text({ item, debug }: { item: Planned; debug: boolean }) {
  return (
    <div className="row-text">
      <div className="row-title">{item.track.name}</div>
      <div className="row-sub">{artistLine(item.track)}</div>
      <div className="row-reason">{item.reason}</div>
      {debug && <Debug item={item} />}
    </div>
  )
}

function Movable({ item, debug }: { item: Planned; debug: boolean }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={item.track.id} as="li" className="row" dragListener={false} dragControls={controls}>
      <img className="row-art" src={item.track.thumb} alt="" draggable={false} />
      <Text item={item} debug={debug} />
      <button className="row-btn" aria-label="Retirer de la file" onClick={() => removePlanned(item.track.id)}>
        <Icon.close />
      </button>
      <button className="row-btn row-handle" aria-label="Déplacer" onPointerDown={(e) => controls.start(e)}>
        <Icon.grip />
      </button>
    </Reorder.Item>
  )
}

export function QueueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const plan = useFlow((s) => s.plan)
  const preparing = useFlow((s) => s.preparing)
  const note = useFlow((s) => s.note)
  const enabled = useSettings((s) => s.flowEnabled)
  const debug = useSettings((s) => s.debug)
  const sent = plan.filter((p) => p.sent)
  const waiting = plan.filter((p) => !p.sent)

  return (
    <Sheet open={open} onClose={onClose} title="File d’attente" tall>
      {!enabled && <p className="blank">Epure Flow est désactivé. Active-le dans le sélecteur de mode.</p>}
      {enabled && !plan.length && <p className="blank">{note ?? 'Lance un titre dans Spotify pour démarrer le moteur.'}</p>}

      {sent.length > 0 && (
        <Section title="Dans la file Spotify">
          <ul className="list">
            {sent.map((item) => (
              <li key={item.track.id} className="row">
                <img className="row-art" src={item.track.thumb} alt="" draggable={false} />
                <Text item={item} debug={debug} />
                <span className="tag">Envoyé</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {waiting.length > 0 && (
        <Section title="Ensuite">
          <Reorder.Group
            as="ul"
            className="list"
            axis="y"
            values={waiting.map((p) => p.track.id)}
            onReorder={(ids) => reorderPlan(ids as string[])}
          >
            {waiting.map((item) => (
              <Movable key={item.track.id} item={item} debug={debug} />
            ))}
          </Reorder.Group>
          <p className="hint">Spotify ne permet pas de modifier un titre déjà envoyé : seuls ceux-ci se réordonnent.</p>
        </Section>
      )}

      {enabled && (
        <Section title="Avant de fermer l'app">
          <button className="btn" style={{ width: '100%' }} disabled={!!preparing} onClick={() => void prepare(20)}>
            {preparing ? `Préparation… ${preparing.done}/${preparing.total}` : 'Préparer 20 titres'}
          </button>
          <p className="hint">
            Sur iPhone, l’app ne tourne pas en arrière-plan : ce bouton remplit la file Spotify pour que la musique
            continue sans elle.
          </p>
        </Section>
      )}
    </Sheet>
  )
}

/** Raison du choix du titre en cours, si c'est le moteur qui l'a proposé. */
export const reasonFor = (id: string) => flowStore.get().plan.find((p) => p.track.id === id)?.reason
