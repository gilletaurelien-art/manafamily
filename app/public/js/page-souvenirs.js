// Souvenirs : liste, filtres, création (dialog), recherche.
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const liste = document.getElementById("liste");
const filtres = document.getElementById("filtres");

async function load() {
  mf.showState(liste, { loading: true });
  const params = new URLSearchParams();
  if (filtres.q.value) params.set("q", filtres.q.value);
  if (filtres.kind.value) params.set("kind", filtres.kind.value);
  if (filtres.annee.value) params.set("year", filtres.annee.value);
  try {
    const { memories } = await mf.api("/api/memories?" + params.toString());
    render(memories);
  } catch (e) {
    mf.showState(liste, { error: e.message });
  }
}

function render(memories) {
  liste.innerHTML = "";
  if (!memories.length) {
    mf.showState(liste, { empty: "Aucun souvenir pour ces critères. Le premier ? « Ajouter » en haut à droite." });
    return;
  }
  const grid = mf.el("div", { class: "grille" });
  for (const m of memories) {
    const card = mf.el("a", { class: "carte", href: `/souvenirs/${m.id}` },
      mf.coverHtml(m),
      mf.el("div", { class: "corps" },
        mf.el("span", { class: "badge badge-accent" }, mf.kindLabel(m.kind)),
        m.draft ? mf.el("span", { class: "badge" }, "Brouillon") : null,
        mf.el("h3", {}, m.title),
        mf.el("span", { class: "meta" }, [mf.fmtDate(m.happened_on), m.place].filter(Boolean).join(" · "))));
    grid.append(card);
  }
  liste.append(grid);
}

filtres.addEventListener("submit", (e) => { e.preventDefault(); load(); });

// Années disponibles (basées sur happened_on via une requête large).
(async () => {
  try {
    const { memories } = await mf.api("/api/memories");
    const years = [...new Set(memories.map((m) => m.happened_on?.slice(0, 4)).filter(Boolean))].sort().reverse();
    const sel = document.getElementById("annee");
    for (const y of years) sel.append(mf.el("option", { value: y }, y));
  } catch { /* silencieux : le filtre année restera vide */ }
  load();
})();

// Création : dialog avec formulaire minimal + upload ensuite.
const params = new URLSearchParams(location.search);
if (params.get("ajouter")) openCreateDialog();

function openCreateDialog() {
  const dlg = mf.el("dialog", { "aria-label": "Ajouter un souvenir" });
  const form = mf.el("form", { id: "form-souvenir" },
    mf.el("h2", { style: "margin-top:0" }, "Nouveau souvenir"),
    mf.el("label", { for: "titre" }, "Titre"),
    mf.el("input", { type: "text", id: "titre", required: true, placeholder: "L'été à Penven" }),
    mf.el("label", { for: "kind" }, "Type"),
    mf.el("select", { id: "kind" },
      mf.el("option", { value: "photo" }, "Photo"),
      mf.el("option", { value: "video" }, "Vidéo"),
      mf.el("option", { value: "text" }, "Texte / anecdote"),
      mf.el("option", { value: "audio" }, "Audio"),
      mf.el("option", { value: "letter" }, "Lettre / document"),
      mf.el("option", { value: "recipe" }, "Recette / tradition"),
      mf.el("option", { value: "other" }, "Autre")),
    mf.el("label", { for: "description" }, "Description (optionnel)"),
    mf.el("textarea", { id: "description" }),
    mf.el("label", { for: "happened_on" }, "Date du souvenir (optionnel)"),
    mf.el("input", { type: "date", id: "happened_on" }),
    mf.el("label", { for: "place" }, "Lieu (optionnel)"),
    mf.el("input", { type: "text", id: "place" }),
    mf.el("div", { class: "actions", style: "margin-top:1rem" },
      mf.el("button", { class: "btn", type: "submit" }, "Enregistrer"),
      mf.el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")),
    mf.el("p", { class: "erreur", id: "err", hidden: true, role: "alert" }));
  dlg.append(form);
  document.body.append(dlg);
  dlg.showModal();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "…";
    const errEl = form.querySelector("#err");
    try {
      const { id } = await mf.api("/api/memories", {
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
