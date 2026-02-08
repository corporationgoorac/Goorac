import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

self.onmessage = async (e) => {
    if (e.data.type === 'START') {
        console.log("🔧 TEST WORKER STARTED: Listening for UID", e.data.uid);
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

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            // DEBUG: Log everything
            console.log("🔥 DB CHANGE DETECTED:", change.type);
            
            // IGNORE "added" on first load (too noisy), only look for "modified"
            if (change.type === "modified") {
                const data = change.doc.data();
                
                console.log("🔔 SENDING NOTIFICATION SIGNAL...");
                
                // SEND SIGNAL TO MAIN PAGE (Even if it's my own message)
                self.postMessage({
                    type: 'FOUND_MESSAGE',
                    title: "Test Notification",
                    body: data.lastMessage || "Database updated!",
                    icon: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png',
                    url: `chat.html?user=${data.lastSender}` 
                });
            }
        });
    });
}
