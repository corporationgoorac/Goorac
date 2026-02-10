// components/presence.js

// 1. Import the necessary functions from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase, ref, onValue, onDisconnect, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
// NEW: Import Firestore for suspension check
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

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
const firestore = getFirestore(app);

// 4. THE LOGIC CORE (Runs automatically)
onAuthStateChanged(auth, (user) => {
    if (user) {
        const uid = user.uid;

        // --- A. EXISTING PRESENCE LOGIC ---
        const userStatusDatabaseRef = ref(db, '/status/' + uid);
        const connectedRef = ref(db, '.info/connected');

        const isOffline = {
            state: 'offline',
            last_changed: serverTimestamp(),
        };

        const isOnline = {
            state: 'online',
            last_changed: serverTimestamp(),
        };

        onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === false) {
                return;
            }
            onDisconnect(userStatusDatabaseRef).set(isOffline).then(() => {
                set(userStatusDatabaseRef, isOnline);
            });
        });

        // --- B. NEW SUSPENSION ENFORCER ---
        const userDocRef = doc(firestore, "users", uid);
        
        // Real-time listener: Triggers instantly if admin suspends user
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                if (data.suspended === true) {
                    // Trigger the Lockout UI
                    renderLockoutScreen();
                    
                    // Kick out after 5 seconds
                    setTimeout(() => {
                        signOut(auth).then(() => {
                            window.location.href = "login.html";
                        });
                    }, 5000);
                }
            }
        });
    }
});

// Helper: Injects the professional lockout popup into the page
function renderLockoutScreen() {
    // Prevent duplicates
    if (document.getElementById('nexus-lockout')) return;

    const overlay = document.createElement('div');
    overlay.id = 'nexus-lockout';
    overlay.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&family=Inter:wght@400;600&display=swap');
            #nexus-lockout {
                position: fixed; inset: 0; background: #000; z-index: 999999;
                display: flex; align-items: center; justify-content: center;
                animation: fadeIn 0.3s ease-out; font-family: 'Inter', sans-serif;
            }
            .lock-box {
                background: #0a0a0a; border: 1px solid #333; padding: 40px;
                border-radius: 20px; text-align: center; max-width: 400px; width: 90%;
                box-shadow: 0 0 50px rgba(255, 42, 109, 0.2);
                border-top: 4px solid #ff2a6d;
            }
            .lock-icon { 
                font-size: 48px; color: #ff2a6d; margin-bottom: 20px; 
                animation: pulse 1.5s infinite;
            }
            .lock-title { 
                color: #fff; font-size: 24px; font-weight: 800; margin-bottom: 10px; 
                letter-spacing: -1px;
            }
            .lock-msg { 
                color: #888; font-size: 14px; line-height: 1.6; margin-bottom: 30px; 
            }
            .lock-timer {
                font-family: 'JetBrains Mono', monospace; background: #111; color: #ff2a6d;
                padding: 10px 20px; border-radius: 8px; font-size: 12px; display: inline-block;
                border: 1px solid #333;
            }
            @keyframes pulse { 0% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.5; transform: scale(0.95); } }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        </style>
        <div class="lock-box">
            <div class="lock-icon">🚫</div>
            <div class="lock-title">ACCOUNT SUSPENDED</div>
            <div class="lock-msg">
                Your access to this platform has been revoked by the administrator due to a policy violation.
            </div>
            <div class="lock-timer">TERMINATING SESSION IN 5s...</div>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Optional: Export app/auth/db/firestore if you want to use them in other scripts
export { app, auth, db, firestore };
