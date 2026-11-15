/* Écran Production : démarrer / pause, modules, direct, test sur vidéo, réglages globaux. */
'use strict';

const MOD_STATE = { ok: ['good', 'Actif'], pause: ['warn', 'En pause'], attente: ['info', 'En attente'], erreur: ['bad', 'Erreur'], 'arrêt': ['', 'Arrêté'] };
const MOD_NAME = { surveillance: 'Surveillance', 'détection': 'Détection', ia: 'IA (Claude)', montage: 'Montage', upload: 'Upload TikTok' };

App.views.production = async function (main) {
  const meta = await App.refreshMeta();
  const hero = h('div'), live = h('div'), tests = h('div');
  clear(main, pageHead('Production', 'Le centre de pilotage du bot.'), hero, h('h3', { style: { marginTop: '26px' } }, 'Streams surveillés en direct'), live,
    h('h3', { style: { marginTop: '26px' } }, 'Tester sur une vidéo'), tests,
    h('h3', { style: { marginTop: '26px' } }, 'Réglages globaux'), settingsForm(meta));

  const paintHero = () => {
    const s = App.status; if (!s) return;
    const btn = h('button', { class: 'btn big ' + (s.running ? '' : 'primary'), onclick: e => act(e.currentTarget, async () => { App.status = await POST('/api/run', { running: !s.running }); App.paintStatus(); }, s.running ? 'Surveillance en pause' : 'Surveillance démarrée') },
      icon(s.running ? 'pause' : 'play'), s.running ? 'Mettre en pause' : 'Démarrer');
    const pct = Math.min(100, s.goal ? 100 * s.clips_today / s.goal : 0);
    const c = s.counts || {};
    const inWork = (c.detected || 0) + (c.transcribing || 0) + (c.analyzing || 0) + (c.editing || 0);
    clear(hero,
      s.test_mode ? h('div', { class: 'banner' }, h('span', null, h('b', null, 'MODE TEST — ' + s.game + ' : '), 'les clips restent en local, rien n\'est envoyé sur TikTok', (App.meta.settings.test_upload ? ' (sauf vers les comptes marqués « test »)' : ''), '.')) : null,
      h('div', { class: 'card' }, h('div', { class: 'hero' }, btn,
        h('div', { class: 'grow', style: { minWidth: '220px' } }, h('div', { class: 'row between' }, h('b', null, 'Clips du jour'), h('span', { class: 'num' }, `${s.clips_today} / ${s.goal}`)),
          h('div', { class: 'progress', style: { margin: '8px 0' }, role: 'progressbar', 'aria-valuenow': Math.round(pct), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: pct + '%' } })),
          h('div', { class: 'muted small' }, `Jeu ciblé : ${s.game} · ${s.streams}/${s.max_streams} streams surveillés`)),
        kpi(inWork, 'en montage'), kpi(c.ready || 0, 'prêts'), kpi(c.queued || 0, 'en file'), kpi((c.uploaded_private || 0) + (c.published || 0), 'uploadés'))),
      h('div', { class: 'grid g5', style: { marginTop: '14px' } }, Object.entries(s.modules).map(([k, m]) => {
        const [cls, lbl] = MOD_STATE[m.state] || ['', m.state];
        return h('div', { class: 'card tight module' }, h('div', { class: 'name' }, h('span', { class: 'dot ' + cls }), MOD_NAME[k] || k), h('span', { class: 'badge ' + cls, style: { alignSelf: 'flex-start' } }, lbl), h('div', { class: 'detail' }, m.detail || ' '));
      })));
  };
  paintHero();
  const onStatus = () => { if (document.body.contains(hero)) paintHero(); else document.removeEventListener('clipbot:status', onStatus); };
  document.addEventListener('clipbot:status', onStatus);

  const paintLive = async () => {
    let r; try { r = await GET('/api/live'); } catch (e) { return; }
    App.status = r.status; App.paintStatus();
    const thr = App.meta.settings.detect_threshold;
    if (!r.streams.length) {
      return clear(live, empty(r.status.running ? 'Aucun stream surveillé pour l\'instant' : 'La surveillance est en pause',
        r.status.running ? (r.status.modules.surveillance.detail || 'Le bot cherche des streams au-dessus des seuils de viewers.') : 'Appuie sur « Démarrer » pour lancer la surveillance.'));
    }
    clear(live, h('div', { class: 'grid gauto' }, r.streams.map(s => h('div', { class: 'card tight stream ' + (s.active ? 'hot' : '') },
      h('div', { class: 'row nowrap' }, avatar(s.avatar, s.display_name),
        h('div', { class: 'grow' }, h('a', { href: '#/streamers/' + encodeURIComponent(s.login), class: 'ell', style: { display: 'block', fontWeight: 650, color: 'inherit', textDecoration: 'none' } }, s.display_name),
          h('div', { class: 'muted tiny ell' }, `${(s.lang || '').toUpperCase()} · ${fmt.n(s.viewers)} viewers · chat ${s.chat_per_min}/min`)),
        s.active ? h('span', { class: 'badge accent' }, 'Moment fort !') : h('span', { class: 'badge ' + (s.state === 'ok' ? 'good' : 'warn') }, s.state === 'ok' ? 'En direct' : s.state)),
      h('div', { class: 'row nowrap' }, h('div', { class: 'grow' }, h('div', { class: 'scorebar', title: 'Score d\'intérêt (le trait blanc est le seuil de détection)' }, h('i', { style: { width: Math.round(s.score * 100) + '%' } }), h('em', { style: { left: (thr * 100) + '%' } }))),
        h('b', { class: 'num', style: { minWidth: '44px', textAlign: 'right' } }, Math.round(s.score * 100))),
      sparkline(s.curve || [], thr),
      h('div', { class: 'row between muted tiny' }, h('span', null, `${s.moments} moment(s) détecté(s) · ${s.clips_today} clip(s) aujourd'hui`), s.restarts ? h('span', null, `${s.restarts} reconnexion(s)`) : null)))));
  };
  paintLive(); App.every(2500, paintLive);

  // --- test sur une vidéo ---
  const tdraft = { source: '', lang: 'fr', minutes: 15 };
  const tlist = h('div', { class: 'stack', style: { marginTop: '12px' } });
  const paintTests = async () => {
    let r; try { r = await GET('/api/test'); } catch (e) { return; }
    clear(tlist, r.tests.map(t => h('div', { class: 'row', style: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px' } },
      h('span', { class: 'badge ' + (t.state === 'erreur' ? 'bad' : t.state === 'terminé' ? '' : 'info') }, t.state),
      h('span', { class: 'grow ell small' }, t.source), h('span', { class: 'muted tiny' }, t.detail),
      h('button', { class: 'btn sm ghost', 'aria-label': 'Retirer ce test', onclick: e => act(e.currentTarget, async () => { await DEL('/api/test/' + encodeURIComponent(t.login)); paintTests(); }) }, icon('x')))));
  };
  clear(tests, h('div', { class: 'card' },
    h('p', { class: 'muted small' }, 'Rejoue une ancienne vidéo comme si c\'était un direct, pour régler la détection sans attendre un live. Colle le lien d\'une VOD ou d\'un clip Twitch, ou le chemin d\'un fichier vidéo sur ce PC. (Sans chat : seuls le son et l\'image comptent.)'),
    h('div', { class: 'form-grid', style: { alignItems: 'end' } },
      F.text('Lien ou fichier', '', v => tdraft.source = v, { placeholder: 'https://www.twitch.tv/videos/… ou C:\\Videos\\test.mp4' }),
      F.select('Langue', 'fr', Object.entries(LANGS), v => tdraft.lang = v),
      F.number('Durée à analyser (minutes)', 15, v => tdraft.minutes = v, { min: 1, max: 120 }),
      h('button', { class: 'btn primary', onclick: e => act(e.currentTarget, async () => { await POST('/api/test', tdraft); paintTests(); }, 'Test lancé : il apparaîtra dans les streams surveillés') }, 'Lancer le test')),
    tlist));
  paintTests(); App.every(4000, paintTests);
};

