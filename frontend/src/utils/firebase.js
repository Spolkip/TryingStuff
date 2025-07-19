import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Global variables provided by the Canvas environment.
// These are accessed directly as global variables if available, otherwise fall back to process.env for local development.
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {};
const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN || null;

// Custom hook for Firebase initialization and authentication.
export const useFirebase = () => {
    const [db, setDb] = useState(null); // Firestore instance
    const [auth, setAuth] = useState(null); // Auth instance
    const [userId, setUserId] = useState(null); // Current user's ID
    const [isAuthReady, setIsAuthReady] = useState(false); // Flag to indicate if authentication is complete
    const [firebaseMessage, setFirebaseMessage] = useState(''); // Messages related to Firebase status
    const [firebaseLoading, setFirebaseLoading] = useState(true); // Loading state for Firebase initialization

    useEffect(() => {
        let app;
        try {
            // Only initialize Firebase if a valid config is provided.
            if (Object.keys(firebaseConfig).length === 0) {
                setFirebaseMessage("Firebase config not found. Running without Firebase features.");
                setFirebaseLoading(false);
                setIsAuthReady(true);
                return;
            }

            // Initialize Firebase app.
            app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authentication = getAuth(app);

            setDb(firestore); // Set the Firestore instance.
            setAuth(authentication); // Set the Auth instance.

            // Set up an authentication state change listener.
            const unsubscribe = onAuthStateChanged(authentication, async (user) => {
                if (user) {
                    // If a user is logged in, set their UID.
                    setUserId(user.uid);
                    setFirebaseMessage("Firebase authenticated.");
                } else {
                    try {
                        // If no user, attempt to sign in with a custom token or anonymously.
                        if (initialAuthToken) {
                            await signInWithCustomToken(authentication, initialAuthToken);
                        } else {
                            await signInAnonymously(authentication);
                        }
                        // Set the user ID from the current authenticated user or a new UUID if anonymous.
                        setUserId(authentication.currentUser?.uid || crypto.randomUUID());
                        setFirebaseMessage("Firebase authenticated anonymously.");
                    } catch (error) {
                        console.error("Firebase Auth Error:", error);
                        setFirebaseMessage(`Authentication failed: ${error.message}`);
                    }
                }
                setIsAuthReady(true); // Mark authentication as ready.
                setFirebaseLoading(false); // Stop Firebase loading.
            });

            // Cleanup function for the auth state listener.
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setFirebaseMessage(`Firebase initialization failed: ${error.message}`);
            setFirebaseLoading(false);
            setIsAuthReady(false); // Ensure auth is not ready on failure
        }
    }, [JSON.stringify(firebaseConfig), initialAuthToken]); // Dependencies: re-run if config or token changes.

    // Return the Firebase instances and related states.
    return { db, auth, userId, isAuthReady, firebaseMessage, firebaseLoading };
};
