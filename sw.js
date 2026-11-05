// Network first for the app and small vault files, falling back to cache offline.
// Large audio is cached by the app itself (js/vault.js), so it's skipped here.
const SHELL = 'shell-v1';
const FILES = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/vault.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'vault/meta.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== 'audio-v1').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/vault\/r\d+\.bin$/.test(url.pathname) || /\/audio\//.test(url.pathname)) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(async () => (await caches.match(e.request, { ignoreSearch: true }))
      || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))
  );
});
