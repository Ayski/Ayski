/* Écran Système : coûts IA, PC, clés API (guides), journal, alertes, configuration. */
'use strict';

const ALERT_KIND = { stream_lost: 'Stream perdu', upload_failed: 'Upload échoué', tiktok_quota: 'Quota TikTok', disk_full: 'Disque plein', ai_budget: 'Budget IA', error: 'Erreur' };

App.views.systeme = async function (main) {
  const [sys, al] = await Promise.all([GET('/api/system'), GET('/api/alerts')]);
  const S = App.meta.settings;
  const liveBox = h('div'), alertBox = h('div'), logBox = h('div'), keysBox = h('div');
  const gauge = (label, pct, detail) => h('div', { class: 'card tight' }, h('div', { class: 'row between' }, h('b', null, label), h('span', { class: 'num' }, Math.round(pct) + ' %')),
    h('div', { class: 'progress ' + (pct > 90 ? 'bad' : pct > 75 ? 'warn' : 'good'), style: { margin: '8px 0 6px' }, role: 'progressbar', 'aria-label': label, 'aria-valuenow': Math.round(pct), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: Math.min(100, pct) + '%' } })),
    h('div', { class: 'muted tiny' }, detail));
  const paintLive = L => clear(liveBox, h('div', { class: 'grid g4' },
    gauge('Processeur', L.cpu, sys.info.cpu), gauge('Mémoire', L.ram_pct, `${L.ram_used_gb} Go utilisés sur ${sys.info.ram_gb} Go`),
    gauge('Disque', L.disk_pct, `${L.disk_free_gb} Go libres sur ${L.disk_total_gb} Go`),
    L.gpus.length ? L.gpus.map(g => gauge('Carte graphique', g.util, `${g.name} · ${Math.round(g.vram_used_mb / 1024 * 10) / 10} / ${Math.round(g.vram_mb / 1024)} Go`)) : h('div', { class: 'card tight' }, h('b', null, 'Carte graphique'), h('div', { class: 'muted tiny', style: { marginTop: '8px' } }, (sys.info.gpus[0] || {}).name || 'Aucune carte NVIDIA détectée : le montage utilise le processeur.'))),
    h('div', { class: 'muted small', style: { marginTop: '8px' } }, `Dossiers : clips ${L.folders.clips} Go · mémoire tampon des streams ${L.folders.buffers} Go · extraits bruts ${L.folders.raw} Go`));
  paintLive(sys.live);
  App.every(5000, async () => { try { const r = await GET('/api/system'); paintLive(r.live); } catch (e) { /* silencieux */ } });

  // --- coûts IA ---
  const c = sys.costs;
  const budget = draftOf({ ai_budget_day: S.ai_budget_day, ai_budget_month: S.ai_budget_month, ai_price_in: S.ai_price_in, ai_price_out: S.ai_price_out });
  const bar = (v, max) => h('div', { class: 'progress ' + (v >= max ? 'bad' : v > max * .8 ? 'warn' : ''), style: { margin: '6px 0' } }, h('i', { style: { width: Math.min(100, max ? 100 * v / max : 0) + '%' } }));
  const last30 = []; const byDay = Object.fromEntries(c.history.map(x => [x.d, x.c]));
  for (let i = 29; i >= 0; i--) { const dt = new Date(Date.now() - i * 864e5); const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; last30.push([k.slice(8) + '/' + k.slice(5, 7), byDay[k] || 0]); }
  const costCard = h('div', { class: 'grid g2' },
    h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Coûts de l\'API Claude'),
      c.paused ? h('div', { class: 'banner bad', style: { margin: 0 } }, 'Plafond atteint : l\'IA est en pause. Les clips attendent et reprendront automatiquement.') : null,
      h('div', null, h('div', { class: 'row between' }, h('span', null, 'Aujourd\'hui'), h('b', { class: 'num' }, `${fmt.usd(c.day)} / ${fmt.usd(c.budget_day)}`)), bar(c.day, c.budget_day), h('div', { class: 'muted tiny' }, `${c.calls_today} appel(s) aujourd'hui`)),
      h('div', null, h('div', { class: 'row between' }, h('span', null, 'Ce mois-ci'), h('b', { class: 'num' }, `${fmt.usd(c.month)} / ${fmt.usd(c.budget_month)}`)), bar(c.month, c.budget_month)),
      h('div', { class: 'form-grid', style: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } },
        F.number('Plafond par jour ($)', S.ai_budget_day, v => budget.set('ai_budget_day', v), { min: 0, step: 0.5 }), F.number('Plafond par mois ($)', S.ai_budget_month, v => budget.set('ai_budget_month', v), { min: 0, step: 1 }),
        F.number('Prix entrée ($ / million de tokens)', S.ai_price_in, v => budget.set('ai_price_in', v), { min: 0, step: 0.1, help: 'Utilisé seulement pour un modèle inconnu du bot.' }), F.number('Prix sortie ($ / million de tokens)', S.ai_price_out, v => budget.set('ai_price_out', v), { min: 0, step: 0.1 })),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: e => act(e.currentTarget, async () => { const ch = budget.changes(); if (!Object.keys(ch).length) return; const r = await PUT('/api/settings', ch); App.meta.settings = r.settings; budget.commit(); }, 'Plafonds enregistrés') }, 'Enregistrer'),
        h('span', { class: 'muted small grow' }, 'Quand un plafond est atteint, l\'IA se met en pause toute seule.'))),
    chartCard('Dépense par jour (30 derniers jours)', 'bar', last30.map(x => x[0]), last30.map(x => x[1]), { label: 'Dépense', fmt: fmt.usd, emptyText: 'Aucun appel à l\'IA sur les 30 derniers jours.' }));

  // --- PC ---
  const i = sys.info, rec = sys.recommend;
  const line = (k, v) => h('tr', null, h('td', { class: 'muted' }, k), h('td', null, v));
  const pcCard = h('div', { class: 'grid g2' },
    h('div', { class: 'card' }, h('h2', null, 'Analyse de ce PC'), h('table', null, h('tbody', null,
      line('Système', i.os), line('Processeur', `${i.cpu} (${i.cores} cœurs, ${i.threads} threads)`), line('Mémoire', i.ram_gb + ' Go'),
      line('Carte graphique', i.gpus.length ? i.gpus.map(g => g.name + (g.vram_mb ? ` (${Math.round(g.vram_mb / 1024)} Go)` : '')).join(', ') : 'Aucune détectée'),
      line('ffmpeg', i.ffmpeg), line('Python', i.python)))),
    h('div', { class: 'card' }, h('h2', null, 'Réglages conseillés pour ce PC'), h('table', null, h('tbody', null,
      line('Streams surveillés en même temps', rec.max_streams), line('Montages en parallèle', rec.edit_workers),
      line('Encodeur vidéo', rec.encoder === 'libx264' ? 'Processeur (libx264)' : rec.encoder + ' (carte graphique)'),
      line('Transcription', `${rec.whisper_model} sur ${rec.whisper_device === 'cuda' ? 'carte graphique' : 'processeur'}`))),
      h('p', { class: 'muted small', style: { marginTop: '10px' } }, 'Ces valeurs sont utilisées quand les réglages sont sur « Automatique ».')));

  // --- accès ---
  const access = h('div', { class: 'card' }, h('h2', null, 'Accès à l\'application'),
    h('div', { class: 'grid g2' },
      h('div', null, h('h3', null, 'Sur ce PC'), h('code', null, sys.urls.local)),
      h('div', null, h('h3', null, 'Sur ton téléphone (même Wi-Fi)'), h('code', null, sys.urls.phone))),
    h('details', { class: 'guide', style: { marginTop: '14px' } }, h('summary', null, 'Installer l\'application sur l\'écran d\'accueil du téléphone'),
      h('ol', null, h('li', null, 'Connecte le téléphone au ', h('b', null, 'même Wi-Fi'), ' que le PC et ouvre l\'adresse « téléphone » ci-dessus.'),
        h('li', null, h('b', null, 'iPhone (Safari) : '), 'bouton Partager → « Sur l\'écran d\'accueil ».'),
        h('li', null, h('b', null, 'Android (Chrome) : '), 'menu ⋮ → « Ajouter à l\'écran d\'accueil ».'),
        h('li', null, 'Si la page ne s\'ouvre pas : autorise ClipBot (Python) dans le pare-feu Windows quand il le demande, en réseau privé.'))),
    h('div', { class: 'sep' }),
    h('div', { class: 'row' }, F.toggle('Démarrer ClipBot avec le PC', sys.autostart, v => POST('/api/system/autostart', { enabled: v }).then(() => toast(v ? 'ClipBot démarrera avec le PC' : 'Démarrage automatique désactivé')).catch(oops), { help: 'Le bot se lance tout seul à l\'ouverture de session.' })),
    h('div', { class: 'muted tiny', style: { marginTop: '8px' } }, 'Clips enregistrés dans : ', h('code', null, sys.clips_dir)));

  // --- clés API ---
  const KEY_LABEL = { TWITCH_CLIENT_ID: 'Twitch — Client ID', TWITCH_CLIENT_SECRET: 'Twitch — Client Secret', ANTHROPIC_API_KEY: 'Anthropic — Clé API', TIKTOK_CLIENT_KEY: 'TikTok — Client key', TIKTOK_CLIENT_SECRET: 'TikTok — Client secret' };
  const redirect = sys.urls.local.replace(/\/$/, '') + '/api/tiktok/callback';
  const GUIDES = {
    twitch: ['Comment obtenir les clés Twitch (gratuit, 3 minutes)', [
      ['Va sur ', h('b', null, 'dev.twitch.tv/console'), ' et connecte-toi avec ton compte Twitch (la double authentification doit être activée sur ton compte).'],
      ['Clique sur ', h('b', null, 'Register Your Application'), '.'],
      ['Nom : ce que tu veux (ex. « MonClipBot »). ', h('b', null, 'OAuth Redirect URLs'), ' : ', h('code', null, 'http://localhost'), '. Catégorie : ', h('b', null, 'Application Integration'), '. Type de client : ', h('b', null, 'Confidential'), '.'],
      ['Clique sur Create, puis sur ', h('b', null, 'Manage'), ' à côté de ton application.'],
      ['Copie le ', h('b', null, 'Client ID'), ', puis clique sur ', h('b', null, 'New Secret'), ' et copie le secret. Colle les deux ci-dessus et clique sur « Tester ».']]],
    anthropic: ['Comment obtenir la clé Anthropic (payant à l\'usage)', [
      ['Va sur ', h('b', null, 'console.anthropic.com'), ' et crée un compte.'],
      ['Dans ', h('b', null, 'Billing'), ', ajoute un peu de crédit (5 à 10 $ suffisent pour commencer : un clip coûte quelques centimes).'],
      ['Dans ', h('b', null, 'API Keys'), ', clique sur ', h('b', null, 'Create Key'), ', donne-lui un nom et copie la clé (elle commence par « sk-ant- »).'],
      ['Colle-la ci-dessus et clique sur « Tester ». Le plafond de budget plus haut te protège des mauvaises surprises.']]],
    tiktok: ['Comment créer l\'application TikTok (gratuit, le plus long)', [
      ['Va sur ', h('b', null, 'developers.tiktok.com'), ', connecte-toi, puis ', h('b', null, 'Manage apps → Connect an app'), '.'],
      ['Remplis le nom, la description et l\'icône. Plateforme : ', h('b', null, 'Desktop'), '.'],
      ['Ajoute les produits ', h('b', null, 'Login Kit'), ' et ', h('b', null, 'Content Posting API'), ' (active ', h('b', null, 'Direct Post'), ').'],
      ['Dans Login Kit, ajoute cette ', h('b', null, 'Redirect URI'), ' exactement : ', h('code', null, redirect)],
      ['Dans Scopes, ajoute : ', h('code', null, 'user.info.basic'), ' ', h('code', null, 'user.info.profile'), ' ', h('code', null, 'user.info.stats'), ' ', h('code', null, 'video.list'), ' ', h('code', null, 'video.publish'), ' ', h('code', null, 'video.upload')],
      ['Dans l\'onglet ', h('b', null, 'Sandbox'), ', ajoute ton compte TikTok comme ', h('b', null, 'target user'), ' : cela permet de tester sans attendre la validation de TikTok.'],
      ['Copie le ', h('b', null, 'Client key'), ' et le ', h('b', null, 'Client secret'), ' ci-dessus, puis va dans Comptes → « Connecter un compte TikTok ».'],
      ['À savoir : tant que TikTok n\'a pas audité l\'application, les vidéos sont publiées ', h('b', null, 'uniquement en privé'), '. C\'est exactement le fonctionnement voulu ici : tu passes toi-même les clips en public.']]],
  };
  const paintKeys = st => {
    const vals = {};
    const group = (svc, keys) => h('div', { class: 'card stack', style: { gap: '12px' } },
      h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, { twitch: 'Twitch', anthropic: 'Anthropic (Claude)', tiktok: 'TikTok' }[svc]),
        keys.every(k => st[k].set) ? h('span', { class: 'badge good' }, 'Clés enregistrées') : h('span', { class: 'badge warn' }, 'À renseigner')),
      keys.map(k => F.text(KEY_LABEL[k], '', v => { vals[k] = v; }, { type: 'password', autocomplete: 'new-password', placeholder: st[k].set ? `Enregistrée (${st[k].hint}) — laisser vide pour garder` : 'Colle la clé ici' })),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: e => act(e.currentTarget, async () => { const send = {}; keys.forEach(k => { if (vals[k]) send[k] = vals[k]; }); if (!Object.keys(send).length) throw new Error('Colle d\'abord une clé dans un des champs.'); paintKeys(await PUT('/api/secrets', send)); App.refreshAccounts(); }, 'Clés enregistrées') }, 'Enregistrer'),
        h('button', { class: 'btn', onclick: e => act(e.currentTarget, () => POST('/api/secrets/test/' + svc), svc === 'tiktok' ? 'Clés TikTok présentes (la vraie vérification se fait à la connexion du compte)' : 'Les clés fonctionnent') }, 'Tester')),
      h('details', { class: 'guide' }, h('summary', null, GUIDES[svc][0]), h('ol', null, GUIDES[svc][1].map(step => h('li', null, step)))));
    clear(keysBox, h('p', { class: 'muted small' }, 'Les clés sont enregistrées dans le fichier .env sur ton PC et ne sont jamais réaffichées en entier.'),
      h('div', { class: 'grid g3' }, group('twitch', ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET']), group('anthropic', ['ANTHROPIC_API_KEY']), group('tiktok', ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'])));
  };
  paintKeys(sys.secrets);

  // --- alertes ---
  const paintAlerts = list => {
    const unread = list.filter(a => !a.read).length;
    clear(alertBox, h('div', { class: 'card' }, h('div', { class: 'row between', style: { marginBottom: '10px' } }, h('h2', { style: { margin: 0 } }, 'Alertes', unread ? h('span', { class: 'badge bad', style: { marginLeft: '10px' } }, unread + ' non lue(s)') : null),
      h('button', { class: 'btn sm', disabled: !unread, onclick: e => act(e.currentTarget, async () => { await POST('/api/alerts/read'); paintAlerts((await GET('/api/alerts')).alerts); App.pollStatus(); }) }, 'Tout marquer comme lu')),
      list.length ? h('div', { class: 'stack', style: { gap: '0', maxHeight: '300px', overflowY: 'auto' } }, list.map(a => h('div', { class: 'row nowrap', style: { padding: '9px 0', borderTop: '1px solid var(--border)', alignItems: 'flex-start', opacity: a.read ? .6 : 1 } },
        h('span', { class: 'badge ' + (a.kind === 'disk_full' || a.kind === 'error' ? 'bad' : 'warn') }, ALERT_KIND[a.kind] || a.kind), h('span', { class: 'grow small', style: { overflowWrap: 'anywhere' } }, a.msg), h('span', { class: 'muted tiny', style: { whiteSpace: 'nowrap' } }, fmt.date(a.ts))))) :
        h('p', { class: 'muted', style: { margin: 0 } }, 'Aucune alerte. Tout va bien.')));
  };
  paintAlerts(al.alerts);

  // --- journal ---
  const lf = { level: '', module: '', q: '' };
  const logList = h('div', { class: 'logs', role: 'log', 'aria-label': 'Journal' });
  const modSel = h('select', { 'aria-label': 'Module', onchange: e => { lf.module = e.target.value; paintLogs(); } }, h('option', { value: '' }, 'Tous les modules'));
  let lt;
  async function paintLogs() {
    let r; try { r = await GET('/api/logs?' + new URLSearchParams({ ...lf, limit: 300 })); } catch (e) { return; }
    if (modSel.options.length - 1 !== r.modules.length) clear(modSel, h('option', { value: '' }, 'Tous les modules'), r.modules.map(m => h('option', { value: m, selected: m === lf.module }, m)));
    clear(logList, r.logs.length ? r.logs.map(l => h('div', { class: 'log' }, h('span', { class: 'muted' }, fmt.time(l.ts)), h('span', { class: 'lv-' + l.level }, l.level), h('span', { class: 'muted mod ell' }, l.module), h('span', { class: 'm' }, l.msg))) : h('div', { class: 'muted', style: { padding: '16px' } }, 'Aucune ligne.'));
  }
  clear(logBox, h('div', { class: 'card' }, h('h2', null, 'Journal'),
    h('div', { class: 'filters' }, h('select', { 'aria-label': 'Niveau', onchange: e => { lf.level = e.target.value; paintLogs(); } }, [['', 'Tous les niveaux'], ['info', 'Info'], ['warn', 'Avertissements'], ['error', 'Erreurs']].map(([v, l]) => h('option', { value: v }, l))), modSel,
      h('input', { type: 'search', placeholder: 'Rechercher dans le journal…', 'aria-label': 'Rechercher dans le journal', oninput: e => { clearTimeout(lt); lt = setTimeout(() => { lf.q = e.target.value; paintLogs(); }, 300); } })), logList));
  paintLogs(); App.every(6000, paintLogs);

  // --- configuration, nettoyage, mot de passe ---
  const keep = draftOf({ keep_raw_hours: S.keep_raw_hours, keep_rejected_hours: S.keep_rejected_hours, disk_min_gb: S.disk_min_gb, stream_quality: S.stream_quality });
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const data = JSON.parse(await f.text()); if (!(await confirmBox('Importer cette configuration ?', 'Tes réglages actuels seront remplacés par ceux du fichier. Les clés API et les connexions TikTok ne changent pas.', 'Importer'))) return;
      const r = await POST('/api/config/import', data); await App.refreshMeta(); toast(`Configuration importée (${r.streamers} streamer(s))`); App.route(); } catch (err) { toast(err instanceof SyntaxError ? 'Ce fichier n\'est pas une configuration ClipBot valide.' : err.message, 'err'); }
    e.target.value = '';
  } });
  const pw = { old: '', new: '' };
  const misc = h('div', { class: 'grid g3' },
    h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Configuration'), h('p', { class: 'muted small', style: { margin: 0 } }, 'Sauvegarde tous tes réglages, streamers et réglages de comptes dans un fichier (sans les clés secrètes).'),
      h('div', { class: 'row' }, h('a', { class: 'btn', href: '/api/config/export', download: '' }, 'Exporter'), h('button', { class: 'btn', onclick: () => file.click() }, 'Importer…'), file)),
    h('div', { class: 'card stack' }, h('h2', { style: { margin: 0 } }, 'Nettoyage automatique'),
      F.number('Garder les extraits bruts (heures)', S.keep_raw_hours, v => keep.set('keep_raw_hours', v), { min: 1, help: 'Tant qu\'ils existent, un clip peut être re-monté.' }),
      F.number('Garder les clips rejetés (heures)', S.keep_rejected_hours, v => keep.set('keep_rejected_hours', v), { min: 0 }),
      F.number('Pause si le disque passe sous (Go libres)', S.disk_min_gb, v => keep.set('disk_min_gb', v), { min: 1 }),
      F.text('Qualité de capture des streams', S.stream_quality, v => keep.set('stream_quality', v), { help: 'Ordre de préférence streamlink. Laisse tel quel si tu ne sais pas.' }),
      h('button', { class: 'btn primary', style: { alignSelf: 'flex-start' }, onclick: e => act(e.currentTarget, async () => { const ch = keep.changes(); if (!Object.keys(ch).length) return; const r = await PUT('/api/settings', ch); App.meta.settings = r.settings; keep.commit(); }, 'Enregistré') }, 'Enregistrer')),
    h('form', { class: 'card stack', onsubmit: e => { e.preventDefault(); const form = e.currentTarget; act(form.querySelector('button'), async () => { await POST('/api/auth/password', pw); toast('Mot de passe changé : reconnecte-toi'); App.showAuth(false); }); } },
      h('h2', { style: { margin: 0 } }, 'Mot de passe'),
      F.text('Mot de passe actuel', '', v => pw.old = v, { type: 'password', autocomplete: 'current-password' }), F.text('Nouveau mot de passe', '', v => pw.new = v, { type: 'password', autocomplete: 'new-password', help: '6 caractères minimum. Tous les appareils seront déconnectés.' }),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, 'Changer'),
        h('button', { class: 'btn', type: 'button', onclick: e => act(e.currentTarget, async () => { await POST('/api/auth/logout'); App.showAuth(false); }) }, 'Se déconnecter'))));

  const sect = (t, ...k) => [h('h3', { style: { marginTop: '28px' } }, t), k];
  clear(main, pageHead('Système', 'Santé du PC, coûts, clés et journal.'), alertBox, sect('Ressources du PC', liveBox), sect('Intelligence artificielle', costCard),
    sect('Clés API', keysBox), sect('Ce PC', pcCard), sect('Accès et démarrage', access), sect('Journal', logBox), sect('Configuration et sécurité', misc));
};
