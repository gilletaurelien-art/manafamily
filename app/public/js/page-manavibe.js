// MANAvibe — les émissions de la famille (spec v1.2, règle 0).
// Connecteurs musicaux désactivés : l'émission rend voix, souvenirs et
// fiches chansons. Le repli est honnête, jamais inventé.

const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const liste = document.getElementById("liste");
const emissionPanel = document.getElementById("emission");
const timeline = document.getElementById("timeline");
const rituelPanel = document.getElementById("rituel");

async function load() {
  mf.showState(liste, { loading: true });
  try {
    const { programs, connectors } = await mf.api("/api/manavibe/programs");
    const etat = document.getElementById("etat-connecteurs");
    if (connectors && (connectors.youtube_embed || connectors.deezer_preview)) {
      etat.textContent = "connecteurs musicaux : actifs";
    }
    render(programs || []);
  } catch (e) {
    mf.showState(liste, { error: e.message });
  }
  loadRituel();
}

// ---------------------------------------------------------------------
// Le rituel hebdomadaire — une question posée par MANA, affichée en tête
// de la page. Répondre réutilise les chemins souvenirs / chansons déjà
// écrits : aucune nouvelle forme de stockage ici, juste l'habillage.
// ---------------------------------------------------------------------

async function loadRituel() {
  let current;
  try {
    ({ current } = await mf.api("/api/rituel/current"));
  } catch {
    rituelPanel.hidden = true;
    return;
  }
  if (!current) {
    rituelPanel.hidden = true;
    return;
  }
  rituelPanel.hidden = false;
  rituelPanel.innerHTML = "";

  const estChanson = current.category === "chanson";
  rituelPanel.append(
    mf.el("span", { class: "badge badge-accent" }, estChanson ? "Question de la semaine — une chanson" : "Question de la semaine"),
    mf.el("p", { class: "lede", style: "margin:0.5rem 0 1rem" }, current.text)
  );

  if (current.answered_at) {
    rituelPanel.append(
      mf.el("p", { class: "meta" }, `Vous avez répondu le ${mf.fmtDate(current.answered_at)}.`)
    );
  } else {
    const btn = mf.el("button", { class: "btn" }, "Répondre");
    btn.addEventListener("click", () => openRituelDialog(current));
    rituelPanel.append(btn);
  }
}

function openRituelDialog(current) {
  const estChanson = current.category === "chanson";
  const dlg = mf.el("dialog", { "aria-label": "Répondre à la question de la semaine" });
  const champsChanson = estChanson
    ? [
        mf.el("label", { for: "rituel-chanson-titre" }, "Titre de la chanson (optionnel)"),
        mf.el("input", { type: "text", id: "rituel-chanson-titre" }),
        mf.el("label", { for: "rituel-chanson-artiste" }, "Artiste (optionnel)"),
        mf.el("input", { type: "text", id: "rituel-chanson-artiste" }),
      ]
    : [];
  const form = mf.el(
    "form",
    { id: "form-rituel" },
    mf.el("h2", { style: "margin-top:0" }, "Nouveau souvenir"),
    mf.el("p", { class: "meta" }, current.text),
    ...champsChanson,
    mf.el("label", { for: "rituel-texte" }, "Votre réponse, par écrit"),
    mf.el("textarea", { id: "rituel-texte", placeholder: "Racontez…" }),
    mf.el("label", { for: "rituel-audio" }, "Ou un message vocal (optionnel)"),
    mf.el("input", { type: "file", id: "rituel-audio", accept: "audio/*" }),
    mf.el(
      "div",
      { class: "actions", style: "margin-top:1rem" },
      mf.el("button", { class: "btn", type: "submit" }, "Enregistrer"),
      mf.el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")
    ),
    mf.el("p", { class: "erreur", id: "rituel-err", hidden: true, role: "alert" })
  );
  dlg.append(form);
  document.body.append(dlg);
  dlg.showModal();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    const errEl = form.querySelector("#rituel-err");
    const texte = form["rituel-texte"].value.trim();
    const fichier = form["rituel-audio"].files[0];
    if (!texte && !fichier) {
      errEl.textContent = "Écrivez quelques mots, ou joignez un message vocal.";
      errEl.hidden = false;
      return;
    }
    mf.spinner(btn, true);
    errEl.hidden = true;
    try {
      const memoire = await mf.api("/api/memories", {
        method: "POST",
        body: {
          title: `Réponse : ${current.text.slice(0, 60)}`,
          kind: fichier ? "audio" : "text",
          description: texte || null,
        },
      });
      if (fichier) {
        const donnees = new FormData();
        donnees.append("file", fichier);
        await mf.api(`/api/memories/${memoire.id}/media`, { method: "POST", body: donnees });
      }

      let songId = null;
      const titreChanson = estChanson ? form["rituel-chanson-titre"]?.value.trim() : "";
      if (titreChanson) {
        const chanson = await mf.api("/api/manavibe/songs", {
          method: "POST",
          body: { title: titreChanson, primary_artist: form["rituel-chanson-artiste"]?.value.trim() || null },
        });
        await mf.api(`/api/manavibe/songs/${chanson.id}/memories`, {
          method: "POST",
          body: { memory_id: memoire.id, relation: "story" },
        });
        songId = chanson.id;
      }

      await mf.api(`/api/rituel/${current.id}/answer`, {
        method: "POST",
        body: { memory_id: memoire.id, song_id: songId },
      });
      dlg.close();
      loadRituel();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
      mf.spinner(btn, false);
    }
  });
}

