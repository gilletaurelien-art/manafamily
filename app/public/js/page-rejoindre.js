// Rejoindre une famille via invitation (token).
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const token = new URLSearchParams(location.search).get("token") || "";
const info = document.getElementById("info-invitation");
const form = document.getElementById("form-accept");

async function init() {
  if (!token) {
    info.innerHTML = "";
    info.append(mf.el("p", { class: "erreur", role: "alert" }, "Aucune invitation fournie. Demandez un lien aux administrateurs de votre famille."));
    return;
  }
  try {
    const inv = await mf.api("/api/invitation?token=" + encodeURIComponent(token));
    info.innerHTML = "";
    if (inv.accepted) {
      info.append(mf.el("p", { class: "erreur" }, "Cette invitation a déjà été utilisée."));
      return;
    }
    if (inv.revoked || inv.expired) {
      info.append(mf.el("p", { class: "erreur" }, "Cette invitation n'est plus valable (révoquée ou expirée)."));
      return;
    }
    info.append(mf.el("p", {}, `Vous êtes invité à rejoindre la famille « ${inv.familyName} ».`));
    form.hidden = false;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button");
      btn.disabled = true; btn.textContent = "…";
      try {
        await mf.api("/api/invitation/accept", { method: "POST", body: { token } });
        location.href = "/";
      } catch (err) {
        if (err.status === 401) {
          sessionStorage.setItem("mf_invitation", token);
          location.href = "/inscription";
          return;
        }
        const errEl = document.getElementById("err");
        errEl.textContent = err.message;
        errEl.hidden = false;
        btn.disabled = false; btn.textContent = "Rejoindre la famille";
      }
    });
  } catch (e) {
    info.innerHTML = "";
    info.append(mf.el("p", { class: "erreur", role: "alert" }, e.message));
  }
}

init();
