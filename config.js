<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
  // ADDED: Auth imports to check login status for notifications
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

  export const firebaseConfig = {
      apiKey: "AIzaSyCFzAEHC5KLiO2DEkVtoTlFn9zeCQrwImE",
      authDomain: "goorac-c3b59.firebaseapp.com",
      projectId: "goorac-c3b59",
      storageBucket: "goorac-c3b59.firebasestorage.app",
      messagingSenderId: "746746595332",
      appId: "1:746746595332:web:d3f8527d27fe8ca2530d51",
      measurementId: "G-M46FEVRYSS"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const auth = getAuth(app);

  // --- CONFIG EXPORT ---
  window.CONFIG = {
      supabaseUrl: "https://ekgsgltykakwopcfyxqu.supabase.co",
      supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc",
      imgbbApiKey: "d19129d9da57ced728f293be219f67ef"
  };

  // --- 1. PWA SERVICE WORKER REGISTRATION ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✅ Service Worker Registered'))
        .catch(err => console.log('❌ Service Worker Failed', err));
    });
  }

  // --- 2. BACKGROUND NOTIFICATION WORKER LOGIC ---
  
  // A. Ask for permission immediately
  if (Notification.permission !== "granted") {
      Notification.requestPermission();
  }

  // B. Wait for User Login -> Then Start Worker
  onAuthStateChanged(auth, (user) => {
      if (user) {
          startNotificationWorker(user.uid);
      }
  });

  function startNotificationWorker(uid) {
      if (window.Worker) {
          // Check if worker already exists to prevent duplicates
          if (window.notificationWorker) return;

          console.log("🚀 Starting Background Notification Worker...");
          
          // Create the worker
          window.notificationWorker = new Worker('/notification-worker.js', { type: "module" });
          
          // Send the Start Command with UID and Config
          window.notificationWorker.postMessage({
              type: 'START',
              uid: uid,
              config: firebaseConfig
          });

          // Optional: Listen for logs from worker
          window.notificationWorker.onmessage = (e) => {
              if (e.data.type === 'LOG') console.log('[Worker]', e.data.msg);
          };
      }
  }
</script>
