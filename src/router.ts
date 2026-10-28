// Routeur minimal maison : zéro dépendance (doctrine vitesse).
// GitHub Pages sert index.html pour / et 404.html (copie d'index) pour les
// liens profonds — le JS lit l'URL et rend la bonne page.

export function usePath(): string {
  const p = window.location.pathname;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return p.startsWith(base) ? p.slice(base.length) || "/" : p;
}

export function baseUrl(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export function routePromenade(path: string): string | null {
  const m = path.match(/^\/promenade\/([\w-]+)\/?$/);
  return m ? m[1] : null;
}
