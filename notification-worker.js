import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
let db;
let unsubscribe = null;
let isFirstRun = true; // Prevents spam on startup

// --- LISTEN FOR COMMANDS ---
self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        console.log("✅ [WORKER] Starting Listener for User:", e.data.uid);
        startBackgroundListener(e.data.uid, e.data.config);
    }
};

function startBackgroundListener(myUid, firebaseConfig) {
    if (unsubscribe) return; // Already running

    // 1. Initialize Firebase inside Worker
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    // 2. Query: Find chats where I am a participant
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", myUid)
    );

    // 3. Start Realtime Listener
    unsubscribe = onSnapshot(q, (snapshot) => {
        
        // If this is the very first connection, just mark as loaded and ignore
        // Otherwise, you get notifications for old unread messages on every refresh.
        if (isFirstRun) {
            console.log(`[WORKER] Initial load complete. Found ${snapshot.size} chats.`);
            isFirstRun = false;
            return;
        }

        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const docId = change.doc.id;

            // We only care if a chat was MODIFIED (New message update)
            // 'added' is usually just loading old chats we haven't seen in this session
            if (change.type === "modified") {
                
                console.log(`[WORKER] Chat Update Detected: ${docId}`);

                // CHECK 1: Did I send this? (Ignore my own messages)
                if (data.lastSender === myUid) {
                    console.log("   -> Ignoring: I am the sender.");
                    return;
                }

                // CHECK 2: Do I have unread messages?
                // Your chat.html uses: unreadCount['myUid']
                const myUnreadCount = data.unreadCount ? data.unreadCount[myUid] : 0;
                
                if (myUnreadCount > 0) {
                    
                    // CHECK 3: Is it Recent? (Within last 60 seconds)
                    // This handles the "background" logic. If the message is 2 days old, don't notify.
                    let msgTime = 0;
                    if (data.lastTimestamp && typeof data.lastTimestamp.toMillis === 'function') {
                        msgTime = data.lastTimestamp.toMillis();
                    } else {
                        msgTime = Date.now(); // Fallback if timestamp missing
                    }

                    const timeDiff = Date.now() - msgTime;
                    console.log(`   -> Unread: ${myUnreadCount}, Age: ${timeDiff}ms`);

                    if (timeDiff < 60000) { // 60 Seconds Window
                        console.log("   🔔 TRIGGERING NOTIFICATION!");
                        sendNotification(data);
                    } else {
                        console.log("   -> Ignored: Message too old.");
                    }
                } else {
                    console.log("   -> Ignored: Unread count is 0.");
                }
            }
        });
    });
}

function sendNotification(chatData) {
    const title = "New Message";
    
    // Logic to handle "Image", "Video", etc. based on your chat.html logic
    let body = chatData.lastMessage || "Sent a message";
    
    // Check Permission
    if (Notification.permission === "granted") {
        try {
            const notif = new Notification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png', // Goorac Icon
                badge: 'https://cdn-icons-png.flaticon.com/128/3067/3067451.png',
                tag: 'chat-msg', // Prevents stacking
                vibrate: [200, 100, 200],
                requireInteraction: false // Disappear automatically
            });

            // Handle Click (Focus the window)
            notif.onclick = function() {
                self.clients.matchAll({ type: 'window' }).then(clients => {
                    if (clients && clients.length) {
                        clients[0].focus(); // Focus existing tab
                    } else {
                        self.clients.openWindow('/'); // Open new if closed (PWA style)
                    }
                });
                notif.close();
            };
        } catch (e) {
            console.error("[WORKER] Notification Error:", e);
        }
    } else {
        console.log("[WORKER] Permission not granted.");
    }
}
