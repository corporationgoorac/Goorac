const CACHE_NAME = 'goorac-quantum-v2'; // Change v2 to v3 to force update
const OFFLINE_URL = '/offline.html';

// LIST OF FILES TO CACHE INSTANTLY (The "App Shell")
// Add your main CSS, JS, and Logo here so the app opens instantly
const ASSETS_TO_CACHE = [
    OFFLINE_URL,
    '/manifest.json',
    'https://cdn-icons-png.flaticon.com/128/3067/3067451.png',
    'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
    // Add your main style.css or main.js here if you have them:
    // '/css/style.css',
    // '/js/app.js' 
];

// 1. INSTALL: Cache the "App Shell" immediately
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing Service Worker ...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. ACTIVATE: Clean up old caches (If you change v2 to v3, this runs)
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating Service Worker ...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// 3. FETCH: The Hybrid Strategy
self.addEventListener('fetch', (event) => {
    
    // STRATEGY A: For HTML Pages (Navigation) -> Network First, Fallback to Offline
    // We want pages to be fresh (dynamic), so we go to network first.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }

    // STRATEGY B: For Images, CSS, JS, Fonts -> Cache First, Fallback to Network
    // We want these to load instantly from disk.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Return from cache (Fast!)
            }
            return fetch(event.request).then((networkResponse) => {
                // Optional: Dynamic Caching (Cache new images as users browse)
                // If you want to save every image the user sees, uncomment below:
                /*
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
                */
                return networkResponse;
            });
        })
    );
});
