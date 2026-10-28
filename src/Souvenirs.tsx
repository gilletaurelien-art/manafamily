import { useEffect } from "react";
import { baseUrl } from "./router";
import { GlyphSouvenirs } from "./Glyphs";

// Souvenirs — vitrine descriptive de la mémoire familiale. Aucune
// donnée simulée : la vitrine présente l'espace, l'application porte
// les contenus réels des familles.

const TYPES = [
  {
    titre: "Photos & vidéos",
    texte:
      "Téléversement réel, galeries, lecteurs adaptés. Les fichiers restent privés et accessibles aux seules personnes autorisées.",
  },
  {
    titre: "Textes, anecdotes & récits",
    texte:
      "Les histoires de famille s'écrivent au fil de l'eau — un paragraphe suffit pour commencer, la suite se nourrit des témoignages.",
  },
  {
    titre: "Enregistrements audio",
    texte:
      "La voix des grands-parents, les rires des enfants : conservés tels quels, associés aux personnes et aux événements.",
  },
  {
    titre: "Lettres & documents",
    texte:
      "Les lettres scannées, les actes, les carnets — archivés avec leurs dates et leurs lieux.",
  },
  {
    titre: "Recettes & traditions",
    texte:
      "Le kouign-amann de tante Jeanne, la chanson du réveillon : les gestes qui se transmettent.",
  },
];

export function Souvenirs() {
  useEffect(() => {
    document.title = "Souvenirs — MANA.family";
    return () => {
      document.title = "MANA.family — La maison numérique familiale";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">La mémoire familiale</p>
        <h1 className="page-titre">Souvenirs</h1>

        <section className="page-panel">
          <p className="page-intro">
            Chaque souvenir peut contenir un titre, une description, un
            auteur, des dates, un lieu, des personnes associées, des
            pièces jointes et des règles de visibilité. La recherche et
            les filtres retrouvent tout — par personne, par année, par
            album. Les brouillons attendent leur heure.
          </p>
        </section>

        <section className="landing-section bulle" style={{ marginBottom: "var(--sp-4)" }}>
          <GlyphSouvenirs size={36} />
          <h2 className="section-title">Organiser, retrouver</h2>
          <div className="sous-bulle">
            <p className="section-accroche">Rien ne se perd.</p>
            <p className="section-texte">
              Les albums rassemblent les souvenirs par thème ou par
              période ; les associations relient chaque souvenir aux
              personnes concernées et aux événements vécus.
            </p>
            <div className="est-actions">
              <a className="btn btn-clair" href={`${B}/famille`}>
                Voir les personnes
              </a>
            </div>
          </div>
        </section>

        {TYPES.map((t) => (
          <section key={t.titre} className="page-panel">
            <p className="apercu-label">{t.titre}</p>
            <p className="page-texte">{t.texte}</p>
          </section>
        ))}

        <section className="page-panel">
          <p className="page-note" style={{ marginTop: 0 }}>
            Les fichiers sont réellement stockés et protégés : seuls les
            membres autorisés de la famille y accèdent. Aucune donnée
            n'est simulée sur cette vitrine.
          </p>
        </section>
      </div>
    </main>
  );
}
