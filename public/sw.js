/* Fiesta Gas PGI service worker.
 * - Pre-caches the offline page and app icons.
 * - Pages: network first, fall back to cache, then to /offline.
 * - Static assets (_next/static, images, fonts): cache first.
 * - Never touches Convex, API or server-action requests.
 */
const VERSION = "pgi-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/gasul-tank.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Convex, Google, OSM: leave alone
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.startsWith("/__nextjs")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(STATIC).then((c) => c.put(req, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // Navigations and RSC payloads: network first with cached fallback
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && req.mode === "navigate") caches.open(PAGES).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE_URL)) || Response.error())
    );
  }
});
