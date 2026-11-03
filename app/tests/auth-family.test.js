// Parcours essentiels : compte, famille, invitation, isolation
// entre familles, permissions admin.

import { test } from "node:test";
import assert from "node:assert/strict";
import { startApp, client, registerAndCreateFamily } from "./helpers.js";

let app, cA, cB, cC;

test.before(async () => {
  app = await startApp();
  cA = client(app.base);
  cB = client(app.base);
  cC = client(app.base);
});

test.after(() => {
  app.server.close();
});

test("inscription, connexion, session", async () => {
  const reg = await cA.post("/api/auth/register", {
    email: "a@example.fr",
    password: "motdepasse8",
    display_name: "Alice",
  });
  assert.equal(reg.status, 201);

  const badLogin = await cB.post("/api/auth/login", { email: "a@example.fr", password: "faux" });
  assert.equal(badLogin.status, 401);

  const login = await cB.post("/api/auth/login", { email: "a@example.fr", password: "motdepasse8" });
  assert.equal(login.status, 200);
  const me = await cB.get("/api/me");
  assert.equal(me.data.user.displayName, "Alice");
});

test("création de famille, rôles, membres", async () => {
  const fam = await cA.post("/api/families", { name: "Les Martin" });
  assert.equal(fam.status, 201);

  const info = await cA.get("/api/family");
  assert.equal(info.data.role, "admin");
  assert.equal(info.data.members.length, 1);
});

test("invitation : création, lecture publique, acceptation", async () => {
  const inv = await cA.post("/api/family/invitations", { email: "bob@example.fr", role: "member" });
  assert.equal(inv.status, 201);
  assert.ok(inv.data.token);

  const publicInfo = await client(app.base).get(`/api/invitation?token=${inv.data.token}`);
  assert.equal(publicInfo.data.familyName, "Les Martin");
  assert.equal(publicInfo.data.expired, false);

  await cB.post("/api/auth/register", { email: "bob@example.fr", password: "motdepasse8", display_name: "Bob" });
  const accept = await cB.post("/api/invitation/accept", { token: inv.data.token });
  assert.equal(accept.status, 200);

  const info = await cB.get("/api/family");
  assert.equal(info.data.role, "member");
  assert.equal(info.data.members.length, 2);

  // réutilisation impossible
  const again = await cC.post("/api/invitation/accept", { token: inv.data.token });
  assert.equal(again.status, 401);
});

test("invitation : révocation par l'admin", async () => {
  const inv = await cA.post("/api/family/invitations", { email: "carole@example.fr", role: "member" });
  await cA.post("/api/family/invitations/revoke", { token: inv.data.token });
  const info = await client(app.base).get(`/api/invitation?token=${inv.data.token}`);
  assert.equal(info.data.revoked, true);
});

test("membre non-admin ne peut pas inviter", async () => {
  const res = await cB.post("/api/family/invitations", { email: "x@example.fr", role: "member" });
  assert.equal(res.status, 403);
});

test("isolation stricte entre familles", async () => {
  // famille 2 (utilisateur C)
  const cD = client(app.base);
  await cD.post("/api/auth/register", { email: "carol@example.fr", password: "motdepasse8", display_name: "Carol" });
  await cD.post("/api/families", { name: "Les Le Goff" });

  // Alice crée un souvenir dans sa famille
  const mem = await cA.post("/api/memories", { title: "Noël 2020", kind: "photo" });
  assert.equal(mem.status, 201);
  const memId = mem.data.id;

  // Carol ne peut ni lister ni lire le souvenir d'Alice
  const list = await cD.get("/api/memories");
  assert.equal(list.data.memories.length, 0);
  const detail = await cD.get(`/api/memories/${memId}`);
  assert.equal(detail.status, 404);

  // Carol ne peut pas modifier ni supprimer
  assert.equal((await cD.put(`/api/memories/${memId}`, { title: "vol", kind: "photo" })).status, 404);
  assert.equal((await cD.del(`/api/memories/${memId}`)).status, 404);
});

test("sans famille : accès refusé aux contenus", async () => {
  const cE = client(app.base);
  await cE.post("/api/auth/register", { email: "dan@example.fr", password: "motdepasse8", display_name: "Dan" });
  assert.equal((await cE.get("/api/memories")).status, 403);
});

test("validation : entrées invalides refusées", async () => {
  assert.equal((await cA.post("/api/memories", { title: "", kind: "photo" })).status, 400);
  assert.equal((await cA.post("/api/memories", { title: "x", kind: "banane" })).status, 400);
  assert.equal(
    (await cA.post("/api/auth/register", { email: "pasunemail", password: "motdepasse8", display_name: "X" })).status,
    400
  );
});
