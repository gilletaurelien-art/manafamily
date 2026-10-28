import { useEffect } from "react";
import { baseUrl } from "./router";

// Mentions légales — page minimale, honnête : pas de revente de
// données, hébergement GitHub Pages. L'éditeur complet (raison
// sociale, adresse, SIREN) sera publié avec la structure juridique
// définitive de l'écosystème MANA.

export function MentionsLegales() {
  useEffect(() => {
    document.title = "Mentions légales — MANA.family";
    return () => {
      document.title = "MANA.family — La maison numérique familiale";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Informations légales</p>
        <h1 className="page-titre">Mentions légales</h1>

        <section className="page-panel">
          <p className="apercu-label">Éditeur</p>
          <p className="page-intro">
            MANA.family est édité par l'écosystème MANA. Les coordonnées
            complètes de l'éditeur seront publiées avec la structure
            juridique définitive du projet.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Hébergement</p>
          <p className="page-intro">
            Site statique hébergé sur GitHub Pages (GitHub, Inc.). Cette
            vitrine ne collecte aucune donnée personnelle. L'application
            familiale, elle, héberge les données de chaque famille dans un
            espace privé — jamais partagé, jamais revendu.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Nature du service</p>
          <p className="page-intro">
            MANA.family est la maison numérique familiale privée :
            souvenirs, famille, agenda, transmission. La vitrine
            présente le produit ; l'application porte les contenus
            réels de chaque famille, dans un périmètre d'accès
            explicite.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Données personnelles</p>
          <p className="page-intro">
            Aucune donnée ni lead n'est revendu. Aucun traceur
            publicitaire. Vous pouvez demander la suppression de vos
            données à tout moment — la suppression est une exclusion
            définitive.
          </p>
        </section>

        <div className="est-actions">
          <a className="btn btn-primary" href={`${B}/`}>
            Retour à l'accueil
          </a>
        </div>
      </div>
    </main>
  );
}
