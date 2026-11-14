// Service Worker: macht die App offline nutzbar.
//
// Strategie "Netz zuerst, sonst Cache": Mit Verbindung kommt immer die aktuelle Version
// (und landet im Cache), ohne Verbindung oder bei sehr langsamem Netz die gespeicherte.
// So braucht es keine Versionsnummern und keine Dateiliste, die man pflegen müsste.
// Die Seite meldet nach dem Start alle geladenen Dateien (siehe src/pwa.js), damit schon
// nach dem ersten Besuch alles offline verfügbar ist.
//
// Die Lieder selbst liegen in IndexedDB, nicht hier.

const CACHE = 'liederbuch-app';
const TIMEOUT_MS = 3500;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

function cacheable(url) {
  return url.origin === self.location.origin && !url.pathname.includes('/tests/');
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-urls') return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const u of event.data.urls) {
        const url = new URL(u, self.location.href);
        if (!cacheable(url)) continue;
        url.hash = '';
        if (await cache.match(url.href, { ignoreSearch: true })) continue;
        try {
          const res = await fetch(url.href, { cache: 'no-cache' });
          if (res.ok) await cache.put(url.href, res);
        } catch {
          /* offline – beim nächsten Mal */
        }
      }
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;
  event.respondWith(networkFirst(req));
});

async function fromCache(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  if (req.mode === 'navigate') return (await cache.match('./index.html')) || cache.match('./');
  return undefined;
}

async function networkFirst(req) {
  const network = fetch(req).then(async (res) => {
    if (res.ok && res.type === 'basic') {
      const cache = await caches.open(CACHE);
      await cache.put(req, res.clone());
    }
    return res;
  });
  network.catch(() => {}); // Fehler wird unten behandelt; hier nur "unbehandelt"-Warnung vermeiden

  // Langsames Netz: nach kurzer Zeit die gespeicherte Version nehmen (falls vorhanden)
  const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS, 'timeout'));
  try {
    const first = await Promise.race([network, timeout]);
    if (first !== 'timeout') return first;
    const cached = await fromCache(req);
    return cached || (await network);
  } catch {
    const cached = await fromCache(req);
    return cached || Response.error();
  }
}
