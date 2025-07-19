import React from 'react';

// This function is a generic table renderer used by PlayersTable and HistoryModal
export const renderTable = (data, title, isMainPlayersTable = false) => {
    if (!data || data.length === 0) return null;

    let headers = [];
    if (data.length > 0) {
        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
            // Only expand huntingStats for the main players table, not history
            if (item.huntingStats && isMainPlayersTable) {
                Object.keys(item.huntingStats).forEach(key => allKeys.add(`Hunting: ${key}`));
            }
        });
        headers = Array.from(allKeys).filter(key => key !== 'huntingStats' && key !== 'id');
        const preferredOrder = ['ID', 'Name', 'might', 'Kills', 'Might Gained', 'Kills Gained', 'GF Pass/Fail', 'Rank', 'T4/T5', 'Sigils', 'Mana', 'Discord Name', 'Notes', 'lastUpdated', 'snapshotTime'];
        headers.sort((a, b) => {
            const indexA = preferredOrder.indexOf(a);
            const indexB = preferredOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }

    return (
        <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
            {title && <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>}
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            {headers.map((header) => (
                                <th
                                    key={header}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {header.replace(/([A-Z])/g, ' $1').replace(/^Hunting: /, 'Hunting ')}
                                </th>
                            ))}
                            {isMainPlayersTable && (
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, rowIndex) => (
                            <tr key={row.ID || row.id || rowIndex}>
                                {headers.map((header, colIndex) => {
                                    let displayValue = row[header];
                                    if (header.startsWith('Hunting: ')) {
                                        const originalKey = header.replace('Hunting: ', '');
                                        displayValue = row.huntingStats ? row.huntingStats[originalKey] : '';
                                    }

                                    if (displayValue && typeof displayValue.toDate === 'function') {
                                        displayValue = displayValue.toDate().toLocaleString();
                                    }

                                    return (
                                        <td
                                            key={colIndex}
                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                        >
                                            {String(displayValue || '')}
                                        </td>
                                    );
                                })}
                                {/* Actions column is handled directly in PlayersTable component */}
                                {isMainPlayersTable && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {/* This cell is intentionally left empty here as actions are passed as props to PlayersTable */}
                                        {/* The actual action buttons will be rendered by the calling component (PlayersTable) */}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};