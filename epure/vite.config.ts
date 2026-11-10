import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Epure — Vite + React + TypeScript, PWA installable sur iPhone.
export default defineConfig({
  // Spotify refuse "localhost" comme redirect URI : on sert sur 127.0.0.1.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // On ne met en cache que la coquille de l'app, jamais les réponses de l'API.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Epure',
        short_name: 'Epure',
        description: 'Une interface épurée pour piloter ta lecture Spotify.',
        lang: 'fr',
        theme_color: '#0b0b10',
        background_color: '#0b0b10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: { target: 'es2020', sourcemap: false },
})
