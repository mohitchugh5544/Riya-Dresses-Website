// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// TODO: Replace with your project's Firebase configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBWS_X3B1PN527gGxSf1-zNGVZWHfQShos",
  authDomain: "riya-dresses.firebaseapp.com",
  projectId: "riya-dresses",
  storageBucket: "riya-dresses.firebasestorage.app",
  messagingSenderId: "228730982287",
  appId: "1:228730982287:web:2430f79318a7b8e00285fa"
};

// Initialize Firebase variables
let app;
let auth;
let db;
let storage;

const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Failed to initialize Firebase app:", error);
  }
  if (app) {
    try { auth = getAuth(app); } catch (e) { console.error("Auth init failed:", e); }
    try { db = getFirestore(app); } catch (e) { console.error("Firestore init failed:", e); }
    try { storage = getStorage(app); } catch (e) { console.warn("Storage init failed (may not be enabled):", e); }
  }
} else {
  console.warn("Firebase config not set up. Running in static fallback mode.");
}

export { app, auth, db, storage, isFirebaseConfigured };
