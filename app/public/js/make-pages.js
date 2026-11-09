// Génération des pages principales à partir du squelette commun.
// Exécuté une fois par le build local : les fichiers produits sont
// statiques (aucun templating runtime).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(__dirname, "..");
// ⚠️ connexion.html porte SON PROPRE bloc canonical/OG (injecté par
// build-seo.mjs, car /connexion est dans la table de routes) — s'en servir
// tel quel comme gabarit le recopierait dans toutes les autres pages
// (canonical vers /connexion, og:title « Connexion »…). Latent tant que
// personne ne relance ce script après le premier `build-seo.mjs` : relevé
// le 05/11/2026 en générant une page neuve. On le retire avant de l'utiliser
// — ce gabarit ne doit porter AUCUNE métadonnée propre à une page précise.
const base = fs
  .readFileSync(path.join(PUB, "connexion.html"), "utf8")
  .replace(/<!-- seo:auto:start -->[\s\S]*?<!-- seo:auto:end -->\n?/, "");

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
      <a class="carte" href="/creer-emission"><div class="corps"><h3>Émission MANAvibe</h3><p class="meta">Composer une émission : voix, chansons, souvenirs.</p></div></a>
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
    file: "creer-emission.html",
    title: "MANAfamily — Composer une émission",
    main: `
    <h1>Composer une émission</h1>
    <p>Une émission MANAvibe : voix de MANA, messages vocaux, chansons, transitions, annonces — dans l'ordre que vous choisissez.</p>
    <section class="bulle"><form id="form-emission">
      <label for="titre">Titre de l'émission</label>
      <input type="text" id="titre" required placeholder="Les chansons de notre histoire">

      <h3>Segments</h3>
      <div id="segments-liste"></div>
      <p class="meta" id="segments-vide">Aucun segment pour l'instant — ajoutez-en un ci-dessous.</p>

      <div class="bulle" style="margin-top:1rem">
        <label for="seg-type">Ajouter un segment</label>
        <select id="seg-type">
          <option value="mana_voice">Voix de MANA (texte)</option>
          <option value="family_voice">Message vocal de la famille</option>
          <option value="song_ref">Une chanson</option>
          <option value="transition">Transition</option>
          <option value="announcement">Annonce</option>
        </select>
        <div id="seg-champs"></div>
        <div class="actions" style="margin-top:.6rem">
          <button class="btn btn-ghost" type="button" id="btn-ajouter-segment">Ajouter ce segment</button>
        </div>
      </div>

      <div class="actions" style="margin-top:1.5rem">
        <button class="btn" type="submit">Créer l'émission</button>
      </div>
      <p class="erreur" id="err" hidden role="alert"></p>
    </form></section>`,
    scripts: ["/js/page-creer-emission.js"],
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
    <section class="vide"><span class="glyphe" aria-hidden="true"><svg viewBox="0 0 10 10" shape-rendering="crispEdges" role="img" aria-label="Rien ici"><rect x="0" y="0" width="10" height="10" fill="currentColor"/><rect x="1" y="1" width="8" height="8" fill="#fff"/><rect x="2" y="2" width="1" height="1" fill="currentColor"/><rect x="2" y="7" width="6" height="1" fill="currentColor"/><rect x="3" y="6" width="4" height="1" fill="currentColor"/><rect x="4" y="5" width="2" height="1" fill="currentColor"/></svg></span><h1>Page introuvable</h1><p><a class="btn" href="/">Retour à l'accueil</a></p></section>`,
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
