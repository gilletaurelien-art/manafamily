// Balades en famille — points d'arrêt et découvertes.
// PROTOTYPE : les tracés sont INDICATIFS. Avant toute publication
// réelle, les tracés officiels (IGN / data.gouv / FFRandonnée)
// doivent être sourcés — règle : données territoriales réelles
// uniquement. Les aires de jeux et pauses gourmandes ne seront
// affichées qu'avec des données réelles vérifiées.

export interface WalkPoint {
  lat: number;
  lon: number;
  ele: number;
}

export interface Waypoint {
  nom: string;
  point: WalkPoint;
  note: string;
}

export interface Walk {
  slug: string;
  titre: string;
  lieu: string;
  resume: string;
  distanceKm: number;
  dureeH: number;
  difficulte: "facile" | "moyen" | "sportif";
  boucle: boolean;
  poussettePmr: boolean;
  aireDeJeux: string | null;
  chiens: "oui" | "laisse" | "non";
  points: WalkPoint[];
  waypoints: Waypoint[];
}

const traceRaz: WalkPoint[] = [
  { lat: 48.0377, lon: -4.7401, ele: 42 },
  { lat: 48.0364, lon: -4.7462, ele: 55 },
  { lat: 48.0351, lon: -4.7523, ele: 71 },
  { lat: 48.0342, lon: -4.7591, ele: 84 },
  { lat: 48.0335, lon: -4.7662, ele: 96 },
  { lat: 48.0326, lon: -4.7731, ele: 72 },
  { lat: 48.0312, lon: -4.7792, ele: 38 },
];

const traceFrehel: WalkPoint[] = [
  { lat: 48.6749, lon: -2.3226, ele: 30 },
  { lat: 48.6772, lon: -2.3298, ele: 46 },
  { lat: 48.6789, lon: -2.3379, ele: 62 },
  { lat: 48.6796, lon: -2.3468, ele: 74 },
  { lat: 48.6791, lon: -2.3557, ele: 68 },
  { lat: 48.6774, lon: -2.3641, ele: 54 },
  { lat: 48.6751, lon: -2.3718, ele: 41 },
  { lat: 48.6726, lon: -2.3786, ele: 33 },
  { lat: 48.6702, lon: -2.3849, ele: 27 },
  { lat: 48.6681, lon: -2.3916, ele: 36 },
  { lat: 48.6669, lon: -2.3992, ele: 49 },
  { lat: 48.6666, lon: -2.4073, ele: 58 },
  { lat: 48.6672, lon: -2.4154, ele: 44 },
  { lat: 48.6688, lon: -2.4229, ele: 32 },
  { lat: 48.6711, lon: -2.4297, ele: 26 },
  { lat: 48.6749, lon: -2.3226, ele: 30 },
];

const traceCrozon: WalkPoint[] = [
  { lat: 48.2762, lon: -4.5976, ele: 8 },
  { lat: 48.2738, lon: -4.6024, ele: 12 },
  { lat: 48.2703, lon: -4.6058, ele: 18 },
  { lat: 48.2665, lon: -4.6107, ele: 24 },
  { lat: 48.2632, lon: -4.6169, ele: 31 },
  { lat: 48.2604, lon: -4.6242, ele: 28 },
  { lat: 48.2585, lon: -4.6318, ele: 22 },
  { lat: 48.2572, lon: -4.6401, ele: 15 },
  { lat: 48.2566, lon: -4.6485, ele: 11 },
  { lat: 48.2569, lon: -4.6572, ele: 9 },
  { lat: 48.2578, lon: -4.6654, ele: 14 },
  { lat: 48.2593, lon: -4.6731, ele: 21 },
  { lat: 48.2614, lon: -4.6798, ele: 30 },
  { lat: 48.2641, lon: -4.6848, ele: 41 },
  { lat: 48.2672, lon: -4.6884, ele: 55 },
  { lat: 48.2706, lon: -4.6903, ele: 72 },
  { lat: 48.2741, lon: -4.6901, ele: 86 },
  { lat: 48.2775, lon: -4.6875, ele: 94 },
  { lat: 48.2806, lon: -4.6823, ele: 78 },
  { lat: 48.2829, lon: -4.6752, ele: 52 },
  { lat: 48.2841, lon: -4.6668, ele: 34 },
  { lat: 48.2843, lon: -4.6579, ele: 19 },
  { lat: 48.2836, lon: -4.6491, ele: 12 },
  { lat: 48.2822, lon: -4.6408, ele: 15 },
  { lat: 48.2803, lon: -4.6334, ele: 22 },
  { lat: 48.2788, lon: -4.6259, ele: 17 },
  { lat: 48.2779, lon: -4.6182, ele: 11 },
  { lat: 48.2775, lon: -4.6088, ele: 9 },
  { lat: 48.2771, lon: -4.6012, ele: 8 },
  { lat: 48.2762, lon: -4.5976, ele: 8 },
];

