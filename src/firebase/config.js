import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Firebase Initialization ---

// This function will initialize Firebase and handle authentication.
// It returns a promise that resolves with the auth and db instances.
const initializeFirebase = async () => {
  let firebaseConfig = {};
  try {
    // __firebase_config is a global variable provided by the environment.
    if (typeof __firebase_config !== 'undefined') {
      firebaseConfig = JSON.parse(__firebase_config);
    } else {
      console.warn("Firebase config is not available.");
      return { app: null, auth: null, db: null };
    }
  } catch (e) {
    console.error("Failed to parse Firebase config:", e);
    return { app: null, auth: null, db: null };
  }

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Handle authentication
    // __initial_auth_token is a global variable provided by the environment.
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
      console.log('Signed in with custom token.');
    } else {
      await signInAnonymously(auth);
      console.log('Signed in anonymously.');
    }

    return { app, auth, db };
  } catch (error) {
    console.error("Firebase initialization or authentication failed:", error);
    return { app: null, auth: null, db: null };
  }
};

export const firebaseInitializationPromise = initializeFirebase();
