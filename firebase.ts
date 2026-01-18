import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your exact keys from your image
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