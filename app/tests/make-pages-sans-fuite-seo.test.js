// connexion.html porte SON PROPRE bloc canonical/OG (injecté par
// build-seo.mjs, car /connexion est dans la table de routes). make-pages.js
// le lit comme gabarit pour toutes les autres pages — sans ce test, rien ne
// dit si une régression future le recopie dans les pages qui n'ont rien à
// voir avec /connexion.
//
// Exécuté sur une COPIE isolée de public/ : jamais sur le dépôt réel, pour
// qu'un test ne mute pas des fichiers suivis.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES } from "../server/seo/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

// Les pages de la table ROUTES portent LÉGITIMEMENT ce bloc — build-seo.mjs
// le leur injecte. Seules les pages HORS de cette table (celles que
// make-pages.js produit) ne doivent jamais le voir apparaître.
const FICHIERS_AVEC_BLOC_LEGITIME = new Set(
  ROUTES.map((r) => (r.htmlFile ? `${r.htmlFile}.html` : r.path === "/" ? "index.html" : `${r.path.slice(1)}.html`))
);

test("make-pages.js ne recopie pas le bloc seo:auto de connexion.html dans les autres pages", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "make-pages-verif-"));
  fs.cpSync(PUBLIC_DIR, tmp, { recursive: true });

  // connexion.html porte le bloc dans le dépôt réel seulement après
  // build-seo.mjs — on le simule ici pour ne pas dépendre de cet ordre.
  const connexionPath = path.join(tmp, "connexion.html");
  let connexion = fs.readFileSync(connexionPath, "utf8");
  if (!connexion.includes("seo:auto:start")) {
    connexion = connexion.replace(
      "</head>",
      '<!-- seo:auto:start -->\n  <link rel="canonical" href="https://manafamily.org/connexion">\n<!-- seo:auto:end -->\n</head>'
    );
    fs.writeFileSync(connexionPath, connexion);
  }

  execFileSync(process.execPath, [path.join(tmp, "js", "make-pages.js")], { stdio: "pipe" });

  const fuites = fs
    .readdirSync(tmp)
    .filter((f) => f.endsWith(".html") && !FICHIERS_AVEC_BLOC_LEGITIME.has(f))
    .filter((f) => fs.readFileSync(path.join(tmp, f), "utf8").includes("seo:auto:start"));

  fs.rmSync(tmp, { recursive: true, force: true });
  assert.deepEqual(fuites, [], `ces pages ne devraient pas porter le bloc de connexion.html : ${fuites.join(", ")}`);
});
