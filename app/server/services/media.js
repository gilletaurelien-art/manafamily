// Médias : téléversement réel (multipart), stockage privé, accès
// autorisé uniquement. Les fichiers ne sont jamais servis en statique.

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit } from "../auth/auth.js";
import {
  extensionFor, saveObject, readObject, deleteObject, storageKeyFor,
  MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES, MAX_IMPORT_FILES,
} from "../lib/storage.js";
import { validId } from "../lib/validate.js";
import { getMemoryVisible, createMemory, deleteMemory } from "./memories.js";

export function uploadToMemory(user, ctx, memoryId, file, maxBytes = MAX_UPLOAD_BYTES) {
  const db = getDb();
  getMemoryVisible(user, ctx, memoryId);
  if (!file || !file.data || !file.data.length) throw httpError(400, "Fichier manquant.");
  if (file.data.length > maxBytes)
    throw httpError(413, `Fichier trop volumineux (max ${Math.round(maxBytes / 1024 / 1024)} Mo).`);
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

// Import en lot : un fichier = un souvenir (titre déduit du nom de fichier,
// type déduit du type MIME). Réussite partielle assumée — un fichier refusé
// ne doit jamais faire échouer les autres (T4 : repli honnête, ailleurs dans
// MANAvibe — même esprit ici : importer ce qui marche, dire clairement ce
// qui n'a pas marché).
export function importMedia(user, ctx, files) {
  if (!Array.isArray(files) || !files.length) throw httpError(400, "Aucun fichier à importer.");
  if (files.length > MAX_IMPORT_FILES) throw httpError(413, `Trop de fichiers à la fois (max ${MAX_IMPORT_FILES}).`);
  const created = [];
  const failed = [];
  for (const file of files) {
    let memoryId = null;
    try {
      const kind = kindFromMime(file?.contentType);
      if (!kind) throw httpError(415, "Type de fichier non reconnu — photo, vidéo ou audio uniquement.");
      const maxBytes = kind === "video" ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES;
      memoryId = createMemory(user, ctx, { title: titleFromFilename(file.filename), kind }).id;
      const asset = uploadToMemory(user, ctx, memoryId, file, maxBytes);
      created.push({ memoryId, kind, filename: asset.filename, byteSize: asset.byteSize });
    } catch (e) {
      // L'envoi a échoué après la création du souvenir : pas de fiche fantôme sans média.
      if (memoryId) deleteMemory(user, ctx, memoryId);
      failed.push({ filename: file?.filename || "fichier", error: e.message || "Erreur inconnue." });
    }
  }
  return { created, failed };
}

function kindFromMime(mime) {
  if (typeof mime !== "string") return null;
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

function titleFromFilename(name) {
  const base = String(name || "").replace(/\.[^./\\]+$/, "").trim();
  return base ? base.slice(0, 300) : "Souvenir importé";
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
