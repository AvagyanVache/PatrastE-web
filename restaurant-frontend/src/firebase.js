import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQ9-ReJW-tEUq7qcHzzB29Lf9mcmc0N6E",
  authDomain: "skipqfinal-5c4c7.firebaseapp.com",
  projectId: "skipqfinal-5c4c7",
  storageBucket: "skipqfinal-5c4c7.firebasestorage.app",
  messagingSenderId: "20604837533",
  appId: "1:20604837533:web:8467775223369b522b3e74"
};


export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);