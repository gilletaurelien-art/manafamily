#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Génère robots.txt, sitemap.xml, llms.txt ET injecte canonical/OG dans les
// pages publiques — tout dérivé de server/seo/routes.js, la table unique.
//
// ⛔ JAMAIS À LA MAIN SUR LE SERVEUR : ce script tourne ici, dans le dépôt,
// et son résultat est committé. Un fichier copié à la main sur le serveur a
// disparu au premier `rsync --delete` du 28/10/2026 sur un autre domaine —
// ne pas refaire cette erreur ici.
//
//   node scripts/build-seo.mjs        — régénère et écrit
//   node scripts/build-seo.mjs --check — échoue si le dépôt est périmé
// ═══════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES, SITE_URL, sitemapRoutes, validateRoutes, REDIRECTING_PREFIXES } from "../server/seo/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const CHECK = process.argv.includes("--check");

const problems = validateRoutes();
if (problems.length) {
  console.error("[build-seo] table de routes invalide :\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}

function htmlFileFor(route) {
  const name = route.htmlFile || (route.path === "/" ? "index" : route.path.slice(1));
  return path.join(PUBLIC_DIR, `${name}.html`);
}

// ── robots.txt ───────────────────────────────────────────────────────────
const robots = `# ${SITE_URL} — règles d'exploration
# Pas une barrière de sécurité : les pages privées (${REDIRECTING_PREFIXES.join(", ")})
# redirigent déjà en 302 vers /connexion pour qui n'a pas de session — c'est
# le compte qui protège, pas ce fichier.
User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`;

// ── sitemap.xml — uniquement les destinations réelles, jamais une URL qui
//    redirige (erreur corrigée le 28/10/2026 sur un autre domaine : six
//    redirections listées comme canoniques, les quatre vraies destinations
//    absentes) ──────────────────────────────────────────────────────────
const urls = sitemapRoutes()
  .map((r) => `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <priority>${r.priority || "0.5"}</priority>\n  </url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

// ── llms.txt — décrit CE produit, pas l'ancien Carnet qu'il remplace ────
const llms = `# MANAfamily

> Maison numérique familiale privée — un espace réservé aux membres d'une même famille, jamais un réseau public.

MANAfamily est une application autonome (Node.js, SQLite), distincte du
reste de l'écosystème MANA (mana.bzh, mana.love). Aucune page de ce domaine
n'est publique au-delà de l'inscription et de la connexion : le contenu
familial (${REDIRECTING_PREFIXES.map((p) => p.slice(1)).join(", ")}) n'existe
qu'après authentification et appartenance à une famille.

## Pages publiques

${sitemapRoutes().map((r) => `- [${r.title}](${SITE_URL}${r.path}) — ${r.description}`).join("\n")}
`;

const outputs = {
  "robots.txt": robots,
  "sitemap.xml": sitemap,
  "llms.txt": llms,
};

// ── canonical + OG, injectés dans chaque page publique ──────────────────
const MARK_START = "<!-- seo:auto:start -->";
const MARK_END = "<!-- seo:auto:end -->";

function seoBlock(route) {
  const url = `${SITE_URL}${route.path}`;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return [
    MARK_START,
    `  <link rel="manifest" href="/manifest.json">`,
    `  <link rel="canonical" href="${url}">`,
    `  <meta property="og:site_name" content="MANAfamily">`,
    `  <meta property="og:type" content="${route.ogType || "website"}">`,
    `  <meta property="og:title" content="${esc(route.title)}">`,
    `  <meta property="og:description" content="${esc(route.description)}">`,
    `  <meta property="og:url" content="${url}">`,
    MARK_END,
  ].join("\n");
}

let touched = [];
let stale = [];

for (const route of ROUTES) {
  const file = htmlFileFor(route);
  if (!fs.existsSync(file)) { stale.push(`${file} introuvable`); continue; }
  let html = fs.readFileSync(file, "utf8");

  // titre + description : on corrige s'ils divergent de la table (ex. le
  // copier-coller trouvé le 28/10/2026 sur mentions-legales.html et
  // 404.html, qui portaient tous deux la description de connexion.html)
  const wantTitle = `<title>${route.title}</title>`;
  const wantDesc = `<meta name="description" content="${route.description.replace(/"/g, "&quot;")}">`;
  let next = html
    .replace(/<title>.*?<\/title>/, wantTitle)
    .replace(/<meta name="description" content=".*?">/, wantDesc);

  // Pas de canonical/OG sur la page d'erreur : elle n'est pas une URL
  // publique visée, et un canonical sur /404 n'a pas de sens à faire indexer.
  if (route.path !== "/404") {
    const block = seoBlock(route);
    if (next.includes(MARK_START)) {
      next = next.replace(new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`), block);
    } else {
      next = next.replace("</head>", `${block}\n</head>`);
    }
  }

  if (next !== html) {
    touched.push(file);
    if (!CHECK) fs.writeFileSync(file, next);
  }
}

for (const [name, content] of Object.entries(outputs)) {
  const file = path.join(PUBLIC_DIR, name);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current !== content) {
    touched.push(file);
    if (!CHECK) fs.writeFileSync(file, content);
  }
}

if (stale.length) {
  console.error("[build-seo] routes sans fichier HTML :\n" + stale.map((s) => "  - " + s).join("\n"));
  process.exit(1);
}

if (CHECK) {
  if (touched.length) {
    console.error(`[build-seo] dépôt périmé — relancer sans --check pour ${touched.length} fichier(s) :`);
    for (const f of touched) console.error("  - " + f);
    process.exit(1);
  }
  console.log("[build-seo] à jour");
} else {
  console.log(`[build-seo] ${touched.length} fichier(s) écrit(s) ou mis à jour`);
}
