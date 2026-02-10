// msgEngine.js - The Background Sync Core
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js');

let db;

// FORCE THE WORKER TO TAKE CONTROL IMMEDIATELY
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('message', (event) => {
    if (event.data.type === 'START_ENGINE') {
        const { config, uid } = event.data;
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
            db = firebase.firestore();
        }

        console.log("🚀 Sync Engine Active for UID:", uid);

        // Persistent Listener for all chats
        db.collection("chats")
          .where("participants", "array-contains", uid)
          .onSnapshot(snapshot => {
              snapshot.docChanges().forEach(async change => {
                  const chatData = change.doc.data();
                  const chatId = change.doc.id;

                  // 1. NOTIFICATION LOGIC (Only notify if not viewing chat)
                  if (change.type === "modified" && chatData.lastSender !== uid) {
                      const isFocused = await isChatFocused();
                      if (!isFocused) {
                          self.registration.showNotification("New Message", {
                              body: chatData.lastMessage || "Incoming transmission",
                              tag: chatId,
                              renotify: true
                          });
                      }
                  }

                  // 2. FETCH MESSAGES FOR CACHE
                  const msgSnap = await db.collection("chats").doc(chatId)
                                        .collection("messages")
                                        .orderBy("timestamp", "desc")
                                        .limit(15).get();

                  const msgs = msgSnap.docs.map(d => ({
                      id: d.id, ...d.data(),
                      timestampIso: d.data().timestamp?.toDate().toISOString()
                  }));

                  // 3. SEND TO MAIN THREAD FOR LOCAL STORAGE
                  const allClients = await self.clients.matchAll();
                  allClients.forEach(client => {
                      client.postMessage({
                          type: 'SYNC_UPDATE',
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

async function isChatFocused() {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    return windowClients.some(c => c.focused && c.url.includes('chat.html'));
}
