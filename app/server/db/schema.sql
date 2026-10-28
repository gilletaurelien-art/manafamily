-- MANAfamily — schéma initial (migration 001).
-- SQLite : INTEGER PRIMARY KEY, clés étrangères activées au runtime.
-- Commentaires et tables listés dans docs/ARCHITECTURE.md.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_session (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS family_membership (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS family_invitation (
  token TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by TEXT NOT NULL REFERENCES app_user(id),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS person (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birth_date TEXT,
  death_date TEXT,
  biography TEXT,
  photo_media_id TEXT,
  is_child INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'family' CHECK (visibility IN ('family', 'adults')),
  created_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS family_relationship (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('parent', 'partner')),
  from_person_id TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  to_person_id TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (from_person_id <> to_person_id)
);

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'video', 'text', 'audio', 'letter', 'recipe', 'other')),
  happened_on TEXT,
  place TEXT,
  visibility TEXT NOT NULL DEFAULT 'family' CHECK (visibility IN ('family', 'adults')),
  draft INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_asset (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  uploader_id TEXT NOT NULL REFERENCES app_user(id),
  storage_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_media (
  memory_id TEXT NOT NULL REFERENCES memory(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (memory_id, media_id)
);

CREATE TABLE IF NOT EXISTS memory_person (
  memory_id TEXT NOT NULL REFERENCES memory(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  PRIMARY KEY (memory_id, person_id)
);

CREATE TABLE IF NOT EXISTS album (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS album_item (
  album_id TEXT NOT NULL REFERENCES album(id) ON DELETE CASCADE,
  memory_id TEXT NOT NULL REFERENCES memory(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (album_id, memory_id)
);

CREATE TABLE IF NOT EXISTS event (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  place TEXT,
  kind TEXT NOT NULL DEFAULT 'event' CHECK (kind IN ('event', 'reunion')),
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  created_by TEXT NOT NULL REFERENCES app_user(id)
);

CREATE TABLE IF NOT EXISTS event_participant (
  event_id TEXT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, person_id)
);

CREATE TABLE IF NOT EXISTS comment (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('memory', 'person')),
  target_id TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES app_user(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES app_user(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS story (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  created_by TEXT NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS story_source (
  story_id TEXT NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('memory', 'person')),
  source_id TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (story_id, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS notification_preference (
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  event_reminders INTEGER NOT NULL DEFAULT 1,
  birthdays INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, family_id)
);

CREATE TABLE IF NOT EXISTS audit_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_family ON memory(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_happened ON memory(family_id, happened_on);
CREATE INDEX IF NOT EXISTS idx_person_family ON person(family_id, last_name);
CREATE INDEX IF NOT EXISTS idx_media_family ON media_asset(family_id);
CREATE INDEX IF NOT EXISTS idx_event_family ON event(family_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_comment_target ON comment(family_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_album_family ON album(family_id);
CREATE INDEX IF NOT EXISTS idx_post_family ON post(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_persons ON family_relationship(family_id);
CREATE INDEX IF NOT EXISTS idx_invitation_family ON family_invitation(family_id);
CREATE INDEX IF NOT EXISTS idx_membership_user ON family_membership(user_id);
CREATE INDEX IF NOT EXISTS idx_story_family ON story(family_id);
CREATE INDEX IF NOT EXISTS idx_audit_family ON audit_event(family_id, created_at DESC);
