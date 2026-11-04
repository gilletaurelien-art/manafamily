// Le rituel hebdomadaire : MANA pose une question, la famille répond en
// réutilisant les chemins existants — un souvenir (+ upload audio), et
// pour une question « chanson », une entrée MANAvibe. Ce fichier ne fait
// que l'orchestration : qui doit recevoir quoi, et quand ; il ne réécrit
// ni la création de souvenir, ni l'upload, ni les chansons.

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit } from "../auth/auth.js";
import { validId } from "../lib/validate.js";
import { getMemoryVisible } from "./memories.js";

const DELAI_JOURS = 7;

// La prochaine question pour cette famille : d'abord une jamais posée,
// sinon la plus ancienne qui lui a déjà été posée (on recommence le
// cycle plutôt que de s'arrêter une fois le jeu épuisé).
function choisirProchaineQuestion(db, familyId) {
  const neuve = db
    .prepare(
      `SELECT p.id, p.text, p.category FROM prompt p
        WHERE p.active = 1
          AND NOT EXISTS (SELECT 1 FROM prompt_delivery pd WHERE pd.family_id = ? AND pd.prompt_id = p.id)
        ORDER BY p.rowid ASC LIMIT 1`
    )
    .get(familyId);
  if (neuve) return neuve;

  return db
    .prepare(
      `SELECT p.id, p.text, p.category FROM prompt p
        JOIN prompt_delivery pd ON pd.prompt_id = p.id AND pd.family_id = ?
        WHERE p.active = 1
        ORDER BY pd.delivered_at ASC LIMIT 1`
    )
    .get(familyId);
}

// Calculée à la lecture, pas par une tâche planifiée : la première
// requête qui arrive après le délai déclenche la livraison suivante.
export function ensureCurrentPrompt(ctx) {
  const db = getDb();
  const derniere = db
    .prepare(
      `SELECT pd.*, p.text, p.category FROM prompt_delivery pd
        JOIN prompt p ON p.id = pd.prompt_id
        WHERE pd.family_id = ? ORDER BY pd.delivered_at DESC LIMIT 1`
    )
    .get(ctx.family.id);

  const delaiEcoule =
    !derniere ||
    db.prepare(`SELECT datetime(?, '+${DELAI_JOURS} days') <= datetime('now') AS du`).get(derniere.delivered_at).du;

  if (!delaiEcoule) return formaterLivraison(derniere);

  const question = choisirProchaineQuestion(db, ctx.family.id);
  if (!question) return null; // aucune question active : rien à livrer

  const id = newId("prd");
  db.prepare("INSERT INTO prompt_delivery (id, family_id, prompt_id) VALUES (?, ?, ?)").run(
    id,
    ctx.family.id,
    question.id
  );
  const livraison = db.prepare("SELECT * FROM prompt_delivery WHERE id = ?").get(id);
  return formaterLivraison({ ...livraison, text: question.text, category: question.category });
}

function formaterLivraison(row) {
  return {
    id: row.id,
    text: row.text,
    category: row.category,
    delivered_at: row.delivered_at,
    answered_at: row.answered_at || null,
    memory_id: row.memory_id || null,
    song_id: row.song_id || null,
  };
}

// Répondre réutilise un souvenir et, pour une question « chanson », une
// chanson déjà créés par les chemins MANAvibe/souvenirs normaux — cette
// fonction se contente de les lier à la question et de clore la livraison.
export function answerPrompt(user, ctx, deliveryId, { memoryId, songId } = {}) {
  const db = getDb();
  const livraison = db
    .prepare("SELECT * FROM prompt_delivery WHERE id = ? AND family_id = ?")
    .get(validId(deliveryId, "Livraison"), ctx.family.id);
  if (!livraison) throw httpError(404, "Question introuvable.");

  const memory = getMemoryVisible(user, ctx, validId(memoryId, "Souvenir"));

  let resolvedSongId = null;
  if (songId) {
    const song = db.prepare("SELECT id FROM song WHERE id = ? AND family_id = ?").get(validId(songId, "Chanson"), ctx.family.id);
    if (!song) throw httpError(404, "Chanson introuvable.");
    resolvedSongId = song.id;
  }

  db.prepare("UPDATE prompt_delivery SET answered_at = datetime('now'), memory_id = ?, song_id = ? WHERE id = ?").run(
    memory.id,
    resolvedSongId,
    livraison.id
  );
  audit(ctx.family.id, user.id, "rituel.answer", { deliveryId: livraison.id, memoryId: memory.id, songId: resolvedSongId });

  const updated = db.prepare("SELECT pd.*, p.text, p.category FROM prompt_delivery pd JOIN prompt p ON p.id = pd.prompt_id WHERE pd.id = ?").get(livraison.id);
  return formaterLivraison(updated);
}

export function listHistory(ctx) {
  const db = getDb();
  return db
    .prepare(
      `SELECT pd.id, pd.delivered_at, pd.answered_at, pd.memory_id, pd.song_id, p.text, p.category
         FROM prompt_delivery pd JOIN prompt p ON p.id = pd.prompt_id
        WHERE pd.family_id = ? ORDER BY pd.delivered_at DESC LIMIT 100`
    )
    .all(ctx.family.id)
    .map(formaterLivraison);
}
