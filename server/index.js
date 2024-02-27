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

  socket.on('uploadQuestions', (sessionId, questions) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        sessions[sessionId].questions = questions;
        console.log(`Questions uploaded for session ${sessionId}`);
    }
});

socket.on('startGame', (sessionId) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        sessions[sessionId].state = 'active';
        io.to(sessionId).emit('gameStarted');
        console.log(`Game started for session ${sessionId}`);
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
