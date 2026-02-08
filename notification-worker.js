import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        // console.log("Worker Started");
        startListening(e.data.uid, e.data.config);
    }
};

function startListening(myUid, firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Watch chats where I am a participant
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", myUid)
    );

    let isFirstRun = true;

    onSnapshot(q, (snapshot) => {
        // 1. Ignore the initial database dump (prevent old notifications)
        if (isFirstRun) {
            isFirstRun = false;
            return;
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();
                
                // 2. LOGIC: Filter out invalid notifications
                if (data.lastSender === myUid) return; // Don't notify for my own msg

                const myUnread = data.unreadCount && data.unreadCount[myUid] ? data.unreadCount[myUid] : 0;
                if (myUnread === 0) return; // Only notify if unread

                // 3. LOGIC: Time Window (10 Minutes)
                const now = Date.now();
                const msgTime = data.lastTimestamp ? data.lastTimestamp.toMillis() : 0;
                
                if ((now - msgTime) < 600000) {
                    // 4. Construct the Notification Data
                    let title = data.lastSenderName || "New Message";
                    let body = data.lastMessage || "Check your app";
                    
                    // Handle media types text
                    if (data.imageUrl && !data.text) body = "📷 Sent a photo";
                    if (data.fileUrl && !data.text) body = "📄 Sent a file";

                    // 5. COMMAND: Tell Home Page to show it
                    self.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        payload: {
                            title: title,
                            body: body,
                            icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
                            url: `chat.html?user=${data.lastSenderName || ''}`
                        }
                    });
                }
            }
        });
    });
}
