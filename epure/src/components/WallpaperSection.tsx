// Section "Fond d'écran" du panneau : mode, galerie de fonds personnels et réglages.

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from '../state/toast'
import { setSettings, useSettings, type BgMode, type Screen } from '../theme/settings'
import { addAnimated, addImage, deleteWallpaper, useWallpapers, type Crop } from '../wallpaper/wallpapers'
import { Section, Segmented, Slider, Toggle } from './Controls'
import { Cropper } from './Cropper'
import { Icon } from './Icons'

const SCREENS: { value: Screen; label: string }[] = [
  { value: 'now', label: 'Lecture' },
  { value: 'playlists', label: 'Playlists' },
  { value: 'stats', label: 'Stats' },
]

export function WallpaperSection() {
  const s = useSettings((x) => x)
  const wallpapers = useWallpapers()
  const [cropping, setCropping] = useState<HTMLImageElement | null>(null)
  /** Écran auquel on attribue un fond quand "fond différent par écran" est actif. */
  const [screen, setScreen] = useState<Screen>('now')

  const selectedId = s.perScreen ? (s.screenWallpapers[screen] ?? s.wallpaperId) : s.wallpaperId

  const select = (id: string) => {
    if (s.perScreen) setSettings({ bgMode: 'image', screenWallpapers: { ...s.screenWallpapers, [screen]: id } })
    else setSettings({ bgMode: 'image', wallpaperId: id })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.type === 'image/gif' || file.type.startsWith('video/')) {
        select(await addAnimated(file))
        return
      }
      // Photo : on passe par le recadrage avant de compresser.
      const image = new Image()
      image.src = URL.createObjectURL(file)
      try {
        await image.decode()
      } catch (e) {
        URL.revokeObjectURL(image.src)
        throw e
      }
      setCropping(image)
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : 'Impossible de lire ce fichier.')
    }
  }

  const onCrop = async (crop: Crop) => {
    if (!cropping) return
    try {
      select(await addImage(cropping, crop))
    } catch {
      toast('Impossible d’enregistrer ce fond.')
    }
    URL.revokeObjectURL(cropping.src)
    setCropping(null)
  }

  return (
    <Section title="Fond d'écran">
      <Segmented<BgMode>
        label="Mode du fond"
        value={s.bgMode}
        onChange={(bgMode) => {
          if (bgMode === 'image' && !wallpapers.length) toast('Ajoute une image avec le bouton +.')
          setSettings({ bgMode })
        }}
        options={[
          { value: 'dynamic', label: 'Dynamique' },
          { value: 'solid', label: 'Couleur' },
          { value: 'image', label: 'Mon image' },
        ]}
      />

      {s.bgMode === 'solid' && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="field">
            Couleur du fond
            <span className="color-well" style={{ background: s.bgSolid }}>
              <input
                type="color"
                aria-label="Couleur du fond"
                value={s.bgSolid}
                onChange={(e) => setSettings({ bgSolid: e.target.value })}
              />
            </span>
          </div>
        </div>
      )}

      {s.bgMode === 'image' && (
        <>
          {s.perScreen && (
            <div style={{ marginTop: 12 }}>
              <Segmented label="Écran concerné" value={screen} onChange={setScreen} options={SCREENS} />
            </div>
          )}
          <div className="gallery">
            {wallpapers.map((w) => (
              <div key={w.id} className="thumb" role="button" aria-pressed={w.id === selectedId} onClick={() => select(w.id)}>
                <img src={w.thumbUrl} alt="Fond enregistré" draggable={false} />
                {w.kind !== 'image' && <span className="thumb-tag">{w.kind === 'gif' ? 'GIF' : 'VIDÉO'}</span>}
                <button
                  className="thumb-del"
                  aria-label="Supprimer ce fond"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Supprimer ce fond d’écran ?')) void deleteWallpaper(w.id)
                  }}
                >
                  <Icon.close />
                </button>
              </div>
            ))}
            <label className="thumb add" aria-label="Ajouter un fond depuis ma galerie">
              <Icon.plus />
              <input
                type="file"
                accept="image/*,video/mp4,video/quicktime"
                onChange={(e) => {
                  void onFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          <p className="hint">Photos, GIF animés et courtes vidéos. Tes images restent sur ton téléphone.</p>

          <div className="card" style={{ marginTop: 12 }}>
            <Slider label="Flou" value={s.bgBlur} min={0} max={40} format={(v) => `${v} px`} onChange={(bgBlur) => setSettings({ bgBlur })} />
            <Slider label="Luminosité" value={s.bgBrightness} min={40} max={160} format={(v) => `${v} %`} onChange={(bgBrightness) => setSettings({ bgBrightness })} />
            <Slider label="Assombrissement" value={s.bgDim} min={0} max={80} format={(v) => `${v} %`} onChange={(bgDim) => setSettings({ bgDim })} />
            <Slider label="Saturation" value={s.bgSaturation} min={0} max={200} format={(v) => `${v} %`} onChange={(bgSaturation) => setSettings({ bgSaturation })} />
            <Toggle label="Teinter avec la pochette" hint="Léger voile de la couleur du titre" checked={s.tintWithCover} onChange={(tintWithCover) => setSettings({ tintWithCover })} />
            <Toggle label="Fond différent par écran" hint="Lecture, playlists et stats" checked={s.perScreen} onChange={(perScreen) => setSettings({ perScreen })} />
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <Toggle label="Effet parallaxe" hint="Le fond bouge légèrement au swipe" checked={s.parallax} onChange={(parallax) => setSettings({ parallax })} />
      </div>

      {/* Hors du panneau (portail) : un parent transformé piégerait le plein écran. */}
      {cropping &&
        createPortal(
          <Cropper
            image={cropping}
            onCancel={() => {
              URL.revokeObjectURL(cropping.src)
              setCropping(null)
            }} onConfirm={(c) => void onCrop(c)} />,
          document.body,
        )}
    </Section>
  )
}
