// Création d'album : sélection de souvenirs existants.
const { api, el, fmtDate } = window.mf;

const form = document.getElementById("form-album");
const choix = document.getElementById("choix-souvenirs");

(async () => {
  try {
    const { memories } = await api("/api/memories");
    if (!memories.length) {
      choix.append(el("p", { class: "meta" }, "Créez d'abord des souvenirs — un album les organise."));
      return;
    }
    for (const m of memories) {
      const label = el("label", { style: "display:flex;gap:.5rem;align-items:center;font-weight:400" },
        el("input", { type: "checkbox", value: m.id }),
        `${m.title} (${fmtDate(m.happened_on)})`);
      choix.append(label);
    }
  } catch (e) {
    choix.append(el("p", { class: "erreur" }, e.message));
  }
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");
  err.hidden = true;
  const selected = [...choix.querySelectorAll("input:checked")].map((i) => i.value);
  try {
    const { id } = await api("/api/albums", {
      method: "POST",
      body: {
        title: document.getElementById("titre").value,
        description: document.getElementById("desc").value,
        memory_ids: selected,
      },
    });
    location.href = `/albums/${id}`;
  } catch (e2) {
    err.textContent = e2.message;
    err.hidden = false;
  }
});
