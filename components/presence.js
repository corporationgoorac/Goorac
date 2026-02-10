// components/presence.js

// 1. Import the necessary functions from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase, ref, onValue, onDisconnect, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// 2. Your Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
    authDomain: "goorac-c3b59.firebaseapp.com",
    projectId: "goorac-c3b59",
    storageBucket: "goorac-c3b59.firebasestorage.app",
    messagingSenderId: "746746595332",
    appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
    measurementId: "G-M46FEVRYSS"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// 4. THE PRESENCE LOGIC (Runs automatically)
onAuthStateChanged(auth, (user) => {
    if (user) {
        const uid = user.uid;

        // References
        const userStatusDatabaseRef = ref(db, '/status/' + uid);
        const connectedRef = ref(db, '.info/connected');

        // Status Objects
        const isOffline = {
            state: 'offline',
            last_changed: serverTimestamp(),
        };

        const isOnline = {
            state: 'online',
            last_changed: serverTimestamp(),
        };

        // Watch for connection state
        onValue(connectedRef, (snapshot) => {
            // If lost connection to server, stop.
            if (snapshot.val() === false) {
                return;
            }

            // OnDisconnect: If the browser closes/crashes, server writes "offline"
            onDisconnect(userStatusDatabaseRef).set(isOffline).then(() => {
                // If we are here, we are connected, so write "online"
                set(userStatusDatabaseRef, isOnline);
            });
        });
    }
});

// Optional: Export app/auth/db if you want to use them in other scripts
export { app, auth, db };
