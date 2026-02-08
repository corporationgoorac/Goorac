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

    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", myUid)
    );

    let isFirstRun = true;

    onSnapshot(q, (snapshot) => {
        if (isFirstRun) { isFirstRun = false; return; }

        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();
                if (data.lastSender === myUid) return; // Ignore own

                const myUnread = data.unreadCount?.[myUid] || 0;
                
                // Flexible time window (10 mins) to catch everything
                const now = Date.now();
                const msgTime = data.lastTimestamp?.toMillis() || 0;

                if (myUnread > 0 && (now - msgTime) < 600000) {
                    // Send Clean Data to Main Thread
                    self.postMessage({
                        type: 'SHOW_NOTIF', // Simple Command
                        title: data.lastSenderName || "New Message",
                        body: data.lastMessage || "Check your messages",
                        url: `chat.html?user=${data.lastSenderName || ''}`
                    });
                }
            }
        });
    });
}
