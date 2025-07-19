// frontend/src/utils/tableRenderer.js
import React from 'react';
import { History, Edit, Save, XCircle } from 'lucide-react'; // Import necessary icons

export const renderTable = (data, title, isMainPlayersTable = false,
    fetchPlayerHistory, editingNoteId, setEditingNoteId, noteInput, setNoteInput, saveNote) => {
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
        // Remove 'id' as it's often the same as 'ID' and redundant in display
        headers = Array.from(allKeys).filter(key => key !== 'id');

        // Define a preferred order for all potential headers.
        // This ensures consistent column order, with a fallback for new/unknown keys.
        const preferredOrder = [
            'ID',
            'Name',
            'might', // Ensure original 'might' is present
            'Kills', // Ensure original 'Kills' is present
            'Might Gained', // Explicitly include calculated fields
            'Kills Gained', // Explicitly include calculated fields
            'GF Pass/Fail',
            'Rank',
            'T4/T5',
            'Sigils',
            'Mana',
            'Discord Name',
            'Notes',
            'lastUpdated',
            'snapshotTime',
            // Hunting Stats - these will be prefixed below
            'Hunting: totalHunts',
            'Hunting: huntCount',
            'Hunting: purchaseCount',
            'Hunting: l1Hunt',
            'Hunting: l2Hunt',
            'Hunting: l3Hunt',
            'Hunting: l4Hunt',
            'Hunting: l5Hunt',
            'Hunting: l1Purchase',
            'Hunting: l2Purchase',
            'Hunting: l3Purchase',
            'Hunting: l4Purchase',
            'Hunting: l5Purchase',
            'Hunting: pointsHunt',
            'Hunting: goalPercentageHunt',
            'Hunting: pointsPurchase',
            'Hunting: goalPercentagePurchase',
            'Hunting: firstHuntTime',
            'Hunting: lastHuntTime',
            'Hunting: huntingLastUpdated',
        ];

        // Filter and sort headers based on preferredOrder.
        // Any headers not in preferredOrder will be appended alphabetically.
        const sortedHeaders = preferredOrder.filter(header => {
            // Check if the base key exists in data, or if it's a hunting stat
            const baseKey = header.startsWith('Hunting: ') ? header.replace('Hunting: ', '') : header;
            return data.some(item => item[baseKey] !== undefined || (item.huntingStats && item.huntingStats[baseKey] !== undefined));
        });

        // Add any remaining headers that were not in preferredOrder, alphabetically
        const remainingHeaders = headers.filter(header => !preferredOrder.includes(header));
        remainingHeaders.sort((a, b) => a.localeCompare(b));

        headers = [...sortedHeaders, ...remainingHeaders];
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
                            {isMainPlayersTable && ( // Only show Actions for the main table
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

                                    if (isMainPlayersTable && header === 'Notes') { // Only allow editing notes in the main table
                                        return (
                                            <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {editingNoteId === (row.ID || row.id) ? (
                                                    <input
                                                        type="text"
                                                        value={noteInput}
                                                        onChange={(e) => setNoteInput(e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
                                                    />
                                                ) : (
                                                    String(displayValue || '')
                                                )}
                                            </td>
                                        );
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
                                {isMainPlayersTable && ( // Only show Actions for the main table
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => fetchPlayerHistory(row.ID || row.id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="View History"
                                            >
                                                <History size={18} />
                                            </button>
                                            {editingNoteId === (row.ID || row.id) ? (
                                                <>
                                                    <button
                                                        onClick={() => saveNote(row.ID || row.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Save Note"
                                                    >
                                                        <Save size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingNoteId(null); setNoteInput(''); }}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Cancel Edit"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => { setEditingNoteId(row.ID || row.id); setNoteInput(row.Notes || ''); }}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Edit Note"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            )}
                                        </div>
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