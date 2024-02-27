// src/components/Admin.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Papa from 'papaparse';

const socket = io('http://localhost:3001'); // Ensure this matches your server URL

const Admin = () => {
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    socket.on('sessionCreated', ({ sessionId }) => {
      console.log('Session Created', sessionId);
      setSessionId(sessionId);
    });

    // Listen for other socket events as needed

    return () => {
      socket.off('sessionCreated');
      // Disconnect other socket listeners if any
    };
  }, []);

  const createSession = () => {
    socket.emit('createSession', { adminName: 'Admin' }); // You can add admin name input
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
      complete: function(results) {
        console.log('Parsed Questions:', results.data);
        setQuestions(results.data);
      },
      header: true
    });
  };

  const uploadQuestions = () => {
    socket.emit('uploadQuestions', sessionId, questions);
    console.log('Questions uploaded');
  };

  const startGame = () => {
    socket.emit('startGame', sessionId);
    console.log('Game started');
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      {sessionId ? (
        <>
          <p>Session ID: {sessionId}</p>
          <input type="file" onChange={handleFileChange} />
          <button onClick={uploadQuestions}>Upload Questions</button>
          <button onClick={startGame}>Start Game</button>
        </>
      ) : (
        <button onClick={createSession}>Create Game Session</button>
      )}
    </div>
  );
};

export default Admin;
