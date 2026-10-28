import { useEffect } from "react";
import { baseUrl } from "./router";
import { GlyphPrive } from "./Glyphs";

// Connexion — la porte de la maison familiale. Vitrine honnête :
// l'application MANAfamily est un service privé auto-hébergé, pas un
// formulaire décoratif. Cette page explique l'accès réel sans rien
// simuler (règle : aucun bouton décoratif, aucune fausse donnée).

export function Connexion() {
  useEffect(() => {
    document.title = "Connexion — MANA.family";
    return () => {
      document.title = "MANA.family — La maison numérique familiale";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">La porte de la maison</p>
        <h1 className="page-titre">Connexion</h1>

        <section className="page-panel">
          <p className="page-intro">
            MANAfamily est une maison privée : chaque famille héberge
            ses souvenirs dans son propre espace, accessible uniquement
            à ses membres. L'accès se fait depuis l'application
            familiale déployée pour votre famille — pas depuis cette
            vitrine publique.
          </p>
        </section>

        <section className="landing-section bulle" style={{ marginBottom: "var(--sp-4)" }}>
          <GlyphPrive size={36} />
          <h2 className="section-title">Une maison privée</h2>
          <div className="sous-bulle">
            <p className="section-accroche">Vos souvenirs restent chez vous.</p>
            <p className="section-texte">
              Comptes, familles, invitations : chaque espace est isolé,
              et les contenus ne sortent jamais du cercle familial.
              Aucune donnée revendue, aucun traceur, aucun réseau public.
            </p>
          </div>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Comment entrer ?</p>
          <p className="page-texte">
            Si votre famille dispose déjà d'un espace MANAfamily,
            utilisez l'adresse communiquée par son administrateur.
            Sinon, écrivez-nous : nous vous aiderons à installer votre
            maison familiale.
          </p>
          <div className="est-actions">
            <a className="btn btn-primary" href="mailto:contact@manafamily.bzh">
              Demander l'accès
            </a>
            <a className="btn btn-ghost" href={`${B}/`}>
              Découvrir MANA.family
            </a>
          </div>
        </section>

        <section className="page-panel">
          <p className="page-note" style={{ marginTop: 0 }}>
            Cette vitrine ne collecte aucune donnée et n'héberge aucun
            contenu familial : les souvenirs vivent dans l'application
            privée de chaque famille.
          </p>
        </section>
      </div>
    </main>
  );
}
