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

window.firebaseConfig = firebaseConfig;

// Use a function to initialize so we can call it safely
window.initFirebaseCore = function() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.db = firebase.firestore();
        window.rdb = firebase.database();
        window.auth = firebase.auth();
        console.log("✅ Firebase Core Initialized");
        return true;
    } else {
        console.error("❌ Firebase SDK not loaded yet!");
        return false;
    }
};
