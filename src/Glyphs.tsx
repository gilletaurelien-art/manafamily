// Glyphes SVG inline — zéro dépendance, zéro requête réseau.
// Style « synapse » : trait 1.4, géométrie régulière sur grille 24,
// arrondis généreux, accent or (pastille) en point focal.
// Icônes MANAfamily : souvenirs, famille, agenda, création,
// intimité — chaque icône vit intégralement dans le viewBox.

type GlyphProps = { size?: number };

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Accent({ cx, cy, r = 1.6 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
}

// Souvenirs : un instantané photo (cadre, paysage, soleil).
export function GlyphSouvenirs({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M3.5 15.5l4.2-3.8c.8-.7 2-.7 2.8 0l5 4.6" />
      <path d="M13.5 12.2l2.2-2c.8-.7 2-.7 2.8 0l2 1.8" />
      <Accent cx={8.2} cy={8.8} r={1.4} />
    </svg>
  );
}

// Famille : une maison contenant trois silhouettes (parents + enfant).
export function GlyphFamille({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4 10.5L12 4l8 6.5" />
      <path d="M6 9v11h12V9" />
      <circle cx="9.5" cy="13.5" r="1.3" />
      <path d="M8 17.8c.3-1.5 1.5-2.3 3-2.3s2.7.8 3 2.3" transform="translate(-1.5 0)" />
      <circle cx="16" cy="14" r="1.1" />
      <path d="M15 17.5c.2-1.1 1-1.7 2-1.7" />
    </svg>
  );
}

// Agenda : calendrier à deux anneaux, un jour coché en or.
export function GlyphAgenda({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16" />
      <path d="M8.5 3.5v4M15.5 3.5v4" />
      <circle cx="12" cy="15" r={2.4} />
      <Accent cx={12} cy={15} r={1.2} />
    </svg>
  );
}

// Créer : un livre ouvert, la transmission.
export function GlyphCreer({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M12 6.5C10.5 5 8.3 4.4 4.8 4.6A1.3 1.3 0 0 0 3.5 5.9v10.9c0 .8.6 1.4 1.4 1.3 3-.2 4.9.4 6.3 1.6" />
      <path d="M12 6.5C13.5 5 15.7 4.4 19.2 4.6a1.3 1.3 0 0 1 1.3 1.3v10.9c0 .8-.6 1.4-1.4 1.3-3-.2-4.9.4-6.3 1.6" />
      <path d="M12 6.5v13.2" />
      <Accent cx={8.6} cy={9.6} r={1.2} />
    </svg>
  );
}

// Intimité : un cadenas — privé par défaut.
export function GlyphPrive({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
      <Accent cx={12} cy={15.2} r={1.4} />
    </svg>
  );
}

// Recherche : la loupe, inchangée dans l'esprit (grille propre).
export function GlyphRecherche({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
      <Accent cx={10.5} cy={10.5} r={1.1} />
    </svg>
  );
}

// Porte (accueil) : conservée pour la maison.
export function GlyphPorte({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M5 20h14" />
      <path d="M7 20V5.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 17 5.5V20" />
      <path d="M12 12.4v2.8" />
      <Accent cx={12} cy={9.6} r={1.3} />
    </svg>
  );
}
