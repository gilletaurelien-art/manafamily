// Paramètres : famille, membres, invitations, préférences, données.
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const famille = document.getElementById("famille-settings");
const membres = document.getElementById("membres");
const invitations = document.getElementById("invitations");
const donnees = document.getElementById("donnees");

async function init() {
  let ctx;
  try {
    ctx = await mf.api("/api/family");
  } catch (e) {
    famille.append(mf.el("p", { class: "erreur" }, e.message));
    return;
  }
  const isAdmin = ctx.role === "admin";

  famille.append(
    mf.el("h2", { style: "margin-top:0" }, "Espace familial"),
    mf.el("p", {}, `Famille : ${ctx.family.name} — votre rôle : ${ctx.role === "admin" ? "administrateur" : "membre"}.`));

  // Membres
  membres.append(mf.el("h2", { style: "margin-top:0" }, "Membres"));
  for (const m of ctx.members) {
    const row = mf.el("p", { style: "margin:.3rem 0", class: "actions" },
      mf.el("span", {}, `${m.display_name} (${m.email}) — ${m.role}${m.status !== "active" ? " — parti" : ""}`));
    if (isAdmin && m.status === "active") {
      row.append(
        mf.el("button", { class: "btn btn-ghost", style: "padding:.2rem .8rem;font-size:.8rem", onclick: async () => {
          const role = m.role === "admin" ? "member" : "admin";
          await mf.api("/api/family/members/role", { method: "POST", body: { membership_id: m.id, role } });
          location.reload();
        } }, m.role === "admin" ? "Rétrograder" : "Promouvoir admin"),
        mf.el("button", { class: "btn btn-danger", style: "padding:.2rem .8rem;font-size:.8rem", onclick: async () => {
          if (!confirm(`Retirer ${m.display_name} de la famille ?`)) return;
          await mf.api(`/api/family/members?id=${m.id}`, { method: "DELETE" });
          location.reload();
        } }, "Retirer"));
    }
    membres.append(row);
  }
  membres.append(mf.el("button", { class: "btn btn-ghost", onclick: async () => {
    if (!confirm("Quitter cette famille ?")) return;
    await mf.api("/api/family/leave", { method: "POST" });
    location.href = "/";
  } }, "Quitter la famille"));

  // Invitations (admin)
  if (isAdmin) {
    invitations.append(mf.el("h2", { style: "margin-top:0" }, "Invitations"));
    const invForm = mf.el("form", { class: "actions" },
      mf.el("input", { type: "email", id: "inv-email", placeholder: "prenom@exemple.fr", required: true, style: "max-width:240px" }),
      mf.el("select", { id: "inv-role", "aria-label": "Rôle" },
        mf.el("option", { value: "member" }, "Membre"),
        mf.el("option", { value: "admin" }, "Administrateur")),
      mf.el("button", { class: "btn", type: "submit" }, "Inviter"));
    invitations.append(invForm, mf.el("div", { id: "inv-list" }));
    invForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const inv = await mf.api("/api/family/invitations", {
          method: "POST",
          body: { email: document.getElementById("inv-email").value, role: document.getElementById("inv-role").value },
        });
        const url = location.origin + inv.url;
        invForm.reset();
        await loadInvs();
        const last = document.querySelector("#inv-list .invitation-link:last-of-type");
        if (last) last.textContent = url;
        navigator.clipboard?.writeText(url).catch(() => {});
        alert(`Invitation créée — lien copié :\n${url}\n\nEnvoyez-le à votre famille (valable 14 jours).`);
      } catch (err) {
        alert(err.message);
      }
    });
    async function loadInvs() {
      const list = document.getElementById("inv-list");
      list.innerHTML = "";
      const { invitations: invs } = await mf.api("/api/family/invitations");
      for (const i of invs) {
        const status = i.accepted_at ? "acceptée" : i.revoked_at ? "révoquée" : new Date(i.expires_at) < new Date() ? "expirée" : "en attente";
        list.append(mf.el("p", { class: "invitation-link", style: "margin:.3rem 0" },
          `${i.email} (${i.role}) — ${status}`,
          !i.accepted_at && !i.revoked_at ? mf.el("button", { class: "btn btn-ghost", style: "padding:.2rem .8rem;font-size:.8rem;margin-left:.5rem", onclick: async () => {
            await mf.api("/api/family/invitations/revoke", { method: "POST", body: { token: i.token } });
            loadInvs();
          } }, "Révoquer") : null));
      }
    }
    loadInvs();
  } else {
    invitations.remove();
  }

  // Préférences de notification
  const prefs = await mf.api("/api/family/notifications");
  const prefsPanel = mf.el("section", { class: "panel" });
  prefsPanel.append(mf.el("h3", {}, "Préférences"));
  const rem = mf.el("label", { style: "display:flex;gap:.5rem;font-weight:400" },
    mf.el("input", { type: "checkbox", id: "pref-rem", checked: prefs.event_reminders ? true : null }),
    "Rappels des événements");
  const anniv = mf.el("label", { style: "display:flex;gap:.5rem;font-weight:400" },
    mf.el("input", { type: "checkbox", id: "pref-anniv", checked: prefs.birthdays ? true : null }),
    "Anniversaires");
  prefsPanel.append(rem, anniv,
    mf.el("button", { class: "btn btn-ghost", style: "margin-top:.5rem", onclick: async () => {
      await mf.api("/api/family/notifications", {
        method: "PUT",
        body: { event_reminders: document.getElementById("pref-rem").checked, birthdays: document.getElementById("pref-anniv").checked },
      });
      alert("Préférences enregistrées.");
    } }, "Enregistrer"));
  membres.after(prefsPanel);

  // Données personnelles
  donnees.append(mf.el("h2", { style: "margin-top:0" }, "Vos données"));
  donnees.append(
    mf.el("p", {}, "Vos données vous appartiennent : exportez-les ou supprimez votre compte à tout moment."),
    mf.el("div", { class: "actions" },
      mf.el("a", { class: "btn btn-ghost", href: "/api/account/export" }, "Exporter mes données"),
      mf.el("button", { class: "btn btn-danger", onclick: () => mf.confirmDelete(
        "Supprimer définitivement votre compte ? Vos publications et commentaires seront supprimés. Les contenus familiaux restent à la famille.",
        async () => {
          await mf.api("/api/account", { method: "DELETE" });
          location.href = "/";
        }) }, "Supprimer mon compte")));
}

init();
