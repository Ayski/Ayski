# Card Skin Studio

Application web progressive (PWA) **premium** de personnalisation de visuels de cartes,
pensée pour **iPhone / Safari**, développée sans ordinateur local (environnement cloud).

Créez des visuels de cartes (format carte bancaire ISO ID‑1, 85,6 × 54 mm), appliquez
effets, textes, formes et images sur plusieurs calques, puis **exportez en PNG/JPEG haute
résolution** et sauvegardez localement. Installable sur l'écran d'accueil iOS.

> ⚠️ Cette application crée des **images**. Elle **ne modifie pas** les cartes d'Apple Wallet et
> ne contourne aucune protection d'iOS. Voir le [rapport de faisabilité Wallet](#9-rapport-de-faisabilité-apple-wallet).

---

## 1. Pile technique

- **React 18** + **TypeScript** + **Vite 5**
- **Canvas 2D** pour le rendu (aperçu temps réel et export partagent le **même moteur**, fidélité garantie)
- **IndexedDB** pour la sauvegarde locale des projets
- **vite-plugin-pwa** (manifest + service worker Workbox, mise en cache des polices et de l'app shell)
- **Web Share API** (feuille de partage iOS) avec repli téléchargement
- CSS moderne, 100 % responsive, thèmes clair / sombre / automatique
- Aucune dépendance lourde, aucun backend, aucune collecte de données

## 2. Fonctionnalités

**Accueil** — accueil contextuel, reprise du dernier design, création rapide, projets récents,
modèles favoris, collections recommandées, accès au module Wallet.

**Explorer** — **30 modèles originaux** répartis sur **20 catégories** (Black Edition, Luxury Gold,
Silver Titanium, Carbon Fiber, Minimalist, Cyberpunk, Neon, Abstract, Marble, Nature, Gaming,
Anime, Manga, Streetwear, Vintage, Glass, Gradient, Geometric, Futuristic, Custom). Recherche,
filtres par catégorie, tri (thème / A‑Z), aperçu, modifier, dupliquer, favori.

**Studio** (éditeur) :
- Calques multiples : image, texte, forme — réorganiser, masquer, verrouiller, dupliquer, supprimer
- Images : import Photos/Fichiers (compatibles Safari iOS), réduction automatique, position, taille,
  rotation, opacité, luminosité, contraste, saturation, teinte, flou, 8 filtres
- Texte : contenu, 7 polices, couleur, taille, graisse, italique, alignement, espacement, ombre
- Formes : rectangle, rect. arrondi, cercle, triangle, ligne, remplissage, contour, arrondi
- Fond : uni / dégradé linéaire / radial, finitions **simulées** (mat, brillant, or, argent, carbone,
  verre, noir premium), reflet directionnel, grain
- Ergonomie : annuler / rétablir (historique), enregistrer, dupliquer le projet, comparer avant/après
  (maintenir l'œil), grille, centrage H/V, sauvegarde automatique, manipulation tactile (glisser)

**Mes créations** — galerie locale : rechercher, filtrer (favoris), trier, renommer, modifier,
dupliquer, supprimer (avec confirmation), favori, exporter, partager.

**Export** — PNG, JPEG, PNG transparent, 3 résolutions (1024 / 2048 / 3072 px), partage natif.

**Paramètres** — thème, couleur d'accent, animations, grille, sauvegarde auto, qualité d'aperçu,
résolution d'export, **export/import de sauvegardes JSON**, suppression des données (confirmée),
politique de confidentialité, à propos.

**Apple Wallet** — module d'information honnête (voir §9).

## 3. Lancer le projet (dev)

```bash
npm install
npm run dev      # http://localhost:5173
```

## 4. Compiler / vérifier

```bash
npm run lint     # typecheck TypeScript (tsc --noEmit)
npm run build    # typecheck + build de production -> dist/
npm run preview  # sert dist/ localement
```

## 5. Déploiement

Le `base` est `./`, l'app fonctionne donc sur **n'importe quel hébergement statique HTTPS**.

### Option A — GitHub Pages (automatique, inclus)
Un workflow `.github/workflows/deploy.yml` compile et déploie à chaque push.
Pour l'activer : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
L'URL publique sera alors `https://<utilisateur>.github.io/<repo>/`.

### Option B — Vercel / Netlify / Cloudflare Pages
Build command `npm run build`, dossier de sortie `dist`. HTTPS automatique.

### Option C — Replit
Importer le dépôt, `npm install && npm run build && npm run preview -- --host`.

> HTTPS est **obligatoire** pour l'installation PWA et le service worker sur iOS.

## 6. Installer sur l'iPhone (écran d'accueil)

1. Ouvrir l'URL HTTPS dans **Safari** (pas une autre app).
2. Toucher le bouton **Partager** (carré avec flèche).
3. **Sur l'écran d'accueil** → **Ajouter**.
4. L'app s'ouvre en plein écran, barre d'onglets masquée, icône dédiée.

## 7. Sauvegarder ses créations

- Les projets sont enregistrés automatiquement (IndexedDB) sur l'appareil.
- **Paramètres → Exporter sauvegarde** : télécharge un fichier `.json` de tous vos projets.
- **Paramètres → Importer sauvegarde** : restaure depuis ce fichier.
- Conseil iOS : le stockage d'un site peut être purgé si l'espace manque ou après une longue
  inactivité — exportez régulièrement une sauvegarde.

## 8. Tests exécutés

Validés dans cet environnement avec Chromium (émulation **iPhone 14**, 390×844, tactile) :

| Test | Résultat |
|------|----------|
| `tsc --noEmit` (typecheck strict) | ✅ 0 erreur |
| `npm run build` (production) | ✅ 49 modules, ~66 kB JS gzip, SW + manifest générés |
| Rendu Canvas Accueil | ✅ non vide |
| Explorer : 30 modèles affichés | ✅ |
| Ouverture modèle → Studio, rendu | ✅ canvas 1100×694 non vide |
| Onglets Studio (Fond / Objet / Export), ajout de texte | ✅ |
| Enregistrement + galerie « Mes créations » | ✅ 1 projet listé |
| Paramètres, thème clair | ✅ |
| Module Wallet | ✅ |
| **Export réel** | ✅ PNG **2048×1291** RGBA valide téléchargé |
| Erreurs console | ✅ aucune |

## 9. Rapport de faisabilité Apple Wallet

**Vérifié le 26/10/2025 pour iOS 26.6.2, iPhone seul, sans ordinateur.**

**Conclusion : il n'existe aucune méthode vérifiable et conforme** pour changer l'illustration
d'une **carte bancaire** dans Apple Wallet depuis un iPhone seul sous iOS 26.6.2.

- L'image d'une carte de paiement (Apple Pay) est fournie par la **banque / le réseau** à l'ajout.
  iOS n'expose **aucune API ni réglage** pour la remplacer ; une PWA/app ordinaire n'a pas ces
  permissions et ne peut pas les obtenir.
- Les outils tiers (**AirCard**, **Cardinal**) remplacent l'image via des **exploits** d'iOS et
  exigent un **Mac en USB** ou un outil d'exploitation (TrollStore/KFD), uniquement sur
  d'**anciennes versions** d'iOS. Rien ne cible iOS 26.6.2 ; ces voies reposent sur des exploits —
  **exclues** par les contraintes de ce projet (pas de contournement de sécurité).
- Les **passes** Wallet (`.pkpass` : fidélité, billets…) sont personnalisables, mais nécessitent
  une **signature** avec un certificat *Pass Type ID* (**compte Apple Developer, 99 $/an**) — la
  signature ne peut pas se faire sur l'iPhone seul (service en ligne ou ordinateur requis). **Une
  carte bancaire n'est pas une passe.**

Le module Wallet de l'app est **purement informatif** : **aucun bouton « Appliquer à Wallet »**,
aucune fausse réussite, aucune demande de données bancaires. Si une méthode conforme et vérifiable
apparaît un jour, elle sera développée comme **module séparé**.

Sources : [PassKit](https://developer.apple.com/documentation/passkit) ·
[Wallet Developer](https://developer.apple.com/wallet/) ·
[HIG](https://developer.apple.com/design/human-interface-guidelines/) ·
[Cardinal](https://github.com/leminlimez/Cardinal) · AirCard (app macOS).

## 10. Limitations connues

- **Pas de modification d'Apple Wallet** (voir §9).
- Les finitions or/argent/carbone/verre sont des **simulations graphiques**, pas de vrais matériaux.
- Images importées **réduites à 1600 px max** (économie de stockage IndexedDB).
- Le stockage local iOS peut être **purgé** par le système → exporter des sauvegardes.
- Polices limitées à une sélection web (chargées via Google Fonts, mises en cache hors ligne).
- Déploiement public non effectué automatiquement ici : l'URL dépend de l'hébergeur choisi (§5).

## 11. Confidentialité & sécurité

Traitement **100 % local**. Aucune donnée bancaire. Aucun traceur. Aucun envoi réseau des images
ou projets. Partage uniquement à l'initiative de l'utilisateur. Imports de fichiers validés
(type et format) avec gestion d'erreurs. Aucun contournement des mécanismes de sécurité d'iOS.

## 12. Structure

```
src/
  App.tsx                 navigation + état global
  main.tsx                point d'entrée (providers)
  types.ts                modèle de données (calques, projet)
  studio/
    render.ts             moteur Canvas (aperçu + export)
    image.ts              import/réduction, partage/téléchargement
    layers.ts             fabriques de calques
  db/storage.ts           IndexedDB + sauvegardes JSON
  theme/settings.tsx      thèmes + préférences (localStorage)
  data/
    templates.ts          30 modèles originaux
    favorites.ts          favoris de modèles
  components/             CardPreview, BottomNav, UI, icônes
  pages/                  Home, Explore, Studio, MyCreations, Settings, WalletInfo
```
