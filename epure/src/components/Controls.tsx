// Petits contrôles de formulaire réutilisés par les panneaux.

import type { ReactNode } from 'react'
import { haptic } from '../state/haptics'

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic()
        onChange(!checked)
      }}
    />
  )
}

/** Ligne "libellé + interrupteur". */
export function Toggle(props: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="field">
      <div>
        {props.label}
        {props.hint && <small>{props.hint}</small>}
      </div>
      <Switch checked={props.checked} onChange={props.onChange} label={props.label} />
    </div>
  )
}

/** Ligne "libellé + valeur + curseur". */
export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="field col">
      <span className="field-top">
        {props.label}
        <output>{props.format ? props.format(props.value) : props.value}</output>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Segmented<T extends string>(props: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o.value} aria-pressed={o.value === props.value} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}
