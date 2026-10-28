# Sauvegarde et restauration

Toutes les données vivent dans `DATA_DIR` (par défaut `./data`) :

- `manafamily.db` (+ `-wal`, `-shm`) : base SQLite ;
- `uploads/<family_id>/` : fichiers téléversés (photos, vidéos, audio, documents).

## Sauvegarde

1. Arrêter le serveur (ou accepter un instantané légèrement incohérent).
2. Copier l'intégralité de `DATA_DIR` :

```bash
systemctl stop manafamily   # ou tuer le process
tar czf manafamily-$(date +%F).tar.gz data/
systemctl start manafamily
```

Alternative à chaud (SQLite accepte les sauvegardes via l'API) :

```bash
sqlite3 data/manafamily.db ".backup /backup/manafamily.db"
tar czf /backup/uploads-$(date +%F).tar.gz data/uploads/
```

3. Conserver plusieurs générations de sauvegardes, sur un support
   distinct de la machine de production (disque chiffré, NAS privé).
   Fréquence recommandée : quotidienne, mensuelle archivée.

## Restauration

1. Arrêter le serveur.
2. Restaurer le répertoire `DATA_DIR` depuis l'archive :

```bash
tar xzf manafamily-2026-10-28.tar.gz -C /chemin/vers/
```

3. Redémarrer le serveur. Les migrations se réappliquent seules si la
   base restaurée est plus ancienne que le schéma courant — ne restaurez
   jamais une base plus récente que le code.

## Test de restauration

Au moins une fois par trimestre : restaurer une sauvegarde sur une
machine de test, démarrer l'application, vérifier la connexion d'un
compte et l'accès à quelques souvenirs. Une sauvegarde non testée n'est
pas une sauvegarde.
