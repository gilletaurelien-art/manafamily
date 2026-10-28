// Souvenirs, médias (upload réel), personnes, arbre, agenda, albums,
// récits, livre PDF, commentaires.

import { test } from "node:test";
import assert from "node:assert/strict";
import { startApp, client, png1x1, jpegStub } from "./helpers.js";

let app, c;

test.before(async () => {
  app = await startApp();
  c = client(app.base);
  await c.post("/api/auth/register", { email: "fam@example.fr", password: "motdepasse8", display_name: "Famille" });
  await c.post("/api/families", { name: "Les Penven" });
});

test.after(() => {
  app.server.close();
});

test("CRUD souvenir + brouillon", async () => {
  const mem = await c.post("/api/memories", {
    title: "L'été à Penven",
    kind: "photo",
    description: "La plage, les criques.",
    happened_on: "2020-07-15",
    place: "Penven",
    draft: true,
  });
  assert.equal(mem.status, 201);
  const id = mem.data.id;

  const list = await c.get("/api/memories");
  assert.ok(list.data.memories.some((m) => m.draft === 1));

  const upd = await c.put(`/api/memories/${id}`, {
    title: "L'été à Penven",
    kind: "photo",
    description: "La plage, les criques, la morue.",
    draft: false,
  });
  assert.equal(upd.status, 200);

  const search = await c.get("/api/memories?q=morue");
  assert.equal(search.data.memories.length, 1);

  const noRes = await c.get("/api/memories?q=inexistant");
  assert.equal(noRes.data.memories.length, 0);
});

test("upload réel de fichier + accès protégé", async () => {
  const mem = await c.post("/api/memories", { title: "Photo de plage", kind: "photo" });
  const memId = mem.data.id;

  const up = await c.upload(`/api/memories/${memId}/media`, "plage.png", png1x1(), "image/png");
  assert.equal(up.status, 201);
  const mediaId = up.data.id;

  // accessible connecté
  const ok = await c.rawGet(`/api/media/${mediaId}`);
  assert.equal(ok.status, 200);
  const buf = Buffer.from(await ok.arrayBuffer());
  assert.equal(buf.length, png1x1().length);

  // inaccessible sans session
  const anon = await fetch(`${app.base}/api/media/${mediaId}`);
  assert.equal(anon.status, 401);

  // type refusé
  const bad = await c.upload(`/api/memories/${memId}/media`, "malware.exe", "MZ", "application/x-msdownload");
  assert.equal(bad.status, 415);
});

test("personnes, relations, arbre dérivé", async () => {
  const grand = await c.post("/api/people", { first_name: "Yann", last_name: "Penven", birth_date: "1940-03-12" });
  const parent = await c.post("/api/people", { first_name: "Marie", last_name: "Penven", birth_date: "1965-06-01" });
  const child = await c.post("/api/people", { first_name: "Lise", last_name: "Penven", birth_date: "1998-09-20", is_child: true });
  const gId = grand.data.id, pId = parent.data.id, cId = child.data.id;

  await c.post("/api/relationships", { kind: "parent", from_person_id: gId, to_person_id: pId });
  await c.post("/api/relationships", { kind: "parent", from_person_id: pId, to_person_id: cId });

  const tree = await c.get("/api/family/tree");
  const nodes = tree.data.nodes;
  assert.equal(nodes.length, 3);
  const childNode = nodes.find((n) => n.id === cId);
  assert.equal(childNode.parents.length, 1);
  assert.ok(childNode.generation >= 2);
  const gen = await c.get("/api/family/generations");
  assert.equal(gen.data.generations.length, 3);

  // association souvenir-personne
  const mem = await c.post("/api/memories", {
    title: "Les 80 ans de Yann", kind: "text",
    person_ids: [gId],
  });
  const detail = await c.get(`/api/memories/${mem.data.id}`);
  assert.equal(detail.data.persons.length, 1);
  assert.equal(detail.data.persons[0].first_name, "Yann");

  // relation invalide refusée
  assert.equal((await c.post("/api/relationships", { kind: "parent", from_person_id: gId, to_person_id: "mem_faux" })).status, 400);
});

test("anniversaires calculés depuis les dates de naissance", async () => {
  // Personne dont l'anniversaire tombe dans ~30 jours : déterministe.
  const in30 = new Date(Date.now() + 30 * 86400_000);
  const bd = `${1900 + (in30.getFullYear() % 100)}-${String(in30.getMonth() + 1).padStart(2, "0")}-${String(in30.getDate()).padStart(2, "0")}`;
  await c.post("/api/people", { first_name: "Nedata" + in30.getTime(), birth_date: bd });
  const { birthdays } = (await c.get("/api/events")).data;
  const target = birthdays.find((b) => b.name.startsWith("Nedata"));
  assert.ok(target, "anniversaire à venir présent");
  assert.ok(typeof target.age === "number");
  const thisYear = new Date().getFullYear();
  assert.ok(target.date.startsWith(String(thisYear)) || target.date.startsWith(String(thisYear + 1)));
});

