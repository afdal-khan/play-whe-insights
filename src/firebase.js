import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore'; 

// --- FIX: Use a pattern that prevents Vite from embedding the keys ---
// We will replace these placeholders in a post-build script later if needed, 
// but for the build to pass, we provide a placeholder value that isn't the secret.
const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || 'PLACEHOLDER_KEY';
const FIREBASE_AUTH_DOMAIN = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'PLACEHOLDER_DOMAIN';
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'PLACEHOLDER_PROJECT';
const FIREBASE_STORAGE_BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'PLACEHOLDER_BUCKET';
const FIREBASE_MESSAGING_SENDER_ID = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'PLACEHOLDER_SENDER';
const FIREBASE_APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'PLACEHOLDER_APPID';
// --- END FIX ---


const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID
};

// 1. Initialize the Firebase App instance
export const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore and export the database functions
export const db = getFirestore(app);
export { collection, getDocs, query, orderBy, limit };