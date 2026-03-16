import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC95TQmBZ4ufmhhf95CQtKOhg5vZHCVImw",
  authDomain: "sites-6bd6e.firebaseapp.com",
  projectId: "sites-6bd6e",
  storageBucket: "sites-6bd6e.firebasestorage.app",
  messagingSenderId: "1011216840446",
  appId: "1:1011216840446:web:1c794c47dbb9807cf797af"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);