/* Écran Comptes TikTok : connexion, réglages par compte (avec aperçu du style), statistiques. */
'use strict';

const PRIVACY = [['SELF_ONLY', 'Privé — moi uniquement (conseillé)'], ['INBOX', 'Brouillon — je publie moi-même depuis l\'appli TikTok'], ['MUTUAL_FOLLOW_FRIENDS', 'Amis'], ['FOLLOWER_OF_CREATOR', 'Abonnés'], ['PUBLIC_TO_EVERYONE', 'Public']];
const POS = [['top', 'Haut'], ['middle', 'Milieu'], ['bottom', 'Bas']];
const FONT_CSS = { 'Anton': 'Impact, "Arial Narrow Bold", sans-serif', 'Poppins ExtraBold': 'system-ui, sans-serif', 'Bangers': '"Comic Sans MS", Impact, sans-serif', 'Bebas Neue': 'Impact, "Arial Narrow", sans-serif' };

App.views.comptes = async function (main, parts, params) {
  const tab = parts[0] === 'stats' ? 'stats' : 'comptes';
  const body = h('div');
  const msg = params.get('ok') ? h('div', { class: 'banner good' }, 'Compte TikTok connecté. Vérifie sa langue et ses réglages ci-dessous.')
    : params.get('erreur') ? h('div', { class: 'banner bad' }, h('span', null, h('b', null, 'Connexion TikTok impossible : '), params.get('erreur'))) : null;
  clear(main, pageHead('Comptes TikTok', 'Clips français → compte français, clips anglais → compte anglais.'), msg,
    tabs([['comptes', 'Comptes et réglages'], ['stats', 'Statistiques']], tab, k => { location.hash = k === 'stats' ? '#/comptes/stats' : '#/comptes'; }), body);
  await App.refreshAccounts();
  return tab === 'stats' ? statsTab(body) : accountsTab(body);
};

async function accountsTab(body) {
  const manual = h('input', { type: 'url', placeholder: 'http://localhost:8080/callback/?code=…&state=…', 'aria-label': 'Adresse de retour TikTok' });
  const connect = h('div', { class: 'card stack', style: { marginBottom: '18px', gap: '12px' } },
    !App.tiktokReady ? h('div', { class: 'banner info', style: { margin: 0 } }, h('span', null, 'Avant de connecter un compte, ajoute les clés de ton application TikTok. ', h('a', { href: '#/systeme' }, 'Ouvrir Système → Clés API (guide pas à pas)'))) : null,
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', disabled: !App.tiktokReady, onclick: e => act(e.currentTarget, async () => { const r = await GET('/api/tiktok/connect'); location.href = r.url; }) }, icon('plus'), 'Connecter un compte TikTok'),
      h('span', { class: 'muted small grow', style: { minWidth: '200px' } }, 'TikTok s\'ouvre, tu autorises l\'application, puis tu reviens ici. À faire sur le PC où tourne le bot.')),
    h('details', { class: 'guide' }, h('summary', null, 'La page de retour ne s\'ouvre pas ? (connexion depuis le téléphone)'),
      h('div', { class: 'stack', style: { padding: '4px 14px 14px', gap: '10px' } },
        h('p', { class: 'muted small', style: { margin: 0 } }, 'Après avoir autorisé, copie l\'adresse complète affichée dans la barre du navigateur (elle contient « code= ») et colle-la ici.'),
        h('div', { class: 'row' }, h('div', { class: 'grow', style: { minWidth: '200px' } }, manual),
          h('button', { class: 'btn', onclick: e => act(e.currentTarget, async () => { await POST('/api/tiktok/manual', { url: manual.value }); manual.value = ''; paint(); }, 'Compte connecté') }, 'Valider')))));
  const list = h('div', { class: 'stack' });
  clear(body, connect, list);
  async function paint() {
    await App.refreshAccounts();
    clear(list, App.accounts.length ? App.accounts.map(a => accountCard(a, paint)) :
      empty('Aucun compte connecté', 'Tu peux n\'en connecter qu\'un au début. En mode test, les clips restent de toute façon sur ton PC.'));
  }
  await paint();
}

