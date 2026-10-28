// Serveur HTTP MANAfamily : API JSON + front statique privé.
// Aucune exposition publique autre que l'app elle-même (auth requise).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./router.js";
import { getDb } from "./db/db.js";
import { getUserByToken, readSessionToken, getFamilyContext } from "./auth/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const AUTH_PAGE_PREFIXES = ["/souvenirs", "/famille", "/agenda", "/creer", "/albums", "/recits"];
const AUTH_PAGES = new Set(["/parametres"]);
function needsAuth(pathname) {
  return AUTH_PAGES.has(pathname) || AUTH_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function serveFile(res, filePath, status = 200) {
  const ext = path.extname(filePath);
  res.writeHead(status, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-store" : "private, max-age=3600",
    "x-content-type-options": "nosniff",
  });
  fs.createReadStream(filePath).pipe(res);
}

// Pages détail : route virtuelle → page HTML correspondante.
const DETAIL_ROUTES = [
  [/^\/souvenirs\/[\w-]+$/, "/souvenirs-detail"],
  [/^\/famille\/[\w-]+$/, "/personne"],
  [/^\/albums\/[\w-]+$/, "/album"],
  [/^\/recits\/[\w-]+$/, "/recit"],
];

export function buildServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/api/")) {
      handleApi(req, res, pathname);
      return;
    }
    serveStatic(req, res, pathname);
  });
}

function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("Méthode non autorisée");
    return;
  }

  let page = pathname === "/" ? "/index" : pathname;
  for (const [re, target] of DETAIL_ROUTES) {
    if (re.test(pathname)) { page = target; break; }
  }
  const htmlPath = path.join(PUBLIC_DIR, page + ".html");

  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    if (needsAuth(pathname)) {
      const user = getUserByToken(readSessionToken(req));
      if (!user) {
        res.writeHead(302, { location: "/connexion" });
        res.end();
        return;
      }
      const ctx = getFamilyContext(user, req);
      if (!ctx.family && pathname !== "/parametres") {
        res.writeHead(302, { location: "/creer-famille" });
        res.end();
        return;
      }
    }
    serveFile(res, htmlPath);
    return;
  }

  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safe);
  if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
    return;
  }

  const notFound = path.join(PUBLIC_DIR, "404.html");
  if (fs.existsSync(notFound)) serveFile(res, notFound, 404);
  else {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Introuvable");
  }
}

// Démarrage direct (node server/index.js)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const PORT = Number(process.env.PORT || 3000);
  getDb();
  buildServer().listen(PORT, () => {
    console.log(`MANAfamily prêt sur http://localhost:${PORT}`);
  });
}
