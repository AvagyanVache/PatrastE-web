// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Get these credentials from your Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);