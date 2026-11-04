// « Les chansons de Papi » — une chanson remonte sur la fiche d'une
// personne dès qu'un souvenir qui la porte lui est associé. Aucune
// nouvelle donnée : juste la traversée song_memory → memory_person.

import test from "node:test";
import assert from "node:assert/strict";
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

async function nouvelleFamille() {
  const email = `arbre${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.org`;
  await registerAndCreateFamily(c, email, "Membre Test", "Famille arbre");
}

test("une personne sans souvenir lié ne porte aucune chanson", async () => {
  await nouvelleFamille();
  const person = await c.req("POST", "/api/people", { first_name: "Jeanne" });
  const r = await c.req("GET", `/api/people/${person.data.id}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.songs, []);
});

test("une chanson remonte dès que le souvenir qui la porte est associé à la personne", async () => {
  await nouvelleFamille();
  const person = await c.req("POST", "/api/people", { first_name: "Papi" });
  const memory = await c.req("POST", "/api/memories", { title: "Où Papi écoutait Sinatra", kind: "text", person_ids: [person.data.id] });
  const song = await c.req("POST", "/api/manavibe/songs", { title: "Fly Me to the Moon", primary_artist: "Frank Sinatra" });
  await c.req("POST", `/api/manavibe/songs/${song.data.id}/memories`, { memory_id: memory.data.id, relation: "story" });

  const r = await c.req("GET", `/api/people/${person.data.id}`);
  assert.equal(r.status, 200);
  assert.equal(r.data.songs.length, 1);
  assert.equal(r.data.songs[0].title, "Fly Me to the Moon");
});

test("un souvenir lié à la chanson mais PAS à la personne ne la fait pas apparaître", async () => {
  await nouvelleFamille();
  const personA = await c.req("POST", "/api/people", { first_name: "A" });
  const personB = await c.req("POST", "/api/people", { first_name: "B" });
  const memory = await c.req("POST", "/api/memories", { title: "Souvenir de B", kind: "text", person_ids: [personB.data.id] });
  const song = await c.req("POST", "/api/manavibe/songs", { title: "Chanson de B" });
  await c.req("POST", `/api/manavibe/songs/${song.data.id}/memories`, { memory_id: memory.data.id, relation: "story" });

  const r = await c.req("GET", `/api/people/${personA.data.id}`);
  assert.deepEqual(r.data.songs, [], "la chanson de B ne doit pas apparaître chez A");
});

test("une même chanson liée par deux souvenirs à la même personne n'apparaît qu'une fois", async () => {
  await nouvelleFamille();
  const person = await c.req("POST", "/api/people", { first_name: "Mamie" });
  const song = await c.req("POST", "/api/manavibe/songs", { title: "La Vie en rose" });
  const mem1 = await c.req("POST", "/api/memories", { title: "Souvenir 1", kind: "text", person_ids: [person.data.id] });
  const mem2 = await c.req("POST", "/api/memories", { title: "Souvenir 2", kind: "text", person_ids: [person.data.id] });
  await c.req("POST", `/api/manavibe/songs/${song.data.id}/memories`, { memory_id: mem1.data.id, relation: "story" });
  await c.req("POST", `/api/manavibe/songs/${song.data.id}/memories`, { memory_id: mem2.data.id, relation: "anecdote" });

  const r = await c.req("GET", `/api/people/${person.data.id}`);
  assert.equal(r.data.songs.length, 1, "DISTINCT doit dédupliquer");
});

test("isolation stricte : la personne d'une autre famille ne fuite rien", async () => {
  await nouvelleFamille();
  const person = await c.req("POST", "/api/people", { first_name: "Isolée" });

  const c2 = client(base);
  await registerAndCreateFamily(c2, `arbre-autre${Date.now()}@example.org`, "Autre", "Autre famille");
  const r2 = await c2.req("GET", `/api/people/${person.data.id}`);
  assert.equal(r2.status, 404, "une personne d'une autre famille doit être invisible");
});
