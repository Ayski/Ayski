/* Écran Clips : galerie, lecteur + édition, séries, calibrage. */
'use strict';

App.views.clips = async function (main, parts) {
  const tab = ['series', 'calibrage'].includes(parts[0]) ? parts[0] : 'galerie';
  const body = h('div');
  clear(main, pageHead('Clips', 'Tout ce que le bot a produit. Note les clips avec 👍 / 👎 pour l\'aider à s\'améliorer.'),
    tabs([['galerie', 'Galerie'], ['series', 'Séries'], ['calibrage', 'Calibrage']], tab, k => { location.hash = k === 'galerie' ? '#/clips' : '#/clips/' + k; }), body);
  await App.refreshAccounts();
  if (tab === 'series') return seriesTab(body);
  if (tab === 'calibrage') return calibTab(body);
  return galleryTab(body);
};

function clipThumb(c, opts = {}) {
  const st = STATUS[c.status] || [c.status, ''];
  const working = STEP[c.status];
  const t = h('div', { class: 'thumb' }, working ? h('div', { style: { textAlign: 'center' } }, h('span', { class: 'spin' }), h('div', { class: 'tiny', style: { marginTop: '8px' } }, working)) : null,
    h('div', { class: 'tl' }, h('span', { class: 'badge ' + st[1] }, st[0]), c.episode ? h('span', { class: 'badge accent' }, 'Ép. ' + c.episode) : null),
    c.rating != null ? h('div', { class: 'br' }, h('span', { class: 'badge' }, '★ ' + c.rating)) : null,
    c.feedback ? h('div', { class: 'bl' }, h('span', { class: 'badge' }, c.feedback > 0 ? '👍' : '👎')) : null);
  if (!working && !opts.noImage) t.style.backgroundImage = `url("/media/thumb/${Number(c.id)}?v=${Math.round(c.updated_at || c.created_at || 0)}")`;
  return t;
}

