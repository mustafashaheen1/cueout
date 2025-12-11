import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ChevronRight, Phone, Calendar, Settings, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import CallHistoryItem from '../components/CallHistoryItem';
import { useApp } from '../components/AppContext';
import { usePersona } from '../components/PersonaContext';
import EditScheduleModal from '../components/EditScheduleModal';

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

export default function History() {
  const { history, clearUnreadHistory, quickSchedules, updateQuickSchedule, addQuickSchedule, removeQuickSchedule, promoteQuickSchedule } = useApp();
  const { personas } = usePersona();
  const [selectedCall, setSelectedCall] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear unread badge when entering history page
    clearUnreadHistory();
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
    const original = call.originalState || {};
    navigate(createPageUrl('Home'), { 
      state: { 
        repeatSetup: {
          persona: original.selectedPersona || call.persona,
          note: original.note || call.context,
          contactMethods: original.contactMethods || call.contactMethods,
          voice: original.selectedVoice || call.voice,
          callerId: original.selectedCallerID || call.callerId,
          time: original.selectedTime || '3min',
          voiceCategory: original.voiceCategory || 'realistic'
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
    addQuickSchedule(newSchedule);
    setEditingSchedule(newSchedule);
  };

  return (
    <div className="min-h-full bg-black px-6 py-6">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/10 via-black to-black pointer-events-none" />
      
      <div className="relative w-full max-w-lg mx-auto">
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
                {history.length} <span className="text-lg text-zinc-500 font-medium">/ 20</span>
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
                      className="absolute -top-2 -right-2 w-7 h-7 bg-zinc-900 rounded-full border border-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-zinc-800 hover:border-red-500/50 z-10"
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
                className="flex-shrink-0 w-24 flex flex-col items-center gap-3 snap-start group opacity-50 hover:opacity-100 transition-opacity"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                  <Plus className="w-6 h-6 text-zinc-600 group-hover:text-zinc-400" />
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
          {history.length === 0 ? (
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
                  scheduledTime: new Date(call.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: 'completed',
                  duration: '0:30', // Placeholder
                  personaName: call.persona 
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCall(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] bg-zinc-900 rounded-3xl p-6 max-h-[600px] overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-zinc-800">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-3xl shadow-lg">
                  {selectedCall.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-1 text-white">{selectedCall.personaName}</h2>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock className="w-4 h-4" />
                    <span>{selectedCall.scheduledTime}</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedCall.status === 'answered'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {selectedCall.status === 'answered' ? '✓ Answered' : '✕ Missed'}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <span className="text-zinc-400">Duration</span>
                  <span className="font-semibold text-white">{selectedCall.duration}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <span className="text-zinc-400">Scheduled</span>
                  <span className="font-semibold text-white">{selectedCall.scheduledTime}</span>
                </div>
              </div>

              {selectedCall.context && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-3">Call Context</h3>
                  <div className="bg-zinc-800/50 rounded-2xl p-4">
                    <p className="text-white leading-relaxed">{selectedCall.context}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => {
                    handleRepeatSetup(selectedCall);
                    setSelectedCall(null);
                  }}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                >
                  <span>Repeat this setup</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => handleAddToQuickSchedule(selectedCall)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add to Quick Schedule</span>
                </button>
                
                <button
                  onClick={() => setSelectedCall(null)}
                  className="w-full text-zinc-500 hover:text-white font-semibold py-2 transition-colors text-sm"
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
              updateQuickSchedule(updatedSchedule.id, updatedSchedule);
              setEditingSchedule(null);
            }}
            onDelete={(id) => {
              removeQuickSchedule(id);
              setEditingSchedule(null);
            }}
            onClose={() => setEditingSchedule(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}