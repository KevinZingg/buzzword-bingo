// src/components/Home.js
import React from 'react';

const Home = ({ onRoleSelected }) => {
  return (
    <div>
      <button onClick={() => onRoleSelected('admin')}>Game Leader</button>
      <button onClick={() => onRoleSelected('player')}>Player</button>
    </div>
  );
};

export default Home;
