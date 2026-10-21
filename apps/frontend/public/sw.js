// Cache only the static app icon. Never cache API, attendance, or biometric responses.
const CACHE = 'presqio-static-v3';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.add('/fevicon-icon.png'))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('presqio-static-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && url.origin === self.location.origin && url.pathname === '/fevicon-icon.png') {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