async function galleryTab(body) {
  const f = { streamer: '', account: 0, status: '', category: '', min_rating: 0, q: '', rejected: 0, limit: 60 };
  const grid = h('div'), count = h('span', { class: 'muted small' });
  const streamerSel = h('select', { 'aria-label': 'Streamer', onchange: e => { f.streamer = e.target.value; paint(); } }, h('option', { value: '' }, 'Tous les streamers'));
  let qTimer;
  const filters = h('div', { class: 'filters' },
    h('input', { type: 'search', placeholder: 'Rechercher…', 'aria-label': 'Rechercher', oninput: e => { clearTimeout(qTimer); qTimer = setTimeout(() => { f.q = e.target.value; paint(); }, 300); } }),
    streamerSel,
    h('select', { 'aria-label': 'Compte', onchange: e => { f.account = Number(e.target.value); paint(); } }, h('option', { value: 0 }, 'Tous les comptes'), App.accounts.map(a => h('option', { value: a.id }, a.name))),
    h('select', { 'aria-label': 'Statut', onchange: e => { f.status = e.target.value; paint(); } }, [['', 'Tous les statuts'], ['en_montage', 'En montage'], ['ready', 'Prêt'], ['queued', 'En file d\'attente'], ['uploading', 'Envoi…'], ['uploaded_private', 'Uploadé en privé'], ['published', 'Publié'], ['rejected', 'Rejeté'], ['failed', 'Échec']].map(([v, l]) => h('option', { value: v }, l))),
    h('select', { 'aria-label': 'Catégorie', onchange: e => { f.category = e.target.value; paint(); } }, h('option', { value: '' }, 'Toutes les catégories'), Object.entries(CATS).map(([v, l]) => h('option', { value: v }, l))),
    h('select', { 'aria-label': 'Note minimale', onchange: e => { f.min_rating = Number(e.target.value); paint(); } }, h('option', { value: 0 }, 'Toutes les notes'), [5, 6, 7, 8, 9].map(n => h('option', { value: n }, `Note ≥ ${n}`))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: e => { f.rejected = e.target.checked ? 1 : 0; paint(); } }), 'Afficher les rejetés'));
  const more = h('div', { style: { textAlign: 'center', marginTop: '18px' } });
  clear(body, filters, h('div', { style: { marginBottom: '10px' } }, count), grid, more);
  let known = '';
  async function paint(silent) {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    let r; try { r = await GET('/api/clips?' + qs); } catch (e) { if (!silent) clear(grid, empty('Clips indisponibles', e.message)); return; }
    const sig = JSON.stringify(r.clips.map(c => [c.id, c.status, c.title, c.rating, c.feedback])) + r.total;
    if (silent && sig === known) return;
    known = sig;
    if (streamerSel.options.length - 1 !== r.streamers.length) { const cur = f.streamer; clear(streamerSel, h('option', { value: '' }, 'Tous les streamers'), r.streamers.map(s => h('option', { value: s, selected: s === cur }, s))); }
    count.textContent = `${r.total} clip(s)`;
    if (!r.clips.length) return clear(grid, empty('Aucun clip ici', 'Dès qu\'un moment fort est détecté, le clip apparaît dans cette galerie.')), clear(more);
    clear(grid, h('div', { class: 'clip-grid' }, r.clips.map(c => h('button', { class: 'clip', onclick: () => openClip(c.id, () => paint(true)) }, clipThumb(c),
      h('div', { class: 'meta' }, h('b', null, c.title || (STEP[c.status] ? 'Clip en préparation…' : 'Sans titre')),
        h('span', { class: 'muted tiny ell' }, `${c.streamer} · ${fmt.dur(c.duration)}${c.category ? ' · ' + (CATS[c.category] || c.category) : ''}`),
        h('span', { class: 'muted tiny' }, fmt.date(c.created_at)))))));
    clear(more, r.total > r.clips.length ? h('button', { class: 'btn', onclick: () => { f.limit += 60; paint(); } }, 'Afficher plus') : null);
  }
  await paint();
  App.every(7000, () => paint(true));
}

