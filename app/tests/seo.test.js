// Garde-fou SEO : la table unique (server/seo/routes.js) doit rester en
// phase avec les fichiers générés (robots.txt, sitemap.xml, llms.txt, et le
// canonical/OG injecté dans chaque page publique). Un oubli de régénération
// après avoir modifié routes.js se voit ici, pas en production trois
// semaines plus tard — c'est exactement le trou constaté le 28/10/2026 sur
// l'ancien robots-family.txt/llms-family.txt, qui décrivaient un produit
// disparu.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES, validateRoutes } from "../server/seo/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "..", "scripts", "build-seo.mjs");

test("aucune route sans titre, aucun titre partagé par deux routes", () => {
  assert.deepEqual(validateRoutes(), []);
});

test("les fichiers générés (robots/sitemap/llms + canonical/OG par page) sont à jour", () => {
  // --check n'écrit rien : il échoue (code non nul) si le dépôt est périmé
  // par rapport à server/seo/routes.js.
  assert.doesNotThrow(() => {
    execFileSync("node", [SCRIPT, "--check"], { stdio: "pipe" });
  }, "lancer `node scripts/build-seo.mjs` (sans --check) pour régénérer");
});

test("chaque route de la table a une URL distincte", () => {
  const vus = new Set();
  for (const r of ROUTES) {
    assert.ok(!vus.has(r.path), `route dupliquée : ${r.path}`);
    vus.add(r.path);
  }
});
