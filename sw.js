const CACHE_NAME = 'my-site-cache-v1';
const OFFLINE_URL = '/offline.html';

// 1. Install Event: Cache the offline page immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(OFFLINE_URL);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: The Strategy
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests (visiting pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails (offline), show the generic offline page
          return caches.match(OFFLINE_URL);
        })
    );
  } else {
    // For images/css/js, try cache first, then network
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
