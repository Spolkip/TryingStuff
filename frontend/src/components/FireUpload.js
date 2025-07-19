import React from 'react';
import { Upload, RefreshCcw } from 'lucide-react';

const FileUploadSection = ({
    killSheetFile,
    setKillSheetFile,
    huntingFile,
    setHuntingFile,
    handleFileUpload,
    processKillSheet,
    processHuntingSheet,
    loading,
    isAuthReady
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg shadow-inner">
                <label htmlFor="kill-sheet-upload" className="cursor-pointer bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2">
                    <Upload size={20} />
                    <span>Upload Kill Sheet CSV</span>
                </label>
                <input
                    id="kill-sheet-upload"
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'killSheet')}
                    className="hidden"
                />
                {killSheetFile && <p className="mt-3 text-sm text-gray-600">File: {killSheetFile.name}</p>}
                <button
                    onClick={processKillSheet}
                    disabled={loading || !killSheetFile || !isAuthReady}
                    className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCcw size={18} />
                    <span>Process Kill Sheet</span>
                </button>
            </div>

            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg shadow-inner">
                <label htmlFor="hunting-upload" className="cursor-pointer bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2">
                    <Upload size={20} />
                    <span>Upload Hunting CSV</span>
                </label>
                <input
                    id="hunting-upload"
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'hunting')}
                    className="hidden"
                />
                {huntingFile && <p className="mt-3 text-sm text-gray-600">File: {huntingFile.name}</p>}
                <button
                    onClick={processHuntingSheet}
                    disabled={loading || !huntingFile || !isAuthReady}
                    className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow transition duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCcw size={18} />
                    <span>Process Hunting Sheet</span>
                </button>
            </div>
        </div>
    );
};

export default FileUploadSection;