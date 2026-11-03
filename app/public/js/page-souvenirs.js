// Souvenirs : liste, filtres, création (dialog), recherche.
const { api, el, escapeHtml, fmtDate, showState, coverHtml, kindLabel, confirmDelete } = window.mf;

const liste = document.getElementById("liste");
const filtres = document.getElementById("filtres");

async function load() {
  showState(liste, { loading: true });
  const params = new URLSearchParams();
  if (filtres.q.value) params.set("q", filtres.q.value);
  if (filtres.kind.value) params.set("kind", filtres.kind.value);
  if (filtres.annee.value) params.set("year", filtres.annee.value);
  try {
    const { memories } = await api("/api/memories?" + params.toString());
    render(memories);
  } catch (e) {
    showState(liste, { error: e.message });
  }
}

function render(memories) {
  liste.innerHTML = "";
  if (!memories.length) {
    showState(liste, { empty: "Aucun souvenir pour ces critères. Le premier ? « Ajouter » en haut à droite." });
    return;
  }
  const grid = el("div", { class: "grille" });
  for (const m of memories) {
    const card = el("a", { class: "carte", href: `/souvenirs/${m.id}` },
      coverHtml(m),
      el("div", { class: "corps" },
        el("span", { class: "badge badge-or" }, kindLabel(m.kind)),
        m.draft ? el("span", { class: "badge" }, "Brouillon") : null,
        el("h3", {}, m.title),
        el("span", { class: "meta" }, [fmtDate(m.happened_on), m.place].filter(Boolean).join(" · "))));
    grid.append(card);
  }
  liste.append(grid);
}

filtres.addEventListener("submit", (e) => { e.preventDefault(); load(); });

// Années disponibles (basées sur happened_on via une requête large).
(async () => {
  try {
    const { memories } = await api("/api/memories");
    const years = [...new Set(memories.map((m) => m.happened_on?.slice(0, 4)).filter(Boolean))].sort().reverse();
    const sel = document.getElementById("annee");
    for (const y of years) sel.append(el("option", { value: y }, y));
  } catch { /* silencieux : le filtre année restera vide */ }
  load();
})();

// Création : dialog avec formulaire minimal + upload ensuite.
const params = new URLSearchParams(location.search);
if (params.get("ajouter")) openCreateDialog();

function openCreateDialog() {
  const dlg = el("dialog", { "aria-label": "Ajouter un souvenir" });
  const form = el("form", { id: "form-souvenir" },
    el("h2", { style: "margin-top:0" }, "Nouveau souvenir"),
    el("label", { for: "titre" }, "Titre"),
    el("input", { type: "text", id: "titre", required: true, placeholder: "L'été à Penven" }),
    el("label", { for: "kind" }, "Type"),
    el("select", { id: "kind" },
      el("option", { value: "photo" }, "Photo"),
      el("option", { value: "video" }, "Vidéo"),
      el("option", { value: "text" }, "Texte / anecdote"),
      el("option", { value: "audio" }, "Audio"),
      el("option", { value: "letter" }, "Lettre / document"),
      el("option", { value: "recipe" }, "Recette / tradition"),
      el("option", { value: "other" }, "Autre")),
    el("label", { for: "description" }, "Description (optionnel)"),
    el("textarea", { id: "description" }),
    el("label", { for: "happened_on" }, "Date du souvenir (optionnel)"),
    el("input", { type: "date", id: "happened_on" }),
    el("label", { for: "place" }, "Lieu (optionnel)"),
    el("input", { type: "text", id: "place" }),
    el("div", { class: "actions", style: "margin-top:1rem" },
      el("button", { class: "btn", type: "submit" }, "Enregistrer"),
      el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")),
    el("p", { class: "erreur", id: "err", hidden: true, role: "alert" }));
  dlg.append(form);
  document.body.append(dlg);
  dlg.showModal();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "…";
    const errEl = form.querySelector("#err");
    try {
      const { id } = await api("/api/memories", {
        method: "POST",
        body: {
          title: form.titre.value,
          kind: form.kind.value,
          description: form.description.value,
          happened_on: form.happened_on.value || null,
          place: form.place.value,
        },
      });
      dlg.close();
      location.href = `/souvenirs/${id}`;
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
      btn.disabled = false; btn.textContent = "Enregistrer";
    }
  });
}
