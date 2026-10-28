// Accueil : publications, derniers souvenirs, anniversaires, anciens
// souvenirs à redécouvrir. Aucune donnée simulée : état vide accueillant.

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit, canSeeAdultContent } from "../auth/auth.js";
import { requiredStr } from "../lib/validate.js";
import { listMemories } from "./memories.js";
import { upcomingBirthdays } from "./events.js";

export function createPost(user, ctx, body) {
  const db = getDb();
  const id = newId("pst");
  db.prepare("INSERT INTO post (id, family_id, author_id, body) VALUES (?, ?, ?, ?)")
    .run(id, ctx.family.id, user.id, requiredStr(body, "Le message", 3000));
  return { id };
}

export function listPosts(ctx, limit = 20) {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.id, p.body, p.created_at, u.display_name AS author
       FROM post p JOIN app_user u ON u.id = p.author_id
       WHERE p.family_id = ? ORDER BY p.created_at DESC LIMIT ?`
    )
    .all(ctx.family.id, limit);
}

export function deletePost(user, ctx, postId) {
  const db = getDb();
  const p = db
    .prepare("SELECT * FROM post WHERE id = ? AND family_id = ?")
    .get(postId, ctx.family.id);
  if (!p) throw httpError(404, "Publication introuvable.");
  if (p.author_id !== user.id && ctx.role !== "admin")
    throw httpError(403, "Seul l'auteur ou un administrateur peut supprimer cette publication.");
  db.prepare("DELETE FROM post WHERE id = ?").run(p.id);
}

export function homeFeed(user, ctx) {
  const recent = listMemories(user, ctx, {}).slice(0, 6);
  const older = getOlderMemories(user, ctx);
  return {
    posts: listPosts(ctx),
    recentMemories: recent,
    olderMemory: older,
    birthdays: upcomingBirthdays(ctx, 90, 5),
    upcomingEvents: getUpcomingEvents(ctx),
    isEmpty: recent.length === 0 && listPosts(ctx).length === 0,
  };
}

function getOlderMemories(user, ctx) {
  const db = getDb();
  const adultOk = canSeeAdultContent(user, ctx);
  const rows = db
    .prepare(
      `SELECT * FROM memory
       WHERE family_id = ? AND draft = 0 ${adultOk ? "" : "AND visibility = 'family'"}
         AND happened_on IS NOT NULL AND happened_on < date('now', '-3 years')
       ORDER BY RANDOM() LIMIT 1`
    )
    .all(ctx.family.id);
  return rows[0] || null;
}

function getUpcomingEvents(ctx) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, title, starts_at, place FROM event
       WHERE family_id = ? AND starts_at >= datetime('now')
       ORDER BY starts_at LIMIT 5`
    )
    .all(ctx.family.id);
}
