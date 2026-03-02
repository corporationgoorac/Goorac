// config.js

const firebaseConfig = {
  apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
  authDomain: "goorac-c3b59.firebaseapp.com",
  projectId: "goorac-c3b59",
  storageBucket: "goorac-c3b59.firebasestorage.app",
  messagingSenderId: "746746595332",
  appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
  measurementId: "G-M46FEVRYSS",
  // IMPORTANT: Required for Online Status / Presence features
  databaseURL: "https://goorac-c3b59-default-rtdb.firebaseio.com"
};

// Pusher Beams Configuration for Goorac Quantum (Learning Hack)
const pusherConfig = {
  instanceId: "66574b98-4518-443c-9245-7a3bd9ac0ab7",
  primaryKey: "99DC07D1A9F9B584F776F46A3353B3C3FC28CB53EFE8B162D57EBAEB37669A6A"
};

// 1. Expose config globally so other scripts can access it if needed
window.firebaseConfig = firebaseConfig;
window.pusherConfig = pusherConfig;

// 2. Define the Universal Initialization Function
window.initFirebaseCore = function() {
    // Check if the Firebase SDK (gstatic) has loaded
    if (typeof firebase !== 'undefined') {
        
        // Prevent "App already exists" errors
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("🚀 Firebase App Initialized via config.js");
        } else {
            console.log("♻️ Firebase App already running");
        }

        // 3. Expose Services Globally (Simplifies code in other files)
        // This allows you to just use 'db', 'auth', 'rdb', or 'storage' anywhere
        
        if (!window.auth) window.auth = firebase.auth();
        if (!window.db) window.db = firebase.firestore();
        
        // Realtime Database (Needed for Presence/Online Status)
        if (firebase.database && !window.rdb) {
            window.rdb = firebase.database();
        }
        
        // Cloud Storage (Needed for Profile Pictures & Image Uploads)
        if (firebase.storage && !window.storage) {
            window.storage = firebase.storage();
        }

        return true;
    } else {
        // SDK not loaded yet - The HTML file will need to call this function 
        // after the script tags, or this function will auto-retry.
        console.warn("⚠️ Firebase SDK not detected yet. Waiting for script tags...");
        return false;
    }
};

// 3. Auto-Attempt Initialization
// If config.js loads AFTER the SDKs (rare but possible), this starts it immediately.
if (typeof firebase !== 'undefined') {
    window.initFirebaseCore();
}
