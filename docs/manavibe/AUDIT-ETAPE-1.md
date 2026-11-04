# Audit MANAvibe — étape 1 (existant MANAfamily)

Lu intégralement, rien modifié, rien codé — conforme à `IMPLEMENTATION.md` §1-3.
Base de lecture : `main`, après fusion de la PR #1 (3/11/2026) ; `app/` y est
présent (Node 22, `node:sqlite`, zéro dépendance npm).

## 1. Architecture actuelle

Monolithe modulaire, zéro dépendance npm côté serveur (choix documenté et
assumé dans `app/docs/stack-node-sqlite.md`, pas une contrainte contournée) :

```
Navigateur (HTML statique généré + JS vanilla par page)
   │ fetch JSON / multipart
   ▼
app/server/index.js   — fichiers statiques protégés + délégation API
   ▼
app/server/router.js  — chaque route : auth → autorisation famille → service
   ▼
app/server/services/*.js — logique métier (families, people, memories, media,
                            albums, events, home, stories, books)
   ▼                            ▼
app/server/db/ (SQLite,    app/server/lib/storage.js (fichiers privés sur
node:sqlite natif)         disque, clés non devinables, anti-traversée)
```

9 services, ~1 750 lignes au total. Testé par `node:test` natif (3 fichiers,
~24 cas) : isolation inter-familles, auth, CRUD, upload réel, export PDF réel,
SEO. Rien de simulé.

**Permissions** (`app/server/auth/auth.js`) : session par cookie (token 256
bits, hashé en base), mot de passe en scrypt, appartenance famille vérifiée à
**chaque** requête, rôle `admin`/`member`, garde de visibilité
`family`/`adults` **dérivé** d'un lien `person.is_child` — jamais stocké comme
statut.

## 2. Modèle de données et extensibilité

14 tables (+ `audit_event`, `schema_migrations`). Extension par migrations
numérotées (`app/server/db/migrations/00N_*.sql`), rejouées dans l'ordre par
`migrate.js`. Deux migrations existantes montrent le motif : `002` ajoute une
colonne, `003` reconstruit une table entière (SQLite ne modifie pas un
`CHECK` — copie, drop, renomme). **Ce second motif est le prix de toute
évolution d'énumération** — voir réserve ③.

Toute table métier porte `family_id` + `ON DELETE CASCADE` ; IDs texte
préfixés par type (`mem_`, `usr_`, `sto_`…). Une table `song`/`recording`/
`program` suivrait ce patron à l'identique.

## 3. Fonctionnalités réutilisables

| Besoin de la spec | Ce qui existe | État |
|---|---|---|
| Stockage privé de fichiers audio | `storage.js` — déjà `audio/mpeg`, `audio/wav`, `audio/webm`, `audio/x-m4a` en liste blanche | **Réutilisable tel quel** |
| Upload de média sur un souvenir | `media.js` | Réutilisable, mais média générique — pas de `VoiceAsset` distinct |
| TTS | — | **Absent.** `ARCHITECTURE.md` le nomme explicitement : « IA "MANA" (future, désactivée) » |
| Permissions / visibilité adulte | `auth.js` | **Réutilisable tel quel** — mappe directement sur la visibilité `family`/`adults` de la spec |
| Souvenirs + sources référencées | `memories.js` + `stories.js` (`story_source` conserve les références memory/person, jamais une copie détachée) | **Le patron exact** du `SongReference.story`/`anecdotes` |
| Export composé | `books.js` + `lib/pdf.js` — compose → prévisualise (JSON modifiable) → exporte (PDF réel, zéro dépendance) | **Le patron exact** du test T5 « Export autonome » |
| Musique (Spotify/Deezer/Apple/YouTube/ISRC) | — | **Zéro occurrence** dans tout le dépôt (vérifié par recherche exhaustive) |

## 4. Points de friction avec la spec v1.2

- Aucune collision de code — rien n'existe sur la musique, donc rien à
  défaire. Mais rien à adapter non plus : toute la couche
  `SongReference`/`RecordingReference`/`MusicGateway` est neuve à 100 %.
- **`memory.kind` est un `CHECK` fermé**
  (`photo|video|text|audio|letter|recipe|other`). L'étendre coûte une
  migration lourde (motif de `003`), pas un simple ajout.
- **Pas de `VoiceAsset` distinct** : `media_asset` n'a ni `duration_ms`, ni
  `kind` (`family_voice`/`mana_narration`), ni `transcript`.
