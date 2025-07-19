import Papa from 'papaparse';
import { collection, doc, Timestamp, writeBatch, getDoc } from './firebase'; // Import from local firebase utility

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export const parseNumeric = (value) => {
    if (typeof value === 'string') {
        const cleanedValue = value.replace(/,/g, '').trim();
        const parsed = parseFloat(cleanedValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
};

export const processKillSheet = async (killSheetFile, db, userId, appId, setMessage, setLoading, parseNumericFunc) => {
    if (!killSheetFile || !db || !userId) {
        setMessage("Please upload a Kill Sheet CSV and ensure Firebase is ready.");
        return;
    }

    setLoading(true);
    setMessage(`Processing ${killSheetFile.name}...`);

    Papa.parse(killSheetFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const newKillSheetData = results.data;
            const batch = writeBatch(db);

            for (const newRow of newKillSheetData) {
                const playerID = String(newRow.ID || '').trim();
                if (!playerID) {
                    console.warn("Skipping row due to missing ID:", newRow);
                    continue;
                }

                const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, playerID);
                const oldDoc = await getDoc(playerDocRef);
                const oldData = oldDoc.exists() ? oldDoc.data() : null;

                let mightGained = 0;
                let killsGained = 0;

                const newMight = parseNumericFunc(newRow.might);
                const newKills = parseNumericFunc(newRow.Kills);

                if (oldData) {
                    const oldMight = parseNumericFunc(oldData.might);
                    const oldKills = parseNumericFunc(oldData.Kills);

                    mightGained = newMight - oldMight;
                    killsGained = newKills - oldKills;

                    if (mightGained !== 0 || killsGained !== 0 || oldData.Name !== newRow.Name) {
                        const historyCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/players/${playerID}/history`);
                        batch.set(doc(historyCollectionRef), {
                            ...oldData,
                            snapshotTime: Timestamp.now()
                        });
                    }
                } else {
                    mightGained = newMight;
                    killsGained = newKills;
                }

                const dataToSet = {
                    ...newRow,
                    ID: playerID,
                    might: newMight,
                    Kills: newKills,
                    'Might Gained': mightGained,
                    'Kills Gained': killsGills,
                    lastUpdated: Timestamp.now(),
                    Notes: oldData?.Notes || newRow.Notes || '',
                    ...(oldData && Object.fromEntries(
                        Object.entries(oldData).filter(([key]) => !(key in newRow) && key !== 'huntingStats')
                    )),
                    huntingStats: oldData?.huntingStats || {}
                };

                batch.set(playerDocRef, dataToSet, { merge: true });
            }

            try {
                await batch.commit();
                setMessage(`Successfully processed and updated ${newKillSheetData.length} players from Kill Sheet.`);
            } catch (batchError) {
                console.error("Error committing batch:", batchError);
                setMessage(`Error updating players: ${batchError.message}`);
            }
            setLoading(false);
        },
        error: (error) => {
            console.error("Error parsing Kill Sheet CSV:", error);
            setMessage(`Error parsing Kill Sheet CSV: ${error.message}`);
            setLoading(false);
        }
    });
};

export const processHuntingSheet = async (huntingFile, db, userId, appId, setMessage, setLoading, parseNumericFunc) => {
    if (!huntingFile || !db || !userId) {
        setMessage("Please upload a Hunting CSV and ensure Firebase is ready.");
        return;
    }

    setLoading(true);
    setMessage(`Processing ${huntingFile.name}...`);

    Papa.parse(huntingFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const newHuntingData = results.data;
            const batch = writeBatch(db);

            for (const newRow of newHuntingData) {
                const playerID = String(newRow['User ID'] || '').trim();
                if (!playerID) {
                    console.warn("Skipping hunting row due to missing User ID:", newRow);
                    continue;
                }

                const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/players`, playerID);

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
                    firstHuntTime: newRow['First Hunt Time'] && newRow['First Hunt Time'] !== '1899-12-31 00:00:00' ? Timestamp.fromDate(new Date(newRow['First Hunt Time'])) : null,
                    lastHuntTime: newRow['Last Hunt Time'] && newRow['Last Hunt Time'] !== '1899-12-31 00:00:00' ? Timestamp.fromDate(new Date(newRow['Last Hunt Time'])) : null,
                    huntingLastUpdated: Timestamp.now()
                };

                batch.set(playerDocRef, { huntingStats }, { merge: true });
            }

            try {
                await batch.commit();
                setMessage(`Successfully processed and updated ${newHuntingData.length} players with Hunting data.`);
            } catch (batchError) {
                console.error("Error committing hunting batch:", batchError);
                setMessage(`Error updating hunting data: ${batchError.message}`);
            }
            setLoading(false);
        },
        error: (error) => {
            console.error("Error parsing Hunting CSV:", error);
            setMessage(`Error parsing Hunting CSV: ${error.message}`);
            setLoading(false);
        }
    });
};