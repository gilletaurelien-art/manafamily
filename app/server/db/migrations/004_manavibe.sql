-- MANAvibe — migration 004 : la mémoire musicale familiale.
-- Deux niveaux : la chanson (identité familiale, porte la mémoire)
-- et l'enregistrement (identité musicale, porte les identifiants).
-- Les segments d'une émission vivent en JSON dans program : le conducteur
-- est déclaratif et indépendant de toute disponibilité musicale.
-- La mémoire (story/anecdote/dedicace) RÉUTILISE la table memory existante ;
-- les voix familiales réutilisent media_asset. Rien n'est dupliqué.

CREATE TABLE IF NOT EXISTS song (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  primary_artist TEXT,
  created_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (family_id, title, primary_artist)
);

-- Le souvenir associé à la chanson : lien vers memory (facultatif —
-- une chanson peut entrer dans la famille avant d'avoir son histoire).
CREATE TABLE IF NOT EXISTS song_memory (
  song_id TEXT NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  memory_id TEXT NOT NULL REFERENCES memory(id) ON DELETE CASCADE,
  relation TEXT NOT NULL DEFAULT 'story' CHECK (relation IN ('story', 'anecdote', 'dedication')),
  attached_by TEXT NOT NULL REFERENCES app_user(id),
  attached_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (song_id, memory_id, relation)
);

CREATE TABLE IF NOT EXISTS recording (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES song(id) ON DELETE CASCADE,
  artist TEXT NOT NULL,
  album TEXT,
  year INTEGER,
  isrc TEXT,
  identifiers TEXT NOT NULL DEFAULT '{}',   -- JSON persistant : spotifyId, deezerId, appleMusicId, youtubeId
  created_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS program (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  segments TEXT NOT NULL DEFAULT '[]',      -- JSON : le conducteur déclaratif
  created_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
