import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, doc, Timestamp, writeBatch, getDocs, setDoc } from 'firebase/firestore';

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

export const useFirebase = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [firebaseMessage, setFirebaseMessage] = useState('');
    const [firebaseLoading, setFirebaseLoading] = useState(true);

    useEffect(() => {
        try {
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
    }, []);

    return { db, auth, userId, isAuthReady, firebaseMessage, firebaseLoading };
};

// Re-export necessary Firestore functions for other modules
export { collection, query, onSnapshot, doc, Timestamp, writeBatch, getDocs, setDoc };