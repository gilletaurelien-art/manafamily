// Accueil : fil familial, publication rapide, ajout rapide.
const mf = window.mf; // pas de déstructuration top-level : évite toute collision de bindings globaux

async function init() {
  const feed = document.getElementById("feed");
  const actions = document.getElementById("hero-actions");

  let me;
  try {
    me = await mf.api("/api/me");
  } catch (e) {
    if (e.status === 401) {
      actions.append(
        mf.el("a", { class: "btn", href: "/connexion" }, "Se connecter"),
        mf.el("a", { class: "btn btn-ghost", href: "/inscription" }, "Créer un compte")
      );
      feed.innerHTML = "";
      feed.append(mf.el("section", { class: "bulle" },
        mf.el("h2", {}, "Votre maison familiale privée"),
        mf.el("p", {}, "Créez un compte, invitez votre famille, et commencez à garder vos souvenirs ensemble. Aucune donnée revendue, aucun fil algorithmique, aucun réseau public."),
        mf.el("p", {}, mf.el("a", { class: "btn", href: "/inscription" }, "Commencer"))));
      return;
    }
    mf.showState(feed, { error: e.message });
    return;
  }

  actions.append(
    mf.el("a", { class: "btn", href: "/souvenirs?ajouter=1" }, "Ajouter un souvenir"),
    mf.el("a", { class: "btn btn-ghost", href: "/creer" }, "Créer un livre")
  );

  mf.showState(feed, { loading: true });
  let data;
  try {
    data = await mf.api("/api/home");
  } catch (e) {
    if (e.status === 403) {
      location.href = "/creer-famille";
      return;
    }
    mf.showState(feed, { error: e.message });
    return;
  }

  feed.innerHTML = "";

  if (data.isEmpty) {
    feed.append(mf.el("section", { class: "bulle" },
      mf.el("h2", {}, "Bienvenue dans votre maison"),
      mf.el("p", {}, "Votre espace est prêt, il n'attend que vos premières histoires. Commencez doucement : un souvenir, une photo, une personne."),
      mf.el("div", { class: "actions" },
        mf.el("a", { class: "btn", href: "/souvenirs?ajouter=1" }, "Ajouter un souvenir"),
        mf.el("a", { class: "btn btn-ghost", href: "/famille?ajouter=1" }, "Ajouter une personne"))));
  }

  // Publications + formulaire
  const pubPanel = mf.el("section", { class: "panel" });
  pubPanel.append(mf.el("h3", { style: "margin:.2rem 0" }, "Quoi de neuf ?"));
  const pubForm = mf.el("form", {},
    mf.el("textarea", { id: "pub-body", placeholder: "Une nouvelle à partager à la famille…", required: true }),
    mf.el("div", { class: "actions", style: "margin-top:.5rem" },
      mf.el("button", { class: "btn", type: "submit" }, "Publier")));
  const pubList = mf.el("div", {});
  pubPanel.append(pubForm, pubList);
  feed.append(pubPanel);

  pubForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = pubForm.querySelector("button");
    mf.spinner(btn, true);
    try {
      await mf.api("/api/posts", { method: "POST", body: { body: pubForm.querySelector("textarea").value } });
      pubForm.querySelector("textarea").value = "";
      await loadPosts();
    } catch (err) {
      alert(err.message);
    } finally {
      mf.spinner(btn, false);
    }
  });

  async function loadPosts() {
    const d = await mf.api("/api/home");
    renderPosts(d.posts);
  }
  function renderPosts(posts) {
    pubList.innerHTML = "";
    if (!posts.length) {
      pubList.append(mf.el("p", { class: "meta" }, "Aucune publication pour l'instant."));
      return;
    }
    for (const p of posts.slice(0, 5)) {
      pubList.append(mf.el("p", { class: "panel", style: "margin:.4rem 0" },
        mf.el("strong", {}, p.author + " — "),
        mf.escapeHtml(p.body),
        mf.el("span", { class: "meta" }, ` (${mf.fmtDate(p.created_at)})`)));
    }
  }
  renderPosts(data.posts);

  // Derniers souvenirs
  const recent = mf.el("section", { class: "bulle" });
  recent.append(mf.el("h3", {}, "Derniers souvenirs"));
  if (!data.recentMemories.length) {
    recent.append(mf.el("p", { class: "meta" }, "Pas encore de souvenir — le premier est souvent le plus difficile à choisir."));
  } else {
    const grid = mf.el("div", { class: "grille" });
    for (const m of data.recentMemories.slice(0, 3)) {
      grid.append(mf.el("a", { class: "carte", href: `/souvenirs/${m.id}` },
        mf.coverHtml(m),
        mf.el("div", { class: "corps" },
          mf.el("span", { class: "badge badge-or" }, mf.kindLabel(m.kind)),
          mf.el("h3", {}, m.title),
          mf.el("span", { class: "meta" }, mf.fmtDate(m.happened_on)))));
    }
    recent.append(grid);
  }
  feed.append(recent);

  // Anniversaires
  if (data.birthdays.length) {
    const anniv = mf.el("section", { class: "panel" });
    anniv.append(mf.el("h3", {}, "Prochains anniversaires"));
    for (const b of data.birthdays) {
      anniv.append(mf.el("p", { style: "margin:.3rem 0" },
        mf.el("strong", {}, b.name), ` — ${mf.fmtDate(b.date)} (${b.age} ans)`));
    }
    feed.append(anniv);
  }

  // Événements à venir
  if (data.upcomingEvents && data.upcomingEvents.length) {
    const ev = mf.el("section", { class: "panel" });
    ev.append(mf.el("h3", {}, "À venir"));
    for (const e of data.upcomingEvents) {
      ev.append(mf.el("p", { style: "margin:.3rem 0" },
        mf.el("strong", {}, e.title), ` — ${mf.fmtDate(e.starts_at)}${e.place ? " · " + e.place : ""}`));
    }
    feed.append(ev);
  }

  // À redécouvrir
  if (data.olderMemory) {
    const old = mf.el("section", { class: "bulle" });
    old.append(mf.el("h3", {}, "À redécouvrir"));
    old.append(mf.el("a", { href: `/souvenirs/${data.olderMemory.id}` },
      `${data.olderMemory.title} — ${mf.fmtDate(data.olderMemory.happened_on)}`));
    feed.append(old);
  }
}

init();
