// app.js déclare ses fonctions (api, el, fmtDate…) en `function nom(...)`
// AU PREMIER NIVEAU, puis les exporte sous le MÊME nom dans `window.mf`.
// N'importe quelle page qui fait ensuite `const { api, el } = window.mf;`
// redéclare ce même identifiant dans la portée globale PARTAGÉE entre
// scripts classiques — SyntaxError à l'analyse, et le fichier entier
// n'exécute RIEN : aucun formulaire, aucune liste, aucun bouton.
//
// 🔴 Vécu réellement, en navigateur, le 08/11/2026 — 14 des 17 pages de
// l'app, dont l'accueil et l'inscription : zéro écran mort n'apparaissait
// (le gabarit statique s'affiche quand même), mais rien n'était cliquable
// ni ne se chargeait. Les 779 tests restaient au vert pendant ce temps :
// ils tournent sans navigateur, donc sans cette collision. Base à 0 famille
// depuis le lancement — cohérent avec un formulaire d'inscription mort.
//
// Validé par mutation avant d'écrire ce test : je l'ai fait échouer contre
// les 14 fichiers originaux avant de les corriger.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const JS_DIR = path.join(PUBLIC_DIR, "js");

// Les noms qu'app.js déclare EN FONCTION au premier niveau ET exporte sous
// le même nom — exactement ceux qui collisionnent si redéclarés en `const`.
function nomsExportesParAppJs() {
  const appJs = fs.readFileSync(path.join(PUBLIC_DIR, "app.js"), "utf8");
  const declares = new Set(
    [...appJs.matchAll(/^(?:async )?function (\w+)\(/gm)].map((m) => m[1])
  );
  const exportMatch = appJs.match(/window\.mf = \{([^}]*)\};/);
  if (!exportMatch) throw new Error("app.js : window.mf = {...} introuvable");
  const exportes = exportMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  return exportes.filter((n) => declares.has(n));
}

test("aucun script de page ne redéclare en `const`/`let` un nom qu'app.js exporte", () => {
  const colliseurs = nomsExportesParAppJs();
  assert.ok(colliseurs.length > 0, "la liste de référence ne doit pas être vide — sinon ce test ne protège rien");

  const violations = [];
  for (const fichier of fs.readdirSync(JS_DIR)) {
    if (!fichier.endsWith(".js") || fichier === "make-pages.js") continue;
    const src = fs.readFileSync(path.join(JS_DIR, fichier), "utf8");
    // Une déstructuration de window.mf vers une liaison bloc-scoped (const/let)
    // au premier niveau du fichier — peu importe les noms qu'elle prend.
    const m = src.match(/^\s*(?:const|let)\s*\{([^}]*)\}\s*=\s*window\.mf\s*;/m);
    if (!m) continue;
    const pris = m[1].split(",").map((s) => s.trim().split(":")[0].trim()).filter(Boolean);
    const enCollision = pris.filter((n) => colliseurs.includes(n));
    if (enCollision.length) violations.push(`${fichier} : ${enCollision.join(", ")}`);
  }

  assert.deepEqual(
    violations,
    [],
    `ces fichiers redéclarent un nom qu'app.js a déjà en global — SyntaxError garanti au chargement :\n  ${violations.join("\n  ")}`
  );
});
