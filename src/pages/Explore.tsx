import { useMemo, useState } from 'react'
import CardPreview from '../components/CardPreview'
import { IconSearch, IconStar, IconStarFill } from '../components/icons'
import { Sheet } from '../components/ui'
import { CATEGORIES, NEW_FILTER, TEMPLATES, templatePreview, templateToProject, type Template } from '../data/templates'
import { isFavorite, toggleFavorite } from '../data/favorites'
import type { CardProject } from '../types'

export default function Explore({ onOpen }: { onOpen: (p: CardProject) => void }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Tous')
  const [sort, setSort] = useState<'name' | 'category'>('category')
  const [preview, setPreview] = useState<Template | null>(null)
  const [favTick, setFavTick] = useState(0)

  const list = useMemo(() => {
    let items = TEMPLATES.filter((t) =>
      cat === 'Tous' ? true : cat === NEW_FILTER ? Boolean(t.badge) : t.category === cat,
    )
    if (q.trim()) {
      const n = q.toLowerCase()
      items = items.filter((t) => t.name.toLowerCase().includes(n) || t.category.toLowerCase().includes(n))
    }
    items = [...items].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    )
    return items
  }, [q, cat, sort])

  return (
    <div className="page">
      <div className="eyebrow">Bibliothèque</div>
      <h1 className="page-title">Explorer</h1>
      <p className="page-sub">{TEMPLATES.length} modèles originaux, prêts à personnaliser.</p>

      <div className="row mb" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px' }}>
        <IconSearch width={18} style={{ color: 'var(--text-dim)' }} />
        <input
          className="input"
          style={{ border: 'none', background: 'transparent', paddingLeft: 8 }}
          placeholder="Rechercher un modèle…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="chips mb">
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="row-between mb">
        <span className="tile-sub" style={{ marginTop: 0 }}>{list.length} résultat{list.length > 1 ? 's' : ''}</span>
        <div className="wrap">
          <button className={`chip ${sort === 'category' ? 'active' : ''}`} onClick={() => setSort('category')}>Par thème</button>
          <button className={`chip ${sort === 'name' ? 'active' : ''}`} onClick={() => setSort('name')}>A–Z</button>
        </div>
      </div>

      <div className="tpl-grid">
        {list.map((t) => (
          <button key={t.key} className="tpl" onClick={() => setPreview(t)}>
            <div className="tpl-thumb">
              <CardPreview project={templatePreview(t)} width={420} lazy />
            </div>
            <div className="tpl-meta row-between">
              <div>
                <div className="tpl-name">
                  {t.name}
                  {t.badge && <span className="tpl-badge">{t.badge}</span>}
                </div>
                <div className="tpl-cat">{t.category}</div>
              </div>
              {isFavorite(t.key) ? <IconStarFill width={18} style={{ color: 'var(--accent)' }} /> : <IconStar width={18} style={{ color: 'var(--text-faint)' }} />}
            </div>
          </button>
        ))}
      </div>

      {preview && (
        <Sheet title={preview.name} onClose={() => setPreview(null)}>
          <div style={{ maxWidth: 360, margin: '0 auto 18px' }}>
            <CardPreview project={templatePreview(preview)} width={720} />
          </div>
          <p className="page-sub" style={{ textAlign: 'center' }}>{preview.category}</p>
          <button className="btn btn-primary btn-block mb" onClick={() => onOpen(templateToProject(preview))}>
            Modifier ce modèle
          </button>
          <div className="grid-2">
            <button
              className="btn btn-ghost"
              onClick={() => {
                const p = templateToProject(preview)
                p.name = `${preview.name} (copie)`
                onOpen(p)
              }}
            >
              Dupliquer & éditer
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                toggleFavorite(preview.key)
                setFavTick((n) => n + 1)
              }}
            >
              {/* favTick forces re-render of label */}
              <span style={{ display: 'none' }}>{favTick}</span>
              {isFavorite(preview.key) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
