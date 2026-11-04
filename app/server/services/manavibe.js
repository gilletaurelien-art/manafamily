// MANAvibe — studio de mémoire musicale familiale (spec v1.2, règle 0).
//
// La mémoire appartient à la chanson (SongReference), le choix d'écoute
// appartient à l'enregistrement (RecordingReference). Aucun connecteur
// musical n'est développé à ce stade : ExternalPlaybackHost et
// DeepLinkService sont des interfaces vides, désactivées par défaut.
//
// Invariants (SPEC-v1.2 §6) : aucun enregistrement commercial hébergé,
// repli honnête sans contenu inventé, émission complète sans lecture
// externe, identifiants externes tous facultatifs.

import { getDb, newId } from "../db/db.js";
import { httpError } from "../lib/http.js";
import { requiredStr, optional, validId, validEnum } from "../lib/validate.js";

// ---------------------------------------------------------------------------
// Connecteurs (interfaces vides — T7 : désactivés par défaut)
// ---------------------------------------------------------------------------

export const connectors = Object.freeze({
  embeds: Object.freeze({
    youtubeEmbed: Object.freeze({ enabled: false }),
    deezerPreview: Object.freeze({ enabled: false }),
  }),
  // Aucun connecteur musical n'existe à ce stade. L'ouverture (phase v1.3)
  // se fera en ajoutant une entrée ici — jamais en modifiant le conducteur.
});

// ---------------------------------------------------------------------------
// SongReference / RecordingReference
// ---------------------------------------------------------------------------

export function createSong(user, ctx, input) {
  const db = getDb();
  const id = newId("song");
  const title = requiredStr(input.title, "Le titre de la chanson", 300);
  const artist = optional(input.primary_artist, 200);
  db.prepare(
    `INSERT INTO song (id, family_id, title, primary_artist, created_by)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, ctx.family.id, title, artist, user.id);
  return getSongDetail(ctx, id);
}

export function listSongs(ctx) {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.id, s.title, s.primary_artist, s.created_at,
              (SELECT COUNT(*) FROM recording r WHERE r.song_id = s.id) AS recordings,
              (SELECT COUNT(*) FROM song_memory sm WHERE sm.song_id = s.id) AS memories
         FROM song s WHERE s.family_id = ? ORDER BY s.created_at DESC`
    )
    .all(ctx.family.id)
    .map(songSummary);
}

export function getSongDetail(ctx, id) {
  const db = getDb();
  const song = db
    .prepare("SELECT * FROM song WHERE id = ? AND family_id = ?")
    .get(id, ctx.family.id);
  if (!song) throw httpError(404, "Chanson introuvable");

  const recordings = db
    .prepare("SELECT * FROM recording WHERE song_id = ? ORDER BY created_at")
    .all(song.id)
    .map(parseRecording);

  // La mémoire de la chanson : les souvenirs réellement associés.
  const memories = db
    .prepare(
      `SELECT m.id, m.title, m.description, m.kind, sm.relation
         FROM song_memory sm JOIN memory m ON m.id = sm.memory_id
        WHERE sm.song_id = ?
        ORDER BY sm.attached_at DESC`
    )
    .all(song.id);

  return {
    id: song.id,
    title: song.title,
    primary_artist: song.primary_artist,
    recordings,
    memories,
    contributed_by: song.created_by,
    created_at: song.created_at,
  };
}

export function attachSongMemory(user, ctx, songId, input) {
  const db = getDb();
  const song = db
    .prepare("SELECT id FROM song WHERE id = ? AND family_id = ?")
    .get(validId(songId), ctx.family.id);
  if (!song) throw httpError(404, "Chanson introuvable");
  const memory = db
    .prepare("SELECT id FROM memory WHERE id = ? AND family_id = ?")
    .get(validId(input.memory_id), ctx.family.id);
  if (!memory) throw httpError(404, "Souvenir introuvable");
  const relation = validEnum(input.relation || "story", ["story", "anecdote", "dedication"], "La relation");
  db.prepare(
    `INSERT INTO song_memory (song_id, memory_id, relation, attached_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (song_id, memory_id, relation) DO NOTHING`
  ).run(song.id, memory.id, relation, user.id);
  return getSongDetail(ctx, song.id);
}

