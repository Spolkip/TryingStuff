import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'lucide-react';
import { collection, query, onSnapshot, doc, Timestamp, getDocs, setDoc } from 'firebase/firestore';
import { useFirebase } from './utils/firebase';
import { processKillSheet, processHuntingSheet, parseNumeric } from './utils/data/dataProcessing'; // Corrected import path
import { downloadJson, downloadXlsx } from './utils/fileDownloads';
import FileUploadSection from './components/FireUpload';
import ActionButtons from './components/ActionButtons';
import PlayersTable from './components/PlayerTable';
import HistoryModal from './components/HistoryModal';
import MessageDisplay from './components/MessageDisplay';

// Global variable for the application ID provided by the Canvas environment.
// For local development, this would typically be accessed via process.env.
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';

// Main App component
const App = () => {
    // State from the custom Firebase hook
    const { db, userId, isAuthReady, firebaseMessage, firebaseLoading } = useFirebase();

    // Application-specific states
    const [killSheetFile, setKillSheetFile] = useState(null);
    const [huntingFile, setHuntingFile] = useState(null);
    const [playersData, setPlayersData] = useState([]); // Stores current players data from Firestore
    const [loading, setLoading] = useState(false); // Indicates if data processing/fetching is in progress
    const [message, setMessage] = useState(''); // General messages displayed to the user
    const [selectedPlayerId, setSelectedPlayerId] = useState(null); // ID of the player whose history is being viewed
    const [playerHistory, setPlayerHistory] = useState([]); // History data for the selected player
    const [editingNoteId, setEditingNoteId] = useState(null); // ID of the player whose note is being edited
    const [noteInput, setNoteInput] = useState(''); // Input field value for editing notes
    const [showHistoryModal, setShowHistoryModal] = useState(false); // Controls visibility of the history modal

    // Effect hook to fetch players data from Firestore in real-time.
    // This runs whenever `db`, `userId`, or `isAuthReady` changes, ensuring data is loaded
    // only when Firebase is initialized and authenticated.
    useEffect(() => {
        if (!db || !userId || !isAuthReady) {
            // If Firebase is not ready, or user ID is not available, do not proceed with data fetching.
            return;
        }

        // Construct the Firestore collection reference using the provided app ID and user ID.
        // Data is stored under `artifacts/{appId}/users/{userId}/players` for private user data.
        const playersColRef = collection(db, `artifacts/${appId}/users/${userId}/players`);
        const q = query(playersColRef); // Create a query to get all documents in the collection.

        // Set up a real-time listener using `onSnapshot`.
        // This function returns an unsubscribe function to clean up the listener when the component unmounts.
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Map the snapshot documents to an array of player objects.
            const players = snapshot.docs.map(doc => ({
                id: doc.id, // The document ID is used as the player's IGG ID
                ...doc.data() // Spread all other document data
            }));
            setPlayersData(players); // Update the players data state.
            setMessage("Player data loaded from Firestore."); // Provide user feedback.
        }, (error) => {
            // Handle any errors that occur during the snapshot listening.
            console.error("Error fetching players data:", error);
            setMessage(`Error loading player data: ${error.message}`);
        });

        // Cleanup function: unsubscribe from the real-time listener when the component unmounts
        // or when dependencies change.
        return () => unsubscribe();
    }, [db, userId, isAuthReady, appId]); // Dependencies for this effect.

    // Handles the selection of a file for upload (either Kill Sheet or Hunting Sheet).
    const handleFileUpload = (event, type) => {
        const file = event.target.files[0]; // Get the first selected file.
        if (file) {
            if (type === 'killSheet') {
                setKillSheetFile(file); // Set the kill sheet file.
            } else if (type === 'hunting') {
                setHuntingFile(file); // Set the hunting file.
            }
            setMessage(''); // Clear any previous messages.
        }
    };

    // Fetches and displays the history for a specific player.
    const fetchPlayerHistory = useCallback(async (playerID) => {
        if (!db || !userId || !playerID) {
            // Ensure all necessary data is available before proceeding.
            setMessage("Cannot fetch history: Firebase not ready or player ID missing.");
            return;
        }

        setLoading(true); // Set loading state to true.
        setMessage(`Fetching history for ${playerID}...`); // Inform the user.

        try {
            // Construct the Firestore collection reference for player history.
            // History is stored under `artifacts/{appId}/users/{userId}/players/{playerID}/history`.
            const historyColRef = collection(db, `artifacts/${appId}/users/${userId}/players/${playerID}/history`);
            const q = query(historyColRef); // Create a query for the history.
            const snapshot = await getDocs(q); // Fetch the documents once.

            // Map the history documents, converting Firestore Timestamps to local date strings.
            const history = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                snapshotTime: doc.data().snapshotTime ? doc.data().snapshotTime.toDate().toLocaleString() : 'N/A'
            }));

            // Sort the history data by snapshot time in descending order (most recent first).
            history.sort((a, b) => new Date(b.snapshotTime).getTime() - new Date(a.snapshotTime).getTime());

            setPlayerHistory(history); // Update the player history state.
            setSelectedPlayerId(playerID); // Set the selected player ID.
            setShowHistoryModal(true); // Show the history modal.
            setMessage(`History loaded for ${playerID}.`); // Inform the user of success.
        } catch (error) {
            console.error("Error fetching player history:", error);
            setMessage(`Error fetching history: ${error.message}`); // Display error message.
        } finally {
            setLoading(false); // Reset loading state.
        }
    }, [db, userId, appId]); // Dependencies for this memoized callback.

    // Saves a note for a specific player to Firestore.
    const saveNote = useCallback(async (playerID) => {
        // Ensure Firebase is ready, user ID is available, player ID is provided,
        // and the current editing ID matches the player ID to prevent accidental saves.
        if (!db || !userId || !playerID || editingNoteId !== playerID) {
            setMessage("Cannot save note: Firebase not ready or invalid state.");
            return;
        }

        setLoading(true); // Set loading state to true.
        setMessage(`Saving note for ${playerID}...`); // Inform the user.

        try {
            // Construct the Firestore document reference for the player.
            const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, playerID);
            // Update the 'Notes' field and 'lastUpdated' timestamp for the player document.
            await setDoc(playerDocRef, { Notes: noteInput, lastUpdated: Timestamp.now() }, { merge: true });

            setMessage(`Note saved for ${playerID}.`); // Inform the user of success.
            setEditingNoteId(null); // Exit editing mode.
            setNoteInput(''); // Clear the note input field.
        } catch (error) {
            console.error("Error saving note:", error);
            setMessage(`Error saving note: ${error.message}`); // Display error message.
        } finally {
            setLoading(false); // Reset loading state.
        }
    }, [db, userId, editingNoteId, noteInput, appId]); // Dependencies for this memoized callback.

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

                {/* Display general messages or loading indicators */}
                <MessageDisplay message={message || firebaseMessage} loading={loading || firebaseLoading} />

                {/* File upload section for Kill Sheet and Hunting Sheet */}
                <FileUploadSection
                    killSheetFile={killSheetFile}
                    setKillSheetFile={setKillSheetFile}
                    huntingFile={huntingFile}
                    setHuntingFile={setHuntingFile}
                    handleFileUpload={handleFileUpload}
                    // Pass processing functions with necessary arguments
                    processKillSheet={() => processKillSheet(killSheetFile, db, userId, appId, setMessage, setLoading, parseNumeric)}
                    processHuntingSheet={() => processHuntingSheet(huntingFile, db, userId, appId, setMessage, setLoading, parseNumeric)}
                    loading={loading || firebaseLoading}
                    isAuthReady={isAuthReady}
                />

                {/* Action buttons for downloading data */}
                <ActionButtons
                    playersData={playersData}
                    loading={loading || firebaseLoading}
                    downloadJson={() => downloadJson(playersData, setMessage)}
                    downloadXlsx={() => downloadXlsx(playersData, setMessage)}
                />

                {/* Display the main players table if data is available */}
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

                {/* History modal for displaying player history */}
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
