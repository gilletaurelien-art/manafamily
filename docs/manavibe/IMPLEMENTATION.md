# Mission : intégration de MANAvibe dans MANAfamily (spec v1.2)

La spécification de référence est `docs/manavibe/SPEC-v1.2.md`. Elle fait foi.

Règle 0 : aucun connecteur musical n'est développé avant qu'une émission familiale complète soit jouable sans eux. MANAvibe enrichit MANAfamily, il ne le réorganise pas autour de lui.

## Procédure STRICTE (étapes séquentielles, validation humaine entre chacune)

1. **AUDITER** l'existant de MANAfamily (`app/`) : schéma de données, modules, conventions. Ne rien modifier.
2. **PROPOSER** un plan d'intégration conforme à la spec v1.2 : où vivent `SongReference`/`RecordingReference`, comment Studio/Conductor/Player s'articulent avec Souvenirs/Famille/Agenda/Créer. **Aucune modification de code à cette étape.**
3. **IDENTIFIER** les composants réutilisables (upload audio, TTS éventuel, permissions, export PDF) — privilégier la réutilisation.
4. **FAIRE VALIDER** le plan par l'humain. Ne pas passer à l'étape 5 sans accord explicite.
5. **IMPLÉMENTER** le premier studio d'émission SANS AUCUN connecteur musical : Studio + Conductor + ManaPlayer, avec les tests T1–T8. Les connecteurs (`ExternalPlaybackHost`, `DeepLinkService`) restent des interfaces vides désactivées.

## Interdits

- Inventer du contenu dans les replis (fallback honnête uniquement).
- Fusionner `ManaPlayer` et `ExternalPlaybackHost`.
- Rendre un identifiant externe (Spotify/ISRC/…) obligatoire.
- Activer un connecteur par défaut.
- Modifier les espaces existants de MANAfamily sans accord explicite.

## Conventions du dépôt

- L'application vit dans `app/` (Node 22, `node:sqlite`, zéro dépendance npm, tests `node --test`).
- La vitrine vit en racine (React/Vite, déployée GitHub Pages en préversion).
- `main` est la branche de référence ; le KS-5 déploie depuis `main`.
- Jamais de données réelles ni de secrets dans le dépôt (`data/`, `.env` ignorés).
