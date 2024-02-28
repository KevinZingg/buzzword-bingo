import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io.connect('http://localhost:3001'); // Adjust to match your server's URL

const Leaderboard = ({ sessionId }) => {
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        socket.on('updateLeaderboard', (players) => {
            setLeaderboard(players);
        });

        return () => socket.off('updateLeaderboard');
    }, [sessionId]); // Re-run effect if sessionId changes

    return (
        <div>
            <h2>Leaderboard</h2>
            <ul>
                {leaderboard.sort((a, b) => b.score - a.score).map((player, index) => (
                    <li key={index}>{player.name}: {player.score}</li>
                ))}
            </ul>
        </div>
    );
};

export default Leaderboard;
