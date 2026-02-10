// components/presence.js

// 1. Import necessary Firebase v12 functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 2. Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
    authDomain: "goorac-c3b59.firebaseapp.com",
    projectId: "goorac-c3b59",
    storageBucket: "goorac-c3b59.firebasestorage.app",
    messagingSenderId: "746746595332",
    appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
    measurementId: "G-M46FEVRYSS"
};

// 3. Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

/**
 * CORE SUSPENSION ENFORCER
 * Listens to the user document in real-time.
 * If 'suspended' becomes true, it locks the UI instantly.
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userDocRef = doc(firestore, "users", user.uid);
        
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                if (data.suspended === true) {
                    renderLockoutScreen();
                } else {
                    const existingLock = document.getElementById('nexus-lockout');
                    if (existingLock) {
                        existingLock.remove();
                        document.body.style.overflow = 'auto';
                    }
                }
            }
        });
    }
});

/**
 * Premium Lockout UI
 * Futuristic Glassmorphism + Cyberpunk aesthetic.
 * Non-bypassable full-screen overlay.
 */
function renderLockoutScreen() {
    if (document.getElementById('nexus-lockout')) return;

    const overlay = document.createElement('div');
    overlay.id = 'nexus-lockout';
    overlay.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&family=Inter:wght@400;600;800&display=swap');
            
            #nexus-lockout {
                position: fixed;
                inset: 0;
                background: radial-gradient(circle at center, #111111 0%, #000000 100%);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Inter', sans-serif;
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                animation: nexus-fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .nexus-lock-card {
                background: rgba(15, 15, 15, 0.6);
                border: 1px solid rgba(255, 68, 68, 0.2);
                padding: 60px 40px;
                border-radius: 40px;
                text-align: center;
                max-width: 480px;
                width: 90%;
                box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 68, 68, 0.05);
                position: relative;
                overflow: hidden;
            }

            .nexus-lock-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(90deg, transparent, #ff4444, transparent);
            }

            .nexus-glow-icon {
                font-size: 80px;
                color: #ff4444;
                margin-bottom: 30px;
                display: inline-block;
                filter: drop-shadow(0 0 20px rgba(255, 68, 68, 0.5));
                animation: nexus-pulse 2s infinite;
            }

            .nexus-title {
                color: #ffffff;
                font-size: 32px;
                font-weight: 800;
                margin-bottom: 15px;
                letter-spacing: -1.5px;
                text-transform: uppercase;
            }

            .nexus-message {
                color: #888888;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 40px;
                font-weight: 400;
            }

            .nexus-badge {
                font-family: 'JetBrains Mono', monospace;
                background: rgba(255, 68, 68, 0.1);
                color: #ff4444;
                padding: 14px 28px;
                border-radius: 100px;
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                border: 1px solid rgba(255, 68, 68, 0.2);
                font-weight: 700;
                letter-spacing: 1px;
            }

            .nexus-dot {
                width: 6px;
                height: 6px;
                background: #ff4444;
                border-radius: 50%;
                box-shadow: 0 0 10px #ff4444;
            }

            @keyframes nexus-pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }

            @keyframes nexus-fade-in {
                from { opacity: 0; transform: scale(1.1); }
                to { opacity: 1; transform: scale(1); }
            }
        </style>
        <div class="nexus-lock-card">
            <div class="nexus-glow-icon">🛡️</div>
            <h1 class="nexus-title">Access Revoked</h1>
            <p class="nexus-message">
                Your Goorac account has been restricted by system administration. 
                Full access is temporarily disabled pending a security review.
            </p>
            <div class="nexus-badge">
                <span class="nexus-dot"></span>
                RESTRICTION_CODE: CORE_SYS_01
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

// Export for global use
export { app, auth, firestore };
