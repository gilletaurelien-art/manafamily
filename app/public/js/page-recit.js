// Détail récit : texte, sources référencées, modification.
const { api, el, fmtDate, confirmDelete } = window.mf;

const detail = document.getElementById("detail");
const storyId = location.pathname.split("/")[2];

async function init() {
  detail.innerHTML = "";
  detail.append(el("p", { class: "chargement" }, "Chargement…"));
  let s;
  try {
    s = await api(`/api/stories/${storyId}`);
  } catch (e) {
    detail.innerHTML = "";
    detail.append(el("p", { class: "erreur" }, e.message));
    return;
  }
  detail.innerHTML = "";
  detail.append(el("section", { class: "bulle" },
    el("h1", { style: "margin-top:0" }, s.title),
    el("p", { class: "meta" }, [s.period_start, s.period_end].filter(Boolean).join(" → ")),
    el("div", { class: "actions" },
      el("button", { class: "btn btn-ghost", onclick: openEdit }, "Modifier"),
      el("button", { class: "btn btn-danger", onclick: () => confirmDelete("Supprimer ce récit ?", async () => {
        await api(`/api/stories/${storyId}`, { method: "DELETE" });
        location.href = "/creer";
      }) }, "Supprimer"))));

  const corps = el("section", { class: "panel" });
  corps.append(el("p", { style: "white-space:pre-wrap" }, s.body));
  detail.append(corps);

  const sourcesPanel = el("section", { class: "panel" });
  sourcesPanel.append(el("h3", {}, "Sources"));
  for (const src of s.sources || []) {
    const href = src.source_type === "memory" ? `/souvenirs/${src.source_id}` : `/famille/${src.source_id}`;
    sourcesPanel.append(el("p", { style: "margin:.2rem 0" }, el("a", { href }, src.label || src.source_id)));
  }
  if (!s.sources?.length) sourcesPanel.append(el("p", { class: "meta" }, "Aucune source référencée."));
  detail.append(sourcesPanel, el("p", {}, el("a", { href: "/creer" }, "← Créer")));

  function openEdit() {
    const dlg = el("dialog", {});
    const form = el("form", {},
      el("h2", { style: "margin-top:0" }, "Modifier le récit"),
      el("label", {}, "Titre"), el("input", { type: "text", value: s.title, id: "t", required: true }),
      el("label", {}, "Le récit"), el("textarea", { id: "b", style: "min-height:14rem" }, s.body),
      el("div", { class: "actions", style: "margin-top:1rem" },
        el("button", { class: "btn", type: "submit" }, "Enregistrer"),
        el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")));
    dlg.append(form);
    document.body.append(dlg);
    dlg.showModal();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await api(`/api/stories/${storyId}`, {
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
