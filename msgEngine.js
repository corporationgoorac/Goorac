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

        // 1. Monitor all chats for unread changes
        db.collection("chats")
          .where("participants", "array-contains", uid)
          .onSnapshot(snapshot => {
              snapshot.docChanges().forEach(async change => {
                  const chatId = change.doc.id;
                  const chatMeta = change.doc.data();
                  const otherUid = chatMeta.participants.find(id => id !== uid);

                  // 2. Fetch latest messages for chat.html instant-load
                  const msgSnap = await db.collection("chats").doc(chatId)
                                        .collection("messages")
                                        .orderBy("timestamp", "desc")
                                        .limit(10).get();

                  const messages = msgSnap.docs.map(d => ({
                      id: d.id,
                      ...d.data(),
                      timestampIso: d.data().timestamp?.toDate().toISOString()
                  }));

                  // 3. Broadcast to the Bridge (Home Page)
                  const allClients = await self.clients.matchAll();
                  allClients.forEach(client => {
                      client.postMessage({
                          type: 'INBOX_SYNC',
                          chatId: chatId,
                          meta: chatMeta,
                          otherUid: otherUid,
                          messages: messages
                      });
                  });
              });
          });
    }
});
