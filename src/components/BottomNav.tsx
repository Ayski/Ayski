import { IconExplore, IconGallery, IconHome, IconSettings, IconStudio } from './icons'
import type { View } from '../App'

const items: { key: View; label: string; Icon: typeof IconHome }[] = [
  { key: 'home', label: 'Accueil', Icon: IconHome },
  { key: 'explore', label: 'Explorer', Icon: IconExplore },
  { key: 'studio', label: 'Studio', Icon: IconStudio },
  { key: 'gallery', label: 'Créations', Icon: IconGallery },
  { key: 'settings', label: 'Réglages', Icon: IconSettings },
]

export default function BottomNav({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  return (
    <nav className="bottom-nav">
      {items.map(({ key, label, Icon }) => (
        <button key={key} className={`nav-item ${view === key ? 'active' : ''}`} onClick={() => onNavigate(key)}>
          <Icon />
          {label}
          <span className="nav-dot" />
        </button>
      ))}
    </nav>
  )
}
