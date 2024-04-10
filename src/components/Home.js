// src/components/Home.js
import React from 'react';
import { motion } from 'framer-motion';

const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.3,
    },
  },
  tap: {
    scale: 0.95,
  },
};

const Home = ({ onRoleSelected }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-cream-100">
      <motion.h1 
        className="text-4xl font-bold text-gray-800 mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Wilkommen zu Buzzword Bingo!
      </motion.h1>
      <motion.button
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        onClick={() => onRoleSelected('admin')}
        className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md m-2"
      >
        Spiel Admin
      </motion.button>
      <motion.button
        whileHover="hover"
        whileTap="tap"
        variants={buttonVariants}
        onClick={() => onRoleSelected('player')}
        className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md m-2"
      >
        Spieler
      </motion.button>
    </div>
  );
};

export default Home;
