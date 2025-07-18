import React from 'react';

// SVG Icon for the delete button
const DeleteIcon = () => (
    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

function PlayerTable({ players, handleDeletePlayer }) {
  return (
    <div className="bg-[#161b22] rounded-lg p-6 lg:p-8 border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-white">Player Stats</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left whitespace-nowrap" style={{ borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
          <thead className="text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-3">Player Name</th>
              <th className="p-3">Initial Might</th>
              <th className="p-3">Current Might</th>
              <th className="p-3">Might Gain</th>
              <th className="p-3">Initial Kills</th>
              <th className="p-3">Current Kills</th>
              <th className="p-3">Kills Gain</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {players.length > 0 ? (
              players.sort((a, b) => b.mightGain - a.mightGain).map(player => (
                <tr key={player.id} className="bg-gray-900/50 rounded-lg">
                  <td className="p-4 font-medium text-white rounded-l-md">{player.playerName}</td>
                  <td className="p-4 text-gray-300">{player.initialMight.toLocaleString()}</td>
                  <td className="p-4 text-gray-300">{player.currentMight.toLocaleString()}</td>
                  <td className="p-4 text-green-400 font-semibold">+{player.mightGain.toLocaleString()}</td>
                  <td className="p-4 text-gray-300">{player.initialKills.toLocaleString()}</td>
                  <td className="p-4 text-gray-300">{player.currentKills.toLocaleString()}</td>
                  <td className="p-4 text-green-400 font-semibold">+{player.killsGain.toLocaleString()}</td>
                  <td className="p-4 rounded-r-md">
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="bg-red-600/20 text-red-400 p-2 rounded-md hover:bg-red-600/40 hover:text-red-300 transition-all"
                      aria-label={`Delete player ${player.playerName}`}
                    >
                        <DeleteIcon />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-12 text-gray-500">
                  Upload a screenshot to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerTable;