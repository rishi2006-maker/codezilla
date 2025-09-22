// Import the functions you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; 
import { getAnalytics } from "firebase/analytics";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGTmZ1aLzEFznhk5M5rQhXwhoa27vH9-Y",
  authDomain: "exam-system-8db17.firebaseapp.com",
  projectId: "exam-system-8db17",
  storageBucket: "exam-system-8db17.firebasestorage.app",
  messagingSenderId: "434632629194",
  appId: "1:434632629194:web:52276ddd39e3bcbf318d33",
  measurementId: "G-M7KFZLE04W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✅ Firestore Database
export const db = getFirestore(app);
