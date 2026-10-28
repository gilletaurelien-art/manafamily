// Authentification et autorisation : sessions, contexte famille,
// vérification systématique de l'appartenance et du rôle.

import { getDb, newId } from "../db/db.js";
import { hashToken } from "../lib/password.js";
import { httpError, parseCookies, randomToken, sessionCookie as sessionCookieBase, clearSessionCookie as clearSessionCookieBase } from "../lib/http.js";

const SESSION_DAYS = 30;

export function createSession(userId) {
  const db = getDb();
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  db.prepare("INSERT INTO auth_session (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), userId, expires);
  return { token, expires };
}

export function destroySession(token) {
  if (!token) return;
  getDb().prepare("DELETE FROM auth_session WHERE token_hash = ?").run(hashToken(token));
}

export function getUserByToken(token) {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.display_name, s.expires_at
       FROM auth_session s JOIN app_user u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(hashToken(token));
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM auth_session WHERE token_hash = ?").run(hashToken(token));
    return null;
  }
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export function readSessionToken(req) {
  return parseCookies(req).mfs || null;
}

export function sessionCookieFor(token) {
  return sessionCookieBase(token, SESSION_DAYS * 86400);
}

export { clearSessionCookieBase as clearSessionCookie };

// Contexte d'autorisation : utilisateur + famille active (cookie
// mf_family ou première famille). Aucune donnée n'est lisible sans
// appartenance active à la famille propriétaire.
export function requireUser(req) {
  const user = getUserByToken(readSessionToken(req));
  if (!user) throw httpError(401, "Connexion requise.");
  return user;
}

export function getFamilyContext(user, req) {
  const db = getDb();
  const memberships = db
    .prepare(
      `SELECT m.family_id, m.role, f.name AS family_name
       FROM family_membership m JOIN family f ON f.id = m.family_id
       WHERE m.user_id = ? AND m.status = 'active'
       ORDER BY m.created_at`
    )
    .all(user.id);
  if (!memberships.length) return { memberships: null, family: null, role: null };

  const wanted = parseCookies(req).mf_family;
  const current = memberships.find((m) => m.family_id === wanted) || memberships[0];
  return {
    memberships,
    family: { id: current.family_id, name: current.family_name },
    role: current.role,
  };
}

export function requireFamily(user, req) {
  const ctx = getFamilyContext(user, req);
  if (!ctx.family) throw httpError(403, "Aucun espace familial. Créez ou rejoignez une famille.");
  return ctx;
}

export function requireAdmin(ctx) {
  if (ctx.role !== "admin") throw httpError(403, "Action réservée aux administrateurs de la famille.");
}

export function audit(familyId, actorId, action, detail = null) {
  getDb()
    .prepare("INSERT INTO audit_event (family_id, actor_user_id, action, detail) VALUES (?, ?, ?, ?)")
    .run(familyId, actorId, action, detail ? JSON.stringify(detail).slice(0, 2000) : null);
}

// Visibilité : les contenus marqués "adults" sont réservés aux
// membres non reliés à une personne enfant. Un compte relié à une
// personne marquée enfant (is_child) ne les voit jamais.
export function canSeeAdultContent(user, ctx) {
  const db = getDb();
  const linkedChild = db
    .prepare(
      `SELECT 1 FROM person
       WHERE family_id = ? AND linked_user_id = ? AND is_child = 1
       LIMIT 1`
    )
    .get(ctx.family.id, user.id);
  return !linkedChild;
}

export function visibleVisibilityFilter(user, ctx) {
  return canSeeAdultContent(user, ctx) ? null : "family";
}
