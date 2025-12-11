import React from 'react';
import { Phone, MessageSquare, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const methods = [
  { id: 'call', label: 'Call', icon: Phone },
  { id: 'text', label: 'Text', icon: MessageSquare },
  { id: 'email', label: 'Email', icon: Mail },
];

export default function ContactMethodSelector({ selected, onChange }) {
  const toggleMethod = (methodId) => {
    if (selected.includes(methodId)) {
      // Don't allow deselecting if it's the only one
      if (selected.length === 1) return;
      onChange(selected.filter(id => id !== methodId));
    } else {
      onChange([...selected, methodId]);
    }
  };

  return (
    <div className="flex gap-2">
      {methods.map((method) => {
        const isSelected = selected.includes(method.id);
        const Icon = method.icon;
        
        return (
          <motion.button
            key={method.id}
            onClick={() => toggleMethod(method.id)}
            whileTap={{ scale: 0.95 }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all border-2 ${
              isSelected
                ? 'bg-red-500/20 border-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Icon className="w-4 h-4" />
              <span>{method.label}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}