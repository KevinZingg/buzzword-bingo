// src/components/Player.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Leaderboard from './Leaderboard';

const socket = io('http://localhost:3001');

const Player = () => {
  const [sessionId, setSessionId] = useState('');
  const [name, setName] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null); // State to hold the current question
  const [score, setScore] = useState(0); // Added score state
  const [timer, setTimer] = useState(0);


  useEffect(() => {
    socket.on('playerJoined', ({ playerName, sessionId }) => {
      console.log(`${playerName} has joined the session ${sessionId}`);
    });

    socket.on('playerBuzzed', ({ playerName, sessionId }) => {
      console.log(`${playerName} buzzed in session ${sessionId}`);
    });

    socket.on('reopenQuestion', ({ question }) => {
        console.log(`Reopened question: ${question.question}`);
    });

    socket.on('question', ({ question }) => {
        console.log(`Received question for session ${sessionId}:`, question);
        setCurrentQuestion(question);
        setTimer(10); // Reset timer to 10 seconds for each question
    });

    socket.on('scoreUpdate', ({ playerName, score }) => {
        if (playerName === name) {
          setScore(score); // Correctly updates score
        }
    });

    socket.on('gamePaused', ({ playerName }) => {
        if (playerName === name) {
            console.log("You've buzzed in. Waiting for the admin to award points.");
        } else {
            console.log(`Game paused because ${playerName} buzzed in.`);
        }
    });

    const countdown = setInterval(() => {
      setTimer((prevTimer) => prevTimer > 0 ? prevTimer - 1 : prevTimer);
  }, 1000);

  socket.on('timesUp', () => {
      alert("Time's up!");
      setTimer(0); // Reset timer to 0 or handle as needed
  });

    socket.on('gameOver', ({ sessionId }) => {
        console.log(`Game over for session ${sessionId}`);
        setCurrentQuestion(null);
    });

    return () => {
      socket.off('playerJoined');
      socket.off('playerBuzzed');
      socket.off('question');
      socket.off('gameOver');
      socket.off('gamePaused');
      socket.off('reopenQuestion');
      socket.off('scoreUpdate');
      clearInterval(countdown);
      socket.off('timesUp');
    };
  }, [sessionId, name, socket]); // Include name in dependencies

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
          <p>Timer: {timer}</p> {/* Display the timer */}
        </div>
      )}
      <p>Your Score: {score}</p> {/* Display the player's score */}
      <Leaderboard sessionId={sessionId} />
    </div>
  );
};

export default Player;
