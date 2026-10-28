import { useState } from "react";
import { usePath, baseUrl, routePromenade } from "./router";
import { WALKS } from "./walks";
import {
  GlyphRecherche,
  GlyphRadio,
  GlyphNavigation,
  GlyphSecurite,
  GlyphDecouverte,
  GlyphSentier,
  GlyphTerritoire,
} from "./Glyphs";
import { WalkMap } from "./WalkMap";
import { Promenades } from "./Promenades";
import { Promenade } from "./Promenade";
import { Territoire } from "./Territoire";
import { MentionsLegales } from "./MentionsLegales";
import { ContactForm } from "./ContactForm";

const B = baseUrl();

// MANAradio : au centre du hub — la radio de l'écosystème, en
// sommeil comme le backend (aucun flux simulé), mais positionnée.

// Les modules de la balade familiale, autour de la radio.
const MODULES = [
  {
    glyphe: GlyphNavigation,
    num: "01",
    titre: "Navigation & cartographie",
    accroche: "Le parcours dans la poche.",
    texte:
      "Hors ligne (PWA) : carte et parcours restent sans r\u00e9seau. GPS en temps r\u00e9el avec boussole, alerte si vous vous \u00e9loignez de 50 m du sentier — pratique pour garder le groupe rassembl\u00e9.",
    cta: { label: "Voir les balades", href: "/promenades" },
  },
  {
    glyphe: GlyphSecurite,
    num: "02",
    titre: "S\u00e9curit\u00e9 & s\u00e9r\u00e9nit\u00e9",
    accroche: "Prudence honn\u00eate.",
    texte:
      "SOS en un geste : position GPS partag\u00e9e par SMS aux secours ou aux proches. Mar\u00e9es et m\u00e9t\u00e9o : renvoi syst\u00e9matique vers les sources officielles — aucune donn\u00e9e simul\u00e9e.",
    cta: { label: "D\u00e9couvrir", href: "/promenade/pointe-du-raz" },
  },
  {
    glyphe: GlyphDecouverte,
    num: "03",
    titre: "Terrain familial",
    accroche: "Pens\u00e9 pour les familles.",
    texte:
      "Accessibilit\u00e9 poussette/PMR en premier filtre, dur\u00e9es courtes (≤ 2 h), boucles, aires de jeux et pauses gourmandes \u00e0 proximit\u00e9 — donn\u00e9es r\u00e9elles uniquement, rien d'invent\u00e9.",
    cta: { label: "Explorer", href: "/promenades" },
  },
  {
    glyphe: GlyphSentier,
    num: "04",
    titre: "Carnet & export",
    accroche: "Gardez la trace.",
    texte:
      "Export GPX en un clic, lisible par toutes les montres et applications. Fonctionne hors ligne, du cap \u00e0 la gr\u00e8ve — le r\u00e9seau n'attendra pas, nous non plus.",
    cta: { label: "Ouvrir un parcours", href: "/promenade/cap-frehel" },
  },
];

