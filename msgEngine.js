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

        // GLOBAL LISTENER: Watch for ANY change in your chats
        db.collection("chats")
          .where("participants", "array-contains", uid)
          .onSnapshot(snapshot => {
              snapshot.docChanges().forEach(async change => {
                  const chatId = change.doc.id;
                  const chatData = change.doc.data();

                  // Fetch latest 15 messages for this specific chat
                  const msgSnap = await db.collection("chats").doc(chatId)
                                        .collection("messages")
                                        .orderBy("timestamp", "desc")
                                        .limit(15).get();

                  const messages = msgSnap.docs.map(d => ({
                      id: d.id,
                      ...d.data(),
                      // Convert to ISO string for LocalStorage compatibility
                      timestampIso: d.data().timestamp?.toDate().toISOString(),
                      seenAtIso: d.data().seenAt?.toDate().toISOString()
                  }));

                  // BROADCAST: Send data to the visible page (Bridge)
                  const allClients = await self.clients.matchAll();
                  allClients.forEach(client => {
                      client.postMessage({
                          type: 'SYNC_UPDATE',
                          chatId: chatId,
                          chatMeta: chatData, // Includes unreadCount, lastMessage, etc.
                          messages: messages
                      });
                  });
              });
          });
    }
});
