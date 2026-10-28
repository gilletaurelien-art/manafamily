// Stockage objet privé sur disque : data/uploads/<family_id>/<id>.<ext>
// Clés non devinables ; aucun fichier n'est servi statiquement — tout
// passe par le serveur qui vérifie l'autorisation.

import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../db/db.js";
import { httpError } from "./http.js";

const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// Types acceptés : images, vidéos, audio, documents. Pas d'exécutable.
const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["video/mp4", ".mp4"],
  ["video/quicktime", ".mov"],
  ["audio/mpeg", ".mp3"],
  ["audio/wav", ".wav"],
  ["audio/webm", ".weba"],
  ["audio/x-m4a", ".m4a"],
  ["application/pdf", ".pdf"],
  ["text/plain", ".txt"],
]);

export function extensionFor(mime, filename) {
  if (ALLOWED.has(mime)) return ALLOWED.get(mime);
  const ext = path.extname(filename || "").toLowerCase();
  for (const [m, e] of ALLOWED) if (e === ext) return e;
  throw httpError(415, "Type de fichier non autorisé (" + (mime || "inconnu") + ").");
}

export function saveObject(familyId, key, buffer) {
  // key est déjà de la forme <familyId>/<mediaId>.<ext>
  const full = safeJoin(UPLOAD_DIR, key);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buffer);
  return full;
}

function safeJoin(base, key) {
  const full = path.join(base, key);
  if (!full.startsWith(base + path.sep) && full !== base) throw httpError(403, "Accès refusé.");
  return full;
}

export function readObject(storageKey) {
  const full = safeJoin(UPLOAD_DIR, storageKey);
  try {
    return fs.readFileSync(full);
  } catch {
    throw httpError(404, "Fichier introuvable.");
  }
}

export function deleteObject(storageKey) {
  const full = path.join(UPLOAD_DIR, storageKey);
  if (full.startsWith(UPLOAD_DIR)) {
    try {
      fs.unlinkSync(full);
    } catch {
      /* déjà absent */
    }
  }
}

export function storageKeyFor(familyId, mediaId, ext) {
  return path.join(familyId, mediaId + ext);
}
