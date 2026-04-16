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
import { scheduleCall as scheduleCallAPI, getUserId } from '../api/luronApi';


// Personas are now managed in PersonaContext

// Map app voice IDs to valid Supabase voices table IDs
const VOICE_DB_MAP = {
  // Realistic voices
  emma: 'emma', michael: 'james', sarah: 'emma',
  // Character voices (mapped to same Luron voices)
  sophia: 'emma', alex: 'james', morgan: 'emma', jordan: 'james'
};
const toDbVoiceId = (id) => VOICE_DB_MAP[id] || 'emma';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const topRef = useRef(null);
  const { getPersonaConfig, personas, addPersona } = usePersona();
  const { upcomingCalls, addUpcomingCall, removeUpcomingCall, updateUpcomingCall, addToHistory, updateHistoryItem, updateHistoryStatus, syncPendingStatuses, setIsTabBarHidden } = useApp();
  const { user } = useAuth();
  const [userPhone, setUserPhone] = useState(null);

  const [selectedTime, setSelectedTime] = useState('3min');
  const [selectedPersona, setSelectedPersona] = useState('manager');
  const [orderedPersonas, setOrderedPersonas] = useState(personas);
  const [selectedRealisticVoice, setSelectedRealisticVoice] = useState('emma');
  const [selectedCharacterVoice, setSelectedCharacterVoice] = useState('sophia');
  const [selectedCallerID, setSelectedCallerID] = useState(null);
  const [contactMethods, setContactMethods] = useState(['call']);
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingCallId, setEditingCallId] = useState(null);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customDate, setCustomDate] = useState(null);   // ISO string of selected custom datetime
  const [customTimeError, setCustomTimeError] = useState('');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [showCallerIDSelector, setShowCallerIDSelector] = useState(false);
  const [voiceCategory, setVoiceCategory] = useState('realistic');
  const selectedVoice = voiceCategory === 'realistic' ? selectedRealisticVoice : selectedCharacterVoice;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Luron API Integration
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [showConfirmSchedule, setShowConfirmSchedule] = useState(false);

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
      if (setup.voiceCategory === 'character') setSelectedCharacterVoice(setup.voice || 'sophia');
      else setSelectedRealisticVoice(setup.voice || 'emma');
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
      if (setup.voiceCategory === 'character') setSelectedCharacterVoice(setup.voice || 'sophia');
      else setSelectedRealisticVoice(setup.voice || 'emma');
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
    // Do NOT add persona yet — only add when user taps save (tick) in PersonaSettings
    navigate(createPageUrl('PersonaSettings'), { state: { persona: newPersona, isNew: true } });
  };

  const handleSchedule = () => {
    // If there are already pending calls and we're not editing, ask for confirmation
    if (!editingCallId && upcomingCalls.length > 0) {
      setShowConfirmSchedule(true);
      return;
    }
    doSchedule();
  };

  const doSchedule = async () => {
    const persona = personas.find((p) => p.id === selectedPersona);
    const personaConfig = getPersonaConfig(selectedPersona);

    // Clear any previous errors
    setScheduleError(null);

    // Calculate duration in ms
    let durationMs = 0;
    if (selectedTime === '3min') durationMs = 3 * 60 * 1000;
    else if (selectedTime === '5min') durationMs = 5 * 60 * 1000;
    else if (selectedTime === 'now') durationMs = 5000;
    else if (selectedTime === 'custom' && customDate) {
      durationMs = Math.max(5000, new Date(customDate).getTime() - Date.now());
    }

    if (editingCallId) {
      // Update existing call via Context (keep local-only functionality for editing)
      const existingCall = upcomingCalls.find((c) => c.id === editingCallId);
      if (existingCall) {
        const timeChanged = selectedTime !== existingCall.originalState?.selectedTime;
        const newDueTimestamp = timeChanged
          ? new Date(Date.now() + durationMs).toISOString()
          : existingCall.due_timestamp;

        updateUpcomingCall(editingCallId, {
          // DB fields
          persona_id:       selectedPersona,
          voice_id:         toDbVoiceId(selectedVoice),
          caller_id:        selectedCallerID?.id || null,
          contact_methods:  contactMethods,
          context_note:     note || '',
          due_timestamp:    newDueTimestamp,
          is_editing:       false,
          // UI-only fields
          persona:          persona.name,
          icon:             persona.icon,
          originalState: {
            selectedPersona, selectedTime, selectedVoice,
            selectedRealisticVoice, selectedCharacterVoice,
            contactMethods, note, selectedCallerID, voiceCategory, orderedPersonas
          }
        });
      }
      setEditingCallId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });

      // Reset the note field
      setNote('');
    } else {
      // Create new call via Luron API with optimistic update
      try {
        // Email-only schedules don't need a phone number
        const isEmailOnly = contactMethods.length === 1 && contactMethods[0] === 'email';
        if (!userPhone && !isEmailOnly) {
          setScheduleError('Please verify your phone number first. Go to Account to add your phone.');
          setTimeout(() => setScheduleError(null), 5000);
          return;
        }
        if (isEmailOnly && !user?.email) {
          setScheduleError('No email address found. Please sign in with an email account.');
          setTimeout(() => setScheduleError(null), 5000);
          return;
        }

        setIsScheduling(true);

        // Create local upcoming call immediately (optimistic update)
        const newCall = {
          // DB column names — sent to Supabase
          persona_id:       selectedPersona,
          voice_id:         toDbVoiceId(selectedVoice),
          caller_id:        selectedCallerID?.id || null,
          contact_methods:  contactMethods,
          context_note:     note || '',
          due_timestamp:    (selectedTime === 'custom' && customDate)
                              ? customDate
                              : new Date(Date.now() + durationMs).toISOString(),
          tone:             personaConfig?.tone || null,
          background_sound: personaConfig?.background || null,
          duration_seconds: selectedTime === '3min' ? 180 : selectedTime === '5min' ? 300 : 30,
          voice_category:   voiceCategory || 'realistic',
          is_new:           true,
          is_editing:       false,
          // UI-only display fields — filtered out before DB insert
          persona:          persona.name,
          icon:             persona.icon,
          originalState: {
            selectedPersona, selectedTime, selectedVoice,
            selectedRealisticVoice, selectedCharacterVoice,
            contactMethods, note, selectedCallerID, voiceCategory, orderedPersonas
          }
        };
        const savedCall = await addUpcomingCall(newCall);

        // Save history entry IMMEDIATELY (before Luron API) so history_id is
        // always available on the upcoming call before the timer could fire.
        // luron_call_id is null for now — updated once Luron responds.
        const historyItem = await addToHistory({
          persona_id:        selectedPersona,
          voice_id:          toDbVoiceId(selectedVoice),
          original_voice_id: selectedVoice,
          voice_category:    voiceCategory,
          time_preset:       selectedTime,
          caller_id:         selectedCallerID?.id || null,
          contact_methods:   contactMethods,
          context_note:      note || '',
          status:            'scheduled',
          duration_seconds:  selectedTime === '3min' ? 180 : selectedTime === '5min' ? 300 : 0,
        });

        // Link history_id to upcoming call right away (UI-only, not a DB column)
        if (savedCall?.id && historyItem?.id) {
          updateUpcomingCall(savedCall.id, { history_id: historyItem.id });
        }

        // Show success immediately
        setIsScheduling(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        topRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Reset the note field
        setNote('');

        // Map app persona ID → valid Luron persona_type
        // Built-in IDs match Luron's types directly; custom personas use their saved luron_persona_type
        const VALID_LURON_TYPES = new Set(['manager','coordinator','friend','mom','doctor','boss','service']);
        const luronPersonaType = VALID_LURON_TYPES.has(selectedPersona)
          ? selectedPersona
          : (persona?.luron_persona_type || 'manager');

        // Fire one Luron API call per selected contact method (in parallel)
        const baseParams = {
          userId:         getUserId(),
          selectedTime,
          customDate:     selectedTime === 'custom' && customDate ? new Date(customDate) : null,
          selectedPersona: luronPersonaType,
          note,
          selectedVoice,
          selectedCallerID,
          personaConfig,
          recipientPhone: userPhone,
          recipientEmail: user?.email || null,
        };

        let primaryLuronCallId = null;

        Promise.allSettled(
          contactMethods.map(method =>
            scheduleCallAPI({ ...baseParams, contactMethods: [method] })
              .then(response => {
                console.log(`✅ Luron [${method}] scheduled:`, response.call_id);
                if (!primaryLuronCallId) primaryLuronCallId = response.call_id || null;
              })
              .catch(error => {
                console.error(`❌ Luron [${method}] error:`, error.message || error);
              })
          )
        ).then(() => {
          if (!primaryLuronCallId) return;
          // Back-fill luron_call_id on history record + upcoming call now that we have it
          if (historyItem?.id) {
            updateHistoryItem(historyItem.id, { luron_call_id: primaryLuronCallId });
          }
          if (savedCall?.id) {
            updateUpcomingCall(savedCall.id, { luron_call_id: primaryLuronCallId });
          }
        });

      } catch (error) {
        console.error('Error scheduling call:', error);
        setScheduleError(error.message || 'Failed to schedule call. Please try again.');
        setIsScheduling(false);

        // Auto-hide error after 5 seconds
        setTimeout(() => setScheduleError(null), 5000);
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
    // Optimistically mark 'missed' immediately — instant feedback in History.
    // Update the existing history record (preserves luron_call_id for sync).
    // Fall back to insert if history_id not yet set (e.g. API still in flight).
    if (call.history_id) {
      updateHistoryStatus(call.history_id, 'missed');
    } else {
      addToHistory({ ...call, status: 'missed' });
    }
    setTimeout(() => removeUpcomingCall(call.id), 3000);

    // Poll Luron for the real outcome — start quickly, then at longer intervals.
    // Declined shows up fast (busy signal); voicemail takes ~6 min.
    [30 * 1000, 60 * 1000, 2 * 60 * 1000, 5 * 60 * 1000, 8 * 60 * 1000].forEach(
      delay => setTimeout(() => syncPendingStatuses(), delay)
    );
  };

  const handleEditCall = (callId) => {
    const call = upcomingCalls.find((c) => c.id === callId);
    if (call && call.originalState) {
      const s = call.originalState;
      setSelectedPersona(s.selectedPersona);
      setSelectedTime(s.selectedTime);
      setVoiceCategory(s.voiceCategory);
      if (s.selectedRealisticVoice) setSelectedRealisticVoice(s.selectedRealisticVoice);
      if (s.selectedCharacterVoice) setSelectedCharacterVoice(s.selectedCharacterVoice);
      // fallback for calls saved before this change
      if (!s.selectedRealisticVoice && !s.selectedCharacterVoice && s.selectedVoice) {
        if (s.voiceCategory === 'character') setSelectedCharacterVoice(s.selectedVoice);
        else setSelectedRealisticVoice(s.selectedVoice);
      }
      setContactMethods(s.contactMethods);
      setNote(s.note);
      setSelectedCallerID(s.selectedCallerID);
      if (s.orderedPersonas) setOrderedPersonas(s.orderedPersonas);

      setEditingCallId(callId);
      updateUpcomingCall(callId, { is_editing: true });
    }
  };

  // Format a Date to the value required by <input type="datetime-local">
  const toDatetimeLocal = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const handleTimeSelect = (timeId) => {
    if (timeId === 'custom') {
      // Default to 10 min from now when opening modal
      if (!customDate) {
        setCustomDate(new Date(Date.now() + 10 * 60 * 1000).toISOString());
      }
      setCustomTimeError('');
      setShowCustomTime(true);
    } else {
      setSelectedTime(timeId);
      setCustomDate(null);
    }
  };

  const allVoices = voiceCategory === 'realistic' ? realisticVoices : characterVoices;
  const selectedVoiceData = [...realisticVoices, ...characterVoices].find((v) => v.id === selectedVoice);

  const getTimeLabel = () => {
    if (selectedTime === '3min') return '3 minutes';
    if (selectedTime === '5min') return '5 minutes';
    if (selectedTime === 'now') return 'right now';
    if (selectedTime === 'custom' && customDate) {
      return new Date(customDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return 'at your custom time';
  };

  return (
    <div ref={topRef} className="min-h-full bg-black px-6 pt-safe pb-safe">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/10 via-black to-black pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto pt-12">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 flex-shrink-0 mr-2">
              <h1 className="text-3xl font-bold text-white">CueOut</h1>
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
                    className="relative flex-shrink-0">

                    <div className="bg-[#121212] p-3 rounded-2xl w-20 border-2 border-dashed border-zinc-800">
                      <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-zinc-500" />
                      </div>
                      <p className="text-xs font-semibold text-center text-zinc-500 truncate">Add</p>
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
            whileTap={{ scale: isScheduling ? 1 : 0.97, opacity: isScheduling ? 1 : 0.85 }}
            className="relative w-full bg-gradient-to-r from-red-500 to-red-600 disabled:from-red-500/50 disabled:to-red-600/50 disabled:cursor-not-allowed text-white font-bold text-lg py-5 rounded-full shadow-2xl shadow-red-500/50 flex items-center justify-center gap-2 transition-colors duration-200">
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
            className="fixed left-4 right-4 z-50" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}>

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
              className="w-full max-w-[380px] bg-zinc-900 rounded-3xl p-4 max-h-[80dvh] overflow-y-auto"
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

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {allVoices.map((voice) =>
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  selected={selectedVoice === voice.id}
                  onClick={() => {
                    if (voiceCategory === 'realistic') setSelectedRealisticVoice(voice.id);
                    else setSelectedCharacterVoice(voice.id);
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
              className="w-full justify-center items-center max-w-[380px] bg-zinc-900 rounded-3xl p-4">

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Custom Time</h3>
                  <button
                  onClick={() => setShowCustomTime(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors">

                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                
                <div className="mb-4 flex justify-center items-center">
                 <input
  type="datetime-local"
  value={customDate ? toDatetimeLocal(customDate) : ''}
  min={toDatetimeLocal(new Date(Date.now() + 60 * 1000))}
  max={toDatetimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}
  onChange={(e) => {
    const val = e.target.value;
    if (!val) return;
    const selected = new Date(val).getTime();
    const now = Date.now();

    if (selected <= now) {
      setCustomTimeError('Please select a future time.');
    } else if (selected > now + 7 * 24 * 60 * 60 * 1000) {
      setCustomTimeError('Maximum 7 days in advance.');
    } else {
      setCustomTimeError('');
    }

    setCustomDate(new Date(val).toISOString());
  }}
  className="w-full max-w-[300px] bg-zinc-800 border border-zinc-700 rounded-2xl px-3 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
/>
                </div>

                {customTimeError ? (
                  <p className="text-xs text-red-400 mb-4 px-1">{customTimeError}</p>
                ) : (
                  <p className="text-xs text-zinc-500 mb-4 px-1">Up to 7 days from today</p>
                )}

                <button
                  onClick={() => {
                    if (!customDate) {
                      setCustomTimeError('Please select a date and time.');
                      return;
                    }
                    const selected = new Date(customDate).getTime();
                    const now = Date.now();
                    if (selected <= now) {
                      setCustomTimeError('Please select a future time.');
                      return;
                    }
                    if (selected > now + 7 * 24 * 60 * 60 * 1000) {
                      setCustomTimeError('Maximum 7 days in advance.');
                      return;
                    }
                    setSelectedTime('custom');
                    setShowCustomTime(false);
                  }}
                  disabled={!!customTimeError || !customDate}
                  className="w-full bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-4 rounded-full transition-colors"
                >
                  Set Time
                </button>
              </motion.div>
            </motion.div>
          }
        </AnimatePresence>
      </div>

      {/* Confirm schedule when calls already pending */}
      <AnimatePresence>
        {showConfirmSchedule && (() => {
          const next = upcomingCalls[0];
          const secsLeft = next?.due_timestamp
            ? Math.max(0, Math.ceil((new Date(next.due_timestamp).getTime() - Date.now()) / 1000))
            : null;
          const timeLabel = secsLeft === null ? null
            : secsLeft < 60 ? `${secsLeft}s`
            : `${Math.floor(secsLeft / 60)}:${(secsLeft % 60).toString().padStart(2, '0')}`;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowConfirmSchedule(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[400px] bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Already scheduled</h3>
                    <p className="text-xs text-zinc-400">You have a pending escape call</p>
                  </div>
                </div>

                {/* Existing call preview */}
                {next && (
                  <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-4 mb-5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                      {next.icon || '📞'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {next.persona || next.persona_id || 'Scheduled call'}
                      </p>
                      {timeLabel && (
                        <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Coming in {timeLabel}
                        </p>
                      )}
                    </div>
                    <div className="text-xs font-medium px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20">
                      Pending
                    </div>
                  </div>
                )}

                <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
                  Do you want to schedule another escape anyway? Both calls will be active at the same time.
                </p>

                {/* Actions */}
                <div className="space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.97, opacity: 0.85 }}
                    onClick={() => { setShowConfirmSchedule(false); doSchedule(); }}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Schedule Anyway
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowConfirmSchedule(false)}
                    className="w-full bg-zinc-800 text-zinc-300 font-semibold py-4 rounded-full"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>);

}