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
        // Check if the player is already in the session
        const existingPlayer = sessions[sessionId].players.find(p => p.id === socket.id);
        if (!existingPlayer) {
            // Add player to the session with initial score if they're not already in it
            sessions[sessionId].players.push({ id: socket.id, name: playerName, score: 0 });
            console.log(`${playerName} joined session ${sessionId}`);
            // After adding the player to the session
            socket.emit('joinSuccess'); // Emit back to the player
            // Emit to the specific session that a new player has joined
            io.to(sessionId).emit('playerJoined', { playerName, sessionId });
        } else {
            // Optionally handle the case where the player is already in the session
            console.log(`${playerName} is already in session ${sessionId}`);
        }
        socket.join(sessionId);
    } else {
        console.log(`Session ${sessionId} not found`);
        socket.emit('error', 'Session not found');
    }
});

// Inside io.on('connection', (socket) => { ... })

socket.on('buzz', ({ sessionId, playerName }) => {
    if (sessions[sessionId] && sessions[sessionId].state === 'active') {
        sessions[sessionId].state = 'paused'; // Pause the game
        // Store both playerName and socket.id of the buzzed player
        sessions[sessionId].buzzedPlayer = { name: playerName, id: socket.id };
        io.to(sessionId).emit('gamePaused', { playerName }); // Notify all clients in the session
        console.log(`${playerName} buzzed in session ${sessionId}`);
    }
});


socket.on('awardPoints', ({ sessionId, points }) => {
    const session = sessions[sessionId];
    if (session && session.buzzedPlayer) {
        const player = session.players.find(p => p.id === session.buzzedPlayer.id);
        if (player) {
            player.score += points;
            // Emit an updated players list to all clients in the session
            io.to(sessionId).emit('updateLeaderboard', sessions[sessionId].players);
            io.to(sessionId).emit('scoreUpdate', { playerName: player.name, score: player.score });
            console.log(`Score updated for ${player.name} to ${player.score} in session ${sessionId}`);
            // Reset buzzedPlayer after awarding points
            session.buzzedPlayer = null;
        } else {
            console.log(`Buzzed player not found in session ${sessionId}`);
        }
    } else {
        console.log(`Session ${sessionId} not found or no player buzzed`);
    }
});

socket.on('pauseGame', ({ sessionId }) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        sessions[sessionId].state = 'paused';
        io.to(sessionId).emit('gamePaused');
        console.log(`Game paused in session ${sessionId}`);
    }
});

socket.on('closeGame', ({ sessionId }) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        delete sessions[sessionId]; // Remove the session from the sessions object
        io.to(sessionId).emit('gameClosed');
        console.log(`Game closed in session ${sessionId}`);
    }
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
            // Start a 10-second timer
            clearTimeout(sessions[sessionId].questionTimeout); // Clear any existing timer
            sessions[sessionId].questionTimeout = setTimeout(() => {
                console.log(`Time's up for question in session ${sessionId}`);
                io.to(sessionId).emit('timesUp', sessionId);
                // Here you can define what happens when time is up, for example:
                // Move to the next question or emit an event to notify players
            }, 10000); // 10 seconds
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
        sessions[sessionId].currentQuestionIndex = 0; // Make sure this is correctly initialized
        if (sessions[sessionId].questions && sessions[sessionId].questions.length > 0) {
            const currentQuestion = sessions[sessionId].questions[sessions[sessionId].currentQuestionIndex];
            io.to(sessionId).emit('question', { question: currentQuestion, sessionId });
        } else {
            console.log(`No questions available in session ${sessionId}`);
        }
    }
});


socket.on('buzz', ({ sessionId, playerName }) => {
    const session = sessions[sessionId];
    if (session && session.state === 'active') {
        clearTimeout(session.questionTimeout); // Cancel the timer
        session.state = 'paused';
        session.buzzedPlayer = { name: playerName, id: socket.id };
        console.log(`${playerName} buzzed in session ${sessionId}`);
        io.to(sessionId).emit('gamePaused', { playerName, sessionId });
    }
});


socket.on('adminDecision', ({ sessionId, decision }) => {
    const session = sessions[sessionId];
    if (session) {
        switch (decision) {
            case 'correct':
                // Move to next question or end game if it was the last question
                session.state = 'active';
                io.to(sessionId).emit('gameResumed', { sessionId }); // Notify clients to allow buzzing again
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
    setScore(score); // Correctly updates score
});

  socket.on('createSession', ({ adminName }) => {
    const sessionId = generateSessionId(); // Implement this function based on your preference
    sessions[sessionId] = { admin: socket.id, players: [], questions: [], state: 'lobby' };
    socket.join(sessionId);
    socket.emit('sessionCreated', { sessionId });
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
