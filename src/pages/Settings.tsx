import { useEffect, useRef, useState } from 'react'
import { Sheet, Slider, Toggle, useConfirm, useToast } from '../components/ui'
import { useSettings, type PreviewQuality, type ThemeMode } from '../theme/settings'
import { clearAll, estimateStorage, exportBackup, getAllProjects, importBackup } from '../db/storage'
import { downloadBlob } from '../studio/image'

export default function Settings() {
  const { settings, update, reset } = useSettings()
  const toast = useToast()
  const { confirm, confirmNode } = useConfirm()
  const [count, setCount] = useState(0)
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const [about, setAbout] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setCount((await getAllProjects()).length)
    setStorage(await estimateStorage())
  }
  useEffect(() => {
    refresh()
  }, [])

  async function doBackup() {
    const blob = await exportBackup()
    downloadBlob(blob, `card-studio-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`)
    toast('Sauvegarde exportée')
  }
  async function onImportFile(file: File) {
    try {
      const text = await file.text()
      const n = await importBackup(text)
      toast(n > 1 ? `${n} projets importés` : `${n} projet importé`)
      refresh()
    } catch (e) {
      toast((e as Error).message)
    }
  }
  async function wipe() {
    const ok = await confirm('Supprimer TOUTES les créations et réglages ? Action définitive.', { danger: true, confirmLabel: 'Tout supprimer' })
    if (!ok) return
    await clearAll()
    reset()
    toast('Données effacées')
    refresh()
  }

  const themes: { k: ThemeMode; label: string }[] = [
    { k: 'dark', label: 'Sombre' },
    { k: 'light', label: 'Clair' },
    { k: 'auto', label: 'Auto' },
  ]
  const quals: { k: PreviewQuality; label: string }[] = [
    { k: 'eco', label: 'Éco' },
    { k: 'standard', label: 'Standard' },
    { k: 'high', label: 'Haute' },
  ]
  const accents = ['#D9B45B', '#BFC4CC', '#8B7CFF', '#58c08a', '#e06a5a', '#38bdf8', '#ff2d95']

  return (
    <div className="page">
      <div className="eyebrow">Préférences</div>
      <h1 className="page-title">Paramètres</h1>
      <p className="page-sub">Apparence, qualité, données et confidentialité.</p>

      <div className="panel mb">
        <div className="field-label"><span>Thème</span></div>
        <div className="wrap mb">
          {themes.map((t) => (
            <button key={t.k} className={`chip ${settings.theme === t.k ? 'active' : ''}`} onClick={() => update({ theme: t.k })}>{t.label}</button>
          ))}
        </div>
        <div className="field-label"><span>Couleur d’accent</span></div>
        <div className="swatches">
          {accents.map((c) => (
            <button key={c} className={`swatch ${settings.accent.toLowerCase() === c.toLowerCase() ? 'active' : ''}`} style={{ background: c }} onClick={() => update({ accent: c })} />
          ))}
        </div>
      </div>

      <div className="panel mb">
        <div className="row-between mb"><span>Animations</span><Toggle on={settings.animations} onChange={(v) => update({ animations: v })} /></div>
        <div className="row-between mb"><span>Grille par défaut (Studio)</span><Toggle on={settings.grid} onChange={(v) => update({ grid: v })} /></div>
        <div className="row-between"><span>Sauvegarde automatique</span><Toggle on={settings.autosave} onChange={(v) => update({ autosave: v })} /></div>
      </div>

      <div className="panel mb">
        <div className="field-label"><span>Qualité de l’aperçu</span></div>
        <div className="wrap mb">
          {quals.map((qq) => (
            <button key={qq.k} className={`chip ${settings.previewQuality === qq.k ? 'active' : ''}`} onClick={() => update({ previewQuality: qq.k })}>{qq.label}</button>
          ))}
        </div>
        <Slider label="Résolution d’export par défaut" value={settings.exportResolution} min={1024} max={3072} step={512} suffix="px" onChange={(v) => update({ exportResolution: v })} />
      </div>

      <div className="panel mb">
        <div className="field-label"><span>Données ({count} projet{count > 1 ? 's' : ''})</span></div>
        {storage && (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            Stockage utilisé : {(storage.usage / 1048576).toFixed(1)} Mo{storage.quota ? ` / ${(storage.quota / 1048576).toFixed(0)} Mo` : ''}
          </p>
        )}
        <div className="grid-2 mb">
          <button className="btn btn-ghost btn-sm" onClick={doBackup}>Exporter sauvegarde</button>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Importer sauvegarde</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImportFile(f)
            e.target.value = ''
          }}
        />
        <button className="btn btn-danger btn-block" onClick={wipe}>Supprimer toutes les données</button>
      </div>

      <div className="panel mb">
        <button className="row-between" style={{ width: '100%' }} onClick={() => setPrivacy(true)}><span>Politique de confidentialité</span><span className="link">Lire</span></button>
      </div>
      <div className="panel">
        <button className="row-between" style={{ width: '100%' }} onClick={() => setAbout(true)}><span>À propos de l’application</span><span className="link">Voir</span></button>
      </div>

      {privacy && (
        <Sheet title="Confidentialité" onClose={() => setPrivacy(false)}>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-dim)' }}>
            <p className="mb">Card Skin Studio fonctionne <b style={{ color: 'var(--text)' }}>entièrement sur votre appareil</b>.</p>
            <ul style={{ paddingLeft: 18 }}>
              <li>Les images et projets sont traités et stockés localement (IndexedDB). Rien n’est envoyé à un serveur.</li>
              <li>Aucune donnée bancaire n’est demandée, lue ou stockée.</li>
              <li>Aucun identifiant ni traceur. Aucune collecte analytique.</li>
              <li>Le partage d’une image n’a lieu que si vous l’initiez via la feuille de partage iOS.</li>
              <li>Vos sauvegardes JSON restent sous votre contrôle.</li>
            </ul>
          </div>
        </Sheet>
      )}
      {about && (
        <Sheet title="À propos" onClose={() => setAbout(false)}>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-dim)' }}>
            <p className="mb"><b style={{ color: 'var(--text)' }}>Card Skin Studio</b> — v1.0</p>
            <p className="mb">Éditeur graphique de visuels de cartes, PWA installable, pensée pour iPhone et Safari. Création de calques, effets simulés, export haute résolution et sauvegarde locale.</p>
            <p>Cette application crée des <b style={{ color: 'var(--text)' }}>images</b>. Elle ne modifie pas les cartes d’Apple Wallet et ne contourne aucune protection d’iOS.</p>
          </div>
        </Sheet>
      )}
      {confirmNode}
    </div>
  )
}
