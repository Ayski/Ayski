# ClipBot — clips Twitch GTA → TikTok, en automatique

ClipBot surveille les streams Twitch d'un jeu (GTA V pour les tests, GTA VI ensuite), repère tout seul
les moments forts, les monte en vidéos verticales sous-titrées et les publie sur TikTok **en privé**.
Tout se pilote depuis une application web sur ton PC (et ton téléphone). Tu n'as aucun fichier à modifier.

---

## 1. Installation (une seule fois)

**Windows 10/11**

1. Télécharge le dossier `clipbot` sur ton PC (bouton vert **Code → Download ZIP** sur GitHub, puis « Extraire tout »).
2. Ouvre le dossier `clipbot` et double-clique sur **`install.bat`**.
   Il installe tout seul Python, ffmpeg, streamlink, yt-dlp, faster-whisper… (5 à 10 minutes).
   Si Windows demande une autorisation, réponds **Oui**.
3. À la fin, il affiche l'analyse de ton PC (processeur, carte graphique, disque) et les réglages conseillés.

**Mac / Linux** : ouvre un terminal dans le dossier `clipbot` et lance `./install.sh`.

## 2. Lancement (une seule commande)

- Windows : double-clique sur **`start.bat`**
- Mac / Linux : `./start.sh`

Ton navigateur s'ouvre sur **http://localhost:8080**. Au premier lancement, tu choisis ton mot de passe.

> Windows affiche « Autoriser l'accès au réseau ? » → coche **Réseaux privés** et clique **Autoriser**
> (nécessaire pour l'accès depuis ton téléphone).

**Démarrer avec le PC** : dans l'application, *Système → Démarrage avec le PC*.

## 3. Les 3 clés à créer (guidé dans l'application)

Tout se colle dans **Système → Clés API** (un guide pas-à-pas est affiché sous chaque champ, et un bouton
« Tester » vérifie que la clé marche). Les clés sont rangées dans le fichier `.env`, jamais ailleurs.

| Clé | À quoi elle sert | Où la créer | Coût |
|---|---|---|---|
| **Twitch** (Client ID + Secret) | lister les streams, les clips des viewers | dev.twitch.tv/console → *Register Your Application* | gratuit |
| **Anthropic** (ANTHROPIC_API_KEY) | l'IA qui comprend, note et titre les clips | console.anthropic.com → *API Keys* | payant à l'usage (≈ 0,02 à 0,05 $ par clip retenu) |
| **TikTok** (Client Key + Secret) | publier et lire les statistiques | developers.tiktok.com → *Manage apps* | gratuit |

Sans clé Anthropic, le bot fonctionne quand même (titres simples, pas de note IA ni de séries).
Sans clé TikTok, les clips restent sur ton PC.

### Twitch, en détail
1. Va sur **dev.twitch.tv/console** et connecte-toi avec ton compte Twitch (active la double authentification si demandé).
2. **Register Your Application** → Nom : ce que tu veux · OAuth Redirect URLs : `http://localhost` · Category : *Application Integration* · Client Type : *Confidential*.
3. Clique **Manage** sur ton application → copie le **Client ID**, puis **New Secret** → copie le **Client Secret**.
4. Colle les deux dans l'application et clique **Tester**.

### TikTok, en détail
1. Va sur **developers.tiktok.com**, crée un compte développeur, puis **Manage apps → Connect an app**.
2. Ajoute les produits **Login Kit** et **Content Posting API** (active **Direct Post**).
3. Scopes à cocher : `user.info.basic`, `user.info.stats`, `video.list`, `video.publish`, `video.upload`.
4. Plateforme **Desktop**, Redirect URI : `http://localhost:8080/callback/` (l'application te l'affiche à copier).
5. Dans l'onglet **Sandbox**, ajoute ton compte TikTok comme **Target user**.
   Dans l'appli TikTok, passe ce compte en **compte privé** (Paramètres → Confidentialité) : TikTok l'exige tant que ton app n'est pas auditée.
6. Copie **Client key** et **Client secret** dans l'application, puis *Comptes TikTok → Connecter un compte*.

> Tant que ton app TikTok n'est pas « auditée » par TikTok, elle ne peut publier **qu'en privé** (visible par toi seul).
> C'est exactement le mode voulu ici : tu passes toi-même les vidéos en public depuis l'appli TikTok.
> La connexion du compte doit se faire **sur le PC** (pas depuis le téléphone), car TikTok renvoie vers `localhost`.
> Si la page de retour ne s'ouvre pas, copie son adresse et colle-la dans le champ « adresse de retour ».

## 4. Mode test GTA V, puis GTA VI

- **Où sont rangés les fichiers** : si ton PC a un disque **E:**, le bot crée tout seul le dossier **`E:\GTA 6 clip`** et y met
  tout ce qu'il télécharge ou produit (clips dans `E:\GTA 6 clip\clips\<streamer>\`, modèle de transcription, vidéos de test,
  fichiers temporaires). Sans disque E:, tout va dans `clipbot/data/`.
- Par défaut : **mode test**, jeu « Grand Theft Auto V », **aucun upload**. Les clips sont rangés dans
  `clipbot/data/clips/<streamer>/` avec leur description en `.txt`, et visibles dans l'onglet **Clips**.