async function openClip(id, onChange) {
  const box = h('div', null, loading());
  let changed = false;
  const m = modal(box, { onClose: () => { if (changed && onChange) onChange(); } });
  const reasons = App.meta.reasons || {};
  async function load() {
    let c; try { c = await GET('/api/clips/' + id); } catch (e) { return clear(box, empty('Clip introuvable', e.message)); }
    const a = c.ai || {}, sig = c.signals || {};
    const hasVideo = ['ready', 'queued', 'uploading', 'uploaded_private', 'published'].includes(c.status) || (c.status === 'failed' && c.final_path);
    const saveBtn = h('button', { class: 'btn primary', disabled: true }, 'Enregistrer');
    const d = draftOf({ title: c.title || '', hook: c.hook || '', description: c.description || '', hashtags: (c.hashtags || []).join(' '), account_id: c.account_id || '' }, dirty => { saveBtn.disabled = !dirty; });
    const reeditHint = h('div');
    saveBtn.onclick = () => act(saveBtn, async () => {
      const ch = d.changes(); const payload = {};
      for (const k of ['title', 'hook', 'description']) if (k in ch) payload[k] = ch[k];
      if ('hashtags' in ch) payload.hashtags = ch.hashtags.split(/[\s,#]+/).filter(Boolean);
      if ('account_id' in ch) payload.account_id = ch.account_id ? Number(ch.account_id) : null;
      const r = await PUT('/api/clips/' + id, payload); changed = true; toast('Clip enregistré');
      await load();
      if (r.needs_reedit) clear(box.querySelector('#reedit-hint') || reeditHint, h('div', { class: 'banner info', style: { margin: '10px 0 0' } }, h('span', { class: 'grow' }, 'Le titre ou le hook est incrusté dans la vidéo : re-monte le clip pour l\'appliquer.'),
        h('button', { class: 'btn sm primary', onclick: e => doAction(e.currentTarget, 'reedit', 'Re-montage lancé') }, 'Re-monter')));
    });
    const doAction = (btn, action, msg, bodyData) => act(btn, async () => { await POST(`/api/clips/${id}/${action}`, bodyData); changed = true; await load(); }, msg);
    let reason = c.feedback < 0 ? (c.feedback_reason || '') : '';
    const fb = v => e => act(e.currentTarget, async () => {
      const nv = c.feedback === v ? 0 : v;
      const r = await POST(`/api/clips/${id}/feedback`, { value: nv, reason: nv < 0 ? reason : '' }); changed = true;
      const ks = Object.keys(r.changes || {}).filter(k => k !== 'weights');
      toast(nv === 0 ? 'Avis retiré' : 'Merci ! Le bot ajuste ses réglages' + (ks.length ? ` (${ks.length} seuil(s) modifié(s))` : ''));
      await load();
    });
    const accOpts = [['', 'Aucun compte'], ...App.accounts.map(x => [x.id, `${x.name} (${x.lang.toUpperCase()})${x.connected ? '' : ' — déconnecté'}`])];
    clear(box, h('div', { class: 'clip-detail' },
      h('div', { class: 'stack', style: { gap: '10px' } },
        hasVideo ? h('video', { src: `/media/clip/${id}?v=${Math.round(c.updated_at || 0)}`, controls: true, playsinline: true, loop: true, preload: 'metadata', poster: `/media/thumb/${id}?v=${Math.round(c.updated_at || 0)}` }) : clipThumb(c, { noImage: true }),
        hasVideo ? h('a', { class: 'btn sm', href: `/media/clip/${id}?download=1` }, 'Télécharger la vidéo') : null,
        h('div', { class: 'card tight', style: { background: 'var(--bg)' } }, h('h3', null, 'Ton avis (calibrage)'),
          h('div', { class: 'thumbs' }, h('button', { class: 'btn ' + (c.feedback > 0 ? 'good' : ''), 'aria-label': 'Bon clip', 'aria-pressed': c.feedback > 0, onclick: fb(1) }, '👍'),
            h('button', { class: 'btn ' + (c.feedback < 0 ? 'danger' : ''), 'aria-label': 'Mauvais clip', 'aria-pressed': c.feedback < 0, onclick: fb(-1) }, '👎'),
            h('select', { class: 'grow', 'aria-label': 'Raison (facultatif)', onchange: e => { reason = e.target.value; } }, h('option', { value: '' }, 'Raison du 👎 (facultatif)'), Object.entries(reasons).map(([k, l]) => h('option', { value: k, selected: k === reason }, l)))),
          h('div', { class: 'help muted tiny', style: { marginTop: '6px' } }, 'Choisis d\'abord la raison, puis clique sur 👎.'))),
      h('div', { class: 'stack', style: { minWidth: 0 } },
        h('div', { class: 'row', style: { paddingRight: '44px' } }, statusBadge(c.status), c.category ? h('span', { class: 'badge' }, CATS[c.category] || c.category) : null,
          c.rating != null ? h('span', { class: 'badge accent' }, `Note IA ${c.rating}/10`) : null, c.series ? h('span', { class: 'badge accent' }, `${c.series.title} — Ép. ${c.episode}`) : null,
          c.parent_id ? h('span', { class: 'badge info' }, 'Version traduite') : null,
          h('a', { class: 'muted small', href: '#/streamers/' + encodeURIComponent(c.streamer), onclick: () => m.close() }, c.streamer), h('span', { class: 'muted small' }, fmt.date(c.created_at) + ' · ' + fmt.dur(c.duration))),
        c.error ? h('div', { class: 'banner ' + (c.status === 'rejected' ? '' : 'bad'), style: { margin: 0 } }, h('span', null, h('b', null, c.status === 'rejected' ? 'Rejeté : ' : 'Problème : '), c.error)) : null,
        a.description ? h('div', null, h('h3', null, 'Ce que l\'IA a vu'), h('p', { style: { margin: 0 } }, a.description)) : null,
        h('div', { class: 'form-grid' }, F.text('Titre (incrusté dans la vidéo)', c.title, v => d.set('title', v)), F.text('Hook (1re seconde)', c.hook, v => d.set('hook', v))),
        F.textarea('Description TikTok', c.description, v => d.set('description', v), { rows: 4, help: 'Le crédit « 🎥 twitch.tv/… » est obligatoire : il est remis automatiquement s\'il manque.' }),
        h('div', { class: 'form-grid' }, F.text('Hashtags (6 maximum)', (c.hashtags || []).join(' '), v => d.set('hashtags', v), { placeholder: 'gta gaming fyp' }),
          F.select('Compte TikTok de destination', c.account_id ?? '', accOpts, v => d.set('account_id', v))),
        h('div', { id: 'reedit-hint' }),
        h('div', { class: 'row' }, saveBtn,
          h('button', { class: 'btn', disabled: !c.can_reedit, title: c.can_reedit ? '' : 'L\'extrait brut a été nettoyé', onclick: e => doAction(e.currentTarget, 'regenerate', 'Nouvelle analyse IA lancée') }, 'Re-générer avec l\'IA'),
          h('button', { class: 'btn', disabled: !c.can_reedit, title: c.can_reedit ? '' : 'L\'extrait brut a été nettoyé', onclick: e => doAction(e.currentTarget, 'reedit', 'Re-montage lancé') }, 'Re-monter'),
          h('button', { class: 'btn', disabled: !['ready', 'queued', 'failed'].includes(c.status) || !c.final_path, onclick: async e => { const btn = e.currentTarget; if (await confirmBox('Forcer l\'upload ?', 'Le clip part sur TikTok dès que possible, même en mode test ou si le quota du jour est atteint.', 'Envoyer sur TikTok')) doAction(btn, 'upload', 'Clip placé en tête de file', { account_id: d.get('account_id') ? Number(d.get('account_id')) : null }); } }, 'Forcer l\'upload'),
          h('button', { class: 'btn danger', style: { marginLeft: 'auto' }, onclick: async e => { const btn = e.currentTarget; if (await confirmBox('Supprimer ce clip ?', 'La vidéo et sa description sont supprimées du PC. Impossible d\'annuler.', 'Supprimer', true)) act(btn, async () => { await DEL('/api/clips/' + id); changed = true; m.close(); }, 'Clip supprimé'); } }, icon('trash'), 'Supprimer')),
        !c.can_reedit && hasVideo ? h('div', { class: 'muted tiny' }, 'L\'extrait brut a été nettoyé automatiquement : ce clip ne peut plus être re-monté ni re-analysé.') : null,
        h('div', { class: 'sep', style: { margin: '4px 0' } }),
        h('div', { class: 'grid g2' },
          h('div', null, h('h3', null, `Signaux de détection — score ${Math.round((c.score || 0) * 100)}`),
            h('div', { class: 'stack', style: { gap: '7px' } }, Object.entries(SIGNALS).map(([k, l]) => h('div', { class: 'sig' }, h('span', { class: 'muted' }, l), h('div', { class: 'bar' }, h('i', { style: { width: Math.round((sig[k] || 0) * 100) + '%' } })), h('span', { class: 'num', style: { textAlign: 'right' } }, Math.round((sig[k] || 0) * 100)))))),
          h('div', null, h('h3', null, 'Transcription'), h('div', { class: 'pre' }, c.transcript_text || '(aucune parole détectée)'))),
        c.tiktok ? h('div', { class: 'row', style: { gap: '24px' } }, kpi(fmt.k(c.tiktok.views), 'vues'), kpi(fmt.k(c.tiktok.likes), 'likes'), kpi(fmt.k(c.tiktok.comments), 'commentaires'), kpi(fmt.k(c.tiktok.shares), 'partages')) : null,
        c.chat_summary ? h('details', { class: 'guide' }, h('summary', null, 'Réactions du chat'), h('div', { class: 'pre', style: { margin: '0 12px 12px' } }, c.chat_summary)) : null)));
  }
  await load();
}

function seriesCard(s, onChange) {
  return h('div', { class: 'card' },
    h('div', { class: 'row', style: { marginBottom: '10px' } }, h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700, fontSize: '16px' } }, s.title), h('div', { class: 'muted tiny' }, `${s.streamer} · #${s.hashtag} · ${s.episodes.length} épisode(s)`)),
      h('span', { class: 'badge ' + (s.status === 'open' ? 'good' : '') }, s.status === 'open' ? 'En cours' : 'Terminée')),
    s.summary ? h('p', { class: 'muted small' }, s.summary) : null,
    h('div', { class: 'episodes' }, s.episodes.map(e => h('button', { class: 'episode', onclick: () => openClip(e.id, onChange) }, clipThumb(e),
      h('div', { class: 'small', style: { fontWeight: 650, marginTop: '6px' } }, `Ép. ${e.episode}` + (e.parent_id ? ` (${(e.target_lang || '').toUpperCase()})` : '')), h('div', { class: 'muted tiny ell' }, e.title || '…')))),
    h('div', { class: 'muted small', style: { marginTop: '10px' } }, h('b', { style: { color: 'var(--text)' } }, 'Ordre conseillé : '), s.episodes.filter(e => !e.parent_id).map(e => 'Ép. ' + e.episode).join(' → '),
      (s.best_hours || []).length ? ` · Meilleurs horaires (${(s.lang || '').toUpperCase()}) : ${s.best_hours.map(x => x + ' h').join(', ')}` : ''),
    h('div', { class: 'muted tiny', style: { marginTop: '4px' } }, s.advice));
}

