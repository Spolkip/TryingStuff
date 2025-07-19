import * as XLSX from 'xlsx';

export const downloadJson = (playersData, setMessage) => {
    if (playersData.length === 0) {
        setMessage("No data to convert to JSON. Please upload and process CSVs.");
        return;
    }
    const jsonString = JSON.stringify(playersData.map(player => {
        const newPlayer = { ...player };
        if (newPlayer.lastUpdated && typeof newPlayer.lastUpdated.toDate === 'function') {
            newPlayer.lastUpdated = newPlayer.lastUpdated.toDate().toLocaleString();
        }
        if (newPlayer.huntingStats) {
            if (newPlayer.huntingStats.firstHuntTime && typeof newPlayer.huntingStats.firstHuntTime.toDate === 'function') {
                newPlayer.huntingStats.firstHuntTime = newPlayer.huntingStats.firstHuntTime.toDate().toLocaleString();
            }
            if (newPlayer.huntingStats.lastHuntTime && typeof newPlayer.huntingStats.lastHuntTime.toDate === 'function') {
                newPlayer.huntingStats.lastHuntTime = newPlayer.huntingStats.lastHuntTime.toDate().toLocaleString();
            }
            if (newPlayer.huntingStats.huntingLastUpdated && typeof newPlayer.huntingStats.huntingLastUpdated.toDate === 'function') {
                newPlayer.huntingStats.huntingLastUpdated = newPlayer.huntingStats.huntingLastUpdated.toDate().toLocaleString();
            }
        }
        return newPlayer;
    }), null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lords_mobile_players.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage("JSON file downloaded!");
};

export const downloadXlsx = (playersData, setMessage) => {
    if (playersData.length === 0) {
        setMessage("No data to convert to XLSX. Please upload and process CSVs.");
        return;
    }

    const flattenedData = playersData.map(player => {
        const { huntingStats, ...rest } = player;
        const flatPlayer = {
            ...rest,
            lastUpdated: rest.lastUpdated && typeof rest.lastUpdated.toDate === 'function' ? rest.lastUpdated.toDate().toLocaleString() : '',
        };

        if (huntingStats) {
            for (const key in huntingStats) {
                if (huntingStats.hasOwnProperty(key)) {
                    const value = huntingStats[key];
                    if (value && typeof value.toDate === 'function') {
                        flatPlayer[`Hunting: ${key}`] = value.toDate().toLocaleString();
                    } else {
                        flatPlayer[`Hunting: ${key}`] = value;
                    }
                }
            }
        }
        return flatPlayer;
    });

    const ws = XLSX.utils.json_to_sheet(flattenedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lords Mobile Players");

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lords_mobile_players.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage("XLSX file downloaded!");
};