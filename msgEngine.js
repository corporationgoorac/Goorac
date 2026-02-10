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

                  // 1. NOTIFICATION LOGIC (Only if not looking at chat)
                  if (change.type === "modified" && chatData.lastSender !== uid) {
                      const isVisible = await isChatOpen(chatId);
                      if (!isVisible) {
                          self.registration.showNotification("Goorac Transmission", {
                              body: chatData.lastMessage || "New message received",
                              icon: "/icon.png", 
                              tag: chatId,
                              renotify: true,
                              data: { url: '/messages.html' }
                          });
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

                  // 3. SEND TO HOME PAGE
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

async function isChatOpen(chatId) {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
        if (client.focused && client.url.includes('chat.html')) return true;
    }
    return false;
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
