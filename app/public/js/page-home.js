// Accueil : fil familial, publication rapide, ajout rapide.
const { api, el, escapeHtml, fmtDate, showState, spinner, coverHtml, kindLabel } = window.mf;

async function init() {
  const feed = document.getElementById("feed");
  const actions = document.getElementById("hero-actions");

  let me;
  try {
    me = await api("/api/me");
  } catch (e) {
    if (e.status === 401) {
      actions.append(
        el("a", { class: "btn", href: "/connexion" }, "Se connecter"),
        el("a", { class: "btn btn-ghost", href: "/inscription" }, "Créer un compte")
      );
      feed.innerHTML = "";
      feed.append(el("section", { class: "bulle" },
        el("h2", {}, "Votre maison familiale privée"),
        el("p", {}, "Créez un compte, invitez votre famille, et commencez à garder vos souvenirs ensemble. Aucune donnée revendue, aucun fil algorithmique, aucun réseau public."),
        el("p", {}, el("a", { class: "btn", href: "/inscription" }, "Commencer"))));
      return;
    }
    showState(feed, { error: e.message });
    return;
  }

  actions.append(
    el("a", { class: "btn", href: "/souvenirs?ajouter=1" }, "Ajouter un souvenir"),
    el("a", { class: "btn btn-ghost", href: "/creer" }, "Créer un livre")
  );

  showState(feed, { loading: true });
  let data;
  try {
    data = await api("/api/home");
  } catch (e) {
    if (e.status === 403) {
      location.href = "/creer-famille";
      return;
    }
    showState(feed, { error: e.message });
    return;
  }

  feed.innerHTML = "";

  if (data.isEmpty) {
    feed.append(el("section", { class: "bulle" },
      el("h2", {}, "Bienvenue dans votre maison"),
      el("p", {}, "Votre espace est prêt, il n'attend que vos premières histoires. Commencez doucement : un souvenir, une photo, une personne."),
      el("div", { class: "actions" },
        el("a", { class: "btn", href: "/souvenirs?ajouter=1" }, "Ajouter un souvenir"),
        el("a", { class: "btn btn-ghost", href: "/famille?ajouter=1" }, "Ajouter une personne"))));
  }

  // Publications + formulaire
  const pubPanel = el("section", { class: "panel" });
  pubPanel.append(el("h3", { style: "margin:.2rem 0" }, "Quoi de neuf ?"));
  const pubForm = el("form", {},
    el("textarea", { id: "pub-body", placeholder: "Une nouvelle à partager à la famille…", required: true }),
    el("div", { class: "actions", style: "margin-top:.5rem" },
      el("button", { class: "btn", type: "submit" }, "Publier")));
  const pubList = el("div", {});
  pubPanel.append(pubForm, pubList);
  feed.append(pubPanel);

  pubForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = pubForm.querySelector("button");
    spinner(btn, true);
    try {
      await api("/api/posts", { method: "POST", body: { body: pubForm.querySelector("textarea").value } });
      pubForm.querySelector("textarea").value = "";
      await loadPosts();
    } catch (err) {
      alert(err.message);
    } finally {
      spinner(btn, false);
    }
  });

  async function loadPosts() {
    const d = await api("/api/home");
    renderPosts(d.posts);
  }
  function renderPosts(posts) {
    pubList.innerHTML = "";
    if (!posts.length) {
      pubList.append(el("p", { class: "meta" }, "Aucune publication pour l'instant."));
      return;
    }
    for (const p of posts.slice(0, 5)) {
      pubList.append(el("p", { class: "panel", style: "margin:.4rem 0" },
        el("strong", {}, p.author + " — "),
        escapeHtml(p.body),
        el("span", { class: "meta" }, ` (${fmtDate(p.created_at)})`)));
    }
  }
  renderPosts(data.posts);

  // Derniers souvenirs
  const recent = el("section", { class: "bulle" });
  recent.append(el("h3", {}, "Derniers souvenirs"));
  if (!data.recentMemories.length) {
    recent.append(el("p", { class: "meta" }, "Pas encore de souvenir — le premier est souvent le plus difficile à choisir."));
  } else {
    const grid = el("div", { class: "grille" });
    for (const m of data.recentMemories.slice(0, 3)) {
      grid.append(el("a", { class: "carte", href: `/souvenirs/${m.id}` },
        coverHtml(m),
        el("div", { class: "corps" },
          el("span", { class: "badge badge-or" }, kindLabel(m.kind)),
          el("h3", {}, m.title),
          el("span", { class: "meta" }, fmtDate(m.happened_on)))));
    }
    recent.append(grid);
  }
  feed.append(recent);

  // Anniversaires
  if (data.birthdays.length) {
    const anniv = el("section", { class: "panel" });
    anniv.append(el("h3", {}, "Prochains anniversaires"));
    for (const b of data.birthdays) {
      anniv.append(el("p", { style: "margin:.3rem 0" },
        el("strong", {}, b.name), ` — ${fmtDate(b.date)} (${b.age} ans)`));
    }
    feed.append(anniv);
  }

  // Événements à venir
  if (data.upcomingEvents && data.upcomingEvents.length) {
    const ev = el("section", { class: "panel" });
    ev.append(el("h3", {}, "À venir"));
    for (const e of data.upcomingEvents) {
      ev.append(el("p", { style: "margin:.3rem 0" },
        el("strong", {}, e.title), ` — ${fmtDate(e.starts_at)}${e.place ? " · " + e.place : ""}`));
    }
    feed.append(ev);
  }

  // À redécouvrir
  if (data.olderMemory) {
    const old = el("section", { class: "bulle" });
    old.append(el("h3", {}, "À redécouvrir"));
    old.append(el("a", { href: `/souvenirs/${data.olderMemory.id}` },
      `${data.olderMemory.title} — ${fmtDate(data.olderMemory.happened_on)}`));
    feed.append(old);
  }
}

init();
