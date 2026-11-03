// Détail album : souvenirs ordonnés.
const { api, el, fmtDate, coverHtml, kindLabel, confirmDelete } = window.mf;

const detail = document.getElementById("detail");
const albumId = location.pathname.split("/")[2];

async function init() {
  detail.innerHTML = "";
  detail.append(el("p", { class: "chargement" }, "Chargement…"));
  let album;
  try {
    album = await api(`/api/albums/${albumId}`);
  } catch (e) {
    detail.innerHTML = "";
    detail.append(el("p", { class: "erreur" }, e.message));
    return;
  }
  detail.innerHTML = "";
  detail.append(el("section", { class: "bulle" },
    el("h1", { style: "margin-top:0" }, album.title),
    album.description ? el("p", {}, album.description) : null,
    el("p", { class: "meta" }, `${album.items.length} souvenir(s)`),
    el("div", { class: "actions" },
      el("button", { class: "btn btn-danger", onclick: () => confirmDelete("Supprimer cet album ? Les souvenirs restent intacts.", async () => {
        await api(`/api/albums/${albumId}`, { method: "DELETE" });
        location.href = "/creer";
      }) }, "Supprimer l'album"))));

  if (!album.items.length) {
    detail.append(el("p", { class: "meta" }, "Album vide."));
    return;
  }
  const grid = el("div", { class: "grille" });
  for (const m of album.items) {
    grid.append(el("a", { class: "carte", href: `/souvenirs/${m.id}` },
      coverHtml(m),
      el("div", { class: "corps" },
        el("span", { class: "badge badge-or" }, kindLabel(m.kind)),
        el("h3", {}, m.title),
        el("span", { class: "meta" }, fmtDate(m.happened_on)))));
  }
  detail.append(grid);
}

init();
