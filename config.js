<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
</script>