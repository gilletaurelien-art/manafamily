// Service worker MANA.family — cache offline pour la brique Balades.
// Network-first pour le HTML : une mise à jour du site (nouveau thème,
// nouveaux parcours) est visible au rechargement — leçon apprise :
// cache-first sur le HTML = utilisateurs bloqués sur l'ancien design.
// Cache-first pour les assets hashés (polices, bundles).
// Règle : bump du cache à chaque changement de thème.

const CACHE = "mana-family-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;

  const isDocument =
    event.request.mode === "navigate" || url.pathname.endsWith("index.html");

  if (isDocument) {
    // Network-first : le site à jour prime, le cache sauve l'offline.
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((hit) => hit || caches.match("./index.html"))
        )
    );
    return;
  }

  // Assets : cache-first, secours réseau.
  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ||
        fetch(event.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
    )
  );
});