export function addRecording(user, ctx, songId, input) {
  const db = getDb();
  const song = db
    .prepare("SELECT id FROM song WHERE id = ? AND family_id = ?")
    .get(validId(songId), ctx.family.id);
  if (!song) throw httpError(404, "Chanson introuvable");
  const id = newId("rec");
  const identifiers = sanitizeIdentifiers(input.identifiers);
  db.prepare(
    `INSERT INTO recording (id, song_id, artist, album, year, isrc, identifiers, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    song.id,
    requiredStr(input.artist, "L'artiste", 200),
    optional(input.album, 200),
    input.year ? Number(input.year) : null,
    optional(input.isrc, 32),
    JSON.stringify(identifiers),
    user.id
  );
  return { recording: parseRecording(db.prepare("SELECT * FROM recording WHERE id = ?").get(id)) };
}

export function deleteRecording(ctx, songId, recordingId) {
  const db = getDb();
  // Supprimer un enregistrement n'efface jamais la chanson ni son souvenir (T3).
  const res = db
    .prepare(
      `DELETE FROM recording WHERE id = ? AND song_id = ?
        AND song_id IN (SELECT id FROM song WHERE family_id = ?)`
    )
    .run(validId(recordingId), validId(songId), ctx.family.id);
  if (res.changes === 0) throw httpError(404, "Enregistrement introuvable");
  return { ok: true };
}

// Les liens résolus sont MORTELS : jamais stockés, re-résolus à l'affichage.
// Aucun connecteur n'étant actif, la résolution est vide par principe —
// et le conducteur n'en dépend pas.
export function resolveLinks(ctx, recordingId) {
  const row = getDb()
    .prepare(
      `SELECT r.id FROM recording r JOIN song s ON s.id = r.song_id
        WHERE r.id = ? AND s.family_id = ?`
    )
    .get(validId(recordingId), ctx.family.id);
  if (!row) throw httpError(404, "Enregistrement introuvable");
  return {}; // phase v1.3 : la Gateway remplira ceci via un connecteur activé
}

// ---------------------------------------------------------------------------
// Program (le conducteur déclaratif)
// ---------------------------------------------------------------------------

const SEGMENT_TYPES = ["mana_voice", "family_voice", "song_ref", "transition", "announcement"];

export function createProgram(user, ctx, input) {
  const db = getDb();
  const id = newId("prg");
  const segments = validateSegments(ctx, input.segments);
  db.prepare(
    `INSERT INTO program (id, family_id, title, segments, created_by)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, ctx.family.id, requiredStr(input.title, "Le titre de l'émission", 300), JSON.stringify(segments), user.id);
  return getProgramDetail(ctx, id);
}

export function listPrograms(ctx) {
  const db = getDb();
  return db
    .prepare("SELECT id, title, created_at, updated_at FROM program WHERE family_id = ? ORDER BY created_at DESC")
    .all(ctx.family.id);
}

export function getProgramDetail(ctx, id) {
  const db = getDb();
  const program = db
    .prepare("SELECT * FROM program WHERE id = ? AND family_id = ?")
    .get(validId(id), ctx.family.id);
  if (!program) throw httpError(404, "Émission introuvable");
  return {
    id: program.id,
    title: program.title,
    segments: JSON.parse(program.segments),
    created_by: program.created_by,
    created_at: program.created_at,
  };
}

export function updateProgram(user, ctx, id, input) {
  const db = getDb();
  const segments = validateSegments(ctx, input.segments);
  const res = db
    .prepare("UPDATE program SET segments = ?, updated_at = datetime('now') WHERE id = ? AND family_id = ?")
    .run(JSON.stringify(segments), validId(id), ctx.family.id);
  if (res.changes === 0) throw httpError(404, "Émission introuvable");
  return getProgramDetail(ctx, id);
}

