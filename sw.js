const CACHE_NAME = "shift-cache-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for everything (app shell + CDN scripts for React/Babel/icons),
// so the app still opens offline once it has been loaded at least once.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      if (cached) return cached;

      const fresh = await networkFetch;
      if (fresh) return fresh;

      if (req.mode === "navigate") {
        const fallback = await cache.match("./index.html");
        if (fallback) return fallback;
      }
      return new Response("Оффлайн, и эта страница ещё не была загружена ранее.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    })
  );
});
