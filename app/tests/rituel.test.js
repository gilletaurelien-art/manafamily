// Le rituel hebdomadaire : livré à la lecture (pas de tâche planifiée),
// répondu via les chemins souvenirs/MANAvibe existants.

import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { startApp, client, registerAndCreateFamily } from "./helpers.js";

let app, base, c;

test.before(async () => {
  app = await startApp();
  base = app.base;
  c = client(base);
});

test.after(async () => {
  await new Promise((resolve) => app.server.close(resolve));
});

async function nouvelleFamille(libelle = "Famille rituel") {
  const email = `rituel${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.org`;
  await registerAndCreateFamily(c, email, "Membre Test", libelle);
}

test("une famille neuve reçoit une question dès la première lecture", async () => {
  await nouvelleFamille();
  const r = await c.req("GET", "/api/rituel/current");
  assert.equal(r.status, 200);
  assert.ok(r.data.current, "une question doit être livrée");
  assert.ok(r.data.current.text.length > 0);
  assert.equal(r.data.current.answered_at, null);
});

test("la même question revient tant que 7 jours ne sont pas passés", async () => {
  await nouvelleFamille();
  const r1 = await c.req("GET", "/api/rituel/current");
  const r2 = await c.req("GET", "/api/rituel/current");
  assert.equal(r1.data.current.id, r2.data.current.id, "pas de nouvelle livraison avant le délai");
});

test("une nouvelle question arrive une fois le délai passé (simulé en base)", async () => {
  await nouvelleFamille();
  const premiere = (await c.req("GET", "/api/rituel/current")).data.current;

  const db = new DatabaseSync(process.env.DATA_DIR + "/manafamily.db");
  db.prepare("UPDATE prompt_delivery SET delivered_at = datetime('now', '-8 days') WHERE id = ?").run(premiere.id);
  db.close();

  const seconde = (await c.req("GET", "/api/rituel/current")).data.current;
  assert.notEqual(seconde.id, premiere.id, "une nouvelle livraison doit remplacer l'ancienne après 8 jours");
  assert.notEqual(seconde.text, premiere.text, "les 15 questions de départ sont distinctes : pas de répétition immédiate");
});

test("répondre à une question générale attache le souvenir créé et clôt la livraison", async () => {
  await nouvelleFamille();
  const current = (await c.req("GET", "/api/rituel/current")).data.current;

  const mem = await c.req("POST", "/api/memories", { title: "Réponse au rituel", kind: "text", description: "Une réponse de test." });
  const memoryId = mem.data.id;

  const r = await c.req("POST", `/api/rituel/${current.id}/answer`, { memory_id: memoryId });
  assert.equal(r.status, 200);
  assert.ok(r.data.answered_at, "la livraison doit porter une date de réponse");
  assert.equal(r.data.memory_id, memoryId);
  assert.equal(r.data.song_id, null);

  const hist = (await c.req("GET", "/api/rituel/history")).data.history;
  const trouvee = hist.find((h) => h.id === current.id);
  assert.ok(trouvee.answered_at);
});

test("répondre peut lier une chanson MANAvibe quand on en fournit une", async () => {
  await nouvelleFamille();
  const current = (await c.req("GET", "/api/rituel/current")).data.current;
  const mem = await c.req("POST", "/api/memories", { title: "Réponse chanson", kind: "audio", description: "Test." });
  const song = await c.req("POST", "/api/manavibe/songs", { title: "Chanson du rituel", primary_artist: "Test" });

  const r = await c.req("POST", `/api/rituel/${current.id}/answer`, { memory_id: mem.data.id, song_id: song.data.id });
  assert.equal(r.status, 200);
  assert.equal(r.data.song_id, song.data.id);
});

test("une chanson d'une AUTRE famille ne peut pas être liée (isolation stricte)", async () => {
  await nouvelleFamille();
  const current = (await c.req("GET", "/api/rituel/current")).data.current;
  const mem = await c.req("POST", "/api/memories", { title: "Réponse", kind: "text" });

  const c2 = client(base);
  const email2 = `rituel-autre${Date.now()}@example.org`;
  await registerAndCreateFamily(c2, email2, "Autre", "Autre famille");
  const songAutre = await c2.req("POST", "/api/manavibe/songs", { title: "Chanson étrangère" });

  const r = await c.req("POST", `/api/rituel/${current.id}/answer`, { memory_id: mem.data.id, song_id: songAutre.data.id });
  assert.equal(r.status, 404, "une chanson hors famille doit être refusée");
});

test("sans famille, le rituel est inaccessible comme tout le reste", async () => {
  const cAnon = client(base);
  const r = await cAnon.req("GET", "/api/rituel/current");
  assert.equal(r.status, 401);
});

test("le jeu de questions de départ porte ses 15 entrées, apostrophes bien échappées", async () => {
  const db = new DatabaseSync(process.env.DATA_DIR + "/manafamily.db", { readOnly: true });
  const total = db.prepare("SELECT COUNT(*) AS n FROM prompt WHERE active = 1").get().n;
  assert.equal(total, 15);
  const avecApostrophe = db.prepare("SELECT text FROM prompt WHERE text LIKE '%''%'").all();
  assert.ok(avecApostrophe.length > 0, "au moins une question porte une apostrophe — vérifie qu'elle s'est bien écrite");
  db.close();
});
