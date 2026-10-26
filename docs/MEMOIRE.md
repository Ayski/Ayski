# Mémoire du projet — Card Skin Studio

Notes de référence pour reprendre le travail sans rien redécouvrir.

## Le propriétaire et ses préférences

- Utilise uniquement un **iPhone 14 (iOS 26.6.2)**, pas d'ordinateur. Tout se teste dans le navigateur ou l'app installée.
- Parle **français** ; l'interface et les messages de commit sont en français.
- Les commits doivent être **à son nom (Ayski)**, sans mention d'outil ni ligne d'attribution, comme s'il avait tout créé lui-même. Pas de branche de travail : on pousse sur `main`.
- Veut travailler **en autonomie** : avancer sans demander de confirmation à chaque étape.
- Exigence visuelle très élevée :
  - **aucun texte sur les cartes** (« c'est moche ») ;
  - **belle lumière, ombres et volume** sur tous les dessins ;
  - les personnages doivent être de **vrais dessins**, pas des formes géométriques assemblées ;
  - typographie **« smooth »** et premium ;
  - ne montrer les planches qu'une fois **vraiment finies**.
- Couleur d'accent choisie dans l'app : **rose**.

## Règles de sécurité (cahier des charges, non négociables)

- Ne pas contourner les protections d'iOS, pas d'exploitation de faille (pas de méthode type AirCard / TrollStore / jailbreak).
- Aucune donnée bancaire, aucun identifiant sensible, aucun vrai numéro de carte ni CVV dans les modèles.
- Aucun faux bouton « Appliquer à Wallet ». Le module Wallet reste informatif et honnête.
- Aucun envoi de photos sans consentement ; tout reste sur l'appareil (IndexedDB).
- Si on fait un mode « vitrine façon portefeuille » : pas de logo Apple / Apple Pay, pas de faux écran de paiement.

## Mise en ligne

- Site : **https://ayski.github.io/Ayski/** (GitHub Pages).
- Chaque push sur `main` lance `.github/workflows/deploy.yml` (Node 22, `npm ci`, `npm run build`, déploiement Pages).
- Après une mise à jour, l'utilisateur doit fermer complètement l'app puis la rouvrir (service worker PWA).

## Pile technique

- React 18 + TypeScript strict (`noUnusedLocals`), Vite 5, `vite-plugin-pwa` (precache js/css/html/svg/png/woff2).
- `npm run build` = `tsc --noEmit && vite build`.
- Stockage local : IndexedDB (`src/db/storage.ts`), favoris et réglages en local.
- Sections : Accueil, Explorer, Studio, Mes créations, Paramètres, plus la page Compatibilité Apple Wallet.

## Moteur de rendu des cartes

- Un seul moteur pour l'aperçu et l'export : `renderCard` dans `src/studio/render.ts` (Canvas 2D).
- Coordonnées normalisées 0..1, format de carte 1.586 (ISO ID-1).
- Calques : image, texte, forme, dessin, vecteur.
- Calque vecteur = chemins SVG dessinés avec Path2D (`VectorPath` dans `src/types.ts`) :
  - `fill` / `stroke` : couleur ou dégradé linéaire / radial ;
  - `clip` : ne peindre qu'à l'intérieur d'une forme (ombres propres, liseré de lumière) ;
  - `blend` : mode de fusion (`multiply` pour les ombres, `screen` / `lighter` pour la lumière) ;
  - `defs` du calque : les chemins répétés (silhouette réutilisée en remplissage, découpe et encrage) sont stockés une seule fois et référencés par `"#i"`. Le builder `vec()` (`src/data/builders.ts`) le fait automatiquement. Ça divise environ par deux la taille des modèles.
- `src/data/art/kit.ts` : outils de dessin communs (dégradés, formes, nuages, étoiles, grilles…).
- `src/data/art/cartoons.ts` exporte une boîte à outils « dessin à la main » utilisée aussi par `games.ts` :
  - `smooth` simplifie les points avant la courbe (Ramer–Douglas–Peucker, tolérance 0,06) ;
  - formes tremblées, encrage à épaisseur variable, hachures, grain.

## Modèles (70 au total)

- Liste : `src/data/templates.ts` → `CORE_V2` (30 cartes de base, ordre historique dans `collections/core.ts`), Signature (12), Dessins animés (5), Jeux vidéo (6), Personnages (6), Scènes (11).
- Fichiers par thème, un propriétaire par fichier :
  - luxe : `collections/core-lux.ts` + `art/core-lux.ts` + `art/cardparts.ts` (puce gravée, sans contact) ;
  - couleurs vives : `collections/core-vivid.ts` + `art/core-vivid.ts` / `art/core-world.ts` ;
  - Signature : `collections/signature.ts` ;
  - parodies : `cartoons.ts`, `games.ts` (art + collections) ;
  - scènes : `scenes.ts` (art + collection) ;
  - personnages : `collections/characters.ts` (cadre, socle, plaque de stats, rareté par métal / gemmes) + portraits dans `art/portraits-a.ts` (chevalier, mage), `portraits-b.ts` (ninja, robot), `portraits-c.ts` (dragon, fantôme pirate), aides communes dans `art/portrait-kit.ts`, décors dans `art/characters.ts`.
- Les cartes personnages sont **construites à la demande** (getter paresseux sur `layers`) pour ne pas ralentir le démarrage.
- Budget par portrait : environ 300 Ko de données et 60 ms de génération maximum.
- Parodies : clins d'œil reconnaissables, mais sans logo, nom officiel ni copie de sprite.

## Performance

- `CardPreview` (`src/components/CardPreview.tsx`) :
  - un seul rendu pour l'art purement vectoriel ;
  - les miniatures du catalogue (prop `lazy`) sont gardées en `ImageBitmap`, jamais les aperçus en direct.
- Studio (`src/pages/Studio.tsx`) : l'historique d'annulation copie seulement ce qui change (`snapshot`). Les gros chemins vectoriels restent partagés ; seuls les traits de dessin sont recopiés, car ils sont modifiés sur place.

## Typographie de l'interface

- Polices intégrées (hors ligne) dans `src/assets/fonts/`, licences OFL à côté :
  - **Fraunces** (serif douce, axes `opsz` / `SOFT`) pour les titres : `--font-display` ;
  - **Plus Jakarta Sans** pour l'interface : `--font-ui`.
- Classes : `.page-title` (titre en dégradé), `.eyebrow` (petites capitales avec un trait), `.tile-title` / `.tile-sub`, `.section-head h2`, `.sheet-title`, `.studio-name`, `.hero-caption`.
- Champs de saisie à 16 px minimum (sinon iOS zoome).
- Les polices Google (Inter, Playfair, Oswald, Bangers…) restent chargées pour les calques texte du Studio.

## Méthode de travail qui a fait ses preuves

- Page de revue en développement : `?keys=cle1,cle2&cols=N` affiche ces modèles en grand (`src/dev/Gallery.tsx`, absente du build de production).
- Captures avec le Chromium de Playwright préinstallé, puis zoom sur des recadrages pour juger la qualité.
- Avant chaque push : `npx tsc --noEmit` et `npx vite build` dans une copie propre du dépôt, puis vérification qu'aucun modèle n'utilise `text(` / `title(` dans `src/data/collections/`.
- Pour les gros chantiers de dessin : plusieurs agents en parallèle, chacun propriétaire de ses fichiers ; revue visuelle de chaque résultat et renvoi en seconde passe si ce n'est pas au niveau.

## Apple Wallet — ce qu'il faut savoir

- Impossible de changer l'image d'une vraie carte bancaire dans Wallet : l'image vient de la banque, et aucune API publique ne le permet.
- Les outils qui y arrivent exploitent des failles d'anciennes versions d'iOS. Le changement est visuel et local seulement, et ça ne marche pas sur iOS 26.6.2.
- Pistes légales :
  - les designs proposés par certaines banques ;
  - les passes .pkpass non bancaires (fidélité, membre), qui demandent un compte développeur Apple pour la signature ;
  - un mode « vitrine » dans l'app, qui ne permet pas de payer.

## Idées en attente

- Mode « Vitrine » façon portefeuille : cartes empilées, ouverture en 3D, reflet selon l'inclinaison, plein écran pour captures.
- Page publique du tutoriel d'utilisation.
