import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

self.onmessage = async (e) => {
    // Start listening when the main page sends the 'START' signal
    if (e.data.type === 'START') {
        startListening(e.data.uid, e.data.config);
    }
};

function startListening(myUid, firebaseConfig) {
    // Initialize a separate Firebase instance just for the worker
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const q = query(collection(db, "chats"), where("participants", "array-contains", myUid));
    let isFirstRun = true;

    onSnapshot(q, (snapshot) => {
        // Skip the first run so we don't get notifications for old messages immediately
        if (isFirstRun) { isFirstRun = false; return; }

        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();
                
                // Don't notify if I sent the message
                if (data.lastSender === myUid) return;

                const myUnread = data.unreadCount?.[myUid] || 0;
                const now = Date.now();
                // Safety check for timestamp
                const msgTime = data.lastTimestamp?.toMillis() || now; 

                // Notify only if Unread > 0 AND message is recent (less than 10 mins old)
                if (myUnread > 0 && (now - msgTime) < 600000) {
                    showNotification(
                        data.lastSenderName || "New Message",
                        data.lastMessage || "Check your app"
                    );
                }
            }
        });
    });
}

function showNotification(title, body) {
    // We check permission here, but permission MUST be granted in home.html first
    if (Notification.permission === 'granted') {
        try {
            // Direct notification from Worker
            new Notification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
                // Note: Workers cannot handle 'onclick' to focus window easily.
            });
        } catch (e) {
            console.error("Worker Notification Error: ", e);
        }
    } else {
        console.log("Permission not granted. Allow notifications in the browser.");
    }
}
