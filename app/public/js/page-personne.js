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
      mf.el("button", { class: "btn btn-ghost", type: "button", onclick: () => ouvrirAssistantBiographie(p) }, "Assistant biographie"),
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

  // ---------------------------------------------------------------------
  // Assistant biographie — guidé, sans IA : une série de questions, et
  // les réponses telles quelles deviennent la biographie. Rien n'est
  // reformulé ni inventé ; l'assistant structure, il n'écrit pas à la
  // place de la famille.
  // ---------------------------------------------------------------------
  const QUESTIONS_BIOGRAPHIE = [
    { id: "naissance", texte: "Où et dans quelles circonstances est-il/elle né(e) ?" },
    { id: "enfance", texte: "Comment décririez-vous son enfance ?" },
    { id: "metier-passion", texte: "Quel métier a-t-il/elle exercé, ou quelle a été sa plus grande passion ?" },
    { id: "anecdote", texte: "Une anecdote ou un souvenir qui le/la résume bien ?" },
    { id: "heritage", texte: "Qu'est-ce qu'on voudrait que les générations suivantes retiennent de lui/elle ?" },
  ];

  function ouvrirAssistantBiographie(person) {
    const dlg = mf.el("dialog", { "aria-label": "Assistant biographie" });
    const questions = QUESTIONS_BIOGRAPHIE.map((q) =>
      mf.el("div", { style: "margin-bottom:1rem" },
        mf.el("label", { for: `q-${q.id}` }, q.texte),
        mf.el("textarea", { id: `q-${q.id}`, placeholder: "…" })));

    const etapeQuestions = mf.el("div", {},
      mf.el("h2", { style: "margin-top:0" }, `Assistant biographie — ${person.first_name}`),
      person.biography
        ? mf.el("p", { class: "meta" }, "Une biographie existe déjà. Les réponses ci-dessous composeront un nouveau texte, que vous pourrez ajuster avant qu'il ne remplace l'actuel.")
        : mf.el("p", { class: "meta" }, "Répondez à ce qui vous inspire — laissez vide ce qui ne s'applique pas."),
      ...questions,
      mf.el("div", { class: "actions" },
        mf.el("button", { class: "btn", type: "button", id: "btn-assembler" }, "Assembler la biographie"),
        mf.el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")));

    const brouillon = mf.el("textarea", { id: "biographie-brouillon", style: "min-height:14rem" });
    const etapeApercu = mf.el("div", { hidden: true },
      mf.el("h2", { style: "margin-top:0" }, "Avant d'enregistrer"),
      mf.el("p", { class: "meta" }, "Assemblé à partir de vos réponses — modifiez librement avant d'enregistrer."),
      brouillon,
      mf.el("div", { class: "actions", style: "margin-top:1rem" },
        mf.el("button", { class: "btn", type: "button", id: "btn-enregistrer-bio" }, "Enregistrer"),
        mf.el("button", { class: "btn btn-ghost", type: "button", id: "btn-retour-bio" }, "← Revoir les réponses")),
      mf.el("p", { class: "erreur", id: "bio-err", hidden: true, role: "alert" }));

    dlg.append(etapeQuestions, etapeApercu);
    document.body.append(dlg);
    dlg.showModal();
    dlg.addEventListener("close", () => dlg.remove());

    dlg.querySelector("#btn-assembler").addEventListener("click", () => {
      const paragraphes = QUESTIONS_BIOGRAPHIE
        .map((q) => dlg.querySelector(`#q-${q.id}`).value.trim())
        .filter(Boolean);
      if (!paragraphes.length) return;
      brouillon.value = paragraphes.join("\n\n");
      etapeQuestions.hidden = true;
      etapeApercu.hidden = false;
    });

    dlg.querySelector("#btn-retour-bio").addEventListener("click", () => {
      etapeApercu.hidden = true;
      etapeQuestions.hidden = false;
    });

    dlg.querySelector("#btn-enregistrer-bio").addEventListener("click", async () => {
      const btn = dlg.querySelector("#btn-enregistrer-bio");
      const errEl = dlg.querySelector("#bio-err");
      mf.spinner(btn, true);
      errEl.hidden = true;
      try {
        await mf.api(`/api/people/${personId}`, {
          method: "PUT",
          body: {
            first_name: person.first_name,
            last_name: person.last_name,
            birth_date: person.birth_date,
            death_date: person.death_date,
            is_child: !!person.is_child,
            visibility: person.visibility,
            biography: brouillon.value,
          },
        });
        dlg.close();
        init();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
        mf.spinner(btn, false);
      }
    });
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
