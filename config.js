<script type="module">
  // 1. Import the functions you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
  
  // --- NEW IMPORTS FOR PRESENCE SYSTEM ---
  import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
  import { getDatabase, ref, onValue, onDisconnect, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

  // Your web app's Firebase configuration
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
  
  // --- PRESENCE LOGIC (Runs on every page) ---
  const auth = getAuth(app);
  const db = getDatabase(app);

  onAuthStateChanged(auth, (user) => {
      if (user) {
          const uid = user.uid;

          // References to the database
          const userStatusDatabaseRef = ref(db, '/status/' + uid);
          const connectedRef = ref(db, '.info/connected');

          // Watch for connection state changes
          onValue(connectedRef, (snapshot) => {
              // If we are not connected, do nothing
              if (snapshot.val() === false) {
                  return;
              }

              // Define status objects
              const isOfflineForDatabase = {
                  state: 'offline',
                  last_changed: serverTimestamp(),
              };

              const isOnlineForDatabase = {
                  state: 'online',
                  last_changed: serverTimestamp(),
              };

              // 1. Prepare the "OnDisconnect" trigger (runs on server if we crash/close tab)
              onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                  // 2. We are currently connected, so mark us as online
                  set(userStatusDatabaseRef, isOnlineForDatabase);
              });
          });
      }
  });
</script>
