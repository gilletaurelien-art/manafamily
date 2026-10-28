// Profil d'altitude : SVG maison, zéro dépendance.
// Remplissage glaz translucide, ligne glaz 1.5, pastille ajonc
// sur le point de départ — lisible, sobre.

import { bbox } from "./walks";
import type { WalkPoint } from "./walks";

export function AltitudeProfile({
  points,
  width = 640,
  height = 140,
}: {
  points: WalkPoint[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const { latMin, latMax, lonMin, lonMax } = bbox(points);
  const W = width;
  const H = height;
  const pad = 8;
  const eleMin = Math.min(...points.map((p) => p.ele));
  const eleMax = Math.max(...points.map((p) => p.ele));
  const eleRange = Math.max(1, eleMax - eleMin);

  const x = (i: number) =>
    pad + (i / (points.length - 1)) * (W - 2 * pad);
  const y = (e: number) =>
    H - pad - ((e - eleMin) / eleRange) * (H - 2 * pad);

  const pathD =
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.ele).toFixed(1)}`).join(" ") +
    ` L${x(points.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;

  const dPlus = (() => {
    let d = 0;
    for (let i = 1; i < points.length; i++) {
      const diff = points[i].ele - points[i - 1].ele;
      if (diff > 0) d += diff;
    }
    return Math.round(d);
  })();

  return (
    <figure className="altitude-profile" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Profil d'altitude du parcours">
        <path d={pathD} fill="rgb(43 91 108 / 12%)" stroke="none" />
        <path
          d={pathD.replace(/ L[\d.]+,[\d.]+ L[\d.]+,[\d.]+ Z$/, "")}
          fill="none"
          stroke="var(--glaz)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={x(0)} cy={y(points[0].ele)} r={2.6} fill="var(--ajonc)" />
      </svg>
      <figcaption>
        Altitude {eleMin}–{eleMax} m · D+ {dPlus} m · tracé indicatif prototype
      </figcaption>
    </figure>
  );
}
