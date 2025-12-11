import React from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';

export default function BackgroundSoundSelector({ sound, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
        selected
          ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20'
          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      {selected && (
        <motion.div
          layoutId="soundBg"
          className="absolute inset-0 bg-green-500/10 blur-xl rounded-2xl"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{sound.icon}</span>
          <span className={`font-semibold text-sm ${selected ? 'text-white' : 'text-zinc-300'}`}>
            {sound.label}
          </span>
        </div>
        <p className={`text-xs leading-tight ${selected ? 'text-zinc-300' : 'text-zinc-500'}`}>
          {sound.description}
        </p>
      </div>

      {/* Sound wave animation when selected */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-2 right-2"
        >
          <div className="flex items-center gap-0.5">
            <motion.div
              animate={{ height: ['8px', '4px', '12px', '6px'] }}
              transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
              className="w-0.5 bg-green-400 rounded-full"
            />
            <motion.div
              animate={{ height: ['4px', '12px', '6px', '10px'] }}
              transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut', delay: 0.1 }}
              className="w-0.5 bg-green-400 rounded-full"
            />
            <motion.div
              animate={{ height: ['10px', '6px', '4px', '12px'] }}
              transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut', delay: 0.2 }}
              className="w-0.5 bg-green-400 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}