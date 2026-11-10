import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Epure — Vite + React + TypeScript, PWA installable sur iPhone.
// EPURE_BASE = sous-dossier de publication (GitHub Pages : /Ayski/epure/). Par défaut la racine.
const base = process.env.EPURE_BASE ?? '/'

// Même politique que les en-têtes de vercel.json, en balise <meta> pour les hébergeurs sans
// en-têtes (GitHub Pages). Uniquement à la construction : le serveur de dev a besoin de
// scripts en ligne pour le rechargement à chaud.
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob: data:; " +
  "media-src 'self' blob:; connect-src 'self' https://api.spotify.com https://accounts.spotify.com " +
  "https://ws.audioscrobbler.com https://i.scdn.co data:; worker-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'none'"

export default defineConfig({
  base,
  // Spotify refuse "localhost" comme redirect URI : on sert sur 127.0.0.1.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  plugins: [
    react(),
    {
      name: 'epure-csp',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // On ne met en cache que la coquille de l'app, jamais les réponses de l'API.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: `${base}index.html`,
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
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: { target: 'es2020', sourcemap: false },
})
