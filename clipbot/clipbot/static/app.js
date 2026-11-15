/* ClipBot — coquille de l'application : connexion, navigation, routage par hash. */
'use strict';

const App = {
  charts: [], timers: [], status: null, meta: null, accounts: [], views: {},
  root: () => document.getElementById('app'),

  every(ms, fn) { const t = setInterval(() => { if (!document.hidden) fn(); }, ms); this.timers.push(t); return t; },
  cleanup() { this.timers.forEach(clearInterval); this.timers = []; this.charts.forEach(c => { try { c.destroy(); } catch (e) { /* déjà détruit */ } }); this.charts = []; },

  async boot() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    window.addEventListener('hashchange', () => this.route());
    let st;
    try { st = await GET('/api/auth/state'); } catch (e) { clear(this.root(), h('div', { class: 'auth' }, empty('Bot injoignable', e.message))); return; }
    if (st.setup_needed || !st.logged_in) return this.showAuth(st.setup_needed);
    this.start();
  },

  showAuth(setup) {
    if (this.authShown) return;
    this.authShown = true; this.cleanup(); clearInterval(this.statusTimer);
    const pw = h('input', { type: 'password', placeholder: 'Mot de passe', autocomplete: setup ? 'new-password' : 'current-password', 'aria-label': 'Mot de passe', required: true, minlength: setup ? 6 : null });
    const btn = h('button', { class: 'btn primary', type: 'submit', style: { width: '100%' } }, setup ? 'Créer et entrer' : 'Se connecter');
    const form = h('form', { class: 'stack', onsubmit: async e => {
      e.preventDefault();
      await act(btn, async () => { await POST(setup ? '/api/auth/setup' : '/api/auth/login', { password: pw.value }); this.authShown = false; this.start(); });
    } },
      h('div', { class: 'row' }, h('img', { src: '/static/icons/icon-192.png', alt: '' }), h('div', null, h('h1', null, 'ClipBot'), h('div', { class: 'muted small' }, 'Clips Twitch → TikTok'))),
      h('h2', { style: { margin: '6px 0 0' } }, setup ? 'Crée ton mot de passe' : 'Connexion'),
      h('p', { class: 'muted small' }, setup ? 'Il protège l\'application, y compris depuis ton téléphone. 6 caractères minimum. Note-le bien.' : 'Entre le mot de passe de l\'application.'),
      pw, btn);
    clear(this.root(), h('div', { class: 'auth' }, h('div', { class: 'card' }, form)));
    pw.focus();
  },

  async start() {
    try { [this.meta, this.status] = await Promise.all([GET('/api/settings'), GET('/api/status')]); } catch (e) { return oops(e); }
    this.refreshAccounts();
    const items = [['production', 'Production', 'prod'], ['streamers', 'Streamers', 'streamers'], ['comptes', 'Comptes', 'accounts'], ['clips', 'Clips', 'clips'], ['systeme', 'Système', 'system']];
    this.nav = h('nav', { class: 'sidebar', 'aria-label': 'Navigation principale' },
      h('div', { class: 'brand' }, h('img', { src: '/static/icons/icon-192.png', alt: '' }), 'ClipBot'),
      items.map(([k, l, ic]) => h('a', { class: 'nav-item', href: '#/' + k, 'data-k': k }, icon(ic), h('span', { class: 'lbl' }, l), k === 'systeme' ? h('span', { class: 'nav-badge hidden', id: 'alert-badge' }) : null)),
      h('div', { class: 'side-foot', id: 'side-foot' }));
    this.main = h('main', { class: 'main', id: 'main' });
    clear(this.root(), h('div', { class: 'shell' }, this.nav, this.main));
    this.statusTimer = setInterval(() => { if (!document.hidden) this.pollStatus(); }, 5000);
    this.paintStatus();
    this.route();
  },

  async refreshAccounts() { try { const r = await GET('/api/accounts'); this.accounts = r.accounts; this.tiktokReady = r.tiktok_ready; } catch (e) { /* silencieux */ } return this.accounts; },
  async refreshMeta() { this.meta = await GET('/api/settings'); return this.meta; },
  async pollStatus() { try { this.status = await GET('/api/status'); this.paintStatus(); } catch (e) { /* silencieux */ } },
  paintStatus() {
    const s = this.status; if (!s) return;
    const b = document.getElementById('alert-badge');
    if (b) { b.textContent = s.alerts_unread; b.classList.toggle('hidden', !s.alerts_unread); }
    const f = document.getElementById('side-foot');
    if (f) clear(f, h('div', { class: 'row' }, h('span', { class: 'dot ' + (s.running ? 'good' : '') }), s.running ? 'En marche' : 'En pause'), h('div', null, s.game), s.test_mode ? h('div', null, 'Mode test') : null);
    document.dispatchEvent(new CustomEvent('clipbot:status'));
  },

  route() {
    if (!this.main) return;
    const raw = location.hash.replace(/^#\/?/, '') || 'production';
    const [path, query] = raw.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const params = new URLSearchParams(query || '');
    const view = this.views[parts[0]] ? parts[0] : 'production';
    this.cleanup();
    this.nav.querySelectorAll('.nav-item').forEach(a => { const on = a.dataset.k === view; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    clear(this.main, loading());
    window.scrollTo(0, 0);
    Promise.resolve(this.views[view](this.main, parts.slice(1), params)).catch(e => { if (!e.silent) clear(this.main, empty('Impossible d\'afficher cette page', e.message)); });
  },
};
document.addEventListener('DOMContentLoaded', () => App.boot());