- Note tes clips avec 👍 / 👎 : le bot ajuste ses réglages (onglet **Clips → Calibrage**).
- Tu peux aussi **tester sur une VOD** : *Production → Tester sur une vidéo*, colle le lien d'une VOD ou d'un clip Twitch.
- Pour uploader pendant les tests : connecte un compte TikTok, coche « compte de test », puis active
  *Production → Mode test → Uploader vers les comptes de test*.
- **Le jour de GTA VI** : *Production → Jeu ciblé* → clique « Grand Theft Auto VI », puis désactive le mode test. C'est tout.

## 5. Sur ton téléphone

1. PC et téléphone sur le **même Wi-Fi**.
2. Dans *Système*, l'adresse « Sur téléphone » est affichée (du type `http://192.168.1.20:8080`). Ouvre-la sur ton téléphone.
3. **Ajouter à l'écran d'accueil** : iPhone → bouton Partager → « Sur l'écran d'accueil » ; Android → menu ⋮ → « Ajouter à l'écran d'accueil ».

## 6. Comment ça marche (en bref)

```
Twitch (Helix) ─► choix des streams ─► capture 720p en buffer de 3 min ─┐
chat IRC anonyme ─────────────────────────────────────────────────────┼─► score d'intérêt seconde par seconde
clips créés par les viewers ──────────────────────────────────────────┘        │
                                                                                ▼
   moment fort ─► transcription (faster-whisper) ─► IA Claude (note, titre, série) ─► montage ffmpeg ─► file d'upload TikTok
```

- 4 files séparées tournent en parallèle (transcription, IA, montage, upload).
- Tout l'état est dans `data/clipbot.db` : si le PC plante, le bot reprend où il en était au redémarrage.
- Les fichiers temporaires (buffers, extraits bruts) sont nettoyés automatiquement.

## 7. Dépannage

| Problème | Solution |
|---|---|
| `install.bat` dit que « winget » est introuvable | Mets Windows à jour, ou installe « Programme d'installation d'application » depuis le Microsoft Store, puis relance. |
| La page ne s'ouvre pas | Vérifie que la fenêtre noire `start.bat` est toujours ouverte. Essaie http://127.0.0.1:8080. |
| « Port déjà utilisé » | Un autre programme utilise le port 8080. Lance `start.bat --port 8090` et ouvre http://localhost:8090. |
| Le téléphone n'accède pas à l'appli | Même Wi-Fi ? Pare-feu Windows : autorise Python sur les réseaux privés. Certains Wi-Fi « invités » bloquent tout. |
| Surveillance : « Clés Twitch manquantes » | *Système → Clés API*, colle Client ID + Secret, clique Tester. |
| « Jeu introuvable sur Twitch » | Le nom doit être exactement celui de Twitch (ex. `Grand Theft Auto V`). |
| Aucun clip détecté | Baisse le *seuil de détection* ou les *seuils de viewers* dans Production. Regarde la vue en direct : le score doit bouger. |
| Trop de clips moyens | Monte le *seuil de note IA* (7 ou 8) et utilise 👎 « pas intéressant ». |
| Pas de sous-titres | Le modèle de transcription se télécharge au premier clip (connexion nécessaire). Regarde *Système → Logs*, module « whisper ». |
| PC qui rame | Baisse *Max de streams surveillés* et passe la *qualité d'export* sur Standard. |
| IA en pause | Plafond de budget atteint : augmente-le dans *Système → Coûts*, ou attends le lendemain. Les clips en attente ne sont pas perdus. |
| Upload échoué / quota TikTok | Normal quand TikTok limite : les clips restent en file et repartent tout seuls. |
| Compte TikTok « à reconnecter » | *Comptes TikTok → Connecter un compte* à nouveau (la session TikTok a expiré). |
| Mot de passe oublié | Ferme le bot, supprime la ligne `auth` : lance `.venv\Scripts\python -c "from clipbot import db; db.ex(\"DELETE FROM settings WHERE key='auth'\")"` dans le dossier, puis relance. |
| Tout réinitialiser | Ferme le bot et supprime le dossier `data` (tes clips sont dedans : sauvegarde `data/clips` avant). |

Les journaux détaillés sont dans *Système → Logs* (filtrables par module et par niveau).

## 8. Bon à savoir

- **Droits et crédit** : chaque clip affiche en permanence `twitch.tv/<streamer>` et la description contient le crédit.
  Respecte les streamers : retire un clip si l'un d'eux te le demande (statut « Exclu » pour ne plus le clipper).
- **Limites TikTok** : l'API limite le nombre de publications par jour et par compte ; le surplus attend en file d'attente.
- **Statut « Publié »** : le bot marque un clip « Publié » quand il apparaît dans la liste de tes vidéos publiques renvoyée par TikTok.
- **Sauvegarde** : *Système → Exporter la configuration* (streamers, réglages, styles). Les connexions TikTok ne sont pas exportées.

## 9. Pour les curieux (technique)

- `clipbot/` : code Python (FastAPI + SQLite, ffmpeg, streamlink, faster-whisper, SDK Anthropic).
- `python -m clipbot --sysinfo` : analyse du PC. `python -m pytest tests` : tests automatiques.
- Dossier des données : `data/` (base, clips, modèles). Changeable avec la variable `CLIPBOT_DATA`.
