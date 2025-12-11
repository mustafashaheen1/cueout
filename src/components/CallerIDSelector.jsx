import React from 'react';
import { motion } from 'framer-motion';
import { X, Phone, Check } from 'lucide-react';
import { useApp } from './AppContext';

export default function CallerIDSelector({ selected, onSelect, onClose }) {
  const { callerIDs } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] bg-zinc-900 rounded-3xl p-6 max-h-[600px] overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Select Caller ID</h3>
            <p className="text-sm text-zinc-400 mt-1">Choose a number to display so you can add it to your contacts (names can be changed in Account)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <button
            onClick={() => onSelect(null)}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
              !selected
                ? 'bg-red-500/20 border-red-500 shadow-lg shadow-red-500/20'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-zinc-600 to-zinc-700 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${!selected ? 'text-white' : 'text-zinc-300'}`}>
                  No Caller ID
                </p>
                <p className="text-xs text-zinc-500">Use random number</p>
              </div>
              {!selected && (
                <Check className="w-5 h-5 text-red-500" />
              )}
            </div>
          </button>

          {callerIDs.map((callerId) => (
            <button
              key={callerId.id}
              onClick={() => onSelect(callerId)}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                selected?.id === callerId.id
                  ? 'bg-red-500/20 border-red-500 shadow-lg shadow-red-500/20'
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${selected?.id === callerId.id ? 'text-white' : 'text-zinc-200'}`}>
                    {callerId.name}
                  </p>
                  <p className="text-sm text-zinc-400">{callerId.number}</p>
                </div>
                {selected?.id === callerId.id && (
                  <Check className="w-5 h-5 text-red-500" />
                )}
              </div>
            </button>
          ))}
        </div>


      </motion.div>
    </motion.div>
  );
}