import CardPreview from '../components/CardPreview'
import { TEMPLATES, templateToProject } from '../data/templates'

// Development-only review page: /?gallery=Dessins,Personnages  or  /?keys=a,b
// Renders each template large so artwork can be inspected and screenshotted.
export default function Gallery() {
  const params = new URLSearchParams(location.search)
  const cats = (params.get('gallery') ?? '').split(',').filter(Boolean)
  const keys = (params.get('keys') ?? '').split(',').filter(Boolean)
  const cols = Number(params.get('cols') ?? 2)
  const list = TEMPLATES.filter((t) => (keys.length ? keys.includes(t.key) : cats.includes(t.category)))
  return (
    <div style={{ background: '#08090D', minHeight: '100vh', padding: 32, color: '#F5F5F7' }}>
      <div
        id="gallery"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 28, maxWidth: 1400 }}
      >
        {list.map((t) => (
          <figure key={t.key} data-key={t.key} style={{ margin: 0 }}>
            <CardPreview project={templateToProject(t)} width={1100} />
            <figcaption style={{ marginTop: 8, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
              {t.name} <span style={{ opacity: 0.5 }}>· {t.key}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
