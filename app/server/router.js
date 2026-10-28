// Routeur API maison. Chaque route vérifie l'authentification puis
// l'appartenance à la famille propriétaire — jamais confiance à un
// identifiant venu de l'URL ou du corps.

import { getUserByToken, readSessionToken, getFamilyContext, requireUser, requireFamily, requireAdmin, sessionCookieFor, clearSessionCookie } from "./auth/auth.js";
import { getDb, newId } from "./db/db.js";
import { readJson, send, sendError, httpError, parseMultipart } from "./lib/http.js";
import { hashPassword, verifyPassword } from "./lib/password.js";
import { validEmail, validPassword, requiredStr, validId, optional, validDate, validDateTime } from "./lib/validate.js";
import * as families from "./services/families.js";
import * as people from "./services/people.js";
import * as memories from "./services/memories.js";
import * as media from "./services/media.js";
import * as albums from "./services/albums.js";
import * as events from "./services/events.js";
import * as home from "./services/home.js";
import * as stories from "./services/stories.js";
import * as books from "./services/books.js";
import { audit } from "./auth/auth.js";
import { MAX_UPLOAD_BYTES } from "./lib/storage.js";

export async function handleApi(req, res, pathname) {
  try {
    const route = await match(req, pathname);
    if (!route) {
      send(res, 404, { error: "Route inconnue." });
      return;
    }
    await route(req, res);
  } catch (err) {
    sendError(res, err);
  }
}

