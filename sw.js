/**
 * GOORAC QUANTUM SERVICE WORKER v11.1
 * Handles:
 * 1. Background Activity Status (Zero-Flicker + Closure Detection)
 * 2. Asset Caching (PWA Support)
 */

const CACHE_NAME = 'goorac-quantum-v11'; 
const ASSETS = [
    '/',
    '/home.html',
    '/chat.html',
    '/config.js',
    '/sync-loader.js',
    'https://cdn-icons-png.flaticon.com/128/3067/3067451.png',
    'https://cdn-icons-png.flaticon.com/512/3067/3067451.png'
];

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js');

let db, rdb;
let presenceTimer = null;
let heartbeatTimer = null;

// --- 1. INSTALLATION & CACHING ---
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => Promise.all(ASSETS.map(url => c.add(url).catch(console.warn)))));
});

// --- 2. ACTIVATION ---
self.addEventListener('activate', (e) => {
    e.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))]));
});

// --- 3. FETCH ---
self.addEventListener('fetch', (e) => {
    if (e.request.mode === 'navigate') e.respondWith(fetch(e.request).catch(() => caches.match('/home.html')));
    else e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

// --- 4. NOTIFICATIONS ---
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/home.html'));
});

// --- 5. ACTIVITY STATUS ENGINE ---
self.addEventListener('message', (event) => {
    if (event.data.type === 'START_ACTIVITY_ENGINE') {
        const { config, uid } = event.data;
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
            db = firebase.firestore();
            rdb = firebase.database();
        }
        runBackgroundActivitySync(uid);
    }
    
    // HEARTBEAT FIX: Tab tells worker it is still open
    if (event.data.type === 'HEARTBEAT') {
        resetHeartbeatTimer(event.data.uid);
    }
});

function resetHeartbeatTimer(uid) {
    if (!rdb) return;
    const statusRef = rdb.ref('/status/' + uid);
    
    clearTimeout(heartbeatTimer);
    
    // If no heartbeat received for 10 seconds, assume app is closed
    heartbeatTimer = setTimeout(() => {
        statusRef.set({
            state: 'offline',
            last_changed: firebase.database.ServerValue.TIMESTAMP
        });
        console.log("🛑 App closed: Setting Offline");
    }, 10000); 
}

function runBackgroundActivitySync(uid) {
    const statusRef = rdb.ref('/status/' + uid);
    const connectedRef = rdb.ref('.info/connected');
    const userDocRef = db.collection("users").doc(uid);

    const offlineState = { state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP };
    const onlineState = { state: 'online', last_changed: firebase.database.ServerValue.TIMESTAMP };

    userDocRef.onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();

        if (data.showActivityStatus === undefined) {
            userDocRef.update({ showActivityStatus: true });
        }

        const isActivityAllowed = data.showActivityStatus !== false;
        const isSuspended = data.suspended === true;

        connectedRef.on('value', (snapshot) => {
            if (snapshot.val() === false) return;

            clearTimeout(presenceTimer);

            // Zero-Flicker Page Transition Logic
            presenceTimer = setTimeout(() => {
                if (isActivityAllowed && !isSuspended) {
                    statusRef.set(onlineState);
                } else {
                    statusRef.set(offlineState);
                }
            }, 4000); 
        });
    });
}
