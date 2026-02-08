import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        console.log("👷 WORKER STARTED: Listening for user", e.data.uid);
        startListening(e.data.uid, e.data.config);
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
        // Skip initial load to prevent spam
        if (isFirstRun) {
            isFirstRun = false;
            return;
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();
                const chatId = change.doc.id;

                // LOGIC DEBUGGING
                // 1. Check Sender
                if (data.lastSender === myUid) {
                    // console.log(`[Ignore] Own message in ${chatId}`);
                    return;
                }

                // 2. Check Unread Count
                const myUnread = data.unreadCount && data.unreadCount[myUid] ? data.unreadCount[myUid] : 0;
                if (myUnread === 0) {
                    // console.log(`[Ignore] Message already read in ${chatId}`);
                    return;
                }
                
                // 3. Check Timestamp (Flexible Logic)
                const now = Date.now();
                let msgTime = now; // Default to 'now' if timestamp is pending
                
                if (data.lastTimestamp && typeof data.lastTimestamp.toMillis === 'function') {
                    msgTime = data.lastTimestamp.toMillis();
                }

                const timeDiff = now - msgTime;
                // Allow messages up to 10 minutes old (600,000 ms) to account for lag
                if (timeDiff < 600000) {
                    
                    console.log(`🔔 NOTIFICATION TRIGGERED for ${chatId}`);

                    // Prepare Body
                    let body = data.lastMessage || "New Message";
                    if (data.imageUrl && !data.text) body = "📷 Sent a photo";
                    if (data.fileUrl && !data.text) body = "📄 Sent a file";

                    // Send Signal
                    self.postMessage({
                        type: 'FOUND_MESSAGE',
                        payload: {
                            title: "New Message",
                            body: body,
                            icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
                            url: `chat.html?user=${data.lastSenderName || 'unknown'}`
                        }
                    });
                } else {
                    console.log(`[Ignore] Message too old (${Math.floor(timeDiff/1000)}s ago)`);
                }
            }
        });
    });
}
