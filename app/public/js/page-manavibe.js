// MANAvibe — les émissions de la famille (spec v1.2, règle 0).
// Connecteurs musicaux désactivés : l'émission rend voix, souvenirs et
// fiches chansons. Le repli est honnête, jamais inventé.

const { api, el, escapeHtml, showState, fmtDate } = window.mf;

const liste = document.getElementById("liste");
const emissionPanel = document.getElementById("emission");
const timeline = document.getElementById("timeline");

async function load() {
  showState(liste, { loading: true });
  try {
    const { programs, connectors } = await api("/api/manavibe/programs");
    const etat = document.getElementById("etat-connecteurs");
    if (connectors && (connectors.youtube_embed || connectors.deezer_preview)) {
      etat.textContent = "connecteurs musicaux : actifs";
    }
    render(programs || []);
  } catch (e) {
    showState(liste, { error: e.message });
  }
}

function render(programs) {
  liste.innerHTML = "";
  if (!programs.length) {
    showState(liste, { empty: "Aucune émission pour l'instant. La première ? Racontez une chanson, ajoutez une voix, laissez MANA relier." });
    return;
  }
  const grid = el("div", { class: "grille" });
  for (const p of programs) {
    const card = el("button", { class: "carte", style: "cursor:pointer;text-align:left" });
    card.addEventListener("click", () => openEmission(p.id));
    const corps = el("div", { class: "corps" });
    corps.append(el("span", { class: "badge badge-or" }, "Émission"));
    corps.append(el("h3", {}, p.title));
    corps.append(el("span", { class: "meta" }, `créée le ${fmtDate(p.created_at)}`));
    card.append(corps);
    grid.append(card);
  }
  liste.append(grid);
}

async function openEmission(id) {
  showState(timeline, { loading: true });
  emissionPanel.hidden = false;
  try {
    const program = await api(`/api/manavibe/programs/${id}`);
    document.getElementById("emission-titre").textContent = program.title;
    document.getElementById("emission-meta").textContent =
      `${program.segments.length} segments · créée le ${fmtDate(program.created_at)}`;
    const { timeline: segs } = await api(`/api/manavibe/programs/${id}/timeline`);
    renderTimeline(segs);
  } catch (e) {
    showState(timeline, { error: e.message });
  }
}

function renderTimeline(segs) {
  timeline.innerHTML = "";
  for (const s of segs) timeline.append(renderSegment(s));
}

function renderSegment(s) {
  if (s.type === "mana_voice")
    return el("div", { class: "segment mana" },
      el("span", { class: "badge badge-or" }, "MANA"),
      el("p", { class: "segment-texte" }, s.text));

  if (s.type === "announcement")
    return el("div", { class: "segment annonce" },
      el("span", { class: "badge" }, "Annonce"),
      el("p", { class: "segment-texte" }, s.text));

  if (s.type === "family_voice") {
    const card = el("div", { class: "segment voix" },
      el("span", { class: "badge" }, "Message vocal de la famille"));
    const audio = el("audio", { controls: "", src: `/api/media/${s.asset_id}`, style: "width:100%" });
    card.append(audio);
    return card;
  }

  if (s.type === "transition")
    return el("div", { class: "segment transition" },
      el("span", { class: "meta" },
        s.transition.kind === "fade" ? "· fondu ·" : "· silence ·"));

  if (s.type === "song_ref") {
    const card = el("div", { class: "segment chanson" });
    card.append(el("span", { class: "badge badge-or" }, "La chanson"));
    card.append(el("h3", {}, `${s.song.title}${s.song.primary_artist ? " — " + s.song.primary_artist : ""}`));

    if (s.song.recordings.length) {
      for (const r of s.song.recordings)
        card.append(el("p", { class: "meta" },
          `Enregistrement : ${r.artist}${r.album ? " · " + r.album : ""}${r.year ? " · " + r.year : ""}`));
    } else {
      card.append(el("p", { class: "meta" }, "Aucun enregistrement référencé — la chanson vit déjà dans la mémoire."));
    }

    // Le souvenir : LA valeur. Toujours rendu s'il existe.
    if (s.song.memories.length) {
      for (const m of s.song.memories) {
        const lien = el("a", { class: "carte souvenir-lien", href: `/souvenirs/${m.id}` });
        const corps = el("div", { class: "corps" });
        corps.append(el("span", { class: "badge" }, m.relation === "story" ? "Pourquoi cette chanson" : "Souvenir associé"));
        corps.append(el("h4", {}, m.title));
        corps.append(el("p", { class: "meta" }, (m.description || "").slice(0, 140)));
        lien.append(corps);
        card.append(lien);
      }
    }

    // Repli honnête : l'écoute intégrée n'existe pas encore (règle 0),
    // et MANA ne fabrique jamais de contenu.
    if (!s.playable) {
      card.append(el("p", { class: "meta notice" },
        s.fallback?.kind === "replay_real_content"
          ? "Écoute intégrée indisponible — mais le souvenir de cette chanson se lit, lui."
          : "Écoute intégrée : pas encore. Les connecteurs musicaux arriveront plus tard — le souvenir, lui, reste."));
    }
    return card;
  }

  return el("div", { class: "segment" });
}

load();
