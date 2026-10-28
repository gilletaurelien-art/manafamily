// Rédaction de récit avec sources référencées + liste des récits.
const { api, el, fmtDate } = window.mf;

const form = document.getElementById("form-recit");
const choixSources = document.getElementById("choix-sources");
const recits = document.getElementById("recits");

async function loadSources() {
  choixSources.innerHTML = "";
  try {
    const [{ memories }, { people }] = await Promise.all([api("/api/memories"), api("/api/people")]);
    choixSources.append(el("p", { class: "meta" }, "Souvenirs :"));
    for (const m of memories.slice(0, 100)) {
      choixSources.append(el("label", { style: "display:flex;gap:.5rem;font-weight:400" },
        el("input", { type: "checkbox", "data-type": "memory", value: m.id }),
        m.title));
    }
    choixSources.append(el("p", { class: "meta" }, "Personnes :"));
    for (const p of people) {
      choixSources.append(el("label", { style: "display:flex;gap:.5rem;font-weight:400" },
        el("input", { type: "checkbox", "data-type": "person", value: p.id }),
        `${p.first_name} ${p.last_name || ""}`.trim()));
    }
  } catch (e) {
    choixSources.append(el("p", { class: "erreur" }, e.message));
  }
}

async function loadRecits() {
  recits.innerHTML = "";
  try {
    const { stories } = await api("/api/stories");
    if (!stories.length) {
      recits.append(el("p", { class: "meta" }, "Aucun récit pour l'instant."));
      return;
    }
    for (const s of stories) {
      recits.append(el("p", { style: "margin:.3rem 0" },
        el("a", { href: `/recits/${s.id}` }, s.title),
        el("span", { class: "meta" }, ` — ${s.period_start || "?"} → ${s.period_end || "?"}`)));
    }
  } catch (e) {
    recits.append(el("p", { class: "erreur" }, e.message));
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");
  err.hidden = true;
  const sources = [...choixSources.querySelectorAll("input:checked")]
    .map((i) => ({ type: i.dataset.type, id: i.value }));
  try {
    const { id } = await api("/api/stories", {
      method: "POST",
      body: {
        title: document.getElementById("titre").value,
        body: document.getElementById("corps").value,
        period_start: document.getElementById("debut").value || null,
        period_end: document.getElementById("fin").value || null,
        sources,
      },
    });
    location.href = `/recits/${id}`;
  } catch (e2) {
    err.textContent = e2.message;
    err.hidden = false;
  }
});

loadSources();
loadRecits();
