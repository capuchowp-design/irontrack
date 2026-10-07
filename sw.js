// Service worker do IronTrack. Aumente a versão ao publicar mudanças grandes.
const VERSAO = 'irontrack-v1';
const SHELL = ['./', './index.html', './exercicios.js', './irontrack-extra.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mesmaOrigem = url.origin === location.origin;
  const imagem = mesmaOrigem && /\.webp$/i.test(url.pathname);

  if (imagem) {
    // Animações: cache primeiro; guarda cada uma na primeira vez que abrir (funciona offline depois)
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(req, c)); }
      return r;
    })));
    return;
  }
  // Código e fontes: rede primeiro (pega atualizações), cache se estiver offline
  e.respondWith(fetch(req).then(r => {
    if (r.ok && (mesmaOrigem || url.hostname.includes('fonts.g'))) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(req, c)); }
    return r;
  }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
