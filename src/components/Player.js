// src/components/Player.js
import React, { useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const Player = () => {
  const [sessionId, setSessionId] = useState('');
  const [name, setName] = useState('');

  const joinSession = () => {
    socket.emit('joinSession', { sessionId, playerName: name });
  };

  const buzzIn = () => {
    socket.emit('buzz', { sessionId, playerId: socket.id });
    console.log('Buzzed in');
  };

  return (
    <div>
      <h2>Player Join</h2>
      <input type="text" placeholder="Session ID" value={sessionId} onChange={e => setSessionId(e.target.value)} />
      <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
      <button onClick={joinSession}>Join Game</button>
      <button onClick={buzzIn}>Buzz</button>
    </div>
  );
};

export default Player;
