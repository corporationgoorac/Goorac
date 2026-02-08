const CACHE_NAME = 'goorac-quantum-v3'; // Incremented version
const OFFLINE_URL = '/offline.html';

// LIST OF FILES TO CACHE
// I added your real files here so they load instantly
const ASSETS_TO_CACHE = [
    '/',
    '/home.html',
    '/chat.html',
    '/config.js',
    '/notification-worker.js',
    'https://cdn-icons-png.flaticon.com/128/3067/3067451.png',
    'https://cdn-icons-png.flaticon.com/512/3067/3067451.png'
];

// 1. INSTALL: Cache Files Safely (FAULT TOLERANT)
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    self.skipWaiting(); // Force active immediately

    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // We loop through files one by one. 
            // If 'offline.html' or another file is missing, it won't crash the whole app.
            for (const url of ASSETS_TO_CACHE) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response);
                    } else {
                        console.log(`[SW] Skipping missing file: ${url}`);
                    }
                } catch (error) {
                    console.log(`[SW] Could not cache: ${url}`);
                }
            }
        })
    );
});

// 2. ACTIVATE: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
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
    return self.clients.claim();
});

// 3. FETCH: Hybrid Strategy
self.addEventListener('fetch', (event) => {
    // A. Navigation (HTML Pages) -> Network First, Fallback to Cache/Home
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request)
                        .then((res) => res || caches.match('/home.html'));
                })
        );
        return;
    }

    // B. Assets (JS, CSS, Images) -> Cache First, Fallback to Network
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});

// 4. NOTIFICATION CLICK (Opens Chat)
self.addEventListener('notificationclick', (event) => {
    const clickedNotification = event.notification;
    clickedNotification.close();

    // Get the specific URL (e.g., chat.html?user=xyz)
    const targetUrl = clickedNotification.data && clickedNotification.data.url 
        ? clickedNotification.data.url 
        : '/home.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If tab is open, focus it
            for (const client of clientList) {
                // Check if URL matches (ignoring query params for the match)
                if (client.url.includes(targetUrl.split('?')[0]) && 'focus' in client) {
                    if (targetUrl.includes('?')) client.navigate(targetUrl); // Update chat user
                    return client.focus();
                }
            }
            // If not open, open new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// 5. MESSAGE LISTENER (Triggered by Notification Worker)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const d = event.data.payload;
        self.registration.showNotification(d.title, {
            body: d.body,
            icon: d.icon,
            vibrate: [200, 100, 200],
            tag: 'chat-msg',
            data: { url: d.url }
        });
    }
});
