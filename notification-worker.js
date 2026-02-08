import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        startListening(e.data.uid, e.data.config);
    }
    if (e.data.type === 'PING') {
        self.postMessage({ type: 'LOG', msg: "✅ Worker Connected" });
        // Send Test Notification
        self.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
                title: "Worker Test",
                body: "If you see this, notifications are fixed.",
                icon: "https://cdn-icons-png.flaticon.com/512/3067/3067451.png"
            }
        });
    }
};

function startListening(myUid, firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const q = query(collection(db, "chats"), where("participants", "array-contains", myUid));
    let isFirstRun = true;

    onSnapshot(q, (snapshot) => {
        if (isFirstRun) { isFirstRun = false; return; }

        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();
                if (data.lastSender === myUid) return;

                const myUnread = data.unreadCount?.[myUid] || 0;
                const now = Date.now();
                const msgTime = data.lastTimestamp?.toMillis() || 0;

                // Check Unread + Time (10 mins)
                if (myUnread > 0 && (now - msgTime) < 600000) {
                    self.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        payload: {
                            title: data.lastSenderName || "New Message",
                            body: data.lastMessage || "Check your app",
                            icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
                            url: `chat.html?user=${data.lastSenderName || ''}`
                        }
                    });
                }
            }
        });
    });
}
