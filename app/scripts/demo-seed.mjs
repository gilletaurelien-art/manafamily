// Seed de démonstration MANAvibe — contenu FICTIF, clairement marqué.
// Sert aux captures d'interface et aux démos locales. Ne jamais utiliser
// sur des données réelles : `node scripts/demo-seed.mjs` écrit dans DATA_DIR.
//
// Crée : une famille démo, un compte démo, des chansons, un souvenir,
// un message vocal factice et une émission complète — puis imprime le
// cookie de session sur stdout (pour la capture Playwright).

import fs from "node:fs";

const PORT = process.env.DEMO_PORT || "4173";
process.env.PORT = PORT;
process.env.HTTPS = "0";
if (!process.env.DATA_DIR) process.env.DATA_DIR = "/tmp/manafamily-demo";

fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(process.env.DATA_DIR, { recursive: true });

const { buildServer } = await import("../server/index.js");
const server = buildServer();
await new Promise((r) => server.listen(Number(PORT), "127.0.0.1", r));
const base = `http://127.0.0.1:${PORT}`;

let cookie = "";
const req = async (method, url, body) => {
  const res = await fetch(base + url, {
    method,
    headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  return { status: res.status, data: await res.json().catch(() => null) };
};

const r1 = await req("POST", "/api/auth/register", {
  email: "demo@manafamily.bzh",
  password: "motdepasse8",
  display_name: "Membre démo",
});
const r2 = await req("POST", "/api/families", { name: "Famille démo (données fictives)" });
if (r1.status !== 201 || r2.status !== 201) {
  console.error("seed échec", r1, r2);
  process.exit(1);
}

// Les chansons de notre histoire (démo)
const song = (await req("POST", "/api/manavibe/songs", {
  title: "Fly Me to the Moon",
  primary_artist: "Frank Sinatra",
})).data;
await req("POST", `/api/manavibe/songs/${song.id}/recordings`, {
  artist: "Frank Sinatra", album: "It Might as Well Be Swing", year: 1964,
  isrc: "USSM19901231",
});
const song2 = (await req("POST", "/api/manavibe/songs", {
  title: "Dynamite", primary_artist: "BTS",
})).data;

// Le souvenir de mamie + son message vocal (fictif)
const mem = (await req("POST", "/api/memories", {
  title: "Où mamie écoutait Sinatra",
  kind: "text",
  description: "Dans la cuisine de Quimper, le dimanche matin, pendant que les crêpes cuisaient. (Contenu de démonstration.)",
})).data;
await req("POST", `/api/manavibe/songs/${song.id}/memories`, { memory_id: mem.id, relation: "story" });

// Message vocal (média fictif)
const voiceMem = (await req("POST", "/api/memories", {
  title: "Message vocal de mamie (démo)", kind: "audio", description: "Voix factice pour la démonstration.",
})).data;
const boundary = "----demoboundary";
const wav = Buffer.from("UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAAZGF0YQAAAAA=", "base64");
const mp = Buffer.concat([
  Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="file"; filename="voix.webm"\r\ncontent-type: audio/webm\r\n\r\n`),
  wav, Buffer.from(`\r\n--${boundary}--\r\n`),
]);
const up = await fetch(`${base}/api/memories/${voiceMem.id}/media`, {
  method: "POST", headers: { cookie, "content-type": `multipart/form-data; boundary=${boundary}` }, body: mp,
});
const voiceAssetId = (await up.json()).id;

// L'émission
const prog = (await req("POST", "/api/manavibe/programs", {
  title: "Les chansons de notre histoire (démo)",
  segments: [
    { type: "mana_voice", text: "Bienvenue dans MANAvibe — notre voyage musical en famille." },
    { type: "song_ref", song_id: song.id, by: null },
    { type: "family_voice", asset_id: voiceAssetId },
    { type: "transition", transition: { kind: "fade", duration_ms: 800 } },
    { type: "song_ref", song_id: song2.id, by: null },
    { type: "mana_voice", text: "Merci d'avoir partagé ce moment. La prochaine émission attend vos voix." },
  ],
})).data;

console.log(JSON.stringify({ ok: true, program: prog.id, cookie, base }));
// Le serveur reste actif : le processus parent (workflow) le tue ensuite.
