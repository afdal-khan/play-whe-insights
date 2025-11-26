import { initializeApp } from 'firebase/app';
// We import all required Firestore functions here, where they are first resolved.
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore'; 

// Configuration keys are loaded from the .env.local file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 1. Initialize the Firebase App instance
export const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore and export the database functions
export const db = getFirestore(app);
export { collection, getDocs, query, orderBy, limit };