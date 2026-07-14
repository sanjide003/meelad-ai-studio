/**
 * Firebase Initializer for MeeladPulse
 * Uses standard Modular SDK (v9/v10)
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdUyk_yvZoQ1JI1pPLJTK51U91BVO0XSA",
  authDomain: "bright-tube-p07pf.firebaseapp.com",
  projectId: "bright-tube-p07pf",
  storageBucket: "bright-tube-p07pf.firebasestorage.app",
  messagingSenderId: "239455260650",
  appId: "1:239455260650:web:5cfa4803e7fcad93cc6c93"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore using the designated database id
export const db = initializeFirestore(app, {}, "ai-studio-e05927b5-3953-4883-969d-1099cafe3237");

export default app;