function render(programs) {
  liste.innerHTML = "";
  if (!programs.length) {
    mf.showState(liste, { empty: "Aucune émission pour l'instant. La première ? Racontez une chanson, ajoutez une voix, laissez MANA relier." });
    return;
  }
  const grid = mf.el("div", { class: "grille" });
  for (const p of programs) {
    const card = mf.el("button", { class: "carte", style: "cursor:pointer;text-align:left" });
    card.addEventListener("click", () => openEmission(p.id));
    const corps = mf.el("div", { class: "corps" });
    corps.append(mf.el("span", { class: "badge badge-accent" }, "Émission"));
    corps.append(mf.el("h3", {}, p.title));
    corps.append(mf.el("span", { class: "meta" }, `créée le ${mf.fmtDate(p.created_at)}`));
    card.append(corps);
    grid.append(card);
  }
  liste.append(grid);
}

async function openEmission(id) {
  mf.showState(timeline, { loading: true });
  emissionPanel.hidden = false;
  try {
    const program = await mf.api(`/api/manavibe/programs/${id}`);
    document.getElementById("emission-titre").textContent = program.title;
    document.getElementById("emission-meta").textContent =
      `${program.segments.length} segments · créée le ${mf.fmtDate(program.created_at)}`;
    const { timeline: segs } = await mf.api(`/api/manavibe/programs/${id}/timeline`);
    renderTimeline(segs);
  } catch (e) {
    mf.showState(timeline, { error: e.message });
  }
}

function renderTimeline(segs) {
  timeline.innerHTML = "";
  for (const s of segs) timeline.append(renderSegment(s));
}

function renderSegment(s) {
  if (s.type === "mana_voice")
    return mf.el("div", { class: "segment mana" },
      mf.el("span", { class: "badge badge-accent" }, "MANA"),
      mf.el("p", { class: "segment-texte" }, s.text));

  if (s.type === "announcement")
    return mf.el("div", { class: "segment annonce" },
      mf.el("span", { class: "badge" }, "Annonce"),
      mf.el("p", { class: "segment-texte" }, s.text));

  if (s.type === "family_voice") {
    const card = mf.el("div", { class: "segment voix" },
      mf.el("span", { class: "badge" }, "Message vocal de la famille"));
    const audio = mf.el("audio", { controls: "", src: `/api/media/${s.asset_id}`, style: "width:100%" });
    card.append(audio);
    return card;
  }

  if (s.type === "transition")
    return mf.el("div", { class: "segment transition" },
      mf.el("span", { class: "meta" },
        s.transition.kind === "fade" ? "· fondu ·" : "· silence ·"));

  if (s.type === "song_ref") {
    const card = mf.el("div", { class: "segment chanson" });
    card.append(mf.el("span", { class: "badge badge-accent" }, "La chanson"));
    card.append(mf.el("h3", {}, `${s.song.title}${s.song.primary_artist ? " — " + s.song.primary_artist : ""}`));

    if (s.song.recordings.length) {
      for (const r of s.song.recordings)
        card.append(mf.el("p", { class: "meta" },
          `Enregistrement : ${r.artist}${r.album ? " · " + r.album : ""}${r.year ? " · " + r.year : ""}`));
    } else {
      card.append(mf.el("p", { class: "meta" }, "Aucun enregistrement référencé — la chanson vit déjà dans la mémoire."));
    }

    // Le souvenir : LA valeur. Toujours rendu s'il existe.
    if (s.song.memories.length) {
      for (const m of s.song.memories) {
        const lien = mf.el("a", { class: "carte souvenir-lien", href: `/souvenirs/${m.id}` });
        const corps = mf.el("div", { class: "corps" });
        corps.append(mf.el("span", { class: "badge" }, m.relation === "story" ? "Pourquoi cette chanson" : "Souvenir associé"));
        corps.append(mf.el("h4", {}, m.title));
        corps.append(mf.el("p", { class: "meta" }, (m.description || "").slice(0, 140)));
        lien.append(corps);
        card.append(lien);
      }
    }

    // Repli honnête : l'écoute intégrée n'existe pas encore (règle 0),
    // et MANA ne fabrique jamais de contenu.
    if (!s.playable) {
      card.append(mf.el("p", { class: "meta notice" },
        s.fallback?.kind === "replay_real_content"
          ? "Écoute intégrée indisponible — mais le souvenir de cette chanson se lit, lui."
          : "Écoute intégrée : pas encore. Les connecteurs musicaux arriveront plus tard — le souvenir, lui, reste."));
    }
    return card;
  }

  return mf.el("div", { class: "segment" });
}

load();