async function seriesTab(body) {
  async function paint() {
    let r; try { r = await GET('/api/series'); } catch (e) { return clear(body, empty('Séries indisponibles', e.message)); }
    const bh = r.best_hours || {};
    clear(body, h('div', { class: 'card tight row', style: { marginBottom: '14px' } }, h('b', null, 'Meilleurs horaires de publication'),
      Object.entries(bh).map(([l, hs]) => h('span', { class: 'badge' }, `${l.toUpperCase()} : ${hs.map(x => x + ' h').join(', ')}`))),
      r.series.length ? h('div', { class: 'stack' }, r.series.map(s => seriesCard(s, paint))) : empty('Aucune série pour l\'instant', 'Quand l\'IA repère une histoire qui continue (poursuite, mission, intrigue RP…), elle regroupe les clips en épisodes « L\'aventure de [streamer] ».'));
  }
  await paint();
}

async function calibTab(body) {
  async function paint() {
    let r; try { r = await GET('/api/calibration'); } catch (e) { return clear(body, empty('Calibrage indisponible', e.message)); }
    const maxR = Math.max(1, ...r.reasons.map(x => x.n));
    const lr = App.meta.settings.calibration_lr;
    clear(body,
      h('div', { class: 'grid g4', style: { marginBottom: '14px' } },
        h('div', { class: 'card tight' }, kpi(r.approval == null ? '–' : r.approval + ' %', 'de clips approuvés')), h('div', { class: 'card tight' }, kpi(r.total, 'avis donnés')),
        h('div', { class: 'card tight' }, kpi(`${r.likes} 👍`, 'clips aimés')), h('div', { class: 'card tight' }, kpi(`${r.dislikes} 👎`, 'clips refusés'))),
      r.total ? null : h('div', { class: 'banner info' }, 'Aucun avis pour l\'instant : ouvre des clips dans la galerie et clique sur 👍 ou 👎.'),
      h('div', { class: 'grid g2' },
        h('div', { class: 'card' }, h('h2', null, 'Conseils'), r.advice.length ? h('ul', { style: { margin: 0, paddingLeft: '20px' } }, r.advice.map(a => h('li', { style: { margin: '6px 0' } }, a))) : h('p', { class: 'muted' }, 'Rien à signaler.'),
          h('div', { class: 'sep' }), h('div', { class: 'row', style: { gap: '26px' } }, kpi(r.detect_threshold.toFixed(2).replace('.', ','), 'seuil de détection actuel'), kpi(r.ai_threshold + ' / 10', 'seuil de note IA actuel'))),
        h('div', { class: 'card' }, h('h2', null, 'Pourquoi tu refuses des clips'),
          r.reasons.length ? h('div', { class: 'stack', style: { gap: '8px' } }, r.reasons.map(x => h('div', { class: 'sig', style: { gridTemplateColumns: '140px 1fr 30px' } }, h('span', null, x.label), h('div', { class: 'bar' }, h('i', { style: { width: (100 * x.n / maxR) + '%' } })), h('span', { class: 'num', style: { textAlign: 'right' } }, x.n)))) : empty('Pas encore de données', 'Les raisons de tes 👎 apparaîtront ici.'))),
      h('div', { class: 'card', style: { marginTop: '14px' } }, h('h2', null, 'Signaux de détection'), h('p', { class: 'muted small' }, 'Valeur moyenne de chaque signal sur les clips aimés et refusés, et poids utilisé par le bot (de départ → actuel).'),
        h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, ['Signal', 'Clips aimés', 'Clips refusés', 'Poids de départ', 'Poids actuel'].map((x, i) => h('th', { class: i ? 'r' : '' }, x)))),
          h('tbody', null, r.signals.map(s => { const diff = (s.weight ?? 0) - (s.initial ?? 0); return h('tr', null, h('td', null, SIGNALS[s.signal] || s.signal), h('td', { class: 'r' }, Math.round(s.liked * 100)), h('td', { class: 'r' }, Math.round(s.disliked * 100)),
            h('td', { class: 'r muted' }, (s.initial ?? 0).toFixed(2)), h('td', { class: 'r' }, h('b', null, (s.weight ?? 0).toFixed(2)), Math.abs(diff) >= 0.005 ? h('span', { class: 'badge ' + (diff > 0 ? 'good' : 'warn'), style: { marginLeft: '8px' } }, (diff > 0 ? '▲ +' : '▼ ') + diff.toFixed(2)) : null)); }))))),
      h('div', { class: 'card', style: { marginTop: '14px' } }, h('h2', null, 'Réglages du calibrage'),
        h('div', { class: 'form-grid' }, F.range('Vitesse d\'apprentissage', lr, v => { clearTimeout(calibTab.t); calibTab.t = setTimeout(() => PUT('/api/settings', { calibration_lr: v }).then(x => { App.meta.settings = x.settings; toast('Enregistré'); }).catch(oops), 500); }, { min: 0.01, max: 0.3, fmt: v => v.toFixed(2), help: 'Plus haut = chaque avis change davantage les poids.' }),
          h('div', { class: 'field' }, h('span', { class: 'lab' }, 'Repartir de zéro'), h('button', { class: 'btn danger', style: { alignSelf: 'flex-start' }, onclick: async e => { const btn = e.currentTarget; if (await confirmBox('Réinitialiser le calibrage ?', 'Les poids, seuils et durées reviennent aux valeurs de départ. Tes avis restent enregistrés.', 'Réinitialiser', true)) act(btn, async () => { await POST('/api/calibration/reset'); await App.refreshMeta(); paint(); }, 'Calibrage réinitialisé'); } }, 'Réinitialiser les poids'),
            h('div', { class: 'help' }, 'Remet les poids et seuils de détection par défaut.')))));
  }
  await paint();
}
