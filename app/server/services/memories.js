// Souvenirs : CRUD, filtres, recherche, associations, commentaires.

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit, visibleVisibilityFilter } from "../auth/auth.js";
import { optional, requiredStr, validDate, validId, validEnum } from "../lib/validate.js";
import { canSeeAdultContent } from "../auth/auth.js";
import { deleteObject } from "../lib/storage.js";

const KINDS = ["photo", "video", "text", "audio", "letter", "recipe", "other"];

export function createMemory(user, ctx, input) {
  const db = getDb();
  const id = newId("mem");
  const kind = validEnum(input.kind, KINDS, "Le type de souvenir");
  const visibility = input.visibility === "adults" ? "adults" : "family";
  db.prepare(
    `INSERT INTO memory (id, family_id, title, description, kind, happened_on, place, visibility, draft, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, ctx.family.id,
    requiredStr(input.title, "Le titre", 300),
    optional(input.description, 10000),
    kind,
    validDate(input.happened_on),
    optional(input.place, 200),
    visibility,
    input.draft ? 1 : 0,
    user.id
  );
  if (Array.isArray(input.person_ids)) attachPersons(user, ctx, id, input.person_ids);
  audit(ctx.family.id, user.id, "memory.create", { memoryId: id, kind });
  return { id };
}

export function updateMemory(user, ctx, memoryId, input) {
  const db = getDb();
  const mem = getMemoryChecked(ctx, memoryId);
  db.prepare(
    `UPDATE memory SET title = ?, description = ?, kind = ?, happened_on = ?, place = ?,
     visibility = ?, draft = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    requiredStr(input.title, "Le titre", 300),
    optional(input.description, 10000),
    validEnum(input.kind, KINDS, "Le type de souvenir"),
    validDate(input.happened_on),
    optional(input.place, 200),
    input.visibility === "adults" ? "adults" : "family",
    input.draft ? 1 : 0,
    mem.id
  );
  if (Array.isArray(input.person_ids)) {
    db.prepare("DELETE FROM memory_person WHERE memory_id = ?").run(mem.id);
    attachPersons(user, ctx, mem.id, input.person_ids);
  }
  audit(ctx.family.id, user.id, "memory.update", { memoryId: mem.id });
}

function attachPersons(user, ctx, memoryId, personIds) {
  const db = getDb();
  const stmt = db.prepare("INSERT OR IGNORE INTO memory_person (memory_id, person_id) VALUES (?, ?)");
  for (const pid of personIds.slice(0, 100)) {
    const p = db
      .prepare("SELECT id FROM person WHERE id = ? AND family_id = ?")
      .get(validId(pid, "Personne"), ctx.family.id);
    if (!p) throw httpError(400, "Personne associée inconnue.");
    stmt.run(memoryId, p.id);
  }
}

export function getMemoryChecked(ctx, memoryId) {
  const db = getDb();
  const mem = db
    .prepare("SELECT * FROM memory WHERE id = ? AND family_id = ?")
    .get(validId(memoryId, "Souvenir"), ctx.family.id);
  if (!mem) throw httpError(404, "Souvenir introuvable.");
  return mem;
}

export function getMemoryVisible(user, ctx, memoryId) {
  const mem = getMemoryChecked(ctx, memoryId);
  if (mem.visibility === "adults" && !canSeeAdultContent(user, ctx))
    throw httpError(403, "Ce souvenir est réservé aux adultes de la famille.");
  return mem;
}

export function deleteMemory(user, ctx, memoryId) {
  const db = getDb();
  const mem = getMemoryChecked(ctx, memoryId);
  const tx = db.transaction(() => {
    const assets = db
      .prepare(
        `SELECT a.storage_key FROM media_asset a
         JOIN memory_media mm ON mm.media_id = a.id
         WHERE mm.memory_id = ? AND
           NOT EXISTS (SELECT 1 FROM memory_media x WHERE x.media_id = a.id AND x.memory_id <> ?)`
      )
      .all(mem.id, mem.id);
    db.prepare("DELETE FROM memory WHERE id = ?").run(mem.id);
    return assets.map((a) => a.storage_key);
  });
  const keys = tx();
  for (const k of keys) deleteObject(k);
  audit(ctx.family.id, user.id, "memory.delete", { memoryId: mem.id });
}

