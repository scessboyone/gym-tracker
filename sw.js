// Service Worker: macht die App offline-faehig.
// Eigene Dateien: erst Netz (max. 3 s), sonst Cache -> Updates kommen automatisch.
// Uebungsbilder/-datenbank: erst Cache, sonst Netz -> funktioniert im Gym ohne Empfang.
const VERSION = 'v55';
const SHELL = 'shell-' + VERSION;
const MEDIA = 'media-v1';
const FILES = ['./', 'index.html', 'style.css', 'js/core.js', 'js/muscles.js', 'js/home.js', 'js/training.js', 'js/plan.js', 'js/history.js', 'js/weight.js', 'js/more.js', 'js/ui.js', 'js/actions.js', 'js/main.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      try {
        // no-cache: immer beim Server nachfragen, nicht den 10-Minuten-Browsercache von GitHub Pages nehmen
        const res = await Promise.race([fetch(req, { cache: 'no-cache' }), timeout(3000)]);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('index.html'));
      }
    })());
    return;
  }

  // Eigene Bild-Links (z. B. fitundattraktiv.de): einmal laden, dann offline aus dem Cache
  if (req.destination === 'image' && url.hostname !== 'raw.githubusercontent.com') {
    e.respondWith((async () => {
      const cache = await caches.open('ext-img-v1');
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (url.hostname === 'raw.githubusercontent.com') {
    e.respondWith((async () => {
      const cache = await caches.open(MEDIA);
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
  }
});

