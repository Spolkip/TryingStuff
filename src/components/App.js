import React, { useState, useEffect, useRef } from 'react';
// Import your local firebase config, which you created in `src/firebase/config.js`
import { db, auth } from '../firebase/config'; 
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';

// Get the App ID from environment variables
const appId = process.env.REACT_APP_ARTIFACT_ID || 'lords-mobile-stats-react-default';

export default function App() {
    const [players, setPlayers] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [userId, setUserId] = useState(null);
    const fileInputRef = useRef(null);

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
        
        // NOTE: In a production app, this key should be handled by a backend server to keep it secret.
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
        if (!userId) {
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
        <div className="bg-gray-900 text-gray-200 min-h-screen">
            <div className="container mx-auto p-4 md:p-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Lords Mobile Stats Tracker</h1>
                    <p className="text-gray-400">Upload screenshots to track player might and kill progression.</p>
                </header>

                <main>
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8 max-w-2xl mx-auto">
                        <h2 className="text-2xl font-semibold mb-4 text-white">Upload Player Screenshot</h2>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative flex-grow w-full">
                                <input type="file" id="screenshotInput" className="hidden" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
                                <label htmlFor="screenshotInput" className="cursor-pointer bg-gray-700 text-gray-300 rounded-md p-3 w-full text-center border-2 border-dashed border-gray-600 hover:bg-gray-600 hover:border-gray-500 transition-colors block">
                                    {selectedFile ? `Selected: ${selectedFile.name.substring(0,25)}...` : 'Click to select a screenshot'}
                                </label>
                            </div>
                            <button onClick={handleAnalyzeClick} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 transition-all w-full sm:w-auto disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center h-[50px]" disabled={isLoading || !selectedFile}>
                                {isLoading ? <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-6 w-6"></div> : 'Analyze'}
                            </button>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`max-w-2xl mx-auto text-center p-4 rounded-md mb-8 ${
                            message.type === 'success' ? 'bg-green-500/20 text-green-300' :
                            message.type === 'error' ? 'bg-red-500/20 text-red-300' :
                            'bg-blue-500/20 text-blue-300'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    <div className="bg-gray-800 rounded-lg shadow-lg p-6 overflow-x-auto">
                        <h2 className="text-2xl font-semibold mb-4 text-white">Player Stats</h2>
                        <table className="min-w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-700 text-gray-300 uppercase text-sm">
                                <tr>
                                    <th className="p-4 rounded-l-lg">Player Name</th>
                                    <th className="p-4">Initial Might</th>
                                    <th className="p-4">Initial Kills</th>
                                    <th className="p-4">Current Might</th>
                                    <th className="p-4">Current Kills</th>
                                    <th className="p-4">Might Gain</th>
                                    <th className="p-4">Kills Gain</th>
                                    <th className="p-4 rounded-r-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {players.length > 0 ? players.map(player => (
                                    <tr key={player.id} className="bg-gray-800 hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4 font-medium text-white">{player.playerName}</td>
                                        <td className="p-4">{player.initialMight.toLocaleString()}</td>
                                        <td className="p-4">{player.initialKills.toLocaleString()}</td>
                                        <td className="p-4">{player.currentMight.toLocaleString()}</td>
                                        <td className="p-4">{player.currentKills.toLocaleString()}</td>
                                        <td className="p-4 text-green-400 font-semibold">+{player.mightGain.toLocaleString()}</td>
                                        <td className="p-4 text-green-400 font-semibold">+{player.killsGain.toLocaleString()}</td>
                                        <td className="p-4">
                                            <button onClick={() => handleDeletePlayer(player.id)} className="bg-red-600 text-white text-xs font-bold py-2 px-3 rounded hover:bg-red-700 transition-all">
                                                DELETE
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-8 text-gray-500">
                                            No player data yet. Upload a screenshot to get started!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}
