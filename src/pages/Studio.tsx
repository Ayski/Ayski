import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card3D from '../components/Card3D'
import {
  IconBg,
  IconBrush,
  IconClose,
  IconCopy,
  IconDown,
  IconExport,
  IconEye,
  IconFlip,
  IconImage,
  IconLayers,
  IconLock,
  IconRedo,
  IconSave,
  IconShapes,
  IconText,
  IconTrash,
  IconUndo,
  IconUp,
} from '../components/icons'
import { ColorField, Sheet, Slider, useToast } from '../components/ui'
import { useSettings, previewWidth } from '../theme/settings'
import { saveProject } from '../db/storage'
import { exportProject } from '../studio/render'
import { fileToDownscaledImage, pickImage, shareOrDownload, dataUrlToBlob, safeFileName } from '../studio/image'
import { createDrawLayer, createImageLayer, createShapeLayer, createTextLayer, FONTS } from '../studio/layers'
import type {
  Background,
  CardFace,
  CardProject,
  DrawLayer,
  DrawStroke,
  FaceKey,
  Finish,
  ImageLayer,
  Layer,
  ShapeKind,
  ShapeLayer,
  TextLayer,
} from '../types'
import { defaultBackBackground, readFace, uid } from '../types'

type Tab = 'layers' | 'bg' | 'object' | 'draw' | 'export'

const clone = <T,>(p: T): T => JSON.parse(JSON.stringify(p))

// Copy-on-write snapshot for each edit (undo history): layers are copied
// shallowly so heavy vector path data stays shared instead of being
// re-serialised on every drag step. Draw strokes are the only nested array
// edited in place, so they get their own copy.
const copyLayer = (l: Layer): Layer => (l.type === 'draw' ? { ...l, strokes: [...l.strokes] } : { ...l })
const snapshot = (p: CardProject): CardProject => ({
  ...p,
  background: { ...p.background },
  layers: p.layers.map(copyLayer),
  back: p.back && { background: { ...p.back.background }, layers: p.back.layers.map(copyLayer) },
})

