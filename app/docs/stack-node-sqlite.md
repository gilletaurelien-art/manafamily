# stack-node-sqlite.md — choix technique

Contraintes de l'environnement : runtime **Node 22** disponible ; PostgreSQL,
S3 et Redis **non installables** dans la sandbox (pas de binaire `psql`,
pas d'accès réseau pour provisionner des services). Le cahier des charges
autorise un autre choix « en cas de contrainte technique justifiée » —
c'est le cas ici.

## Décision

**Monolithe modulaire Node 22, zéro dépendance npm.**

| Besoin | Choix | Justification |
|---|---|---|
| Runtime | Node 22 (ESM) | déjà installé, `node:sqlite` natif |
| Base de données | **SQLite** via `node:sqlite` (base fichier `data/manafamily.db`) | seul SGBD disponible ; SQL standard, contraintes, index, migrations versionnées ; migration PostgreSQL documentée (voir `docs/MIGRATION_POSTGRES.md`) |
| Stockage fichiers | **stockage objet maison sur disque** (`data/uploads/<familyId>/<uuid>.<ext>` + table `media_asset` de métadonnées) | équivalent S3 en privé : URL non devinables, accès autorisé par le serveur uniquement ; adaptateur S3 prévu plus tard |
| Serveur HTTP | `node:http` + routeur maison | petit périmètre, aucune dépendance |
| Sessions | cookie de session (`crypto` + table `session`) | pas de JWT : révocation immédiate possible |
| Mots de passe | `crypto.scrypt` + sel aléatoire + timing-safe compare | standard robuste, natif |
| Tests | `node:test` intégré | couvre les parcours essentiels + sécurité |
| PDF | générateur PDF maison (objet binaire minimal, PDF 1.4, Helvetica) | unique besoin d'export ; aucune dépendance |

## Ce que la charte exige et ce qui est conservé

- PostgreSQL/S3 → contrainte environnement : SQLite + stockage disque privé.
  La couche d'accès est isolée dans `server/db` : bascule possible sans
  toucher au reste.
- Pas de framework : front vanilla en HTML/CSS/JS servis par le monolithe,
  charte « Terre, Mer & Lumière » respectée (encre `#1b2a4a`, or `#c9a227`,
  sable `#faf8f3`, écume `#e5e0d6`, Marelle Bâton 2 + Rubik self-hostées).
- IA « MANA » : aucune fonction IA livrée. Un module `server/services/mana`
  n'existe pas tant qu'il n'y a rien de réel à y mettre — le socle
  fonctionne intégralement sans IA, aucune capacité simulée.

## Ce que ce document ne couvre pas

- L'envoi de contenus privés à un fournisseur externe : aucun n'est
  configuré. Tout ajout futur passera par une préférence explicite de la
  famille et par une variable d'environnement documentée.
