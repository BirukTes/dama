/* Build-time placeholders are replaced by scripts/build-offline.mjs. */
const VERSION = '__DAMA_VERSION__';
const FILES = __DAMA_PRECACHE__;
const CACHE = `dama-shell-${VERSION}`;
const PREFIX = 'dama-shell-';
const urls = new Set(FILES.map((file) => file.url));
async function prepare() {
  const existed = await caches.has(CACHE);
  const cache = await caches.open(CACHE);
  try {
    // Integrity prevents a partial deployment or SPA fallback becoming an offline asset.
    await cache.addAll(
      FILES.map((file) => new Request(file.url, { cache: 'reload', integrity: file.integrity })),
    );
  } catch (error) {
    if (!existed) await caches.delete(CACHE);
    throw error;
  }
}
self.addEventListener('install', (event) => event.waitUntil(prepare()));
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      // Keep the previous release for a tab opened during an update handover.
      const names = (await caches.keys()).filter(
        (name) => name.startsWith(PREFIX) && name !== CACHE,
      );
      await Promise.all(names.slice(0, -1).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (urls.has(path)) {
    event.respondWith(
      (async () => {
        const response = await (await caches.open(CACHE)).match(path);
        return response || fetch(request);
      })(),
    );
  } else if (path.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        for (const name of (await caches.keys()).filter((name) => name.startsWith(PREFIX))) {
          const response = await (await caches.open(name)).match(path);
          if (response) return response;
        }
        return fetch(request);
      })(),
    );
  } else if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.open(CACHE).then((cache) => cache.match('/index.html'))),
    );
  }
});
self.addEventListener('message', (event) => {
  const reply = (data) => event.ports[0]?.postMessage(data);
  if (event.data?.type === 'OFFLINE_STATUS')
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        const keys = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
        reply({ ready: FILES.every((file) => keys.has(file.url)), version: VERSION });
      })(),
    );
  if (event.data?.type === 'PREPARE_OFFLINE')
    event.waitUntil(
      (async () => {
        try {
          await prepare();
          reply({ ready: true });
        } catch {
          reply({ ready: false });
        }
      })(),
    );
  if (event.data?.type === 'ACTIVATE_UPDATE')
    event.waitUntil(
      (async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        if (windows.length > 1) {
          reply({ blocked: true });
          return;
        }
        reply({ activating: true });
        await self.skipWaiting();
      })(),
    );
});
