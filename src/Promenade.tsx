import { useEffect, useState } from "react";
import { baseUrl } from "./router";
import { WALKS, distAuTrace, distM } from "./walks";
import type { WalkPoint } from "./walks";
import { WalkMap } from "./WalkMap";
import { AltitudeProfile } from "./Altitude";

// Page promenade : GPS navigateur (position + boussole), alerte
// hors-sentier à 50 m, export GPX, SOS.
// Tout client-side — zéro backend, zéro réseau en course.

const HORS_SENTIER_M = 50;

function enGpx(walk: (typeof WALKS)[number]): string {
  const pts = walk.points
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele></trkpt>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="mana.bzh">
  <trk><name>${walk.titre}</name><trkseg>
${pts}
  </trkseg></trk>
</gpx>`;
}

function telecharger(nom: string, contenu: string, type: string) {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

export function Promenade({ slug }: { slug: string }) {
  const walk = WALKS.find((w) => w.slug === slug) ?? WALKS[0];
  const B = baseUrl();

  const [moi, setMoi] = useState<WalkPoint | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  const [horsSentier, setHorsSentier] = useState(false);
  const [gpsErreur, setGpsErreur] = useState("");
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine);

  useEffect(() => {
    document.title = `${walk.titre} — Promenades MANA.bzh`;
    return () => {
      document.title = "MANA.bzh — La porte d'entrée de l'écosystème MANA en Bretagne";
    };
  }, [walk.titre]);

  useEffect(() => {
    const on = () => setHorsLigne(false);
    const off = () => setHorsLigne(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // GPS : watchPosition — continu, précision haute.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsErreur("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p: WalkPoint = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          ele: pos.coords.altitude ?? 0,
        };
        setMoi(p);
        setCap(pos.coords.heading ?? null);

        const d = distAuTrace(p, walk.points);
        setHorsSentier(d > HORS_SENTIER_M);
        if (d > HORS_SENTIER_M && navigator.vibrate) navigator.vibrate(200);

      },
      (err) => setGpsErreur(err.message || "GPS indisponible."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [walk]);

  // Boussole : deviceorientation (mobiles avec capteur magnétique).
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const h = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof h === "number") setCap(h);
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  const sosHref = moi
    ? `sms:112?&body=${encodeURIComponent(
        `Urgence — ma position GPS : ${moi.lat.toFixed(5)}, ${moi.lon.toFixed(5)} — parcours ${walk.titre} (mana.bzh).`
      )}`
    : "sms:112";

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Promenade — prototype client-side</p>
        <h1 className="page-titre">{walk.titre}</h1>

        <section className="page-panel">
          <p className="page-intro">{walk.resume}</p>
          <p className="page-note">
            {walk.distanceKm} km · {walk.dureeH} h · {walk.difficulte} ·{" "}
            {walk.boucle ? "boucle" : "aller-retour"} ·{" "}
            {walk.poussettePmr ? "accessible poussette/PMR" : "non accessible PMR"} ·
            chiens {walk.chiens}. Tracé indicatif (prototype) : avant
            publication, le tracé officiel (IGN) sera sourcé.
          </p>
          <div className="est-actions" style={{ marginTop: "var(--sp-2)" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => telecharger(`${walk.slug}.gpx`, enGpx(walk), "application/gpx+xml")}
            >
              Exporter en GPX
            </button>
            <a className="btn btn-primary" href={sosHref}>
              SOS — partager ma position
            </a>
          </div>
        </section>

        {horsLigne && (
          <section className="page-panel">
            <p className="apercu-label">Hors ligne</p>
            <p className="page-texte">
              Vous êtes hors ligne. La carte et le parcours restent
              disponibles : ils sont mis en cache par le service worker.
            </p>
          </section>
        )}

        {horsSentier && (
          <section className="page-panel hors-sentier" role="alert">
            <p className="apercu-label">Alerte hors-sentier</p>
            <p className="page-texte">
              Vous êtes à plus de {HORS_SENTIER_M} m du tracé. Revenez
              vers le sentier — sentiers fragiles, falaises proches.
            </p>
          </section>
        )}

        {gpsErreur && (
          <section className="page-panel">
            <p className="apercu-label">GPS</p>
            <p className="page-texte">{gpsErreur}</p>
          </section>
        )}

        <section className="page-panel">
          <p className="apercu-label">Carte</p>
          <WalkMap walk={walk} moi={moi} capDeg={cap} />
          <p className="page-note">
            {moi
              ? `Position GPS : ${moi.lat.toFixed(5)}, ${moi.lon.toFixed(5)}` + (cap !== null ? ` · cap ${Math.round(cap)}°` : "")
              : "En attente du signal GPS…"}
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Profil d'altitude</p>
          <AltitudeProfile points={walk.points} />
        </section>

        <section className="page-panel">
          <p className="apercu-label">Points d'intérêt</p>
          {walk.waypoints.map((w) => (
            <p key={w.nom} className="page-texte">
              <strong>{w.nom}</strong> — {w.audio}
            </p>
          ))}
        </section>

        <section className="page-panel">
          <p className="apercu-label">Marées, météo, praticabilité</p>
          <p className="page-texte">
            Les horaires de marée, la météo marine et l'état du sentier
            exigent des sources temps réel fiables (SHOM, Météo-France).
            Ces modules sont en sommeil : aucune donnée simulée ne sera
            affichée. Avant de partir, consultez les canaux officiels.
          </p>
        </section>

        <div className="est-actions">
          <a className="btn btn-ghost" href={`${B}/promenades`}>
            Toutes les promenades
          </a>
          <a className="btn btn-primary" href={`${B}/`}>
            Retour à l'accueil
          </a>
        </div>
      </div>
    </main>
  );
}
