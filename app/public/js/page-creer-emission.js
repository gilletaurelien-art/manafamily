// Composer une émission MANAvibe : assembler des segments dans l'ordre,
// puis créer le programme via l'API existante (POST /api/manavibe/programs),
// qui valide déjà chaque segment côté serveur — ce fichier ne fait que les
// construire dans la forme attendue.
const mf = window.mf;

const form = document.getElementById("form-emission");
const segListe = document.getElementById("segments-liste");
const segVide = document.getElementById("segments-vide");
const segType = document.getElementById("seg-type");
const segChamps = document.getElementById("seg-champs");
const btnAjouter = document.getElementById("btn-ajouter-segment");
const err = document.getElementById("err");

const segments = [];

function resumeSegment(s) {
  if (s.type === "mana_voice") return `MANA : « ${s.text.slice(0, 60)} »`;
  if (s.type === "announcement") return `Annonce : « ${s.text.slice(0, 60)} »`;
  if (s.type === "family_voice") return `Message vocal de la famille (${s.libelle || s.asset_id})`;
  if (s.type === "song_ref") return `Chanson : ${s.libelle || s.song_id}`;
  if (s.type === "transition") return `Transition (${s.transition.kind}, ${s.transition.duration_ms} ms)`;
  return s.type;
}

function renderSegments() {
  segListe.innerHTML = "";
  segVide.hidden = segments.length > 0;
  segments.forEach((s, i) => {
    const ligne = mf.el("div", { class: "actions", style: "justify-content:space-between" },
      mf.el("span", {}, `${i + 1}. ${resumeSegment(s)}`),
      mf.el("button", { class: "btn btn-ghost", type: "button" }, "Retirer"));
    ligne.querySelector("button").addEventListener("click", () => {
      segments.splice(i, 1);
      renderSegments();
    });
    segListe.append(ligne);
  });
}

// --- Les champs qui dépendent du type de segment choisi ---

async function chargerChamps(type) {
  segChamps.innerHTML = "";
  if (type === "mana_voice" || type === "announcement") {
    segChamps.append(
      mf.el("label", { for: "seg-texte" }, "Texte"),
      mf.el("textarea", { id: "seg-texte" })
    );
    return;
  }
  if (type === "transition") {
    segChamps.append(
      mf.el("label", { for: "seg-transition-kind" }, "Type"),
      mf.el("select", { id: "seg-transition-kind" },
        mf.el("option", { value: "fade" }, "Fondu"),
        mf.el("option", { value: "silence" }, "Silence")),
      mf.el("label", { for: "seg-transition-duree" }, "Durée (ms)"),
      mf.el("input", { type: "number", id: "seg-transition-duree", value: "800", min: "0" })
    );
    return;
  }
  if (type === "family_voice") {
    segChamps.append(mf.el("p", { class: "meta" }, "Chargement des souvenirs audio…"));
    try {
      const { memories } = await mf.api("/api/memories?kind=audio");
      segChamps.innerHTML = "";
      if (!memories.length) {
        segChamps.append(mf.el("p", { class: "meta" }, "Aucun souvenir audio pour l'instant — ajoutez-en un depuis Souvenirs."));
        return;
      }
      segChamps.append(
        mf.el("label", { for: "seg-memoire" }, "Souvenir audio"),
        mf.el("select", { id: "seg-memoire" },
          ...memories.map((m) => mf.el("option", { value: m.id }, m.title))),
        mf.el("p", { class: "meta", id: "seg-memoire-etat" }, "")
      );
    } catch (e) {
      segChamps.innerHTML = "";
      segChamps.append(mf.el("p", { class: "erreur" }, e.message));
    }
    return;
  }
  if (type === "song_ref") {
    segChamps.append(mf.el("p", { class: "meta" }, "Chargement des chansons…"));
    try {
      const { songs } = await mf.api("/api/manavibe/songs");
      segChamps.innerHTML = "";
      if (!songs.length) {
        segChamps.append(mf.el("p", { class: "meta" }, "Aucune chanson pour l'instant — répondez à la question de la semaine sur MANAvibe pour en créer une."));
        return;
      }
      const selectChanson = mf.el("select", { id: "seg-chanson" },
        ...songs.map((s) => mf.el("option", { value: s.id }, s.title + (s.primary_artist ? " — " + s.primary_artist : ""))));
      segChamps.append(
        mf.el("label", { for: "seg-chanson" }, "Chanson"),
        selectChanson,
        mf.el("label", { for: "seg-enregistrement" }, "Enregistrement (optionnel)"),
        mf.el("select", { id: "seg-enregistrement" }, mf.el("option", { value: "" }, "— aucun —"))
      );
      const majEnregistrements = async () => {
        const detail = await mf.api(`/api/manavibe/songs/${selectChanson.value}`);
        const sel = document.getElementById("seg-enregistrement");
        sel.innerHTML = "";
        sel.append(mf.el("option", { value: "" }, "— aucun —"));
        for (const r of detail.recordings) {
          sel.append(mf.el("option", { value: r.id }, `${r.artist}${r.album ? " · " + r.album : ""}`));
        }
      };
      selectChanson.addEventListener("change", majEnregistrements);
      majEnregistrements();
    } catch (e) {
      segChamps.innerHTML = "";
      segChamps.append(mf.el("p", { class: "erreur" }, e.message));
    }
  }
}

