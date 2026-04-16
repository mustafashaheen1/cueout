import React from 'react';
import { motion } from 'framer-motion';

export default function ToneSelector({ tone, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`relative p-3 rounded-2xl border-2 overflow-hidden transition-all duration-200 text-left ${
        selected
          ? 'bg-red-500/20 border-red-500 shadow-lg shadow-red-500/20'
          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      {selected && (
        <motion.div
          layoutId="toneBg"
          className="absolute inset-0 bg-red-500/10 blur-xl rounded-2xl"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}

      <div className="relative min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xl flex-shrink-0">{tone.icon}</span>
          <span className={`text-sm font-semibold truncate ${selected ? 'text-white' : 'text-zinc-300'}`}>
            {tone.label}
          </span>
        </div>
        <p className={`text-xs leading-tight line-clamp-2 ${selected ? 'text-zinc-300' : 'text-zinc-500'}`}>
          {tone.description}
        </p>
      </div>
    </motion.button>
  );
}