export const WALKS: Walk[] = [
  {
    slug: "pointe-du-raz",
    titre: "Pointe du Raz — aller-retour",
    lieu: "Plogoff, Finistère",
    resume:
      "Le bout du monde, à rythme d'enfant : du parking à la barre, un aller-retour large et praticable poussette/PMR, avec la lande d'ajoncs et le phare en point de mire.",
    distanceKm: 5.2,
    dureeH: 1.75,
    difficulte: "facile",
    boucle: false,
    poussettePmr: true,
    aireDeJeux: null,
    chiens: "laisse",
    points: traceRaz,
    waypoints: [
      {
        nom: "Départ",
        point: traceRaz[0],
        note: "Départ du parking : chemin stabilisé, poussettes et fauteuils bienvenus. La lande d'ajoncs borde le sentier.",
      },
      {
        nom: "Pointe",
        point: traceRaz[traceRaz.length - 1],
        note: "La pointe : le raz murmure en contrebas. Restez sur le sentier et tenez les enfants par la main côté falaise.",
      },
    ],
  },
  {
    slug: "cap-frehel",
    titre: "Cap Fréhel — boucle des falaises",
    lieu: "Plévenon, Côtes-d'Armor",
    resume:
      "Une boucle courte sur la lande de bruyère, entre phare et falaises de grès rose. Large sentier familial, aire de jeux au parking de départ.",
    distanceKm: 7.8,
    dureeH: 2,
    difficulte: "facile",
    boucle: true,
    poussettePmr: false,
    aireDeJeux: "Aire de jeux au parking du cap (donnée à vérifier avant publication)",
    chiens: "laisse",
    points: traceFrehel,
    waypoints: [
      {
        nom: "Départ — parking du cap",
        point: traceFrehel[0],
        note: "Départ près du phare : l'aire de jeux du parking est parfaite pour l'échauffement (à vérifier sur place).",
      },
      {
        nom: "Falaises",
        point: traceFrehel[3],
        note: "Les falaises de grès rose : guettez les oiseaux marins. Gardez les enfants sur le sentier, les vagues soufflent fort.",
      },
      {
        nom: "Retour par la lande",
        point: traceFrehel[12],
        note: "Descente douce dans la bruyère : la boucle se referme vers le phare.",
      },
    ],
  },
  {
    slug: "gr34-crozon",
    titre: "GR34 — Camaret, boucle du port",
    lieu: "Camaret-sur-Mer, Finistère",
    resume:
      "Version famille du sentier des douaniers : port, grève et va-et-vient sur le littoral sud. Itinéraire indicatif, à découper selon l'âge des enfants.",
    distanceKm: 12.4,
    dureeH: 2,
    difficulte: "moyen",
    boucle: true,
    poussettePmr: false,
    aireDeJeux: null,
    chiens: "laisse",
    points: traceCrozon,
    waypoints: [
      {
        nom: "Port de Camaret",
        point: traceCrozon[0],
        note: "Départ du port : les bateaux, la dune, la baie — de quoi occuper le regard dès les premiers pas.",
      },
      {
        nom: "Grève du sud",
        point: traceCrozon[6],
        note: "La grève : idéal pour les galets et les grenouilles de mer. Attention aux marées — vérifiez les horaires.",
      },
      {
        nom: "Crêtes du nord",
        point: traceCrozon[16],
        note: "Les crêtes : parcours plus exigeant, à réserver aux grands marcheurs. Demi-tour possible à tout moment.",
      },
      {
        nom: "Retour vers Camaret",
        point: traceCrozon[26],
        note: "Descente douce vers le port : la boucle se referme — bravo à toute la famille.",
      },
    ],
  },
];

// Géo-outils maison (zéro dépendance).

export function bbox(points: WalkPoint[]) {
  let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
  for (const p of points) {
    latMin = Math.min(latMin, p.lat);
    latMax = Math.max(latMax, p.lat);
    lonMin = Math.min(lonMin, p.lon);
    lonMax = Math.max(lonMax, p.lon);
  }
  return { latMin, latMax, lonMin, lonMax };
}

// Distance entre deux points GPS (mètres) — formule de l'haversine.
export function distM(a: WalkPoint, b: WalkPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Distance d'un point au tracé (mètres) : min sur les segments.
export function distAuTrace(p: WalkPoint, trace: WalkPoint[]): number {
  let best = Infinity;
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i - 1];
    const b = trace[i];
    const ab = distM(a, b) || 1;
    const ap = distM(a, p);
    const bp = distM(b, p);
    // approximation : projection scalaire sur le segment
    const t = Math.max(0, Math.min(1, (ap * ap - bp * bp + ab * ab) / (2 * ab * ab)));
    const proj = {
      lat: a.lat + (b.lat - a.lat) * t,
      lon: a.lon + (b.lon - a.lon) * t,
      ele: 0,
    };
    best = Math.min(best, distM(p, proj));
  }
  return best;
}
