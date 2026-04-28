import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ChevronRight, Phone, Calendar, Settings, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import CallHistoryItem from '../components/CallHistoryItem';
import { useApp } from '../components/AppContext';
import { usePersona } from '../components/PersonaContext';
import EditScheduleModal from '../components/EditScheduleModal';
import PullToRefresh from '../components/PullToRefresh';

// Voices definition
const voices = [
  { id: 'emma', name: 'Emma', icon: '👩' },
  { id: 'james', name: 'James', icon: '👨' },
  { id: 'sophia', name: 'Sophia', icon: '🌸' },
  { id: 'alex', name: 'Alex', icon: '😎' },
  { id: 'morgan', name: 'Morgan', icon: '🎩' },
  { id: 'jordan', name: 'Jordan', icon: '⚡' },
];

const mockHistory = [
  {
    id: 1,
    persona: 'manager',
    personaName: 'Manager',
    icon: '💼',
    scheduledTime: 'Today · 3:05 PM',
    duration: '0:34',
    status: 'answered',
    context: 'Check in about that project we discussed last week.',
    contactMethods: ['call'],
    voice: 'james',
    callerId: null
  },
  {
    id: 2,
    persona: 'friend',
    personaName: 'Friend',
    icon: '💬',
    scheduledTime: 'Today · 11:42 AM',
    duration: '0:28',
    status: 'answered',
    context: 'Catch up about weekend plans.',
    contactMethods: ['call', 'text'],
    voice: 'emma',
    callerId: null
  },
  {
    id: 3,
    persona: 'coordinator',
    personaName: 'Coordinator',
    icon: '📋',
    scheduledTime: 'Yesterday · 4:20 PM',
    duration: '0:00',
    status: 'missed',
    context: 'Reminder about the meeting tomorrow.',
    contactMethods: ['call'],
    voice: 'james',
    callerId: { id: 1, name: 'Business Line', number: '(555) 123-4567' }
  },
  {
    id: 4,
    persona: 'service',
    personaName: 'Reminder Service',
    icon: '🔔',
    scheduledTime: 'Dec 28 · 2:15 PM',
    duration: '0:18',
    status: 'answered',
    context: '',
    contactMethods: ['call'],
    voice: 'emma',
    callerId: null
  },
  {
    id: 5,
    persona: 'manager',
    personaName: 'Manager',
    icon: '💼',
    scheduledTime: 'Dec 27 · 9:30 AM',
    duration: '0:45',
    status: 'answered',
    context: 'Quick sync about Q1 goals.',
    contactMethods: ['call'],
    voice: 'james',
    callerId: null
  },
];

// Format a timestamp into "Today · 3:05 PM", "Yesterday · 4:20 PM", "Apr 12 · 2:15 PM", etc.
function formatHistoryDate(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date)) return '—';

  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday)     return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;

  const isSameYear = date.getFullYear() === now.getFullYear();
  const dateLabel = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(isSameYear ? {} : { year: 'numeric' }),
  });
  return `${dateLabel} · ${time}`;
}

