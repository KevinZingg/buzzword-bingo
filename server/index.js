// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // For development ease, allow all origins
    methods: ["GET", "POST"],
  },
});

let sessions = {}; // Store session data

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('joinSession', ({ sessionId, playerName }) => {
    if (sessions[sessionId]) {
        // Add player to the session
        sessions[sessionId].players.push({ id: socket.id, name: playerName });
        socket.join(sessionId);
        console.log(`${playerName} joined session ${sessionId}`);
        // Broadcast to the session that a new player has joined
        io.to(sessionId).emit('playerJoined', { playerName, sessionId });
    } else {
        console.log(`Session ${sessionId} not found`);
        socket.emit('error', 'Session not found');
    }
});

socket.on('buzz', ({ sessionId, playerName }) => {
    console.log(`${playerName} buzzed in session ${sessionId}`);
    // Broadcast the buzz event to all clients in the session
    io.to(sessionId).emit('playerBuzzed', { playerName, sessionId });
});

  socket.on('uploadQuestions', (sessionId, questions) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        sessions[sessionId].questions = questions;
        console.log(`Questions uploaded for session ${sessionId}`);
    }
});

socket.on('nextQuestion', ({ sessionId }) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        sessions[sessionId].currentQuestionIndex += 1;
        if (sessions[sessionId].currentQuestionIndex < sessions[sessionId].questions.length) {
            const currentQuestion = sessions[sessionId].questions[sessions[sessionId].currentQuestionIndex];
            console.log(`Moving to next question in session ${sessionId}`);
            io.to(sessionId).emit('question', { question: currentQuestion, sessionId });
        } else {
            console.log(`Game over in session ${sessionId}`);
            io.to(sessionId).emit('gameOver', { sessionId });
        }
    }
});

socket.on('startGame', ({ sessionId }) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        console.log(`Game starting in session ${sessionId}`);
        sessions[sessionId].state = 'active';
        sessions[sessionId].currentQuestionIndex = 0; // Assuming questions are stored in an array
        const currentQuestion = sessions[sessionId].questions[sessions[sessionId].currentQuestionIndex];
        io.to(sessionId).emit('question', { question: currentQuestion, sessionId });
    }
});

socket.on('buzz', ({ sessionId, playerId }) => {
    if (sessions[sessionId] && sessions[sessionId].state === 'active') {
        sessions[sessionId].state = 'paused';
        io.to(sessionId).emit('buzzed', { playerId });
        console.log(`Player ${playerId} buzzed in session ${sessionId}`);
    }
});

socket.on('score', ({ sessionId, playerId, score }) => {
    // Implement scoring logic based on your game's requirements
    console.log(`Player ${playerId} scored ${score} in session ${sessionId}`);
    // Example: Emitting an update to all clients
    io.to(sessionId).emit('scoreUpdate', { playerId, score });
});

  socket.on('createSession', ({ adminName }) => {
    const sessionId = generateSessionId(); // Implement this function based on your preference
    sessions[sessionId] = { admin: socket.id, players: [], questions: [], state: 'lobby' };
    socket.join(sessionId);
    socket.emit('sessionCreated', { sessionId });
  });

  socket.on('joinSession', ({ sessionId, playerName }) => {
    if (sessions[sessionId]) {
      sessions[sessionId].players.push({ id: socket.id, name: playerName });
      socket.join(sessionId);
      io.to(sessionId).emit('playerJoined', { players: sessions[sessionId].players });
    } else {
      socket.emit('error', 'Session not found');
    }
  });

  // Add more event handlers for game flow here

  socket.on('disconnect', () => {
    console.log('user disconnected');
    // Handle player/admin disconnects
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

function generateSessionId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
