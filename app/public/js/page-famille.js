// Famille : arbre générationnel navigable + CRUD personnes et relations.
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const arbre = document.getElementById("arbre");
const liste = document.getElementById("liste-people");

async function init() {
  if (new URLSearchParams(location.search).get("ajouter")) openPersonForm();
  await Promise.all([loadTree(), loadPeople()]);
}

async function loadTree() {
  arbre.innerHTML = "";
  arbre.append(mf.el("p", { class: "chargement" }, "Chargement de l'arbre…"));
  try {
    const { nodes } = await mf.api("/api/family/tree");
    arbre.innerHTML = "";
    if (!nodes.length) {
      arbre.append(mf.el("p", { class: "meta" }, "L'arbre se construit à partir des personnes et des relations enregistrées."));
      return;
    }
    const byGen = new Map();
    for (const n of nodes) {
      if (!byGen.has(n.generation)) byGen.set(n.generation, []);
      byGen.get(n.generation).push(n);
    }
    const sorted = [...byGen.entries()].sort((a, b) => a[0] - b[0]);
    for (const [gen, people] of sorted) {
      const section = mf.el("div", { class: "arbre-gen" },
        mf.el("h2", { class: "gen-titre" }, gen === 0 ? "Génération fondatrice" : `Génération ${gen + 1}`));
      const row = mf.el("div", { class: "gen-ligne" });
      for (const p of people) {
        row.append(mf.el("a", { class: "noeud", href: `/famille/${p.id}` },
          `${p.firstName} ${p.lastName || ""}`.trim(),
          mf.el("span", { class: "dates" }, [
            p.birthDate ? "né·e " + p.birthDate.slice(0, 4) : null,
            p.deathDate ? "† " + p.deathDate.slice(0, 4) : null,
            p.isChild ? "enfant" : null,
          ].filter(Boolean).join(" · "))));
      }
      section.append(row);
      arbre.append(section);
    }
  } catch (e) {
    arbre.innerHTML = "";
    arbre.append(mf.el("p", { class: "erreur" }, e.message));
  }
}

async function loadPeople() {
  liste.innerHTML = "";
  try {
    const { people } = await mf.api("/api/people");
    if (!people.length) {
      liste.append(mf.el("p", { class: "meta" }, "Aucune personne enregistrée."));
      return;
    }
    const panel = mf.el("section", { class: "panel" });
    panel.append(mf.el("h3", {}, "Toutes les personnes"));
    for (const p of people) {
      panel.append(mf.el("p", { style: "margin:.3rem 0" },
        mf.el("a", { href: `/famille/${p.id}` }, `${p.first_name} ${p.last_name || ""}`.trim()),
        mf.el("span", { class: "meta" }, ` — ${mf.fmtDate(p.birth_date)}${p.is_child ? " · enfant" : ""}`)));
    }
    liste.append(panel);
  } catch (e) {
    liste.append(mf.el("p", { class: "erreur" }, e.message));
  }
}

function openPersonForm(person = null) {
  const dlg = mf.el("dialog", {});
  const form = mf.el("form", {},
    mf.el("h2", { style: "margin-top:0" }, person ? "Modifier la personne" : "Nouvelle personne"),
    mf.el("label", {}, "Prénom"), mf.el("input", { type: "text", id: "first", required: true, value: person?.first_name || "" }),
    mf.el("label", {}, "Nom (optionnel)"), mf.el("input", { type: "text", id: "last", value: person?.last_name || "" }),
    mf.el("label", {}, "Date de naissance (optionnel)"), mf.el("input", { type: "date", id: "birth", value: person?.birth_date || "" }),
    mf.el("label", {}, "Date de décès (optionnel)"), mf.el("input", { type: "date", id: "death", value: person?.death_date || "" }),
    mf.el("label", {}, "Biographie (optionnel)"), mf.el("textarea", { id: "bio" }, person?.biography || ""),
    mf.el("label", {}, "Enfant (contenus « adultes » masqués)"),
    mf.el("input", { type: "checkbox", id: "child", checked: person?.is_child ? true : null }),
    mf.el("div", { class: "actions", style: "margin-top:1rem" },
      mf.el("button", { class: "btn", type: "submit" }, "Enregistrer"),
      mf.el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")));
  dlg.append(form);
  document.body.append(dlg);
  dlg.showModal();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      first_name: form.first.value,
      last_name: form.last.value,
      birth_date: form.birth.value || null,
      death_date: form.death.value || null,
      biography: form.bio.value,
      is_child: form.child.checked,
    };
    if (person) await mf.api(`/api/people/${person.id}`, { method: "PUT", body });
    else await mf.api("/api/people", { method: "POST", body });
    dlg.close();
    init();
  });
}

// Bouton global : passer par le lien "Ajouter une personne" (query).
document.addEventListener("click", (e) => {
  if (e.target.matches('a[href="/famille?ajouter=1"]')) {
    e.preventDefault();
    openPersonForm();
  }
});

init();
