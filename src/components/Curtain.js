// src/components/Curtain.js
import React from 'react';
import { motion } from 'framer-motion';

const Curtain = ({ isOpen, message }) => {
  return (
    <motion.div
      className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black text-white z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      exit={{ opacity: 0 }}
    >
      <p>{message}</p>
    </motion.div>
  );
};

export default Curtain;
