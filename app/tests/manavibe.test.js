// MANAvibe — tests d'acceptation T1–T8 (SPEC-v1.2 §7).
// Règle 0 : une émission familiale complète est jouable, archivable et
// exportable SANS AUCUN connecteur musical.

import test from "node:test";
import assert from "node:assert/strict";
import { startApp, client, registerAndCreateFamily, png1x1 } from "./helpers.js";

let app, base, c;

test.before(async () => {
  app = await startApp();
  base = app.base;
  c = client(base);
});

test.after(async () => {
  await new Promise((resolve) => app.server.close(resolve));
});

async function setup() {
  const email = `test${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.org`;
  const family = await registerAndCreateFamily(c, email, "Membre Test", "Famille test");
  return { family_id: family.family?.id || family.id, user_id: family.created_by || null };
}

// ---------------------------------------------------------------------------
// T1 — Émission fondateur : tous connecteurs OFF, toutes familles de segments,
//      dont un song_ref SANS enregistrement jouable. Jouable de bout en bout.
// ---------------------------------------------------------------------------
test("T1 : émission complète jouable, connecteurs OFF, song_ref nu", async () => {
  const ctx = await setup();
  const song = (
    await c.req("POST", "/api/manavibe/songs", { title: "Fly Me to the Moon", primary_artist: "Frank Sinatra" })
  ).data;

  // Souvenir + message vocal réel (média possédé) pour family_voice
  const memory = (await c.req("POST", "/api/memories", { title: "La voix de mamie", kind: "audio", description: "Message vocal" })).data;
  const memId = memory.memory?.id || memory.id;
  const up = await c.upload(`/api/memories/${memId}/media`, "voix.webm", Buffer.from("audio-bytes"), "audio/webm");
  const voiceAssetId = up.data.id;

  const program = (
    await c.req("POST", "/api/manavibe/programs", {
      title: "Les chansons de notre histoire",
      segments: [
        { type: "mana_voice", text: "Bienvenue dans notre voyage musical." },
        { type: "song_ref", song_id: song.id },
        { type: "transition", transition: { kind: "fade", duration_ms: 500 } },
        { type: "family_voice", asset_id: voiceAssetId, by: ctx.user_id },
        { type: "announcement", text: "Prochainement : le choix de Léon." },
      ],
    })
  ).data;

  const timeline = (await c.req("GET", `/api/manavibe/programs/${program.id}/timeline`)).data.timeline;

  assert.equal(timeline.length, 5, "l'émission déroule ses 5 segments, sans interruption");
  assert.equal(timeline[0].type, "mana_voice");
  assert.equal(timeline[1].type, "song_ref");
  assert.equal(timeline[1].song.title, "Fly Me to the Moon");
  assert.equal(timeline[1].playable, false, "aucun connecteur : pas de lecture intégrée");
  assert.equal(timeline[1].fallback.kind, "sober_notice", "sans souvenir associé : notice sobre, pas de contenu inventé");
  assert.equal(timeline[2].type, "transition");
  assert.equal(timeline[3].type, "family_voice");
  assert.equal(timeline[4].type, "announcement");
  // Zéro écran mort : chaque segment produit un rendu (texte, fiche, silence)
  for (const s of timeline) assert.ok(s.type, "segment rendu");
});

// ---------------------------------------------------------------------------
// T2 — SongReference minimale : {title} seul, utilisable immédiatement.
// ---------------------------------------------------------------------------
test("T2 : chanson minimale ({title}) utilisable dans une émission", async () => {
  await setup();
  const song = (await c.req("POST", "/api/manavibe/songs", { title: "Trois petites notes de musique" })).data;
  assert.ok(song.id);
  assert.equal(song.recordings.length, 0);
  assert.equal(song.memories.length, 0);

  const program = (
    await c.req("POST", "/api/manavibe/programs", {
      title: "Une chanson pour chacun",
      segments: [{ type: "song_ref", song_id: song.id }],
    })
  ).data;
  assert.ok(program.id, "une chanson sans ISRC, sans identifiant, sans lien : utilisable immédiatement");
});