export default function Studio({
  initial,
  onExit,
}: {
  initial: CardProject
  onExit: (saved: boolean) => void
}) {
  const toast = useToast()
  const { settings } = useSettings()
  const [project, setProject] = useState<CardProject>(() => clone(initial))
  const past = useRef<CardProject[]>([])
  const future = useRef<CardProject[]>([])
  const [, force] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('layers')
  const [lightBg, setLightBg] = useState(false)
  const [grid, setGrid] = useState(settings.grid)
  const [compare, setCompare] = useState(false)
  const [nameEdit, setNameEdit] = useState(false)
  const baseline = useRef<CardProject>(clone(initial))
  const dirty = useRef(false)
  const [brushColor, setBrushColor] = useState('#D9B45B')
  const [brushWidth, setBrushWidth] = useState(0.014)
  const activeDrawRef = useRef<string | null>(null)
  const [activeFace, setActiveFace] = useState<FaceKey>('front')
  const faceRef = useRef<FaceKey>('front')
  faceRef.current = activeFace

  // Returns a live, mutable view of the face currently being edited.
  const faceAccess = useCallback((d: CardProject): CardFace => {
    if (faceRef.current === 'back') {
      if (!d.back) d.back = { background: defaultBackBackground(), layers: [] }
      return d.back
    }
    return {
      get background() {
        return d.background
      },
      set background(v: Background) {
        d.background = v
      },
      get layers() {
        return d.layers
      },
      set layers(v: Layer[]) {
        d.layers = v
      },
    } as CardFace
  }, [])

  function switchFace(which: FaceKey) {
    setActiveFace(which)
    setSelectedId(null)
    activeDrawRef.current = null
  }

  const mutate = useCallback((fn: (draft: CardProject) => void) => {
    setProject((prev) => {
      past.current.push(prev)
      if (past.current.length > 60) past.current.shift()
      future.current = []
      const next = snapshot(prev)
      fn(next)
      dirty.current = true
      return next
    })
  }, [])

  const undo = () => {
    const prev = past.current.pop()
    if (!prev) return
    setProject((cur) => {
      future.current.push(cur)
      return prev
    })
    force((n) => n + 1)
  }
  const redo = () => {
    const nxt = future.current.pop()
    if (!nxt) return
    setProject((cur) => {
      past.current.push(cur)
      return nxt
    })
    force((n) => n + 1)
  }

  const faceLayers = useMemo(() => readFace(project, activeFace).layers, [project, activeFace])
  const faceBackground = useMemo(
    () => readFace(project, activeFace).background,
    [project, activeFace],
  )
  const selected = useMemo(
    () => faceLayers.find((l) => l.id === selectedId) ?? null,
    [faceLayers, selectedId],
  )

  const updateLayer = useCallback(
    (id: string, patch: Partial<Layer>) => {
      mutate((d) => {
        const f = faceAccess(d)
        const i = f.layers.findIndex((l) => l.id === id)
        if (i >= 0) f.layers[i] = { ...f.layers[i], ...patch } as Layer
      })
    },
    [mutate, faceAccess],
  )

  // ---- autosave ----
  useEffect(() => {
    if (!settings.autosave) return
    const t = setTimeout(async () => {
      if (!dirty.current) return
      try {
        await saveProject(project)
        dirty.current = false
      } catch (e) {
        toast((e as Error).message)
      }
    }, 1200)
    return () => clearTimeout(t)
  }, [project, settings.autosave, toast])

  async function saveNow(message = 'Enregistré') {
    try {
      await saveProject(project)
      baseline.current = clone(project)
      dirty.current = false
      toast(message)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  async function duplicateProject() {
    try {
      const copy = clone(project)
      copy.id = uid()
      copy.name = `${project.name} (copie)`
      copy.createdAt = Date.now()
      copy.favorite = false
      await saveProject(copy)
      toast('Copie ajoutée à « Mes créations »')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  async function addImage() {
    try {
      const file = await pickImage()
      if (!file) return
      const img = await fileToDownscaledImage(file)
      const layer = createImageLayer(img)
      mutate((d) => faceAccess(d).layers.push(layer))
      setSelectedId(layer.id)
      setTab('object')
    } catch (e) {
      toast((e as Error).message)
    }
  }
  function addText() {
    const l = createTextLayer()
    mutate((d) => faceAccess(d).layers.push(l))
    setSelectedId(l.id)
    setTab('object')
  }
  function addShape() {
    const l = createShapeLayer()
    mutate((d) => faceAccess(d).layers.push(l))
    setSelectedId(l.id)
    setTab('object')
  }

  function enterDraw() {
    setTab('draw')
    setSelectedId(null)
    const cur = activeDrawRef.current
    const exists = faceLayers.some((l) => l.id === cur && l.type === 'draw')
    if (!exists) {
      const dl = createDrawLayer()
      activeDrawRef.current = dl.id
      mutate((d) => faceAccess(d).layers.push(dl))
    }
  }
  function addStroke(s: DrawStroke) {
    mutate((d) => {
      const f = faceAccess(d)
      let dl = f.layers.find((l) => l.id === activeDrawRef.current && l.type === 'draw') as
        | DrawLayer
        | undefined
      if (!dl) {
        dl = createDrawLayer()
        activeDrawRef.current = dl.id
        f.layers.push(dl)
      }
      dl.strokes.push(s)
    })
  }
  function undoStroke() {
    mutate((d) => {
      const dl = faceAccess(d).layers.find(
        (l) => l.id === activeDrawRef.current && l.type === 'draw',
      ) as DrawLayer | undefined
      if (dl) dl.strokes.pop()
    })
  }
  function clearStrokes() {
    mutate((d) => {
      const dl = faceAccess(d).layers.find(
        (l) => l.id === activeDrawRef.current && l.type === 'draw',
      ) as DrawLayer | undefined
      if (dl) dl.strokes = []
    })
  }
  function newDrawLayer() {
    const dl = createDrawLayer()
    activeDrawRef.current = dl.id
    mutate((d) => faceAccess(d).layers.push(dl))
  }

  function duplicateLayer(id: string) {
    mutate((d) => {
      const f = faceAccess(d)
      const i = f.layers.findIndex((l) => l.id === id)
      if (i >= 0) {
        const copy = { ...clone(f.layers[i]), id: uid(), x: f.layers[i].x + 0.04, y: f.layers[i].y + 0.04 }
        f.layers.splice(i + 1, 0, copy as Layer)
      }
    })
  }
  function removeLayer(id: string) {
    mutate((d) => {
      const f = faceAccess(d)
      f.layers = f.layers.filter((l) => l.id !== id)
    })
    if (selectedId === id) setSelectedId(null)
  }
  function reorder(id: string, dir: -1 | 1) {
    mutate((d) => {
      const f = faceAccess(d)
      const i = f.layers.findIndex((l) => l.id === id)
      const j = i + dir
      if (i >= 0 && j >= 0 && j < f.layers.length) {
        const [x] = f.layers.splice(i, 1)
        f.layers.splice(j, 0, x)
      }
    })
  }

  const shown = compare ? baseline.current : project

  return (
    <div className="studio">
      <div className="studio-top">
        <button className="icon-btn" onClick={() => onExit(dirty.current === false)} aria-label="Fermer">
          <IconClose />
        </button>
        <button className="icon-btn" onClick={undo} disabled={past.current.length === 0} aria-label="Annuler">
          <IconUndo />
        </button>
        <button className="icon-btn" onClick={redo} disabled={future.current.length === 0} aria-label="Rétablir">
          <IconRedo />
        </button>
        <div className="spacer" />
        <button className="layer-name studio-name" onClick={() => setNameEdit(true)}>
          {project.name}
        </button>
        <div className="spacer" />
        <button
          className="icon-btn"
          onPointerDown={() => setCompare(true)}
          onPointerUp={() => setCompare(false)}
          onPointerLeave={() => setCompare(false)}
          aria-label="Comparer"
          title="Maintenir pour comparer"
        >
          <IconEye />
        </button>
        <button className="icon-btn" onClick={() => saveNow()} aria-label="Enregistrer">
          <IconSave />
        </button>
      </div>

      <div className={`studio-stage ${lightBg ? 'light-bg' : ''}`}>
        <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card3D
            project={shown}
            face={activeFace}
            width={previewWidth(settings.previewQuality)}
            showGrid={grid}
            interactive={!compare && tab !== 'draw'}
            onSelect={setSelectedId}
            onMove={(id, x, y) => updateLayer(id, { x, y })}
            drawMode={tab === 'draw' && !compare}
            brushColor={brushColor}
            brushWidth={brushWidth}
            onStroke={addStroke}
          />
          <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
            <div className="face-switch">
              <button className={activeFace === 'front' ? 'active' : ''} onClick={() => switchFace('front')}>
                Recto
              </button>
              <button className={activeFace === 'back' ? 'active' : ''} onClick={() => switchFace('back')}>
                Verso
              </button>
            </div>
            <button
              className="flip-btn"
              onClick={() => switchFace(activeFace === 'front' ? 'back' : 'front')}
              aria-label="Retourner la carte"
            >
              <IconFlip width={16} /> Retourner
            </button>
          </div>
        </div>
      </div>

      <div className="studio-tools">
        <div className="tool-tabs">
          <ToolTab active={tab === 'layers'} onClick={() => setTab('layers')} icon={<IconLayers />} label="Calques" />
          <ToolTab active={tab === 'bg'} onClick={() => setTab('bg')} icon={<IconBg />} label="Fond" />
          <ToolTab active={tab === 'object'} onClick={() => setTab('object')} icon={<IconShapes />} label="Objet" />
          <ToolTab active={tab === 'draw'} onClick={enterDraw} icon={<IconBrush />} label="Dessin" />
          <ToolTab active={tab === 'export'} onClick={() => setTab('export')} icon={<IconExport />} label="Export" />
          <div className="spacer" />
          <ToolTab active={grid} onClick={() => setGrid((g) => !g)} icon={<IconLayers />} label="Grille" />
          <ToolTab active={lightBg} onClick={() => setLightBg((v) => !v)} icon={<IconEye />} label="Fond clair" />
        </div>

        <div className="tool-body">
         <div className="slide-in" key={tab}>
          {tab === 'layers' && (
            <LayersPanel
              layers={faceLayers}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id)
                setTab('object')
              }}
              onAddImage={addImage}
              onAddText={addText}
              onAddShape={addShape}
              onDuplicate={duplicateLayer}
              onRemove={removeLayer}
              onReorder={reorder}
              onToggleLock={(id, v) => updateLayer(id, { locked: v })}
              onToggleVisible={(id, v) => updateLayer(id, { visible: v })}
            />
          )}
          {tab === 'bg' && (
            <BackgroundPanel
              bg={faceBackground}
              onChange={(patch) =>
                mutate((d) => {
                  const f = faceAccess(d)
                  f.background = { ...f.background, ...patch }
                })
              }
            />
          )}
          {tab === 'object' && (
            <ObjectPanel
              selected={selected}
              onUpdate={(patch) => selected && updateLayer(selected.id, patch)}
              onAlign={(axis) =>
                selected && updateLayer(selected.id, axis === 'h' ? { x: 0.5 } : { y: 0.5 })}
              onAdd={{ image: addImage, text: addText, shape: addShape }}
            />
          )}
          {tab === 'draw' && (
            <DrawPanel
              color={brushColor}
              width={brushWidth}
              onColor={setBrushColor}
              onWidth={setBrushWidth}
              onUndo={undoStroke}
              onClear={clearStrokes}
              onNewLayer={newDrawLayer}
            />
          )}
          {tab === 'export' && (
            <ExportPanel
              project={project}
              face={activeFace}
              onSave={saveNow}
              onDuplicate={duplicateProject}
            />
          )}
         </div>
        </div>
      </div>

      {nameEdit && (
        <Sheet title="Renommer le projet" onClose={() => setNameEdit(false)}>
          <input
            className="input"
            defaultValue={project.name}
            autoFocus
            onChange={(e) => mutate((d) => (d.name = e.target.value || 'Sans titre'))}
          />
          <button className="btn btn-primary btn-block mt" onClick={() => setNameEdit(false)}>
            OK
          </button>
        </Sheet>
      )}
    </div>
  )
}

function ToolTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button className={`tool-tab ${active ? 'active' : ''}`} onClick={onClick}>
      <span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center' }}>{icon}</span>
      {label}
    </button>
  )
}

