import React from 'react';
import { XCircle } from 'lucide-react';
import { renderTable } from '../utils/tableRenderer'; // Reusing the rendering logic

const HistoryModal = ({
    showHistoryModal,
    setShowHistoryModal,
    selectedPlayerId,
    playerHistory,
    setPlayerHistory,
    setSelectedPlayerId
}) => {
    if (!showHistoryModal) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-2xl font-bold text-indigo-700">History for Player ID: {selectedPlayerId}</h2>
                    <button
                        onClick={() => { setShowHistoryModal(false); setPlayerHistory([]); setSelectedPlayerId(null); }}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <XCircle size={24} />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-grow">
                    {playerHistory.length > 0 ? (
                        renderTable(playerHistory, 'Player History', false) // Use generic renderTable for history
                    ) : (
                        <p className="text-center text-gray-600">No history found for this player.</p>
                    )}
                </div>
                <div className="p-4 border-t flex justify-end">
                    <button
                        onClick={() => { setShowHistoryModal(false); setPlayerHistory([]); setSelectedPlayerId(null); }}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;