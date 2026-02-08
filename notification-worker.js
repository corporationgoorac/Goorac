import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let db;
let unsubscribe = null;

// 1. Listen for the "Start" command from the Home Page
self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        const { uid, config } = e.data;
        startBackgroundListener(uid, config);
    }
};

function startBackgroundListener(myUid, firebaseConfig) {
    if (unsubscribe) return; // Already running

    // Initialize Firebase inside the Worker
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    console.log("👷 Notification Worker: Started for user", myUid);

    // 2. Query: Find all chats where I am a participant
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", myUid)
    );

    // 3. Real-time Listener
    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            
            // We only care if a message was ADDED or MODIFIED (New message arrived)
            if (change.type === "added" || change.type === "modified") {
                
                // CHECK 1: Did someone else send the last message?
                if (data.lastSender && data.lastSender !== myUid) {
                    
                    // CHECK 2: Do I have unread messages?
                    // Access the nested unread count: unreadCount['myUid']
                    const myUnread = data.unreadCount ? data.unreadCount[myUid] : 0;

                    if (myUnread > 0) {
                        // CHECK 3: Is this actually a NEW update? (Prevent spam on reload)
                        // We compare the timestamp roughly to "now" to ensure we don't notify for old stuff
                        const msgTime = data.lastTimestamp ? data.lastTimestamp.toMillis() : 0;
                        const now = Date.now();
                        
                        // Only notify if message is recent (less than 10 seconds old)
                        // OR if it's the first time we are loading and we see unread items
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
    const title = `New Message`;
    const body = chatData.lastMessage || "You have a new message";
    
    // We assume the worker cannot open windows, so we use the Notification API
    // The click action is handled by the browser focusing the tab
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png', // App Icon
            tag: 'chat-msg', // Prevents duplicate stacks
            vibrate: [200, 100, 200]
        });
    }
}
