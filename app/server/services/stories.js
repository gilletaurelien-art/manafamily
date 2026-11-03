// Récits (story) : textes familiaux modifiables, références vers
// leurs sources (souvenirs, personnes). Les sources sont
// conservées — un récit n'est jamais une copie détachée.

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit } from "../auth/auth.js";
import { optional, requiredStr, validDate, validId } from "../lib/validate.js";

export function createStory(user, ctx, input) {
  const db = getDb();
  const id = newId("sto");
  db.prepare(
    "INSERT INTO story (id, family_id, title, body, period_start, period_end, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id, ctx.family.id,
    requiredStr(input.title, "Le titre", 300),
    requiredStr(input.body, "Le récit", 100000),
    validDate(input.period_start),
    validDate(input.period_end),
    user.id
  );
  if (Array.isArray(input.sources)) attachSources(db, ctx, id, input.sources);
  audit(ctx.family.id, user.id, "story.create", { storyId: id });
  return { id };
}

function attachSources(db, ctx, storyId, sources) {
  db.prepare("DELETE FROM story_source WHERE story_id = ?").run(storyId);
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO story_source (story_id, source_type, source_id, ord) VALUES (?, ?, ?, ?)"
  );
  let ord = 0;
  for (const s of sources.slice(0, 200)) {
    if (s.type !== "memory" && s.type !== "person") throw httpError(400, "Type de source invalide.");
    const row = db
      .prepare(`SELECT id FROM ${s.type === "memory" ? "memory" : "person"} WHERE id = ? AND family_id = ?`)
      .get(validId(s.id, "Source"), ctx.family.id);
    if (!row) throw httpError(400, "Source inconnue.");
    stmt.run(storyId, s.type, row.id, ord++);
  }
}

export function updateStory(user, ctx, storyId, input) {
  const db = getDb();
  const story = getStoryChecked(ctx, storyId);
  db.prepare(
    "UPDATE story SET title = ?, body = ?, period_start = ?, period_end = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    requiredStr(input.title, "Le titre", 300),
    requiredStr(input.body, "Le récit", 100000),
    validDate(input.period_start),
    validDate(input.period_end),
    story.id
  );
  if (Array.isArray(input.sources)) attachSources(db, ctx, story.id, input.sources);
  audit(ctx.family.id, user.id, "story.update", { storyId: story.id });
}

export function getStoryChecked(ctx, storyId) {
  const story = getDb()
    .prepare("SELECT * FROM story WHERE id = ? AND family_id = ?")
    .get(validId(storyId, "Récit"), ctx.family.id);
  if (!story) throw httpError(404, "Récit introuvable.");
  return story;
}

export function deleteStory(user, ctx, storyId) {
  const db = getDb();
  const story = getStoryChecked(ctx, storyId);
  db.prepare("DELETE FROM story WHERE id = ?").run(story.id);
  audit(ctx.family.id, user.id, "story.delete", { storyId: story.id });
}

export function listStories(ctx) {
  return getDb()
    .prepare("SELECT id, title, period_start, period_end, updated_at FROM story WHERE family_id = ? ORDER BY updated_at DESC")
    .all(ctx.family.id);
}

export function getStoryDetail(ctx, storyId) {
  const db = getDb();
  const story = getStoryChecked(ctx, storyId);
  const sources = db
    .prepare(
      `SELECT ss.source_type, ss.source_id, ss.ord,
              CASE ss.source_type WHEN 'memory' THEN m.title ELSE p.first_name || ' ' || COALESCE(p.last_name, '') END AS label
       FROM story_source ss
       LEFT JOIN memory m ON m.id = ss.source_id AND ss.source_type = 'memory'
       LEFT JOIN person p ON p.id = ss.source_id AND ss.source_type = 'person'
       WHERE ss.story_id = ? ORDER BY ss.ord`
    )
    .all(story.id);
  return { ...story, sources };
}
