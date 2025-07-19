// frontend/src/utils/tableRenderer.js
import React from 'react';
import { History, Edit, Save, XCircle } from 'lucide-react'; // Import necessary icons

export const renderTable = (data, title, isMainPlayersTable = false,
    fetchPlayerHistory, editingNoteId, setEditingNoteId, noteInput, setNoteInput, saveNote) => {
    if (!data || data.length === 0) return null;

    let headers = [];
    // Define a preferred order for the specified columns.
    const preferredOrder = [
        'ID',
        'Name',
        'might',
        'Kills',
        'Might Gained',
        'Kills Gained',
        'GF Pass/Fail',
        'Rank',
        'T4/T5',
        'Sigils',
        'Mana',
        'Discord Name',
        'Notes',
    ];

    if (data.length > 0) {
        // Filter headers to only include those present in the data, maintaining the preferred order.
        headers = preferredOrder.filter(header => data.some(item => {
            return item[header] !== undefined;
        }));
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

                                    // Apply toLocaleString for numeric columns that often have large values
                                    if (['might', 'Kills', 'Might Gained', 'Kills Gained', 'Sigils'].includes(header)) {
                                        displayValue = typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue;
                                    } else if (displayValue && typeof displayValue.toDate === 'function') {
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
