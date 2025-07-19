import Papa from 'papaparse';
import { collection, doc, Timestamp, writeBatch, getDoc } from 'firebase/firestore';

// Helper function to safely parse numeric values from strings, handling commas and NaNs.
export const parseNumeric = (value) => {
    if (typeof value === 'string') {
        const cleanedValue = value.replace(/,/g, '').trim();
        const parsed = parseFloat(cleanedValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
};

// Processes the uploaded Kill Sheet CSV file and updates player data in Firestore.
export const processKillSheet = async (killSheetFile, currentDb, userId, currentAppId, setMessage, setLoading, parseNumericFunc) => {
    // Basic validation to ensure necessary inputs are provided.
    if (!killSheetFile || !currentDb || !userId) {
        setMessage("Please upload a Kill Sheet CSV and ensure Firebase is ready.");
        return;
    }

    setLoading(true); // Set loading state.
    setMessage(`Processing ${killSheetFile.name}...`); // Inform the user.

    // Use PapaParse to parse the CSV file.
    Papa.parse(killSheetFile, {
        header: true, // Treat the first row as headers.
        skipEmptyLines: true, // Ignore any empty rows.
        complete: async (results) => {
            const newKillSheetData = results.data; // Get the parsed data.
            const batch = writeBatch(currentDb); // Create a Firestore batch for atomic writes.

            // Iterate over each row in the new kill sheet data.
            for (const newRow of newKillSheetData) {
                const playerID = String(newRow.ID || '').trim();
                // Skip rows with missing or invalid player IDs.
                if (!playerID || !/^\d+$/.test(playerID)) {
                    console.warn("Skipping row due to missing or invalid ID:", newRow);
                    continue;
                }

                // Reference to the player's document in Firestore.
                // Path: `artifacts/{appId}/users/{userId}/players/{playerID}`
                const playerDocRef = doc(currentDb, `artifacts/${currentAppId}/users/${userId}/players`, playerID);
                const oldDoc = await getDoc(playerDocRef); // Fetch the existing player data.
                const oldData = oldDoc.exists() ? oldDoc.data() : null; // Get old data if document exists.

                const newMight = parseNumericFunc(newRow.might); // Parse new might value.
                const newKills = parseNumericFunc(newRow.Kills); // Parse new kills value.

                let mightGained = newMight; // Default if no old data
                let killsGained = newKills; // Default if no old data

                // Correctly assign might and kills increases based on old data
                if (oldData) {
                    const oldMight = parseNumericFunc(oldData.might);
                    const oldKills = parseNumericFunc(oldData.Kills);

                    mightGained = newMight - oldMight; // Calculate might gained.
                    killsGained = newKills - oldKills; // Calculate kills gained.

                    // If there's a change in might, kills, or name, record history.
                    // This now correctly checks for changes between old and new might/kills.
                    if (mightGained !== 0 || killsGained !== 0 || oldData.Name !== newRow.Name) {
                        // Reference to the player's history subcollection.
                        // Path: `artifacts/{appId}/users/{userId}/players/{playerID}/history`
                        const historyCollectionRef = collection(currentDb, `artifacts/${currentAppId}/users/${userId}/players/${playerID}/history`);
                        // Add old data to history with a snapshot timestamp.
                        batch.set(doc(historyCollectionRef), {
                            ...oldData,
                            snapshotTime: Timestamp.now(),
                            // Ensure these are explicitly recorded in history with old values
                            might: oldData.might,
                            Kills: oldData.Kills,
                            'Might Gained': oldData['Might Gained'] || 0, // Store past calculated values
                            'Kills Gained': oldData['Kills Gained'] || 0, // Store past calculated values
                        });
                    }
                }

                // Prepare data to set/update in the player document.
                const dataToSet = {
                    ...newRow, // Include all data from the new row.
                    ID: playerID, // Ensure ID is correctly set.
                    might: newMight,
                    Kills: newKills,
                    'Might Gained': mightGained, // Store calculated gained values
                    'Kills Gained': killsGained, // Store calculated gained values
                    lastUpdated: Timestamp.now(), // Update timestamp.
                    Notes: oldData?.Notes || newRow.Notes || '', // Preserve old notes if not provided in new row.
                    // Include any old fields not present in the new CSV (except huntingStats).
                    ...(oldData && Object.fromEntries(
                        Object.entries(oldData).filter(([key]) => !(key in newRow) && key !== 'huntingStats' && key !== 'Might Gained' && key !== 'Kills Gained')
                    )),
                    huntingStats: oldData?.huntingStats || {} // Preserve old hunting stats.
                };

                // Add the player data update to the batch.
                batch.set(playerDocRef, dataToSet, { merge: true });
            }

            try {
                await batch.commit(); // Commit all batched writes.
                setMessage(`Successfully processed and updated ${newKillSheetData.length} players from Kill Sheet.`);
            } catch (batchError) {
                console.error("Error committing batch:", batchError);
                setMessage(`Error updating players: ${batchError.message}`);
            }
            setLoading(false); // Reset loading state.
        },
        error: (error) => {
            console.error("Error parsing Kill Sheet CSV:", error);
            setMessage(`Error parsing Kill Sheet CSV: ${error.message}`);
            setLoading(false);
        }
    });
};

// Processes the uploaded Hunting CSV file and updates hunting statistics for players in Firestore.
export const processHuntingSheet = async (huntingFile, currentDb, userId, currentAppId, setMessage, setLoading, parseNumericFunc) => {
    // Basic validation.
    if (!huntingFile || !currentDb || !userId) {
        setMessage("Please upload a Hunting CSV and ensure Firebase is ready.");
        return;
    }

    setLoading(true); // Set loading state.
    setMessage(`Processing ${huntingFile.name}...`); // Inform the user.

    // Use PapaParse to parse the CSV file.
    Papa.parse(huntingFile, {
        header: true, // Treat the first row as headers.
        skipEmptyLines: true, // Ignore empty rows.
        complete: async (results) => {
            const newHuntingData = results.data; // Get parsed data.
            const batch = writeBatch(currentDb); // Create a Firestore batch.

            // Iterate over each row in the new hunting data.
            for (const newRow of newHuntingData) {
                const playerID = String(newRow['User ID'] || '').trim();
                // Skip rows with missing player IDs.
                if (!playerID) {
                    console.warn("Skipping hunting row due to missing User ID:", newRow);
                    continue;
                }

                // Reference to the player's document.
                const playerDocRef = doc(currentDb, `artifacts/${currentAppId}/users/${userId}/players`, playerID);

                // Compile hunting statistics from the new row, parsing numeric values and dates.
                const huntingStats = {
                    totalHunts: parseNumericFunc(newRow.Total),
                    huntCount: parseNumericFunc(newRow.Hunt),
                    purchaseCount: parseNumericFunc(newRow.Purchase),
                    l1Hunt: parseNumericFunc(newRow['L1 (Hunt)']),
                    l2Hunt: parseNumericFunc(newRow['L2 (Hunt)']),
                    l3Hunt: parseNumericFunc(newRow['L3 (Hunt)']),
                    l4Hunt: parseNumericFunc(newRow['L4 (Hunt)']),
                    l5Hunt: parseNumericFunc(newRow['L5 (Hunt)']),
                    l1Purchase: parseNumericFunc(newRow['L1 (Purchase)']),
                    l2Purchase: parseNumericFunc(newRow['L2 (Purchase)']),
                    l3Purchase: parseNumericFunc(newRow['L3 (Purchase)']),
                    l4Purchase: parseNumericFunc(newRow['L4 (Purchase)']),
                    l5Purchase: parseNumericFunc(newRow['L5 (Purchase)']),
                    pointsHunt: parseNumericFunc(newRow['Points (Hunt)']),
                    goalPercentageHunt: parseNumericFunc(newRow['Goal Percentage (Hunt)']),
                    pointsPurchase: parseNumericFunc(newRow['Points (Purchase)']),
                    goalPercentagePurchase: parseNumericFunc(newRow['Goal Percentage (Purchase)']),
                    // Convert date strings to Firestore Timestamps, handling invalid date values.
                    firstHuntTime: newRow['First Hunt Time'] && newRow['First Hunt Time'] !== '1899-12-31 00:00:00' ? Timestamp.fromDate(new Date(newRow['First Hunt Time'])) : null,
                    lastHuntTime: newRow['Last Hunt Time'] && newRow['Last Hunt Time'] !== '1899-12-31 00:00:00' ? Timestamp.fromDate(new Date(newRow['Last Hunt Time'])) : null,
                    huntingLastUpdated: Timestamp.now() // Timestamp for when hunting data was last updated.
                };

                // Add the hunting stats update to the batch, merging with existing player data.
                batch.set(playerDocRef, { huntingStats }, { merge: true });
            }

            try {
                await batch.commit(); // Commit all batched writes.
                setMessage(`Successfully processed and updated ${newHuntingData.length} players with Hunting data.`);
            } catch (batchError) {
                console.error("Error committing hunting batch:", batchError);
                setMessage(`Error updating hunting data: ${batchError.message}`);
            }
            setLoading(false); // Reset loading state.
        },
        error: (error) => {
            console.error("Error parsing Hunting CSV:", error);
            setMessage(`Error parsing Hunting CSV: ${error.message}`);
            setLoading(false);
        }
    });
};