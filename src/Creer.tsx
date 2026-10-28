import { useEffect } from "react";
import { baseUrl } from "./router";
import { GlyphCreer } from "./Glyphs";

// Créer — la transmission : albums, chronologies, récits et le livre
// de famille exportable en PDF. Chaque récit garde ses sources.

const ETAPES = [
  {
    titre: "Sélectionner",
    texte:
      "Choisir les souvenirs, les personnes, la période : le livre se compose à partir de contenus réels de la famille.",
  },
  {
    titre: "Composer",
    texte:
      "Organiser les pages, prévisualiser, ajuster le contenu : la mise en page reste modifiable jusqu'à l'export.",
  },
  {
    titre: "Exporter",
    texte:
      "Le livre de famille part en PDF — à imprimer, à offrir, à transmettre. Sans dépendre d'un service en ligne.",
  },
  {
    titre: "Conserver les sources",
    texte:
      "Chaque récit généré reste modifiable et référence ses sources : on sait toujours d'où vient chaque page.",
  },
];

export function Creer() {
  useEffect(() => {
    document.title = "Créer — MANA.family";
    return () => {
      document.title = "MANA.family — La maison numérique familiale";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">La transmission</p>
        <h1 className="page-titre">Créer</h1>

        <section className="page-panel">
          <p className="page-intro">
            Transformer les contenus familiaux en albums thématiques,
            chronologies illustrées, biographies et récits — jusqu'au
            livre de famille exportable en PDF. La génération vidéo et
            les fonctions créatives avancées viendront plus tard :
            rien n'est simulé avant d'exister.
          </p>
        </section>

        <section className="landing-section bulle" style={{ marginBottom: "var(--sp-4)" }}>
          <GlyphCreer size={36} />
          <h2 className="section-title">Le livre de famille</h2>
          <div className="sous-bulle">
            <p className="section-accroche">Des contenus deviennent des récits.</p>
            <p className="section-texte">
              Sélection, prévisualisation, modification, export : le
              livre se compose depuis les souvenirs réels — les photos,
              les textes et les personnes de la famille.
            </p>
            <div className="est-actions">
              <a className="btn btn-clair" href={`${B}/souvenirs`}>
                Revoir les souvenirs
              </a>
            </div>
          </div>
        </section>

        {ETAPES.map((e) => (
          <section key={e.titre} className="page-panel">
            <p className="apercu-label">{e.titre}</p>
            <p className="page-texte">{e.texte}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