// ---- Layers panel -----------------------------------------------------------
function LayersPanel(props: {
  layers: Layer[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAddImage: () => void
  onAddText: () => void
  onAddShape: () => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (id: string, dir: -1 | 1) => void
  onToggleLock: (id: string, v: boolean) => void
  onToggleVisible: (id: string, v: boolean) => void
}) {
  const reversed = [...props.layers].reverse()
  return (
    <div>
      <div className="grid-2 mb">
        <button className="btn btn-ghost btn-sm" onClick={props.onAddImage}>
          <IconImage width={18} /> Image
        </button>
        <button className="btn btn-ghost btn-sm" onClick={props.onAddText}>
          <IconText width={18} /> Texte
        </button>
      </div>
      <button className="btn btn-ghost btn-sm btn-block mb" onClick={props.onAddShape}>
        <IconShapes width={18} /> Ajouter une forme
      </button>
      {reversed.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Aucun calque. Ajoutez une image, du texte ou une forme.</p>}
      {reversed.map((l) => (
        <div key={l.id} className={`layer ${props.selectedId === l.id ? 'sel' : ''}`}>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => props.onToggleVisible(l.id, !l.visible)}>
            <IconEye width={16} style={{ opacity: l.visible ? 1 : 0.3 }} />
          </button>
          <button className="layer-name" onClick={() => props.onSelect(l.id)}>
            {layerLabel(l)}
          </button>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => props.onToggleLock(l.id, !l.locked)}>
            <IconLock width={15} style={{ opacity: l.locked ? 1 : 0.3 }} />
          </button>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => props.onReorder(l.id, 1)}>
            <IconUp width={16} />
          </button>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => props.onReorder(l.id, -1)}>
            <IconDown width={16} />
          </button>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => props.onDuplicate(l.id)}>
            <IconCopy width={15} />
          </button>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => props.onRemove(l.id)}>
            <IconTrash width={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

function layerLabel(l: Layer): string {
  if (l.type === 'text') return `“${l.text.slice(0, 16)}”`
  if (l.type === 'image') return 'Image'
  if (l.type === 'draw') return `Dessin · ${l.strokes.length} trait${l.strokes.length > 1 ? 's' : ''}`
  if (l.type === 'vector') return 'Illustration'
  return `Forme · ${l.shape}`
}

// ---- Background panel -------------------------------------------------------
function BackgroundPanel({ bg, onChange }: { bg: Background; onChange: (patch: Partial<Background>) => void }) {
  const finishes: { key: Finish; label: string }[] = [
    { key: 'matte', label: 'Mat' },
    { key: 'gloss', label: 'Brillant' },
    { key: 'gold', label: 'Or' },
    { key: 'silver', label: 'Argent' },
    { key: 'carbon', label: 'Carbone' },
    { key: 'glass', label: 'Verre' },
    { key: 'black', label: 'Noir premium' },
  ]
  return (
    <div>
      <div className="wrap mb">
        {(['solid', 'linear', 'radial'] as const).map((k) => (
          <button key={k} className={`chip ${bg.kind === k ? 'active' : ''}`} onClick={() => onChange({ kind: k })}>
            {k === 'solid' ? 'Uni' : k === 'linear' ? 'Dégradé' : 'Radial'}
          </button>
        ))}
      </div>
      <ColorField label="Couleur principale" value={bg.color1} onChange={(c) => onChange({ color1: c })} />
      {bg.kind !== 'solid' && <ColorField label="Couleur secondaire" value={bg.color2} onChange={(c) => onChange({ color2: c })} />}
      {bg.kind === 'linear' && <Slider label="Angle" value={bg.angle} min={0} max={360} suffix="°" onChange={(v) => onChange({ angle: v })} />}
      <div className="field-label" style={{ marginTop: 6 }}>
        <span>Finition</span>
      </div>
      <div className="wrap mb">
        {finishes.map((f) => (
          <button key={f.key} className={`chip ${bg.finish === f.key ? 'active' : ''}`} onClick={() => onChange({ finish: f.key })}>
            {f.label}
          </button>
        ))}
      </div>
      <Slider label="Reflet directionnel" value={bg.glow} min={0} max={1} step={0.05} display={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onChange({ glow: v })} />
      <Slider label="Grain" value={bg.grain} min={0} max={1} step={0.05} display={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onChange({ grain: v })} />
      <p style={{ color: 'var(--text-faint)', fontSize: 11, marginTop: 10 }}>
        Les finitions métalliques, carbone et verre sont des simulations graphiques, pas de vrais matériaux.
      </p>
    </div>
  )
}

// ---- Object (selected layer) panel -----------------------------------------
function ObjectPanel({
  selected,
  onUpdate,
  onAlign,
  onAdd,
}: {
  selected: Layer | null
  onUpdate: (patch: Partial<Layer>) => void
  onAlign: (axis: 'h' | 'v') => void
  onAdd: { image: () => void; text: () => void; shape: () => void }
}) {
  if (!selected) {
    return (
      <div>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 14 }}>
          Sélectionnez un calque (touchez-le sur la carte ou dans l’onglet Calques) pour l’ajuster, ou ajoutez un élément.
        </p>
        <div className="grid-2">
          <button className="btn btn-ghost btn-sm" onClick={onAdd.image}>
            <IconImage width={18} /> Image
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onAdd.text}>
            <IconText width={18} /> Texte
          </button>
        </div>
        <button className="btn btn-ghost btn-sm btn-block mt" onClick={onAdd.shape}>
          <IconShapes width={18} /> Forme
        </button>
      </div>
    )
  }
  return (
    <div>
      <div className="wrap mb">
        <button className="chip" onClick={() => onAlign('h')}>
          Centrer H
        </button>
        <button className="chip" onClick={() => onAlign('v')}>
          Centrer V
        </button>
      </div>
      <Slider label="Taille" value={selected.scale} min={0.1} max={3} step={0.01} display={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onUpdate({ scale: v })} />
      <Slider label="Rotation" value={selected.rotation} min={-180} max={180} suffix="°" onChange={(v) => onUpdate({ rotation: v })} />
      <Slider label="Opacité" value={selected.opacity} min={0} max={1} step={0.02} display={(v) => `${Math.round(v * 100)}%`} onChange={(v) => onUpdate({ opacity: v })} />

      {selected.type === 'image' && <ImageControls layer={selected} onUpdate={onUpdate} />}
      {selected.type === 'text' && <TextControls layer={selected} onUpdate={onUpdate} />}
      {selected.type === 'shape' && <ShapeControls layer={selected} onUpdate={onUpdate} />}
    </div>
  )
}

