// Détail d'un souvenir : médias (upload réel), personnes, commentaires,
// modification, suppression. Reprise après échec d'upload.
const { api, el, escapeHtml, fmtDate, kindLabel, confirmDelete, mediaUrl } = window.mf;

const detail = document.getElementById("detail");
const memoryId = location.pathname.split("/")[2];

async function init() {
  detail.innerHTML = "";
  detail.append(el("p", { class: "chargement", role: "status" }, "Chargement…"));
  let m;
  try {
    m = await api(`/api/memories/${memoryId}`);
  } catch (e) {
    detail.innerHTML = "";
    detail.append(el("p", { class: "erreur", role: "alert" }, e.message));
    return;
  }
  detail.innerHTML = "";

  const head = el("section", { class: "bulle" },
    el("p", { class: "meta" }, kindLabel(m.kind) + (m.draft ? " · brouillon" : "")),
    el("h1", { style: "margin:.2rem 0" }, m.title),
    el("p", { class: "meta" }, [fmtDate(m.happened_on), m.place].filter(Boolean).join(" · ")),
    m.description ? el("p", { style: "white-space:pre-wrap" }, m.description) : null,
    el("div", { class: "actions", style: "margin-top:1rem" },
      el("button", { class: "btn btn-ghost", onclick: openEdit }, "Modifier"),
      el("button", { class: "btn btn-danger", onclick: () => supprimer(m) }, "Supprimer")));

  // Médias
  const mediasPanel = el("section", { class: "panel" });
  mediasPanel.append(el("h3", {}, "Photos, vidéos, documents"));
  const gallery = el("div", { class: "grille" });
  for (const media of m.media || []) {
    const fig = el("div", { class: "carte" });
    if ((media.mime_type || "").startsWith("image/")) {
      fig.append(el("img", { src: mediaUrl(media.id), alt: media.filename, loading: "lazy" }));
    } else if ((media.mime_type || "").startsWith("audio/")) {
      fig.append(el("div", { class: "corps" },
        el("audio", { controls: true, src: mediaUrl(media.id) })));
    } else if ((media.mime_type || "").startsWith("video/")) {
      fig.append(el("div", { class: "corps" },
        el("video", { controls: true, src: mediaUrl(media.id), style: "width:100%" })));
    } else {
      fig.append(el("div", { class: "corps" },
        el("a", { href: mediaUrl(media.id) }, media.filename)));
    }
    fig.append(el("div", { class: "corps" },
      el("span", { class: "meta" }, `${media.filename} (${Math.round(media.byte_size / 1024)} Ko)`),
      el("button", { class: "btn btn-ghost", style: "margin-top:.3rem", onclick: async () => {
        await api(`/api/media/${media.id}`, { method: "DELETE" });
        init();
      } }, "Retirer")));
    gallery.append(fig);
  }
  mediasPanel.append(gallery);

  const uploadForm = el("form", {},
    el("label", {}, "Ajouter un fichier (max 50 Mo)"),
    el("input", { type: "file", required: true }),
    el("button", { class: "btn btn-ghost", type: "submit", style: "margin-top:.5rem" }, "Téléverser"));
  const uploadErr = el("p", { class: "erreur", hidden: true, role: "alert" });
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
      await api(`/api/memories/${memoryId}/media`, { method: "POST", body: fd });
      init();
    } catch (err) {
      uploadErr.textContent = err.message + " — vous pouvez réessayer.";
      uploadErr.hidden = false;
      btn.disabled = false; btn.textContent = "Téléverser";
    }
  });

  // Personnes associées
  const personsPanel = el("section", { class: "panel" });
  personsPanel.append(el("h3", {}, "Personnes"));
  const personList = el("ul", {});
  for (const p of m.persons || []) {
    personList.append(el("li", {}, el("a", { href: `/famille/${p.id}` }, `${p.first_name} ${p.last_name || ""}`.trim())));
  }
  if (!personList.children.length) personList.append(el("li", { class: "meta" }, "Personne associée pour l'instant."));
  personsPanel.append(personList);
  const linkForm = el("form", { class: "actions" },
    el("select", { id: "link-person", "aria-label": "Associer une personne" }),
    el("button", { class: "btn btn-ghost", type: "submit" }, "Associer"));
  personsPanel.append(linkForm);
  try {
    const { people } = await api("/api/people");
    const sel = linkForm.querySelector("select");
    sel.append(el("option", { value: "" }, "— Choisir —"));
    for (const p of people) sel.append(el("option", { value: p.id }, `${p.first_name} ${p.last_name || ""}`.trim()));
  } catch { /* pas bloquant */ }
  linkForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const sel = linkForm.querySelector("select");
    if (!sel.value) return;
    const current = (m.persons || []).map((p) => p.id);
    await api(`/api/memories/${memoryId}`, {
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
  const commentsPanel = el("section", { class: "panel" });
  commentsPanel.append(el("h3", {}, "Témoignages et commentaires"));
  const comments = el("div", {});
  for (const c of m.comments || []) {
    comments.append(el("p", { class: "panel", style: "margin:.3rem 0" },
      el("strong", {}, c.author + " "), escapeHtml(c.body),
      el("span", { class: "meta" }, `— ${fmtDate(c.created_at)}`)));
  }
  if (!m.comments?.length) comments.append(el("p", { class: "meta" }, "Aucun commentaire pour l'instant."));
  const comForm = el("form", {},
    el("textarea", { placeholder: "Un souvenir complémentaire, un témoignage…", required: true }),
    el("button", { class: "btn btn-ghost", type: "submit", style: "margin-top:.4rem" }, "Commenter"));
  comForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ta = comForm.querySelector("textarea");
    await api(`/api/memories/${memoryId}/comments`, { method: "POST", body: { body: ta.value } });
    init();
  });
  commentsPanel.append(comments, comForm);

  detail.append(head, mediasPanel, personsPanel, commentsPanel,
    el("p", {}, el("a", { href: "/souvenirs" }, "← Tous les souvenirs")));

  function supprimer(mem) {
    confirmDelete(`Supprimer définitivement « ${mem.title} » et ses fichiers ? Cette action est irréversible.`, async () => {
      await api(`/api/memories/${memoryId}`, { method: "DELETE" });
      location.href = "/souvenirs";
    });
  }

  function openEdit() {
    const dlg = el("dialog", {});
    const form = el("form", {},
      el("h2", { style: "margin-top:0" }, "Modifier"),
      el("label", {}, "Titre"), el("input", { type: "text", value: m.title, required: true, id: "t" }),
      el("label", {}, "Description"), el("textarea", { id: "d" }, m.description || ""),
      el("label", {}, "Date"), el("input", { type: "date", value: m.happened_on || "", id: "h" }),
      el("label", {}, "Lieu"), el("input", { type: "text", value: m.place || "", id: "p" }),
      el("label", {}, "Visibilité"),
      el("select", { id: "v" },
        el("option", { value: "family", selected: m.visibility === "family" }, "Toute la famille"),
        el("option", { value: "adults", selected: m.visibility === "adults" }, "Adultes uniquement")),
      el("label", {}, "Statut"),
      el("select", { id: "s" },
        el("option", { value: "0", selected: !m.draft }, "Publié"),
        el("option", { value: "1", selected: !!m.draft }, "Brouillon")),
      el("div", { class: "actions", style: "margin-top:1rem" },
        el("button", { class: "btn", type: "submit" }, "Enregistrer"),
        el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")));
    dlg.append(form);
    document.body.append(dlg);
    dlg.showModal();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await api(`/api/memories/${memoryId}`, {
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