export function listMemories(user, ctx, filters = {}) {
  const db = getDb();
  const adultOk = canSeeAdultContent(user, ctx);
  const where = ["m.family_id = ?"];
  const args = [ctx.family.id];
  if (!adultOk) where.push("m.visibility = 'family'");
  if (filters.kind) {
    where.push("m.kind = ?");
    args.push(validEnum(filters.kind, KINDS, "Le type"));
  }
  if (filters.personId) {
    where.push("EXISTS (SELECT 1 FROM memory_person mp WHERE mp.memory_id = m.id AND mp.person_id = ?)");
    args.push(validId(filters.personId, "Personne"));
  }
  if (filters.albumId) {
    where.push("EXISTS (SELECT 1 FROM album_item ai WHERE ai.memory_id = m.id AND ai.album_id = ?)");
    args.push(validId(filters.albumId, "Album"));
  }
  if (filters.q) {
    where.push("(m.title LIKE ? OR m.description LIKE ? OR m.place LIKE ?)");
    const like = `%${filters.q}%`;
    args.push(like, like, like);
  }
  if (filters.year) {
    where.push("substr(m.happened_on, 1, 4) = ?");
    args.push(String(filters.year));
  }
  const rows = db
    .prepare(
      `SELECT m.* FROM memory m WHERE ${where.join(" AND ")}
       ORDER BY m.created_at DESC LIMIT 200`
    )
    .all(...args);
  return rows.map((r) => decorateMemory(db, r));
}

export function getMemoryDetail(user, ctx, memoryId) {
  const db = getDb();
  const mem = getMemoryVisible(user, ctx, memoryId);
  const media = db
    .prepare(
      `SELECT a.id, a.filename, a.mime_type, a.byte_size
       FROM media_asset a JOIN memory_media mm ON mm.media_id = a.id
       WHERE mm.memory_id = ? ORDER BY mm.ord`
    )
    .all(mem.id);
  const persons = db
    .prepare(
      `SELECT p.id, p.first_name, p.last_name FROM person p
       JOIN memory_person mp ON mp.person_id = p.id
       WHERE mp.memory_id = ?`
    )
    .all(mem.id);
  const events = db
    .prepare(
      `SELECT e.id, e.title, e.starts_at FROM event e
       JOIN event_participant ep ON ep.event_id = e.id
       JOIN memory_person mp ON mp.person_id = ep.person_id
       WHERE mp.memory_id = ? AND e.family_id = ?`
    )
    .all(mem.id, ctx.family.id);
  const comments = listComments(user, ctx, "memory", mem.id);
  return decorateMemory(db, { ...mem, media, persons, events, comments });
}

function decorateMemory(db, row) {
  const cover = db
    .prepare(
      `SELECT a.id, a.mime_type FROM media_asset a
       JOIN memory_media mm ON mm.media_id = a.id
       WHERE mm.memory_id = ? ORDER BY mm.ord LIMIT 1`
    )
    .get(row.id);
  return { ...row, coverMediaId: cover?.id || null, coverMime: cover?.mime_type || null };
}

export function addComment(user, ctx, targetType, targetId, body) {
  const db = getDb();
  if (targetType !== "memory" && targetType !== "person")
    throw httpError(400, "Type de commentaire invalide.");
  const text = requiredStr(body, "Le commentaire", 5000);
  if (targetType === "memory") {
    getMemoryVisible(user, ctx, targetId);
  } else {
    const p = db
      .prepare("SELECT id FROM person WHERE id = ? AND family_id = ?")
      .get(validId(targetId, "Personne"), ctx.family.id);
    if (!p) throw httpError(404, "Personne introuvable.");
  }
  const id = newId("com");
  db.prepare(
    "INSERT INTO comment (id, family_id, target_type, target_id, author_id, body) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, ctx.family.id, targetType, targetId, user.id, text);
  return { id };
}

export function listComments(user, ctx, targetType, targetId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.id, c.body, c.created_at, u.display_name AS author
       FROM comment c JOIN app_user u ON u.id = c.author_id
       WHERE c.family_id = ? AND c.target_type = ? AND c.target_id = ?
       ORDER BY c.created_at`
    )
    .all(ctx.family.id, targetType, targetType === "memory" ? validId(targetId) : validId(targetId));
}

export function deleteComment(user, ctx, commentId) {
  const db = getDb();
  const c = db
    .prepare("SELECT * FROM comment WHERE id = ? AND family_id = ?")
    .get(validId(commentId, "Commentaire"), ctx.family.id);
  if (!c) throw httpError(404, "Commentaire introuvable.");
  if (c.author_id !== user.id && ctx.role !== "admin")
    throw httpError(403, "Seul l'auteur ou un administrateur peut supprimer ce commentaire.");
  db.prepare("DELETE FROM comment WHERE id = ?").run(c.id);
  audit(ctx.family.id, user.id, "comment.delete", { commentId: c.id });
}