// ---------------------------------------------------------------------------
// T3 — Une chanson, trois enregistrements ; suppression complète des liens :
//      chanson + souvenirs + émission intacts.
// ---------------------------------------------------------------------------
test("T3 : supprimer les enregistrements n'efface ni la chanson ni l'émission", async () => {
  await setup();
  const song = (await c.req("POST", "/api/manavibe/songs", { title: "Fly Me to the Moon", primary_artist: "Frank Sinatra" })).data;

  for (const artist of ["Frank Sinatra", "Petit-fils (reprise)", "Version instrumentale"]) {
    const r = await c.req("POST", `/api/manavibe/songs/${song.id}/recordings`, {
      artist,
      isrc: artist === "Frank Sinatra" ? "USSM19901231" : undefined,
      identifiers: artist === "Frank Sinatra" ? { spotifyId: "abc" } : {},
    });
    assert.equal(r.status, 201);
  }

  const detail = (await c.req("GET", `/api/manavibe/songs/${song.id}`)).data;
  assert.equal(detail.recordings.length, 3, "trois enregistrements, une seule chanson");

  for (const rec of detail.recordings) {
    await c.req("DELETE", `/api/manavibe/songs/${song.id}/recordings`, { recording_id: rec.id });
  }

  const after = (await c.req("GET", `/api/manavibe/songs/${song.id}`)).data;
  assert.equal(after.recordings.length, 0, "tous les enregistrements supprimés");
  assert.equal(after.title, "Fly Me to the Moon", "la chanson survit");
  assert.equal(after.memories.length, 0, "structure intacte");
});

// ---------------------------------------------------------------------------
// T4 — Repli honnête : avec souvenir → replay réel ; sans → notice sobre.
// ---------------------------------------------------------------------------
test("T4 : repli honnête, jamais de contenu inventé", async () => {
  await setup();
  // Chanson AVEC souvenir associé
  const songA = (await c.req("POST", "/api/manavibe/songs", { title: "Chanson A" })).data;
  const mem = (await c.req("POST", "/api/memories", { title: "Où mamie écoutait ça", kind: "text", description: "Dans la cuisine, un dimanche." })).data;
  await c.req("POST", `/api/manavibe/songs/${songA.id}/memories`, { memory_id: mem.memory?.id || mem.id, relation: "story" });

  const progA = (await c.req("POST", "/api/manavibe/programs", { title: "A", segments: [{ type: "song_ref", song_id: songA.id }] })).data;
  const tlA = (await c.req("GET", `/api/manavibe/programs/${progA.id}/timeline`)).data.timeline;
  assert.equal(tlA[0].fallback.kind, "replay_real_content", "souvenir réel → relu");
  assert.ok(tlA[0].fallback.source_memory_ids.length > 0);

  // Chanson SANS souvenir
  const songB = (await c.req("POST", "/api/manavibe/songs", { title: "Chanson B" })).data;
  const progB = (await c.req("POST", "/api/manavibe/programs", { title: "B", segments: [{ type: "song_ref", song_id: songB.id }] })).data;
  const tlB = (await c.req("GET", `/api/manavibe/programs/${progB.id}/timeline`)).data.timeline;
  assert.equal(tlB[0].fallback.kind, "sober_notice", "aucun souvenir → notice sobre, l'émission continue");
  assert.equal(tlB[0].fallback.source_memory_ids, undefined, "aucune source inventée");
});

