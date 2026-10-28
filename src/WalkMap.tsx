// Carte du parcours : SVG maison, zéro dépendance, zéro tuile.
// Tracé glaz pointillé, pastille ajonc au départ, point GPS bleu
// quand actif. Les tuiles (fond de carte) seront servies offline
// par le service worker quand une source libre sera choisie.

import { bbox } from "./walks";
import type { Walk, WalkPoint } from "./walks";

export function WalkMap({
  walk,
  moi,
  capDeg,
  width = 640,
  height = 400,
}: {
  walk: Walk;
  moi?: WalkPoint | null;
  capDeg?: number | null;
  width?: number;
  height?: number;
}) {
  const { latMin, latMax, lonMin, lonMax } = bbox(walk.points);
  const pad = 16;
  const latSpan = Math.max(1e-6, latMax - latMin);
  const lonSpan = Math.max(1e-6, lonMax - lonMin);
  const px = (lon: number) => pad + ((lon - lonMin) / lonSpan) * (width - 2 * pad);
  const py = (lat: number) => height - pad - ((lat - latMin) / latSpan) * (height - 2 * pad);

  const d = walk.points
    .map((p, i) => `${i === 0 ? "M" : "L"}${px(p.lon).toFixed(1)},${py(p.lat).toFixed(1)}`)
    .join(" ");

  const moiX = moi ? px(moi.lon) : null;
  const moiY = moi ? py(moi.lat) : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Carte du parcours"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <rect x={0} y={0} width={width} height={height} rx={18} fill="var(--sable)" stroke="var(--ecume)" />
      <path
        d={d}
        fill="none"
        stroke="var(--glaz)"
        strokeWidth={2}
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
      {walk.waypoints.map((w) => (
        <g key={w.nom}>
          <circle
            cx={px(w.point.lon)}
            cy={py(w.point.lat)}
            r={4}
            fill="var(--blanc)"
            stroke="var(--glaz)"
            strokeWidth={1.5}
          />
        </g>
      ))}
      <circle cx={px(walk.points[0].lon)} cy={py(walk.points[0].lat)} r={5} fill="var(--ajonc)" />
      {moi && moiX !== null && moiY !== null && (
        <g>
          <circle cx={moiX} cy={moiY} r={14} fill="rgb(43 91 108 / 18%)" />
          <circle cx={moiX} cy={moiY} r={6} fill="#2f6fdd" stroke="var(--blanc)" strokeWidth={2} />
          {capDeg != null && (
            <path
              d={`M${moiX},${moiY} l${(14 * Math.sin((capDeg * Math.PI) / 180)).toFixed(1)},${(-14 * Math.cos((capDeg * Math.PI) / 180)).toFixed(1)}`}
              stroke="#2f6fdd"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
        </g>
      )}
    </svg>
  );
}
