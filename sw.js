const CACHE_NAME = 'synapse-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',      // Vérifiez le nom de votre fichier CSS
  '/images/logo-synapse.png',
  '/images/https://i.pinimg.com/1200x/ce/65/81/ce65811ccae30d6b52b1aea2ca5446cd.jpg'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Récupération des fichiers (fonctionnement hors ligne)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
