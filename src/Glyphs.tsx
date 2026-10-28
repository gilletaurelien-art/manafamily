// Glyphes SVG inline — zéro dépendance, zéro requête réseau.
// Style « synapse » : trait 1.4, géométrie régulière sur grille 24,
// arrondis généreux, accent or (pastille) en point focal.

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

export function GlyphRecherche({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
      <Accent cx={10.5} cy={10.5} r={1.1} />
    </svg>
  );
}

export function GlyphRadio({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <circle cx={12} cy={12} r={2.2} />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4" />
      <path d="M5 5a9.9 9.9 0 0 0 0 14M19 19a9.9 9.9 0 0 0 0-14" />
      <Accent cx={12} cy={12} r={1} />
    </svg>
  );
}

export function GlyphNavigation({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <circle cx={17.6} cy={18.2} r={2.2} />
      <Accent cx={17.6} cy={18.2} r={1.1} />
    </svg>
  );
}

export function GlyphSecurite({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <path d="M16 16.5l3.5 1 3.5-1" />
      <path d="M16 20.5l3.5 1 3.5-1" />
    </svg>
  );
}

export function GlyphDecouverte({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <path d="M15.5 18.5l4-2 4 2v3l-4 2-4-2z" />
      <path d="M15.5 18.5l4 2 4-2M19.5 20.5v3" />
    </svg>
  );
}

export function GlyphSentier({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M5 19c2.5-.5 4-2 5.5-4.5C12 12 13 9.5 15.5 8c1.7-1 3.4-1.4 5-1" />
      <path d="M5 13.5c2-.4 3.2-1.6 4.4-3.6" strokeDasharray="2 3" />
      <Accent cx={19.5} cy={7.2} r={1.7} />
    </svg>
  );
}

export function GlyphTerritoire({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <Accent cx={17.6} cy={18.2} r={1.6} />
    </svg>
  );
}

