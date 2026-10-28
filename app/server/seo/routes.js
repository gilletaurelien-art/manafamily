// ⭐ TABLE UNIQUE — titre, description, canonique et présence dans le plan de
// site dérivent tous d'ici. Ne pas recopier ces informations ailleurs : une
// liste recopiée vieillit à chaque page ajoutée ou déplacée (leçon du
// 28/10/2026, après la bascule de manafamily.org — robots.txt/sitemap.xml/
// llms.txt de l'ancien Carnet décrivaient encore un produit disparu).
//
// `sitemap: false` ne veut PAS dire « bloqué à l'exploration » — ces pages
// restent indexables et ne sont pas dans robots.txt disallow. Elles sont
// seulement absentes du PLAN DE SITE parce que ce sont des étapes d'un
// parcours (inscription→créer une famille, invitation→rejoindre), pas des
// destinations qu'on cherche à faire remonter dans un moteur de recherche.
// Même logique que la correction du 28/10 sur manatimebank : une URL de
// transition n'a rien à faire dans un plan de site.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUTH_PAGE_PREFIXES } from "../index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

export const SITE_URL = "https://manafamily.org";

// Valeur par défaut d'og:image — une seule déclaration, chaque route peut la
// surcharger (`ogImage` sur l'entrée) le jour où une page veut sa propre
// image plutôt que celle-ci. Absente jusqu'au 28/10/2026 : un lien partagé
// affichait un titre juste et aucun aperçu visuel — exactement la moitié
// invisible du bug (la page reste parfaite, seul l'aperçu de lien est vide).
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

// ⚠️ Un préfixe privé ne redirige réellement vers /connexion QUE s'il a une
// page de liste à sa racine (public/<préfixe>.html) — sinon le chemin brut
// rend 404, pas une redirection. L'affirmer quand même dans robots.txt ou
// llms.txt est faux : relevé par la session KS-5 le 28/10/2026 (/albums et
// /recits annoncés comme protégés, 404 réel — même nature de piège que
// l'ancien llms.txt qui décrivait un produit disparu, mais côté détail
// plutôt que côté identité). On filtre sur le disque, jamais sur une copie
// de la liste : ajouter la page suffit à faire réapparaître le préfixe.
export const REDIRECTING_PREFIXES = AUTH_PAGE_PREFIXES.filter((p) =>
  fs.existsSync(path.join(PUBLIC_DIR, `${p.slice(1)}.html`))
);

export const ROUTES = [
  {
    path: "/",
    title: "MANAfamily — La maison familiale",
    description: "Maison numérique familiale privée : souvenirs, famille, agenda et transmission.",
    ogType: "website",
    sitemap: true,
    priority: "1.0",
  },
  {
    path: "/inscription",
    title: "MANAfamily — Inscription",
    description: "Créer votre compte MANAfamily pour rejoindre ou fonder la maison numérique de votre famille.",
    ogType: "website",
    sitemap: true,
    priority: "0.8",
  },
  {
    path: "/connexion",
    title: "MANAfamily — Connexion",
    description: "Se connecter à MANAfamily, la maison numérique privée de votre famille.",
    ogType: "website",
    sitemap: true,
    priority: "0.8",
  },
  {
    path: "/mentions-legales",
    title: "MANAfamily — Mentions légales",
    description: "Mentions légales de MANAfamily : éditeur, hébergement et traitement des données.",
    ogType: "website",
    sitemap: true,
    priority: "0.3",
  },
  {
    path: "/creer-famille",
    title: "MANAfamily — Créer une famille",
    description: "Fonder l'espace privé de votre famille sur MANAfamily, après inscription.",
    ogType: "website",
    sitemap: false, // étape du parcours post-inscription, pas une destination
  },
  {
    path: "/rejoindre",
    title: "MANAfamily — Rejoindre une famille",
    description: "Rejoindre la famille qui vous a invité sur MANAfamily, via un lien d'invitation.",
    ogType: "website",
    sitemap: false, // n'a de sens qu'avec un token d'invitation valable 14 jours
  },
  {
    path: "/404",
    htmlFile: "404", // servi directement par server/index.js, jamais en URL publique
    title: "MANAfamily — Introuvable",
    description: "Cette page n'existe pas sur MANAfamily.",
    ogType: "website",
    sitemap: false,
  },
];

export function publicRoutes() {
  return ROUTES.filter((r) => r.path !== "/404");
}

export function sitemapRoutes() {
  return ROUTES.filter((r) => r.sitemap);
}

/** Garde : aucune route sans titre, aucun titre partagé par deux routes. */
export function validateRoutes(routes = ROUTES) {
  const problems = [];
  const titres = new Map();
  for (const r of routes) {
    if (!r.title || !r.title.trim()) problems.push(`${r.path} : titre manquant`);
    if (!r.description || !r.description.trim()) problems.push(`${r.path} : description manquante`);
    if (titres.has(r.title)) problems.push(`${r.path} et ${titres.get(r.title)} partagent le même titre « ${r.title} »`);
    else titres.set(r.title, r.path);
  }
  return problems;
}