function ImageControls({ layer, onUpdate }: { layer: ImageLayer; onUpdate: (p: Partial<ImageLayer>) => void }) {
  const presets: { k: ImageLayer['preset']; label: string }[] = [
    { k: 'none', label: 'Aucun' },
    { k: 'noir', label: 'Noir' },
    { k: 'mono', label: 'N&B' },
    { k: 'warm', label: 'Chaud' },
    { k: 'cool', label: 'Froid' },
    { k: 'vivid', label: 'Vif' },
    { k: 'fade', label: 'Doux' },
    { k: 'sepia', label: 'Sépia' },
  ]
  return (
    <>
      <div className="field-label" style={{ marginTop: 6 }}><span>Filtre</span></div>
      <div className="wrap mb">
        {presets.map((p) => (
          <button key={p.k} className={`chip ${layer.preset === p.k ? 'active' : ''}`} onClick={() => onUpdate({ preset: p.k })}>
            {p.label}
          </button>
        ))}
      </div>
      <Slider label="Luminosité" value={layer.brightness} min={0} max={200} suffix="%" onChange={(v) => onUpdate({ brightness: v })} />
      <Slider label="Contraste" value={layer.contrast} min={0} max={200} suffix="%" onChange={(v) => onUpdate({ contrast: v })} />
      <Slider label="Saturation" value={layer.saturation} min={0} max={200} suffix="%" onChange={(v) => onUpdate({ saturation: v })} />
      <Slider label="Teinte" value={layer.hue} min={0} max={360} suffix="°" onChange={(v) => onUpdate({ hue: v })} />
      <Slider label="Flou" value={layer.blur} min={0} max={20} suffix="px" onChange={(v) => onUpdate({ blur: v })} />
    </>
  )
}

