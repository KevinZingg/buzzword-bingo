// src/components/Admin.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Papa from 'papaparse';
import Leaderboard from './Leaderboard';


const socket = io('http://localhost:3001'); // Ensure this matches your server URL

const Admin = () => {
    const [sessionId, setSessionId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [buzzedPlayer, setBuzzedPlayer] = useState('');
    const [isGamePaused, setIsGamePaused] = useState(false);
    const [timer, setTimer] = useState(10); // Initialize with 10 seconds for the countdown


    useEffect(() => {
        socket.on('sessionCreated', ({ sessionId }) => {
            console.log('Session Created', sessionId);
            setSessionId(sessionId);
        });

        socket.on('gamePaused', ({ playerName }) => {
            setBuzzedPlayer(playerName);
            setIsGamePaused(true);
        });


        socket.on('buzzed', ({ playerName, sessionId }) => {
            console.log(`${playerName} buzzed in session ${sessionId}`);
            setBuzzedPlayer(playerName);
            // Assuming currentQuestion is already set when the question is sent out
        });

    // Listen for a new question to start the timer
    socket.on('question', () => {
        setTimer(10); // Reset timer to 10 seconds
        // Start the countdown
        const interval = setInterval(() => {
            setTimer((prevTimer) => prevTimer > 0 ? prevTimer - 1 : 0);
        }, 1000);
        setTimeout(() => clearInterval(interval), 10000); // Clear interval after 10 seconds
    });

            // Listen for the timesUp event to stop the timer
        socket.on('timesUp', () => {
            setTimer(0); // Reset timer
            alert("Time has expired for the current question. Please proceed."); // Custom message for admin
        });

        // Clean up on component unmount
        return () => {
            socket.off('sessionCreated');
            socket.off('question');
            socket.off('gamePaused');
            socket.off('buzzed');
            socket.off('timesUp');
        };
    }, []);

    const createSession = () => {
        socket.emit('createSession', { adminName: 'Admin' });
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
        if (questions.length > 0) {
            const formattedQuestions = questions.map(q => ({
                question: q.question,
                solution: q.solution,
                created_at: q.created_at // Adjust as needed
            }));

            socket.emit('uploadQuestions', { sessionId, questions: formattedQuestions });
            console.log('Questions uploaded', formattedQuestions);
        } else {
            console.log('No questions to upload');
        }
    };

    const awardPoints = (points) => {
        socket.emit('awardPoints', { sessionId, playerName: buzzedPlayer, points });
        setIsGamePaused(false);
        setBuzzedPlayer('');
        // Optionally move to the next question automatically or wait for admin action
    };

    const startGame = () => {
        console.log(`Starting game for session ${sessionId}`);
        socket.emit('startGame', { sessionId });
    };

    const nextQuestion = () => {
        console.log(`Requesting next question for session ${sessionId}`);
        socket.emit('nextQuestion', { sessionId });
    };

    // Inside Admin component
    const handleAdminDecision = (decision) => {
        socket.emit('adminDecision', { sessionId, decision });
        setBuzzedPlayer(''); // Reset after decision
    };

    const pauseGame = () => {
        socket.emit('pauseGame', { sessionId });
    };
    
    const closeGame = () => {
        socket.emit('closeGame', { sessionId });
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
                    <button onClick={nextQuestion}>Next Question</button>
                    <button onClick={pauseGame}>Pause Game</button>
                    <button onClick={closeGame}>Close Game</button>
                    {currentQuestion && (
                        <div>
                            <h3>Current Question:</h3>
                            <p>{currentQuestion.question}</p>
                            <p>Time left: {timer} seconds</p> {/* Display the countdown timer */}
                        </div>
                    )}

                    {buzzedPlayer && (
                        <div>
                            <p>{buzzedPlayer} buzzed in. Decide:</p>
                            <button onClick={() => handleAdminDecision('correct')}>Correct</button>
                            <button onClick={() => handleAdminDecision('incorrect')}>Incorrect</button>
                        </div>
                    )}
                    {isGamePaused && (
                        <div>
                            <p>{buzzedPlayer} buzzed in. Award points?</p>
                            <button onClick={() => awardPoints(1)}>Yes</button>
                            <button onClick={() => awardPoints(0)}>No</button>
                            <Leaderboard sessionId={sessionId} />
                        </div>
                    )}
                </>
            ) : (
                <button onClick={createSession}>Create Game Session</button>
            )}
        </div>
    );    
};

export default Admin;
