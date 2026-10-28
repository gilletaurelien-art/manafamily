// Fiche personne : biographie, relations, souvenirs, commentaires.
const { api, el, escapeHtml, fmtDate, confirmDelete } = window.mf;

const detail = document.getElementById("detail");
const personId = location.pathname.split("/")[2];

async function init() {
  detail.innerHTML = "";
  detail.append(el("p", { class: "chargement" }, "Chargement…"));
  let data;
  try {
    data = await api(`/api/people/${personId}`);
  } catch (e) {
    detail.innerHTML = "";
    detail.append(el("p", { class: "erreur" }, e.message));
    return;
  }
  const p = data.person;
  detail.innerHTML = "";

  detail.append(el("section", { class: "bulle" },
    el("h1", { style: "margin-top:0" }, `${p.first_name} ${p.last_name || ""}`.trim()),
    el("p", { class: "meta" }, [p.birth_date, p.death_date ? "† " + p.death_date : null, p.is_child ? "enfant" : null].filter(Boolean).join(" · ")),
    p.biography ? el("p", { style: "white-space:pre-wrap" }, p.biography) : null,
    el("div", { class: "actions", style: "margin-top:1rem" },
      el("a", { class: "btn btn-ghost", href: "/famille?ajouter=1" }, "Modifier (via Famille)"),
      el("button", { class: "btn btn-danger", onclick: () => supprimer(p) }, "Supprimer"))));

  // Relations
  const relPanel = el("section", { class: "panel" });
  relPanel.append(el("h3", {}, "Relations"));
  try {
    const { nodes } = await api("/api/family/tree");
    const node = nodes.find((n) => n.id === personId);
    if (node) {
      const ul = el("ul", {});
      for (const pid of node.parents) ul.append(el("li", {}, "Parent : ", lien(nodes, pid)));
      for (const pid of node.children) ul.append(el("li", {}, "Enfant : ", lien(nodes, pid)));
      for (const pid of node.partners) ul.append(el("li", {}, "Partenaire : ", lien(nodes, pid)));
      if (!ul.children.length) ul.append(el("li", { class: "meta" }, "Aucune relation enregistrée."));
      relPanel.append(ul);
      relPanel.append(relationForm(nodes, node));
    }
  } catch { /* arbre indisponible : non bloquant */ }
  detail.append(relPanel);

  // Souvenirs
  const memPanel = el("section", { class: "panel" });
  memPanel.append(el("h3", {}, "Souvenirs associés"));
  if (!data.memories.length) memPanel.append(el("p", { class: "meta" }, "Aucun souvenir associé."));
  for (const m of data.memories) {
    memPanel.append(el("p", { style: "margin:.3rem 0" },
      el("a", { href: `/souvenirs/${m.id}` }, m.title),
      el("span", { class: "meta" }, ` — ${fmtDate(m.happened_on)}`)));
  }
  detail.append(memPanel);

  // Commentaires
  const comPanel = el("section", { class: "panel" });
  comPanel.append(el("h3", {}, "Témoignages"));
  for (const c of data.comments || []) {
    comPanel.append(el("p", { class: "panel", style: "margin:.3rem 0" },
      el("strong", {}, c.author + " "), escapeHtml(c.body)));
  }
  const comForm = el("form", {},
    el("textarea", { placeholder: "Une anecdote sur cette personne…", required: true }),
    el("button", { class: "btn btn-ghost", type: "submit", style: "margin-top:.4rem" }, "Ajouter"));
  comForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await api(`/api/people/${personId}/comments`, { method: "POST", body: { body: comForm.querySelector("textarea").value } });
    init();
  });
  comPanel.append(comForm);
  detail.append(comPanel, el("p", {}, el("a", { href: "/famille" }, "← La famille")));

  function lien(nodes, id) {
    const n = nodes.find((x) => x.id === id);
    return el("a", { href: `/famille/${id}` }, n ? `${n.firstName} ${n.lastName || ""}`.trim() : "…");
  }

  function supprimer(person) {
    confirmDelete(`Supprimer ${person.first_name} ? Ses liens dans l'arbre disparaîtront aussi.`, async () => {
      await api(`/api/people/${personId}`, { method: "DELETE" });
      location.href = "/famille";
    });
  }

  function relationForm(nodes, node) {
    const form = el("form", { class: "actions", style: "margin-top:.6rem" },
      el("select", { id: "rel-kind", "aria-label": "Type de relation" },
        el("option", { value: "parent" }, "… est parent de"),
        el("option", { value: "partner" }, "… est partenaire de")),
      el("select", { id: "rel-target", "aria-label": "Personne" }));
    const target = form.querySelector("#rel-target");
    for (const n of nodes) {
      if (n.id === personId) continue;
      target.append(el("option", { value: n.id }, `${n.firstName} ${n.lastName || ""}`.trim()));
    }
    form.append(el("button", { class: "btn btn-ghost", type: "submit" }, "Ajouter la relation"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await api("/api/relationships", {
        method: "POST",
        body: {
          kind: form.querySelector("#rel-kind").value,
          from_person_id: personId,
          to_person_id: target.value,
        },
      });
      init();
    });
    return form;
  }
}

init();
