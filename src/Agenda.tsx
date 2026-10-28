import { useEffect } from "react";
import { baseUrl } from "./router";
import { GlyphAgenda } from "./Glyphs";

// Agenda — les moments partagés : anniversaires calculés depuis les
// dates de naissance (jamais dupliqués), événements, participants.

const FACETTES = [
  {
    titre: "Anniversaires",
    texte:
      "Calculés automatiquement à partir des dates de naissance enregistrées — sans duplication inutile, toujours à jour.",
  },
  {
    titre: "Retrouvailles & événements",
    texte:
      "Réunions de famille, fêtes, week-ends : titre, description, lieu, dates, pièces jointes.",
  },
  {
    titre: "Participants",
    texte:
      "Chaque événement est relié aux personnes concernées — on sait qui était là, et qui manquait à l'appel.",
  },
  {
    titre: "Rappels configurables",
    texte:
      "Chaque membre choisit ses préférences : rappels d'événements, anniversaires — rien d'imposé.",
  },
];

export function Agenda() {
  useEffect(() => {
    document.title = "Agenda — MANA.family";
    return () => {
      document.title = "MANA.family — La maison numérique familiale";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Les moments partagés</p>
        <h1 className="page-titre">Agenda</h1>

        <section className="page-panel">
          <p className="page-intro">
            L'agenda familial réunit les anniversaires, les retrouvailles
            et les événements importants. Vues calendrier et liste ;
            création, modification et suppression au fil de la vie de
            la famille.
          </p>
        </section>

        <section className="landing-section bulle" style={{ marginBottom: "var(--sp-4)" }}>
          <GlyphAgenda size={36} />
          <h2 className="section-title">Les rendez-vous de la maison</h2>
          <div className="sous-bulle">
            <p className="section-accroche">Aucun anniversaire oublié.</p>
            <p className="section-texte">
              Les anniversaires naissent des fiches personnes : quand la
              famille s'agrandit, l'agenda suit — sans saisie double.
            </p>
            <div className="est-actions">
              <a className="btn btn-clair" href={`${B}/famille`}>
                Voir la famille
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
