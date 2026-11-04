// demo-seed.mjs efface DATA_DIR avant de le repeupler de contenu fictif.
// Le commentaire dit « ne jamais utiliser sur des données réelles » — ce
// test vérifie que c'est un GARDE DUR, pas seulement un commentaire : un
// DATA_DIR qui ne porte pas la marque "demo" doit être refusé, et son
// contenu ne doit pas être touché.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "..", "scripts", "demo-seed.mjs");

test("demo-seed : refuse un DATA_DIR qui ne porte pas la marque « demo », et ne le touche pas", () => {
  const faux = fs.mkdtempSync(path.join(os.tmpdir(), "pas-une-demo-"));
  const marqueur = path.join(faux, "donnee-reelle.txt");
  fs.writeFileSync(marqueur, "ceci devrait survivre");

  assert.throws(() => {
    execFileSync(process.execPath, [SCRIPT], {
      env: { ...process.env, DATA_DIR: faux },
      stdio: "pipe",
    });
  }, /Command failed/, "le script doit sortir en erreur");

  assert.ok(fs.existsSync(marqueur), "le répertoire réel ne doit pas avoir été effacé");
  fs.rmSync(faux, { recursive: true, force: true });
});

test("demo-seed : accepte un DATA_DIR qui porte la marque « demo » — ne refuse pas, crée le dossier", () => {
  const demo = path.join(os.tmpdir(), "verif-manafamily-demo-" + Date.now());
  fs.rmSync(demo, { recursive: true, force: true });
  try {
    execFileSync(process.execPath, [SCRIPT], {
      env: { ...process.env, DATA_DIR: demo, DEMO_PORT: "0" },
      stdio: "pipe",
      timeout: 4000,
    });
  } catch (e) {
    // Le script peut échouer plus loin (serveur qui reste en écoute,
    // dépendance absente dans CET environnement…) : seul le GARDE nous
    // intéresse ici, pas la suite du script.
    const sortie = String(e.stderr || "") + String(e.stdout || "");
    assert.ok(!sortie.includes("refus d'effacer"), "le garde DATA_DIR n'aurait pas dû refuser ce chemin");
  } finally {
    const cree = fs.existsSync(demo);
    fs.rmSync(demo, { recursive: true, force: true });
    assert.ok(cree, "le dossier demo aurait dû être créé — le garde n'a pas dû bloquer avant mkdirSync");
  }
});
