import React from 'react';
import { motion } from 'framer-motion';

export default function TimeChip({ label, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`relative py-2.5 px-3 rounded-full text-sm font-semibold transition-all duration-200 ${
        selected
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
      }`}
    >
      {selected && (
        <motion.div
          layoutId="timeChipBg"
          className="absolute inset-0 bg-red-500 rounded-full"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}