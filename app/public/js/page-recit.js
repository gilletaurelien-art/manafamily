// Détail récit : texte, sources référencées, modification.
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const detail = document.getElementById("detail");
const storyId = location.pathname.split("/")[2];

async function init() {
  detail.innerHTML = "";
  detail.append(mf.el("p", { class: "chargement" }, "Chargement…"));
  let s;
  try {
    s = await mf.api(`/api/stories/${storyId}`);
  } catch (e) {
    detail.innerHTML = "";
    detail.append(mf.el("p", { class: "erreur" }, e.message));
    return;
  }
  detail.innerHTML = "";
  detail.append(mf.el("section", { class: "bulle" },
    mf.el("h1", { style: "margin-top:0" }, s.title),
    mf.el("p", { class: "meta" }, [s.period_start, s.period_end].filter(Boolean).join(" → ")),
    mf.el("div", { class: "actions" },
      mf.el("button", { class: "btn btn-ghost", onclick: openEdit }, "Modifier"),
      mf.el("button", { class: "btn btn-danger", onclick: () => mf.confirmDelete("Supprimer ce récit ?", async () => {
        await mf.api(`/api/stories/${storyId}`, { method: "DELETE" });
        location.href = "/creer";
      }) }, "Supprimer"))));

  const corps = mf.el("section", { class: "panel" });
  corps.append(mf.el("p", { style: "white-space:pre-wrap" }, s.body));
  detail.append(corps);

  const sourcesPanel = mf.el("section", { class: "panel" });
  sourcesPanel.append(mf.el("h3", {}, "Sources"));
  for (const src of s.sources || []) {
    const href = src.source_type === "memory" ? `/souvenirs/${src.source_id}` : `/famille/${src.source_id}`;
    sourcesPanel.append(mf.el("p", { style: "margin:.2rem 0" }, mf.el("a", { href }, src.label || src.source_id)));
  }
  if (!s.sources?.length) sourcesPanel.append(mf.el("p", { class: "meta" }, "Aucune source référencée."));
  detail.append(sourcesPanel, mf.el("p", {}, mf.el("a", { href: "/creer" }, "← Créer")));

  function openEdit() {
    const dlg = mf.el("dialog", {});
    const form = mf.el("form", {},
      mf.el("h2", { style: "margin-top:0" }, "Modifier le récit"),
      mf.el("label", {}, "Titre"), mf.el("input", { type: "text", value: s.title, id: "t", required: true }),
      mf.el("label", {}, "Le récit"), mf.el("textarea", { id: "b", style: "min-height:14rem" }, s.body),
      mf.el("div", { class: "actions", style: "margin-top:1rem" },
        mf.el("button", { class: "btn", type: "submit" }, "Enregistrer"),
        mf.el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")));
    dlg.append(form);
    document.body.append(dlg);
    dlg.showModal();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await mf.api(`/api/stories/${storyId}`, {
        method: "PUT",
        body: {
          title: form.t.value,
          body: form.b.value,
          period_start: s.period_start,
          period_end: s.period_end,
        },
      });
      dlg.close();
      init();
    });
  }
}

init();
