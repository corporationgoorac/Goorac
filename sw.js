const CACHE_NAME = 'goorac-quantum-v4'; // Incremented version
const ASSETS_TO_CACHE = [
    '/',
    '/home.html',
    '/chat.html',
    '/config.js',
    '/notification-worker.js',
    'https://cdn-icons-png.flaticon.com/128/3067/3067451.png',
    'https://cdn-icons-png.flaticon.com/512/3067/3067451.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const url of ASSETS_TO_CACHE) {
                try {
                    const res = await fetch(url);
                    if (res.ok) await cache.put(url, res);
                } catch (e) { /* Ignore missing files */ }
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).catch(() => caches.match('/home.html')));
        return;
    }
    event.respondWith(
        caches.match(event.request).then(res => res || fetch(event.request))
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data.url || '/home.html';
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl.split('?')[0]) && 'focus' in client) {
                    if (targetUrl.includes('?')) client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

// --- MESSAGE HANDLER (The Fix) ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const d = event.data.payload;
        
        // Safety Check to prevent "undefined" error
        if (!d) return console.error("SW: Payload is missing!");

        self.registration.showNotification(d.title || "New Message", {
            body: d.body || "Open to view",
            icon: d.icon || 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
            vibrate: [200, 100, 200],
            tag: 'chat-msg',
            data: { url: d.url }
        });
    }
});
