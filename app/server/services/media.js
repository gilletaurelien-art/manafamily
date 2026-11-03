// Médias : téléversement réel (multipart), stockage privé, accès
// autorisé uniquement. Les fichiers ne sont jamais servis en statique.

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit } from "../auth/auth.js";
import { extensionFor, saveObject, readObject, deleteObject, storageKeyFor, MAX_UPLOAD_BYTES } from "../lib/storage.js";
import { validId } from "../lib/validate.js";
import { getMemoryVisible } from "./memories.js";

export function uploadToMemory(user, ctx, memoryId, file) {
  const db = getDb();
  getMemoryVisible(user, ctx, memoryId);
  if (!file || !file.data || !file.data.length) throw httpError(400, "Fichier manquant.");
  if (file.data.length > MAX_UPLOAD_BYTES)
    throw httpError(413, "Fichier trop volumineux (max 50 Mo).");
  const ext = extensionFor(file.contentType, file.filename);
  const mediaId = newId("med");
  const storageKey = storageKeyFor(ctx.family.id, mediaId, ext);
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO media_asset (id, family_id, uploader_id, storage_key, filename, mime_type, byte_size) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(mediaId, ctx.family.id, user.id, storageKey, sanitizeName(file.filename), file.contentType || "application/octet-stream", file.data.length);
    const ord = db
      .prepare("SELECT COALESCE(MAX(ord), -1) + 1 AS o FROM memory_media WHERE memory_id = ?")
      .get(memoryId).o;
    db.prepare("INSERT INTO memory_media (memory_id, media_id, ord) VALUES (?, ?, ?)")
      .run(memoryId, mediaId, ord);
  });
  tx();
  saveObject(ctx.family.id, storageKey, file.data);
  audit(ctx.family.id, user.id, "media.upload", { mediaId, memoryId });
  return { id: mediaId, filename: sanitizeName(file.filename), byteSize: file.data.length };
}

function sanitizeName(name) {
  return (name || "fichier").replace(/[^\w\-. ]+/g, "_").slice(0, 200);
}

export function getMediaChecked(ctx, mediaId) {
  const db = getDb();
  const asset = db
    .prepare("SELECT * FROM media_asset WHERE id = ? AND family_id = ?")
    .get(validId(mediaId, "Média"), ctx.family.id);
  if (!asset) throw httpError(404, "Média introuvable.");
  return asset;
}

export function readMedia(user, ctx, mediaId) {
  const asset = getMediaChecked(ctx, mediaId);
  const data = readObject(asset.storage_key);
  return { data, mime: asset.mime_type, filename: asset.filename, size: asset.byte_size };
}

export function deleteMedia(user, ctx, mediaId) {
  const db = getDb();
  const asset = getMediaChecked(ctx, mediaId);
  db.prepare("DELETE FROM media_asset WHERE id = ?").run(asset.id);
  deleteObject(asset.storage_key);
  audit(ctx.family.id, user.id, "media.delete", { mediaId: asset.id });
}
