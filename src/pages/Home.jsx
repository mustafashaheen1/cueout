import React, { useState, useEffect, useRef } from 'react';
import { Phone, Sparkles, Clock, X, Mail, MessageSquare, Zap, ChevronRight, ChevronDown, Settings, Plus, LogOut, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '../components/utils';
import { usePersona } from '../components/PersonaContext';
import { useApp } from '../components/AppContext';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';
import { timeOptions, realisticVoices, characterVoices } from '../components/constants';
import PersonaCard from '../components/PersonaCard';
import VoiceCard from '../components/VoiceCard';
import TimeChip from '../components/TimeChip';
import UpcomingCallBanner from '../components/UpcomingCallBanner';
import ContactMethodSelector from '../components/ContactMethodSelector';
import CallerIDSelector from '../components/CallerIDSelector';
import { scheduleCall as scheduleCallAPI } from '../api/luronApi';

// Personas are now managed in PersonaContext


export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const topRef = useRef(null);
  const { getPersonaConfig, personas, addPersona } = usePersona();
  const { upcomingCalls, addUpcomingCall, removeUpcomingCall, updateUpcomingCall, addToHistory, userId, setIsTabBarHidden } = useApp();
  const { user } = useAuth();
  const [userPhone, setUserPhone] = useState(null);

  const [selectedTime, setSelectedTime] = useState('3min');
  const [selectedPersona, setSelectedPersona] = useState('manager');
  const [orderedPersonas, setOrderedPersonas] = useState(personas);
  const [selectedVoice, setSelectedVoice] = useState('emma');
  const [selectedCallerID, setSelectedCallerID] = useState(null);
  const [contactMethods, setContactMethods] = useState(['call']);
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingCallId, setEditingCallId] = useState(null);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [showCallerIDSelector, setShowCallerIDSelector] = useState(false);
  const [voiceCategory, setVoiceCategory] = useState('realistic');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Luron API Integration
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  const tips = [
    "Customize caller names in Account settings",
    "Schedule calls up to 7 days in advance",
    "Save numbers to contacts for real caller ID",
    "Try different voices for better realism",
    "Enable Creator Mode for screen recording"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user's verified phone number
  useEffect(() => {
    async function fetchUserPhone() {
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('phone_number, country_code')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user phone:', error);
        return;
      }

      if (data?.phone_number && data?.country_code) {
        setUserPhone(`${data.country_code}${data.phone_number}`);
      }
    }

    fetchUserPhone();
  }, [user]);

  // Ensure tab bar is visible on this page
  useEffect(() => {
    setIsTabBarHidden(false);
  }, [setIsTabBarHidden]);

  // Sync orderedPersonas with context personas
  useEffect(() => {
    setOrderedPersonas((prev) => {
      // Keep order if possible, but update data
      return personas;
    });
    // Re-apply sorting if needed, but for now just sync
    const selected = personas.find((p) => p.id === selectedPersona);
    if (selected) {
      const rest = personas.filter((p) => p.id !== selectedPersona);
      setOrderedPersonas([selected, ...rest]);
    } else {
      setOrderedPersonas(personas);
    }
  }, [personas]);

  // Handle repeat setup and quick setup from navigation state
  useEffect(() => {
    const reorder = (pid) => {
      setOrderedPersonas((prev) => {
        const selected = prev.find((p) => p.id === pid);
        if (!selected) return prev;
        const rest = prev.filter((p) => p.id !== pid);
        return [selected, ...rest];
      });
    };

    if (location.state?.repeatSetup) {
      const setup = location.state.repeatSetup;
      const pid = setup.persona || 'manager';
      setSelectedPersona(pid);
      reorder(pid);
      setNote(setup.note || '');
      setContactMethods(setup.contactMethods || ['call']);
      setSelectedVoice(setup.voice || 'emma');
      setSelectedCallerID(setup.callerId || null);
      setSelectedTime(setup.time || '3min');
      if (setup.voiceCategory) setVoiceCategory(setup.voiceCategory);

      window.history.replaceState({}, document.title);
    } else if (location.state?.quickSetup) {
      const setup = location.state.quickSetup;
      const pid = setup.persona || 'manager';
      setSelectedPersona(pid);
      reorder(pid);
      setNote(setup.note || '');
      setContactMethods(setup.contactMethods || ['call']);
      setSelectedVoice(setup.voice || 'emma');
      setSelectedCallerID(setup.callerId || null);
      setSelectedTime(setup.time || '3min');
      if (setup.voiceCategory) setVoiceCategory(setup.voiceCategory);

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handlePersonaSelect = (personaId) => {
    setSelectedPersona(personaId);
    setOrderedPersonas((prev) => {
      const selected = prev.find((p) => p.id === personaId);
      if (!selected) return prev;
      const rest = prev.filter((p) => p.id !== personaId);
      return [selected, ...rest];
    });
  };

  const handleAddPersona = () => {
    const newId = `custom-${Date.now()}`;
    const newPersona = {
      id: newId,
      name: 'Custom',
      icon: '✨',
      color: 'bg-purple-500/10 text-purple-500'
    };
    addPersona(newPersona);
    handlePersonaSelect(newId);
    navigate(createPageUrl('PersonaSettings'), { state: { persona: newPersona } });
  };

  const handleSchedule = async () => {
    const persona = personas.find((p) => p.id === selectedPersona);
    const personaConfig = getPersonaConfig(selectedPersona);

    // Clear any previous errors
    setScheduleError(null);

    // Calculate duration in ms
    let durationMs = 0;
    if (selectedTime === '3min') durationMs = 3 * 60 * 1000;
    else if (selectedTime === '5min') durationMs = 5 * 60 * 1000;
    else if (selectedTime === 'now') durationMs = 5000; // 5 seconds for "now"
    else durationMs = 10 * 60 * 1000; // default/custom logic placeholder

    if (editingCallId) {
      // Update existing call via Context (keep local-only functionality for editing)
      const existingCall = upcomingCalls.find((c) => c.id === editingCallId);
      if (existingCall) {
        let newDueTimestamp = existingCall.dueTimestamp;
        if (selectedTime !== existingCall.originalState.selectedTime) {
          newDueTimestamp = Date.now() + durationMs;
        }

        updateUpcomingCall(editingCallId, {
          persona: persona.name,
          icon: persona.icon,
          dueTimestamp: newDueTimestamp,
          isEditing: false,
          originalState: {
            selectedPersona,
            selectedTime,
            selectedVoice,
            contactMethods,
            note,
            selectedCallerID,
            voiceCategory,
            orderedPersonas
          }
        });
      }
      setEditingCallId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Create new call via Luron API
      try {
        setIsScheduling(true);

        // Check if user has verified phone number
        if (!userPhone) {
          throw new Error('Please verify your phone number first. Go to Account to add your phone.');
        }

        // Call Luron API to schedule the call
        const response = await scheduleCallAPI({
          userId,
          contactMethods,
          selectedTime,
          customDate: null, // TODO: Add custom date support later
          selectedPersona,
          note,
          selectedVoice,
          selectedCallerID,
          personaConfig,
          recipientPhone: userPhone // Add verified phone number
        });

        if (response.success) {
          // Create local upcoming call with API call_id
          const newCall = {
            id: Date.now().toString(),
            call_id: response.call_id, // Store API call ID
            isNew: true,
            persona: persona.name,
            icon: persona.icon,
            dueTimestamp: Date.now() + durationMs,
            isEditing: false,
            originalState: {
              selectedPersona,
              selectedTime,
              selectedVoice,
              contactMethods,
              note,
              selectedCallerID,
              voiceCategory,
              orderedPersonas
            }
          };
          addUpcomingCall(newCall);

          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          topRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (error) {
        console.error('Error scheduling call:', error);
        setScheduleError(error.message || 'Failed to schedule call. Please try again.');

        // Auto-hide error after 5 seconds
        setTimeout(() => setScheduleError(null), 5000);
      } finally {
        setIsScheduling(false);
      }
    }
  };

  const handleCancelCall = (callId) => {
    removeUpcomingCall(callId);
    if (editingCallId === callId) {
      setEditingCallId(null);
    }
  };

  const handleCompleteCall = (call) => {
    addToHistory(call);
    // Wait a moment before removing from upcoming list to show checkmark
    setTimeout(() => {
      removeUpcomingCall(call.id);
    }, 3000);
  };

  const handleEditCall = (callId) => {
    const call = upcomingCalls.find((c) => c.id === callId);
    if (call && call.originalState) {
      const s = call.originalState;
      setSelectedPersona(s.selectedPersona);
      setSelectedTime(s.selectedTime);
      setSelectedVoice(s.selectedVoice);
      setContactMethods(s.contactMethods);
      setNote(s.note);
      setSelectedCallerID(s.selectedCallerID);
      setVoiceCategory(s.voiceCategory);
      if (s.orderedPersonas) setOrderedPersonas(s.orderedPersonas);

      setEditingCallId(callId);
      updateUpcomingCall(callId, { isEditing: true });
    }
  };

  const handleTimeSelect = (timeId) => {
    if (timeId === 'custom') {
      setShowCustomTime(true);
    } else {
      setSelectedTime(timeId);
    }
  };

  const allVoices = voiceCategory === 'realistic' ? realisticVoices : characterVoices;
  const selectedVoiceData = [...realisticVoices, ...characterVoices].find((v) => v.id === selectedVoice);

  const getTimeLabel = () => {
    if (selectedTime === '3min') return '3 minutes';
    if (selectedTime === '5min') return '5 minutes';
    if (selectedTime === 'now') return 'right now';
    return 'at your custom time';
  };

  return (
    <div ref={topRef} className="min-h-full bg-black px-6 pt-safe pb-safe">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/10 via-black to-black pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto pt-12">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white">QueOut</h1>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-pulse" />
            </div>
            
            <button
              onClick={() => navigate(createPageUrl('Paywall'))}
              className="flex items-center gap-2 bg-zinc-900/50 backdrop-blur-md border border-green-500/50 hover:border-green-400 hover:bg-zinc-800/50 rounded-full py-1.5 pl-4 pr-1.5 transition-all group shadow-[0_0_15px_rgba(34,197,94,0.1)]">

              <span className="text-xs font-medium text-zinc-200">
                Free plan <span className="mx-2 text-zinc-700">|</span> <span className="text-red-400 font-semibold">1/2 calls left</span>
              </span>
              <div className="w-7 h-7 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center border border-zinc-700 group-hover:border-zinc-600 transition-all">
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {upcomingCalls.map((call) =>
          <UpcomingCallBanner
            key={call.id}
            call={call}
            onCancel={() => handleCancelCall(call.id)}
            onEdit={() => handleEditCall(call.id)}
            onComplete={() => handleCompleteCall(call)} />

          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6">

          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 blur-3xl rounded-3xl" />
          
          <div className="bg-[#000000] px-3 py-8 rounded-3xl relative backdrop-blur-xl border border-red-500/30 shadow-2xl">
            <div className="mb-5">
              <label className="block text-sm font-semibold text-white mb-3">
                How should we reach you for the call?
              </label>
              <ContactMethodSelector
                selected={contactMethods}
                onChange={setContactMethods} />

            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-white mb-3">
                When should the call come?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {timeOptions.map((time) =>
                <TimeChip
                  key={time.id}
                  label={time.label}
                  selected={selectedTime === time.id}
                  onClick={() => handleTimeSelect(time.id)} />

                )}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-white mb-3">
                Who's calling you?
              </label>
              <div className="relative -mx-5 px-5">
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <AnimatePresence mode='popLayout'>
                    {orderedPersonas.map((persona) =>
                      <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 30,
                          mass: 1
                        }}
                        key={persona.id} 
                        className="flex-shrink-0"
                      >
                        <PersonaCard
                          persona={persona}
                          selected={selectedPersona === persona.id}
                          onClick={() => handlePersonaSelect(persona.id)}
                          compact 
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleAddPersona}
                    className="relative group flex-shrink-0">

                    <div className="bg-[#121212] p-3 rounded-2xl w-20 transition-all border-2 border-dashed border-zinc-800 hover:border-zinc-600 group-hover:bg-zinc-900/50">
                      <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                        <Plus className="w-6 h-6 text-zinc-500 group-hover:text-zinc-400" />
                      </div>
                      <p className="text-xs font-semibold text-center text-zinc-500 group-hover:text-zinc-400 truncate">Add</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-white mb-3">
                {contactMethods.length > 1 ?
                "What's the context of the exit?" :
                contactMethods[0] === 'text' ?
                "What's the text about?" :
                contactMethods[0] === 'email' ?
                "What's the email about?" :
                "What's the call about?"}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Example: 'Sound like my boss reminding me about a meeting'"
                maxLength={150}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all resize-none"
                rows={3} />

              <div className="text-[10px] text-zinc-500 mt-2 text-right">
                {note.length}/150
              </div>
            </div>

            <div className="mb-5">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl transition-all border border-zinc-700/50">

                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Advanced options</p>
                    <p className="text-[10px] text-zinc-500">
                      {selectedVoiceData?.name} · {selectedCallerID?.name || 'Default ID'}
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: showAdvanced ? 180 : 0 }}
                  transition={{ duration: 0.2 }}>

                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {showAdvanced &&
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden">

                    <div className="mt-3 space-y-4 p-4 bg-zinc-800/20 rounded-xl border border-zinc-700/30">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-2">
                          Voice
                        </label>
                        <button
                        onClick={() => setShowVoiceSelector(true)}
                        className="w-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl p-3 flex items-center gap-3 transition-all">

                          <div className="w-8 h-8 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center text-base">
                            {selectedVoiceData?.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-xs text-white">{selectedVoiceData?.name}</p>
                            <p className="text-[10px] text-zinc-400">
                              {selectedVoiceData?.description || selectedVoiceData?.type}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-2">
                          Caller ID (optional)
                        </label>
                        <button
                        onClick={() => setShowCallerIDSelector(true)}
                        className="w-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl p-3 flex items-center gap-3 transition-all">

                          <div className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-xs text-white">
                              {selectedCallerID ? selectedCallerID.name : 'Default number'}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {selectedCallerID ? selectedCallerID.number : 'No specific caller ID'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                }
              </AnimatePresence>
            </div>

            <div className="mt-4 flex justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTipIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/5 backdrop-blur-sm"
                >
                  <Sparkles className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] font-medium text-green-400">
                    {tips[currentTipIndex]}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <div className="space-y-2 mb-4">
          {scheduleError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-400 mb-1">Scheduling Failed</p>
                <p className="text-xs text-red-300/80">{scheduleError}</p>
              </div>
            </motion.div>
          )}

          <motion.button
            onClick={handleSchedule}
            disabled={isScheduling}
            whileTap={{ scale: isScheduling ? 1 : 0.97 }}
            className="relative w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-red-500/50 disabled:to-red-600/50 disabled:cursor-not-allowed text-white font-bold text-lg py-5 rounded-full shadow-2xl shadow-red-500/50 flex items-center justify-center gap-2 transition-all duration-200 group overflow-hidden">

            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            {isScheduling ? (
              <>
                <div className="relative z-10 w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="relative z-10">Scheduling...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">{editingCallId ? 'Confirm Edit' : 'Schedule Escape'}</span>
                <LogOut className="w-5 h-5 relative z-10" />
              </>
            )}
          </motion.button>
          <p className="text-center text-xs text-zinc-500">
            {editingCallId ?
            "Updating this call won't reset the timer unless you change the time." :
            `You'll get a short AI call in ${getTimeLabel()}`
            }
          </p>
        </div>

        <AnimatePresence>
          {showSuccess &&
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[380px]">

              <div className="bg-black border border-red-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Escape scheduled!</p>
                  <p className="text-xs text-zinc-400">
                    {contactMethods.join(' & ')} in {getTimeLabel()}
                  </p>
                </div>
              </div>
            </motion.div>
          }
        </AnimatePresence>

        <AnimatePresence>
          {showCallerIDSelector &&
          <CallerIDSelector
            selected={selectedCallerID}
            onSelect={(callerId) => {
              setSelectedCallerID(callerId);
              setShowCallerIDSelector(false);
            }}
            onClose={() => setShowCallerIDSelector(false)} />

          }
        </AnimatePresence>

        <AnimatePresence>
          {showVoiceSelector &&
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVoiceSelector(false)}>

              <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] bg-zinc-900 rounded-3xl p-6 max-h-[600px] overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Select Voice</h3>
                  <button
                  onClick={() => setShowVoiceSelector(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors">

                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="flex gap-2 mb-6 bg-zinc-800/50 rounded-full p-1">
                  <button
                  onClick={() => setVoiceCategory('realistic')}
                  className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all ${
                  voiceCategory === 'realistic' ?
                  'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                  'text-zinc-400'}`
                  }>

                    Ultra Realistic
                  </button>
                  <button
                  onClick={() => setVoiceCategory('character')}
                  className={`flex-1 py-2 px-4 rounded-full font-semibold text-sm transition-all ${
                  voiceCategory === 'character' ?
                  'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                  'text-zinc-400'}`
                  }>

                    Characters
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {allVoices.map((voice) =>
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  selected={selectedVoice === voice.id}
                  onClick={() => {
                    setSelectedVoice(voice.id);
                    setShowVoiceSelector(false);
                  }} />

                )}
                </div>

                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-xs text-red-300 leading-relaxed">
                    <strong>💡 Tip:</strong> Realistic voices sound like real people, while character voices have unique personalities!
                  </p>
                </div>
              </motion.div>
            </motion.div>
          }
        </AnimatePresence>

        <AnimatePresence>
          {showCustomTime &&
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCustomTime(false)}>

              <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] bg-zinc-900 rounded-3xl p-6">

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Custom Time</h3>
                  <button
                  onClick={() => setShowCustomTime(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors">

                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <input
                  type="datetime-local"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50" />

                </div>

                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
                  <p className="text-xs text-red-300 leading-relaxed">
                    <strong>💡 Tip:</strong> Schedule calls up to 7 days in advance!
                  </p>
                </div>
                
                <button
                onClick={() => {
                  setSelectedTime('custom');
                  setShowCustomTime(false);
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-full transition-colors">

                  Set Time
                </button>
              </motion.div>
            </motion.div>
          }
        </AnimatePresence>
      </div>
    </div>);

}