const hours = v => [...new Set(v.split(/[^0-9]+/).filter(Boolean).map(Number).filter(x => x >= 0 && x < 24))].sort((a, b) => a - b);

function settingsForm(meta) {
  const S = meta.settings, rec = meta.recommend;
  const saveBtn = h('button', { class: 'btn primary', disabled: true }, 'Enregistrer les réglages');
  const state = h('span', { class: 'muted small' }, 'Aucune modification');
  const d = draftOf(S, dirty => { saveBtn.disabled = !dirty; state.textContent = dirty ? 'Modifications non enregistrées' : 'Tout est enregistré'; });
  saveBtn.onclick = () => act(saveBtn, async () => {
    const r = await PUT('/api/settings', d.changes()); App.meta.settings = r.settings; d.commit(); App.pollStatus();
  }, 'Réglages enregistrés');
  const sec = (title, sub, open, ...body) => h('details', { class: 'sec', open }, h('summary', null, title, sub ? h('small', null, sub) : null), h('div', { class: 'body' }, body));
  const grid = (...k) => h('div', { class: 'form-grid' }, k);
  const gameInput = F.text('Jeu ciblé', S.game, v => d.set('game', v), { help: 'Nom exact du jeu sur Twitch. Pour passer à GTA 6, il suffit de changer ce champ.' });
  const setGame = g => { gameInput.querySelector('input').value = g; d.set('game', g); };
  const w = (k, help) => F.range(SIGNALS[k], S.weights[k], v => d.set('weights.' + k, v), { fmt: v => v.toFixed(2), help });

  return h('div', { class: 'stack' },
    sec('Jeu, langues et streams', null, true, grid(
      h('div', { class: 'field' }, gameInput, h('div', { class: 'row' }, ['Grand Theft Auto V', 'Grand Theft Auto VI'].map(g => h('button', { class: 'btn sm', type: 'button', onclick: () => setGame(g) }, g)))),
      F.checks('Langues surveillées', S.languages, Object.entries(LANGS), v => d.set('languages', v)),
      F.number('Viewers minimum — streams FR', S.viewer_thresholds.fr, v => d.set('viewer_thresholds.fr', v), { min: 0, help: 'En dessous, un stream français n\'est pas surveillé (sauf streamers ciblés).' }),
      F.number('Viewers minimum — streams EN', S.viewer_thresholds.en, v => d.set('viewer_thresholds.en', v), { min: 0 }),
      F.number('Scanner Twitch toutes les (minutes)', S.poll_minutes, v => d.set('poll_minutes', v), { min: 1, max: 60 }),
      F.number('Streams surveillés en même temps', S.max_streams, v => d.set('max_streams', v), { min: 0, max: 50, help: `0 = automatique. Conseillé pour ce PC : ${rec.max_streams}.` }),
      F.number('Objectif de clips par jour', S.clips_per_day_goal, v => d.set('clips_per_day_goal', v), { min: 1 }),
      F.number('Mémoire tampon par stream (secondes)', S.buffer_seconds, v => d.set('buffer_seconds', v), { min: 60, max: 600, help: 'Durée de vidéo gardée en permanence pour pouvoir revenir en arrière.' }))),
    sec('Mode test et publication', null, true, grid(
      F.toggle('Mode test', S.test_mode, v => d.set('test_mode', v), { help: 'Les clips restent sur le PC, aucun envoi sur TikTok.' }),
      F.toggle('En mode test, envoyer vers les comptes de test', S.test_upload, v => d.set('test_upload', v), { help: 'Seuls les comptes TikTok marqués « compte de test » reçoivent des clips.' }),
      F.number('Note minimale pour publier aussi dans l\'autre langue', S.cross_lang_min_rating, v => d.set('cross_lang_min_rating', v), { min: 1, max: 10, help: 'Concerne les comptes qui acceptent les clips traduits.' }),
      F.text('Meilleurs horaires de publication — FR', S.best_hours.fr.join(', '), v => d.set('best_hours.fr', hours(v)), { help: 'Heures séparées par des virgules (ex. 12, 18, 20). Utilisées par les comptes réglés sur « meilleurs horaires ».' }),
      F.text('Meilleurs horaires de publication — EN', S.best_hours.en.join(', '), v => d.set('best_hours.en', hours(v))),
      F.toggle('Ajustement automatique d\'après les stats TikTok', S.auto_adjust, v => d.set('auto_adjust', v), { help: 'Applique tout seul les recommandations (durées, horaires, catégories).' }))),
    sec('Durée des clips', null, false, grid(
      F.number('Durée minimale (s)', S.min_duration, v => d.set('min_duration', v), { min: 3, max: 119 }),
      F.number('Durée maximale (s)', S.max_duration, v => d.set('max_duration', v), { min: 4, max: 120 }),
      F.number('Durée idéale — minimum (s)', S.ideal_min, v => d.set('ideal_min', v), { min: 3 }),
      F.number('Durée idéale — maximum (s)', S.ideal_max, v => d.set('ideal_max', v), { min: 4 }),
      F.number('Contexte gardé avant l\'action (s)', S.context_before, v => d.set('context_before', v), { min: 0, max: 15, step: 0.5 }),
      F.number('Décalage du chat (s)', S.chat_lag, v => d.set('chat_lag', v), { min: 0, max: 20, step: 0.5, help: 'Le chat réagit quelques secondes après l\'action.' }))),
    sec('Détection des moments forts', 'poids de chaque signal', false,
      h('p', { class: 'muted small' }, 'Plus un curseur est haut, plus ce signal compte dans le score. Les 👍 / 👎 sur les clips ajustent aussi ces poids automatiquement.'),
      grid(w('audio', 'Pics de volume et cris, comparés au niveau habituel du streamer.'), w('chat', 'Le chat s\'emballe par rapport à d\'habitude.'), w('emotes', 'KEKW, LUL, Pog, « CLIP », « ??? »…'),
        w('keywords', '« No way », « c\'est pas possible »… repérés dans la transcription.'), w('motion', 'Changements de scène, explosions, mouvement.'), w('viewer_clip', 'Gros bonus quand un viewer crée un clip Twitch.'),
        F.range('Seuil de détection', S.detect_threshold, v => d.set('detect_threshold', v), { min: 0.1, max: 0.95, fmt: v => v.toFixed(2), help: 'Plus bas = plus de clips (moins sélectif). Plus haut = seulement les moments très forts.' })),
      h('div', { class: 'sep' }),
      grid(F.textarea('Mots-clés français (un par ligne)', S.keywords.fr.join('\n'), v => d.set('keywords.fr', lines(v)), { rows: 7 }),
        F.textarea('Mots-clés anglais (un par ligne)', S.keywords.en.join('\n'), v => d.set('keywords.en', lines(v)), { rows: 7 }),
        F.textarea('Emotes et mots de réaction du chat (un par ligne)', S.reaction_tokens.join('\n'), v => d.set('reaction_tokens', lines(v)), { rows: 7 }))),
    sec('Intelligence artificielle', null, false, grid(
      F.toggle('IA activée', S.ai_enabled, v => d.set('ai_enabled', v), { help: 'Sans IA : titres basiques, pas de note ni de séries.' }),
      F.select('Modèle Claude', S.ai_model, meta.models.map(m => [m, m]), v => d.set('ai_model', v), { help: 'Opus = meilleur jugement. Sonnet/Haiku = moins cher.' }),
      F.range('Note IA minimale pour garder un clip', S.ai_threshold, v => d.set('ai_threshold', v), { min: 1, max: 10, step: 1, fmt: v => v + ' / 10' }),
      F.toggle('Explications IA des « streamers qui percent »', S.trending_ai, v => d.set('trending_ai', v)),
      F.number('Recalcul des suggestions toutes les (minutes)', S.suggest_minutes, v => d.set('suggest_minutes', v), { min: 5 }),
      F.select('Modèle de transcription (Whisper)', S.whisper_model, [['auto', `Automatique (${rec.whisper_model})`], ['tiny', 'tiny — le plus rapide'], ['base', 'base'], ['small', 'small'], ['medium', 'medium'], ['large-v3-turbo', 'large-v3-turbo — le plus précis']], v => d.set('whisper_model', v)))),
    sec('Montage et export', null, false, grid(
      F.select('Qualité d\'export', S.export_quality, [['draft', 'Brouillon (rapide)'], ['standard', 'Standard'], ['high', 'Haute']], v => d.set('export_quality', v)),
      F.select('Encodeur vidéo', S.encoder, [['auto', `Automatique (${rec.encoder})`], ['libx264', 'Processeur (libx264)'], ['h264_nvenc', 'Carte NVIDIA'], ['h264_qsv', 'Intel Quick Sync'], ['h264_amf', 'Carte AMD'], ['h264_videotoolbox', 'Mac']], v => d.set('encoder', v)),
      F.select('Ouverture du clip', S.opening_mode, [['auto', 'Automatique'], ['hook_text', 'Texte teaser (hook)'], ['cold_open', 'Le passage le plus fort d\'abord'], ['none', 'Aucune']], v => d.set('opening_mode', v)),
      F.toggle('Jump cuts', S.jump_cuts, v => d.set('jump_cuts', v), { help: 'Supprime les silences et temps morts.' }),
      F.toggle('Zooms sur les pics', S.zooms, v => d.set('zooms', v)))),
    sec('Séries « L\'aventure de… »', null, false, grid(
      F.toggle('Séries activées', S.series_enabled, v => d.set('series_enabled', v)),
      F.number('Épisodes minimum', S.series_min, v => d.set('series_min', v), { min: 2, max: 6 }),
      F.number('Épisodes maximum', S.series_max, v => d.set('series_max', v), { min: 2, max: 12 }),
      F.number('Série fermée après (minutes sans nouvel épisode)', S.series_gap_minutes, v => d.set('series_gap_minutes', v), { min: 5 }))),
    h('div', { class: 'savebar' }, saveBtn, state));
}
