import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';

const statusConfig = {
  answered:  { icon: CheckCircle2, color: 'text-green-500',  label: 'Answered' },
  declined:  { icon: XCircle,      color: 'text-red-500',    label: 'Declined' },
  missed:    { icon: XCircle,      color: 'text-zinc-500',   label: 'Missed'   },
  failed:    { icon: XCircle,      color: 'text-zinc-500',   label: 'Failed'   },
  scheduled: { icon: Clock,        color: 'text-yellow-500', label: 'Pending'  },
};

export default function CallHistoryItem({ call, index, onClick }) {
  const s = statusConfig[call.status] || statusConfig.scheduled;
  const StatusIcon = s.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="w-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all duration-200 active:scale-98"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center text-2xl border border-red-500/30">
          {call.icon}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <h3 className="font-semibold text-white mb-0.5 capitalize truncate">{call.persona}</h3>
          <p className="text-sm text-zinc-400 truncate">{call.scheduledTime}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
          <StatusIcon className={`w-5 h-5 ${s.color}`} />
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </div>
      </div>
    </motion.button>
  );
}
