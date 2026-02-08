const CACHE_NAME = 'goorac-quantum-v9';
const ASSETS = [
    '/',
    '/home.html',
    '/chat.html',
    '/config.js',
    '/notification-worker.js',
    'https://cdn-icons-png.flaticon.com/128/3067/3067451.png',
    'https://cdn-icons-png.flaticon.com/512/3067/3067451.png'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => {
        return Promise.all(ASSETS.map(url => c.add(url).catch(console.warn)));
    }));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    if (e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request).catch(() => caches.match('/home.html')));
    } else {
        e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
    }
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = e.notification.data?.url || '/home.html';
    e.waitUntil(clients.openWindow(url));
});
