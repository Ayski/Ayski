/* ClipBot — service worker minimal : met en cache la coquille statique, jamais /api ni /media. */
const CACHE = 'clipbot-shell-v6';
const SHELL = ['/', '/static/style.css?v=6', '/static/core.js?v=6', '/static/app.js?v=6', '/static/view-production.js?v=6',
  '/static/view-streamers.js?v=6', '/static/view-accounts.js?v=6', '/static/view-clips.js?v=6', '/static/view-system.js?v=6',
  '/static/vendor/chart.umd.js', '/static/icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/media/')) return;
  // réseau d'abord (toujours la dernière version quand le PC répond), cache en secours
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match('/'))));
});
