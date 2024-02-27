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

// Inside io.on('connection', (socket) => { ... })

socket.on('buzz', ({ sessionId, playerName }) => {
    if (sessions[sessionId] && sessions[sessionId].state === 'active') {
        sessions[sessionId].state = 'paused'; // Pause the game
        sessions[sessionId].buzzedPlayer = playerName; // Store who buzzed
        io.to(sessionId).emit('gamePaused', { playerName }); // Notify all clients in the session
        console.log(`${playerName} buzzed in session ${sessionId}`);
    }
});

socket.on('awardPoints', ({ sessionId, playerName, points }) => {
    // Implementation depends on how you're tracking player scores.
    // For simplicity, you might keep a 'score' field in the player object.
    console.log(`${playerName} awarded ${points} points in session ${sessionId}`);
    // Find the player and update their score
    // Then notify all clients in the session about the updated scores
});

socket.on('uploadQuestions', ({ sessionId, questions }) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        // Assuming each question is an object with question, solution, created_at
        sessions[sessionId].questions = questions.map(q => ({
            question: q.question,
            solution: q.solution,
            // Optionally convert created_at to a JavaScript Date object
            // created_at: new Date(q.created_at)
        }));
        console.log(`Questions uploaded for session ${sessionId}`);
    } else {
        socket.emit('error', `Failed to upload questions for session ${sessionId}`);
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

socket.on('buzz', ({ sessionId, playerName }) => {
    const session = sessions[sessionId];
    if (session && session.state === 'active') {
        session.state = 'paused';
        session.buzzedPlayer = playerName; // Track who buzzed
        console.log(`${playerName} buzzed in session ${sessionId}`);
        io.to(sessionId).emit('buzzed', { playerName, sessionId });
    }
});

socket.on('adminDecision', ({ sessionId, decision }) => {
    const session = sessions[sessionId];
    if (session) {
        switch (decision) {
            case 'correct':
                // Move to next question or end game if it was the last question
                break;
            case 'incorrect':
                // Optionally open the same question again
                session.state = 'active'; // Allow re-buzzing
                io.to(sessionId).emit('reopenQuestion', { question: session.questions[session.currentQuestionIndex] });
                break;
            // Handle other decisions as necessary
        }
        console.log(`Admin made a decision: ${decision} for session ${sessionId}`);
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
