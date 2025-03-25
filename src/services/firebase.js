import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions'; // Add this import

const firebaseConfig = {
  apiKey: "AIzaSyALjXkZiFZ_Fy143N_dzdaUbyDCtabBr7Y",
  authDomain: "parentload-ba995.firebaseapp.com",
  projectId: "parentload-ba995",
  storageBucket: "parentload-ba995.firebasestorage.app",
  messagingSenderId: "363935868004",
  appId: "1:363935868004:web:8802abceeca81cc10deb71",
  measurementId: "G-7T846QZH0J"
};

// Add localhost to authorized domains if developing locally
if (window.location.hostname === "localhost") {
  firebaseConfig.authDomain = "localhost";
}
// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app); // Add this line
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Add the exact redirect URL that matches what you've set in Google Cloud Console
  redirect_uri: window.location.origin
});


export { db, auth, storage, functions, googleProvider };
