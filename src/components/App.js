import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';

// Import Components
import Header from './Header';
import UploadForm from './UploadForm';
import Message from './Message';
import PlayerTable from './PlayerTable';

const appId = process.env.REACT_APP_ARTIFACT_ID || 'lords-mobile-stats-react-default';

export default function App() {
    const [players, setPlayers] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [userId, setUserId] = useState(null);
    const fileInputRef = useRef(null);

    // ... (keep all your existing useEffect and handler functions here, no changes needed) ...
    // ... (handleFileChange, toBase64, analyzeImageWithGemini, etc.) ...
    
    // (Your existing functions from the previous step go here)
    // Effect for Authentication
    useEffect(() => {
        if (!auth) {
            setMessage({ text: "Could not connect to the database. Check Firebase config.", type: 'error' });
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                console.log("User is signed in with UID:", user.uid);
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Anonymous sign-in failed:", error);
                    setMessage({ text: "Authentication failed. Unable to save data.", type: 'error' });
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Effect for Firestore Real-time Updates
    useEffect(() => {
        if (!userId || !db) return;

        const playersCollectionRef = collection(db, `artifacts/${appId}/public/data/players`);
        const unsubscribe = onSnapshot(playersCollectionRef, (snapshot) => {
            const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlayers(playersData);
        }, (error) => {
            console.error("Error listening to player updates:", error);
            setMessage({ text: "Error fetching real-time data.", type: 'error' });
        });

        return () => unsubscribe();
    }, [userId]);
    
    // Effect to clear messages after a delay
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ text: '', type: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const analyzeImageWithGemini = async (base64ImageData) => {
        setMessage({ text: 'Analyzing image with AI... this may take a moment.', type: 'info' });
        
        const prompt = `From the provided Lords Mobile game screenshot, extract the player's name, total might, and kills. Return the data as a JSON object with keys: "name" (string), "might" (number), and "kills" (number). Do not include commas in the numbers.`;
        const payload = {
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64ImageData } }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: { type: "OBJECT", properties: { "name": { "type": "STRING" }, "might": { "type": "NUMBER" }, "kills": { "type": "NUMBER" } }, required: ["name", "might", "kills"] }
            }
        };
        
        const apiKey = ""; // The environment handles this key.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (!response.ok) throw new Error(`AI analysis failed with status: ${response.status}.`);
        
        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return JSON.parse(result.candidates[0].content.parts[0].text);
        } else {
            throw new Error("Failed to get a valid response from the AI model.");
        }
    };

    const processAndSavePlayerData = async (data) => {
        if (!db) return;
        const playersCol = collection(db, `artifacts/${appId}/public/data/players`);
        const playerId = data.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!playerId) throw new Error("Player name from image is invalid.");
        
        const playerDocRef = doc(playersCol, playerId);
        const playerDoc = await getDoc(playerDocRef);

        if (playerDoc.exists()) {
            const existingData = playerDoc.data();
            await updateDoc(playerDocRef, {
                currentMight: data.might,
                currentKills: data.kills,
                mightGain: data.might - existingData.initialMight,
                killsGain: data.kills - existingData.initialKills,
                lastUpdated: serverTimestamp()
            });
        } else {
            await setDoc(playerDocRef, {
                playerName: data.name.trim(),
                initialMight: data.might,
                initialKills: data.kills,
                currentMight: data.might,
                currentKills: data.kills,
                mightGain: 0,
                killsGain: 0,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
        }
    };

    const handleAnalyzeClick = async () => {
        if (!selectedFile) {
            setMessage({ text: 'Please select a screenshot file first.', type: 'error' });
            return;
        }
        if (!auth.currentUser) {
            setMessage({ text: 'Cannot analyze: User not authenticated.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const base64ImageData = await toBase64(selectedFile);
            const extractedData = await analyzeImageWithGemini(base64ImageData);

            if (extractedData?.name && extractedData.might != null && extractedData.kills != null) {
                await processAndSavePlayerData(extractedData);
                setMessage({ text: `Successfully processed stats for ${extractedData.name}.`, type: 'success' });
            } else {
                throw new Error("Could not extract all required fields from the image.");
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            setMessage({ text: error.message, type: 'error' });
        } finally {
            setIsLoading(false);
            setSelectedFile(null);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDeletePlayer = async (playerId) => {
        if (window.confirm(`Are you sure you want to delete all data for this player?`)) {
            try {
                const playerDocRef = doc(db, `artifacts/${appId}/public/data/players`, playerId);
                await deleteDoc(playerDocRef);
                setMessage({ text: 'Player data deleted.', type: 'success' });
            } catch (error) {
                console.error("Error deleting document:", error);
                setMessage({ text: 'Failed to delete player data.', type: 'error' });
            }
        }
    };


    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <Header />
            <main>
                <Message message={message} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-1">
                        <UploadForm
                            selectedFile={selectedFile}
                            handleFileChange={handleFileChange}
                            handleAnalyzeClick={handleAnalyzeClick}
                            isLoading={isLoading}
                            fileInputRef={fileInputRef}
                        />
                    </div>
                    <div className="lg:col-span-2">
                         <PlayerTable players={players} handleDeletePlayer={handleDeletePlayer} />
                    </div>
                </div>
            </main>
        </div>
    );
}