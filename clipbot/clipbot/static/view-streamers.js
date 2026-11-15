/* Écran Streamers : liste, ajout par lien, fiche, « streamers qui percent ». */
'use strict';

const ST_STATUS = [['target', 'Ciblé'], ['priority', 'Prioritaire'], ['excluded', 'Exclu']];

App.views.streamers = async function (main, parts, params) {
  if (parts[0] && parts[0] !== 'percent') return streamerDetail(main, parts[0]);
  const tab = parts[0] === 'percent' ? 'percent' : 'liste';
  const body = h('div');
  clear(main, pageHead('Streamers', 'Ceux que tu cibles sont toujours surveillés en priorité.'),
    tabs([['liste', 'Mes streamers'], ['percent', 'Streamers qui percent']], tab, k => { location.hash = k === 'percent' ? '#/streamers/percent' : '#/streamers'; }), body);
  await App.refreshAccounts();
  return tab === 'percent' ? suggestionsTab(body) : streamersTab(body);
};

async function streamersTab(body) {
  const url = h('input', { type: 'text', placeholder: 'twitch.tv/nom_du_streamer', 'aria-label': 'Lien de la chaîne Twitch', autocomplete: 'off' });
  const list = h('div');
  const addBtn = h('button', { class: 'btn primary', type: 'submit' }, icon('plus'), 'Ajouter');
  const form = h('form', { class: 'card row', style: { marginBottom: '18px' }, onsubmit: e => { e.preventDefault(); act(addBtn, async () => { const s = await POST('/api/streamers', { url: url.value }); url.value = ''; toast(`${s.display_name} ajouté`); paint(); }); } },
    h('div', { class: 'grow', style: { minWidth: '220px' } }, url), addBtn,
    h('div', { class: 'help muted small', style: { flexBasis: '100%' } }, 'Colle le lien de la chaîne : avatar, langue, abonnés et statut live sont récupérés automatiquement.'));
  clear(body, form, list);

  const card = s => {
    const save = (data, msg) => PUT('/api/streamers/' + encodeURIComponent(s.login), data).then(() => toast(msg || 'Enregistré')).catch(oops);
    const accOpts = [['', 'Automatique (selon la langue)'], ...App.accounts.map(a => [a.id, `${a.name} (${a.lang.toUpperCase()})`])];
    return h('div', { class: 'card stack', style: { gap: '12px' } },
      h('div', { class: 'row nowrap' }, avatar(s.avatar, s.display_name),
        h('div', { class: 'grow' }, h('a', { href: '#/streamers/' + encodeURIComponent(s.login), class: 'ell', style: { display: 'block', fontWeight: 700, fontSize: '16px', color: 'inherit', textDecoration: 'none' } }, s.display_name || s.login),
          h('div', { class: 'muted tiny ell' }, `${fmt.k(s.followers)} abonnés · ${s.clips} clip(s)` + (s.avg_rating ? ` · note moy. ${s.avg_rating}` : ''))),
        h('div', { class: 'stack', style: { gap: '4px', alignItems: 'flex-end' } }, s.is_live ? h('span', { class: 'badge bad' }, '● LIVE · ' + fmt.k(s.viewers)) : h('span', { class: 'badge' }, 'Hors ligne'), s.monitored ? h('span', { class: 'badge good' }, 'Surveillé') : null)),
      s.is_live && s.game ? h('div', { class: 'muted small ell' }, s.game + (s.title ? ' — ' + s.title : '')) : null,
      h('div', { class: 'form-grid', style: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 12px' } },
        F.select('Statut', s.status, ST_STATUS, v => save({ status: v }).then(() => { s.status = v; })),
        F.select('Langue', s.lang, Object.entries(LANGS), v => save({ lang: v })),
        F.select('Compte TikTok', s.account_id ?? '', accOpts, v => save({ account_id: v ? Number(v) : null })),
        F.number('Max clips / jour', s.max_clips_day, v => save({ max_clips_day: v }), { min: 0, lazy: true }),
        F.number('Seuil d\'intérêt (note IA)', s.interest_threshold, v => save({ interest_threshold: v }), { min: 1, max: 10, nullable: true, lazy: true, placeholder: `global (${App.meta.settings.ai_threshold})` }),
        h('div', { class: 'field', style: { justifyContent: 'flex-end' } }, F.toggle('Séries', s.series_enabled, v => save({ series_enabled: v ? 1 : 0 })))),
      h('div', { class: 'row' },
        h('a', { class: 'btn sm', href: '#/streamers/' + encodeURIComponent(s.login) }, 'Ouvrir la fiche'),
        h('button', { class: 'btn sm', onclick: e => act(e.currentTarget, async () => { await POST('/api/streamers/' + encodeURIComponent(s.login) + '/refresh'); paint(); }, 'Infos mises à jour') }, icon('refresh'), 'Rafraîchir'),
        h('button', { class: 'btn sm danger', style: { marginLeft: 'auto' }, 'aria-label': 'Supprimer ' + s.login, onclick: async e => { if (await confirmBox('Supprimer ce streamer ?', `${s.display_name || s.login} ne sera plus ciblé. Ses clips déjà créés sont conservés.`, 'Supprimer', true)) act(e.currentTarget, async () => { await DEL('/api/streamers/' + encodeURIComponent(s.login)); paint(); }, 'Streamer supprimé'); } }, icon('trash'))));
  };
  const autoRow = s => h('div', { class: 'card tight row nowrap' }, avatar(s.avatar, s.display_name, 'sm'),
    h('div', { class: 'grow' }, h('a', { href: '#/streamers/' + encodeURIComponent(s.login), class: 'ell', style: { display: 'block', fontWeight: 650, color: 'inherit', textDecoration: 'none' } }, s.display_name || s.login),
      h('div', { class: 'muted tiny' }, `${(s.lang || '').toUpperCase()} · ${s.is_live ? fmt.k(s.viewers) + ' viewers' : 'hors ligne'} · ${s.clips} clip(s)`)),
    s.monitored ? h('span', { class: 'badge good' }, 'Surveillé') : null,
    h('button', { class: 'btn sm primary', onclick: e => act(e.currentTarget, async () => { await PUT('/api/streamers/' + encodeURIComponent(s.login), { status: 'target' }); paint(); }, 'Streamer ciblé') }, 'Cibler'),
    h('button', { class: 'btn sm', onclick: e => act(e.currentTarget, async () => { await PUT('/api/streamers/' + encodeURIComponent(s.login), { status: 'excluded' }); paint(); }, 'Streamer exclu') }, 'Exclure'));

  async function paint() {
    let rows; try { rows = await GET('/api/streamers'); } catch (e) { return clear(list, empty('Liste indisponible', e.message)); }
    const mine = rows.filter(s => s.status !== 'auto'), auto = rows.filter(s => s.status === 'auto');
    clear(list, mine.length ? h('div', { class: 'grid gauto' }, mine.map(card)) : empty('Aucun streamer ciblé', 'Ajoute un streamer en collant son lien ci-dessus, ou regarde l\'onglet « Streamers qui percent ».'),
      auto.length ? [h('h3', { style: { marginTop: '28px' } }, `Découverts automatiquement (${auto.length})`), h('p', { class: 'muted small' }, 'Streams trouvés par le bot au-dessus de tes seuils de viewers. Cible ceux que tu veux suivre en priorité.'), h('div', { class: 'grid gauto' }, auto.map(autoRow))] : null);
  }
  await paint();
}

async function suggestionsTab(body) {
  let lang = '';
  const list = h('div'), info = h('span', { class: 'muted small' });
  const filt = h('div', { class: 'row' });
  const paintFilt = () => clear(filt, [['', 'Toutes'], ['fr', 'FR'], ['en', 'EN']].map(([k, l]) => h('button', { class: 'btn sm ' + (lang === k ? 'on' : ''), 'aria-pressed': lang === k, onclick: () => { lang = k; paintFilt(); paint(); } }, l)));
  paintFilt();
  clear(body, h('div', { class: 'row', style: { marginBottom: '14px' } }, filt, info,
    h('button', { class: 'btn sm', style: { marginLeft: 'auto' }, onclick: e => act(e.currentTarget, async () => { const r = await POST('/api/suggestions/refresh'); toast(`${r.count} suggestion(s) recalculée(s)`); paint(); }) }, icon('refresh'), 'Recalculer')), list);
  const stat = (v, l) => h('div', null, h('div', { class: 'num', style: { fontWeight: 700 } }, v), h('div', { class: 'muted tiny' }, l));
  async function paint() {
    let r; try { r = await GET('/api/suggestions' + (lang ? '?lang=' + lang : '')); } catch (e) { return clear(list, empty('Suggestions indisponibles', e.message)); }
    info.textContent = r.updated_at ? 'Dernier calcul ' + fmt.ago(r.updated_at) : '';
    if (!r.twitch_ready && !r.suggestions.length) return clear(list, empty('Clés Twitch manquantes', 'Ajoute tes clés Twitch pour recevoir des suggestions.', h('a', { class: 'btn primary', href: '#/systeme' }, 'Ouvrir Système → Clés API')));
    if (!r.suggestions.length) return clear(list, empty('Pas encore de suggestion', 'Le bot a besoin de quelques relevés Twitch (laisse-le tourner un moment), puis clique sur « Recalculer ».'));
    clear(list, h('div', { class: 'grid gauto' }, r.suggestions.map(s => { const d = s.details || {}; return h('div', { class: 'card stack', style: { gap: '12px' } },
      h('div', { class: 'row nowrap' }, avatar(s.avatar, s.display_name || s.login),
        h('div', { class: 'grow' }, h('a', { href: 'https://www.twitch.tv/' + encodeURIComponent(s.login), target: '_blank', rel: 'noopener noreferrer', class: 'ell', style: { display: 'block', fontWeight: 700, color: 'inherit' } }, s.display_name || s.login),
          h('div', { class: 'muted tiny' }, `${(s.lang || '').toUpperCase()} · ${fmt.n(s.viewers)} viewers`)),
        h('div', { style: { textAlign: 'right' } }, h('div', { class: 'num', style: { fontSize: '22px', fontWeight: 700, color: 'var(--accent2)' } }, Math.round(s.score)), h('div', { class: 'muted tiny' }, 'score'))),
      h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' } },
        stat((d.growth_pct > 0 ? '+' : '') + (d.growth_pct ?? 0) + ' %', 'croissance'), stat((d.days_live_7d ?? 0) + ' j/7', 'régularité'),
        stat(d.chat_per_min ?? 0, 'chat/min'), stat(d.viewer_clips_24h ?? 0, 'clips 24 h')),
      d.moments_7d ? h('div', { class: 'muted tiny' }, `${d.moments_7d} moment(s) détecté(s), score moyen ${d.avg_moment_score}` + (d.avg_rating ? `, note IA moyenne ${d.avg_rating}` : '')) : null,
      h('p', { class: 'small', style: { margin: 0 } }, s.ai_reason),
      h('div', { class: 'row' }, h('button', { class: 'btn sm primary grow', onclick: e => act(e.currentTarget, async () => { await POST('/api/suggestions/' + encodeURIComponent(s.login), { action: 'target' }); paint(); }, `${s.display_name || s.login} est maintenant ciblé`) }, 'Cibler'),
        h('button', { class: 'btn sm grow', onclick: e => act(e.currentTarget, async () => { await POST('/api/suggestions/' + encodeURIComponent(s.login), { action: 'ignore' }); paint(); }) }, 'Ignorer'))); })));
  }
  await paint();
}

