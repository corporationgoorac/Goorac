import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        self.postMessage({ type: 'LOG', msg: "Worker Listening for " + e.data.uid });
        startListening(e.data.uid, e.data.config);
    }
    // PING TEST
    if (e.data.type === 'PING') {
        self.postMessage({ type: 'LOG', msg: "✅ PONG! Worker is Alive." });
        // Force a test notification to prove it works
        self.postMessage({
            type: 'FOUND_MESSAGE',
            payload: {
                title: "Worker Test",
                body: "This confirms the Worker -> Home -> SW chain is fixed.",
                icon: "https://cdn-icons-png.flaticon.com/512/3067/3067451.png",
                url: "chat.html"
            }
        });
    }
};

function startListening(myUid, firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", myUid)
    );

    let isFirstRun = true;

    onSnapshot(q, (snapshot) => {
        // Skip existing messages on first load
        if (isFirstRun) {
            isFirstRun = false;
            return;
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();
                
                // 1. Check Sender (Ignore own)
                if (data.lastSender === myUid) return;

                // 2. Check Unread
                const myUnread = data.unreadCount && data.unreadCount[myUid] ? data.unreadCount[myUid] : 0;
                
                // 3. Time Window (10 minutes)
                const now = Date.now();
                const msgTime = data.lastTimestamp ? data.lastTimestamp.toMillis() : 0;

                if (myUnread > 0 && (now - msgTime) < 600000) {
                    
                    // console.log("🔔 Real Message Found!");

                    // --- CRITICAL FIX: WRAP IN 'payload' ---
                    self.postMessage({
                        type: 'FOUND_MESSAGE',
                        payload: {
                            title: data.lastSenderName || "New Message",
                            body: data.lastMessage || "You have a new message",
                            icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
                            url: `chat.html?user=${data.lastSenderName || 'unknown'}`
                        }
                    });
                }
            }
        });
    });
}
