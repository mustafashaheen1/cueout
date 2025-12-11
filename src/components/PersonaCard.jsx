import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';

export default function PersonaCard({ persona, selected, onClick, compact = false }) {
  const navigate = useNavigate();

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    navigate(createPageUrl('PersonaSettings'), { state: { persona } });
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="relative group">

        <motion.div
          whileTap={{ scale: 0.95 }} 
          className={`bg-[#121212] p-3 rounded-2xl w-20 transition-all border-2 ${
            selected 
              ? 'border-red-500 shadow-lg shadow-red-500/20' 
              : 'border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <div className={`w-14 h-14 mx-auto mb-2 rounded-full ${persona.color} flex items-center justify-center text-2xl`}>
            {persona.icon}
          </div>
          <p className="text-xs font-semibold text-center text-white truncate">{persona.name}</p>
        </motion.div>

        {selected &&
        <button
          onClick={handleSettingsClick}
          className="absolute -top-1 -right-1 w-6 h-6 bg-zinc-800 hover:bg-zinc-700 border-2 border-zinc-900 rounded-full flex items-center justify-center z-10 shadow-lg">

            <Settings className="w-3 h-3 text-zinc-300" />
          </button>
        }
      </button>);

  }

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full rounded-2xl p-4 transition-all ${
      selected ?
      'bg-red-500/20 border-2 border-red-500 shadow-lg shadow-red-500/20' :
      'bg-zinc-800 border-2 border-zinc-700 hover:border-zinc-600'}`
      }>

      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full ${persona.color} flex items-center justify-center text-3xl flex-shrink-0`}>
          {persona.icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-bold text-base text-white mb-1">{persona.name}</h3>
          <p className="text-xs text-zinc-400">Tap to select</p>
        </div>
        {selected &&
        <button
          onClick={handleSettingsClick}
          className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-full transition-colors">

            <Settings className="w-4 h-4 text-zinc-300" />
          </button>
        }
      </div>
    </motion.button>);

}