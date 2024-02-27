// src/App.js
import React, { useState } from 'react';
import io from 'socket.io-client';
import Home from './components/Home';
import Admin from './components/Admin';
import Player from './components/Player';

const socket = io('http://localhost:3001'); // Adjust to match your server's address

function App() {
  const [role, setRole] = useState(''); // 'admin' or 'player'

  const handleRoleSelected = (selectedRole) => {
    console.log(`Role selected: ${selectedRole}`);
    setRole(selectedRole);
  };

  return (
    <div className="App">
      {role === '' && <Home onRoleSelected={handleRoleSelected} />}
      {role === 'admin' && <Admin socket={socket} />}
      {role === 'player' && <Player socket={socket} />}
    </div>
  );
}

export default App;
