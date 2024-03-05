// src/components/Admin.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Papa from 'papaparse';
import Leaderboard from './Leaderboard';
import { motion } from 'framer-motion';

const socket = io('http://localhost:3001'); // Ensure this matches your server URL

const Admin = () => {
    const [sessionId, setSessionId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [currentSolution, setCurrentSolution] = useState("");
    const [buzzedPlayer, setBuzzedPlayer] = useState('');
    const [isGamePaused, setIsGamePaused] = useState(false);
    const [timer, setTimer] = useState(10); // Initialize with 10 seconds for the countdown
    const [gamePhase, setGamePhase] = useState('beforeStart'); // New state to manage game phases
    const [playerList, setPlayerList] = useState([]);
    const [scores, setScores] = useState([]);
    const [leaderboardPlayers, setLeaderboardPlayers] = useState([]);


    // Add your useEffect hook here as before

    const buttonStyle = "mx-2 my-1 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75";


    useEffect(() => {
        socket.on('sessionCreated', ({ sessionId }) => {
            console.log('Session Created', sessionId);
            setSessionId(sessionId);
        });

        socket.on('updateLeaderboard', (updatedLeaderboard) => {
            console.log('Leaderboard updated:', updatedLeaderboard);
            setLeaderboardPlayers(updatedLeaderboard);
        });
        
        socket.on('gamePaused', ({ playerName }) => {
            setBuzzedPlayer(playerName);
            setIsGamePaused(true);
        });

        socket.on('updateScores', (updatedScores) => {
            setScores(updatedScores);
          });

        socket.on('buzzed', ({ playerName, sessionId }) => {
            console.log(`${playerName} buzzed in session ${sessionId}`);
            setBuzzedPlayer(playerName);
            // Assuming currentQuestion is already set when the question is sent out
        });

    // Listen for a new question to start the timer
// Inside the useEffect hook, adjust the 'question' event listener
socket.on('question', ({ question, solution }) => {
    setCurrentQuestion({ text: question, solution }); // Store both question and solution
    setTimer(10); // Reset timer to 10 seconds
    const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer > 0 ? prevTimer - 1 : 0);
    }, 1000);
    setTimeout(() => clearInterval(interval), 10000); // Clear interval after 10 seconds
});



socket.on('gameOver', () => {
    alert("Game done"); // Notify the admin that the game is over
    // Any additional cleanup or UI adjustments can be handled here
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
            socket.off('gameOver'); // Ensure to clean up this listener as well
            socket.off('updateLeaderboard');
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
        // This awards points to the buzzed player based on the admin's decision
        socket.emit('awardPoints', { sessionId, playerName: buzzedPlayer, points });
        setIsGamePaused(false);
        setBuzzedPlayer('');
        // Optionally move to the next question automatically or wait for admin action
      };

    const startGame = () => {
        console.log(`Starting game for session ${sessionId}`);
        socket.emit('startGame', { sessionId });
        setGamePhase('duringGame'); // Change game phase to duringGame
    };

    const nextQuestion = () => {
        console.log(`Requesting next question for session ${sessionId}`);
        socket.emit('nextQuestion', { sessionId });
    };

    // Inside Admin component
    const handleAdminDecision = (decision) => {
        // This emits an event based on the admin's decision about correctness
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-cream-100 flex flex-col items-center justify-center"
        >
            <h2 className="text-2xl font-bold text-gray-700">Admin Panel</h2>
            {sessionId && (
                <div className="space-y-4 mt-5">
                    <p className="text-xl font-bold">Session ID: <span className="text-lg text-green-600">{sessionId}</span></p>
                    {gamePhase === 'beforeStart' && (
                        <>
                            <input type="file" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
                            <div className="flex flex-wrap justify-center">
                                <button onClick={uploadQuestions} className={buttonStyle}>Upload Questions</button>
                                <button onClick={startGame} className={buttonStyle}>Start Game</button>
                            </div>
                        </>
                    )}
                    {gamePhase === 'duringGame' && (
                        <>
                            <button onClick={nextQuestion} className={buttonStyle}>Next Question</button>
                            <button onClick={pauseGame} className={buttonStyle}>Pause Game</button>
                            <button onClick={closeGame} className={buttonStyle}>Close Game</button>
                            {currentQuestion && (
                                <div className="text-center p-4 bg-blue-100 rounded-lg shadow">
                                    <h3 className="text-xl font-semibold">Current Question:</h3>
                                    <p className="text-lg">{currentQuestion.text || "Waiting for question..."}</p>
                                    <h4 className="text-xl font-semibold">Answer:</h4>
                                    <p className="text-lg">{currentQuestion.solution || "Waiting for solution..."}</p>
                                    <p>Time left: {timer} seconds</p>
                                    <Leaderboard players={leaderboardPlayers} />
                                </div>
                            )}

        {buzzedPlayer && (
            <div className="mt-4 p-4 bg-yellow-100 rounded-lg shadow">
                <p className="text-lg">{buzzedPlayer} buzzed in. Decide:</p>
                <button onClick={() => handleAdminDecision('correct')} className={buttonStyle + " bg-green-500 hover:bg-green-600"}>Correct</button>
                <button onClick={() => handleAdminDecision('incorrect')} className={buttonStyle + " bg-red-500 hover:bg-red-600"}>Incorrect</button>
            </div>
        )}
        {isGamePaused && (
            <div className="mt-4 p-4 bg-orange-100 rounded-lg shadow">
                <p className="text-lg">{buzzedPlayer} buzzed in. Award points?</p>
                <button onClick={() => awardPoints(1)} className={buttonStyle + " bg-green-500 hover:bg-green-600"}>Yes</button>
                <button onClick={() => awardPoints(0)} className={buttonStyle + " bg-red-500 hover:bg-red-600"}>No</button>
            </div>
        )}

                        </>
                    )}
                </div>
            )}
            {!sessionId && (
                <button onClick={createSession} className={buttonStyle}>Create Game Session</button>
            )}
        </motion.div>
    );
};

export default Admin;