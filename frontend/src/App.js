import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'lucide-react';
// Corrected imports: Ensure all necessary Firebase functions are explicitly imported
import { useFirebase, collection, query, onSnapshot, doc, Timestamp, getDocs, setDoc } from './utils/firebase';
import { processKillSheet, processHuntingSheet, parseNumeric } from './utils/dataProcessing';
import { downloadJson, downloadXlsx } from './utils/fileDownloads';
// Corrected component import paths
import FileUploadSection from './components/FireUpload'; // Corrected from FileUploadSection to FireUpload
import ActionButtons from './components/ActionButtons';
import PlayersTable from './components/PlayerTable'; // Corrected from PlayersTable to PlayerTable
import HistoryModal from './components/HistoryModal';
import MessageDisplay from './components/MessageDisplay';

// Global variables provided by the Canvas environment (re-declared here for clarity in App.js context)
// For local development, access environment variables via process.env
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';

// Main App component
const App = () => {
    // Firebase state from custom hook
    const { db, userId, isAuthReady, firebaseMessage, firebaseLoading } = useFirebase();

    // Application state
    const [killSheetFile, setKillSheetFile] = useState(null);
    const [huntingFile, setHuntingFile] = useState(null);
    const [playersData, setPlayersData] = useState([]); // Current players data from Firestore
    const [loading, setLoading] = useState(false); // For processing CSVs
    const [message, setMessage] = useState(''); // General app messages
    const [selectedPlayerId, setSelectedPlayerId] = useState(null);
    const [playerHistory, setPlayerHistory] = useState([]);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteInput, setNoteInput] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // 2. Fetch Players Data from Firestore in real-time
    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        // Use the appId from process.env
        const playersColRef = collection(db, `artifacts/${appId}/users/${userId}/players`);
        const q = query(playersColRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const players = snapshot.docs.map(doc => ({
                id: doc.id, // IGG ID is the document ID
                ...doc.data()
            }));
            setPlayersData(players);
            setMessage("Player data loaded from Firestore.");
        }, (error) => {
            console.error("Error fetching players data:", error);
            setMessage(`Error loading player data: ${error.message}`);
        });

        return () => unsubscribe(); // Cleanup snapshot listener
    }, [db, userId, isAuthReady, appId]); // Added appId to dependency array

    // Function to handle CSV file upload
    const handleFileUpload = (event, type) => {
        const file = event.target.files[0];
        if (file) {
            if (type === 'killSheet') {
                setKillSheetFile(file);
            } else if (type === 'hunting') {
                setHuntingFile(file);
            }
            setMessage('');
        }
    };

    // Function to fetch player history
    const fetchPlayerHistory = useCallback(async (playerID) => {
        if (!db || !userId || !playerID) return;

        setLoading(true);
        setMessage(`Fetching history for ${playerID}...`);
        try {
            // Use the appId from process.env
            const historyColRef = collection(db, `artifacts/${appId}/users/${userId}/players/${playerID}/history`);
            const q = query(historyColRef);
            const snapshot = await getDocs(q);
            const history = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                snapshotTime: doc.data().snapshotTime ? doc.data().snapshotTime.toDate().toLocaleString() : 'N/A'
            }));
            // Sort client-side by snapshotTime in descending order
            history.sort((a, b) => new Date(b.snapshotTime).getTime() - new Date(a.snapshotTime).getTime());
            setPlayerHistory(history);
            setSelectedPlayerId(playerID);
            setShowHistoryModal(true); // Show the history modal
            setMessage(`History loaded for ${playerID}.`);
        } catch (error) {
            console.error("Error fetching player history:", error);
            setMessage(`Error fetching history: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [db, userId, appId]); // Added appId to dependency array

    // Function to save player notes
    const saveNote = useCallback(async (playerID) => {
        if (!db || !userId || !playerID || editingNoteId !== playerID) return;

        setLoading(true);
        setMessage(`Saving note for ${playerID}...`);
        try {
            // Use the appId from process.env
            const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, playerID);
            await setDoc(playerDocRef, { Notes: noteInput, lastUpdated: Timestamp.now() }, { merge: true });
            setMessage(`Note saved for ${playerID}.`);
            setEditingNoteId(null); // Exit editing mode
            setNoteInput(''); // Clear note input
        } catch (error) {
            console.error("Error saving note:", error);
            setMessage(`Error saving note: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [db, userId, editingNoteId, noteInput, appId]); // Added appId to dependency array

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 font-inter text-gray-800">
            <div className="max-w-7xl mx-auto bg-white p-8 rounded-xl shadow-2xl">
                <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-6">
                    Lords Mobile Data Manager
                </h1>
                {userId && (
                    <p className="text-center text-sm text-gray-500 mb-6 flex items-center justify-center">
                        <User size={16} className="mr-2" /> Your User ID: <span className="font-mono ml-1 text-gray-700">{userId}</span>
                    </p>
                )}

                <MessageDisplay message={message || firebaseMessage} loading={loading || firebaseLoading} />

                <FileUploadSection
                    killSheetFile={killSheetFile}
                    setKillSheetFile={setKillSheetFile}
                    huntingFile={huntingFile}
                    setHuntingFile={setHuntingFile}
                    handleFileUpload={handleFileUpload}
                    processKillSheet={() => processKillSheet(killSheetFile, db, userId, appId, setMessage, setLoading, parseNumeric)}
                    processHuntingSheet={() => processHuntingSheet(huntingFile, db, userId, appId, setMessage, setLoading, parseNumeric)}
                    loading={loading || firebaseLoading}
                    isAuthReady={isAuthReady}
                />

                <ActionButtons
                    playersData={playersData}
                    loading={loading || firebaseLoading}
                    downloadJson={() => downloadJson(playersData, setMessage)}
                    downloadXlsx={() => downloadXlsx(playersData, setMessage)}
                />

                {playersData.length > 0 && (
                    <PlayersTable
                        data={playersData}
                        title="Current Lords Mobile Players Data (from Firestore)"
                        fetchPlayerHistory={fetchPlayerHistory}
                        editingNoteId={editingNoteId}
                        setEditingNoteId={setEditingNoteId}
                        noteInput={noteInput}
                        setNoteInput={setNoteInput}
                        saveNote={saveNote}
                    />
                )}

                <HistoryModal
                    showHistoryModal={showHistoryModal}
                    setShowHistoryModal={setShowHistoryModal}
                    selectedPlayerId={selectedPlayerId}
                    playerHistory={playerHistory}
                    setPlayerHistory={setPlayerHistory}
                    setSelectedPlayerId={setSelectedPlayerId}
                />

                <p className="text-center text-gray-600 mt-10 text-sm">
                    This application processes data and interacts with Firebase Firestore client-side.
                    The "screenshot to JSON" functionality is not supported directly by this application;
                    data must be provided via CSV file uploads.
                </p>
            </div>
        </div>
    );
};

export default App;
