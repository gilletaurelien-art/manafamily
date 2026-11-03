// Familles : création, membres, invitations.

import { getDb, newId } from "../db/db.js";
import { httpError, randomToken } from "../lib/http.js";
import { audit } from "../auth/auth.js";
import { validEmail, requiredStr } from "../lib/validate.js";

const INVITATION_DAYS = 14;

export function createFamily(user, name) {
  const db = getDb();
  const id = newId("fam");
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO family (id, name, created_by) VALUES (?, ?, ?)").run(id, name, user.id);
    db.prepare("INSERT INTO family_membership (id, family_id, user_id, role, status) VALUES (?, ?, ?, 'admin', 'active')")
      .run(newId("mem"), id, user.id);
    db.prepare(
      "INSERT INTO notification_preference (user_id, family_id) VALUES (?, ?)"
    ).run(user.id, id);
  });
  tx();
  audit(id, user.id, "family.create", { name });
  return { id, name };
}

export function listMembers(ctx) {
  return getDb()
    .prepare(
      `SELECT m.id, u.display_name, u.email, m.role, m.status, m.created_at
       FROM family_membership m JOIN app_user u ON u.id = m.user_id
       WHERE m.family_id = ? ORDER BY m.created_at`
    )
    .all(ctx.family.id);
}

export function createInvitation(user, ctx, email, role) {
  if (role !== "member" && role !== "admin") throw httpError(400, "Rôle invalide.");
  const db = getDb();
  const token = randomToken(24);
  const expires = new Date(Date.now() + INVITATION_DAYS * 86400_000).toISOString();
  db.prepare(
    "INSERT INTO family_invitation (token, family_id, email, role, invited_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(token, ctx.family.id, email, role, user.id, expires);
  audit(ctx.family.id, user.id, "invitation.create", { email, role });
  return { token, expires, url: `/rejoindre?token=${token}` };
}

export function listInvitations(ctx) {
  return getDb()
    .prepare(
      `SELECT token, email, role, expires_at, accepted_at, revoked_at
       FROM family_invitation WHERE family_id = ?
       ORDER BY created_at DESC`
    )
    .all(ctx.family.id);
}

export function revokeInvitation(user, ctx, token) {
  const db = getDb();
  const inv = db
    .prepare("SELECT * FROM family_invitation WHERE token = ? AND family_id = ?")
    .get(token, ctx.family.id);
  if (!inv) throw httpError(404, "Invitation introuvable.");
  if (inv.accepted_at) throw httpError(400, "Invitation déjà acceptée.");
  db.prepare("UPDATE family_invitation SET revoked_at = datetime('now') WHERE token = ?").run(token);
  audit(ctx.family.id, user.id, "invitation.revoke", { token });
}

export function acceptInvitation(user, token) {
  const db = getDb();
  const inv = db.prepare("SELECT * FROM family_invitation WHERE token = ?").get(token);
  if (!inv) throw httpError(404, "Invitation introuvable.");
  if (inv.revoked_at) throw httpError(400, "Cette invitation a été révoquée.");
  if (inv.accepted_at) throw httpError(400, "Cette invitation a déjà été utilisée.");
  if (new Date(inv.expires_at).getTime() < Date.now()) throw httpError(400, "Cette invitation a expiré.");
  const tx = db.transaction(() => {
    const existing = db
      .prepare("SELECT id FROM family_membership WHERE family_id = ? AND user_id = ?")
      .get(inv.family_id, user.id);
    if (existing) {
      db.prepare("UPDATE family_membership SET status = 'active' WHERE id = ?").run(existing.id);
    } else {
      db.prepare(
        "INSERT INTO family_membership (id, family_id, user_id, role, status) VALUES (?, ?, ?, ?, 'active')"
      ).run(newId("mem"), inv.family_id, user.id, inv.role);
      db.prepare("INSERT OR IGNORE INTO notification_preference (user_id, family_id) VALUES (?, ?)")
        .run(user.id, inv.family_id);
    }
    db.prepare("UPDATE family_invitation SET accepted_at = datetime('now') WHERE token = ?").run(token);
  });
  tx();
  audit(inv.family_id, user.id, "invitation.accept", {});
  return { familyId: inv.family_id };
}

export function changeMemberRole(user, ctx, membershipId, role) {
  if (!["admin", "member"].includes(role)) throw httpError(400, "Rôle invalide.");
  const db = getDb();
  const m = db
    .prepare("SELECT * FROM family_membership WHERE id = ? AND family_id = ?")
    .get(membershipId, ctx.family.id);
  if (!m) throw httpError(404, "Membre introuvable.");
  if (m.user_id === user.id) throw httpError(400, "Vous ne pouvez pas modifier votre propre rôle.");
  db.prepare("UPDATE family_membership SET role = ? WHERE id = ?").run(role, membershipId);
  audit(ctx.family.id, user.id, "member.role", { membershipId, role });
}

export function removeMember(user, ctx, membershipId) {
  const db = getDb();
  const m = db
    .prepare("SELECT * FROM family_membership WHERE id = ? AND family_id = ?")
    .get(membershipId, ctx.family.id);
  if (!m) throw httpError(404, "Membre introuvable.");
  if (m.user_id === user.id) throw httpError(400, "Utilisez « Quitter la famille ».");
  db.prepare("UPDATE family_membership SET status = 'left' WHERE id = ?").run(membershipId);
  audit(ctx.family.id, user.id, "member.remove", { membershipId });
}

export function leaveFamily(user, ctx) {
  const db = getDb();
  db.prepare("UPDATE family_membership SET status = 'left' WHERE family_id = ? AND user_id = ?")
    .run(ctx.family.id, user.id);
  audit(ctx.family.id, user.id, "member.leave", {});
}
