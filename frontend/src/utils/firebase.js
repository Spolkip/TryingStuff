import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
// Corrected import: Firestore functions should be imported directly from firebase/firestore
import { getFirestore, collection, query, onSnapshot, doc, Timestamp, writeBatch, getDocs, setDoc } from 'firebase/firestore';

// Global variables provided by the Canvas environment
// For local development, these should be accessed via process.env
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {};
const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN || null;

export const useFirebase = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [firebaseMessage, setFirebaseMessage] = useState('');
    const [firebaseLoading, setFirebaseLoading] = useState(true);

    useEffect(() => {
        try {
            // Only initialize if firebaseConfig is not empty
            if (Object.keys(firebaseConfig).length === 0) {
                setFirebaseMessage("Firebase config not found. Running without Firebase.");
                setFirebaseLoading(false);
                setIsAuthReady(true);
                return;
            }

            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authentication = getAuth(app);

            setDb(firestore);
            setAuth(authentication);

            const unsubscribe = onAuthStateChanged(authentication, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setFirebaseMessage("Firebase authenticated.");
                } else {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(authentication, initialAuthToken);
                        } else {
                            await signInAnonymously(authentication);
                        }
                        setUserId(authentication.currentUser?.uid || crypto.randomUUID());
                        setFirebaseMessage("Firebase authenticated anonymously.");
                    } catch (error) {
                        console.error("Firebase Auth Error:", error);
                        setFirebaseMessage(`Authentication failed: ${error.message}`);
                    }
                }
                setIsAuthReady(true);
                setFirebaseLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            setFirebaseMessage(`Firebase initialization failed: ${error.message}`);
            setFirebaseLoading(false);
        }
    }, [JSON.stringify(firebaseConfig), initialAuthToken]); // Include config and token in dependency array

    // Export the db instance here for direct use in dataProcessing.js
    return { db, auth, userId, isAuthReady, firebaseMessage, firebaseLoading };
};

// Re-export necessary Firestore functions for other modules
// These are now imported directly in dataProcessing.js and App.js from 'firebase/firestore'
// and are no longer re-exported from this utility file.
// export { collection, query, onSnapshot, doc, Timestamp, writeBatch, getDocs, setDoc };
