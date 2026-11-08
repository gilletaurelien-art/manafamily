// Fiche personne : biographie, relations, souvenirs, commentaires.
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const detail = document.getElementById("detail");
const personId = location.pathname.split("/")[2];

async function init() {
  detail.innerHTML = "";
  detail.append(mf.el("p", { class: "chargement" }, "Chargement…"));
  let data;
  try {
    data = await mf.api(`/api/people/${personId}`);
  } catch (e) {
    detail.innerHTML = "";
    detail.append(mf.el("p", { class: "erreur" }, e.message));
    return;
  }
  const p = data.person;
  detail.innerHTML = "";

  detail.append(mf.el("section", { class: "bulle" },
    mf.el("h1", { style: "margin-top:0" }, `${p.first_name} ${p.last_name || ""}`.trim()),
    mf.el("p", { class: "meta" }, [p.birth_date, p.death_date ? "† " + p.death_date : null, p.is_child ? "enfant" : null].filter(Boolean).join(" · ")),
    p.biography ? mf.el("p", { style: "white-space:pre-wrap" }, p.biography) : null,
    mf.el("div", { class: "actions", style: "margin-top:1rem" },
      mf.el("a", { class: "btn btn-ghost", href: "/famille?ajouter=1" }, "Modifier (via Famille)"),
      mf.el("button", { class: "btn btn-danger", onclick: () => supprimer(p) }, "Supprimer"))));

  // Relations
  const relPanel = mf.el("section", { class: "panel" });
  relPanel.append(mf.el("h3", {}, "Relations"));
  try {
    const { nodes } = await mf.api("/api/family/tree");
    const node = nodes.find((n) => n.id === personId);
    if (node) {
      const ul = mf.el("ul", {});
      for (const pid of node.parents) ul.append(mf.el("li", {}, "Parent : ", lien(nodes, pid)));
      for (const pid of node.children) ul.append(mf.el("li", {}, "Enfant : ", lien(nodes, pid)));
      for (const pid of node.partners) ul.append(mf.el("li", {}, "Partenaire : ", lien(nodes, pid)));
      if (!ul.children.length) ul.append(mf.el("li", { class: "meta" }, "Aucune relation enregistrée."));
      relPanel.append(ul);
      relPanel.append(relationForm(nodes, node));
    }
  } catch { /* arbre indisponible : non bloquant */ }
  detail.append(relPanel);

  // Souvenirs
  const memPanel = mf.el("section", { class: "panel" });
  memPanel.append(mf.el("h3", {}, "Souvenirs associés"));
  if (!data.memories.length) memPanel.append(mf.el("p", { class: "meta" }, "Aucun souvenir associé."));
  for (const m of data.memories) {
    memPanel.append(mf.el("p", { style: "margin:.3rem 0" },
      mf.el("a", { href: `/souvenirs/${m.id}` }, m.title),
      mf.el("span", { class: "meta" }, ` — ${mf.fmtDate(m.happened_on)}`)));
  }
  detail.append(memPanel);

  // Chansons — croisement arbre × MANAvibe, aucune donnée propre à cette
  // page : une chanson remonte ici dès qu'un souvenir qui la porte est
  // associé à cette personne.
  if (data.songs && data.songs.length) {
    const songPanel = mf.el("section", { class: "panel" });
    songPanel.append(mf.el("h3", {}, `Les chansons de ${p.first_name}`));
    for (const s of data.songs) {
      songPanel.append(mf.el("p", { style: "margin:.3rem 0" },
        mf.el("a", { href: "/manavibe" }, s.title + (s.primary_artist ? " — " + s.primary_artist : ""))));
    }
    detail.append(songPanel);
  }

  // Commentaires
  const comPanel = mf.el("section", { class: "panel" });
  comPanel.append(mf.el("h3", {}, "Témoignages"));
  for (const c of data.comments || []) {
    comPanel.append(mf.el("p", { class: "panel", style: "margin:.3rem 0" },
      mf.el("strong", {}, c.author + " "), mf.escapeHtml(c.body)));
  }
  const comForm = mf.el("form", {},
    mf.el("textarea", { placeholder: "Une anecdote sur cette personne…", required: true }),
    mf.el("button", { class: "btn btn-ghost", type: "submit", style: "margin-top:.4rem" }, "Ajouter"));
  comForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await mf.api(`/api/people/${personId}/comments`, { method: "POST", body: { body: comForm.querySelector("textarea").value } });
    init();
  });
  comPanel.append(comForm);
  detail.append(comPanel, mf.el("p", {}, mf.el("a", { href: "/famille" }, "← La famille")));

  function lien(nodes, id) {
    const n = nodes.find((x) => x.id === id);
    return mf.el("a", { href: `/famille/${id}` }, n ? `${n.firstName} ${n.lastName || ""}`.trim() : "…");
  }

  function supprimer(person) {
    mf.confirmDelete(`Supprimer ${person.first_name} ? Ses liens dans l'arbre disparaîtront aussi.`, async () => {
      await mf.api(`/api/people/${personId}`, { method: "DELETE" });
      location.href = "/famille";
    });
  }

  function relationForm(nodes, node) {
    const form = mf.el("form", { class: "actions", style: "margin-top:.6rem" },
      mf.el("select", { id: "rel-kind", "aria-label": "Type de relation" },
        mf.el("option", { value: "parent" }, "… est parent de"),
        mf.el("option", { value: "partner" }, "… est partenaire de")),
      mf.el("select", { id: "rel-target", "aria-label": "Personne" }));
    const target = form.querySelector("#rel-target");
    for (const n of nodes) {
      if (n.id === personId) continue;
      target.append(mf.el("option", { value: n.id }, `${n.firstName} ${n.lastName || ""}`.trim()));
    }
    form.append(mf.el("button", { class: "btn btn-ghost", type: "submit" }, "Ajouter la relation"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await mf.api("/api/relationships", {
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
