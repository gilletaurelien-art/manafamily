// Aide aux tests : serveur sur port éphémère + base isolée +
// client HTTP avec cookies de session.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export async function startApp() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "manafamily-test-"));
  process.env.DATA_DIR = dataDir;
  process.env.PORT = "0";
  process.env.HTTPS = "0";
  const { buildServer } = await import("../server/index.js");
  const server = buildServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  return { server, base, dataDir };
}

export function client(base) {
  let cookie = "";
  return {
    async req(method, url, body, headers = {}) {
      const res = await fetch(base + url, {
        method,
        headers: {
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...(cookie ? { cookie } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        redirect: "manual",
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : Buffer.from(await res.arrayBuffer());
      return { status: res.status, data, headers: res.headers };
    },
    get(url) { return this.req("GET", url); },
    post(url, body) { return this.req("POST", url, body); },
    put(url, body) { return this.req("PUT", url, body); },
    del(url) { return this.req("DELETE", url); },
    upload(url, filename, content, mime = "image/png") {
      const boundary = "----testboundary" + Math.random().toString(36).slice(2);
      const parts = Buffer.concat([
        Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="file"; filename="${filename}"\r\ncontent-type: ${mime}\r\n\r\n`),
        Buffer.isBuffer(content) ? content : Buffer.from(content),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      return fetch(base + url, {
        method: "POST",
        headers: { cookie, "content-type": `multipart/form-data; boundary=${boundary}` },
        body: parts,
      }).then(async (res) => {
        const ct = res.headers.get("content-type") || "";
        return { status: res.status, data: ct.includes("application/json") ? await res.json() : null };
      });
    },
    rawGet(url) {
      return fetch(base + url, { headers: { cookie } });
    },
  };
}

export async function registerAndCreateFamily(c, email, name, familyName) {
  await c.post("/api/auth/register", { email, password: "motdepasse8", display_name: name });
  return c.post("/api/families", { name: familyName });
}

export function png1x1() {
  // PNG 1x1 minimal valide
  return Buffer.from(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000d49444154789c626001000000ffff030000060005" +
    "57bfabd40000000049454e44ae426082",
    "hex"
  );
}

export function jpegStub() {
  // JPEG minimal (tête SOI + SOF0 2x2 + EOI) — accepté par le parseur
  // de dimensions du générateur PDF.
  const head = Buffer.from([0xff, 0xd8]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x02, 0x03, 0x01, 0x11, 0x00]);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([head, sof, eoi]);
}
