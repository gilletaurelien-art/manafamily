// Génération des pages principales à partir du squelette commun.
// Exécuté une fois par le build local : les fichiers produits sont
// statiques (aucun templating runtime).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(__dirname, "..");
const base = fs.readFileSync(path.join(PUB, "connexion.html"), "utf8");

function make({ route, title, mainHtml, scripts, bodyClass = "" }) {
  let html = base.replace("<title>MANAfamily — Connexion</title>", `<title>${title}</title>`);
  html = html.replace('<main class="wrap">/*BODY*/</main>', `<main class="wrap">${mainHtml}</main>`);
  return html;
}

const pages = [
  {
    file: "souvenirs.html",
    title: "MANAfamily — Souvenirs",
    main: `
    <div class="actions" style="justify-content:space-between;margin-bottom:1rem">
      <h1 style="margin:0">Souvenirs</h1>
      <a class="btn" href="/souvenirs?ajouter=1" id="btn-ajouter">Ajouter</a>
    </div>
    <section class="panel">
      <form id="filtres" class="actions">
        <input type="search" id="q" placeholder="Rechercher…" style="max-width:220px">
        <select id="kind"><option value="">Tous les types</option><option value="photo">Photos</option><option value="video">Vidéos</option><option value="text">Textes</option><option value="audio">Audio</option><option value="letter">Lettres</option><option value="recipe">Recettes</option></select>
        <select id="annee"><option value="">Toutes les années</option></select>
        <button class="btn btn-ghost" type="submit">Filtrer</button>
      </form>
    </section>
    <div id="liste"></div>`,
    scripts: ["/js/page-souvenirs.js"],
  },
  {
    file: "souvenirs-detail.html",
    title: "MANAfamily — Souvenir",
    main: `<div id="detail"></div>`,
    scripts: ["/js/page-souvenir-detail.js"],
  },
  {
    file: "famille.html",
    title: "MANAfamily — Famille",
    main: `
    <div class="actions" style="justify-content:space-between;margin-bottom:1rem">
      <h1 style="margin:0">Famille</h1>
      <a class="btn" href="/famille?ajouter=1">Ajouter une personne</a>
    </div>
    <div id="arbre"></div>
    <div id="liste-people"></div>`,
    scripts: ["/js/page-famille.js"],
  },
  {
    file: "personne.html",
    title: "MANAfamily — Personne",
    main: `<div id="detail"></div>`,
    scripts: ["/js/page-personne.js"],
  },
  {
    file: "agenda.html",
    title: "MANAfamily — Agenda",
    main: `
    <div class="actions" style="justify-content:space-between;margin-bottom:1rem">
      <h1 style="margin:0">Agenda</h1>
      <a class="btn" href="/agenda?ajouter=1">Ajouter un événement</a>
    </div>
    <div id="anniversaires"></div>
    <div id="agenda"></div>`,
    scripts: ["/js/page-agenda.js"],
  },
  {
    file: "creer.html",
    title: "MANAfamily — Créer",
    main: `
    <h1>Créer</h1>
    <p>Transformer les contenus familiaux en récits, albums et livres.</p>
    <div class="grille">
      <a class="carte" href="/creer-album"><div class="corps"><h3>Album thématique</h3><p class="meta">Organiser des souvenirs en collection.</p></div></a>
      <a class="carte" href="/creer-recit"><div class="corps"><h3>Récit familial</h3><p class="meta">Écrire une histoire à partir des souvenirs.</p></div></a>
      <a class="carte" href="/creer-livre"><div class="corps"><h3>Livre de famille (PDF)</h3><p class="meta">Composer et exporter un livre en PDF.</p></div></a>
    </div>`,
    scripts: [],
  },
  {
    file: "creer-album.html",
    title: "MANAfamily — Créer un album",
    main: `
    <h1>Créer un album</h1>
    <section class="bulle"><form id="form-album">
      <label for="titre">Titre</label><input type="text" id="titre" required>
      <label for="desc">Description (optionnel)</label><textarea id="desc"></textarea>
      <h3>Souvenirs à inclure</h3>
      <div id="choix-souvenirs"></div>
      <div class="actions" style="margin-top:1rem"><button class="btn" type="submit">Créer l'album</button></div>
      <p class="erreur" id="err" hidden role="alert"></p>
    </form></section>`,
    scripts: ["/js/page-creer-album.js"],
  },
  {
    file: "creer-recit.html",
    title: "MANAfamily — Rédiger un récit",
    main: `
    <h1>Rédiger un récit</h1>
    <section class="bulle"><form id="form-recit">
      <label for="titre">Titre</label><input type="text" id="titre" required>
      <label for="periode">Période (optionnel)</label>
      <div class="actions"><input type="date" id="debut"> <span>→</span> <input type="date" id="fin"></div>
      <label for="corps">Le récit</label><textarea id="corps" style="min-height:16rem" required></textarea>
      <h3>Sources (souvenirs et personnes référencés)</h3>
      <div id="choix-sources"></div>
      <div class="actions" style="margin-top:1rem"><button class="btn" type="submit">Enregistrer le récit</button></div>
      <p class="erreur" id="err" hidden role="alert"></p>
    </form></section>
    <section class="panel"><h3>Vos récits</h3><div id="recits"></div></section>`,
    scripts: ["/js/page-creer-recit.js"],
  },
  {
    file: "creer-livre.html",
    title: "MANAfamily — Livre de famille",
    main: `
    <h1>Livre de famille</h1>
    <section class="bulle"><form id="form-livre">
      <label for="titre">Titre du livre</label><input type="text" id="titre" required value="Notre histoire">
      <label for="debut">Période</label>
      <div class="actions"><input type="date" id="debut"> <span>→</span> <input type="date" id="fin"></div>
      <h3>Personnes à inclure (facultatif)</h3>
      <div id="choix-personnes"></div>
      <div class="actions" style="margin-top:1rem">
        <button class="btn btn-ghost" type="button" id="btn-apercu">Prévisualiser</button>
        <button class="btn" type="submit">Exporter en PDF</button>
      </div>
      <p class="erreur" id="err" hidden role="alert"></p>
    </form>
    <div id="apercu" style="margin-top:1.5rem"></div></section>`,
    scripts: ["/js/page-creer-livre.js"],
  },
  {
    file: "album.html",
    title: "MANAfamily — Album",
    main: `<div id="detail"></div>`,
    scripts: ["/js/page-album.js"],
  },
  {
    file: "recit.html",
    title: "MANAfamily — Récit",
    main: `<div id="detail"></div>`,
    scripts: ["/js/page-recit.js"],
  },
  {
    file: "parametres.html",
    title: "MANAfamily — Paramètres",
    main: `
    <h1>Paramètres</h1>
    <section class="bulle" id="famille-settings"></section>
    <section class="bulle" id="membres"></section>
    <section class="bulle" id="invitations"></section>
    <section class="bulle" id="donnees"></section>`,
    scripts: ["/js/page-parametres.js"],
  },
  {
    file: "mentions-legales.html",
    title: "MANAfamily — Mentions légales",
    main: `
    <h1>Mentions légales</h1>
    <section class="panel"><h3>Éditeur</h3><p>MANAfamily est édité dans le cadre de l'écosystème MANA. Les coordonnées complètes seront publiées avec la structure juridique définitive.</p></section>
    <section class="panel"><h3>Hébergement</h3><p>Application auto-hébergée. Aucune donnée n'est transmise à des tiers ; aucune revente de données ou de leads ; aucun traceur publicitaire.</p></section>
    <section class="panel"><h3>Données personnelles</h3><p>Vous pouvez exporter vos données depuis Paramètres, ou supprimer votre compte (suppression définitive). Les contenus familiaux restent la propriété de la famille.</p></section>`,
    scripts: [],
  },
  {
    file: "404.html",
    title: "MANAfamily — Introuvable",
    main: `
    <section class="vide"><span class="glyphe">🌊</span><h1>Page introuvable</h1><p><a class="btn" href="/">Retour à l'accueil</a></p></section>`,
    scripts: [],
  },
];

for (const p of pages) {
  let html = base.replace("<title>MANAfamily — Connexion</title>", `<title>${p.title}</title>`);
  const mainMatch = html.match(/<main class="wrap">[\s\S]*?<\/main>/);
  html = html.replace(mainMatch[0], `<main class="wrap">${p.main}\n  </main>`);
  const scriptMatch = html.match(/<script src="\/app\.js"><\/script>\s*<script src="\/js\/page-auth\.js"><\/script>/);
  const scripts = '<script src="/app.js"></script>' + p.scripts.map((s) => `\n  <script src="${s}"></script>`).join("");
  html = html.replace(scriptMatch[0], scripts);
  fs.writeFileSync(path.join(PUB, p.file), html);
}
console.log("pages générées:", pages.map((p) => p.file).join(", "));
