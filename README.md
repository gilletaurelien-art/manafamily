# MANA.bzh

Promenades & découvertes en Bretagne : parcours hors ligne (PWA), GPS
et sécurité sur le littoral, audio-guide du patrimoine, export GPX —
avec **MANAradio**, la voix du territoire, au centre du site.

## Développement

React/TS + Vite, zéro dépendance UI, routeur maison.

```bash
npm install
npm run dev      # dev local
npm run build    # build dans site/
```

## Déploiement

Auto à chaque push sur `main` → https://gilletaurelien-art.github.io/mana/

- `vite.config.ts` : `base: "/mana/"` (obligatoire, sinon page blanche)
- Le hack liens profonds (`404.html = index.html`) se fait dans le
  workflow `.github/workflows/deploy.yml`, jamais en build local.
- Service worker : network-first sur le HTML (les mises à jour sont
  visibles au rechargement), cache-first sur les assets.

## Charte « Terre & Lumière »

Source de vérité : manahome-app. Polices self-hostées (Marelle Bâton 2,
Rubik — OFL), palette encre/sable/or, système bulle. Budget CSS < 20 Ko,
zéro dépendance UI.
