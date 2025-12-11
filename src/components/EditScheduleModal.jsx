
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Trash2, Settings, Check, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './AppContext';
import ContactMethodSelector from './ContactMethodSelector';
import TimeChip from './TimeChip';
import VoiceCard from './VoiceCard';
import { createPageUrl } from './utils';
import { timeOptions, realisticVoices, characterVoices } from './constants';

export default function EditScheduleModal({ schedule, onSave, onClose, onDelete, personas }) {
  const navigate = useNavigate();
  const { setIsTabBarHidden, callerIDs } = useApp();
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    setIsTabBarHidden(true);
    return () => setIsTabBarHidden(false);
  }, [setIsTabBarHidden]);
  const [name, setName] = useState(schedule.name);
  const [icon, setIcon] = useState(schedule.icon || '📞');
  const [personaId, setPersonaId] = useState(schedule.preset.persona);
  const [note, setNote] = useState(schedule.preset.note);
  const [contactMethods, setContactMethods] = useState(schedule.preset.contactMethods);
  const [voiceId, setVoiceId] = useState(schedule.preset.voice || 'emma');
  const [callerId, setCallerId] = useState(schedule.preset.callerId || null);
  const [time, setTime] = useState(schedule.preset.time || '3min');
  const [voiceCategory, setVoiceCategory] = useState(schedule.preset.voiceCategory || 'realistic');

  // Sort personas so selected is first
  const orderedPersonas = React.useMemo(() => {
    const selected = personas.find(p => p.id === personaId);
    if (!selected) return personas;
    const others = personas.filter(p => p.id !== personaId);
    return [selected, ...others];
  }, [personas, personaId]);

  const allVoices = voiceCategory === 'realistic' ? realisticVoices : characterVoices;

  const handleSave = () => {
    onSave({
      ...schedule,
      name,
      icon,
      color: personas.find(p => p.id === personaId)?.color || 'bg-zinc-800 text-white',
      preset: {
        ...schedule.preset,
        persona: personaId,
        note,
        contactMethods,
        voice: voiceId,
        callerId,
        time,
        voiceCategory
      }
    });
  };

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
        className="w-full max-w-[380px] bg-zinc-900 rounded-3xl max-h-[85vh] flex flex-col"
      >
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Edit Schedule</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex bg-zinc-800/50 p-1 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'general' 
                  ? 'bg-zinc-800 text-white shadow-lg' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'advanced' 
                  ? 'bg-zinc-800 text-white shadow-lg' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Advanced
            </button>
          </div>
        </div>

        <div className="p-6 pt-0 overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          <div className="space-y-4">
            {activeTab === 'general' ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Name & Icon</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-14 text-center bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-3 text-white text-xl focus:outline-none focus:border-red-500/50 transition-colors"
                      placeholder="✨"
                      maxLength={4}
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                      placeholder="Schedule Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Contact Methods</label>
                  <ContactMethodSelector selected={contactMethods} onChange={setContactMethods} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">When should the call come?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {timeOptions.map((t) => (
                      <TimeChip
                        key={t.id}
                        label={t.label}
                        selected={time === t.id}
                        onClick={() => setTime(t.id)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Persona</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2" style={{ scrollbarWidth: 'none' }}>
                    {orderedPersonas.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPersonaId(p.id)}
                        className={`relative flex-shrink-0 p-3 rounded-xl border transition-all flex flex-col items-center ${
                          personaId === p.id
                            ? 'bg-zinc-800 border-red-500 shadow-lg shadow-red-500/10'
                            : 'bg-zinc-800/50 border-zinc-700'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${p.color || 'bg-zinc-700 text-white'}`}>
                          <div className="text-lg">{p.icon}</div>
                        </div>
                        <div className="text-[10px] text-center text-zinc-300">{p.name}</div>
                        {personaId === p.id && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl('PersonaSettings'));
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-zinc-900/80 rounded-full flex items-center justify-center border border-zinc-700 hover:bg-zinc-800 transition-colors"
                          >
                            <Settings className="w-3 h-3 text-zinc-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">What should this call be about?</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none transition-colors"
                    rows={3}
                    placeholder="Add context for the AI..."
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Voice Section */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-3">Voice Selection</label>
                  <div className="flex gap-2 mb-4 bg-zinc-800/50 rounded-lg p-1">
                    <button
                      onClick={() => setVoiceCategory('realistic')}
                      className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-all ${
                        voiceCategory === 'realistic'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Ultra Realistic
                    </button>
                    <button
                      onClick={() => setVoiceCategory('character')}
                      className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-all ${
                        voiceCategory === 'character'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Characters
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {allVoices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={voiceId === voice.id}
                        onClick={() => setVoiceId(voice.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Caller ID Section */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-3">Caller ID</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setCallerId(null)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        !callerId
                          ? 'bg-red-500/10 border-red-500/50'
                          : 'bg-zinc-800/30 border-zinc-700 hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${!callerId ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                          <Phone className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">No Caller ID</p>
                          <p className="text-xs text-zinc-500">Use default number</p>
                        </div>
                        {!callerId && <Check className="w-4 h-4 text-red-500" />}
                      </div>
                    </button>

                    {callerIDs.map((cid) => (
                      <button
                        key={cid.id}
                        onClick={() => setCallerId(cid)}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          callerId?.id === cid.id
                            ? 'bg-red-500/10 border-red-500/50'
                            : 'bg-zinc-800/30 border-zinc-700 hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${callerId?.id === cid.id ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                            <Phone className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{cid.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{cid.number}</p>
                          </div>
                          {callerId?.id === cid.id && <Check className="w-4 h-4 text-red-500" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900 rounded-b-3xl z-10 flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>

            <button
              onClick={() => onDelete(schedule.id)}
              className="w-14 h-14 bg-zinc-800 hover:bg-red-900/20 text-zinc-400 hover:text-red-500 rounded-full flex items-center justify-center transition-all border border-zinc-700 hover:border-red-500/30 flex-shrink-0"
              title="Delete Schedule"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
