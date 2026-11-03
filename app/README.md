# MANAfamily

Maison numérique familiale privée : partager la vie de famille, conserver
les souvenirs, relier les générations, transmettre une histoire.

- **Simplicité** — chaque action est compréhensible sans formation.
- **Intimité** — tout est privé par défaut ; les contenus ne sortent
  jamais de l'espace familial sans autorisation explicite.
- **Continuité** — les souvenirs restent reliés aux personnes et aux
  événements.
- **Transmission** — albums, récits, livres de famille exportables en PDF.
- **Pérennité** — export des données ; aucune dépendance à un fournisseur d'IA.

Pas de réseau social public, pas de fil algorithmique, pas de likes, pas de
gamification, pas de mécanisme artificiel de rétention.

## Démarrage rapide

Prérequis : **Node.js 22+** (aucune autre dépendance).

```bash
cp .env.example .env    # adaptez si besoin (PORT, DATA_DIR)
npm install             # no-op : zéro dépendance npm
npm start               # http://localhost:3000
```

La base SQLite et les fichiers téléversés sont créés dans `DATA_DIR`
(par défaut `./data`). Les migrations s'appliquent au démarrage.

## Tests

```bash
npm test
```

Couvre : compte/famille/invitation/rôles, isolation stricte entre
familles, souvenirs, upload réel de fichiers et protection des médias,
personnes/relations/arbre, anniversaires calculés, agenda, albums,
récits avec sources, livre PDF, commentaires, préférences,
export/suppression de compte.

## Structure

```
server/
  index.js        serveur HTTP (API + pages)
  router.js       routes API + autorisations
  auth/           sessions, contexte famille, audit
  db/             accès SQLite, schéma, migrations versionnées
  services/       familles, personnes, souvenirs, médias, agenda,
                  albums, accueil, récits, livres
  lib/            http, validation, stockage privé, mots de passe, PDF
public/           front (HTML/CSS/JS vanilla, charte Terre, Mer & Lumière)
tests/            tests de bout en bout (node:test)
docs/             architecture, choix techniques, sauvegarde
```

## Configuration

Voir `.env.example` — aucun secret dans le code source.

## Sauvegardes

Voir `docs/BACKUP.md` — procédure de sauvegarde et restauration de
`DATA_DIR` (base + fichiers).

## Notes techniques

- Stack : Node 22, SQLite (`node:sqlite`), zéro dépendance npm —
  justification dans `docs/stack-node-sqlite.md`, bascule PostgreSQL
  dans `docs/MIGRATION_POSTGRES.md`.
- Les fichiers téléversés sont stockés sous `data/uploads/<famille>/`
  avec des identifiants non devinables et servis uniquement après
  vérification d'appartenance.
- L'IA « MANA » n'est pas branchée : le socle fonctionne intégralement
  sans elle. Aucune capacité simulée.