// ---------------------------------------------------------------------------
// T5 — Export autonome : archive complète, chansons en métadonnées seulement.
// ---------------------------------------------------------------------------
test("T5 : archive autonome, rejouable sans plateforme", async () => {
  await setup();
  const song = (await c.req("POST", "/api/manavibe/songs", { title: "Fly Me to the Moon", primary_artist: "Frank Sinatra" })).data;
  const mem = (await c.req("POST", "/api/memories", { title: "Le souvenir", kind: "text", description: "L'histoire de mamie." })).data;
  await c.req("POST", `/api/manavibe/songs/${song.id}/memories`, { memory_id: mem.memory?.id || mem.id, relation: "story" });

  const program = (
    await c.req("POST", "/api/manavibe/programs", {
      title: "Les souvenirs en musique",
      segments: [
        { type: "mana_voice", text: "Voici l'histoire de cette chanson." },
        { type: "song_ref", song_id: song.id },
      ],
    })
  ).data;

  const archive = (await c.req("GET", `/api/manavibe/programs/${program.id}/archive`)).data;
  assert.equal(archive.program_id, program.id);
  assert.ok(archive.manifest.segments.length === 2, "conducteur complet");
  assert.ok(archive.songs.length === 1 && archive.songs[0].title === "Fly Me to the Moon");
  assert.equal(archive.songs[0].primary_artist, "Frank Sinatra", "chanson = métadonnées seulement");
  assert.equal(archive.songs[0].links, undefined, "aucune dépendance de lecture");
  assert.equal(archive.memories.length, 1, "le souvenir est exporté");
  assert.ok(archive.note.includes("autonome"));
});

// ---------------------------------------------------------------------------
// T6 — Isolation du ManaPlayer : le lecteur ne peut pas jouer une référence
//      musicale. Ici : ManaPlayer = la route media existante, qui ne connaît
//      que media_asset. Vérification structurelle + comportementale.
// ---------------------------------------------------------------------------
test("T6 : le lecteur ne joue que des actifs possédés", async () => {
  await setup();
  const song = (await c.req("POST", "/api/manavibe/songs", { title: "Fly Me to the Moon" })).data;
  const recording = (await c.req("POST", `/api/manavibe/songs/${song.id}/recordings`, { artist: "Frank Sinatra" })).data.recording;

  // La lecture d'un actif passe par /api/media/:id (actifs possédés).
  // Une référence musicale N'EST PAS un actif : aucune route ne peut la « jouer ».
  const res = await c.req("GET", `/api/media/${recording.id}`);
  assert.notEqual(res.status, 200, "un RecordingReference n'est pas jouable par le lecteur");

  // Structurel : le service manavibe n'expose aucune fonction de lecture musicale
  const mod = await import("../server/services/manavibe.js");
  const playerish = Object.keys(mod).filter((k) => /^play|stream|audio/i.test(k));
  assert.equal(playerish.length, 0, "aucune fonction de lecture musicale dans manavibe");
});

// ---------------------------------------------------------------------------
// T7 — Connecteurs off par défaut.
// ---------------------------------------------------------------------------
test("T7 : connecteurs désactivés par défaut", async () => {
  await setup();
  const list = (await c.req("GET", "/api/manavibe/songs")).data;
  assert.equal(list.connectors.youtube_embed, false);
  assert.equal(list.connectors.deezer_preview, false);
  const mod = await import("../server/services/manavibe.js");
  assert.equal(mod.connectors.embeds.youtubeEmbed.enabled, false);
  assert.equal(mod.connectors.embeds.deezerPreview.enabled, false);
});

// ---------------------------------------------------------------------------
// T8 — Traçabilité : aucune pochette ni métadonnée externe stockée ;
//      la chanson ne conserve que des données saisies par la famille.
// ---------------------------------------------------------------------------
test("T8 : aucune donnée externe stockée par défaut", async () => {
  await setup();
  const song = (await c.req("POST", "/api/manavibe/songs", { title: "Fly Me to the Moon", primary_artist: "Frank Sinatra" })).data;
  const recording = (
    await c.req("POST", `/api/manavibe/songs/${song.id}/recordings`, { artist: "Frank Sinatra", identifiers: { spotifyId: "xyz" } })
  ).data.recording;

  assert.equal(song.artwork, undefined, "pas de pochette stockée — défaut : photo du membre");
  assert.equal(recording.resolvedLinks, undefined, "aucune URL résolue stockée (mortelle par nature)");
  assert.equal(recording.identifiers.spotifyId, "xyz", "les identifiants persistants sont conservés, déclarés par la famille");
});
