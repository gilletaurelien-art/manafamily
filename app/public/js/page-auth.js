// Connexion / inscription / création de famille.
const { api, el } = window.mf;

function showErr(msg) {
  const err = document.getElementById("err");
  if (!err) { alert(msg); return; }
  err.textContent = msg;
  err.hidden = false;
}

const fConnexion = document.getElementById("form-connexion");
if (fConnexion) {
  fConnexion.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = fConnexion.querySelector("button");
    btn.disabled = true; btn.textContent = "…";
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: {
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
        },
      });
      location.href = "/";
    } catch (err) {
      showErr(err.message);
      btn.disabled = false; btn.textContent = "Se connecter";
    }
  });
}

const fInscription = document.getElementById("form-inscription");
if (fInscription) {
  fInscription.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = fInscription.querySelector("button");
    btn.disabled = true; btn.textContent = "…";
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: {
          display_name: document.getElementById("display_name").value,
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
        },
      });
      location.href = "/creer-famille";
    } catch (err) {
      showErr(err.message);
      btn.disabled = false; btn.textContent = "Créer mon compte";
    }
  });
}

const fFamille = document.getElementById("form-famille");
if (fFamille) {
  fFamille.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = fFamille.querySelector("button");
    btn.disabled = true; btn.textContent = "…";
    try {
      await api("/api/families", {
        method: "POST",
        body: { name: document.getElementById("name").value },
      });
      location.href = "/";
    } catch (err) {
      showErr(err.message);
      btn.disabled = false; btn.textContent = "Créer la famille";
    }
  });
}
