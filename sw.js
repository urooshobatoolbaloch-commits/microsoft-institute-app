// Microsoft Institute Khairpur - Service Worker
const CACHE_NAME = 'ms-institute-v1';

// App shell files to cache for offline capabilities
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install event - Cache the application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - Delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event
// NEVER cache or intercept POST requests or any request to external webhooks (e.g. n8n)
// For app shell requests, serve cache first, then fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Never intercept non-GET requests (e.g., POST form submissions)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // If the request is for an external domain (like n8n webhook or Google Fonts)
  // or contains webhook paths, let network handle it directly
  if (url.origin !== self.location.origin) {
    // Let network handle external requests without intercepting or failing
    return;
  }

  // Cache-first strategy for app shell assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // Optionally cache newly fetched local files
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback: if navigation fails, return cached index.html
      if (request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
