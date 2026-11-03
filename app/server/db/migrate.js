// Migrations versionnées : chaque fichier NNN_*.sql du dossier
// migrations/ est appliqué une seule fois, dans l'ordre, avec
// enregistrement dans schema_migrations. L'état initial du schéma
// est dans schema.sql, appliché comme migration 001 par db.js au
// premier démarrage.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function applyMigrations(db) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const migrationsDir = path.join(__dirname, "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });
  const initial = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations").all().map((r) => r.version)
  );

  if (!applied.has(1)) {
    const tx = db.transaction(() => {
      db.exec(initial);
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(1);
    });
    tx();
    applied.add(1);
    console.log("[migrate] schéma initial appliqué (001)");
  }

  for (const file of files) {
    const version = Number(file.split("_")[0]);
    if (!Number.isFinite(version) || version < 2 || applied.has(version)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(version);
    });
    tx();
    console.log(`[migrate] ${file} appliqué`);
  }
}

// ⚠️ Import DYNAMIQUE et NON ATTENDU au niveau module, délibérément.
// db.js importe `applyMigrations` de ce fichier de façon statique ; si cette
// ligne attendait l'import de db.js par un `await` au niveau module (top-level
// await), Node détecte le cycle comme un deadlock (« Detected unsettled
// top-level await ») et quitte en erreur (exit 13) — mesuré le 28/10/2026 en
// déploiement. Sans `await` ici, l'évaluation de CE module se termine
// d'abord ; l'import de db.js ne reprend qu'ensuite, une fois le cycle résolu.
if (process.argv[1] && process.argv[1].endsWith("migrate.js")) {
  import("./db.js").then(({ getDb }) => {
    applyMigrations(getDb());
    console.log("[migrate] base à jour");
  });
}
