/* ClipBot — outils communs (aucun texte de l'API n'est injecté en HTML : tout passe par des nœuds texte). */
'use strict';

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'open') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}
function clear(el, ...kids) { el.replaceChildren(); return add(el, kids); }

const ICONS = {
  prod: '<path d="M4 13a8 8 0 1 1 16 0"/><path d="M12 13l4-5"/><circle cx="12" cy="13" r="1.5"/><path d="M4 19h16"/>',
  streamers: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.900 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.800"/><path d="M18.500 14.800c1.700.800 2.700 2.500 3 5.200"/>',
  accounts: '<rect x="6" y="2.500" width="12" height="19" rx="2.500"/><path d="M10.500 18.500h3"/><path d="M10 9.500l4 2.500-4 2.500z"/>',
  clips: '<rect x="3" y="4" width="18" height="16" rx="2.500"/><path d="M3 9h18M8 4l-2 5M14 4l-2 5M20 4l-2 5"/><path d="M10.500 12.500l4 2.250-4 2.250z"/>',
  system: '<circle cx="12" cy="12" r="3"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100"/>',
  play: '<path d="M7 4.500v15l12-7.500z" fill="currentColor"/>', pause: '<path d="M7 5h3.500v14H7zM13.500 5H17v14h-3.500z" fill="currentColor"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.300 6"/><path d="M20 4v7h-7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';   // constantes internes uniquement
  return s;
}

/* ---------- API ---------- */
class ApiError extends Error { constructor(msg, status, silent) { super(msg); this.status = status; this.silent = !!silent; } }
async function api(method, path, body) {
  const opt = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let r;
  try { r = await fetch(path, opt); } catch (e) { throw new ApiError('Le bot ne répond pas. Est-il toujours lancé sur le PC ?', 0); }
  let data = null;
  try { data = await r.json(); } catch (e) { /* pas de JSON */ }
  if (r.status === 401 && !path.startsWith('/api/auth/')) { App.showAuth(); throw new ApiError('Connexion requise', 401, true); }
  if (!r.ok) {
    let d = data && data.detail;
    if (Array.isArray(d)) d = d.map(x => x.msg).join(', ');
    throw new ApiError(d || `Erreur ${r.status}`, r.status);
  }
  return data;
}
const GET = p => api('GET', p), POST = (p, b) => api('POST', p, b === undefined ? {} : b), PUT = (p, b) => api('PUT', p, b), DEL = p => api('DELETE', p);

function toast(msg, kind) {
  const t = h('div', { class: 'toast ' + (kind || ''), role: 'status' }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 7000 : 3500);
}
const oops = e => { if (!e.silent) toast(e.message || String(e), 'err'); };
/** Exécute une action asynchrone liée à un bouton : désactive, affiche erreur ou succès. */
async function act(btn, fn, okMsg) {
  if (btn) btn.disabled = true;
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { oops(e); } finally { if (btn) btn.disabled = false; }
}

/* ---------- formats ---------- */
const nf = new Intl.NumberFormat('fr-FR');
const fmt = {
  n: v => v == null ? '–' : nf.format(Math.round(v)),
  k: v => v == null ? '–' : v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' M' : v >= 1e4 ? Math.round(v / 1e3) + ' k' : nf.format(Math.round(v)),
  usd: v => (v || 0).toFixed(2).replace('.', ',') + ' $',
  dur: v => v == null ? '–' : Math.round(v) + ' s',
  date: ts => ts ? new Date(ts * 1000).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–',
  time: ts => new Date(ts * 1000).toLocaleTimeString('fr-FR'),
  ago: ts => { if (!ts) return 'jamais'; const s = Date.now() / 1000 - ts; return s < 90 ? 'à l\'instant' : s < 3600 ? `il y a ${Math.round(s / 60)} min` : s < 86400 ? `il y a ${Math.round(s / 3600)} h` : `il y a ${Math.round(s / 86400)} j`; },
  pct: v => Math.round(v * 100) + ' %',
};
const LANGS = { fr: 'Français', en: 'Anglais' };
const CATS = { action: 'Action', drole: 'Drôle', rp: 'RP / histoire', fail: 'Fail', reaction: 'Réaction' };
const STATUS = {
  detected: ['En montage', 'info'], transcribing: ['En montage', 'info'], analyzing: ['En montage', 'info'], editing: ['En montage', 'info'],
  ready: ['Prêt', 'good'], queued: ['En file d\'attente', 'warn'], uploading: ['Envoi…', 'warn'], uploaded_private: ['Uploadé en privé', 'accent'],
  published: ['Publié', 'good'], rejected: ['Rejeté', ''], failed: ['Échec', 'bad'],
};
const STEP = { detected: 'détecté', transcribing: 'transcription', analyzing: 'analyse IA', editing: 'montage' };
const SIGNALS = { audio: 'Cris / volume', chat: 'Débit du chat', emotes: 'Emotes de réaction', keywords: 'Mots-clés parlés', motion: 'Mouvement visuel', viewer_clip: 'Clip créé par un viewer' };
function statusBadge(s) { const [l, c] = STATUS[s] || [s, '']; return h('span', { class: 'badge ' + c }, l); }
function avatar(url, name, cls) {
  const a = h('span', { class: 'avatar ' + (cls || '') }, (name || '?').slice(0, 1).toUpperCase());
  if (url && /^https?:\/\//.test(url)) { const i = h('img', { src: url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', style: { width: '100%', height: '100%', objectFit: 'cover' } }); i.onerror = () => i.remove(); i.onload = () => a.replaceChildren(i); }
  return a;
}
function empty(title, text, ...extra) { return h('div', { class: 'empty' }, h('b', null, title), text, extra.length ? h('div', { style: { marginTop: '14px' } }, extra) : null); }
function loading() { return h('div', { class: 'loading' }, h('span', { class: 'spin' })); }
const clone = o => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); let x = o; for (const k of ks) { if (typeof x[k] !== 'object' || x[k] == null) x[k] = {}; x = x[k]; } x[last] = v; }

