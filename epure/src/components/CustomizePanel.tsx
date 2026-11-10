// Panneau de personnalisation : thèmes, accent, réglages, fond d'écran, moteur, export.

import { useRef } from 'react'
import { logout } from '../spotify/auth'
import { hasLastfm } from '../lastfm/lastfm'
import { syncLibrary } from '../engine/sources'
import { engineStore } from '../engine/library'
import { useStore } from '../state/store'
import { toast } from '../state/toast'
import {
  ACCENT_PRESETS,
  resetTheme,
  setSettings,
  THEMES,
  useSettings,
  type AnimSpeed,
} from '../theme/settings'
import { exportTheme, HEAVY_EXPORT, importTheme } from '../wallpaper/wallpapers'
import { Section, Segmented, Slider, Toggle } from './Controls'
import { Sheet } from './Sheet'
import { WallpaperSection } from './WallpaperSection'

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace('.', ',')

export function CustomizePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings((x) => x)
  const syncing = useStore(engineStore, (e) => e.syncing)
  const taps = useRef(0)

  const doExport = async () => {
    try {
      const blob = await exportTheme()
      if (blob.size > HEAVY_EXPORT) {
        toast(`Fichier lourd (${mb(blob.size)} Mo) : tes fonds d’écran sont inclus.`, 5000)
      }
      const file = new File([blob], 'epure-theme.json', { type: 'application/json' })
      // Sur iPhone, la feuille de partage permet d'enregistrer dans Fichiers.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          return
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          // Partage refusé (préparation trop longue pour Safari) : on télécharge le fichier.
        }
      }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = file.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast('Export impossible.')
    }
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    try {
      await importTheme(file)
      toast('Thème importé.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import impossible.')
    }
  }

  // Réglage caché : 5 touches sur le numéro de version activent le mode debug du moteur.
  const versionTap = () => {
    if (++taps.current >= 5) {
      taps.current = 0
      setSettings({ debug: !s.debug })
      toast(s.debug ? 'Mode debug désactivé.' : 'Mode debug activé : voir la file d’attente.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Personnaliser" tall>
      <Section title="Thème">
        <div className="themes">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className="theme-card"
              aria-pressed={s.theme === t.id}
              onClick={() => setSettings({ theme: t.id, accent: t.accent })}
            >
              <div className="theme-swatch" style={{ background: t.base }}>
                <i style={{ background: t.accent }} />
              </div>
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Couleur d'accent">
        <div className="card">
          <Toggle
            label="Couleurs dynamiques"
            hint="L’accent suit la pochette du titre"
            checked={s.dynamicColors}
            onChange={(dynamicColors) => setSettings({ dynamicColors })}
          />
          <div className="swatches" style={{ opacity: s.dynamicColors ? 0.45 : 1 }}>
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                className="swatch"
                style={{ background: c }}
                aria-label={`Accent ${c}`}
                aria-pressed={!s.dynamicColors && s.accent === c}
                onClick={() => setSettings({ accent: c, dynamicColors: false })}
              />
            ))}
            <span className="swatch picker">
              <input
                type="color"
                aria-label="Choisir une couleur d'accent"
                value={s.accent}
                onChange={(e) => setSettings({ accent: e.target.value, dynamicColors: false })}
              />
            </span>
          </div>
        </div>
      </Section>

      <Section title="Réglages">
        <div className="card">
          <Slider label="Arrondi des coins" value={s.radius} min={0} max={36} format={(v) => `${v} px`} onChange={(radius) => setSettings({ radius })} />
          <Slider label="Intensité du flou" value={s.blur} min={0} max={40} format={(v) => `${v} px`} onChange={(blur) => setSettings({ blur })} />
          <Slider
            label="Taille de la pochette"
            value={Math.round(s.coverSize * 100)}
            min={70}
            max={115}
            format={(v) => `${v} %`}
            onChange={(v) => setSettings({ coverSize: v / 100 })}
          />
          <div className="field col">
            Vitesse des animations
            <Segmented<AnimSpeed>
              label="Vitesse des animations"
              value={s.animSpeed}
              onChange={(animSpeed) => setSettings({ animSpeed })}
              options={[
                { value: 'slow', label: 'Lent' },
                { value: 'normal', label: 'Normal' },
                { value: 'fast', label: 'Rapide' },
                { value: 'off', label: 'Aucune' },
              ]}
            />
          </div>
        </div>
        <p className="hint">Les pochettes gardent toujours leur forme d’origine, entières et sans filtre.</p>
      </Section>

      <WallpaperSection />

      <Section title="Lecture intelligente">
        <div className="card">
          <Toggle
            label="Epure Flow"
            hint="Le moteur choisit les prochains titres"
            checked={s.flowEnabled}
            onChange={(flowEnabled) => setSettings({ flowEnabled })}
          />
          <Slider
            label="Durée du repos"
            value={s.restBaseDays}
            min={1}
            max={14}
            format={(v) => `${v} j par écoute en trop`}
            onChange={(restBaseDays) => setSettings({ restBaseDays })}
          />
          <div className="field">
            <div>
              Bibliothèque
              <small>{syncing ?? 'Likes, playlists, albums et tops'}</small>
            </div>
            <button className="btn ghost small" disabled={!!syncing} onClick={() => void syncLibrary(true)}>
              Synchroniser
            </button>
          </div>
          <div className="field">
            <div>
              Découverte Last.fm
              <small>{hasLastfm() ? 'Clé configurée' : 'Ajoute VITE_LASTFM_API_KEY pour l’activer'}</small>
            </div>
            <span className="tag">{hasLastfm() ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <p className="hint">
          Un titre écouté 2 fois ou plus en 14 jours se repose {s.restBaseDays} j, puis {s.restBaseDays} j de plus par
          écoute supplémentaire.
        </p>
      </Section>

      <Section title="Sauvegarde du thème">
        <div className="actions">
          <button className="btn ghost small" onClick={() => void doExport()}>
            Exporter
          </button>
          <label className="btn ghost small" style={{ position: 'relative' }}>
            Importer
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void doImport(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          <button
            className="btn ghost small"
            onClick={() => {
              resetTheme()
              toast('Apparence réinitialisée.')
            }}
          >
            Réinitialiser
          </button>
        </div>
      </Section>

      <Section title="Compte">
        <div className="actions">
          <button className="btn ghost small" onClick={logout}>
            Se déconnecter de Spotify
          </button>
        </div>
      </Section>

      <p className="version" onClick={versionTap}>
        Epure 1.0 · contenu fourni par Spotify{s.debug ? ' · debug' : ''}
      </p>
    </Sheet>
  )
}
