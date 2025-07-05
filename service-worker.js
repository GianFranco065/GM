const CACHE_NAME = 'mantenimiento-app-v2';
const urlsToCache = [
  './',
  './index.html',
  './dashboard.html',
  './mantenimientos.html',
  './styles.css',
  './script.js',
  './google-apps-script.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

// Instalar el service worker
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Archivos en cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activar el service worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpiando cache antiguo');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Interceptar requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
  );
});