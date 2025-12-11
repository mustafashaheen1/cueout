import React from 'react';
import { motion } from 'framer-motion';

const durations = [15, 30, 45, 60, 90, 120];

export default function DurationSlider({ value, onChange }) {
  return (
    <div className="space-y-6">
      {/* Visual slider */}
      <div className="relative">
        {/* Track */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ 
              width: `${(durations.indexOf(value) / (durations.length - 1)) * 100}%` 
            }}
            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>

        {/* Duration markers */}
        <div className="relative flex justify-between mt-4">
          {durations.map((duration, index) => {
            const isSelected = value === duration;
            return (
              <button
                key={duration}
                onClick={() => onChange(duration)}
                className="flex flex-col items-center gap-2"
              >
                <motion.div
                  animate={{
                    scale: isSelected ? 1.2 : 1,
                  }}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    isSelected
                      ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/50'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}
                />
                <span className={`text-xs font-medium ${
                  isSelected ? 'text-white' : 'text-zinc-500'
                }`}>
                  {duration}s
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current selection display */}
      <div className="bg-zinc-800/50 rounded-2xl p-4 text-center">
        <div className="text-4xl font-bold text-white mb-1">
          {value}
          <span className="text-2xl text-zinc-400 ml-1">seconds</span>
        </div>
        <p className="text-sm text-zinc-400">
          {value < 30 
            ? 'Quick exit' 
            : value < 60 
            ? 'Standard call' 
            : 'Extended conversation'}
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className={`p-3 rounded-xl border transition-all ${
          value === 15 
            ? 'bg-orange-500/20 border-orange-500/50' 
            : 'bg-zinc-800/30 border-zinc-800'
        }`}>
          <div className="text-xs text-zinc-400 mb-1">Quick</div>
          <div className="text-sm font-semibold">15-30s</div>
        </div>
        <div className={`p-3 rounded-xl border transition-all ${
          value >= 30 && value <= 60 
            ? 'bg-orange-500/20 border-orange-500/50' 
            : 'bg-zinc-800/30 border-zinc-800'
        }`}>
          <div className="text-xs text-zinc-400 mb-1">Standard</div>
          <div className="text-sm font-semibold">30-60s</div>
        </div>
        <div className={`p-3 rounded-xl border transition-all ${
          value > 60 
            ? 'bg-orange-500/20 border-orange-500/50' 
            : 'bg-zinc-800/30 border-zinc-800'
        }`}>
          <div className="text-xs text-zinc-400 mb-1">Long</div>
          <div className="text-sm font-semibold">90-120s</div>
        </div>
      </div>
    </div>
  );
}