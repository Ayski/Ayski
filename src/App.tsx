import { useState } from 'react'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Explore from './pages/Explore'
import MyCreations from './pages/MyCreations'
import Settings from './pages/Settings'
import WalletInfo from './pages/WalletInfo'
import Studio from './pages/Studio'
import { blankProject } from './data/templates'
import { saveProject } from './db/storage'
import type { CardProject } from './types'

export type View = 'home' | 'explore' | 'studio' | 'gallery' | 'settings' | 'wallet'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [editing, setEditing] = useState<CardProject | null>(null)

  function openEditor(p: CardProject) {
    // persist immediately so a project always exists in the gallery
    saveProject(p).catch(() => undefined)
    setEditing(p)
  }

  function navigate(v: View) {
    if (v === 'studio') {
      openEditor(blankProject())
      return
    }
    setView(v)
  }

  if (editing) {
    return (
      <Studio
        key={editing.id}
        initial={editing}
        onExit={() => {
          setEditing(null)
          setView('gallery')
        }}
      />
    )
  }

  return (
    <div className="app">
      {view === 'home' && (
        <Home
          onCreate={openEditor}
          onOpenProject={openEditor}
          goExplore={() => setView('explore')}
          goGallery={() => setView('gallery')}
          goWallet={() => setView('wallet')}
        />
      )}
      {view === 'explore' && <Explore onOpen={openEditor} />}
      {view === 'gallery' && <MyCreations onOpen={openEditor} />}
      {view === 'settings' && <Settings />}
      {view === 'wallet' && <WalletInfo />}

      <BottomNav view={view} onNavigate={navigate} />
    </div>
  )
}
