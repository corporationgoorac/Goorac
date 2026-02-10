// components/presence.js

// 1. We remove the hardcoded imports and config to use the shared global instance
// This prevents "Firebase App named '[DEFAULT]' already exists" errors

let app, auth, firestore, rdb;

// 2. Initialize using the global core function (from config.js)
if (typeof window.initFirebaseCore === 'function') {
    window.initFirebaseCore();
    // Use the global instances created by config.js
    app = firebase.app(); // Get the default app
    auth = firebase.auth();
    firestore = firebase.firestore();
    rdb = firebase.database();
} else {
    // Fallback if config.js wasn't loaded (Safety net)
    // We use the compat libraries here to match the rest of your app's style
    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
            authDomain: "goorac-c3b59.firebaseapp.com",
            projectId: "goorac-c3b59",
            storageBucket: "goorac-c3b59.firebasestorage.app",
            messagingSenderId: "746746595332",
            appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
            measurementId: "G-M46FEVRYSS"
        });
    }
    app = firebase.app();
    auth = firebase.auth();
    firestore = firebase.firestore();
    rdb = firebase.database();
}

let presenceTimer;

auth.onAuthStateChanged((user) => {
    if (user) {
        const uid = user.uid;
        const userDocRef = firestore.collection("users").doc(uid);
        const statusRef = rdb.ref('/status/' + uid);
        const connectedRef = rdb.ref('.info/connected');

        const offlineState = { state: 'offline', last_changed: firebase.database.ServerValue.TIMESTAMP };
        const onlineState = { state: 'online', last_changed: firebase.database.ServerValue.TIMESTAMP };

        userDocRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                const data = docSnap.data();
                
                // --- 1. SUSPENSION CHECK ---
                if (data.suspended === true) {
                    renderLockoutScreen();
                    statusRef.set(offlineState);
                    return; 
                } else {
                    const existingLock = document.getElementById('nexus-lockout');
                    if (existingLock) {
                        existingLock.remove();
                        document.body.style.overflow = 'auto';
                    }
                }

                // --- 2. INITIALIZE PREFERENCE ---
                if (data.showActivityStatus === undefined) {
                    userDocRef.update({ showActivityStatus: true });
                }

                const isActivityEnabled = data.showActivityStatus !== false;

                // --- 3. DYNAMIC PRESENCE ENGINE ---
                // FIX: Remove old listeners to prevent multiple timers running at once
                connectedRef.off(); 

                connectedRef.on('value', (snapshot) => {
                    if (snapshot.val() === false) return;

                    // ALWAYS clear existing timers first
                    clearTimeout(presenceTimer);

                    if (!isActivityEnabled) {
                        // FIX: If toggle is OFF, cancel all background hooks and force offline
                        statusRef.onDisconnect().cancel(); 
                        statusRef.set(offlineState);
                        return;
                    }

                    // --- 4. ZERO-FLICKER BUFFER ---
                    // "If I lose connection, tell the server I'm offline"
                    statusRef.onDisconnect().set(offlineState).then(() => {
                        // "If I'm still connected after 4 seconds, tell the server I'm online"
                        presenceTimer = setTimeout(() => {
                            // Final check before pushing online status
                            if (isActivityEnabled) {
                                statusRef.set(onlineState);
                            }
                        }, 4000);
                    });
                });
            }
        });
    }
});

// --- UI RENDERER (Preserved exactly as requested) ---
function renderLockoutScreen() {
    if (document.getElementById('nexus-lockout')) return;
    const overlay = document.createElement('div');
    overlay.id = 'nexus-lockout';
    overlay.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&family=Inter:wght@400;600;800&display=swap');
            #nexus-lockout {
                position: fixed; inset: 0;
                background: radial-gradient(circle at center, #111111 0%, #000000 100%);
                z-index: 9999999; display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', sans-serif; backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px); animation: nexus-fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .nexus-lock-card {
                background: rgba(15, 15, 15, 0.6); border: 1px solid rgba(255, 68, 68, 0.2);
                padding: 60px 40px; border-radius: 40px; text-align: center;
                max-width: 480px; width: 90%; box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
                position: relative; overflow: hidden;
            }
            .nexus-lock-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, transparent, #ff4444, transparent); }
            .nexus-glow-icon { font-size: 80px; color: #ff4444; margin-bottom: 30px; display: inline-block; filter: drop-shadow(0 0 20px rgba(255, 68, 68, 0.5)); animation: nexus-pulse 2s infinite; }
            .nexus-title { color: #ffffff; font-size: 32px; font-weight: 800; margin-bottom: 15px; letter-spacing: -1.5px; text-transform: uppercase; }
            .nexus-message { color: #888888; font-size: 16px; line-height: 1.6; margin-bottom: 40px; }
            .nexus-badge { font-family: 'JetBrains Mono', monospace; background: rgba(255, 68, 68, 0.1); color: #ff4444; padding: 14px 28px; border-radius: 100px; font-size: 12px; display: inline-flex; align-items: center; gap: 10px; border: 1px solid rgba(255, 68, 68, 0.2); font-weight: 700; letter-spacing: 1px; }
            .nexus-dot { width: 6px; height: 6px; background: #ff4444; border-radius: 50%; box-shadow: 0 0 10px #ff4444; }
            @keyframes nexus-pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
            @keyframes nexus-fade-in { from { opacity: 0; transform: scale(1.1); } to { opacity: 1; transform: scale(1); } }
        </style>
        <div class="nexus-lock-card">
            <div class="nexus-glow-icon">🛡️</div>
            <h1 class="nexus-title">Access Revoked</h1>
            <p class="nexus-message">Your Goorac account has been restricted by system administration.</p>
            <div class="nexus-badge"><span class="nexus-dot"></span>RESTRICTION_CODE: CORE_SYS_01</div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

// Export isn't strictly needed if loaded as a normal script, but kept for compatibility
// export { app, auth, firestore };
