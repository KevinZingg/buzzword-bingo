// src/components/Player.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const Player = () => {
  const [sessionId, setSessionId] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    socket.on('playerJoined', ({ playerName, sessionId }) => {
      console.log(`${playerName} has joined the session ${sessionId}`);
    });

    socket.on('playerBuzzed', ({ playerName, sessionId }) => {
      console.log(`${playerName} buzzed in session ${sessionId}`);
    });

    return () => {
      socket.off('playerJoined');
      socket.off('playerBuzzed');
    };
  }, []);

  const joinSession = () => {
    console.log(`${name} attempting to join session ${sessionId}`);
    socket.emit('joinSession', { sessionId, playerName: name });
  };

  const buzzIn = () => {
    console.log(`${name} buzzed in session ${sessionId}`);
    socket.emit('buzz', { sessionId, playerName: name });
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
