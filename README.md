# MANA.family

**La maison numérique familiale privée** : partager la vie de famille,
conserver les souvenirs, relier les générations, transmettre une
histoire. Privé par défaut — aucune donnée revendue, aucun fil
algorithmique, aucun traceur.

Cinq espaces :

- **Accueil** — la vie familiale : publications, derniers souvenirs,
  anniversaires, anciens souvenirs à redécouvrir ;
- **Souvenirs** — la mémoire : photos, vidéos, textes, audio, lettres,
  recettes, albums, recherche ;
- **Famille** — les personnes et les générations : fiches, relations,
  arbre généalogique dérivé des relations ;
- **Agenda** — les moments : anniversaires calculés, événements,
  participants, rappels ;
- **Créer** — la transmission : albums, récits avec sources, livre de
  famille exportable en PDF.

## Développement

React/TS + Vite, zéro dépendance UI, routeur maison, charte
« Terre, Mer & Lumière » : fond ivoire, bande de vagues bleu nuit,
bulles blanches bordées d'or, polices self-hostées Marelle Bâton 2 +
Rubik (OFL).

```bash
npm install
npm run dev      # dev local
npm run build    # build dans site/
```

## Règles non négociables

Privé par défaut · jamais de revente de données/leads · aucun tracking
publicitaire · pas de fil algorithmique, pas de likes, pas de
gamification · export des données à tout moment · aucune capacité
simulée (l'IA « MANA » n'est pas branchée).

## Déploiement

Auto à chaque push sur `main` → https://gilletaurelien-art.github.io/manafamily/

- `vite.config.ts` : `base: "/manafamily/"` (obligatoire, sinon page blanche) ;
- Hack liens profonds (`404.html = index.html`) : dans le workflow
  `.github/workflows/deploy.yml` uniquement, jamais en local ;
- Service worker : network-first sur le HTML, bump du cache à chaque
  changement de thème ;
- Settings → Pages → Source : **GitHub Actions**.
