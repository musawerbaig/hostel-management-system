import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Firebase web configuration for the hostela-5a2dc project.
// A web config like this identifies the project; it is not a password.
// Real protection comes from Firebase Authentication + the Firestore and
// Storage security rules in this repo (firestore.rules / storage.rules).
// Service-account keys or API keys for other services must NEVER be committed.
const firebaseConfig = {
  apiKey: "AIzaSyCPi9GYVU7qOkSlXbhE0OYExnTg9GgYah8",
  authDomain: "hostela-5a2dc.firebaseapp.com",
  projectId: "hostela-5a2dc",
  storageBucket: "hostela-5a2dc.firebasestorage.app",
  messagingSenderId: "712546309789",
  appId: "1:712546309789:web:e706eb54788c5c41f16674"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);