export function deleteProgram(ctx, id) {
  const res = getDb()
    .prepare("DELETE FROM program WHERE id = ? AND family_id = ?")
    .run(validId(id), ctx.family.id);
  if (res.changes === 0) throw httpError(404, "Émission introuvable");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Le fil conducteur : déroulé d'une émission, connecteurs OFF (T1)
// ---------------------------------------------------------------------------

// Chaque segment est enrichi pour la lecture. Un song_ref SANS enregistrement
// jouable reste un plein segment de mémoire : le souvenir se raconte,
// l'écoute est simplement absente (T1, T4).
export function buildTimeline(ctx, programId) {
  const program = getProgramDetail(ctx, programId);
  const db = getDb();

  return program.segments.map((segment) => {
    if (segment.type !== "song_ref") return segment;

    // Fiche souvenir : toujours affichée, même sans rien de jouable.
    const song = getSongDetail(ctx, segment.song_id);
    const chosen = song.recordings.find((r) => r.id === segment.chosen_recording_id) || null;
    const playable = Boolean(chosen) && connectorsAvailable(chosen);

    // Repli honnête (T4) : MANA ne fabrique jamais de contenu. Si un
    // souvenir réel est associé, il peut être relu ; sinon notice sobre.
    const fallback = playable
      ? null
      : song.memories.length > 0
        ? { kind: "replay_real_content", source_memory_ids: song.memories.map((m) => m.id) }
        : { kind: "sober_notice" };

    return { ...segment, song, chosen_recording: chosen, playable, fallback, connectors: connectorStates() };
  });
}

// ---------------------------------------------------------------------------
// Export autonome (T5) : l'émission survit hors ligne, sans les plateformes.
// Chansons en métadonnées seulement — aucune dépendance de lecture.
// ---------------------------------------------------------------------------

export function exportArchive(ctx, programId) {
  const program = getProgramDetail(ctx, programId);
  const db = getDb();
  const assets = [];
  const memories = [];
  const songs = [];

  for (const segment of program.segments) {
    if (segment.type === "family_voice") {
      const asset = db
        .prepare(
          `SELECT m.* FROM media_asset m
             JOIN memory_media mm ON mm.media_id = m.id
            WHERE m.id = ? AND m.family_id = ?`
        )
        .get(segment.asset_id, ctx.family.id);
      if (asset) assets.push(asset);
    }
    if (segment.type === "song_ref") {
      const song = getSongDetail(ctx, segment.song_id);
      songs.push({ title: song.title, primary_artist: song.primary_artist });
      for (const mem of song.memories) {
        if (!memories.some((m) => m.id === mem.id)) memories.push(mem);
      }
    }
  }

  return {
    program_id: program.id,
    manifest: { title: program.title, created_at: program.created_at, segments: program.segments },
    assets,
    memories,
    songs,
    exported_at: new Date().toISOString(),
    note: "Archive autonome MANAvibe — rejouable sans aucun service musical externe.",
  };
}

// ---------------------------------------------------------------------------
// Interne
// ---------------------------------------------------------------------------

function validateSegments(ctx, raw) {
  if (!Array.isArray(raw)) throw httpError(400, "Les segments de l'émission sont requis");
  const db = getDb();
  return raw.map((s, i) => {
    const type = validEnum(s.type, SEGMENT_TYPES, `Le type du segment ${i + 1}`);
    if (type === "mana_voice" || type === "announcement")
      return { type, text: requiredStr(s.text, `Le texte du segment ${i + 1}`, 2000), by: s.by || null };
    if (type === "family_voice") {
      const ok = db
        .prepare(
          `SELECT m.id FROM media_asset m
             JOIN memory_media mm ON mm.media_id = m.id
            WHERE m.id = ? AND m.family_id = ?`
        )
        .get(validId(s.asset_id), ctx.family.id);
      if (!ok) throw httpError(400, `La voix du segment ${i + 1} est introuvable`);
      return { type, asset_id: s.asset_id, by: s.by ? validId(s.by) : null };
    }
    if (type === "song_ref") {
      const song = db
        .prepare("SELECT id FROM song WHERE id = ? AND family_id = ?")
        .get(validId(s.song_id), ctx.family.id);
      if (!song) throw httpError(400, `La chanson du segment ${i + 1} est introuvable`);
      return {
        type,
        song_id: s.song_id,
        chosen_recording_id: s.chosen_recording_id ? validId(s.chosen_recording_id) : null,
        by: s.by || null,
      };
    }
    // transition
    return { type, transition: { kind: validEnum(s.transition?.kind || "silence", ["silence", "fade"], "La transition"), duration_ms: Math.max(0, Number(s.transition?.duration_ms) || 800) } };
  });
}

function parseRecording(row) {
  return {
    id: row.id,
    song_id: row.song_id,
    artist: row.artist,
    album: row.album,
    year: row.year,
    isrc: row.isrc,
    identifiers: JSON.parse(row.identifiers || "{}"),
    created_at: row.created_at,
  };
}

function sanitizeIdentifiers(input) {
  const allowed = ["spotifyId", "deezerId", "appleMusicId", "youtubeId"];
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const key of allowed)
    if (typeof input[key] === "string" && input[key].length <= 128) out[key] = input[key];
  return out;
}

function songSummary(row) {
  return {
    id: row.id,
    title: row.title,
    primary_artist: row.primary_artist,
    recordings: row.recordings,
    memories: row.memories,
    created_at: row.created_at,
  };
}

// Aucun connecteur n'étant actif (T7), rien n'est jamais « jouable » via
// un lecteur intégré — par construction, pas par exception.
function connectorsAvailable(recording) {
  return false;
}

export function connectorStates() {
  return {
    youtube_embed: connectors.embeds.youtubeEmbed.enabled,
    deezer_preview: connectors.embeds.deezerPreview.enabled,
  };
}
