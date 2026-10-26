import { useEffect, useMemo, useState } from 'react'
import CardPreview from '../components/CardPreview'
import { IconExport, IconSearch, IconStar, IconStarFill } from '../components/icons'
import { Sheet, useConfirm, useToast } from '../components/ui'
import { deleteProject, getAllProjects, saveProject } from '../db/storage'
import { exportProject } from '../studio/render'
import { dataUrlToBlob, safeFileName, shareOrDownload } from '../studio/image'
import { uid, type CardProject } from '../types'

export default function MyCreations({ onOpen }: { onOpen: (p: CardProject) => void }) {
  const toast = useToast()
  const { confirm, confirmNode } = useConfirm()
  const [projects, setProjects] = useState<CardProject[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [onlyFav, setOnlyFav] = useState(false)
  const [active, setActive] = useState<CardProject | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    setProjects(await getAllProjects())
    setLoading(false)
  }
  useEffect(() => {
    reload()
  }, [])

  const list = useMemo(() => {
    let items = projects
    if (onlyFav) items = items.filter((p) => p.favorite)
    if (q.trim()) {
      const n = q.toLowerCase()
      items = items.filter((p) => p.name.toLowerCase().includes(n) || p.category.toLowerCase().includes(n))
    }
    items = [...items].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt))
    return items
  }, [projects, q, sort, onlyFav])

  async function toggleFav(p: CardProject) {
    await saveProject({ ...p, favorite: !p.favorite })
    reload()
  }
  async function rename(p: CardProject, name: string) {
    await saveProject({ ...p, name })
    reload()
  }
  async function duplicate(p: CardProject) {
    await saveProject({ ...p, id: uid(), name: `${p.name} (copie)`, createdAt: Date.now(), favorite: false })
    toast('Projet dupliqué')
    reload()
  }
  async function remove(p: CardProject) {
    const ok = await confirm(`Supprimer « ${p.name} » ? Cette action est définitive.`, { danger: true, confirmLabel: 'Supprimer' })
    if (!ok) return
    await deleteProject(p.id)
    setActive(null)
    toast('Projet supprimé')
    reload()
  }
  async function exportProj(p: CardProject) {
    try {
      const url = await exportProject(p, 2048, 'image/png')
      const result = await shareOrDownload(dataUrlToBlob(url), `${safeFileName(p.name)}.png`)
      toast(result === 'shared' ? 'Partagé' : 'Image enregistrée')
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <div className="page">
      <div className="eyebrow">Galerie personnelle</div>
      <h1 className="page-title">Mes créations</h1>
      <p className="page-sub">{projects.length} projet(s) enregistré(s) localement sur cet appareil.</p>

      <div className="row mb" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px' }}>
        <IconSearch width={18} style={{ color: 'var(--text-dim)' }} />
        <input className="input" style={{ border: 'none', background: 'transparent', paddingLeft: 8 }} placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="row-between mb">
        <div className="wrap">
          <button className={`chip ${!onlyFav ? 'active' : ''}`} onClick={() => setOnlyFav(false)}>Tous</button>
          <button className={`chip ${onlyFav ? 'active' : ''}`} onClick={() => setOnlyFav(true)}>Favoris</button>
        </div>
        <div className="wrap">
          <button className={`chip ${sort === 'recent' ? 'active' : ''}`} onClick={() => setSort('recent')}>Récent</button>
          <button className={`chip ${sort === 'name' ? 'active' : ''}`} onClick={() => setSort('name')}>A–Z</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-dim)' }}>Chargement…</p>
      ) : list.length === 0 ? (
        <div className="empty">
          <IconExport />
          <p>Aucun projet pour le moment.<br />Créez un design depuis l’Accueil ou Explorer.</p>
        </div>
      ) : (
        list.map((p) => (
          <div key={p.id} className="list-tile">
            <div className="list-thumb" style={{ overflow: 'hidden' }}>
              <CardPreview project={p} width={240} />
            </div>
            <div className="hgroup">
              <h3>{p.name}</h3>
              <p>{p.category} · {new Date(p.updatedAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <button className="icon-btn" onClick={() => toggleFav(p)} aria-label="Favori">
              {p.favorite ? <IconStarFill width={18} style={{ color: 'var(--accent)' }} /> : <IconStar width={18} />}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setActive(p)}>Options</button>
          </div>
        ))
      )}

      {active && (
        <Sheet title={active.name} onClose={() => setActive(null)}>
          <div style={{ maxWidth: 300, margin: '0 auto 18px' }}>
            <CardPreview project={active} width={640} />
          </div>
          <button className="btn btn-primary btn-block mb" onClick={() => onOpen(active)}>Modifier</button>
          <div className="grid-2 mb">
            <button className="btn btn-ghost" onClick={() => exportProj(active)}>Exporter</button>
            <button className="btn btn-ghost" onClick={() => duplicate(active)}>Dupliquer</button>
          </div>
          <RenameRow project={active} onRename={(n) => rename(active, n)} />
          <button className="btn btn-danger btn-block mt" onClick={() => remove(active)}>Supprimer définitivement</button>
        </Sheet>
      )}
      {confirmNode}
    </div>
  )
}

function RenameRow({ project, onRename }: { project: CardProject; onRename: (n: string) => void }) {
  const [name, setName] = useState(project.name)
  return (
    <div className="row">
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-ghost btn-sm" onClick={() => name.trim() && onRename(name.trim())}>
        Renommer
      </button>
    </div>
  )
}
