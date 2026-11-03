// Albums : collections ordonnées de souvenirs.

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit } from "../auth/auth.js";
import { optional, requiredStr, validId } from "../lib/validate.js";
import { listMemories } from "./memories.js";

export function createAlbum(user, ctx, input) {
  const db = getDb();
  const id = newId("alb");
  db.prepare("INSERT INTO album (id, family_id, title, description, created_by) VALUES (?, ?, ?, ?, ?)")
    .run(id, ctx.family.id, requiredStr(input.title, "Le titre", 200), optional(input.description, 2000), user.id);
  if (Array.isArray(input.memory_ids)) setItems(db, ctx, id, input.memory_ids);
  audit(ctx.family.id, user.id, "album.create", { albumId: id });
  return { id };
}

function setItems(db, ctx, albumId, memoryIds) {
  db.prepare("DELETE FROM album_item WHERE album_id = ?").run(albumId);
  const stmt = db.prepare("INSERT OR IGNORE INTO album_item (album_id, memory_id, ord) VALUES (?, ?, ?)");
  let ord = 0;
  for (const mid of memoryIds.slice(0, 500)) {
    const m = db
      .prepare("SELECT id FROM memory WHERE id = ? AND family_id = ?")
      .get(validId(mid, "Souvenir"), ctx.family.id);
    if (!m) throw httpError(400, "Souvenir inconnu dans l'album.");
    stmt.run(albumId, m.id, ord++);
  }
}

export function updateAlbum(user, ctx, albumId, input) {
  const db = getDb();
  const album = getAlbumChecked(ctx, albumId);
  db.prepare("UPDATE album SET title = ?, description = ? WHERE id = ?")
    .run(requiredStr(input.title, "Le titre", 200), optional(input.description, 2000), album.id);
  if (Array.isArray(input.memory_ids)) setItems(db, ctx, album.id, input.memory_ids);
  audit(ctx.family.id, user.id, "album.update", { albumId: album.id });
}

export function getAlbumChecked(ctx, albumId) {
  const album = getDb()
    .prepare("SELECT * FROM album WHERE id = ? AND family_id = ?")
    .get(validId(albumId, "Album"), ctx.family.id);
  if (!album) throw httpError(404, "Album introuvable.");
  return album;
}

export function deleteAlbum(user, ctx, albumId) {
  const db = getDb();
  const album = getAlbumChecked(ctx, albumId);
  db.prepare("DELETE FROM album WHERE id = ?").run(album.id);
  audit(ctx.family.id, user.id, "album.delete", { albumId: album.id });
}

export function listAlbums(ctx) {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM album_item i WHERE i.album_id = a.id) AS item_count
       FROM album a WHERE a.family_id = ? ORDER BY a.created_at DESC`
    )
    .all(ctx.family.id);
}

export function getAlbumDetail(user, ctx, albumId) {
  const db = getDb();
  const album = getAlbumChecked(ctx, albumId);
  const items = listMemories(user, ctx, { albumId: album.id });
  return { ...album, items };
}
