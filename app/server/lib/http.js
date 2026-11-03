// http — utilitaires serveur : corps JSON, cookies, réponses.

import crypto from "node:crypto";

export const MAX_JSON = 2 * 1024 * 1024;

export function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_JSON) {
        reject(httpError(413, "Corps trop volumineux."));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(httpError(400, "JSON invalide."));
      }
    });
    req.on("error", () => reject(httpError(400, "Lecture impossible.")));
  });
}

export function httpError(status, message, details) {
  const e = new Error(message);
  e.status = status;
  if (details) e.details = details;
  return e;
}

export function send(res, status, body, headers = {}) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  res.end(payload);
}

export function sendError(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error("[erreur]", err);
  send(res, status, { error: err.message || "Erreur interne." });
}

export function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (!h) return out;
  for (const part of h.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionCookie(token, maxAge) {
  const secure = process.env.HTTPS === "1" ? " Secure;" : "";
  return `mfs=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  const secure = process.env.HTTPS === "1" ? " Secure;" : "";
  return `mfs=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function parseMultipart(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const boundaryHeader = req.headers["content-type"] || "";
    const m = boundaryHeader.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!m) return reject(httpError(400, "Requête multipart invalide."));
    const boundary = "--" + (m[1] || m[2]).trim();
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(httpError(413, "Fichier trop volumineux (max " + Math.round(maxBytes / 1024 / 1024) + " Mo)."));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(parseMultipartBody(Buffer.concat(chunks), boundary)));
    req.on("error", () => reject(httpError(400, "Téléversement interrompu.")));
  });
}

function parseMultipartBody(buf, boundary) {
  const parts = [];
  const b = Buffer.from(boundary);
  let start = buf.indexOf(b);
  while (start !== -1) {
    const contentStart = start + b.length;
    const next = buf.indexOf(b, contentStart);
    if (next === -1) break;
    let part = buf.slice(contentStart, next);
    // retire le \r\n initial et le \r\n final
    if (part[0] === 13 && part[1] === 10) part = part.slice(2);
    if (part[part.length - 2] === 13 && part[part.length - 1] === 10) part = part.slice(0, -2);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const head = part.slice(0, headerEnd).toString("utf8");
      const body = part.slice(headerEnd + 4);
      const nameM = head.match(/name="([^"]*)"/);
      const fileM = head.match(/filename="([^"]*)"/);
      const typeM = head.match(/content-type:\s*([^\r\n]+)/i);
      if (nameM) {
        parts.push({
          name: nameM[1],
          filename: fileM ? fileM[1] : null,
          contentType: typeM ? typeM[1].trim() : null,
          data: body,
        });
      }
    }
    start = next;
  }
  return parts;
}
