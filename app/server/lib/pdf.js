// Générateur PDF maison (PDF 1.4, Helvetica). Aucune dépendance.
// Sert uniquement l'export des livres familiaux : pages A4, texte
// reflowé, images JPEG incorporées. Pas de simulation : le PDF
// produit est un vrai binaire lisible partout.

// WinAnsi : Latin-1 avec remplacements pour les caractères manquants.
function winAnsi(s) {
  return (s || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00ab\u00a0/g, '" ')
    .replace(/\u00a0\u00bb/g, ' "')
    .replace(/[^\u0000-\u00ff]/g, "?");
}

const PAGE_W = 595.28; // A4 en points
const PAGE_H = 841.89;
const MARGIN = 64;

class PdfPage {
  constructor() {
    this.stream = "";
  }
  op(s) {
    this.stream += s + "\n";
  }
  text(x, y, size, str, { bold = false, color = null } = {}) {
    if (color) this.op(`${color} rg`);
    this.op("BT");
    this.op(`/F${bold ? "2" : "1"} ${size} Tf`);
    this.op(`1 0 0 1 ${x} ${y} Tm`);
    this.op(`(${escapeStr(winAnsi(str))}) Tj`);
    this.op("ET");
    if (color) this.op("0 0 0 rg");
  }
  image(name, x, y, w, h) {
    this.op(`q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`);
  }
  rect(x, y, w, h, color) {
    this.op(`${color} rg`);
    this.op(`${x} ${y} ${w} ${h} re f`);
    this.op("0 0 0 rg");
  }
}

function escapeStr(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export class PdfDocument {
  constructor() {
    this.pages = [];
    this.images = []; // { name, jpeg: Buffer, w, h }
    this.newPage();
  }
  newPage() {
    const p = new PdfPage();
    this.pages.push(p);
    return p;
  }
  currentPage() {
    return this.pages[this.pages.length - 1];
  }
  addImageJpeg(jpeg, name) {
    const dim = jpegDimensions(jpeg);
    if (!dim) return null;
    this.images.push({ name, jpeg, w: dim.w, h: dim.h });
    return { name, ...dim };
  }
  build() {
    const objects = [];
    const nPages = this.pages.length;
    const nImages = this.images.length;
    // 1: catalog, 2: pages, 3: font1, 4: font2, puis pages, puis images
    const firstPageObj = 5;
    const firstImageObj = firstPageObj + nPages * 2;
    const totalObjs = firstImageObj + nImages;

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    const kids = this.pages
      .map((_, i) => `${firstPageObj + i * 2} 0 R`)
      .join(" ");
    objects[2] = `<< /Type /Pages /Count ${nPages} /Kids [${kids}] >>`;
    objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

    this.pages.forEach((page, i) => {
      const contentObj = firstPageObj + i * 2;
      const pageObj = contentObj + 1;
      const imageResources = this.images
        .map((img, j) => `/${img.name} ${firstImageObj + j} 0 R`)
        .join(" ");
      objects[pageObj] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${imageResources ? `/XObject << ${imageResources} >>` : ""} >> ` +
        `/Contents ${contentObj} 0 R >>`;
      const stream = page.stream;
      objects[contentObj] = {
        stream: `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`,
      };
    });

    this.images.forEach((img, j) => {
      objects[firstImageObj + j] = {
        stream:
          `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
          `/Length ${img.jpeg.length} >>\nstream\n`,
        raw: img.jpeg,
        suffix: "endstream",
      };
    });

    return buildBinary(objects, totalObjs);
  }
}

function buildBinary(objects, totalObjs) {
  const chunks = [];
  const offsets = [];
  let header = "%PDF-1.4\n";
  chunks.push(Buffer.from(header, "latin1"));
  let pos = header.length;
  for (let i = 1; i <= totalObjs; i++) {
    const obj = objects[i];
    offsets[i] = pos;
    const parts = [];
    parts.push(Buffer.from(`${i} 0 obj\n`, "latin1"));
    if (typeof obj === "string") {
      parts.push(Buffer.from(obj + "\n", "latin1"));
    } else if (obj) {
      parts.push(Buffer.from(obj.stream, "latin1"));
      if (obj.raw) parts.push(obj.raw);
      if (obj.suffix) parts.push(Buffer.from(obj.suffix + "\n", "latin1"));
    }
    parts.push(Buffer.from("endobj\n", "latin1"));
    const buf = Buffer.concat(parts);
    chunks.push(buf);
    pos += buf.length;
  }
  const xrefPos = pos;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= totalObjs; i++) {
    xref += String(offsets[i] || 0).padStart(10, "0") + " 00000 n \n";
  }
  xref += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(chunks);
}

function jpegDimensions(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      return { w, h };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

// Mise en page du livre : couverture + pages de contenu.
export function renderBook(book) {
  const doc = new PdfDocument();
  // Couverture
  let page = doc.currentPage();
  page.rect(0, 0, PAGE_W, PAGE_H, "0.106 0.165 0.290"); // encre #1b2a4a
  page.text(MARGIN, PAGE_H - 220, 34, book.familyName, { bold: true, color: "0.788 0.635 0.153" });
  page.text(MARGIN, PAGE_H - 280, 44, book.title, { bold: true, color: "0.98 0.97 0.95" });
  if (book.subtitle) page.text(MARGIN, PAGE_H - 330, 16, book.subtitle, { color: "0.98 0.97 0.95" });
  page.text(MARGIN, 80, 12, `Édité le ${new Date().toLocaleDateString("fr-FR")}`, { color: "0.788 0.635 0.153" });

  let imgIndex = 0;
  for (const section of book.sections) {
    page = doc.newPage();
    let y = PAGE_H - MARGIN - 20;

    if (section.image) {
      const dim = doc.addImageJpeg(section.image, `Img${imgIndex}`);
      if (dim) {
        const maxW = PAGE_W - 2 * MARGIN;
        const maxH = 260;
        const scale = Math.min(maxW / dim.w, maxH / dim.h, 1);
        const w = dim.w * scale;
        const h = dim.h * scale;
        page.image(`Img${imgIndex}`, MARGIN, y - h, w, h);
        y -= h + 24;
        imgIndex++;
      }
    }

    page.text(MARGIN, y, 22, section.title, { bold: true });
    y -= 34;
    if (section.date) {
      page.text(MARGIN, y, 11, section.date, { color: "0.4 0.4 0.4" });
      y -= 22;
    }

    page.text(MARGIN, y - 8, 12, wrap(section.body, 88).join("\n"));
    y -= 0;

    if (section.sources && section.sources.length) {
      doc.newPage();
      page = doc.currentPage();
      page.text(MARGIN, PAGE_H - MARGIN, 14, "Sources de ce chapitre", { bold: true });
      let sy = PAGE_H - MARGIN - 30;
      for (const s of section.sources) {
        page.text(MARGIN, sy, 11, `- ${s}`);
        sy -= 18;
      }
    }
  }
  return doc.build();
}

function wrap(text, maxChars) {
  const out = [];
  for (const paragraph of (text || "").split(/\n+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if ((line + " " + word).trim().length > maxChars) {
        out.push(line);
        line = word;
      } else {
        line = (line + " " + word).trim();
      }
    }
    if (line) out.push(line);
    out.push("");
  }
  return out;
}

export { PAGE_W, PAGE_H, MARGIN };
