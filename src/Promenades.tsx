import { useEffect, useState } from "react";
import { baseUrl } from "./router";
import { WALKS } from "./walks";

// Index des promenades — filtres concrets : durée, boucle,
// poussette/PMR, chiens. Prototype : deux parcours.

type FiltreBoucle = "tous" | "boucle" | "ar";
type FiltreAcc = "tous" | "pmr";
type FiltreChien = "tous" | "ok";

export function Promenades() {
  const B = baseUrl();
  const [dureeMax, setDureeMax] = useState(4);
  const [boucle, setBoucle] = useState<FiltreBoucle>("tous");
  const [acc, setAcc] = useState<FiltreAcc>("tous");
  const [chien, setChien] = useState<FiltreChien>("tous");
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ((new URLSearchParams(window.location.search).get("q") ?? "").toLowerCase());
  }, []);

  useEffect(() => {
    document.title = "Promenades — MANA.bzh";
    return () => {
      document.title = "MANA.bzh — La porte d'entrée de l'écosystème MANA en Bretagne";
    };
  }, []);

  const resultats = WALKS.filter(
    (w) =>
      w.dureeH <= dureeMax &&
      (boucle === "tous" || (boucle === "boucle" ? w.boucle : !w.boucle)) &&
      (acc === "tous" || w.poussettePmr) &&
      (chien === "tous" || w.chiens !== "non") &&
      (!q ||
        w.lieu.toLowerCase().includes(q) ||
        w.titre.toLowerCase().includes(q))
  );

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Balades & découvertes</p>
        <h1 className="page-titre">Promenades</h1>

        <section className="page-panel">
          <p className="page-intro">
            Des parcours en Bretagne, avec ce qui compte sur le
            terrain : durée, accès, relief, marées à vérifier. Chaque
            parcours fonctionne hors ligne (PWA) : téléchargez-le
            avant de partir, il restera dans votre poche même sans
            réseau — falaises et rias comprises.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Filtres</p>
          <div className="est-actions" style={{ marginBottom: "var(--sp-2)" }}>
            <label className="filtre">
              Durée ≤ {dureeMax} h
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={dureeMax}
                onChange={(e) => setDureeMax(Number(e.target.value))}
              />
            </label>
            <select
              value={boucle}
              onChange={(e) => setBoucle(e.target.value as FiltreBoucle)}
              className="filtre-select"
              aria-label="Type de parcours"
            >
              <option value="tous">Boucle ou aller-retour</option>
              <option value="boucle">Boucle</option>
              <option value="ar">Aller-retour</option>
            </select>
            <select
              value={acc}
              onChange={(e) => setAcc(e.target.value as FiltreAcc)}
              className="filtre-select"
              aria-label="Accessibilité"
            >
              <option value="tous">Toute accessibilité</option>
              <option value="pmr">Poussette / PMR</option>
            </select>
            <select
              value={chien}
              onChange={(e) => setChien(e.target.value as FiltreChien)}
              className="filtre-select"
              aria-label="Chiens"
            >
              <option value="tous">Avec ou sans chien</option>
              <option value="ok">Adapté aux chiens</option>
            </select>
          </div>
          <p className="page-note">
            {q && <strong>Recherche « {q} » — </strong>}
            {resultats.length} parcours — la pause crêperie arrive avec
            les données réelles (aucun établissement inventé).
          </p>
        </section>

        {resultats.map((w) => (
          <section key={w.slug} className="page-panel">
            <p className="apercu-label">{w.lieu}</p>
            <h2 className="section-title" style={{ marginBottom: "var(--sp-2)" }}>{w.titre}</h2>
            <p className="page-texte">{w.resume}</p>
            <p className="page-note">
              {w.distanceKm} km · {w.dureeH} h · {w.difficulte} ·{" "}
              {w.boucle ? "boucle" : "aller-retour"}
              {w.poussettePmr ? " · poussette/PMR ok" : ""}
            </p>
            <div className="est-actions" style={{ marginTop: "var(--sp-2)", marginBottom: 0 }}>
              <a className="btn btn-primary" href={`${B}/promenade/${w.slug}`}>
                Ouvrir le parcours
              </a>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
