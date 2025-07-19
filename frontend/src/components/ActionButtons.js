import React from 'react';
import { FileText, Table } from 'lucide-react';

const ActionButtons = ({ playersData, loading, downloadJson, downloadXlsx }) => {
    return (
        <div className="flex justify-center space-x-4 mb-10">
            <button
                onClick={downloadJson}
                disabled={loading || playersData.length === 0}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FileText size={20} />
                <span>Download All Data JSON</span>
            </button>
            <button
                onClick={downloadXlsx}
                disabled={loading || playersData.length === 0}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Table size={20} />
                <span>Download All Data XLSX</span>
            </button>
        </div>
    );
};

export default ActionButtons;