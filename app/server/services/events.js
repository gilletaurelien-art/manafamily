// Agenda : événements, participants, anniversaires calculés depuis
// les dates de naissance (jamais dupliqués en base).

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit } from "../auth/auth.js";
import { optional, requiredStr, validDateTime, validId } from "../lib/validate.js";

export function createEvent(user, ctx, input) {
  const db = getDb();
  const id = newId("evt");
  const kind = input.kind === "reunion" ? "reunion" : "event";
  db.prepare(
    "INSERT INTO event (id, family_id, title, description, place, kind, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id, ctx.family.id,
    requiredStr(input.title, "Le titre", 200),
    optional(input.description, 5000),
    optional(input.place, 200),
    kind,
    validDateTime(input.starts_at, { allowEmpty: false }),
    validDateTime(input.ends_at),
    user.id
  );
  if (Array.isArray(input.person_ids)) attachParticipants(db, ctx, id, input.person_ids);
  audit(ctx.family.id, user.id, "event.create", { eventId: id });
  return { id };
}

function attachParticipants(db, ctx, eventId, personIds) {
  const stmt = db.prepare("INSERT OR IGNORE INTO event_participant (event_id, person_id) VALUES (?, ?)");
  for (const pid of personIds.slice(0, 100)) {
    const p = db
      .prepare("SELECT id FROM person WHERE id = ? AND family_id = ?")
      .get(validId(pid, "Personne"), ctx.family.id);
    if (!p) throw httpError(400, "Participant inconnu.");
    stmt.run(eventId, p.id);
  }
}

export function updateEvent(user, ctx, eventId, input) {
  const db = getDb();
  const ev = getEventChecked(ctx, eventId);
  db.prepare(
    "UPDATE event SET title = ?, description = ?, place = ?, kind = ?, starts_at = ?, ends_at = ? WHERE id = ?"
  ).run(
    requiredStr(input.title, "Le titre", 200),
    optional(input.description, 5000),
    optional(input.place, 200),
    input.kind === "reunion" ? "reunion" : "event",
    validDateTime(input.starts_at, { allowEmpty: false }),
    validDateTime(input.ends_at),
    ev.id
  );
  if (Array.isArray(input.person_ids)) {
    db.prepare("DELETE FROM event_participant WHERE event_id = ?").run(ev.id);
    attachParticipants(db, ctx, ev.id, input.person_ids);
  }
  audit(ctx.family.id, user.id, "event.update", { eventId: ev.id });
}

export function getEventChecked(ctx, eventId) {
  const ev = getDb()
    .prepare("SELECT * FROM event WHERE id = ? AND family_id = ?")
    .get(validId(eventId, "Événement"), ctx.family.id);
  if (!ev) throw httpError(404, "Événement introuvable.");
  return ev;
}

export function deleteEvent(user, ctx, eventId) {
  const db = getDb();
  const ev = getEventChecked(ctx, eventId);
  db.prepare("DELETE FROM event WHERE id = ?").run(ev.id);
  audit(ctx.family.id, user.id, "event.delete", { eventId: ev.id });
}

export function listEvents(user, ctx, { from, to } = {}) {
  const db = getDb();
  return db
    .prepare(
      `SELECT e.*, (
         SELECT GROUP_CONCAT(p.first_name || ' ' || COALESCE(p.last_name, ''), ', ')
         FROM event_participant ep JOIN person p ON p.id = ep.person_id
         WHERE ep.event_id = e.id
       ) AS participants
       FROM event e WHERE e.family_id = ?
       AND (? IS NULL OR e.starts_at >= ?) AND (? IS NULL OR e.starts_at <= ?)
       ORDER BY e.starts_at`
    )
    .all(ctx.family.id, from || null, from || null, to || null, to || null);
}

// Anniversaires : calculés à partir de person.birth_date, pour les
// 90 jours à venir. Pas de stockage, pas de duplication.
export function upcomingBirthdays(ctx, days = 90, limit = 30) {
  const db = getDb();
  const people = db
    .prepare("SELECT id, first_name, last_name, birth_date FROM person WHERE family_id = ? AND birth_date IS NOT NULL")
    .all(ctx.family.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out = [];
  for (const p of people) {
    const bd = new Date(p.birth_date + "T00:00:00");
    for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
      let next = new Date(bd);
      next.setFullYear(today.getFullYear() + yearOffset);
      if (next < today) continue;
      const diff = Math.round((next - today) / 86400_000);
      if (diff > days) continue;
      out.push({
        personId: p.id,
        name: `${p.first_name} ${p.last_name || ""}`.trim(),
        date: next.toISOString().slice(0, 10),
        age: next.getFullYear() - bd.getFullYear(),
        days,
      });
      break;
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}
