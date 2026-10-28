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
export const SITE_URL = "https://manafamily.org";

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
