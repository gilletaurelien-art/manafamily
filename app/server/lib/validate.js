// Validation et assainissement des entrées côté serveur.

export function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

export function required(value, label) {
  if (!value) throw badRequest(`${label} est requis.`);
  return value;
}

export function optional(v, max = 5000) {
  const s = str(v);
  return s ? s.slice(0, max) : null;
}

export function requiredStr(v, label, max = 300) {
  const s = str(v);
  if (!s) throw badRequest(`${label} est requis.`);
  if (s.length > max) throw badRequest(`${label} est trop long (max ${max}).`);
  return s;
}

export function validEmail(v) {
  const s = str(v).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw badRequest("Adresse e-mail invalide.");
  return s;
}

export function validPassword(v) {
  if (typeof v !== "string" || v.length < 8)
    throw badRequest("Le mot de passe doit contenir au moins 8 caractères.");
  if (v.length > 200) throw badRequest("Mot de passe trop long.");
  return v;
}

export function validDate(v, { allowEmpty = true } = {}) {
  const s = str(v);
  if (!s) {
    if (allowEmpty) return null;
    throw badRequest("Date requise.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s)))
    throw badRequest("Date invalide (format attendu AAAA-MM-JJ).");
  return s;
}

export function validDateTime(v, { allowEmpty = true } = {}) {
  const s = str(v);
  if (!s) {
    if (allowEmpty) return null;
    throw badRequest("Date et heure requises.");
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s) || Number.isNaN(Date.parse(s)))
    throw badRequest("Date et heure invalides (format attendu AAAA-MM-JJTHH:MM).");
  return s;
}

export function validId(v, label = "Identifiant") {
  const s = str(v);
  if (!/^[a-z]+_[a-f0-9]{10,}$/.test(s)) throw badRequest(`${label} invalide.`);
  return s;
}

export function validEnum(v, values, label) {
  const s = str(v);
  if (!values.includes(s)) throw badRequest(`${label} invalide.`);
  return s;
}

export function boolInt(v) {
  return v === true || v === 1 || v === "1" || v === "on" ? 1 : 0;
}

function badRequest(message) {
  const e = new Error(message);
  e.status = 400;
  return e;
}
