import { initializeApp } from 'firebase/app';
// --- FIX: Use the /lite module and import from the specific location for better bundler compatibility ---
import { getFirestore } from 'firebase/firestore'; 

// Configuration keys are loaded from the .env.local file
const firebaseConfig = {
  // We reference the variables defined in .env.local
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 1. Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore and export the database instance
export const db = getFirestore(app);