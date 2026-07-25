import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web config is public by design — access is controlled by Firestore
// security rules, not by keeping these values secret. Keeping them in source
// means no build-time env vars are required for the client to reach the project.
const firebaseConfig = {
  apiKey:            'AIzaSyCD_bcIR8DRLyoa5_gYeZSjXa8lr2dc7aQ',
  authDomain:        'mobilephonemarket-2764d.firebaseapp.com',
  projectId:         'mobilephonemarket-2764d',
  storageBucket:     'mobilephonemarket-2764d.firebasestorage.app',
  messagingSenderId: '50936977298',
  appId:             '1:50936977298:web:513d4c5c0e6327f827934b',
  measurementId:     'G-C0WMVDJLT6',
};

// Vite HMR and the test runner can evaluate this module more than once; reusing
// the existing app avoids "Firebase App named '[DEFAULT]' already exists".
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
