// frontend/src/utils/data/dataProcessing.js
import Papa from 'papaparse';
import { collection, doc, Timestamp, writeBatch, getDoc } from 'firebase/firestore';

// Helper function to get cell value, robust to key casing and trimming
const getCellValue = (row, potentialKeys) => {
    if (!row) return undefined;
    for (const targetKey of potentialKeys) {
        // Try exact key first
        if (row[targetKey] !== undefined) {
            return row[targetKey];
        }
        // Try trimmed key
        const trimmedKey = targetKey.trim();
        if (row[trimmedKey] !== undefined) {
            return row[trimmedKey];
        }
        // Iterate through all actual keys in the row to find a case-insensitive, trimmed match
        for (const actualKey in row) {
            if (Object.prototype.hasOwnProperty.call(row, actualKey)) {
                if (actualKey.trim().toLowerCase() === trimmedKey.toLowerCase()) {
                    return row[actualKey];
                }
            }
        }
    }
    return undefined;
};

// Helper function to safely parse numeric values from strings, handling commas, NaNs, and empty values.
export const parseNumeric = (value) => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
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
                const playerID = String(getCellValue(newRow, ['ID', 'id']) || '').trim();
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

                const newMight = parseNumericFunc(getCellValue(newRow, ['might', 'Might'])); // Parse new might value.
                const newKills = parseNumericFunc(getCellValue(newRow, ['Kills', 'kills'])); // Parse new kills value.

                let mightGained = newMight; // Default if no old data
                let killsGained = newKills; // Default if no old data

                // Correctly assign might and kills increases based on old data
                if (oldData) {
                    const oldMight = parseNumericFunc(getCellValue(oldData, ['might', 'Might']));
                    const oldKills = parseNumericFunc(getCellValue(oldData, ['Kills', 'kills']));

                    mightGained = newMight - oldMight; // Calculate might gained.
                    killsGained = newKills - oldKills; // Calculate kills gained.

                    // If there's a change in might, kills, or name, record history.
                    // This now correctly checks for changes between old and new might/kills.
                    if (mightGained !== 0 || killsGained !== 0 || oldData.Name !== getCellValue(newRow, ['Name', 'name'])) {
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
                    Notes: oldData?.Notes || getCellValue(newRow, ['Notes', 'notes']) || '', // Preserve old notes if not provided in new row.
                    Name: getCellValue(newRow, ['Name', 'name']) || '', // Ensure Name is correctly set from newRow
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
                const playerID = String(getCellValue(newRow, ['User ID', 'User ID ', 'ID', 'id']) || '').trim(); // More robust ID fetching
                // Skip rows with missing player IDs.
                if (!playerID) {
                    console.warn("Skipping hunting row due to missing User ID:", newRow);
                    continue;
                }

                // Reference to the player's document.
                const playerDocRef = doc(currentDb, `artifacts/${currentAppId}/users/${userId}/players`, playerID);

                // Compile hunting statistics from the new row, parsing numeric values and dates.
                const huntingStats = {
                    totalHunts: parseNumericFunc(getCellValue(newRow, ['Total'])),
                    huntCount: parseNumericFunc(getCellValue(newRow, ['Hunt'])),
                    purchaseCount: parseNumericFunc(getCellValue(newRow, ['Purchase'])),
                    l1Hunt: parseNumericFunc(getCellValue(newRow, ['L1 (Hunt)', 'L1 (Hunt) '])),
                    l2Hunt: parseNumericFunc(getCellValue(newRow, ['L2 (Hunt)', 'L2 (Hunt) '])),
                    l3Hunt: parseNumericFunc(getCellValue(newRow, ['L3 (Hunt)', 'L3 (Hunt) '])),
                    l4Hunt: parseNumericFunc(getCellValue(newRow, ['L4 (Hunt)', 'L4 (Hunt) '])),
                    l5Hunt: parseNumericFunc(getCellValue(newRow, ['L5 (Hunt)', 'L5 (Hunt) '])),
                    l1Purchase: parseNumericFunc(getCellValue(newRow, ['L1 (Purchase)', 'L1 (Purchase) '])),
                    l2Purchase: parseNumericFunc(getCellValue(newRow, ['L2 (Purchase)', 'L2 (Purchase) '])),
                    l3Purchase: parseNumericFunc(getCellValue(newRow, ['L3 (Purchase)', 'L3 (Purchase) '])),
                    l4Purchase: parseNumericFunc(getCellValue(newRow, ['L4 (Purchase)', 'L4 (Purchase) '])),
                    l5Purchase: parseNumericFunc(getCellValue(newRow, ['L5 (Purchase)', 'L5 (Purchase) '])),
                    pointsHunt: parseNumericFunc(getCellValue(newRow, ['Points (Hunt)', 'Points (Hunt) '])),
                    goalPercentageHunt: parseNumericFunc(getCellValue(newRow, ['Goal Percentage (Hunt)', 'Goal Percentage (Hunt) '])),
                    pointsPurchase: parseNumericFunc(getCellValue(newRow, ['Points (Purchase)', 'Points (Purchase) '])),
                    goalPercentagePurchase: parseNumericFunc(getCellValue(newRow, ['Goal Percentage (Purchase)', 'Goal Percentage (Purchase) '])),
                    // Convert date strings to Firestore Timestamps, handling invalid date values.
                    firstHuntTime: getCellValue(newRow, ['First Hunt Time', 'First Hunt Time ']) && getCellValue(newRow, ['First Hunt Time', 'First Hunt Time ']) !== '1899-12-31 00:00:00' ? Timestamp.fromDate(new Date(getCellValue(newRow, ['First Hunt Time', 'First Hunt Time ']))) : null,
                    lastHuntTime: getCellValue(newRow, ['Last Hunt Time', 'Last Hunt Time ']) && getCellValue(newRow, ['Last Hunt Time', 'Last Hunt Time ']) !== '1899-12-31 00:00:00' ? Timestamp.fromDate(new Date(getCellValue(newRow, ['Last Hunt Time', 'Last Hunt Time ']))) : null,
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
