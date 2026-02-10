// config.js

const firebaseConfig = {
  apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
  authDomain: "goorac-c3b59.firebaseapp.com",
  projectId: "goorac-c3b59",
  storageBucket: "goorac-c3b59.firebasestorage.app",
  messagingSenderId: "746746595332",
  appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
  measurementId: "G-M46FEVRYSS"
};

// 1. Expose config to window so the main script can see it
window.firebaseConfig = firebaseConfig;

// 2. Initialize Firebase immediately (Compat/Namespaced style)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 3. Initialize Firestore and Analytics immediately
// This ensures 'db' is ready before the main script runs
const app = firebase.app();
const analytics = firebase.analytics();

// 4. CRITICAL: Assign these to window so your HTML script can find 'db'
window.db = firebase.firestore();
window.rdb = firebase.database();

console.log("Firebase (Compat) Initialized for Nexus Command");
