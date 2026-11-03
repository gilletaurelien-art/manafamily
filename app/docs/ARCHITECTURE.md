# Architecture MANAfamily

Monolithe modulaire — un seul process Node, des frontières métier claires.

```
Navigateur (HTML/CSS/JS vanilla, charte Terre, Mer & Lumière)
   │  fetch JSON / multipart
   ▼
server/index.js — HTTP : pages statiques protégées + délégation API
   ▼
server/router.js — une route = auth → autorisation → service
   ▼
services/        — logique métier pure (familles, personnes, souvenirs,
                  médias, agenda, albums, accueil, récits, livres)
   ▼                    ▼
db/ (SQLite)      lib/storage (fichiers privés)
```

## Frontières

| Frontière | Fichier(s) |
|---|---|
| Interface utilisateur | `public/` (pages générées par `public/js/make-pages.js`) |
| Services métier | `server/services/*.js` |
| Authentification / autorisation | `server/auth/auth.js` (sessions scrypt+sha256, contexte famille, audit) |
| Accès base | `server/db/` seul point d'entrée (`getDb()`), migrations versionnées |
| Stockage médias | `server/lib/storage.js` (objet privé, non devinable) |
| Génération documents | `server/lib/pdf.js` (PDF maison, zéro dépendance) |
| Tâches asynchrones | aucune pour l'instant — besoin réel non identifié |
| Intégrations externes | aucune — l'IA MANA n'est pas branchée |

## Modèle de données (SQLite, migrations 001–003)

`app_user`, `auth_session`, `family`, `family_membership` (admin|member),
`family_invitation` (token, expiration, révocation), `person` (fiche,
`linked_user_id`, `is_child`, visibilité), `family_relationship`
(parent|partner — l'arbre en est dérivé, jamais l'inverse), `memory`
(7 types, visibilité family|adults, brouillon), `media_asset` +
`memory_media`, `memory_person`, `album` + `album_item`, `event` +
`event_participant`, `comment`, `post`, `story` + `story_source`
(références conservées), `notification_preference`, `audit_event`.

## Sécurité

- Sessions : cookie `HttpOnly` `SameSite=Lax` (`Secure` si `HTTPS=1`),
  token aléatoire 256 bits stocké hashé (SHA-256) ; expiration 30 j.
- Mots de passe : scrypt (N=16384) + sel, comparaison timing-safe.
- Autorisation : **chaque** requête vérifie l'appartenance à la famille
  propriétaire ; un identifiant modifié dans l'URL donne 404/403.
- Médias : jamais servis en statique ; `/api/media/:id` vérifie la
  famille ; types MIME limités ; 50 Mo max ; en-tête `nosniff`.
- Visibilité « adultes » : un compte relié à une personne `is_child`
  ne voit jamais les contenus `adults` (règle serveur).
- Audit : opérations sensibles (rôles, invitations, suppressions,
  export) tracées dans `audit_event`.
- Anti-traversée : toute clé de stockage est rejointe via `safeJoin`.

## IA « MANA » (future, désactivée)

Aucune fonction IA n'est livrée. Le jour où une capacité réelle existe
(transcription, recherche naturelle…), elle devra : passer par une
variable d'environnement dédiée, obtenir une autorisation explicite
de la famille, séparer visuellement sources et suggestions, ne jamais
inventer d'événements ou de parentés. Le socle familial fonctionne
intégralement sans elle.