/* ---------- champs de formulaire ---------- */
let _fid = 0;
function field(label, control, help) {
  const id = 'f' + (++_fid);
  if (control.matches && control.matches('input,select,textarea')) control.id = id;
  return h('div', { class: 'field' }, h('label', { for: id }, label), control, help ? h('div', { class: 'help' }, help) : null);
}
const F = {
  text: (label, value, on, o = {}) => field(label, h('input', { type: o.type || 'text', value: value ?? '', placeholder: o.placeholder, autocomplete: o.autocomplete || 'off', oninput: e => on(e.target.value) }), o.help),
  number: (label, value, on, o = {}) => field(label, h('input', { type: 'number', value: value ?? '', min: o.min, max: o.max, step: o.step || 1, placeholder: o.placeholder, inputmode: 'decimal',
    [o.lazy ? 'onchange' : 'oninput']: e => { const v = e.target.value === '' ? (o.nullable ? null : undefined) : Number(e.target.value); if (v !== undefined && !Number.isNaN(v)) on(v); } }), o.help),
  range: (label, value, on, o = {}) => {
    const out = h('output', null, (o.fmt || String)(value));
    const inp = h('input', { type: 'range', min: o.min ?? 0, max: o.max ?? 1, step: o.step ?? 0.01, value, 'aria-label': label,
      oninput: e => { const v = Number(e.target.value); out.textContent = (o.fmt || String)(v); on(v); } });
    return h('div', { class: 'field' }, h('span', { class: 'lab' }, label), h('div', { class: 'range-row' }, inp, out), o.help ? h('div', { class: 'help' }, o.help) : null);
  },
  toggle: (label, value, on, o = {}) => h('label', { class: 'switch' }, h('input', { type: 'checkbox', role: 'switch', checked: !!value, onchange: e => on(e.target.checked) }),
    h('span', { class: 'txt' }, h('span', null, label), o.help ? h('small', null, o.help) : null)),
  select: (label, value, options, on, o = {}) => field(label, h('select', { onchange: e => on(e.target.value) },
    options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value ?? '') }, l))), o.help),
  textarea: (label, value, on, o = {}) => field(label, h('textarea', { rows: o.rows || 4, value: value ?? '', placeholder: o.placeholder, oninput: e => on(e.target.value) }), o.help),
  color: (label, value, on) => field(label, h('input', { type: 'color', value: value || '#ffffff', oninput: e => on(e.target.value.toUpperCase()) })),
  checks: (label, values, options, on, o = {}) => {
    const set = new Set(values || []);
    return h('div', { class: 'field' }, h('span', { class: 'lab' }, label), h('div', { class: 'checks' }, options.map(([v, l]) =>
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: set.has(v), onchange: e => { e.target.checked ? set.add(v) : set.delete(v); on(options.map(x => x[0]).filter(x => set.has(x))); } }), l))),
      o.help ? h('div', { class: 'help' }, o.help) : null);
  },
};
const lines = s => s.split('\n').map(x => x.trim()).filter(Boolean);

/** Brouillon de réglages : suit les modifications et n'envoie que les clés de premier niveau changées. */
function draftOf(original, onDirty) {
  const d = { orig: clone(original), cur: clone(original) };
  d.set = (p, v) => { setPath(d.cur, p, v); if (onDirty) onDirty(d.dirty()); };
  d.get = p => getPath(d.cur, p);
  d.changes = () => { const c = {}; for (const k of Object.keys(d.cur)) if (!same(d.cur[k], d.orig[k])) c[k] = d.cur[k]; return c; };
  d.dirty = () => Object.keys(d.changes()).length > 0;
  d.commit = () => { d.orig = clone(d.cur); if (onDirty) onDirty(false); };
  return d;
}

