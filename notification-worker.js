import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        startListening(e.data.uid, e.data.config);
    }
};

function startListening(myUid, firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Query: Chats where I am a participant
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", myUid)
    );

    let isFirstRun = true;

    onSnapshot(q, (snapshot) => {
        // Skip the initial load to prevent spamming old notifications
        if (isFirstRun) {
            isFirstRun = false;
            return;
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();

                // 1. Ignore my own messages
                if (data.lastSender === myUid) return;

                // 2. Check Unread Count
                const myUnread = data.unreadCount && data.unreadCount[myUid] ? data.unreadCount[myUid] : 0;
                
                // 3. Check Timestamp (Must be recent, e.g., last 60 seconds)
                const now = Date.now();
                const msgTime = data.lastTimestamp ? data.lastTimestamp.toMillis() : 0;
                
                if (myUnread > 0 && (now - msgTime) < 60000) {
                    // Determine Body Text
                    let body = data.lastMessage || "New Message";
                    if (data.imageUrl && !data.text) body = "📷 Sent a photo";
                    if (data.fileUrl && !data.text) body = "📄 Sent a file";

                    // Send to Main Thread
                    self.postMessage({
                        type: 'FOUND_MESSAGE',
                        payload: {
                            title: "New Message",
                            body: body,
                            icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
                            url: `chat.html?user=${data.lastSenderName || 'unknown'}`
                        }
                    });
                }
            }
        });
    });
}