function accountCard(a, repaint) {
  const meta = App.meta;
  const saveBtn = h('button', { class: 'btn primary', disabled: true }, 'Enregistrer');
  const d = draftOf({ name: a.name, lang: a.lang, is_test: !!a.is_test, settings: a.settings }, dirty => { saveBtn.disabled = !dirty; paintPreview(); paintWarn(); });
  saveBtn.onclick = () => act(saveBtn, async () => { await PUT('/api/accounts/' + a.id, d.changes()); d.commit(); App.refreshAccounts(); }, 'Compte enregistré');
  const S = a.settings;
  const set = k => v => d.set('settings.' + k, v);
  const phone = h('div', { class: 'phone', 'aria-hidden': 'true' });
  const warn = h('div');
  function paintPreview() {
    const s = d.get('settings.sub_style'), t = d.get('settings.title_style');
    const y = { top: 29, middle: 61.5, bottom: 77 }[s.position] || 61.5, ty = { top: 17.2, middle: 39.6, bottom: 71.9 }[t.position] || 17.2;
    const words = ['NO', 'WAY', 'BRO'].map(w => s.uppercase ? w : w.charAt(0) + w.slice(1).toLowerCase());
    const stroke = `-1px -1px 0 ${s.outline}, 1px -1px 0 ${s.outline}, -1px 1px 0 ${s.outline}, 1px 1px 0 ${s.outline}, 0 2px 3px rgba(0,0,0,.6)`;
    clear(phone, h('div', { class: 'cam' }, 'facecam'), h('div', { class: 'game' }, 'gameplay'), h('div', { class: 'p-credit' }, 'twitch.tv/streamer'),
      h('div', { class: 'p-title', style: { top: ty + '%', color: t.color, background: t.box, fontSize: (t.size / 10.8) + 'cqw', fontFamily: FONT_CSS[t.font] } }, 'Le titre du clip'),
      h('div', { class: 'p-sub', style: { top: y + '%', color: s.color, fontSize: (s.size / 10.8) + 'cqw', fontFamily: FONT_CSS[s.font], textShadow: stroke } },
        words[0] + ' ', h('span', { style: { color: s.highlight } }, words[1]), ' ' + words[2]));
  }
  function paintWarn() {
    const p = d.get('settings.privacy');
    clear(warn, p !== 'SELF_ONLY' ? h('div', { class: 'banner bad', style: { margin: '12px 0 0' } }, h('span', null, h('b', null, 'Attention : '), 'avec ce réglage, les clips sont visibles par d\'autres personnes dès l\'upload, sans validation de ta part. Le réglage conseillé est « Privé ».')) : null);
  }
  paintPreview(); paintWarn();
  const fonts = meta.fonts.map(f => [f, f]);
  return h('div', { class: 'card' },
    h('div', { class: 'row' }, avatar(a.avatar, a.name),
      h('div', { class: 'grow' }, h('div', { style: { fontWeight: 700, fontSize: '16px' } }, a.name), h('div', { class: 'muted tiny' }, `${fmt.k(a.followers)} abonnés · ${fmt.k(a.likes)} likes · ${a.videos} vidéos`)),
      a.connected ? h('span', { class: 'badge good' }, 'Connecté') : h('span', { class: 'badge bad' }, 'Déconnecté — à reconnecter'),
      a.is_test ? h('span', { class: 'badge warn' }, 'Compte de test') : null,
      h('span', { class: 'badge' }, `${a.uploaded_today} envoyé(s) en 24 h · ${a.queued} en file`),
      a.connected ? h('button', { class: 'btn sm', onclick: async e => { if (await confirmBox('Déconnecter ce compte ?', 'Le bot ne pourra plus publier dessus. Ses réglages et statistiques sont gardés.', 'Déconnecter', true)) act(e.currentTarget, async () => { await DEL('/api/accounts/' + a.id); repaint(); }, 'Compte déconnecté'); } }, 'Déconnecter') : null,
      h('button', { class: 'btn sm danger', 'aria-label': 'Oublier ce compte', onclick: async e => { if (await confirmBox('Oublier ce compte ?', 'Le compte, ses réglages et son lien avec les clips sont supprimés de l\'application.', 'Oublier', true)) act(e.currentTarget, async () => { await DEL('/api/accounts/' + a.id + '?forget=1'); repaint(); }, 'Compte oublié'); } }, icon('trash'))),
    h('details', { class: 'guide', style: { marginTop: '14px' } }, h('summary', null, 'Réglages de ce compte'),
      h('div', { style: { padding: '6px 14px 16px' } },
        h('div', { class: 'form-grid' },
          F.text('Nom affiché', a.name, v => d.set('name', v)),
          F.select('Langue du compte', a.lang, Object.entries(LANGS), v => d.set('lang', v), { help: 'Titres, descriptions et sous-titres sont écrits dans cette langue.' }),
          F.toggle('Compte de test', a.is_test, v => d.set('is_test', v), { help: 'Seul type de compte utilisé en mode test.' }),
          F.select('Visibilité à l\'upload', S.privacy, PRIVACY, set('privacy'), { help: 'Privé : tu passes toi-même les vidéos en public dans TikTok (compte privé obligatoire tant que l\'app n\'est pas validée). Brouillon : la vidéo arrive dans les notifications de l\'appli TikTok, tu colles la description et tu publies ; pensé pour un compte public.' }),
          F.number('Clips par jour (maximum)', S.clips_per_day, set('clips_per_day'), { min: 0, max: 50 }),
          F.number('Écart minimal entre deux uploads (minutes)', S.min_gap_minutes, set('min_gap_minutes'), { min: 0 }),
          F.number('Écart entre deux épisodes d\'une même série (minutes)', S.series_episode_gap_minutes, set('series_episode_gap_minutes'), { min: 0, help: 'Une fois l\'épisode 1 parti, les suivants s\'enchaînent avec cet écart.' }),
          F.number('Durée minimale (s)', S.min_duration, set('min_duration'), { min: 3 }),
          F.number('Durée maximale (s)', S.max_duration, set('max_duration'), { min: 5 }),
          F.toggle('Séries « L\'aventure de… »', S.series, set('series')),
          F.toggle('Recevoir les meilleurs clips de l\'autre langue', S.cross_lang, set('cross_lang'), { help: 'Publiés avec sous-titres traduits par l\'IA.' }),
          F.toggle('Publier seulement aux meilleurs horaires', S.use_best_hours, set('use_best_hours'), { help: 'Les autres clips attendent en file.' }),
          F.text('Hashtags fixes', (S.fixed_hashtags || []).join(' '), v => d.set('settings.fixed_hashtags', v.split(/[\s,#]+/).filter(Boolean)), { placeholder: 'gtarp clipsgta', help: 'Ajoutés à chaque description (6 hashtags maximum au total).' })),
        warn,
        h('div', { style: { marginTop: '14px' } }, F.checks('Catégories autorisées', S.categories, Object.entries(CATS), set('categories'), { help: 'Les clips d\'une catégorie décochée ne vont pas sur ce compte.' })),
        h('div', { class: 'sep' }),
        h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '22px' } }, phone,
          h('div', { class: 'grow stack', style: { minWidth: '240px' } },
            h('h3', null, 'Sous-titres'),
            h('div', { class: 'form-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } },
              F.select('Police', S.sub_style.font, fonts, set('sub_style.font')), F.select('Position', S.sub_style.position, POS, set('sub_style.position')),
              F.number('Taille', S.sub_style.size, set('sub_style.size'), { min: 40, max: 160 }),
              F.color('Couleur', S.sub_style.color, set('sub_style.color')), F.color('Mot actif', S.sub_style.highlight, set('sub_style.highlight')), F.color('Contour', S.sub_style.outline, set('sub_style.outline')),
              F.toggle('MAJUSCULES', S.sub_style.uppercase, set('sub_style.uppercase'))),
            h('h3', { style: { marginTop: '6px' } }, 'Titre'),
            h('div', { class: 'form-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } },
              F.select('Police', S.title_style.font, fonts, set('title_style.font')), F.select('Position', S.title_style.position, POS, set('title_style.position')),
              F.number('Taille', S.title_style.size, set('title_style.size'), { min: 30, max: 120 }),
              F.color('Couleur', S.title_style.color, set('title_style.color')), F.color('Bandeau', S.title_style.box, set('title_style.box'))),
            h('div', { class: 'help muted small' }, 'Aperçu approximatif : les vraies polices sont appliquées au montage.'))),
        h('div', { class: 'savebar' }, saveBtn))));
}

async function statsTab(body) {
  let acc = 0, days = 30;
  const out = h('div');
  const accSel = h('select', { 'aria-label': 'Compte', onchange: e => { acc = Number(e.target.value); paint(); } }, h('option', { value: 0 }, 'Tous les comptes'), App.accounts.map(a => h('option', { value: a.id }, a.name)));
  const daySel = h('select', { 'aria-label': 'Période', onchange: e => { days = Number(e.target.value); paint(); } }, [[7, '7 jours'], [30, '30 jours'], [90, '90 jours']].map(([v, l]) => h('option', { value: v, selected: v === 30 }, l)));
  const upd = h('span', { class: 'muted small grow' });
  clear(body, h('div', { class: 'row', style: { marginBottom: '14px' } }, h('div', { style: { width: '220px', maxWidth: '100%' } }, accSel), h('div', { style: { width: '140px' } }, daySel), upd,
    h('button', { class: 'btn sm', onclick: e => act(e.currentTarget, async () => { await POST('/api/stats/refresh'); paint(); }, 'Statistiques actualisées') }, icon('refresh'), 'Actualiser')), out);

  const bars = (title, rows, label) => chartCard(title, 'bar', rows.map(r => label ? label(r.key) : r.key), rows.map(r => r.avg_views), { label: 'Vues moyennes', horizontal: true, small: true });
  async function paint() {
    App.charts.forEach(c => c.destroy()); App.charts = [];
    clear(out, loading());
    let r; try { r = await GET(`/api/stats?account=${acc}&days=${days}`); } catch (e) { return clear(out, empty('Statistiques indisponibles', e.message)); }
    const s = r.stats, t = s.totals;
    upd.textContent = r.updated_at ? 'Mis à jour ' + fmt.ago(r.updated_at) : 'Jamais mis à jour';
    const recBox = h('div');
    clear(out,
      h('div', { class: 'card', style: { marginBottom: '14px' } }, h('div', { class: 'row', style: { gap: '34px' } }, kpi(fmt.k(t.views), 'vues'), kpi(fmt.k(t.likes), 'likes'), kpi(fmt.k(t.comments), 'commentaires'), kpi(fmt.k(t.shares), 'partages'), kpi(t.videos, 'vidéos suivies'),
        kpi(t.views ? (100 * (t.likes + t.comments + t.shares) / t.views).toFixed(1).replace('.', ',') + ' %' : '–', 'engagement'))),
      h('div', { class: 'grid g2' },
        chartCard('Nouvelles vues par jour', 'bar', s.daily.map(d => d.day.slice(5).split('-').reverse().join('/')), s.daily.map(d => d.new_views || 0), { label: 'Vues' }),
        chartCard('Abonnés', 'line', s.daily.map(d => d.day.slice(5).split('-').reverse().join('/')), s.daily.map(d => d.followers || 0), { label: 'Abonnés', color: INK.b }),
        chartCard('Nouvelles vues par semaine', 'bar', s.weekly.map(w => w.week.replace(/^\d+-/, '')), s.weekly.map(w => w.new_views), { label: 'Vues', small: true }),
        chartCard('Nouveaux abonnés par semaine', 'bar', s.weekly.map(w => w.week.replace(/^\d+-/, '')), s.weekly.map(w => w.new_followers), { label: 'Abonnés', color: INK.b, small: true })),
      h('h3', { style: { marginTop: '24px' } }, 'Ce qui marche le mieux (vues moyennes par vidéo)'),
      h('div', { class: 'grid g2' }, bars('Par streamer', s.by_streamer.slice(0, 8)), bars('Par catégorie', s.by_category, k => CATS[k] || k), bars('Par durée', s.by_duration),
        (hs => chartCard('Par heure de publication', 'bar', hs.map(r => r.key + ' h'), hs.map(r => r.avg_views), { label: 'Vues moyennes', small: true }))(s.by_hour.slice().sort((a, b) => a.key - b.key)), bars('Séries ou clips isolés', s.by_series)),
      h('h3', { style: { marginTop: '24px' } }, 'Top vidéos'),
      s.top.length ? h('div', { class: 'card', style: { padding: '6px 8px' } }, h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Vidéo', 'Streamer', 'Vues', 'Likes', 'Comm.', 'Partages'].map((x, i) => h('th', { class: i > 1 ? 'r' : '' }, x)))),
        h('tbody', null, s.top.map(v => h('tr', null, h('td', null, v.share_url && /^https:\/\//.test(v.share_url) ? h('a', { href: v.share_url, target: '_blank', rel: 'noopener noreferrer' }, v.clip_title || v.title || 'Vidéo') : (v.clip_title || v.title || 'Vidéo')),
          h('td', null, v.streamer || '–'), h('td', { class: 'r' }, fmt.n(v.views)), h('td', { class: 'r' }, fmt.n(v.likes)), h('td', { class: 'r' }, fmt.n(v.comments)), h('td', { class: 'r' }, fmt.n(v.shares)))))))) :
        empty('Pas encore de données', 'Les vidéos apparaissent ici une fois publiées et visibles sur TikTok.'),
      h('h3', { style: { marginTop: '24px' } }, 'Comparaison des comptes'),
      r.compare.length ? h('div', { class: 'card', style: { padding: '6px 8px' } }, h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, ['Compte', 'Langue', 'Abonnés', 'Vues', 'Vues / vidéo', 'Engagement'].map((x, i) => h('th', { class: i > 1 ? 'r' : '' }, x)))),
        h('tbody', null, r.compare.map(c => h('tr', null, h('td', null, h('b', null, c.name), c.is_test ? h('span', { class: 'badge warn', style: { marginLeft: '8px' } }, 'test') : null), h('td', null, (c.lang || '').toUpperCase()),
          h('td', { class: 'r' }, fmt.n(c.followers)), h('td', { class: 'r' }, fmt.n(c.views)), h('td', { class: 'r' }, fmt.n(c.avg_views)), h('td', { class: 'r' }, String(c.engagement).replace('.', ',') + ' %'))))))) :
        empty('Aucun compte', 'Connecte un compte TikTok pour voir ses statistiques.'),
      h('h3', { style: { marginTop: '24px' } }, 'Recommandations'), recBox);
    paintRecs(recBox, acc || (App.accounts[0] || {}).id);
  }
  async function paintRecs(box, id) {
    if (!id) return clear(box, empty('Aucun compte', 'Les recommandations sont calculées par compte.'));
    let r; try { r = await GET(`/api/accounts/${id}/recommendations`); } catch (e) { return clear(box, empty('Recommandations indisponibles', e.message)); }
    const name = (App.accounts.find(a => a.id === id) || {}).name || '';
    const can = r.recommendations.some(x => x.apply);
    clear(box, h('div', { class: 'card stack' }, h('div', { class: 'muted small' }, 'Pour le compte ' + name),
      h('ul', { style: { margin: 0, paddingLeft: '20px' } }, r.recommendations.map(x => h('li', { style: { margin: '6px 0' } }, x.text, x.apply ? h('span', { class: 'badge accent', style: { marginLeft: '8px' } }, 'applicable') : null))),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: !can, onclick: e => act(e.currentTarget, async () => { const a = await POST(`/api/accounts/${id}/recommendations/apply`); toast(a.applied ? `${a.applied} réglage(s) appliqué(s)` : 'Tout était déjà appliqué'); App.refreshAccounts(); }) }, 'Appliquer aux réglages'),
        F.toggle('Ajustement automatique', r.auto_adjust, v => PUT('/api/settings', { auto_adjust: v }).then(x => { App.meta.settings = x.settings; toast(v ? 'Ajustement automatique activé' : 'Ajustement automatique désactivé'); }).catch(oops), { help: 'Applique ces recommandations tout seul, toutes les 30 minutes.' }))));
  }
  await paint();
}
