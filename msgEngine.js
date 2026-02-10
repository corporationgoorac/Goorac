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

        // 1. Monitor all chats for unread changes and new messages
        db.collection("chats")
          .where("participants", "array-contains", uid)
          .onSnapshot(snapshot => {
              snapshot.docChanges().forEach(async change => {
                  const chatId = change.doc.id;
                  const chatMeta = change.doc.data();

                  // 2. Fetch the latest slice of messages for instant chat loading
                  const msgSnap = await db.collection("chats").doc(chatId)
                                        .collection("messages")
                                        .orderBy("timestamp", "desc")
                                        .limit(15).get();

                  const messages = msgSnap.docs.map(d => ({
                      id: d.id,
                      ...d.data(),
                      timestampIso: d.data().timestamp?.toDate().toISOString()
                  }));

                  // 3. Broadcast to the Bridge (Home Page) to save immediately
                  const allClients = await self.clients.matchAll();
                  allClients.forEach(client => {
                      client.postMessage({
                          type: 'SYNC_COMPLETE',
                          chatId: chatId,
                          meta: chatMeta,
                          messages: messages
                      });
                  });
              });
          });
    }
});
