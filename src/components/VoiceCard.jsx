import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, Sparkles } from 'lucide-react';

export default function VoiceCard({ voice, selected, onClick }) {
  const isRealistic = voice.gender !== undefined;
  
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
        selected
          ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/30'
          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
      }`}
    >
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-purple-500/10 blur-xl rounded-2xl"
        />
      )}

      <div className="relative">
        {/* Voice icon/avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3 ${
          isRealistic 
            ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg'
            : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg'
        }`}>
          {voice.icon}
        </div>

        {/* Voice name */}
        <h4 className={`font-semibold text-sm mb-1 ${selected ? 'text-white' : 'text-zinc-300'}`}>
          {voice.name}
        </h4>

        {/* Voice description/type */}
        <p className={`text-xs ${selected ? 'text-zinc-300' : 'text-zinc-500'}`}>
          {voice.description || voice.type}
        </p>

        {/* Realistic badge */}
        {isRealistic && (
          <div className="flex items-center gap-1 mt-2">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-purple-400 font-semibold">Ultra Realistic</span>
          </div>
        )}

        {/* Gender indicator for realistic voices */}
        {isRealistic && (
          <div className="absolute top-0 right-0">
            <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              voice.gender === 'female'
                ? 'bg-pink-500/20 text-pink-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {voice.gender === 'female' ? 'F' : 'M'}
            </div>
          </div>
        )}

        {/* Play icon */}
        <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center ${
          selected ? 'bg-purple-500' : 'bg-zinc-700'
        }`}>
          <Volume2 className="w-3 h-3" />
        </div>
      </div>
    </motion.button>
  );
}