/* ---------- graphiques (Chart.js) ---------- */
const INK = { grid: 'rgba(255,255,255,.06)', tick: '#8d95a8', a: '#8b5cf6', b: '#38bdf8' };
function chart(canvas, type, labels, data, o = {}) {
  if (!window.Chart) return null;
  const c = new Chart(canvas, {
    type, data: { labels, datasets: [{ label: o.label || '', data, backgroundColor: o.color || INK.a, borderColor: o.color || INK.a, borderWidth: type === 'line' ? 2 : 0,
      borderRadius: 4, maxBarThickness: 26, pointRadius: data.length > 20 ? 0 : 3, pointHoverRadius: 5, tension: .25, fill: false }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: o.horizontal ? 'y' : 'x', animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false, axis: o.horizontal ? 'y' : 'x' },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#222838', borderColor: '#262c3b', borderWidth: 1, titleColor: '#e9ecf3', bodyColor: '#e9ecf3', padding: 10,
        callbacks: { label: ctx => ` ${o.label || ''} : ${(o.fmt || fmt.n)(o.horizontal ? ctx.parsed.x : ctx.parsed.y)}` } } },
      scales: { x: { grid: { color: o.horizontal ? INK.grid : 'transparent' }, ticks: Object.assign({ color: INK.tick, maxRotation: 0, autoSkipPadding: 12 }, o.horizontal ? { callback: v => (o.tick || fmt.k)(v) } : {}), border: { color: INK.grid }, beginAtZero: true },
        y: { grid: { color: o.horizontal ? 'transparent' : INK.grid }, ticks: Object.assign({ color: INK.tick }, o.horizontal ? {} : { callback: v => (o.tick || fmt.k)(v) }), border: { display: false }, beginAtZero: true } } },
  });
  App.charts.push(c);
  return c;
}
function chartCard(title, type, labels, data, o = {}) {
  const hasData = data.some(v => v);
  const cv = h('canvas', { role: 'img', 'aria-label': title });
  const card = h('div', { class: 'card' }, h('h2', null, title), hasData ? h('div', { class: 'chart-box ' + (o.small ? 'sm' : '') }, cv) : empty('Pas encore de données', o.emptyText || 'Les chiffres apparaîtront ici après les premières publications.'));
  if (hasData) requestAnimationFrame(() => chart(cv, type, labels, data, o));
  return card;
}
function sparkline(values, threshold) {
  const w = 240, ht = 44, n = Math.max(values.length, 2);
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', `0 0 ${w} ${ht}`); s.setAttribute('preserveAspectRatio', 'none'); s.setAttribute('class', 'spark'); s.setAttribute('aria-hidden', 'true');
  const pts = values.map((v, i) => `${(i / (n - 1) * w).toFixed(1)},${(ht - 2 - Math.min(1, v) * (ht - 4)).toFixed(1)}`).join(' ');
  const mk = (tag, at) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in at) e.setAttribute(k, at[k]); s.append(e); };
  if (threshold != null) mk('line', { x1: 0, x2: w, y1: ht - 2 - threshold * (ht - 4), y2: ht - 2 - threshold * (ht - 4), stroke: 'rgba(255,255,255,.25)', 'stroke-dasharray': '3 4', 'stroke-width': 1 });
  if (values.length > 1) { mk('polygon', { points: `0,${ht} ${pts} ${w},${ht}`, fill: 'rgba(139,92,246,.18)' }); mk('polyline', { points: pts, fill: 'none', stroke: '#a78bfa', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }); }
  return s;
}
function modal(content, o = {}) {
  const close = () => { back.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc); if (o.onClose) o.onClose(); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: 'modal ' + (o.narrow ? 'narrow' : ''), role: 'dialog', 'aria-modal': 'true' },
    h('button', { class: 'btn sm ghost modal-close', 'aria-label': 'Fermer', onclick: close }, icon('x')), content);
  const back = h('div', { class: 'modal-back', onclick: e => { if (e.target === back) close(); } }, box);
  document.body.append(back); document.body.style.overflow = 'hidden'; document.addEventListener('keydown', esc);
  return { close, box };
}
function confirmBox(title, text, okLabel, danger) {
  return new Promise(res => {
    let done = false;
    const m = modal(h('div', { class: 'stack' }, h('h2', null, title), h('p', { class: 'muted' }, text),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
        h('button', { class: 'btn', onclick: () => m.close() }, 'Annuler'),
        h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => { done = true; m.close(); } }, okLabel))), { narrow: true, onClose: () => res(done) });
  });
}
function tabs(items, current, onPick) {
  return h('div', { class: 'tabs', role: 'tablist' }, items.map(([k, l]) => h('button', { class: 'tab ' + (k === current ? 'active' : ''), role: 'tab', 'aria-selected': k === current, onclick: () => onPick(k) }, l)));
}
function pageHead(title, sub, ...right) { return h('div', { class: 'page-head' }, h('div', { class: 'grow' }, h('h1', null, title), sub ? h('p', null, sub) : null), right); }
function kpi(value, label) { return h('div', { class: 'kpi' }, h('span', { class: 'v' }, value), h('span', { class: 'l' }, label)); }
