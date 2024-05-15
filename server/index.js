// server/index.js
const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require("socket.io");

const app = express();

// Read the certificate and key from the same directory
const privateKey = fs.readFileSync('app.workshop.local.key', 'utf8');
const certificate = fs.readFileSync('app.workshop.local.crt', 'utf8');

const credentials = { key: privateKey, cert: certificate };

// Creating HTTPS server with the SSL credentials
const server = https.createServer(credentials, app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this as needed in production
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


socket.on('awardPoints', ({ sessionId, points }) => {
    const session = sessions[sessionId];
    if (session && session.buzzedPlayer) {
        const player = session.players.find(p => p.id === session.buzzedPlayer.id);
        if (player) {
            player.score += points;
            console.log(`Score updated for ${player.name} to ${player.score} in session ${sessionId}`);

            // Emit updated scores to all clients
            io.to(sessionId).emit('updateLeaderboard', session.players);

            // Reset buzzedPlayer after awarding points
            session.buzzedPlayer = null;
        } else {
            console.log(`Buzzed player not found in session ${sessionId}`);
        }
    } else {
        console.log(`Session ${sessionId} not found or no player buzzed`);
    }
});




// When pausing the game, clear the existing timer interval as well.
socket.on('pauseGame', ({ sessionId }) => {
    if (sessions[sessionId] && socket.id === sessions[sessionId].admin) {
        sessions[sessionId].state = 'paused';
        clearInterval(sessions[sessionId].timerInterval); // Clear existing timer interval
        io.to(sessionId).emit('gamePaused', {});
        console.log(`Debug: Game paused in session ${sessionId}`);
    }
});


// When resuming the game, start a new 10-second timer.
socket.on('resumeGame', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (session && socket.id === session.admin) {
        session.state = 'active';
        session.timer = 10; // Optionally reset the timer to 10 seconds upon resuming
        manageTimer(sessionId); // Restart the timer countdown
        io.to(sessionId).emit('gameResumed'); // Notify all clients the game has resumed
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
        // Shuffle the questions array
        const shuffledQuestions = shuffleArray(questions.map(q => ({
            question: q.question,
            solution: q.solution,
            // Optionally convert created_at to a JavaScript Date object
            // created_at: new Date(q.created_at)
        })));
        sessions[sessionId].questions = shuffledQuestions;
        console.log(`Questions uploaded for session ${sessionId}`);
    } else {
        socket.emit('error', `Failed to upload questions for session ${sessionId}`);
    }
});


socket.on('nextQuestion', ({ sessionId }) => {
    const session = sessions[sessionId];
    if (session && socket.id === session.admin) {
        session.currentQuestionIndex += 1;
        if (session.currentQuestionIndex < session.questions.length) {
            const currentQuestion = session.questions[session.currentQuestionIndex];
            console.log(`Moving to next question in session ${sessionId}`);

            // Reset the timer
            session.timer = 10; // Reset the timer to 10 seconds for the new question
            manageTimer(sessionId); // Manage the countdown and emit the timer updates

            io.to(sessionId).emit('question', {
                question: currentQuestion.question,
                solution: currentQuestion.solution,
                sessionId,
            });
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
            io.to(sessionId).emit('question', { question: currentQuestion.question, solution: currentQuestion.solution, sessionId });
        } else {
            console.log(`No questions available in session ${sessionId}`);
        }
    }
});


socket.on('buzz', ({ sessionId, playerName }) => {
    const session = sessions[sessionId];
    if (session && session.state === 'active') {

        session.state = 'paused';
        session.buzzedPlayer = { name: playerName, id: socket.id };
        console.log(`${playerName} buzzed in session ${sessionId}`);
        io.to(sessionId).emit('gamePaused', { playerName: sessions[sessionId].buzzedPlayer.name });
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
    io.to(sessionId).emit('scoreUpdate', { playerName: player.name, score: player.score });
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

// Function to manage the timer
// At the beginning of manageTimer function in index.js

function manageTimer(sessionId) {
    console.log(`Debug: manageTimer called for session ${sessionId}`);
    const session = sessions[sessionId];
    if (!session) {
        console.log(`Debug: Session ${sessionId} not found.`);
        return;
    }

    console.log(`Debug: Initial timer value for session ${sessionId}: ${session.timer}`);

    clearInterval(session.timerInterval); // Clear any existing timer interval

    session.timerInterval = setInterval(() => {
        // Check if the game is paused. If so, skip the timer decrement logic
        if (session.state === 'paused') {
            console.log(`Debug: Timer paused for session ${sessionId}`);
            return; // Skip the timer decrement and subsequent logic
        }

        console.log(`Debug: Interval check for session ${sessionId}, Timer: ${session.timer}`);
        if (session.timer > 0) {
            session.timer -= 1;
            console.log(`Debug: Timer decremented for session ${sessionId}, New Timer: ${session.timer}`);
            io.to(sessionId).emit('timerUpdate', { timer: session.timer });
        } else {
            clearInterval(session.timerInterval); // Stop the timer
            console.log('Debug: Times up');
            io.to(sessionId).emit('timesUp', sessionId);
        }
    }, 1000); // Update every second
}


function generateSessionId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  