import React from 'react';
import Loader from './Loader';

// SVG Icon for the upload area
const UploadIcon = () => (
    <svg width="24" height="24" className="text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
    </svg>
);


function UploadForm({ selectedFile, handleFileChange, handleAnalyzeClick, isLoading, fileInputRef }) {
    return (
        <div className="bg-[#161b22] rounded-lg p-6 lg:p-8 border border-gray-700 h-full flex flex-col">
            <div className="flex items-center mb-4">
                <h2 className="text-xl font-semibold text-white mr-3">Upload Screenshot</h2>
                <UploadIcon />
            </div>
            <div className="flex-grow flex flex-col items-center justify-center w-full">
                <label htmlFor="screenshotInput" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-900/50 hover:bg-gray-800/60">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG, or WEBP</p>
                    </div>
                    <input id="screenshotInput" type="file" className="hidden" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
                </label>
                {selectedFile && (
                    <p className="mt-4 text-sm text-gray-400">Selected: <span className="font-medium text-gray-300">{selectedFile.name}</span></p>
                )}
            </div>
            <button
                onClick={handleAnalyzeClick}
                className="bg-purple-600 text-white font-bold py-3 px-6 mt-6 rounded-md hover:bg-purple-700 transition-all w-full disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                disabled={isLoading || !selectedFile}
            >
                {isLoading ? <Loader /> : 'Analyze'}
            </button>
        </div>
    );
}

export default UploadForm;