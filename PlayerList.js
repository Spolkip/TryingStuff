import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PlayerList() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/players');
                setPlayers(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching players", err);
                setLoading(false);
            }
        };

        fetchPlayers();
    }, []);

    if (loading) {
        return <p>Loading players...</p>;
    }

    return (
        <div>
            <h2>Player Data</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                        <th>Name</th>
                        <th>Might</th>
                        <th>Kills</th>
                        <th>Discord Name</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map(player => (
                        <tr key={player.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td>{player.name}</td>
                            <td>{player.might.toLocaleString()}</td>
                            <td>{player.kills.toLocaleString()}</td>
                            <td>{player.discordName}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default PlayerList;