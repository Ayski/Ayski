# Epure

Une interface alternative, épurée, pour piloter ta lecture Spotify depuis ton iPhone, avec un
moteur de lecture intelligent (**Epure Flow**) qui évite de te repasser toujours les mêmes
titres, et un fond d'écran entièrement personnalisable.

Epure est une **PWA** (application web installable). Elle utilise uniquement l'**API Web
officielle de Spotify** : la musique est jouée par l'app Spotify, Epure l'affiche, la contrôle
et choisit les titres suivants. Pas de mod, pas de scraping, pas de serveur : tout tourne dans
ton navigateur et tes données restent sur ton téléphone.

> Ce dossier `epure/` est indépendant du reste du dépôt (Card Skin Studio, à la racine).

---

## 1. Ce qu'il te faut

- Un compte **Spotify Premium** (obligatoire pour contrôler la lecture par l'API).
- Ton app sur [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard), avec
  « Web API » cochée. Le Client ID est déjà renseigné dans `.env.example`.
- (Facultatif) une clé API **Last.fm** gratuite, pour la découverte de nouveaux titres.

## 2. Lancer en local (sur un ordinateur)

```bash
cd epure
cp .env.example .env      # puis ajoute ta clé Last.fm si tu en as une
npm install
npm run dev
```

Ouvre **http://127.0.0.1:5173** (pas `localhost` : Spotify le refuse comme adresse de retour).
La redirect URI `http://127.0.0.1:5173/callback` doit figurer dans ton dashboard Spotify.

Autres commandes : `npm run build` (vérifie les types puis construit dans `dist/`),
`npm run preview` (sert la version construite).

## 3. Déployer sur Vercel (gratuit, faisable depuis l'iPhone)

1. Va sur [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**.
2. **Add New… → Project** → importe le dépôt `Ayski/Ayski`.
3. Dans l'écran de configuration :
   - **Root Directory** : touche *Edit* et choisis `epure` (important, sinon Vercel
     construit l'autre projet du dépôt) ;
   - **Framework Preset** : `Vite` (détecté tout seul) ;
   - **Environment Variables** : ajoute
     - `VITE_SPOTIFY_CLIENT_ID` = `9187c9dc1b274203932e2503ec186f3d`
     - `VITE_LASTFM_API_KEY` = ta clé Last.fm (tu peux l'ajouter plus tard).
4. **Deploy**. Au bout d'une minute, Vercel te donne une adresse du type
   `https://ton-projet.vercel.app`.

Vercel met en ligne la branche `main`. Tant que ce code est sur une autre branche, soit tu la
fusionnes dans `main`, soit tu changes la branche de production dans
*Settings → Environments → Production → Branch Tracking*.

### Ajouter l'adresse de retour dans Spotify (indispensable)

1. [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → ouvre ton app.
2. **Settings** (ou *Edit*) → section **Redirect URIs**.
3. Ajoute exactement `https://ton-projet.vercel.app/callback` (ton adresse Vercel + `/callback`,
   sans barre oblique à la fin) → **Add** → **Save** tout en bas.

Garde aussi `http://127.0.0.1:5173/callback` pour le développement.

### Ajouter la clé Last.fm

1. Crée la clé sur [last.fm/api/account/create](https://www.last.fm/api/account/create)
   (un nom d'application suffit, les autres champs sont facultatifs) et copie « API key ».
2. Vercel → ton projet → **Settings → Environment Variables** → `VITE_LASTFM_API_KEY`.
3. **Deployments → … → Redeploy** pour que la clé soit prise en compte.

Sans clé, tout fonctionne ; les « découvertes » sont alors les titres de ta bibliothèque que tu
n'as jamais écoutés dans Epure.

## 4. Installer sur l'écran d'accueil de l'iPhone

1. Ouvre l'adresse Vercel dans **Safari**.
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Lance Epure depuis l'icône : elle s'ouvre en plein écran, sans barre de navigation.
4. Connecte-toi à Spotify **depuis l'app installée** (son stockage est séparé de celui de
   Safari).

Après une mise à jour, ferme complètement l'app puis rouvre-la pour charger la nouvelle version.

## 5. Utilisation

- **Swipe gauche / droite** sur la pochette : titre suivant / précédent. La pochette suit le
  doigt et part au-delà de 30 % de la largeur ou d'un geste rapide.
- **Swipe vers le haut** ou bouton palette : panneau de personnalisation.
- **Pastille du haut** : mode de lecture et niveau d'aventure.
- **… à côté du cœur** : « Je l'adore, repasse-le », « Ne plus me le proposer », « Ouvrir dans
  Spotify ».
- **Barre du bas** : file d'attente, playlists, stats.
- **Icône appareils** (en haut à gauche) : choisir l'appareil Spotify Connect.

Si rien n'est en lecture : ouvre Spotify, lance un titre, reviens dans Epure.

## 6. Comment fonctionne Epure Flow

### Historique local

Chaque écoute est enregistrée dans IndexedDB : titre, artiste, date, durée réellement écoutée,
et si c'était un **skip** (passé avant 30 s ou avant la moitié). À chaque ouverture, les
50 dernières écoutes connues de Spotify (`/me/player/recently-played`) comblent les trous.

### Anti-répétition

- Un titre écouté **2 fois ou plus en 14 jours** passe au **repos**. Durée : *N* jours pour
  2 écoutes, puis *N* de plus par écoute supplémentaire (*N* = « Durée du repos », 3 par défaut).
- Un titre entendu il y a moins de 6 heures n'est jamais reproposé.
- **Jamais deux titres du même artiste à la suite**, et **2 au maximum sur 10**.
- Un titre **banni** n'est plus jamais choisi ; un titre **adoré** ignore le repos.

### Score

Chaque candidat reçoit une note :

| Élément | Effet |
| --- | --- |
| Fraîcheur | jusqu'à +40, selon le temps écoulé depuis la dernière écoute |
| Écoutes récentes | −12 par écoute sur 14 jours |
| Skips | jusqu'à −60 pour un titre souvent passé |
| Artiste apprécié | de −10 à +15 (écoutes complètes, likes, skips) |
| Jamais écouté | +30 |
| Adoré | +25 |
| Hasard | de 0 à +18, pour rester imprévisible |

Mode **debug** : touche 5 fois le numéro de version en bas du panneau de personnalisation ; le
détail du score s'affiche alors dans la file d'attente.

### Sources et découverte

- Bibliothèque : titres likés, playlists (25 premières, 300 titres chacune), albums sauvegardés,
  tops. Synchronisée en fond au plus une fois par jour (bouton « Synchroniser » pour forcer).
- Découverte : Last.fm (`artist.getSimilar`, `artist.getTopTracks`, `track.getSimilar`) propose
  des titres proches de tes goûts ; chacun est retrouvé sur Spotify par la recherche, en
  vérifiant **l'artiste et le titre**. Tout est mis en cache.

### Modes

| Mode | Part de découvertes |
| --- | --- |
| Confort | 20 % |
| Équilibre | 50 % |
| Découverte | 80 % |
| Depuis cette playlist | 0 % — anti-répétition appliquée aux titres de la playlist |

Le curseur **Niveau d'aventure** règle finement cette part.

### File d'attente

Le moteur garde **3 titres d'avance** dans la file Spotify et un plan de 8 titres. L'API ne
permet ni de retirer ni de réordonner un titre déjà envoyé : dans l'écran « File », seuls les
titres pas encore envoyés se déplacent ou se retirent.

**« Préparer 20 titres »** remplit la file Spotify d'un coup, à utiliser avant de fermer l'app.

## 7. Personnalisation

- 6 thèmes, couleur d'accent (presets, sélecteur, ou dynamique selon la pochette).
- Arrondi des coins, intensité du flou, taille de la pochette, vitesse des animations.
- Fond d'écran : dégradé dynamique, couleur unie ou **ta propre image** (photo recadrée et
  compressée en WebP, 2000 px max ; GIF animé ; courte vidéo en boucle muette). Flou,
  luminosité, assombrissement, saturation, teinte de la pochette, parallaxe, fond différent
  par écran. Le texte passe en sombre automatiquement sur un fond clair.
- Export / import du thème en JSON, fonds d'écran compris (un avertissement s'affiche si le
  fichier est lourd).

Les réglages vont dans `localStorage`, les images dans IndexedDB. Rien n'est envoyé ailleurs.

## 8. Architecture

```
src/
  spotify/    auth.ts (PKCE, refresh), api.ts (client HTTP, erreurs, quotas), types.ts
  lastfm/     lastfm.ts (artistes et titres similaires, avec cache)
  db/         db.ts (IndexedDB : écoutes, catalogue, drapeaux, cache, fonds)
  engine/     history.ts (écoutes et skips), library.ts (données + statistiques),
              scoring.ts (score et règles d'artiste), sources.ts (synchro bibliothèque),
              discovery.ts (Last.fm → Spotify), flow.ts (plan et file Spotify)
  state/      player.ts (polling 3 s, contrôles optimistes), store.ts, toast.ts, haptics.ts
  theme/      settings.ts (réglages), colors.ts (palette, luminance), apply.ts (variables CSS)
  wallpaper/  wallpapers.ts (import, compression, export / import)
  components/ écran principal, carrousel, panneaux
  styles/     app.css
```

## 9. Limites à connaître

- **API Spotify restreinte en mode développement** (changements de février 2026) : pas de
  recommandations, d'audio-features, d'artistes liés, de top titres d'artiste ni de nouveautés ;
  recherche limitée à 10 résultats. La découverte passe donc par Last.fm. L'app utilise les
  endpoints actuels (`/me/library`, `/playlists/{id}/items`) ; une source refusée (403) est
  simplement ignorée.
- **5 utilisateurs maximum** pour une app en mode développement, à ajouter dans
  *User Management* du dashboard si tu veux la prêter.
- **Pas d'arrière-plan sur iOS** : quand Epure est fermée ou l'écran verrouillé, elle ne peut ni
  suivre les écoutes ni alimenter la file. D'où « Préparer 20 titres » et le rattrapage par
  l'historique Spotify à la réouverture (qui ne remonte que les écoutes de plus de 30 s, donc
  pas les skips rapides).
- **File Spotify non modifiable** : un titre envoyé ne peut plus être retiré par l'API.
- **Titre précédent** : l'API ne l'expose pas ; Epure affiche celui dont elle se souvient.
- **Quotas** : en cas de limite (429), Epure respecte le délai demandé et reprend toute seule.
- Retour haptique : seulement là où le navigateur le permet (iOS 17.4+ partiellement).