async function match(req, pathname) {
  const method = req.method;
  const parts = pathname.split("/").filter(Boolean); // ["api", ...]
  const p = (i) => parts[i + 1] || "";
  const key = `${method} /${parts.slice(1).join("/")}`;
  const key1 = parts.length >= 3 ? `${method} /${parts.slice(1, 2)}/:id` : null;

  // ---- Public ----
  if (method === "POST" && pathname === "/api/auth/register")
    return async (req, res) => {
      const body = await readJson(req);
      const email = validEmail(body.email);
      const password = validPassword(body.password);
      const name = requiredStr(body.display_name || body.displayName, "Le nom", 100);
      const db = getDb();
      if (db.prepare("SELECT 1 FROM app_user WHERE email = ?").get(email))
        throw httpError(409, "Un compte existe déjà avec cette adresse.");
      const id = newId("usr");
      db.prepare("INSERT INTO app_user (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)")
        .run(id, email, hashPassword(password), name);
      const { createSession } = await import("./auth/auth.js");
      const { token } = createSession(id);
      send(res, 201, { user: { id, email, displayName: name } }, { "set-cookie": sessionCookieFor(token) });
    };

  if (method === "POST" && pathname === "/api/auth/login")
    return async (req, res) => {
      const body = await readJson(req);
      const email = validEmail(body.email);
      const db = getDb();
      const user = db.prepare("SELECT * FROM app_user WHERE email = ?").get(email);
      if (!user || !verifyPassword(body.password || "", user.password_hash))
        throw httpError(401, "E-mail ou mot de passe incorrect.");
      const { createSession } = await import("./auth/auth.js");
      const { token } = createSession(user.id);
      send(res, 200, { user: { id: user.id, email: user.email, displayName: user.display_name } }, { "set-cookie": sessionCookieFor(token) });
    };

  if (method === "POST" && pathname === "/api/auth/logout")
    return async (req, res) => {
      const { destroySession } = await import("./auth/auth.js");
      destroySession(readSessionToken(req));
      send(res, 200, { ok: true }, { "set-cookie": clearSessionCookie() });
    };

  if (method === "GET" && pathname === "/api/me")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = getFamilyContext(user, req);
      send(res, 200, {
        user,
        memberships: ctx.memberships?.map((m) => ({ id: m.family_id, name: m.family_name, role: m.role })) || null,
        currentFamilyId: ctx.family?.id || null,
      });
    };

  // Invitation : parcours public par token (l'utilisateur est déjà
  // connecté ou crée son compte, mais l'invitation elle-même est
  // lue par token, sans contexte famille).
  if (method === "GET" && pathname === "/api/invitation")
    return async (req, res) => {
      const url = new URL(req.url, "http://x");
      const token = url.searchParams.get("token") || "";
      const db = getDb();
      const inv = db.prepare("SELECT * FROM family_invitation WHERE token = ?").get(token);
      if (!inv) throw httpError(404, "Invitation introuvable.");
      const fam = db.prepare("SELECT name FROM family WHERE id = ?").get(inv.family_id);
      const expired = new Date(inv.expires_at).getTime() < Date.now();
      send(res, 200, {
        familyName: fam?.name || "Famille",
        email: inv.email,
        role: inv.role,
        expired,
        revoked: !!inv.revoked_at,
        accepted: !!inv.accepted_at,
      });
    };

  if (method === "POST" && pathname === "/api/invitation/accept")
    return async (req, res) => {
      const user = requireUser(req);
      const body = await readJson(req);
      const result = families.acceptInvitation(user, requiredStr(body.token, "Le token"));
      send(res, 200, result);
    };

  // ---- Familles ----
  if (method === "POST" && pathname === "/api/families")
    return async (req, res) => {
      const user = requireUser(req);
      const body = await readJson(req);
      const fam = families.createFamily(user, requiredStr(body.name, "Le nom de la famille", 100));
      send(res, 201, fam);
    };

  if (method === "GET" && pathname === "/api/family")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      send(res, 200, { family: ctx.family, role: ctx.role, members: families.listMembers(ctx) });
    };

  if (method === "GET" && pathname === "/api/family/members")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      send(res, 200, { members: families.listMembers(ctx) });
    };

  if (method === "GET" && pathname === "/api/family/invitations")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      requireAdmin(ctx);
      send(res, 200, { invitations: families.listInvitations(ctx) });
    };

  if (method === "POST" && pathname === "/api/family/invitations")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      requireAdmin(ctx);
      const body = await readJson(req);
      const inv = families.createInvitation(user, ctx, validEmail(body.email), body.role || "member");
      send(res, 201, inv);
    };

  if (method === "POST" && pathname === "/api/family/invitations/revoke")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      requireAdmin(ctx);
      const body = await readJson(req);
      families.revokeInvitation(user, ctx, requiredStr(body.token, "Le token"));
      send(res, 200, { ok: true });
    };

  if (method === "POST" && pathname === "/api/family/members/role")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      requireAdmin(ctx);
      const body = await readJson(req);
      families.changeMemberRole(user, ctx, validId(body.membership_id, "Membre"), body.role);
      send(res, 200, { ok: true });
    };

  if (method === "DELETE" && pathname === "/api/family/members") {
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      requireAdmin(ctx);
      const url = new URL(req.url, "http://x");
      families.removeMember(user, ctx, validId(url.searchParams.get("id"), "Membre"));
      send(res, 200, { ok: true });
    };
  }

  if (method === "POST" && pathname === "/api/family/leave")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      families.leaveFamily(user, ctx);
      send(res, 200, { ok: true });
    };

  // ---- Accueil ----
  if (method === "GET" && pathname === "/api/home")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      send(res, 200, home.homeFeed(user, ctx));
    };

  if (method === "POST" && pathname === "/api/posts")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      send(res, 201, home.createPost(user, ctx, body.body));
    };

  if (method === "DELETE" && pathname.startsWith("/api/posts/"))
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      home.deletePost(user, ctx, validId(parts[2], "Publication"));
      send(res, 200, { ok: true });
    };

  // ---- Souvenirs ----
  if (method === "POST" && pathname === "/api/memories")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      send(res, 201, memories.createMemory(user, ctx, body));
    };

  if (method === "GET" && pathname === "/api/memories")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const url = new URL(req.url, "http://x");
      send(res, 200, {
        memories: memories.listMemories(user, ctx, {
          kind: url.searchParams.get("kind") || null,
          personId: url.searchParams.get("person") || null,
          albumId: url.searchParams.get("album") || null,
          q: (url.searchParams.get("q") || "").slice(0, 100),
          year: url.searchParams.get("year") || null,
        }),
      });
    };

  if (pathname.startsWith("/api/memories/")) {
    const id = parts[2];
    if (method === "GET")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        send(res, 200, memories.getMemoryDetail(user, ctx, id));
      };
    if (method === "PUT")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const body = await readJson(req);
        memories.updateMemory(user, ctx, id, body);
        send(res, 200, { ok: true });
      };
    if (method === "DELETE")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        memories.deleteMemory(user, ctx, id);
        send(res, 200, { ok: true });
      };
    if (method === "POST" && parts[3] === "comments")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const body = await readJson(req);
        send(res, 201, memories.addComment(user, ctx, "memory", id, body.body));
      };
    if (method === "POST" && parts[3] === "media") {
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const parts_ = await parseMultipart(req, MAX_UPLOAD_BYTES + 1024 * 1024);
        const file = parts_.find((x) => x.name === "file");
        const result = media.uploadToMemory(user, ctx, id, file);
        send(res, 201, result);
      };
    }
  }

  if (method === "POST" && pathname === "/api/memories/comments/delete")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      memories.deleteComment(user, ctx, body.id);
      send(res, 200, { ok: true });
    };

  // ---- Médias ----
  if (pathname.startsWith("/api/media/")) {
    const id = parts[2];
    if (method === "GET")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const { data, mime, filename } = media.readMedia(user, ctx, id);
        res.writeHead(200, {
          "content-type": mime,
          "content-length": data.length,
          "content-disposition": `inline; filename="${filename}"`,
          "cache-control": "private, max-age=3600",
          "x-content-type-options": "nosniff",
        });
        res.end(data);
      };
    if (method === "DELETE")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        media.deleteMedia(user, ctx, id);
        send(res, 200, { ok: true });
      };
  }

  // ---- Personnes ----
  if (method === "POST" && pathname === "/api/people")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      send(res, 201, people.createPerson(user, ctx, body));
    };

  if (method === "GET" && pathname === "/api/people")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      send(res, 200, { people: people.listPeople(ctx) });
    };

  if (method === "GET" && pathname === "/api/family/tree")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      send(res, 200, people.getTree(ctx));
    };

  if (method === "GET" && pathname === "/api/family/generations")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      send(res, 200, { generations: people.getGenerations(ctx) });
    };

  if (pathname.startsWith("/api/people/")) {
    const id = parts[2];
    if (method === "GET")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const person = people.getPersonChecked(ctx, id);
        const db = getDb();
        const memoriesOf = memories.listMemories(user, ctx, { personId: id });
        const comments = memories.listComments(user, ctx, "person", id);
        send(res, 200, { person, memories: memoriesOf, comments });
      };
    if (method === "PUT")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const body = await readJson(req);
        people.updatePerson(user, ctx, id, body);
        send(res, 200, { ok: true });
      };
    if (method === "DELETE")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        people.deletePerson(user, ctx, id);
        send(res, 200, { ok: true });
      };
    if (method === "POST" && parts[3] === "comments")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const body = await readJson(req);
        send(res, 201, memories.addComment(user, ctx, "person", id, body.body));
      };
    if (method === "POST" && parts[3] === "link-user")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        requireAdmin(ctx);
        const body = await readJson(req);
        people.linkUser(user, ctx, id, body.user_id || null);
        send(res, 200, { ok: true });
      };
  }

  if (method === "POST" && pathname === "/api/relationships")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      send(res, 201, people.createRelationship(user, ctx, body));
    };

  if (method === "DELETE" && pathname.startsWith("/api/relationships/"))
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      people.deleteRelationship(user, ctx, parts[2]);
      send(res, 200, { ok: true });
    };

  // ---- Albums ----
  if (method === "POST" && pathname === "/api/albums")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      send(res, 201, albums.createAlbum(user, ctx, body));
    };

  if (method === "GET" && pathname === "/api/albums")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      send(res, 200, { albums: albums.listAlbums(ctx) });
    };

  if (pathname.startsWith("/api/albums/")) {
    const id = parts[2];
    if (method === "GET")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        send(res, 200, albums.getAlbumDetail(user, ctx, id));
      };
    if (method === "PUT")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const body = await readJson(req);
        albums.updateAlbum(user, ctx, id, body);
        send(res, 200, { ok: true });
      };
    if (method === "DELETE")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        albums.deleteAlbum(user, ctx, id);
        send(res, 200, { ok: true });
      };
  }

  // ---- Agenda ----
  if (method === "GET" && pathname === "/api/events")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const url = new URL(req.url, "http://x");
      send(res, 200, {
        events: events.listEvents(user, ctx, {
          from: url.searchParams.get("from"),
          to: url.searchParams.get("to"),
        }),
        birthdays: events.upcomingBirthdays(ctx, 90, 30),
      });
    };

  if (method === "POST" && pathname === "/api/events")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      send(res, 201, events.createEvent(user, ctx, body));
    };

  if (pathname.startsWith("/api/events/")) {
    const id = parts[2];
    if (method === "PUT")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const body = await readJson(req);
        events.updateEvent(user, ctx, id, body);
        send(res, 200, { ok: true });
      };
    if (method === "DELETE")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        events.deleteEvent(user, ctx, id);
        send(res, 200, { ok: true });
      };
  }

  // ---- Récits & livres ----
  if (method === "POST" && pathname === "/api/stories")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      send(res, 201, stories.createStory(user, ctx, body));
    };

  if (method === "GET" && pathname === "/api/stories")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      send(res, 200, { stories: stories.listStories(ctx) });
    };

  if (pathname.startsWith("/api/stories/")) {
    const id = parts[2];
    if (method === "GET")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        send(res, 200, stories.getStoryDetail(ctx, id));
      };
    if (method === "PUT")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        const body = await readJson(req);
        stories.updateStory(user, ctx, id, body);
        send(res, 200, { ok: true });
      };
    if (method === "DELETE")
      return async (req, res) => {
        const user = requireUser(req);
        const ctx = requireFamily(user, req);
        stories.deleteStory(user, ctx, id);
        send(res, 200, { ok: true });
      };
  }

  if (method === "POST" && pathname === "/api/books/preview")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      send(res, 200, books.previewBook(user, ctx, body));
    };

  if (method === "POST" && pathname === "/api/books/export")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      const pdf = books.exportBookPdf(user, ctx, body);
      res.writeHead(200, {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="livre-familial.pdf"`,
        "content-length": pdf.length,
      });
      res.end(pdf);
    };

  // ---- Données personnelles : export et suppression ----
  if (method === "GET" && pathname === "/api/account/export")
    return async (req, res) => {
      const user = requireUser(req);
      const db = getDb();
      const data = {
        exportedAt: new Date().toISOString(),
        user: db.prepare("SELECT id, email, display_name, created_at FROM app_user WHERE id = ?").get(user.id),
        memberships: db.prepare("SELECT family_id, role, status FROM family_membership WHERE user_id = ?").all(user.id),
      };
      res.writeHead(200, {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="mes-donnees-manafamily.json"`,
      });
      res.end(JSON.stringify(data, null, 2));
    };

  if (method === "DELETE" && pathname === "/api/account")
    return async (req, res) => {
      const user = requireUser(req);
      const db = getDb();
      const tx = db.transaction(() => {
        db.prepare("DELETE FROM app_user WHERE id = ?").run(user.id);
      });
      tx();
      const { destroySession } = await import("./auth/auth.js");
      destroySession(readSessionToken(req));
      send(res, 200, { ok: true }, { "set-cookie": clearSessionCookie() });
    };

  if (method === "PUT" && pathname === "/api/family/notifications")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const body = await readJson(req);
      const db = getDb();
      db.prepare(
        `INSERT INTO notification_preference (user_id, family_id, event_reminders, birthdays, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT (user_id, family_id) DO UPDATE SET
         event_reminders = excluded.event_reminders, birthdays = excluded.birthdays, updated_at = datetime('now')`
      ).run(user.id, ctx.family.id, body.event_reminders ? 1 : 0, body.birthdays ? 1 : 0);
      send(res, 200, { ok: true });
    };

  if (method === "GET" && pathname === "/api/family/notifications")
    return async (req, res) => {
      const user = requireUser(req);
      const ctx = requireFamily(user, req);
      const db = getDb();
      const row = db
        .prepare("SELECT event_reminders, birthdays FROM notification_preference WHERE user_id = ? AND family_id = ?")
        .get(user.id, ctx.family.id);
      send(res, 200, row || { event_reminders: 1, birthdays: 1 });
    };

  return null;
}