function TextControls({ layer, onUpdate }: { layer: TextLayer; onUpdate: (p: Partial<TextLayer>) => void }) {
  return (
    <>
      <div className="field">
        <div className="field-label"><span>Texte</span></div>
        <input className="input" value={layer.text} onChange={(e) => onUpdate({ text: e.target.value })} />
      </div>
      <div className="field">
        <div className="field-label"><span>Police</span></div>
        <select className="input" value={layer.fontFamily} onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
          {FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <ColorField label="Couleur" value={layer.color} onChange={(c) => onUpdate({ color: c })} />
      <Slider label="Taille" value={layer.fontSize} min={0.03} max={0.3} step={0.005} display={(v) => `${Math.round(v * 100)}`} onChange={(v) => onUpdate({ fontSize: v })} />
      <Slider label="Graisse" value={layer.weight} min={400} max={800} step={100} onChange={(v) => onUpdate({ weight: v })} />
      <Slider label="Espacement" value={layer.letterSpacing} min={-0.02} max={0.1} step={0.005} display={(v) => `${Math.round(v * 1000)}`} onChange={(v) => onUpdate({ letterSpacing: v })} />
      <div className="wrap mb">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button key={a} className={`chip ${layer.align === a ? 'active' : ''}`} onClick={() => onUpdate({ align: a })}>
            {a === 'left' ? 'Gauche' : a === 'center' ? 'Centre' : 'Droite'}
          </button>
        ))}
        <button className={`chip ${layer.italic ? 'active' : ''}`} onClick={() => onUpdate({ italic: !layer.italic })}>
          Italique
        </button>
        <button className={`chip ${layer.shadow ? 'active' : ''}`} onClick={() => onUpdate({ shadow: !layer.shadow })}>
          Ombre
        </button>
        <button
          className={`chip ${layer.outline ? 'active' : ''}`}
          onClick={() =>
            onUpdate(layer.outline ? { outline: undefined } : { outline: '#1b1712', outlineWidth: layer.outlineWidth || 0.1 })
          }
        >
          Contour
        </button>
        <button
          className={`chip ${layer.color2 ? 'active' : ''}`}
          onClick={() => onUpdate({ color2: layer.color2 ? undefined : '#D9B45B' })}
        >
          Dégradé
        </button>
      </div>
      {layer.outline && (
        <>
          <ColorField label="Couleur du contour" value={layer.outline} onChange={(c) => onUpdate({ outline: c })} />
          <Slider
            label="Épaisseur du contour"
            value={layer.outlineWidth ?? 0.1}
            min={0.02}
            max={0.25}
            step={0.01}
            display={(v) => `${Math.round(v * 100)}`}
            onChange={(v) => onUpdate({ outlineWidth: v })}
          />
        </>
      )}
      {layer.color2 && (
        <ColorField label="Couleur du bas (dégradé)" value={layer.color2} onChange={(c) => onUpdate({ color2: c })} />
      )}
    </>
  )
}

