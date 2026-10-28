import { useState } from "react";
import { usePath, baseUrl } from "./router";
import {
  GlyphFamille,
  GlyphSouvenirs,
  GlyphAgenda,
  GlyphCreer,
  GlyphPrive,
} from "./Glyphs";
import { Souvenirs } from "./Souvenirs";
import { Famille } from "./Famille";
import { Agenda } from "./Agenda";
import { Creer } from "./Creer";
import { MentionsLegales } from "./MentionsLegales";
import { ContactForm } from "./ContactForm";

const B = baseUrl();

// MANAfamily — la maison numérique familiale privée. Cinq espaces :
// Accueil (la vie de famille), Souvenirs (la mémoire), Famille (les
// personnes et les générations), Agenda (les moments), Créer (la
// transmission). Aucun contenu simulé : la vitrine décrit l'application.

const MODULES = [
  {
    glyphe: GlyphSouvenirs,
    num: "01",
    titre: "Souvenirs — la mémoire familiale",
    accroche: "Rien ne se perd.",
    texte:
      "Photos, vidéos, textes, enregistrements audio, lettres, recettes et traditions : chaque souvenir garde son titre, ses dates, son lieu, ses personnes. Galeries, albums, recherche et filtres — privé par défaut.",
    cta: { label: "Voir les souvenirs", href: "/souvenirs" },
  },
  {
    glyphe: GlyphFamille,
    num: "02",
    titre: "Famille — les personnes et les générations",
    accroche: "Relier les générations.",
    texte:
      "Fiches personnes, biographies, relations parent-enfant et couples — y compris familles recomposées. L'arbre généalogique est généré à partir des relations enregistrées, navigable par génération.",
    cta: { label: "Découvrir la famille", href: "/famille" },
  },
  {
    glyphe: GlyphAgenda,
    num: "03",
    titre: "Agenda — les moments partagés",
    accroche: "Les rendez-vous de la maison.",
    texte:
      "Anniversaires calculés depuis les dates de naissance, retrouvailles, événements importants : participants, lieux, descriptions. Rappels configurables, vues liste et calendrier.",
    cta: { label: "Ouvrir l'agenda", href: "/agenda" },
  },
  {
    glyphe: GlyphCreer,
    num: "04",
    titre: "Créer — la transmission",
    accroche: "Des contenus deviennent des récits.",
    texte:
      "Albums thématiques, chronologies, biographies, récits — et le livre de famille : sélection des souvenirs, prévisualisation, export PDF. Chaque récit garde ses sources.",
    cta: { label: "Créer un livre", href: "/creer" },
  },
];

export default function App() {
  const path = usePath();
  const [q, setQ] = useState("");

  const chercher = () => {
    const query = q.trim();
    window.location.assign(`${B}/souvenirs${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <nav className="nav">
            <a className="brand" href={`${B}/`} aria-label="MANA.family — accueil">
              <img src={`${B}/logo.png`} alt="" className="brand-logo" />
              MANA<em>.family</em>
            </a>
            <a href={`${B}/souvenirs`}>
              <GlyphSouvenirs />
              <span>Souvenirs</span>
            </a>
            <a href={`${B}/famille`}>
              <GlyphFamille />
              <span>Famille</span>
            </a>
            <a href={`${B}/agenda`}>
              <GlyphAgenda />
              <span>Agenda</span>
            </a>
            <a href={`${B}/creer`}>
              <GlyphCreer />
              <span>Créer</span>
            </a>
          </nav>
        </div>
      </header>

      {path === "/souvenirs" ? (
        <Souvenirs />
      ) : path === "/famille" ? (
        <Famille />
      ) : path === "/agenda" ? (
        <Agenda />
      ) : path === "/creer" ? (
        <Creer />
      ) : path === "/mentions-legales" ? (
        <MentionsLegales />
      ) : path === "/contact" ? (
        <main className="page">
          <div className="wrap">
            <p className="hero-label">Nous joindre</p>
            <h1 className="page-titre">Contact</h1>
            <section className="page-panel">
              <p className="page-intro">
                Une question sur la maison familiale, les souvenirs, la
                transmission ? Écrivez-nous — nous répondons vite,
                honnêtement, sans prospection forcée.
              </p>
              <ContactForm />
            </section>
          </div>
        </main>
      ) : (
        <>
          <section className="hero">
            <div className="wrap bulle-xl hero-moteur">
              <p className="hero-label">La maison numérique familiale</p>
              <h1 className="brand-grand">En famille</h1>
              <p className="hero-label">souvenirs, générations & transmission</p>

              {/* Moteur de recherche de souvenir */}
              <div className="moteur-barre" role="search" aria-label="Rechercher un souvenir">
                <svg className="moteur-loupe" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 4.5 4.5" />
                </svg>
                <input
                  id="moteur-lieu"
                  type="search"
                  autoComplete="off"
                  placeholder="Dans les souvenirs…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && chercher()}
                />
                <button
                  type="button"
                  className="moteur-fleche"
                  aria-label="Rechercher"
                  onClick={chercher}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12h15" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              </div>

              <p className="lede">
                Partager la vie de famille, conserver les souvenirs,
                relier les générations et transmettre une histoire —
                dans un espace privé, sans fil algorithmique, sans
                publicité, sans données revendues.
              </p>
            </div>
          </section>

          <main className="wrap">
            {MODULES.map((m) => {
              const G = m.glyphe;
              return (
              <section key={m.num} className="landing-section bulle">
                <p className="section-num">{m.num}</p>
                <G size={36} />
                <h2 className="section-title">{m.titre}</h2>
                <p className="section-texte">{m.texte}</p>
                <div className="est-actions">
                  <a className="btn btn-primary" href={`${B}${m.cta.href}`}>
                    {m.cta.label}
                  </a>
                </div>
              </section>
              );
            })}

            {/* 05 — Intimité et pérennité */}
            <section className="landing-section bulle">
              <p className="section-num">05</p>
              <GlyphPrive size={36} />
              <h2 className="section-title">Privé, et ça reste privé</h2>
              <div className="sous-bulle">
                <p className="section-accroche">Vos données vous appartiennent.</p>
                <p className="section-texte">
                  Les contenus ne sortent jamais de l'espace familial.
                  Aucun traceur, aucune revente, aucun réseau public.
                  Exportez tout, à tout moment — vos souvenirs ne
                  dépendent de personne.
                </p>
                <div className="est-actions">
                  <a className="btn btn-clair" href={`${B}/mentions-legales`}>
                    Nos engagements
                  </a>
                </div>
              </div>
            </section>
          </main>
        </>
      )}

      <footer className="site-footer">
        <div className="wrap footer-colonnes">
          <div>
            <p className="brand">
              <img src={`${B}/logo.png`} alt="" className="brand-logo" />
              MANA<em>.family</em>
            </p>
            <p className="footer-note">
              La maison numérique familiale — souvenirs, famille, agenda,
              transmission. Gratuit, sobre, aucune donnée revendue.
            </p>
            <ContactForm />
          </div>
          <nav className="footer-nav" aria-label="Pied de page">
            <a href={`${B}/souvenirs`}>Souvenirs</a>
            <a href={`${B}/famille`}>Famille</a>
            <a href={`${B}/agenda`}>Agenda</a>
            <a href={`${B}/creer`}>Créer</a>
            <a href={`${B}/contact`}>Contact</a>
            <a href={`${B}/mentions-legales`}>Mentions légales</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
