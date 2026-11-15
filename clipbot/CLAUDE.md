# ClipBot — passation complète (à lire en premier)

Ce fichier transmet tout le contexte d'une session cloud précédente, qui n'avait **aucun accès au PC**.
Tu es maintenant sur le PC Windows de l'utilisateur : tu peux enfin lancer, observer et corriger pour de vrai.

## L'utilisateur

- Francophone, **pas développeur**. Réponds en français simple, étapes numérotées, un seul geste par étape.
- Fais toi-même tout ce qui est faisable (commandes, fichiers, lecture des logs). Ne lui demande que ce qui exige son compte ou son écran.
- Ne lui demande **jamais** de coller une clé ou un mot de passe dans le chat. Les clés se collent dans l'application (Système → Clés API) et vivent dans `.env`.
- Il envoie volontiers des captures d'écran : demande-les quand tu as besoin de voir.
- Il veut des résultats rapides et pose des questions courtes ; dis clairement ce qui est testé et ce qui ne l'est pas.

## Le projet

Bot Python (FastAPI + SQLite, ffmpeg, streamlink, yt-dlp, faster-whisper, SDK Anthropic) qui surveille les streams Twitch GTA,
détecte les moments forts, monte des clips verticaux sous-titrés et les envoie sur TikTok. Interface web sur http://localhost:8080.
Lis `README.md` pour l'usage, et `VERSION` pour la version installée.

