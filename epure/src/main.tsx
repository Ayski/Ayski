import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './styles/app.css'

// Service worker : met la coquille de l'app en cache et se met à jour tout seul.
registerSW({ immediate: true })

// iOS : bloque le zoom par pincement, que la balise viewport ne suffit plus à empêcher.
document.addEventListener('gesturestart', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
