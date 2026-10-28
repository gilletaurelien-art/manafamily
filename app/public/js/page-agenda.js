// Agenda : liste groupée par jour + anniversaires calculés.
const { api, el, fmtDate } = window.mf;

const agenda = document.getElementById("agenda");
const anniv = document.getElementById("anniversaires");

async function init() {
  if (new URLSearchParams(location.search).get("ajouter")) openEventForm();
  await Promise.all([loadEvents(), loadBirthdays()]);
}

async function loadEvents() {
  agenda.innerHTML = "";
  agenda.append(el("p", { class: "chargement" }, "Chargement…"));
  try {
    const { events } = await api("/api/events");
    agenda.innerHTML = "";
    if (!events.length) {
      agenda.append(el("p", { class: "meta" }, "Aucun événement. « Ajouter un événement » pour créer le premier."));
      return;
    }
    let lastDay = "";
    for (const ev of events) {
      const day = ev.starts_at.slice(0, 10);
      if (day !== lastDay) {
        agenda.append(el("h2", { class: "gen-titre" }, fmtDate(day)));
        lastDay = day;
      }
      const item = el("div", { class: "jour" },
        el("strong", {}, ev.title),
        el("span", { class: "meta" }, ` — ${ev.starts_at.slice(11, 16)}${ev.place ? " · " + ev.place : ""}${ev.participants ? " · " + ev.participants : ""}`)),
        rel = el("div", { class: "actions", style: "gap:.3rem" },
          el("button", { class: "btn btn-ghost", style: "padding:.2rem .8rem;font-size:.8rem", onclick: () => openEventForm(ev) }, "Modifier"),
          el("button", { class: "btn btn-danger", style: "padding:.2rem .8rem;font-size:.8rem", onclick: async () => {
            if (!confirm("Supprimer cet événement ?")) return;
            await api(`/api/events/${ev.id}`, { method: "DELETE" });
            loadEvents();
          } }, "Supprimer"));
      item.append(rel);
      agenda.append(item);
    }
  } catch (e) {
    agenda.innerHTML = "";
    agenda.append(el("p", { class: "erreur" }, e.message));
  }
}

async function loadBirthdays() {
  anniv.innerHTML = "";
  try {
    const { birthdays } = await api("/api/events");
    if (!birthdays.length) return;
    const panel = el("section", { class: "panel" });
    panel.append(el("h3", {}, "Anniversaires à venir"));
    for (const b of birthdays) {
      panel.append(el("p", { style: "margin:.2rem 0" },
        el("strong", {}, b.name), ` — ${fmtDate(b.date)} (${b.age} ans)`));
    }
    anniv.append(panel);
  } catch { /* silencieux */ }
}

function openEventForm(event = null) {
  const dlg = el("dialog", {});
  const form = el("form", {},
    el("h2", { style: "margin-top:0" }, event ? "Modifier l'événement" : "Nouvel événement"),
    el("label", {}, "Titre"), el("input", { type: "text", id: "title", required: true, value: event?.title || "" }),
    el("label", {}, "Début"), el("input", { type: "datetime-local", id: "starts", required: true, value: event?.starts_at?.slice(0, 16) || "" }),
    el("label", {}, "Fin (optionnel)"), el("input", { type: "datetime-local", id: "ends", value: event?.ends_at?.slice(0, 16) || "" }),
    el("label", {}, "Lieu (optionnel)"), el("input", { type: "text", id: "place", value: event?.place || "" }),
    el("label", {}, "Description (optionnel)"), el("textarea", { id: "desc" }, event?.description || ""),
    el("div", { class: "actions", style: "margin-top:1rem" },
      el("button", { class: "btn", type: "submit" }, "Enregistrer"),
      el("button", { class: "btn btn-ghost", type: "button", onclick: () => dlg.close() }, "Annuler")));
  dlg.append(form);
  document.body.append(dlg);
  dlg.showModal();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      title: form.title.value,
      starts_at: form.starts.value,
      ends_at: form.ends.value || null,
      place: form.place.value,
      description: form.desc.value,
    };
    if (event) await api(`/api/events/${event.id}`, { method: "PUT", body });
    else await api("/api/events", { method: "POST", body });
    dlg.close();
    loadEvents();
  });
}

document.addEventListener("click", (e) => {
  if (e.target.matches('a[href="/agenda?ajouter=1"]')) {
    e.preventDefault();
    openEventForm();
  }
});

init();