| Élément | Emplacement |
|---|---|
| Dépôt GitHub | `Ayski/Ayski` (public), dossier `clipbot/` |
| Branche de travail | `claude/twitch-tiktok-clip-bot-ta70xv` (y committer les corrections ; pas de pull request sans demande explicite) |
| Installation sur le PC | `E:\clipbot` (copiée depuis un ZIP : **ce n'est pas un clone git**, voir plus bas) |
| Données, clips, modèles | `E:\GTA 6 clip` (variable `CLIPBOT_DATA`, réglée par les `.bat`) ; clips dans `E:\GTA 6 clip\clips\<streamer>\` |
| Base | `E:\GTA 6 clip\clipbot.db` |
| Lancement | `start.bat` (fenêtre noire « ClipBot ») ; installation `install.bat` ; mise à jour `update.bat` |
| Tests | `.venv\Scripts\python -m pytest tests` depuis `E:\clipbot` |
| Analyse du PC | `.venv\Scripts\python -m clipbot --sysinfo` |

### Carte du code (`clipbot/clipbot/`)

- `pipeline.py` : moteur (choix des streams, files transcription / IA / montage / upload, maintenance).
- `capture.py` : streamlink → ffmpeg, segments de 4 s en buffer glissant. `detect.py` : score seconde par seconde, moments.
- `ai.py` : analyse Claude (note, titre, décision de série). `series.py` : séries / épisodes. `editor.py` + `subtitles.py` : montage ffmpeg.
- `facecam.py` : détection de la webcam. `tiktok.py` : OAuth + envoi. `twitch.py`, `chat.py` : API Helix et chat IRC.
- `settings.py` : réglages par défaut (`DEFAULTS`, `ACCOUNT_DEFAULTS`). `web/app.py` : API. `static/` : interface (JS sans build).
- Après toute modification de `static/`, incrémente `?v=N` dans `static/index.html` et `static/sw.js` (+ nom du cache), et mets à jour `VERSION`.

## Premier travail à faire sur ce PC

1. **Passer à un vrai clone git**, sans perdre les réglages. Dans le dépôt, le projet est dans le sous-dossier `clipbot/`, alors que
   `E:\clipbot` en contient directement le contenu : ne fais donc pas `git init` dedans. À la place :
   - installe git si absent (`winget install -e --id Git.Git`) ;
   - arrête le bot, puis clone à côté : `git clone -b claude/twitch-tiktok-clip-bot-ta70xv https://github.com/Ayski/Ayski.git E:\Ayski` ;
   - recopie `E:\clipbot\.env` (les clés) vers `E:\Ayski\clipbot\.env` ;
   - lance `E:\Ayski\clipbot\install.bat` (recrée `.venv`), puis `start.bat` depuis ce nouveau dossier ;
   - vérifie que tout marche, puis explique à l'utilisateur qu'il doit désormais utiliser `E:\Ayski\clipbot\start.bat`
     et propose de supprimer l'ancien `E:\clipbot` (avec son accord).
   Les données restent dans `E:\GTA 6 clip` quel que soit le dossier du code. Ensuite, les mises à jour se font par `git pull`
   (`update.bat` reste utilisable).
2. **Lancer les tests sous Windows** (jamais faits) et corriger les échecs propres à Windows.
3. **Lire les vrais logs** (Système → Logs, ou table `logs` de la base) pendant qu'un stream est capturé, et corriger ce qui apparaît.

## État réel au moment de la passation

### Constaté chez l'utilisateur (captures d'écran)

- Installation, lancement, mot de passe, clés Twitch / Anthropic / TikTok : faits.
- Capture de vrais streams, détection, IA, montage (encodeur `h264_nvenc`, 4 montages en parallèle) : des clips sortent dans la galerie.
- Séries : plusieurs séries avec épisodes 1 à 5 créées.
- TikTok, envoi direct en privé : **un clip réellement envoyé** (compte privé).
- TikTok, mode Brouillon : **fonctionne** avec le compte public (notification reçue dans l'appli TikTok).
- `update.bat` : a fonctionné au moins une fois.

### Codé et testé seulement sous Linux (pytest), jamais observé en vrai

- Stabilité du choix des streams (un stream suivi n'est plus remplacé à chaque variation de viewers).
- Durée des clips visant la « durée idéale » ; plafond de durée par compte retiré.
- Séries par histoire : nom de l'histoire, phases début / suite / fin, recherche de suite toutes les N minutes (`series_follow_minutes`),
  seuils abaissés pendant une histoire, envoi d'une série seulement quand elle est terminée, épisodes à la suite (1 min d'écart).
- Détection du vrai cadre de la webcam (`facecam.refine_rect`) : **à vérifier en priorité sur de vrais streams**, l'utilisateur avait signalé un mauvais cadrage.
- Bouton « Copier la description » ; file d'envoi qui ne se bloque plus sur une série entamée.

### Problèmes signalés non résolus ou non confirmés

- **Accès depuis le téléphone** (`http://<ip du PC>:8080`) : ne marchait pas. Pistes données : réseau Wi-Fi en profil « Privé »,
  règle pare-feu sur le port 8080 (`netsh advfirewall firewall add rule name="ClipBot" dir=in action=allow protocol=TCP localport=8080`),
  vérifier l'adresse avec `ipconfig`. Tu peux maintenant le diagnostiquer directement.
- Mise en page du montage sans webcam : l'image du jeu occupe le milieu et le bas reste sombre / flou ; à juger sur de vrais clips.
- Qualité des épisodes « de suite » : certains notés 4-5/10 passent (tolérance de −2 pour une suite). L'utilisateur n'a pas tranché.

## Préférences et décisions de l'utilisateur

- Il **ne veut pas** du mode « séries uniquement » : les clips isolés restent, avec de temps en temps un enchaînement d'épisodes
  pour suivre une trame (braquage, poursuite…). « S'il commence une série, autant la finir. »
- Les épisodes d'une série doivent partir **dans l'ordre, à la suite, sans autre clip intercalé**, à 1 minute d'écart.
- Il veut des clips longs : il a réglé autour de 35 à 60 s (la durée max doit être strictement supérieure à la durée min).
- Recherche de suite réglée à 2 minutes par lui (conseil donné : 3 à 5, pour le coût IA et la qualité).
- TikTok : il garde la **technique de base** (compte privé + envoi direct en privé, description posée automatiquement) jusqu'à la validation
  de l'app, puis veut poster publiquement en continu. Le mode Brouillon reste disponible (compte public, description à coller à la main).
- Visibilité : ne rien publier en public par défaut (`SELF_ONLY`).

## TikTok : où en est la demande de validation (audit)

- App « GTACLIPS6 » sur developers.tiktok.com/apps, client Desktop, Redirect URI `http://localhost:8080/callback/`.
  Sandbox configuré avec le compte « GTA 6 CLIPS » en Target user.
- Règles TikTok vérifiées dans la documentation : app non auditée ⇒ envoi direct seulement vers un compte **privé**, contenu en privé ;
  pour rendre public, passer le compte en public puis chaque vidéo en « Tout le monde ». L'endpoint brouillon (inbox) n'a pas `post_info`
  (donc pas de description) et n'est pas soumis à cette restriction dans la doc.
- **Vérification d'adresse** : la pull request `Ayski/Ayski#3` (branche `claude/stoic-carson-1sza6o` → `main`) ajoute dans `public/`
  le fichier `tiktokxQBurRKf2oFy7aAKxb9QabwAoOuvS928.txt` et les pages `clipbot/index.html`, `terms.html`, `privacy.html`.
  Le site GitHub Pages se déploie depuis `main` (workflow `.github/workflows/deploy.yml`). **Vérifie si elle est fusionnée** ;
  sinon l'utilisateur doit cliquer « Merge pull request ». Ensuite, sur TikTok : URL properties → Verify, préfixe `https://ayski.github.io/Ayski/`.
  Si TikTok redonne un fichier au nom différent, il faut le remplacer dans `public/`.
- Adresses à mettre dans le formulaire Production une fois vérifiées :
  `https://ayski.github.io/Ayski/clipbot/`, `…/clipbot/terms.html`, `…/clipbot/privacy.html`.
- Scopes à garder (5) : `user.info.basic`, `user.info.stats`, `video.list`, `video.publish`, `video.upload`.
  À retirer côté TikTok : `user.info.profile` et `minis.public.upsert` (inutilisés). Le bot ne demande plus `user.info.profile` :
  l'utilisateur doit reconnecter une fois son compte (Comptes TikTok → Connecter un compte).
- Textes déjà fournis à l'utilisateur (description de 120 caractères et explication des scopes, en anglais).
- **Reste à faire** : vidéo de démonstration (connexion du compte via Login Kit, puis envoi d'un clip et son arrivée sur TikTok),
  puis « Submit for review ». Délai de quelques jours à quelques semaines ; un refus est possible pour un outil qui republie
  le contenu d'autres créateurs — ne rien promettre.

## Règles

- Jamais de secret dans le chat, dans un commit ou dans un fichier versionné (`.env`, `data/`, `.venv/` sont ignorés par git).
- Ne rien publier en public sans demande explicite. Garder le crédit `twitch.tv/<streamer>` sur chaque clip.
- Fichiers `.bat` : fins de ligne CRLF obligatoires (`.gitattributes` : `*.bat -text`), pas d'accents dedans.
- Sous Windows, un fichier ouvert ne peut pas être supprimé : garder les suppressions tolérantes (voir `_rm` dans `pipeline.py`).
- Avant d'annoncer qu'une correction marche, lance les tests et, si possible, observe-la sur le bot réel ; dis ce qui n'a pas été vérifié.