function ShapeControls({ layer, onUpdate }: { layer: ShapeLayer; onUpdate: (p: Partial<ShapeLayer>) => void }) {
  const shapes: { k: ShapeKind; label: string }[] = [
    { k: 'roundRect', label: 'Rect. arrondi' },
    { k: 'rect', label: 'Rectangle' },
    { k: 'circle', label: 'Cercle' },
    { k: 'triangle', label: 'Triangle' },
    { k: 'line', label: 'Ligne' },
  ]
  return (
    <>
      <div className="wrap mb">
        {shapes.map((s) => (
          <button key={s.k} className={`chip ${layer.shape === s.k ? 'active' : ''}`} onClick={() => onUpdate({ shape: s.k })}>
            {s.label}
          </button>
        ))}
      </div>
      <ColorField label="Remplissage" value={layer.fill} onChange={(c) => onUpdate({ fill: c })} />
      <Slider label="Largeur" value={layer.width} min={0.02} max={1.5} step={0.01} display={(v) => `${Math.round(v * 100)}`} onChange={(v) => onUpdate({ width: v })} />
      <Slider label="Hauteur" value={layer.height} min={0.02} max={1.5} step={0.01} display={(v) => `${Math.round(v * 100)}`} onChange={(v) => onUpdate({ height: v })} />
      {layer.shape === 'roundRect' && (
        <Slider label="Arrondi" value={layer.cornerRadius} min={0} max={0.3} step={0.005} display={(v) => `${Math.round(v * 100)}`} onChange={(v) => onUpdate({ cornerRadius: v })} />
      )}
      <ColorField label="Contour" value={layer.stroke} onChange={(c) => onUpdate({ stroke: c })} />
      <Slider label="Épaisseur contour" value={layer.strokeWidth} min={0} max={0.04} step={0.002} display={(v) => `${Math.round(v * 1000)}`} onChange={(v) => onUpdate({ strokeWidth: v })} />
    </>
  )
}

