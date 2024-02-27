// src/components/Admin.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Papa from 'papaparse';

const socket = io('http://localhost:3001'); // Ensure this matches your server URL

const Admin = () => {
    const [sessionId, setSessionId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [buzzedPlayer, setBuzzedPlayer] = useState('');
    const [isGamePaused, setIsGamePaused] = useState(false);


    useEffect(() => {
        socket.on('sessionCreated', ({ sessionId }) => {
            console.log('Session Created', sessionId);
            setSessionId(sessionId);
        });

        socket.on('gamePaused', ({ playerName }) => {
            setBuzzedPlayer(playerName);
            setIsGamePaused(true);
        });

        socket.on('question', ({ question }) => {
            console.log(`Current Question: ${question.question}`); // Log the current question
            setCurrentQuestion(question);
        });

        // Clean up on component unmount
        return () => {
            socket.off('sessionCreated');
            socket.off('question');
            socket.off('gamePaused');
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
                    {currentQuestion && (
                        <div>
                            <h3>Current Question:</h3>
                            <p>{currentQuestion.question}</p>
                            {/* Display solution or created_at if needed */}
                        </div>
                    )}
                    {isGamePaused && (
                        <div>
                            <p>{buzzedPlayer} buzzed in. Award points?</p>
                            <button onClick={() => awardPoints(1)}>Yes</button>
                            <button onClick={() => awardPoints(0)}>No</button>
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
