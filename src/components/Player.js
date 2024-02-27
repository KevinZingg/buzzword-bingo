// src/components/Player.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const Player = () => {
  const [sessionId, setSessionId] = useState('');
  const [name, setName] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null); // State to hold the current question

  useEffect(() => {
    socket.on('playerJoined', ({ playerName, sessionId }) => {
      console.log(`${playerName} has joined the session ${sessionId}`);
    });

    socket.on('playerBuzzed', ({ playerName, sessionId }) => {
      console.log(`${playerName} buzzed in session ${sessionId}`);
    });

    socket.on('reopenQuestion', ({ question }) => {
        console.log(`Reopened question: ${question.question}`);
        // Update UI to show the question again, allowing for new buzz attempts
    });

    // Updated to handle receiving a question
    socket.on('question', ({ question }) => {
        console.log(`Received question for session ${sessionId}:`, question);
        setCurrentQuestion(question); // Update the current question state
    });

    socket.on('gamePaused', ({ playerName }) => {
        if (playerName === name) { // 'name' is the player's name from the state
            console.log("You've buzzed in. Waiting for the admin to award points.");
        } else {
            console.log(`Game paused because ${playerName} buzzed in.`);
        }
    });

    socket.on('gameOver', ({ sessionId }) => {
        console.log(`Game over for session ${sessionId}`);
        setCurrentQuestion(null); // Reset the current question on game over
    });

    return () => {
      socket.off('playerJoined');
      socket.off('playerBuzzed');
      socket.off('question');
      socket.off('gameOver');
      socket.off('gamePaused');
      socket.off('reopenQuestion');
    };
  }, [sessionId]);

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
      {currentQuestion && (
        <div>
          <h3>Current Question:</h3>
          <p>{currentQuestion.question}</p>
          {/* Optionally display more information about the question */}
        </div>
      )}
    </div>
  );
};

export default Player;