async function streamerDetail(main, login) {
  const r = await GET('/api/streamers/' + encodeURIComponent(login));
  const s = r.streamer, m = r.memory || {}, p = r.performance || {};
  const fc = r.facecam;
  clear(main,
    h('a', { class: 'btn sm ghost', href: '#/streamers', style: { marginBottom: '12px' } }, icon('back'), 'Tous les streamers'),
    h('div', { class: 'card row', style: { marginBottom: '14px' } }, avatar(s.avatar, s.display_name, 'lg'),
      h('div', { class: 'grow' }, h('h1', null, s.display_name || s.login),
        h('div', { class: 'muted' }, `${LANGS[s.lang] || s.lang} · ${fmt.k(s.followers)} abonnés · ${r.viewer_clips_24h} clip(s) viewers en 24 h`),
        h('div', { class: 'row', style: { marginTop: '8px' } }, s.is_live ? h('span', { class: 'badge bad' }, '● LIVE · ' + fmt.k(s.viewers) + ' viewers') : h('span', { class: 'badge' }, 'Hors ligne'),
          h('span', { class: 'badge accent' }, { target: 'Ciblé', priority: 'Prioritaire', excluded: 'Exclu', auto: 'Découvert automatiquement' }[s.status] || s.status),
          r.monitored ? h('span', { class: 'badge good' }, 'Surveillé en ce moment') : null, s.game ? h('span', { class: 'badge' }, s.game) : null)),
      h('a', { class: 'btn', href: 'https://www.twitch.tv/' + encodeURIComponent(s.login), target: '_blank', rel: 'noopener noreferrer' }, icon('ext'), 'Voir sur Twitch')),
    h('div', { class: 'grid g2' },
      h('div', { class: 'card' }, h('h2', null, 'Son aventure (résumé IA)'),
        m.summary || m.character ? h('div', { class: 'stack', style: { gap: '10px' } },
          m.summary ? h('p', null, m.summary) : null,
          m.character ? h('div', null, h('h3', null, 'Personnage'), h('div', null, m.character)) : null,
          m.goals ? h('div', null, h('h3', null, 'Objectifs en cours'), h('div', null, m.goals)) : null,
          (m.events || []).length ? h('div', null, h('h3', null, 'Événements marquants'), h('ul', { style: { margin: 0, paddingLeft: '20px' } }, m.events.slice().reverse().map(e => h('li', null, e)))) : null)
          : empty('Pas encore de mémoire', 'L\'IA écrit ici le résumé de l\'aventure du streamer au fil des clips.')),
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('h2', null, 'Performances TikTok de ses clips'),
          p.videos ? [h('div', { class: 'row', style: { gap: '26px', marginBottom: '12px' } }, kpi(fmt.k(p.views), 'vues'), kpi(fmt.k(p.likes), 'likes'), kpi(fmt.k(p.comments), 'commentaires'), kpi(fmt.k(p.shares), 'partages'), kpi(p.videos, 'vidéos')),
            (p.top || []).map(v => h('div', { class: 'row between small', style: { padding: '6px 0', borderTop: '1px solid var(--border)' } }, h('span', { class: 'grow ell' }, v.title || 'Vidéo'), h('span', { class: 'num muted' }, fmt.k(v.views) + ' vues')))]
            : empty('Pas encore de données', 'Les stats arrivent quand ses clips sont publiés et visibles.')),
        h('div', { class: 'card' }, h('h2', null, 'Facecam'),
          fc ? h('div', { class: 'row' }, h('div', { style: { width: '160px', aspectRatio: '16/9', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', position: 'relative', flex: 'none' } },
            h('div', { style: { position: 'absolute', left: fc.x * 100 + '%', top: fc.y * 100 + '%', width: fc.w * 100 + '%', height: fc.h * 100 + '%', border: '2px solid var(--accent2)', background: 'rgba(139,92,246,.25)', borderRadius: '3px' } })),
            h('div', { class: 'muted small grow' }, 'Facecam détectée : le montage la place en haut et le gameplay en bas.'))
            : h('div', { class: 'muted small' }, 'Aucune facecam détectée pour l\'instant : le montage utilise le gameplay recadré sur fond flou.')))),
    r.series.length ? [h('h3', { style: { marginTop: '24px' } }, 'Séries en cours'), h('div', { class: 'stack' }, r.series.map(seriesCard))] : null,
    h('h3', { style: { marginTop: '24px' } }, `Historique des clips (${r.clips.length})`),
    r.clips.length ? h('div', { class: 'card', style: { padding: '6px 8px' } }, h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Clip', 'Statut', 'Catégorie', 'Note', 'Durée', 'Date'].map((t, i) => h('th', { class: i > 2 ? 'r' : '' }, t)))),
      h('tbody', null, r.clips.map(c => h('tr', { style: { cursor: 'pointer' }, onclick: () => openClip(c.id) },
        h('td', null, h('b', null, c.title || 'Sans titre'), c.series_id ? h('span', { class: 'badge accent', style: { marginLeft: '8px' } }, 'Ép. ' + c.episode) : null),
        h('td', null, statusBadge(c.status)), h('td', null, CATS[c.category] || '–'), h('td', { class: 'r' }, c.rating ?? '–'), h('td', { class: 'r' }, fmt.dur(c.duration)), h('td', { class: 'r muted' }, fmt.date(c.created_at)))))))) :
      empty('Aucun clip pour ce streamer', 'Les clips apparaîtront ici dès qu\'un moment fort sera détecté.'));
}
