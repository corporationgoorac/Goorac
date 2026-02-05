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


// config.js
const CONFIG = {
    supabaseUrl: "https://ekgsgltykakwopcfyxqu.supabase.co",
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc",
    imgbbApiKey: "d19129d9da57ced728f293be219f67ef"
};
