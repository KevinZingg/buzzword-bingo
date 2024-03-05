// src/components/Leaderboard.js
import React from 'react';

const Leaderboard = ({ players }) => {
  // Ensure players is an array to prevent errors
  const sortedPlayers = (players || []).sort((a, b) => b.score - a.score);

  return (
    <div>
      <h2>Leaderboard V2</h2>
      {sortedPlayers.map((player, index) => (
        <div key={index}>{`${player.name}: ${player.score}`}</div>
      ))}
    </div>
  );
};

export default Leaderboard;
