// Livres de famille : composition d'un livre depuis des contenus
// réels (sélection de souvenirs, personnes, période), prévisualisation
// modifiable, export PDF. Les références sources sont conservées.

import { getDb } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { canSeeAdultContent } from "../auth/auth.js";
import { validId } from "../lib/validate.js";
import { renderBook } from "../lib/pdf.js";
import { readObject } from "../lib/storage.js";

export function buildBook(user, ctx, spec) {
  const db = getDb();
  const adultOk = canSeeAdultContent(user, ctx);
  const personFilter = Array.isArray(spec.personIds) && spec.personIds.length
    ? spec.personIds.map((p) => validId(p, "Personne"))
    : null;

  let where = ["m.family_id = ?", "m.draft = 0"];
  const args = [ctx.family.id];
  if (!adultOk) where.push("m.visibility = 'family'");
  if (spec.periodStart) {
    where.push("m.happened_on IS NOT NULL AND m.happened_on >= ?");
    args.push(spec.periodStart);
  }
  if (spec.periodEnd) {
    where.push("m.happened_on IS NOT NULL AND m.happened_on <= ?");
    args.push(spec.periodEnd);
  }
  if (personFilter) {
    where.push(
      `EXISTS (SELECT 1 FROM memory_person mp WHERE mp.memory_id = m.id AND mp.person_id IN (${personFilter.map(() => "?").join(",")}))`
    );
    args.push(...personFilter);
  }
  if (Array.isArray(spec.memoryIds) && spec.memoryIds.length) {
    where.push(`m.id IN (${spec.memoryIds.map(() => "?").join(",")})`);
    args.push(...spec.memoryIds.map((m) => validId(m, "Souvenir")));
  }

  const memories = db
    .prepare(`SELECT m.* FROM memory m WHERE ${where.join(" AND ")} ORDER BY m.happened_on IS NULL, m.happened_on, m.created_at`)
    .all(...args);

  if (!memories.length) {
    throw httpError(400, "Aucun souvenir ne correspond à cette sélection — ajoutez des souvenirs avant de composer un livre.");
  }

  const sections = memories.map((m) => {
    const persons = db
      .prepare(
        `SELECT p.first_name || ' ' || COALESCE(p.last_name, '') AS name FROM person p
         JOIN memory_person mp ON mp.person_id = p.id WHERE mp.memory_id = ?`
      )
      .all(m.id)
      .map((r) => r.name.trim());
    const image = firstJpeg(db, m.id);
    return {
      title: m.title,
      date: m.happened_on ? `Le ${m.happened_on.split("-").reverse().join("/")}` : null,
      body: [m.description || "", m.place ? `Lieu : ${m.place}` : ""].filter(Boolean).join("\n\n"),
      sources: [
        ...(persons.length ? [`Personnes : ${persons.join(", ")}`] : []),
        "Souvenir familial MANAfamily",
      ],
      image,
    };
  });

  const subtitleBits = [];
  if (spec.periodStart) subtitleBits.push(`de ${spec.periodStart}`);
  if (spec.periodEnd) subtitleBits.push(`à ${spec.periodEnd}`);
  if (personFilter) {
    const names = personFilter
      .map((pid) => {
        const p = db.prepare("SELECT first_name, last_name FROM person WHERE id = ?").get(pid);
        return p ? `${p.first_name} ${p.last_name || ""}`.trim() : null;
      })
      .filter(Boolean);
    if (names.length) subtitleBits.push(`autour de ${names.join(", ")}`);
  }

  return {
    familyName: ctx.family.name,
    title: spec.title,
    subtitle: subtitleBits.join(" "),
    sections,
  };
}

function firstJpeg(db, memoryId) {
  const asset = db
    .prepare(
      `SELECT a.storage_key FROM media_asset a
       JOIN memory_media mm ON mm.media_id = a.id
       WHERE mm.memory_id = ? AND a.mime_type = 'image/jpeg'
       ORDER BY mm.ord LIMIT 1`
    )
    .get(memoryId);
  if (!asset) return null;
  try {
    return readObject(asset.storage_key);
  } catch {
    return null;
  }
}

// Prévisualisation (JSON, modifiable côté client avant export).
export function previewBook(user, ctx, spec) {
  const book = buildBook(user, ctx, spec);
  return {
    ...book,
    sections: book.sections.map((s) => ({ ...s, image: s.image ? { present: true } : null })),
  };
}

export function exportBookPdf(user, ctx, spec) {
  const book = buildBook(user, ctx, spec);
  return renderBook(book);
}
