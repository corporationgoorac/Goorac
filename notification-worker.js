import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let db;
let unsubscribe = null;

// 1. Listen for START command from config.js
self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        const { uid, config } = e.data;
        startBackgroundListener(uid, config);
    }
};

function startBackgroundListener(myUid, firebaseConfig) {
    if (unsubscribe) return; // Prevent double starting

    // Initialize a separate Firebase instance for this thread
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    self.postMessage({ type: 'LOG', msg: `Listening for messages for user: ${myUid}` });

    // 2. Query: Find chats where I am a participant
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", myUid)
    );

    // 3. Real-time Listener (Runs in background)
    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            
            // Only care about Modified/Added chats
            if (change.type === "added" || change.type === "modified") {
                
                // Rule 1: Not sent by me
                if (data.lastSender && data.lastSender !== myUid) {
                    
                    // Rule 2: I have unread messages
                    const myUnread = data.unreadCount ? data.unreadCount[myUid] : 0;

                    if (myUnread > 0) {
                        // Rule 3: Must be RECENT (sent in last 10 seconds)
                        // This prevents 50 notifications popping up when you refresh the page
                        const msgTime = data.lastTimestamp ? data.lastTimestamp.toMillis() : 0;
                        const now = Date.now();
                        
                        if (now - msgTime < 10000) { 
                            sendNotification(data);
                        }
                    }
                }
            }
        });
    });
}

function sendNotification(chatData) {
    const title = "New Message";
    const body = chatData.lastMessage || "You have a new message";
    
    // Check Permission inside Worker
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png', // Goorac Icon
            tag: 'chat-msg', // Prevents stack of identical notifications
            vibrate: [200, 100, 200]
        });
    }
}
