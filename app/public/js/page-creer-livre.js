// Livre de famille : sélection, prévisualisation, export PDF réel.
const { api, el, fmtDate } = window.mf;

const form = document.getElementById("form-livre");
const personnes = document.getElementById("choix-personnes");
const apercu = document.getElementById("apercu");

(async () => {
  try {
    const { people } = await api("/api/people");
    if (!people.length) personnes.append(el("p", { class: "meta" }, "Ajoutez d'abord des personnes dans la famille."));
    for (const p of people) {
      personnes.append(el("label", { style: "display:flex;gap:.5rem;font-weight:400" },
        el("input", { type: "checkbox", value: p.id }),
        `${p.first_name} ${p.last_name || ""}`.trim()));
    }
  } catch (e) {
    personnes.append(el("p", { class: "erreur" }, e.message));
  }
})();

function spec() {
  return {
    title: document.getElementById("titre").value,
    periodStart: document.getElementById("debut").value || null,
    periodEnd: document.getElementById("fin").value || null,
    personIds: [...personnes.querySelectorAll("input:checked")].map((i) => i.value),
  };
}

document.getElementById("btn-apercu").addEventListener("click", async () => {
  apercu.innerHTML = "";
  apercu.append(el("p", { class: "chargement" }, "Composition…"));
  const err = document.getElementById("err");
  err.hidden = true;
  try {
    const book = await api("/api/books/preview", { method: "POST", body: spec() });
    apercu.innerHTML = "";
    const wrap = el("section", { class: "bulle" });
    wrap.append(el("h2", {}, book.title));
    if (book.subtitle) wrap.append(el("p", { class: "meta" }, book.subtitle));
    wrap.append(el("p", { class: "meta" }, `${book.sections.length} chapitre(s) — modifiables via les souvenirs.`));
    for (const s of book.sections) {
      const panel = el("div", { class: "panel" });
      panel.append(el("h3", { style: "margin:.2rem 0" }, s.title));
      if (s.date) panel.append(el("p", { class: "meta" }, s.date));
      if (s.image?.present) panel.append(el("p", { class: "meta" }, "Illustration incluse"));
      if (s.body) panel.append(el("p", { style: "white-space:pre-wrap" }, s.body));
      if (s.sources?.length) panel.append(el("p", { class: "meta" }, "Sources : " + s.sources.join(" · ")));
      wrap.append(panel);
    }
    apercu.append(wrap);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
    apercu.innerHTML = "";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");
  err.hidden = true;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = "Génération…";
  try {
    const res = await fetch("/api/books/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(spec()),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Export impossible.");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "livre-familial.pdf";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e2) {
    err.textContent = e2.message;
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Exporter en PDF";
  }
});
