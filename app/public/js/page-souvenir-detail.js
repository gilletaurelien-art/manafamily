// Détail d'un souvenir : médias (upload réel), personnes, commentaires,
// modification, suppression. Reprise après échec d'upload.
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const detail = document.getElementById("detail");
const memoryId = location.pathname.split("/")[2];

async function init() {
  detail.innerHTML = "";
  detail.append(mf.el("p", { class: "chargement", role: "status" }, "Chargement…"));
  let m;
  try {
    m = await mf.api(`/api/memories/${memoryId}`);
  } catch (e) {
    detail.innerHTML = "";
    detail.append(mf.el("p", { class: "erreur", role: "alert" }, e.message));
    return;
  }
  detail.innerHTML = "";

  const head = mf.el("section", { class: "bulle" },
    mf.el("p", { class: "meta" }, mf.kindLabel(m.kind) + (m.draft ? " · brouillon" : "")),
    mf.el("h1", { style: "margin:.2rem 0" }, m.title),
    mf.el("p", { class: "meta" }, [mf.fmtDate(m.happened_on), m.place].filter(Boolean).join(" · ")),
    m.description ? mf.el("p", { style: "white-space:pre-wrap" }, m.description) : null,
    mf.el("div", { class: "actions", style: "margin-top:1rem" },
      mf.el("button", { class: "btn btn-ghost", onclick: openEdit }, "Modifier"),
      mf.el("button", { class: "btn btn-danger", onclick: () => supprimer(m) }, "Supprimer")));

  // Médias
  const mediasPanel = mf.el("section", { class: "panel" });
  mediasPanel.append(mf.el("h3", {}, "Photos, vidéos, documents"));
  const gallery = mf.el("div", { class: "grille" });
  for (const media of m.media || []) {
    const fig = mf.el("div", { class: "carte" });
    if ((media.mime_type || "").startsWith("image/")) {
      fig.append(mf.el("img", { src: mf.mediaUrl(media.id), alt: media.filename, loading: "lazy" }));
    } else if ((media.mime_type || "").startsWith("audio/")) {
      fig.append(mf.el("div", { class: "corps" },
        mf.el("audio", { controls: true, src: mf.mediaUrl(media.id) })));
    } else if ((media.mime_type || "").startsWith("video/")) {
      fig.append(mf.el("div", { class: "corps" },
        mf.el("video", { controls: true, src: mf.mediaUrl(media.id), style: "width:100%" })));
    } else {
      fig.append(mf.el("div", { class: "corps" },
        mf.el("a", { href: mf.mediaUrl(media.id) }, media.filename)));
    }
    fig.append(mf.el("div", { class: "corps" },
      mf.el("span", { class: "meta" }, `${media.filename} (${Math.round(media.byte_size / 1024)} Ko)`),
      mf.el("button", { class: "btn btn-ghost", style: "margin-top:.3rem", onclick: async () => {
        await mf.api(`/api/media/${media.id}`, { method: "DELETE" });
        init();
      } }, "Retirer")));
    gallery.append(fig);
  }
  mediasPanel.append(gallery);

  const uploadForm = mf.el("form", {},
    mf.el("label", {}, "Ajouter un fichier (max 50 Mo)"),
    mf.el("input", { type: "file", required: true }),
    mf.el("button", { class: "btn btn-ghost", type: "submit", style: "margin-top:.5rem" }, "Téléverser"));
  const uploadErr = mf.el("p", { class: "erreur", hidden: true, role: "alert" });
  mediasPanel.append(uploadForm, uploadErr);

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = uploadForm.querySelector("button");
    const file = uploadForm.querySelector("input").files[0];
    if (!file) return;
    btn.disabled = true; btn.textContent = "Téléversement…";
    uploadErr.hidden = true;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await mf.api(`/api/memories/${memoryId}/media`, { method: "POST", body: fd });
      init();
    } catch (err) {
      uploadErr.textContent = err.message + " — vous pouvez réessayer.";
      uploadErr.hidden = false;
      btn.disabled = false; btn.textContent = "Téléverser";
    }
  });

  // Personnes associées
  const personsPanel = mf.el("section", { class: "panel" });
  personsPanel.append(mf.el("h3", {}, "Personnes"));
  const personList = mf.el("ul", {});
  for (const p of m.persons || []) {
    personList.append(mf.el("li", {}, mf.el("a", { href: `/famille/${p.id}` }, `${p.first_name} ${p.last_name || ""}`.trim())));
  }
  if (!personList.children.length) personList.append(mf.el("li", { class: "meta" }, "Personne associée pour l'instant."));
  personsPanel.append(personList);
  const linkForm = mf.el("form", { class: "actions" },
    mf.el("select", { id: "link-person", "aria-label": "Associer une personne" }),
    mf.el("button", { class: "btn btn-ghost", type: "submit" }, "Associer"));
  personsPanel.append(linkForm);
  try {
    const { people } = await mf.api("/api/people");
    const sel = linkForm.querySelector("select");
    sel.append(mf.el("option", { value: "" }, "— Choisir —"));
    for (const p of people) sel.append(mf.el("option", { value: p.id }, `${p.first_name} ${p.last_name || ""}`.trim()));
  } catch { /* pas bloquant */ }
  linkForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const sel = linkForm.querySelector("select");
    if (!sel.value) return;
    const current = (m.persons || []).map((p) => p.id);
    await mf.api(`/api/memories/${memoryId}`, {
      method: "PUT",
      body: {
        title: m.title, kind: m.kind, description: m.description,
        happened_on: m.happened_on, place: m.place,
        visibility: m.visibility, draft: m.draft,
        person_ids: [...current, sel.value],
      },
    });
    init();
  });

  // Commentaires
  const commentsPanel = mf.el("section", { class: "panel" });
  commentsPanel.append(mf.el("h3", {}, "Témoignages et commentaires"));
  const comments = mf.el("div", {});
  for (const c of m.comments || []) {
    comments.append(mf.el("p", { class: "panel", style: "margin:.3rem 0" },
      mf.el("strong", {}, c.author + " "), mf.escapeHtml(c.body),
      mf.el("span", { class: "meta" }, `— ${mf.fmtDate(c.created_at)}`)));
  }
  if (!m.comments?.length) comments.append(mf.el("p", { class: "meta" }, "Aucun commentaire pour l'instant."));
  const comForm = mf.el("form", {},
    mf.el("textarea", { placeholder: "Un souvenir complémentaire, un témoignage…", required: true }),
    mf.el("button", { class: "btn btn-ghost", type: "submit", style: "margin-top:.4rem" }, "Commenter"));
  comForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ta = comForm.querySelector("textarea");
    await mf.api(`/api/memories/${memoryId}/comments`, { method: "POST", body: { body: ta.value } });
    init();
  });
  commentsPanel.append(comments, comForm);

  detail.append(head, mediasPanel, personsPanel, commentsPanel,
    mf.el("p", {}, mf.el("a", { href: "/souvenirs" }, "← Tous les souvenirs")));

  function supprimer(mem) {
    mf.confirmDelete(`Supprimer définitivement « ${mem.title} » et ses fichiers ? Cette action est irréversible.`, async () => {
      await mf.api(`/api/memories/${memoryId}`, { method: "DELETE" });
      location.href = "/souvenirs";
    });
  }

  function openEdit() {
    const dlg = mf.el("dialog", {});
    const form = mf.el("form", {},
      mf.el("h2", { style: "margin-top:0" }, "Modifier"),
      mf.el("label", {}, "Titre"), mf.el("input", { type: "text", value: m.title, required: true, id: "t" }),
      mf.el("label", {}, "Description"), mf.el("textarea", { id: "d" }, m.description || ""),
      mf.el("label", {}, "Date"), mf.el("input", { type: "date", value: m.happened_on || "", id: "h" }),
      mf.el("label", {}, "Lieu"), mf.el("input", { type: "text", value: m.place || "", id: "p" }),
      mf.el("label", {}, "Visibilité"),
      mf.el("select", { id: "v" },
        mf.el("option", { value: "family", selected: m.visibility === "family" }, "Toute la famille"),
        mf.el("option", { value: "adults", selected: m.visibility === "adults" }, "Adultes uniquement")),
      mf.el("label", {}, "Statut"),
      mf.el("select", { id: "s" },
        mf.el("option", { value: "0", selected: !m.draft }, "Publié"),
        mf.el("option", { value: "1", selected: !!m.draft }, "Brouillon")),
      mf.el("div", { class: "actions", style: "margin-top:1rem" },
        mf.el("button", { class: "btn", type: "submit" }, "Enregistrer"),
        mf.el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")));
    dlg.append(form);
    document.body.append(dlg);
    dlg.showModal();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await mf.api(`/api/memories/${memoryId}`, {
        method: "PUT",
        body: {
          title: form.t.value, kind: m.kind, description: form.d.value,
          happened_on: form.h.value || null, place: form.p.value,
          visibility: form.v.value, draft: form.s.value === "1",
          person_ids: (m.persons || []).map((p) => p.id),
        },
      });
      dlg.close();
      init();
    });
  }
}

init();
