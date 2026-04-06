import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaInB1din3Z6iiGJZIG6J7b9U2ASnfgsY",
  authDomain: "titans-portal-8b124.firebaseapp.com",
  databaseURL: "https://titans-portal-8b124-default-rtdb.firebaseio.com",
  projectId: "titans-portal-8b124",
  storageBucket: "titans-portal-8b124.firebasestorage.app",
  messagingSenderId: "248684743938",
  appId: "1:248684743938:web:7500d46e42bf3a5205061b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Sign in with email and password
export async function firebaseLogin(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    // If user doesn't exist in Firebase Auth, create them
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
      try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
      } catch (createError) {
        return { success: false, error: createError.message };
      }
    }
    return { success: false, error: error.message };
  }
}

// Sign out
export async function firebaseLogout() {
  try {
    await signOut(auth);
  } catch {}
}

// Get current auth token for Firebase REST API calls
export async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

// Listen for auth state changes
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export { auth, db };