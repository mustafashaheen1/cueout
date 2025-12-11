import React from 'react';
import { motion } from 'framer-motion';
import { X, Phone, Users, Sparkles, MessageSquare } from 'lucide-react';

const Graphic = ({ type, color }) => {
  const gradient = `bg-gradient-to-br ${color}`;
  
  if (type === 'phone') {
    return (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className={`absolute inset-0 ${gradient} opacity-20 blur-2xl rounded-full animate-pulse`} />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={`relative z-10 w-14 h-14 ${gradient} rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-500/10`}
        >
          <Phone className="w-7 h-7 text-white" />
        </motion.div>
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
            className={`absolute inset-0 border border-yellow-500/20 rounded-full`}
          />
        ))}
      </div>
    );
  }

  if (type === 'users') {
    return (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className={`absolute inset-0 ${gradient} opacity-20 blur-2xl rounded-full`} />
        <div className="relative z-10 grid grid-cols-2 gap-1.5">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + (i * 0.1), type: "spring", stiffness: 300, damping: 20 }}
              className={`w-8 h-8 ${gradient} rounded-lg flex items-center justify-center shadow-lg`}
            >
              <Users className="w-4 h-4 text-white" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'waves') {
    return (
      <div className="relative w-24 h-24 flex items-center justify-center gap-1">
        <div className={`absolute inset-0 ${gradient} opacity-20 blur-2xl rounded-full`} />
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ height: [15, 45, 15], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
            className={`w-2 ${gradient} rounded-full`}
          />
        ))}
      </div>
    );
  }

  if (type === 'chat') {
    return (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className={`absolute inset-0 ${gradient} opacity-20 blur-2xl rounded-full`} />
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: [-4, 4, -4] }}
          transition={{ 
            scale: { duration: 0.4, type: "spring" },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
          }}
          className={`absolute top-4 right-5 w-10 h-10 ${gradient} rounded-xl rounded-bl-none flex items-center justify-center shadow-lg`}
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </motion.div>
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: [4, -4, 4] }}
          transition={{ 
            scale: { duration: 0.4, type: "spring", delay: 0.2 },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
          }}
          className={`absolute bottom-4 left-5 w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-xl rounded-tr-none flex items-center justify-center shadow-lg`}
        >
          <MessageSquare className="w-5 h-5 text-zinc-400" />
        </motion.div>
      </div>
    );
  }

  return null;
};

export default function FeatureDetailModal({ feature, onClose }) {
  if (!feature) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-[300px] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 rounded-full transition-colors z-20 text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center p-6 text-center">
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="mb-6 relative"
          >
            <Graphic type={feature.graphicType} color={feature.color} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xl font-bold text-white mb-2">
              {feature.title}
            </h3>
            
            <div className={`h-1 w-10 bg-gradient-to-r ${feature.color} rounded-full mx-auto mb-4`} />
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xs text-zinc-400 leading-relaxed mb-6 px-2"
          >
            {feature.longDescription}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-3 bg-white text-black text-sm font-bold rounded-xl shadow-lg transition-transform"
          >
            Got it
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}