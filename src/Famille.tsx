import { useEffect } from "react";
import { baseUrl } from "./router";
import { GlyphPorte } from "./Glyphs";

// Famille — les personnes et les générations. L'arbre est dérivé des
// relations enregistrées, jamais l'inverse ; aucune parenté n'est
// déduite automatiquement.

const FACETTES = [
  {
    titre: "Une fiche par personne",
    texte:
      "Prénom, nom, dates importantes, biographie, photo : la fiche est le point de départ de tout le reste.",
  },
  {
    titre: "Des relations déclarées",
    texte:
      "Parent-enfant, couples, familles recomposées, informations inconnues : on enregistre ce que l'on sait, sans inventer le reste.",
  },
  {
    titre: "Un arbre générationnel",
    texte:
      "Parcourir la famille par génération, naviguer de fiche en fiche : l'arbre se construit à partir des relations.",
  },
  {
    titre: "Des vies reliées aux souvenirs",
    texte:
      "Chaque personne est associée à ses souvenirs et à ses événements — sa page raconte sa place dans l'histoire commune.",
  },
];

export function Famille() {
  useEffect(() => {
    document.title = "Famille — MANA.family";
    return () => {
      document.title = "MANA.family — La maison numérique familiale";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Les personnes & les générations</p>
        <h1 className="page-titre">Famille</h1>

        <section className="page-panel">
          <p className="page-intro">
            Créer et modifier les fiches, définir les relations,
            parcourir par génération, consulter l'arbre généalogique
            navigable. L'arbre est généré à partir des relations
            enregistrées — il ne constitue pas une base indépendante.
          </p>
        </section>

        <section className="landing-section bulle" style={{ marginBottom: "var(--sp-4)" }}>
          <GlyphPorte size={36} />
          <h2 className="section-title">La maison commune</h2>
          <div className="sous-bulle">
            <p className="section-accroche">Relier les générations.</p>
            <p className="section-texte">
              Les enfants ont des protections adaptées : les contenus
              marqués « adultes » leur sont invisibles, et les visibilités
              se règlent souvenir par souvenir.
            </p>
            <div className="est-actions">
              <a className="btn btn-clair" href={`${B}/souvenirs`}>
                Voir les souvenirs
              </a>
            </div>
          </div>
        </section>

        {FACETTES.map((f) => (
          <section key={f.titre} className="page-panel">
            <p className="apercu-label">{f.titre}</p>
            <p className="page-texte">{f.texte}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