// ---- Draw panel -------------------------------------------------------------
function DrawPanel({
  color,
  width,
  onColor,
  onWidth,
  onUndo,
  onClear,
  onNewLayer,
}: {
  color: string
  width: number
  onColor: (c: string) => void
  onWidth: (w: number) => void
  onUndo: () => void
  onClear: () => void
  onNewLayer: () => void
}) {
  return (
    <div>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 14 }}>
        Dessinez directement sur la carte avec le doigt. Chaque session de dessin crée un calque
        que vous pouvez masquer, réordonner ou supprimer dans l’onglet Calques.
      </p>
      <ColorField label="Couleur du pinceau" value={color} onChange={onColor} />
      <Slider
        label="Épaisseur"
        value={width}
        min={0.004}
        max={0.06}
        step={0.002}
        display={(v) => `${Math.round(v * 1000)}`}
        onChange={onWidth}
      />
      <div className="grid-2 mb">
        <button className="btn btn-ghost btn-sm" onClick={onUndo}>
          <IconUndo width={16} /> Dernier trait
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>
          <IconTrash width={16} /> Tout effacer
        </button>
      </div>
      <button className="btn btn-ghost btn-sm btn-block" onClick={onNewLayer}>
        <IconBrush width={16} /> Nouveau calque de dessin
      </button>
    </div>
  )
}