export default function History() {
  const { history, clearUnreadHistory, quickSchedules, updateQuickSchedule, addQuickSchedule, removeQuickSchedule, promoteQuickSchedule, refreshHistory, syncPendingStatuses, setIsTabBarHidden } = useApp();
  const { personas } = usePersona();
  const [selectedCall, setSelectedCall] = useState(null);

  const resolvePersonaName = (call) => {
    const found = personas.find(p => p.id === call.persona || p.id === call.persona_id);
    return found?.name || call.personaName || call.persona || 'Unknown';
  };
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isNewPreset, setIsNewPreset] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const navigate = useNavigate();

  // Ensure tab bar is visible on this page
  useEffect(() => {
    setIsTabBarHidden(false);
  }, [setIsTabBarHidden]);

  useEffect(() => {
    // Clear unread badge when entering history page
    clearUnreadHistory();

    // Fix 1 & 2: Load Supabase history first (fast), then sync Luron in background (slow)
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        await refreshHistory();
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
      // Run Luron sync silently in background — doesn't block the screen from showing
      syncPendingStatuses().catch(() => {});
    };

    fetchHistory();
  }, []);

  const handleQuickCall = (option) => {
    promoteQuickSchedule(option.id);
    navigate(createPageUrl('Home'), { 
      state: { 
        quickSetup: option.preset 
      } 
    });
  };

  const handleEditSchedule = (e, schedule) => {
    e.stopPropagation();
    setEditingSchedule(schedule);
  };

  const handleRepeatSetup = (call) => {
    navigate(createPageUrl('Home'), {
      state: {
        repeatSetup: {
          persona:        call.persona,
          note:           call.context,
          contactMethods: call.contactMethods,
          // Use original UI voice ID (e.g. 'michael') not the Luron-mapped DB ID (e.g. 'james')
          voice:          call.originalVoiceId || call.voice,
          callerId:       call.callerId,
          // Custom time is in the past — can't repeat it, default to 3min
          time:           call.timePreset === 'custom' ? '3min' : (call.timePreset || '3min'),
          voiceCategory:  call.voiceCategory || 'realistic',
        }
      }
    });
  };

  const handleAddToQuickSchedule = (call) => {
    const original = call.originalState || {};
    const pid = original.selectedPersona || call.persona;
    const persona = personas.find(p => p.id === pid) || personas[0];
    
    const newSchedule = {
      id: Date.now().toString(),
      name: call.personaName || persona.name,
      icon: call.icon || persona.icon,
      color: persona.color,
      preset: {
        persona: pid,
        note: original.note || call.context || '',
        contactMethods: original.contactMethods || call.contactMethods || ['call'],
        voice: original.selectedVoice || call.voice || 'emma',
        callerId: original.selectedCallerID || call.callerId || null,
        time: original.selectedTime || '3min',
        voiceCategory: original.voiceCategory || 'realistic'
      }
    };
    
    addQuickSchedule(newSchedule);
    setSelectedCall(null);
  };

  const handleAddCustomPreset = () => {
    const newId = Date.now().toString();
    const newSchedule = {
      id: newId,
      name: 'New Preset',
      icon: '✨',
      color: 'bg-purple-500/10 text-purple-500',
      preset: {
        persona: personas[0]?.id || 'manager',
        note: '',
        contactMethods: ['call'],
        voice: 'emma',
        time: '3min',
        voiceCategory: 'realistic'
      }
    };
    setIsNewPreset(true);
    setEditingSchedule(newSchedule);
  };

  const handleRefresh = async () => {
    await refreshHistory().catch(() => {});
    syncPendingStatuses().catch(() => {});
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-full bg-black px-6 pt-safe pb-safe">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/10 via-black to-black pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto pt-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">History</h1>
          <p className="text-zinc-400 text-sm">Reuse your favorite setups or see what you've used.</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-5 group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-red-500/20" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Phone className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-xs font-medium text-zinc-400">Total Calls</span>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">
                {history.length} <span className="text-lg text-zinc-500 font-medium"></span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-5 group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-orange-500/20" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Calendar className="w-4 h-4 text-orange-500" />
                </div>
                <span className="text-xs font-medium text-zinc-400">This Week</span>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">
                {history.filter(h => {
                  const date = new Date(h.completedAt);
                  const now = new Date();
                  const diff = now - date;
                  return diff < 7 * 24 * 60 * 60 * 1000;
                }).length}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Quick Schedule Horizontal Scroll */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-red-500" />
              Quick Presets
            </h2>
          </div>

          <div className="relative -mx-6 px-6">
            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {quickSchedules.map((option) => (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  key={option.id}
                  onClick={() => handleQuickCall(option)}
                  className="relative flex-shrink-0 w-24 flex flex-col items-center gap-3 snap-start group"
                >
                  <div className={`relative w-16 h-16 rounded-2xl ${option.color} flex items-center justify-center text-3xl shadow-lg border border-red-500/30 group-hover:scale-105 transition-transform duration-300`}>
                    <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    {option.icon}

                    <div 
                      onClick={(e) => handleEditSchedule(e, option)}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-zinc-900 rounded-full border border-zinc-700 flex items-center justify-center transition-all shadow-xl hover:bg-zinc-800 hover:border-red-500/50 z-10"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-zinc-400 text-center truncate w-full px-1 group-hover:text-white transition-colors">
                    {option.name}
                  </p>
                </motion.button>
              ))}

              {/* Add New Placeholder */}
              <button
                onClick={handleAddCustomPreset}
                className="flex-shrink-0 w-24 flex flex-col items-center gap-3 snap-start"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-800 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-xs font-medium text-zinc-500 text-center">New</p>
              </button>
            </div>
          </div>
        </motion.div>

        <div className="px-1 mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-500" />
            Recent Activity
          </h2>
        </div>

        {/* Call history list */}
        <div className="space-y-3">
          {isLoadingHistory ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
              <p>Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              <p>No history yet.</p>
              <p>Schedule a call to see it here.</p>
            </div>
          ) : (
            history.map((call, index) => (
              <CallHistoryItem
                key={call.id}
                call={{
                  ...call,
                  scheduledTime: formatHistoryDate(call.completedAt),
                  status: call.status || 'completed',
                  duration: call.duration > 0 ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : (call.status === 'answered' ? '0:00' : '--'),
                  personaName: resolvePersonaName(call)
                }}
                index={index}
                onClick={() => setSelectedCall(call)}
              />
            ))
          )}
        </div>
      </div>

      {/* Call detail modal */}
      <AnimatePresence>
        {selectedCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center pb-safe"
            onClick={() => setSelectedCall(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-zinc-900 rounded-3xl overflow-y-auto"
              style={{
                maxWidth: 'min(520px, 100vw)',
                maxHeight: '82dvh',
                padding: 'clamp(16px, 4vw, 24px)',
                paddingTop: 12,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-zinc-800">
                <div
                  className="bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{ width: 'clamp(44px, 11vw, 56px)', height: 'clamp(44px, 11vw, 56px)', fontSize: 'clamp(20px, 5.5vw, 26px)' }}
                >
                  {selectedCall.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold mb-1 text-white truncate" style={{ fontSize: 'clamp(15px, 4.5vw, 20px)' }}>
                    {resolvePersonaName(selectedCall)}
                  </h2>
                  <div className="flex items-center gap-1.5 text-zinc-400" style={{ fontSize: 'clamp(11px, 2.8vw, 13px)' }}>
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{formatHistoryDate(selectedCall.completedAt)}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                  selectedCall.status === 'answered'  ? 'bg-green-500/20 text-green-400' :
                  selectedCall.status === 'declined'  ? 'bg-red-500/20 text-red-400' :
                  selectedCall.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-zinc-700 text-zinc-400'
                }`} style={{ fontSize: 'clamp(9px, 2.4vw, 11px)' }}>
                  {selectedCall.status === 'answered'  ? '✓ Answered'  :
                   selectedCall.status === 'declined'  ? '✕ Declined'  :
                   selectedCall.status === 'scheduled' ? '⏳ Pending' :
                   selectedCall.status === 'missed'    ? '✕ Missed'    :
                   '✕ Missed'}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between py-2.5 border-b border-zinc-800">
                  <span className="text-zinc-400 text-sm">Duration</span>
                  <span className="font-semibold text-white text-sm">
                    {selectedCall.duration > 0
                      ? `${Math.floor(selectedCall.duration / 60)}:${(selectedCall.duration % 60).toString().padStart(2, '0')}`
                      : selectedCall.status === 'answered' ? '0:00' : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-zinc-800">
                  <span className="text-zinc-400 text-sm">Scheduled</span>
                  <span className="font-semibold text-white text-sm">
                    {formatHistoryDate(selectedCall.completedAt) || selectedCall.scheduledTime}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-zinc-800">
                  <span className="text-zinc-400 text-sm">Status</span>
                  <span className={`font-semibold text-sm ${
                    selectedCall.status === 'answered'  ? 'text-green-400'  :
                    selectedCall.status === 'declined'  ? 'text-red-400'    :
                    selectedCall.status === 'scheduled' ? 'text-yellow-400' :
                    'text-zinc-400'
                  }`}>
                    {selectedCall.status === 'answered'  ? 'Answered'  :
                     selectedCall.status === 'declined'  ? 'Declined'  :
                     selectedCall.status === 'scheduled' ? 'Pending'   :
                     selectedCall.status === 'missed'    ? 'Missed'    :
                     selectedCall.status === 'failed'    ? 'Failed'    :
                     'Unknown'}
                  </span>
                </div>
              </div>

              {selectedCall.context && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-zinc-400 mb-2">Call Context</h3>
                  <div className="bg-zinc-800/50 rounded-2xl p-3">
                    <p className="text-white text-sm leading-relaxed">{selectedCall.context}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 pb-2">
                <button
                  onClick={() => { handleRepeatSetup(selectedCall); setSelectedCall(null); }}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 transition-all"
                  style={{ padding: 'clamp(12px, 3.5vw, 15px) 24px' }}
                >
                  <span style={{ fontSize: 'clamp(13px, 3.5vw, 15px)' }}>Repeat this setup</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleAddToQuickSchedule(selectedCall)}
                  className="w-full bg-zinc-800 text-white font-semibold rounded-full flex items-center justify-center gap-2 transition-colors"
                  style={{ padding: 'clamp(12px, 3.5vw, 15px) 24px' }}
                >
                  <Plus className="w-4 h-4" />
                  <span style={{ fontSize: 'clamp(13px, 3.5vw, 15px)' }}>Add to Quick Schedule</span>
                </button>

                <button
                  onClick={() => setSelectedCall(null)}
                  className="w-full text-zinc-500 font-semibold py-2 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Schedule Modal */}
      <AnimatePresence>
        {editingSchedule && (
          <EditScheduleModal
            schedule={editingSchedule}
            personas={personas}
            voices={voices}
            onSave={(updatedSchedule) => {
              if (isNewPreset) {
                addQuickSchedule(updatedSchedule);
              } else {
                updateQuickSchedule(updatedSchedule.id, updatedSchedule);
              }
              setIsNewPreset(false);
              setEditingSchedule(null);
            }}
            onDelete={(id) => {
              if (!isNewPreset) removeQuickSchedule(id);
              setIsNewPreset(false);
              setEditingSchedule(null);
            }}
            onClose={() => {
              setIsNewPreset(false);
              setEditingSchedule(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
    </PullToRefresh>
  );
}