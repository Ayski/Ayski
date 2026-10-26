import { useEffect, useState } from 'react'
import CardPreview from '../components/CardPreview'
import { IconExplore, IconGallery, IconPlus, IconWallet } from '../components/icons'
import { getAllProjects } from '../db/storage'
import { TEMPLATES, templateToProject, blankProject, type Template } from '../data/templates'
import { getFavorites } from '../data/favorites'
import type { CardProject } from '../types'

interface Props {
  onCreate: (p: CardProject) => void
  onOpenProject: (p: CardProject) => void
  goExplore: () => void
  goGallery: () => void
  goWallet: () => void
}

export default function Home({ onCreate, onOpenProject, goExplore, goGallery, goWallet }: Props) {
  const [recent, setRecent] = useState<CardProject[]>([])
  const favKeys = getFavorites()
  const favTemplates = TEMPLATES.filter((t) => favKeys.includes(t.key))
  const recommended: Template[] = [
    TEMPLATES.find((t) => t.key === 'black-onyx')!,
    TEMPLATES.find((t) => t.key === 'gold-imperial')!,
    TEMPLATES.find((t) => t.key === 'carbon-apex')!,
    TEMPLATES.find((t) => t.key === 'gradient-aurora')!,
    TEMPLATES.find((t) => t.key === 'neon-pulse')!,
  ]

  useEffect(() => {
    getAllProjects().then((all) => setRecent(all.slice(0, 6)))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 6 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="page">
      <div className="eyebrow">Card Skin Studio</div>
      <h1 className="page-title">{greeting} 👋</h1>
      <p className="page-sub">Créez des visuels de cartes premium, puis exportez-les en haute résolution.</p>

      {recent[0] ? (
        <button className="card" style={{ padding: 16, width: '100%', textAlign: 'left' }} onClick={() => onOpenProject(recent[0])}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Reprendre le dernier design</div>
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <CardPreview project={recent[0]} width={640} />
          </div>
          <p style={{ textAlign: 'center', marginTop: 12, fontWeight: 600 }}>{recent[0].name}</p>
        </button>
      ) : (
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ maxWidth: 300, margin: '0 auto 14px' }}>
            <CardPreview project={templateToProject(recommended[1])} width={640} />
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Votre première carte vous attend.</p>
        </div>
      )}

      <button className="btn btn-primary btn-block mt" onClick={() => onCreate(blankProject())}>
        <IconPlus width={20} /> Créer un design
      </button>

      <div className="grid-2 mt">
        <button className="panel" style={{ textAlign: 'left' }} onClick={goExplore}>
          <IconExplore width={22} style={{ color: 'var(--accent)' }} />
          <div style={{ marginTop: 8, fontWeight: 600 }}>Explorer</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{TEMPLATES.length} modèles</div>
        </button>
        <button className="panel" style={{ textAlign: 'left' }} onClick={goGallery}>
          <IconGallery width={22} style={{ color: 'var(--accent)' }} />
          <div style={{ marginTop: 8, fontWeight: 600 }}>Mes créations</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{recent.length} projet(s)</div>
        </button>
      </div>

      <button className="panel mt" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }} onClick={goWallet}>
        <IconWallet width={22} style={{ color: 'var(--accent)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>Compatibilité Apple Wallet</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Ce qui est possible — et ce qui ne l’est pas.</div>
        </div>
      </button>

      {recent.length > 0 && (
        <>
          <div className="section-head">
            <h2>Projets récents</h2>
            <button className="link" onClick={goGallery}>Tout voir</button>
          </div>
          <div className="hscroll">
            {recent.map((p) => (
              <button key={p.id} className="tpl" onClick={() => onOpenProject(p)}>
                <div className="tpl-thumb"><CardPreview project={p} width={360} /></div>
                <div className="tpl-meta"><div className="tpl-name">{p.name}</div></div>
              </button>
            ))}
          </div>
        </>
      )}

      {favTemplates.length > 0 && (
        <>
          <div className="section-head">
            <h2>Modèles favoris</h2>
            <button className="link" onClick={goExplore}>Explorer</button>
          </div>
          <div className="hscroll">
            {favTemplates.map((t) => (
              <button key={t.key} className="tpl" onClick={() => onCreate(templateToProject(t))}>
                <div className="tpl-thumb"><CardPreview project={templateToProject(t)} width={360} /></div>
                <div className="tpl-meta"><div className="tpl-name">{t.name}</div></div>
              </button>
            ))}
          </div>
        </>
      )}

      {[
        { title: 'Dessins parodiques', filter: (c: string) => c === 'Dessins' },
        { title: 'Cartes de personnages', filter: (c: string) => c === 'Personnages' },
      ].map((s) => (
        <div key={s.title}>
          <div className="section-head">
            <h2>{s.title}</h2>
            <button className="link" onClick={goExplore}>Tout voir</button>
          </div>
          <div className="hscroll">
            {TEMPLATES.filter((t) => s.filter(t.category)).map((t) => (
              <button key={t.key} className="tpl" onClick={() => onCreate(templateToProject(t))}>
                <div className="tpl-thumb"><CardPreview project={templateToProject(t)} width={360} /></div>
                <div className="tpl-meta"><div className="tpl-name">{t.name}</div><div className="tpl-cat">{t.badge ?? t.category}</div></div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="section-head">
        <h2>Collections recommandées</h2>
      </div>
      <div className="hscroll">
        {recommended.map((t) => (
          <button key={t.key} className="tpl" onClick={() => onCreate(templateToProject(t))}>
            <div className="tpl-thumb"><CardPreview project={templateToProject(t)} width={360} /></div>
            <div className="tpl-meta"><div className="tpl-name">{t.name}</div><div className="tpl-cat">{t.category}</div></div>
          </button>
        ))}
      </div>
    </div>
  )
}
