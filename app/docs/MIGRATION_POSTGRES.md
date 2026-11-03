# Migration PostgreSQL (quand l'environnement le permettra)

Le cahier des charges demande PostgreSQL + S3. La sandbox ne dispose
ni de `psql`, ni d'un serveur PostgreSQL, ni d'un accès S3 — d'où le
choix SQLite + stockage disque privé (voir `stack-node-sqlite.md`).
La séparation en couches (`db/`, `lib/storage.js`, services sans SQL
brut dans les handlers) rend la bascule localisée.

## Étapes

1. **Schéma** : `server/db/schema.sql` est du SQL standard. À porter :
   `INTEGER PRIMARY KEY` → `BIGSERIAL` (audit), `datetime('now')` →
   `now()`, `LIKE` → `ILIKE` (recherche insensible à la casse et aux
   accents via `unaccent`), `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`.
2. **Accès** : remplacer `node:sqlite` par `pg` (seule dépendance à
   ajouter) dans `db/db.js` ; les requêtes restent en SQL paramétré.
   Le wrapper `db.transaction(fn)` a la même signature avec `pg`.
3. **Stockage** : `lib/storage.js` expose `saveObject`, `readObject`,
   `deleteObject`, `storageKeyFor` — remplacer le corps par l'API S3
   (`putObject`, `getObject`, `deleteObject`), la clé reste
   `<familyId>/<mediaId>.<ext>`. Aucun autre fichier ne change.
4. **Migrations** : `db/migrate.js` s'adapte tel quel (table
   `schema_migrations`, exécution ordonnée des `NNN_*.sql`).

## Vérifications post-migration

- rejouer `npm test` contre PostgreSQL ;
- vérifier l'isolation inter-familles (tests déjà couverts) ;
- vérifier les pièces jointes binaires (photo, vidéo, audio).