// ---- Export panel -----------------------------------------------------------
function ExportPanel({
  project,
  face,
  onSave,
  onDuplicate,
}: {
  project: CardProject
  face: FaceKey
  onSave: (m?: string) => void
  onDuplicate: () => void
}) {
  const toast = useToast()
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [res, setRes] = useState(2048)
  const [transparent, setTransparent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function doExport(which: FaceKey) {
    setBusy(true)
    try {
      const type = format === 'png' ? 'image/png' : 'image/jpeg'
      const dataUrl = await exportProject(project, res, type, 0.95, format === 'png' && transparent, which)
      const blob = dataUrlToBlob(dataUrl)
      const ext = format === 'png' ? 'png' : 'jpg'
      const side = which === 'front' ? 'recto' : 'verso'
      const name = `${safeFileName(project.name)}_${side}_${res}.${ext}`
      const result = await shareOrDownload(blob, name)
      toast(result === 'shared' ? 'Partagé' : 'Image enregistrée')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="field-label"><span>Format</span></div>
      <div className="wrap mb">
        <button className={`chip ${format === 'png' ? 'active' : ''}`} onClick={() => setFormat('png')}>PNG</button>
        <button className={`chip ${format === 'jpeg' ? 'active' : ''}`} onClick={() => setFormat('jpeg')}>JPEG</button>
        {format === 'png' && (
          <button className={`chip ${transparent ? 'active' : ''}`} onClick={() => setTransparent((t) => !t)}>
            Fond transparent
          </button>
        )}
      </div>
      <div className="field-label"><span>Résolution</span></div>
      <div className="wrap mb">
        {[1024, 1536, 2048, 3072].map((r) => (
          <button key={r} className={`chip ${res === r ? 'active' : ''}`} onClick={() => setRes(r)}>
            {r === 1024 ? 'Standard' : r === 1536 ? 'Skin' : r === 2048 ? 'Haute' : 'Ultra'} · {r}px
          </button>
        ))}
      </div>
      <button className="btn btn-primary btn-block mb" onClick={() => doExport(face)} disabled={busy}>
        <IconExport width={18} /> {busy ? 'Export…' : `Exporter ${face === 'front' ? 'le recto' : 'le verso'}`}
      </button>
      <div className="grid-2 mb">
        <button className="btn btn-ghost btn-sm" onClick={() => doExport('front')} disabled={busy}>
          Recto
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => doExport('back')} disabled={busy}>
          Verso
        </button>
      </div>
      <div className="grid-2">
        <button className="btn btn-ghost btn-sm" onClick={() => onSave()}>
          <IconSave width={16} /> Enregistrer
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onDuplicate}>
          <IconCopy width={16} /> Dupliquer
        </button>
      </div>
      <p style={{ color: 'var(--text-faint)', fontSize: 11, marginTop: 12 }}>
        L’export produit une image fidèle au canevas. Il ne modifie aucune carte dans Apple Wallet (voir l’onglet Wallet).
      </p>
    </div>
  )
}
