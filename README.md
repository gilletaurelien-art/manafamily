# MANA.family

Balades & découvertes **en famille** en Bretagne : parcours courts, accessibles poussette/PMR, aires de jeux et pauses gourmandes à proximité — hors ligne (PWA), GPS et sécurité, export GPX. MANAradio au centre, la voix du territoire.

## Développement

React/TS + Vite, zéro dépendance UI, routeur maison, charte
« Terre, Mer & Lumière » (fond bleu nuit `#1b2a4a`, bulles blanches
bordées d'or, polices self-hostées Marelle Bâton 2 + Rubik, OFL).

```bash
npm install
npm run dev      # dev local
npm run build    # build dans site/
```

## Familles d'abord

- Parcours courts (≤ 2 h), boucles, accessibilité poussette/PMR en premier filtre ;
- Aires de jeux et pauses gourmandes à proximité — données réelles uniquement ;
- Pas d'audio-guide, pas de visites guidées, pas de monétisation, pas d'espace membre ;
- Fonctionnalités client-side : PWA offline (SW), GPS/boussole, alerte hors-sentier 50 m, profil d'altitude, export GPX, SOS SMS ;
- Page radio : état « Hors antenne » honnête — aucun flux simulé ;
- Tracés indicatifs (prototype) : tracés officiels IGN à sourcer avant publication.

## Règles non négociables

Gratuité · jamais de revente de données/leads · aucun tracking
publicitaire · données réelles uniquement (geo.api.gouv.fr) · sobriété ·
pas de compteur factice, pas d'urgence artificielle, pas de carrousel
auto, pas d'emoji UI.

## Déploiement

Auto à chaque push sur `main` → https://gilletaurelien-art.github.io/manafamily/

- `vite.config.ts` : `base: "/manafamily/"` (obligatoire, sinon page blanche) ;
- Hack liens profonds (`404.html = index.html`) : dans le workflow
  `.github/workflows/deploy.yml` uniquement, jamais en local ;
- Service worker : network-first sur le HTML, bump du cache à chaque
  changement de thème ;
- Après le premier push : Settings → Pages → Source : **GitHub Actions**
  (sinon l'erreur est `Resource not accessible by integration`).
