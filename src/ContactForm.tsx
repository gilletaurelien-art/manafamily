// Contact — vitrine statique : envoi simulé, aucune donnée ne
// quitte le navigateur. Le bouton ouvre aussi un mailto direct.

export function ContactForm() {
  return (
    <div className="contact-form">
      <p className="apercu-label">Écrire à MANA.family</p>
      <div className="est-actions">
        <a className="btn btn-primary" href="mailto:contact@manafamily.bzh">
          contact@manafamily.bzh
        </a>
      </div>
      <p className="contact-note">
        Nous répondons vite, honnêtement, sans prospection forcée.
        Aucune donnée n'est revendue.
      </p>
    </div>
  );
}
