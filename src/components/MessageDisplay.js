import React from 'react';

const MessageDisplay = ({ message, loading }) => {
    if (!message && !loading) return null;

    return (
        <div className={`p-4 mb-6 rounded-lg text-center ${loading ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {loading && (
                <div className="flex justify-center items-center py-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-700"></div>
                    <p className="ml-4 text-lg text-indigo-700">Processing...</p>
                </div>
            )}
            {message && <p>{message}</p>}
        </div>
    );
};

export default MessageDisplay;