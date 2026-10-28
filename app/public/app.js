// MANAfamily — front vanilla : appels API, rendu, états (chargement,
// vide, erreur, succès). Aucune dépendance.

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: options.body && !(options.body instanceof FormData)
      ? { "content-type": "application/json" }
      : undefined,
    ...options,
    body: options.body instanceof FormData ? options.body
      : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.blob();
  if (!res.ok) {
    const message = data && data.error ? data.error : "Erreur inattendue.";
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "html") node.innerHTML = v;
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function fmtDate(s) {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString("fr-FR"); }
  catch { return s; }
}

function showState(container, { loading, empty, error, emptyGlyph = "🌊" } = {}) {
  container.innerHTML = "";
  if (loading) {
    container.append(el("p", { class: "chargement", role: "status" }, "Chargement…"));
    return;
  }
  if (error) {
    container.append(
      el("div", { class: "erreur", role: "alert" },
        el("p", {}, error),
        el("button", { class: "btn btn-ghost", onclick: () => location.reload() }, "Réessayer"))
    );
    return;
  }
  if (empty) {
    container.append(el("div", { class: "vide" },
      el("span", { class: "glyphe", "aria-hidden": "true" }, emptyGlyph),
      el("p", {}, empty)));
  }
}

function spinner(btn, on, label) {
  if (on) {
    btn.dataset.label = btn.textContent;
    btn.textContent = "…";
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.label || label || "Enregistrer";
    btn.disabled = false;
  }
}

function mediaUrl(id) { return `/api/media/${id}`; }

function coverHtml(memory) {
  if (memory.coverMediaId && (memory.coverMime || "").startsWith("image/")) {
    return el("img", { src: mediaUrl(memory.coverMediaId), alt: `Illustration de ${escapeHtml(memory.title)}`, loading: "lazy" });
  }
  return el("div", { class: "ph-media", "aria-hidden": "true" });
}

function kindLabel(kind) {
  return {
    photo: "Photo", video: "Vidéo", text: "Texte", audio: "Audio",
    letter: "Lettre", recipe: "Recette", other: "Souvenir",
  }[kind] || "Souvenir";
}

// Confirmation de suppression générique.
function confirmDelete(message, onConfirm) {
  const dlg = el("dialog", {},
    el("p", {}, message),
    el("div", { class: "actions" },
      el("button", { class: "btn btn-danger", onclick: async (e) => { await onConfirm(); dlg.close(); } }, "Supprimer"),
      el("button", { class: "btn btn-ghost", onclick: () => dlg.close() }, "Annuler")));
  document.body.append(dlg);
  dlg.showModal();
}

window.mf = { api, el, escapeHtml, fmtDate, showState, spinner, mediaUrl, coverHtml, kindLabel, confirmDelete };
