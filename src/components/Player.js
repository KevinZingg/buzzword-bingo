// src/components/Player.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Leaderboard from './Leaderboard';
import { motion } from 'framer-motion';

const socket = io('http://localhost:3001');

const Player = () => {
  const [sessionId, setSessionId] = useState('');
  const [name, setName] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [playerList, setPlayerList] = useState([]);
  const [scores, setScores] = useState([]);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState([]);

  // useEffect hook remains the same

  const inputStyle = "my-2 mx-auto p-2 w-full max-w-xs text-gray-700 bg-gray-50 rounded border border-gray-300 focus:outline-none focus:border-gray-500";
  const buttonStyle = "mx-auto my-2 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75";


  useEffect(() => {
    socket.on('playerJoined', ({ playerName, sessionId }) => {
      console.log(`${playerName} has joined the session ${sessionId}`);
    });

    socket.on('updateLeaderboard', (updatedLeaderboard) => {
      console.log('Leaderboard updated:', updatedLeaderboard);
      setLeaderboardPlayers(updatedLeaderboard);
  });
    socket.on('joinSuccess', () => {
      setHasJoined(true); // Update join status upon successful join
    });

    socket.on('playerBuzzed', ({ playerName, sessionId }) => {
      console.log(`${playerName} buzzed in session ${sessionId}`);
    });

    socket.on('reopenQuestion', ({ question }) => {
        console.log(`Reopened question: ${question.question}`);
    });

    socket.on('question', ({ question }) => {
      setCurrentQuestion(question); // Assuming question is the text of the question
      setTimer(10); // Reset timer
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
      socket.off('joinSuccess'); // Cleanup listener
      socket.off('updatePlayerList');
      socket.off('updateLeaderboard');
    };
  }, [sessionId, name, socket]); // Include name in dependencies

  const joinSession = () => {
    console.log(`${name} attempting to join session ${sessionId}`);
    socket.emit('joinSession', { sessionId, playerName: name });
    // Assuming the server emits 'joinSuccess' when join is successful
  };

  const buzzIn = () => {
    console.log(`${name} buzzed in session ${sessionId}`);
    socket.emit('buzz', { sessionId, playerName: name });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen bg-cream-100"
    >
      <h2 className="text-2xl font-bold text-gray-700">Player Join</h2>
      {!hasJoined ? (
        <>
          <input
            type="text"
            placeholder="Session ID"
            value={sessionId}
            onChange={e => setSessionId(e.target.value)}
            className={inputStyle}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputStyle}
          />
          <button onClick={joinSession} className={buttonStyle}>Join Game</button>
        </>
      ) : (
        <>
<h3 className="text-xl font-semibold">Welcome, {name}!</h3>
<button onClick={buzzIn} className={buttonStyle}>Buzz</button>
{currentQuestion && (
  <div className="mt-4 p-4 bg-blue-100 rounded-lg shadow-lg">
    <h4 className="text-lg font-bold">Current Question:</h4>
    <p className="text-lg">{currentQuestion || "Waiting for question..."}</p>
    <p>Timer: {timer}</p>
  </div>
)}


        <Leaderboard players={leaderboardPlayers} />
        </>
      )}
    </motion.div>
  );
};

export default Player;