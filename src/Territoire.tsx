import { useEffect } from "react";
import { baseUrl } from "./router";
import { GlyphTerritoire } from "./Glyphs";

// Le territoire : page éditoriale Bretagne — honnête, sans compteur.

const FACETTES = [
  {
    titre: "Une péninsule ouverte sur la mer",
    texte:
      "2 800 km de côtes : la Bretagne est la région maritime française par excellence. Du Finistère au golfe du Morbihan, la mer structure les paysages, les métiers et les rythmes.",
  },
  {
    titre: "Des villes qui vivent, des campagnes qui habitent",
    texte:
      "Rennes, Brest, Nantes aux portes, Vannes, Lorient, Quimper : des pôles dynamiques reliés par un réseau de communes où l'on vit encore à taille humaine.",
  },
  {
    titre: "Une langue et une culture vivantes",
    texte:
      "Le breton et le gallo, la fest-noz, les festivals, les sonneurs : la culture bretonne n'est pas un décor, elle se pratique — et elle accueille.",
  },
  {
    titre: "Un territoire qui se réinvente",
    texte:
      "Marine, agroalimentaire, numérique, énergies marines : la Bretagne investit l'avenir sans renier ce qui la fait tenir — la terre, la lumière, la communauté.",
  },
];

export function Territoire() {
  useEffect(() => {
    document.title = "Le territoire — MANA.family";
    return () => {
      document.title = "MANA.family — Balades & découvertes en famille en Bretagne";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Terre & lumière</p>
        <h1 className="page-titre">Le territoire</h1>

        <section className="page-panel">
          <p className="page-intro">
            La Bretagne, par ceux qui y vivent et par ceux qui veulent y
            venir — en famille. Une présentation honnête : ni carte
            postale figée, ni compteur de vanité — des paysages, des
            villes, une culture, et des chemins praticables à tout âge.
          </p>
        </section>

        <section className="landing-section bulle" style={{ marginBottom: "var(--sp-4)" }}>
          <GlyphTerritoire size={36} />
          <h2 className="section-title">S'installer en Bretagne</h2>
          <div className="sous-bulle">
            <p className="section-accroche">
              Un territoire, des services.
            </p>
            <p className="section-texte">
              Marcher, écouter, comprendre : chaque balade MANA.family
              s'appuie sur des données territoriales réelles, sourcées,
              vérifiées quand c'est possible.
            </p>
            <div className="est-actions">
              <a className="btn btn-clair" href={`${B}/promenades`}>
                Découvrir les balades
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

        <section className="page-panel">
          <p className="page-note" style={{ marginTop: 0 }}>
            Les informations territoriales publiées par l'écosystème MANA
            s'appuient sur des sources publiques réelles (notamment
            geo.api.gouv.fr pour les communes) — jamais sur des chiffres
            inventés.
          </p>
        </section>
      </div>
    </main>
  );
}
