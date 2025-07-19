import React from 'react';
import { History, Edit, Save, XCircle } from 'lucide-react';
import { renderTable } from '../utils/tableRenderer'; // Ensure this import is used

const PlayersTable = ({
    data,
    title,
    fetchPlayerHistory,
    editingNoteId,
    setEditingNoteId,
    noteInput,
    setNoteInput,
    saveNote
}) => {
    // Remove the internal renderPlayersTableContent function.
    // The table rendering logic should now be handled by the imported renderTable function.

    return (
        <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">{title}</h3>
            {/* Use the imported renderTable directly */}
            {renderTable(data, null, true, fetchPlayerHistory, editingNoteId, setEditingNoteId, noteInput, setNoteInput, saveNote)}
        </div>
    );
};

export default PlayersTable;