segType.addEventListener("change", () => chargerChamps(segType.value));
chargerChamps(segType.value);

btnAjouter.addEventListener("click", async () => {
  const type = segType.value;
  err.hidden = true;
  try {
    if (type === "mana_voice" || type === "announcement") {
      const texte = document.getElementById("seg-texte").value.trim();
      if (!texte) throw new Error("Écrivez le texte du segment avant de l'ajouter.");
      segments.push({ type, text: texte, by: null });
    } else if (type === "transition") {
      segments.push({
        type,
        transition: {
          kind: document.getElementById("seg-transition-kind").value,
          duration_ms: Number(document.getElementById("seg-transition-duree").value) || 800,
        },
      });
    } else if (type === "family_voice") {
      const memoireSelect = document.getElementById("seg-memoire");
      if (!memoireSelect) throw new Error("Aucun souvenir audio disponible.");
      const detail = await mf.api(`/api/memories/${memoireSelect.value}`);
      if (!detail.media.length) throw new Error("Ce souvenir ne porte aucun message audio.");
      segments.push({ type, asset_id: detail.media[0].id, by: null, libelle: detail.title });
    } else if (type === "song_ref") {
      const chansonSelect = document.getElementById("seg-chanson");
      if (!chansonSelect) throw new Error("Aucune chanson disponible.");
      const enregistrementSelect = document.getElementById("seg-enregistrement");
      segments.push({
        type,
        song_id: chansonSelect.value,
        chosen_recording_id: enregistrementSelect.value || null,
        by: null,
        libelle: chansonSelect.options[chansonSelect.selectedIndex].textContent,
      });
    }
    renderSegments();
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  if (!segments.length) {
    err.textContent = "Ajoutez au moins un segment avant de créer l'émission.";
    err.hidden = false;
    return;
  }
  const btn = form.querySelector("button[type=submit]");
  mf.spinner(btn, true);
  try {
    // libelle n'existe que côté client, pour l'affichage — jamais envoyé.
    const aEnvoyer = segments.map(({ libelle, ...s }) => s);
    await mf.api("/api/manavibe/programs", {
      method: "POST",
      body: { title: document.getElementById("titre").value, segments: aEnvoyer },
    });
    location.href = "/manavibe";
  } catch (e2) {
    err.textContent = e2.message;
    err.hidden = false;
    mf.spinner(btn, false);
  }
});

renderSegments();
