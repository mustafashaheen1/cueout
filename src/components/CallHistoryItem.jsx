import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

export default function CallHistoryItem({ call, index, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all duration-200 active:scale-98"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center text-2xl border border-red-500/30">
          {call.icon}
        </div>

        <div className="flex-1 text-left">
          <h3 className="font-semibold text-white mb-0.5">{call.persona}</h3>
          <p className="text-sm text-zinc-400">{call.scheduledTime}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400 font-medium">{call.duration}</span>
          {call.status === 'answered' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-zinc-500" />
          )}
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </div>
      </div>
    </motion.button>
  );
}