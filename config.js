// 1. Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

// 2. Define Config
const firebaseConfig = {
    apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
    authDomain: "goorac-c3b59.firebaseapp.com",
    projectId: "goorac-c3b59",
    storageBucket: "goorac-c3b59.firebasestorage.app",
    messagingSenderId: "746746595332",
    appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
    measurementId: "G-M46FEVRYSS"
};

// 3. Initialize Modular App (For this file's internal use)
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 4. CRITICAL FIX: Attach to Window
// This makes "window.firebaseConfig" available to home.html
window.firebaseConfig = firebaseConfig;

console.log("✅ Config Loaded & Globalized");
