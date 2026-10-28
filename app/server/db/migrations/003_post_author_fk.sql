-- 003 : suppression de compte → les publications sont supprimées
-- avec leur auteur (les données personnelles partent avec l'utilisateur).

CREATE TABLE IF NOT EXISTS post_new (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO post_new SELECT id, family_id, author_id, body, created_at FROM post;
DROP TABLE post;
ALTER TABLE post_new RENAME TO post;
