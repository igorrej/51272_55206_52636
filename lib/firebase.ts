import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA3THoS3FNKNfVzsnv28Hng-U07Mnn7R-Q",
  authDomain: "caltrack-efa95.firebaseapp.com",
  projectId: "caltrack-efa95",
  storageBucket: "caltrack-efa95.firebasestorage.app",
  messagingSenderId: "900657187238",
  appId: "1:900657187238:web:dfbafc9dd4e5956615a767"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);


export const db = getFirestore(app);