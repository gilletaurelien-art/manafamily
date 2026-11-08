// Détail album : souvenirs ordonnés.
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

const detail = document.getElementById("detail");
const albumId = location.pathname.split("/")[2];

async function init() {
  detail.innerHTML = "";
  detail.append(mf.el("p", { class: "chargement" }, "Chargement…"));
  let album;
  try {
    album = await mf.api(`/api/albums/${albumId}`);
  } catch (e) {
    detail.innerHTML = "";
    detail.append(mf.el("p", { class: "erreur" }, e.message));
    return;
  }
  detail.innerHTML = "";
  detail.append(mf.el("section", { class: "bulle" },
    mf.el("h1", { style: "margin-top:0" }, album.title),
    album.description ? mf.el("p", {}, album.description) : null,
    mf.el("p", { class: "meta" }, `${album.items.length} souvenir(s)`),
    mf.el("div", { class: "actions" },
      mf.el("button", { class: "btn btn-danger", onclick: () => mf.confirmDelete("Supprimer cet album ? Les souvenirs restent intacts.", async () => {
        await mf.api(`/api/albums/${albumId}`, { method: "DELETE" });
        location.href = "/creer";
      }) }, "Supprimer l'album"))));

  if (!album.items.length) {
    detail.append(mf.el("p", { class: "meta" }, "Album vide."));
    return;
  }
  const grid = mf.el("div", { class: "grille" });
  for (const m of album.items) {
    grid.append(mf.el("a", { class: "carte", href: `/souvenirs/${m.id}` },
      mf.coverHtml(m),
      mf.el("div", { class: "corps" },
        mf.el("span", { class: "badge badge-or" }, mf.kindLabel(m.kind)),
        mf.el("h3", {}, m.title),
        mf.el("span", { class: "meta" }, mf.fmtDate(m.happened_on)))));
  }
  detail.append(grid);
}

init();
