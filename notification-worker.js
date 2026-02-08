import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
let db;
let unsubscribe = null;
let isFirstRun = true;

// --- LISTEN FOR START COMMAND ---
self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        // console.log("👷 WORKER: Starting listener for User:", e.data.uid);
        startBackgroundListener(e.data.uid, e.data.config);
    }
};

function startBackgroundListener(myUid, firebaseConfig) {
    if (unsubscribe) return; // Prevent double listeners

    // 1. Initialize Firebase (Worker Instance)
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    // 2. Query: Listen to all chats where I am a participant
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", myUid)
    );

    // 3. Start Real-time Listener
    unsubscribe = onSnapshot(q, (snapshot) => {
        
        // IGNORE INITIAL LOAD (Prevents spamming notifications for old messages)
        if (isFirstRun) {
            isFirstRun = false;
            return;
        }

        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            
            // We only care if a chat was MODIFIED (New message) or ADDED (New chat)
            if (change.type === "modified" || change.type === "added") {
                
                // CHECK 1: Did I send this? (Ignore my own messages)
                if (data.lastSender && data.lastSender !== myUid) {
                    
                    // CHECK 2: Do I have unread messages?
                    // Your structure uses: unreadCount['uid']
                    const myUnread = data.unreadCount ? data.unreadCount[myUid] : 0;

                    if (myUnread > 0) {
                        
                        // CHECK 3: Is it Recent? (Sent within last 30 seconds)
                        // This prevents notifications if you wake up the phone and data syncs from 2 days ago
                        let msgTime = Date.now();
                        if (data.lastTimestamp && typeof data.lastTimestamp.toMillis === 'function') {
                            msgTime = data.lastTimestamp.toMillis();
                        }

                        const timeDiff = Date.now() - msgTime;

                        // Only notify if message is less than 30 seconds old
                        if (timeDiff < 30000) { 
                            
                            // PREPARE NOTIFICATION DATA
                            let bodyText = data.lastMessage || "New Message";
                            
                            // Clean up standard prefixes if present in your lastMessage
                            // (e.g., if you store "📷 Image", we keep it, otherwise generic)
                            if(data.imageUrl && !data.text) bodyText = "📷 Sent a photo";
                            if(data.fileUrl && !data.text) bodyText = "📄 Sent a file";

                            // SEND SIGNAL TO MAIN THREAD
                            // We bridge to Main Thread -> Service Worker because 
                            // standard Workers cannot trigger persistent notifications on all Android versions.
                            self.postMessage({
                                type: 'FOUND_MESSAGE',
                                title: "New Message", // You can try fetching user name here if you want, but "New Message" is faster
                                body: bodyText,
                                icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png', // Replace with your app icon URL
                                url: `chat.html?user=${data.lastSender}`, // This opens the specific chat
                                senderUid: data.lastSender
                            });
                        }
                    }
                }
            }
        });
    });
}