test("agenda : CRUD événement avec participants", async () => {
  const { people } = (await c.get("/api/people")).data;
  const yann = people.find((p) => p.first_name === "Yann");
  const ev = await c.post("/api/events", {
    title: "Retrouvailles d'été",
    starts_at: "2027-08-15T12:00",
    place: "Saint-Quay",
    person_ids: [yann.id],
    kind: "reunion",
  });
  assert.equal(ev.status, 201);
  const id = ev.data.id;

  const list = await c.get("/api/events?from=2027-01-01");
  assert.equal(list.data.events.length, 1);
  assert.ok(list.data.events[0].participants.includes("Yann"));

  const upd = await c.put(`/api/events/${id}`, { title: "Retrouvailles", starts_at: "2027-08-16T12:00" });
  assert.equal(upd.status, 200);

  assert.equal((await c.del(`/api/events/${id}`)).status, 200);
  const after = await c.get("/api/events");
  assert.equal(after.data.events.filter((e) => e.id === id).length, 0);
});

test("albums : création, ordre, contenu", async () => {
  const { memories } = (await c.get("/api/memories")).data;
  const alb = await c.post("/api/albums", {
    title: "Étés bretons",
    memory_ids: memories.map((m) => m.id).slice(0, 2),
  });
  assert.equal(alb.status, 201);
  const detail = await c.get(`/api/albums/${alb.data.id}`);
  assert.equal(detail.data.items.length, 2);
});

test("récits avec sources référencées", async () => {
  const { memories } = (await c.get("/api/memories")).data;
  const { people } = (await c.get("/api/people")).data;
  const yann = people.find((p) => p.first_name === "Yann");
  const st = await c.post("/api/stories", {
    title: "Histoire des Penven",
    body: "Tout a commencé par la mer.",
    period_start: "1940-01-01",
    period_end: "2020-12-31",
    sources: [
      { type: "memory", id: memories[0].id },
      { type: "person", id: yann.id },
    ],
  });
  assert.equal(st.status, 201);
  const detail = await c.get(`/api/stories/${st.data.id}`);
  assert.equal(detail.data.sources.length, 2);
  assert.ok(detail.data.sources.some((s) => s.label.includes("Yann")));

  const upd = await c.put(`/api/stories/${st.data.id}`, {
    title: "Histoire des Penven",
    body: "Tout a commencé par la mer, puis le phare.",
    period_start: "1940-01-01",
    period_end: "2020-12-31",
  });
  assert.equal(upd.status, 200);
});

test("livre de famille : aperçu + PDF réel", async () => {
  const { memories } = (await c.get("/api/memories")).data;
  const withPhoto = memories.find((m) => m.title === "Photo de plage");
  const preview = await c.post("/api/books/preview", {
    title: "Notre histoire",
    memoryIds: [withPhoto.id],
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.data.sections.length, 1);

  // export PDF : upload d'un JPEG d'abord pour l'image de couverture
  await c.upload(`/api/memories/${withPhoto.id}/media`, "plage.jpg", jpegStub(), "image/jpeg");

  const res = await c.req("POST", "/api/books/export", { title: "Notre histoire", memoryIds: [withPhoto.id] });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/pdf");
  const buf = Buffer.isBuffer(res.data) ? res.data : Buffer.from(res.data);
  assert.ok(buf.length > 500);
  assert.equal(buf.slice(0, 5).toString(), "%PDF-");

  // sélection vide → erreur claire
  const empty = await c.post("/api/books/preview", { title: "Vide", memoryIds: [] , periodStart: "2999-01-01"});
  assert.equal(empty.status, 400);
});

test("commentaires : ajout et suppression par l'auteur", async () => {
  const { memories } = (await c.get("/api/memories")).data;
  const mem = memories[0];
  const com = await c.post(`/api/memories/${mem.id}/comments`, { body: "Quel beau souvenir !" });
  assert.equal(com.status, 201);
  const del = await c.post("/api/memories/comments/delete", { id: com.data.id });
  assert.equal(del.status, 200);
});

test("accueil : fil, états, publication", async () => {
  const home = await c.get("/api/home");
  assert.equal(home.status, 200);
  assert.ok(Array.isArray(home.data.posts));
  assert.equal(home.data.isEmpty, false);
  assert.ok(home.data.recentMemories.length > 0);

  const post = await c.post("/api/posts", { body: "Bienvenue à la maison !" });
  assert.equal(post.status, 201);
  const home2 = await c.get("/api/home");
  assert.equal(home2.data.posts.length, 1);
});

test("préférences de notification", async () => {
  const put = await c.put("/api/family/notifications", { event_reminders: false, birthdays: true });
  assert.equal(put.status, 200);
  const get = await c.get("/api/family/notifications");
  assert.equal(get.data.event_reminders, 0);
  assert.equal(get.data.birthdays, 1);
});

test("export et suppression de compte", async () => {
  const cX = client(app.base);
  await cX.post("/api/auth/register", { email: "zap@example.fr", password: "motdepasse8", display_name: "Zap" });
  const exp = await cX.rawGet("/api/account/export");
  assert.equal(exp.status, 200);
  const data = JSON.parse(Buffer.from(await exp.arrayBuffer()).toString());
  assert.equal(data.user.email, "zap@example.fr");

  const del = await cX.del("/api/account");
  assert.equal(del.status, 200);
  const me = await cX.get("/api/me");
  assert.equal(me.status, 401);
});
