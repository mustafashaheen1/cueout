import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Edit2, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';
import { useApp } from './AppContext';

export default function UpcomingCallBanner({ call, onCancel, onEdit, onComplete }) {
  const { updateUpcomingCall } = useApp();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const calculateTimeLeft = () => {
    if (!call.dueTimestamp) return 0;
    const diff = Math.max(0, Math.ceil((call.dueTimestamp - Date.now()) / 1000));
    return diff;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    if (isCompleted) return;

    // Update immediately
    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    
    if (initial <= 0 && !isCompleted) {
      setIsCompleted(true);
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsCompleted(true);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [call.dueTimestamp, isCompleted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getActionLabel = () => {
    const methods = call.originalState?.contactMethods || ['call'];
    const types = [];
    if (methods.includes('call')) types.push('call');
    if (methods.includes('text')) types.push('text');
    if (methods.includes('email')) types.push('email');
    
    const actionText = types.join(' & ');
    return `Next ${actionText}`;
  };

  const handleDeleteClick = () => {
    if (showConfirmDelete) {
      onCancel();
    } else {
      setShowConfirmDelete(true);
      // Reset confirmation after 3 seconds if not clicked
      setTimeout(() => setShowConfirmDelete(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className="mb-4"
    >
      <motion.div
        animate={call.isNew ? {
          borderColor: ["rgba(239, 68, 68, 0.5)", "rgba(74, 222, 128, 1)", "rgba(239, 68, 68, 0.5)"],
          boxShadow: ["0 0 0px rgba(74, 222, 128, 0)", "0 0 30px rgba(74, 222, 128, 0.4)", "0 0 0px rgba(74, 222, 128, 0)"]
        } : {}}
        transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}
        onAnimationComplete={() => {
          if (call.isNew) updateUpcomingCall(call.id, { isNew: false });
        }}
        className={`backdrop-blur-xl border rounded-full px-4 py-2.5 shadow-lg flex items-center gap-3 transition-colors ${
          isCompleted ? 'bg-green-500/20 border-green-500/50' : 'bg-zinc-900/80 border-red-500/50'
        }`}>
        <div className="text-xl">{call.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate flex items-center gap-2">
            {isCompleted ? (
              <>
                <span className="text-green-400">Action Completed</span>
              </>
            ) : call.isEditing ? (
              'Editing...'
            ) : (
              <>
                {getActionLabel()} in {formatTime(timeLeft)}
              </>
            )}
            <span>·</span>
            <span className="opacity-70">{call.persona}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <>
              {onEdit && !call.isEditing && !showConfirmDelete && (
                <button
                  onClick={onEdit}
                  className="p-1 hover:bg-zinc-800 rounded-full transition-colors flex-shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              )}
              <button
                onClick={handleDeleteClick}
                className={`p-1 rounded-full transition-all flex-shrink-0 flex items-center gap-1 ${
                  showConfirmDelete ? 'bg-red-500/20 px-2' : 'hover:bg-zinc-800'
                }`}
              >
                {showConfirmDelete ? (
                  <>
                    <span className="text-[10px] font-bold text-red-400">Confirm</span>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </>
                ) : (
                  <X className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}