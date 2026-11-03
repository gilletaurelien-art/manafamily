// Personnes et relations familiales. L'arbre est dérivé des
// relations enregistrées — jamais l'inverse. Aucune parenté
// n'est déduite automatiquement (ni par nom, ni par ressemblance).

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { audit } from "../auth/auth.js";
import { optional, requiredStr, validDate, validId } from "../lib/validate.js";

export function createPerson(user, ctx, input) {
  const db = getDb();
  const id = newId("per");
  db.prepare(
    `INSERT INTO person (id, family_id, first_name, last_name, birth_date, death_date, biography, is_child, visibility, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, ctx.family.id,
    requiredStr(input.first_name, "Le prénom"),
    optional(input.last_name, 100),
    validDate(input.birth_date),
    validDate(input.death_date),
    optional(input.biography, 10000),
    input.is_child ? 1 : 0,
    input.visibility === "adults" ? "adults" : "family",
    user.id
  );
  audit(ctx.family.id, user.id, "person.create", { personId: id });
  return { id };
}

export function updatePerson(user, ctx, personId, input) {
  const db = getDb();
  const person = getPersonChecked(ctx, personId);
  db.prepare(
    `UPDATE person SET first_name = ?, last_name = ?, birth_date = ?, death_date = ?,
     biography = ?, is_child = ?, visibility = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    requiredStr(input.first_name, "Le prénom"),
    optional(input.last_name, 100),
    validDate(input.birth_date),
    validDate(input.death_date),
    optional(input.biography, 10000),
    input.is_child ? 1 : 0,
    input.visibility === "adults" ? "adults" : "family",
    person.id
  );
  audit(ctx.family.id, user.id, "person.update", { personId: person.id });
}

export function getPersonChecked(ctx, personId) {
  const db = getDb();
  const person = db
    .prepare("SELECT * FROM person WHERE id = ? AND family_id = ?")
    .get(validId(personId, "Personne"), ctx.family.id);
  if (!person) throw httpError(404, "Personne introuvable.");
  return person;
}

export function deletePerson(user, ctx, personId) {
  const db = getDb();
  const person = getPersonChecked(ctx, personId);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM person WHERE id = ?").run(person.id);
  });
  tx();
  audit(ctx.family.id, user.id, "person.delete", { personId: person.id });
}

export function listPeople(ctx) {
  return getDb()
    .prepare("SELECT * FROM person WHERE family_id = ? ORDER BY birth_date IS NULL, birth_date, first_name")
    .all(ctx.family.id);
}

export function createRelationship(user, ctx, input) {
  const db = getDb();
  const from = getPersonChecked(ctx, validId(input.from_person_id, "Personne source"));
  const to = getPersonChecked(ctx, validId(input.to_person_id, "Personne cible"));
  const kind = input.kind === "partner" ? "partner" : "parent";
  const id = newId("rel");
  db.prepare(
    "INSERT INTO family_relationship (id, family_id, kind, from_person_id, to_person_id) VALUES (?, ?, ?, ?, ?)"
  ).run(id, ctx.family.id, kind, from.id, to.id);
  audit(ctx.family.id, user.id, "relationship.create", { id, kind });
  return { id };
}

export function deleteRelationship(user, ctx, relationshipId) {
  const db = getDb();
  const rel = db
    .prepare("SELECT * FROM family_relationship WHERE id = ? AND family_id = ?")
    .get(validId(relationshipId, "Relation"), ctx.family.id);
  if (!rel) throw httpError(404, "Relation introuvable.");
  db.prepare("DELETE FROM family_relationship WHERE id = ?").run(rel.id);
  audit(ctx.family.id, user.id, "relationship.delete", { relationshipId: rel.id });
}

// Arbre généalogique navigable, dérivé des relations. Génération 0 :
// personnes sans parents enregistrés (racines). Chaque nœud porte
// ses partenaires et ses enfants (via relations parent → enfant).
export function getTree(ctx) {
  const db = getDb();
  const people = listPeople(ctx);
  const rels = db
    .prepare("SELECT kind, from_person_id, to_person_id FROM family_relationship WHERE family_id = ?")
    .all(ctx.family.id);

  const byId = new Map(people.map((p) => [p.id, { ...p, parents: [], children: [], partners: [] }]));
  for (const r of rels) {
    const from = byId.get(r.from_person_id);
    const to = byId.get(r.to_person_id);
    if (!from || !to) continue;
    if (r.kind === "parent") {
      to.parents.push(from.id);
      from.children.push(to.id);
    } else {
      from.partners.push(to.id);
      to.partners.push(from.id);
    }
  }

  // Génération par plus long chemin de racines.
  const generation = new Map();
  function gen(id, depth) {
    const node = byId.get(id);
    const current = generation.get(id);
    if (current === undefined || depth < current) {
      generation.set(id, depth);
      for (const childId of node.children) gen(childId, depth + 1);
    }
  }
  for (const p of byId.values()) if (!p.parents.length) gen(p.id, 0);
  for (const p of byId.values()) if (!generation.has(p.id)) generation.set(p.id, 0);

  const nodes = [...byId.values()].map((n) => ({
    id: n.id,
    firstName: n.first_name,
    lastName: n.last_name,
    birthDate: n.birth_date,
    deathDate: n.death_date,
    isChild: !!n.is_child,
    generation: generation.get(n.id),
    parents: n.parents,
    children: n.children,
    partners: n.partners,
  }));
  return { nodes };
}

// Générations groupées (affichage par rangée).
export function getGenerations(ctx) {
  const tree = getTree(ctx);
  const byGen = new Map();
  for (const n of tree.nodes) {
    if (!byGen.has(n.generation)) byGen.set(n.generation, []);
    byGen.get(n.generation).push(n);
  }
  return [...byGen.entries()].sort((a, b) => a[0] - b[0]).map(([gen, nodes]) => ({
    generation: gen,
    people: nodes.map(({ id, firstName, lastName, birthDate, deathDate }) => ({
      id, firstName, lastName, birthDate, deathDate,
    })),
  }));
}

export function linkUser(user, ctx, personId, targetUserId) {
  const db = getDb();
  const person = getPersonChecked(ctx, personId);
  if (targetUserId) {
    const member = db
      .prepare("SELECT 1 FROM family_membership WHERE family_id = ? AND user_id = ? AND status = 'active'")
      .get(ctx.family.id, targetUserId);
    if (!member) throw httpError(400, "Cet utilisateur n'est pas membre de la famille.");
    db.prepare("UPDATE person SET linked_user_id = ? WHERE id = ?").run(targetUserId, person.id);
  } else {
    db.prepare("UPDATE person SET linked_user_id = NULL WHERE id = ?").run(person.id);
  }
  audit(ctx.family.id, user.id, "person.linkUser", { personId: person.id });
}
