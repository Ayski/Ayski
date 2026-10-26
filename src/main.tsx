import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SettingsProvider } from './theme/settings'
import { ToastProvider } from './components/ui'
import './styles/global.css'

// Dev-only artwork review page (stripped from production builds).
const Gallery = import.meta.env.DEV ? lazy(() => import('./dev/Gallery')) : null
const showGallery =
  Gallery !== null && /[?&](gallery|keys)=/.test(location.search)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showGallery && Gallery ? (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    ) : (
      <SettingsProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SettingsProvider>
    )}
  </StrictMode>,
)
