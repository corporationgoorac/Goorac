// msgEngine.js
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js');

let db;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('message', (event) => {
    if (event.data.type === 'START_ENGINE') {
        const { config, uid } = event.data;
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
            db = firebase.firestore();
        }

        db.collection("chats")
          .where("participants", "array-contains", uid)
          .onSnapshot(snapshot => {
              snapshot.docChanges().forEach(async change => {
                  const chatData = change.doc.data();
                  const chatId = change.doc.id;

                  // 1. SMART NOTIFICATION LOGIC
                  if (change.type === "modified" && chatData.lastSender !== uid) {
                      // Check if the user is already looking at THIS specific chat
                      const isVisible = await isChatVisible(chatId);
                      if (!isVisible) {
                          showPush(chatData, chatId);
                      }
                  }

                  // 2. FETCH DATA FOR LOCAL STORAGE
                  const msgSnap = await db.collection("chats").doc(chatId)
                                        .collection("messages")
                                        .orderBy("timestamp", "desc")
                                        .limit(15).get();

                  const msgs = msgSnap.docs.map(d => ({
                      id: d.id, ...d.data(),
                      timestampIso: d.data().timestamp?.toDate().toISOString()
                  }));

                  // 3. BROADCAST TO BRIDGE (sync-loader.js)
                  const allClients = await self.clients.matchAll();
                  allClients.forEach(client => {
                      client.postMessage({
                          type: 'SYNC_DATA',
                          chatId: chatId,
                          meta: chatData,
                          messages: msgs,
                          myUid: uid
                      });
                  });
              });
          });
    }
});

// Helper to detect if the specific chat is currently open and focused
async function isChatVisible(chatId) {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
        const url = new URL(client.url);
        // Check if the URL contains the target user or matches chat.html
        if (client.focused && url.pathname.includes('chat.html')) {
            return true; 
        }
    }
    return false;
}

function showPush(chat, chatId) {
    self.registration.showNotification("New Message", {
        body: chat.lastMessage || "You received a transmission",
        icon: "/icon.png", 
        badge: "/badge.png",
        tag: chatId, // Using chatId as tag group notifications by conversation
        renotify: true,
        data: { url: '/messages.html' }
    });
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
