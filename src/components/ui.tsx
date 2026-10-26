import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { IconClose } from './icons'

// ---- Toast ------------------------------------------------------------------
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number>()
  const show = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2200)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  )
}

// ---- Slider -----------------------------------------------------------------
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  display?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        <b>{display ? display(value) : `${Math.round(value)}${suffix}`}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} />
  )
}

export function ColorField({
  label,
  value,
  onChange,
  presets,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  presets?: string[]
}) {
  const pal =
    presets ??
    ['#08090D', '#171923', '#F5F5F7', '#D9B45B', '#BFC4CC', '#8B7CFF', '#e06a5a', '#58c08a', '#38bdf8', '#ff2d95']
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
      </div>
      <div className="row">
        <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} />
        <div className="swatches">
          {pal.map((c) => (
            <button
              key={c}
              className={`swatch ${c.toLowerCase() === value.toLowerCase() ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => onChange(c)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function toHex(c: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c
  if (/^#[0-9a-fA-F]{8}$/.test(c)) return c.slice(0, 7)
  return '#000000'
}

// ---- Bottom sheet -----------------------------------------------------------
export function Sheet({
  title,
  onClose,
  children,
}: {
  title?: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && (
          <div className="row-between mb">
            <h3 className="sheet-title">{title}</h3>
            <button className="icon-btn" onClick={onClose}>
              <IconClose />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ---- Confirm dialog ---------------------------------------------------------
interface ConfirmState {
  message: string
  resolve: (v: boolean) => void
  danger?: boolean
  confirmLabel?: string
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback(
    (message: string, opts?: { danger?: boolean; confirmLabel?: string }) =>
      new Promise<boolean>((resolve) => setState({ message, resolve, ...opts })),
    [],
  )

  const close = (value: boolean) => {
    setState((s) => {
      s?.resolve(value)
      return null
    })
  }

  const confirmNode = state ? (
    <Sheet onClose={() => close(false)}>
      <p style={{ fontSize: 16, lineHeight: 1.4, marginBottom: 20 }}>{state.message}</p>
      <div className="grid-2">
        <button className="btn btn-ghost" onClick={() => close(false)}>
          Annuler
        </button>
        <button
          className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => close(true)}
        >
          {state.confirmLabel ?? 'Confirmer'}
        </button>
      </div>
    </Sheet>
  ) : null

  return { confirm, confirmNode }
}