export default function App() {
  const path = usePath();
  const [lieu, setLieu] = useState("");
  const [walkIndex, setWalkIndex] = useState(0);

  const walkSuivant = () => setWalkIndex((i) => (i + 1) % WALKS.length);
  const walk = WALKS[walkIndex];

  const chercher = () => {
    const q = lieu.trim();
    window.location.assign(`${B}/promenades${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <nav className="nav">
            <a href={`${B}/`} aria-label="Rechercher — accueil" title="Rechercher">
              <GlyphRecherche />
              <span className="sr-only">Rechercher</span>
            </a>
            <a href={`${B}/radio`}>
              <GlyphRadio />
              <span>Radio</span>
            </a>
            <a className="brand" href={`${B}/`}>
              MANA<em>.family</em>
            </a>
            <a href={`${B}/promenades`}>
              <GlyphSentier />
              <span>Promenades</span>
            </a>
            <a href={`${B}/territoire`}>
              <GlyphTerritoire />
              <span>Territoire</span>
            </a>
          </nav>
        </div>
      </header>

      {path === "/radio" ? (
        <main className="page">
          <div className="wrap">
            <p className="hero-label">Écouter</p>
            <h1 className="page-titre">MANAradio</h1>

            <section className="page-panel radio-player-panel">
              <div className="radio-player">
                <button
                  type="button"
                  className="radio-play"
                  aria-label="Lecture"
                  title="Hors antenne — bientôt"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.5 5.5v13l10-6.5z" />
                  </svg>
                </button>
                <div className="radio-infos">
                  <p className="radio-etat">Hors antenne</p>
                  <p className="radio-note">Le direct arrivera bientôt — aucun flux simulé.</p>
                </div>
              </div>
            </section>

            <section className="page-panel">
              <p className="apercu-label">En cours</p>
              <p className="page-texte">
                Aucun titre à l'antenne pour l'instant. Les épisodes
                et la programmation s'afficheront ici dès la première
                émission réelle.
              </p>
            </section>
          </div>
        </main>
      ) : path === "/promenades" ? (
        <Promenades />
      ) : routePromenade(path) ? (
        <Promenade slug={routePromenade(path)!} />
      ) : path === "/territoire" ? (
        <Territoire />
      ) : path === "/mentions-legales" ? (
        <MentionsLegales />
      ) : path === "/contact" ? (
        <main className="page">
          <div className="wrap">
            <p className="hero-label">Nous joindre</p>
            <h1 className="page-titre">Contact</h1>
            <section className="page-panel">
              <p className="page-intro">
                Une question sur les balades en famille, le territoire,
                un partenariat ? Écrivez-nous — nous répondons vite,
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
              <p className="hero-label">Terre, Mer &amp; Lumière — Bretagne</p>
              <h1 className="brand-grand">En famille</h1>
              <p className="hero-label">sur les chemins d'Armor &amp; Argoat</p>

              {/* Moteur de saisie de localité */}
              <div className="moteur-barre" role="search" aria-label="Rechercher une localité">
                <svg className="moteur-loupe" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 4.5 4.5" />
                </svg>
                <input
                  id="moteur-lieu"
                  type="search"
                  autoComplete="off"
                  placeholder="Au départ de…"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
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

              {/* La balade : une seule, avec sa carte — croix/coeur */}
              <div className="balade-unique">
                <div className="balade-carte">
                  <WalkMap walk={walk} width={280} height={180} />
                </div>
                <p className="swipe-lieu">{walk.lieu}</p>
                <p className="swipe-titre">{walk.titre}</p>
                <p className="swipe-meta">
                  {walk.distanceKm} km · {walk.dureeH} h · {walk.difficulte}
                  {walk.poussettePmr ? " · poussette/PMR" : ""}
                </p>
                <div className="balade-actions">
                  <button
                    type="button"
                    className="balade-btn balade-x"
                    aria-label="Parcours suivant"
                    title="Parcours suivant"
                    onClick={walkSuivant}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                  <a
                    className="balade-btn balade-coeur"
                    href={`${B}/promenade/${walk.slug}`}
                    aria-label="Ouvrir le parcours"
                    title="Ouvrir le parcours"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 20s-6.5-4.1-6.5-9A4.2 4.2 0 0 1 12 8.4 4.2 4.2 0 0 1 18.5 11c0 4.9-6.5 9-6.5 9z" />
                    </svg>
                  </a>
                </div>
              </div>
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

            {/* 05 — MANAradio : en ligne */}
            <section className="landing-section bulle">
              <p className="section-num">05</p>
              <GlyphRadio size={36} />
              <h2 className="section-title">MANAradio</h2>
              <div className="sous-bulle">
                <p className="section-accroche">En ligne.</p>
                <p className="section-texte">
                  À écouter en marchant — ou au coin du feu, en famille.
                </p>
                <div className="est-actions">
                  <a className="btn btn-clair" href={`${B}/radio`}>
                    Écouter MANAradio
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
              MANA<em>.family</em>
            </p>
            <p className="footer-note">
              Balades bretonnes en famille — hors ligne, GPS, GPX.
              Gratuit, sobre, aucune donnée revendue.
            </p>
            <ContactForm />
          </div>
          <nav className="footer-nav" aria-label="Pied de page">
            <a href={`${B}/promenades`}>Promenades</a>
            <a href={`${B}/promenade/pointe-du-raz`}>Pointe du Raz</a>
            <a href={`${B}/promenade/cap-frehel`}>Cap Fréhel</a>
            <a href={`${B}/promenade/gr34-crozon`}>GR34 — Camaret</a>
            <a href={`${B}/radio`}>MANAradio</a>
            <a href={`${B}/territoire`}>Le territoire</a>
            <a href={`${B}/contact`}>Contact</a>
            <a href={`${B}/mentions-legales`}>Mentions légales</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
