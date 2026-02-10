// msgEngine.js - The Background Sync Engine
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js');

let db;
let initialized = false;

// 1. Listen for the "Start" command from your Home Page
self.addEventListener('message', (event) => {
    if (event.data.type === 'START_ENGINE' && !initialized) {
        const config = event.data.config;
        const uid = event.data.uid;
        
        firebase.initializeApp(config);
        db = firebase.firestore();
        initialized = true;

        console.log("🚀 msgEngine: Background Sync Started for", uid);
        startGlobalListener(uid);
    }
});

// 2. The Persistent Listener
function startGlobalListener(uid) {
    // Listen for any chat where the user is a participant
    db.collection("chats")
      .where("participants", "array-contains", uid)
      .onSnapshot(snapshot => {
          snapshot.docChanges().forEach(change => {
              if (change.type === "added" || change.type === "modified") {
                  const chatId = change.doc.id;
                  syncChatData(chatId);
              }
          });
      }, err => console.error("Sync Error:", err));
}

async function syncChatData(chatId) {
    // Fetch only the last 10 messages (Firebase Read Limit Optimization)
    const snap = await db.collection("chats").doc(chatId)
                         .collection("messages")
                         .orderBy("timestamp", "desc")
                         .limit(10).get();

    const messages = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            // Convert Firestore timestamp to ISO string for LocalStorage compatibility
            timestampIso: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
        };
    });

    // 3. Broadcast to ALL open tabs (chat.html, messages.html, etc.)
    const allClients = await self.clients.matchAll();
    allClients.forEach(client => {
        client.postMessage({
            type: 'UPDATE_LOCAL_STORAGE',
            chatId: chatId,
            data: messages
        });
    });
}