- **Le front réel n'est pas React.** HTML statique généré
  (`public/js/make-pages.js`) + JS vanilla par page (`window.mf.api/el/…`),
  zéro bundler côté app. La vitrine racine (React/Vite) est un produit
  séparé, sans rapport avec l'app familiale.
- **Aucune tâche asynchrone.** `ARCHITECTURE.md` le note lui-même : « besoin
  réel non identifié ». Non bloquant tant que la Règle 0 interdit les
  connecteurs — mais `Studio.synthesizeManaVoice` en dépendra un jour.
- **Le serveur est volontairement zéro TypeScript.** La spec v1.2 est écrite
  en interfaces TS. Les poser telles quelles dans `app/server/` casse la
  doctrine zéro-dépendance documentée.

## 5. Proposition d'intégration, dans les espaces existants

- **Nouvel espace « Émission »** : 4ᵉ carte de `/creer`, à côté
  d'Album/Récit/Livre — la place que la spec réserve elle-même
  (« un nouveau format de mémoire, pas un centre de gravité »).
- **`SongReference`** = table `song`, family-scopée, `story_id` optionnel
  vers `memory` (comme `story_source`), anecdotes via jointure analogue à
  `memory_person`.
- **`RecordingReference`** = table `recording`, FK sur `song`, `identifiers`
  en colonnes nullables.
- **`VoiceAsset`** = table liée à `media_asset` (métadonnées propres : kind,
  transcript, durée) plutôt qu'extension de `media_asset` — garde la
  frontière de stockage intacte.
- **Studio/Conductor** = `server/services/programs.js`, calqué sur
  `books.js` : composer → `previewProgram` (JSON) → `exportProgramArchive`.
  L'archive n'est pas un PDF : probablement un zip maison (JSON + audio),
  nouveau primitif du même esprit que `pdf.js`.
- **`ManaPlayer`** = module front isolé `public/js/mana-player.js`, jamais
  importé par le code `song`/`recording` — l'isolation (T6) se vérifie par
  lecture de source, comme `tests/seo.test.js` le fait déjà pour ses routes.
- **Connecteurs** (`MusicGateway`, `ExternalPlaybackHost`, `DeepLinkService`)
  : fichiers créés, désactivés, non câblés dans `router.js` — exactement ce
  que la Règle 0 demande.

## 6. Types manquants et réserves techniques

**Tous les types de la spec sont manquants** — le serveur est en JavaScript
simple, pas en TypeScript. C'est la réserve ②.

**① PR portant l'app entière — ✅ RÉSOLUE.** `vibe/manafamily-app-78427f` a
été fusionnée dans `main` le 3/11/2026 à 14h52 UTC (`8d2c621`). `app/` est
bien présent sur la branche de référence. Plus aucun blocage sur ce point.

**② TypeScript vs doctrine « zéro dépendance ».** Poser les interfaces de la
spec telles qu'écrites introduit le premier `.ts` dans `server/`, donc un
besoin de build qui n'existe pas côté serveur aujourd'hui. Alternative :
JSDoc typé, compatible avec l'existant. **Arbitrage de fondateur.**

**③ Modélisation `memory.kind` vs entités propres.** Ajouter « chanson »
comme valeur d'énumération coûte le motif lourd de `003` à chaque évolution
future. Recommandation : `song`/`recording` en entités séparées, référencées
par `memory` — cohérent avec le patron `story`/`story_source` déjà en place.
**Choix de modélisation à valider.**

**④ Aucune tâche asynchrone.** Non bloquant tant qu'aucun connecteur n'est
branché (Règle 0 l'interdit), mais `Studio.synthesizeManaVoice` en dépendra
le jour où elle devient réelle — aucune solution prête à réutiliser.

## Plan d'intégration séquentiel (étape 2)

1. Trancher ② (TS vs JSDoc) — détermine la forme de toutes les étapes
   suivantes.
2. Migration `004_manavibe_song_recording.sql` : tables `song`, `recording`,
   métadonnées `voice_asset`.
3. `server/services/programs.js` (Studio + Conductor), calqué sur
   `books.js`.
4. `public/js/mana-player.js`, isolé, avec son propre test de non-import de
   `song`/`recording` (T6).
5. Page `/creer-emission` + script associé, 4ᵉ carte de `/creer`.
6. T1–T8 (`node:test`), dont T1 avec un `song_ref` sans enregistrement
   jouable — le test fondateur.
7. Connecteurs en stubs désactivés, non câblés dans `router.js`.

**Étape 4 de `IMPLEMENTATION.md` — validation humaine du plan ci-dessus —
requise avant toute implémentation (étape 5).**
