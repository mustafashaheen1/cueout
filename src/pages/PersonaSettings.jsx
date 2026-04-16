import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Volume2, 
  MessageSquare, 
  Clock, 
  Sparkles,
  Plus,
  X,
  Check,
  Settings
} from 'lucide-react';
import { usePersona } from '../components/PersonaContext';
import ToneSelector from '../components/persona/ToneSelector';
import BackgroundSoundSelector from '../components/persona/BackgroundSoundSelector';
import DurationSlider from '../components/persona/DurationSlider';

const luronPersonaOptions = [
  { id: 'manager',     label: 'Manager',     icon: '💼', description: 'Professional & work-focused' },
  { id: 'coordinator', label: 'Coordinator', icon: '📋', description: 'Organised & scheduling' },
  { id: 'friend',      label: 'Friend',      icon: '💬', description: 'Casual & warm' },
  { id: 'mom',         label: 'Mom',         icon: '❤️', description: 'Caring & concerned' },
  { id: 'doctor',      label: 'Doctor',      icon: '⚕️', description: 'Medical & formal' },
  { id: 'boss',        label: 'Boss',        icon: '👔', description: 'Authoritative & direct' },
  { id: 'service',     label: 'Service',     icon: '🔔', description: 'Reminder & notification' },
];

const toneOptions = [
  { id: 'formal', label: 'Formal', icon: '👔', description: 'Professional and courteous' },
  { id: 'casual', label: 'Casual', icon: '😊', description: 'Relaxed and friendly' },
  { id: 'urgent', label: 'Urgent', icon: '⚡', description: 'Time-sensitive and direct' },
  { id: 'friendly', label: 'Friendly', icon: '🤗', description: 'Warm and approachable' },
  { id: 'concerned', label: 'Concerned', icon: '😟', description: 'Worried and caring' },
  { id: 'excited', label: 'Excited', icon: '🎉', description: 'Enthusiastic and upbeat' },
];

const backgroundSounds = [
  { id: 'none', label: 'None', icon: '🔇', description: 'Quiet background' },
  { id: 'office', label: 'Office', icon: '🏢', description: 'Keyboard clicks, distant chatter' },
  { id: 'cafe', label: 'Café', icon: '☕', description: 'Coffee machines, conversations' },
  { id: 'street', label: 'Street', icon: '🚗', description: 'Traffic, city ambience' },
  { id: 'home', label: 'Home', icon: '🏠', description: 'Subtle household sounds' },
  { id: 'airport', label: 'Airport', icon: '✈️', description: 'Announcements, crowd noise' },
];

export default function PersonaSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getPersonaConfig, updatePersonaConfig, updatePersona, deletePersona, addPersona } = usePersona();
  
  const initialPersona = location.state?.persona || { id: 'manager', name: 'Manager', icon: '💼' };
  const isNew = location.state?.isNew === true;

  const isCustomPersona = !initialPersona.is_default;
  const [name, setName] = useState(initialPersona.name);
  const [icon, setIcon] = useState(initialPersona.icon);
  const [luronPersonaType, setLuronPersonaType] = useState(initialPersona.luron_persona_type || 'manager');

  const currentConfig = getPersonaConfig(initialPersona.id);
  
  const [selectedTone, setSelectedTone] = useState(currentConfig.tone);
  const [selectedBackground, setSelectedBackground] = useState(currentConfig.background);
  const [customPhrases, setCustomPhrases] = useState(currentConfig.customPhrases);
  const [duration, setDuration] = useState(currentConfig.duration);
  const [showAddPhrase, setShowAddPhrase] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');

  const handleAddPhrase = () => {
    if (newPhrase.trim() && customPhrases.length < 5) {
      setCustomPhrases([...customPhrases, newPhrase.trim()]);
      setNewPhrase('');
      setShowAddPhrase(false);
    }
  };

  const handleRemovePhrase = (index) => {
    setCustomPhrases(customPhrases.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (isNew) {
      // First time save — add the persona with final name/icon
      addPersona({ ...initialPersona, name, icon, luron_persona_type: luronPersonaType });
    } else {
      updatePersona(initialPersona.id, { name, icon, ...(isCustomPersona && { luron_persona_type: luronPersonaType }) });
    }
    updatePersonaConfig(initialPersona.id, {
      tone: selectedTone,
      background: selectedBackground,
      customPhrases,
      duration
    });
    navigate(-1);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this persona?')) {
      deletePersona(initialPersona.id);
      navigate(-1);
    }
  };

  return (
    <div className="min-h-full bg-black pt-safe pb-safe">
      <div className="fixed inset-0 bg-gradient-to-b from-red-950/20 via-black to-black pointer-events-none" />
      
      <div className="relative">
        <div className="sticky top-safe z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-zinc-900 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">{icon}</span>
                <h1 className="text-xl font-bold text-white">{name} settings</h1>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="p-2 -mr-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
            >
              <Check className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 max-w-md mx-auto space-y-6">
          
          {/* Preview moved to top */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 blur-2xl" />
            <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6">

              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-white">Preview</h3>
              </div>
              <div className="bg-black/40 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Tone:</span>
                  <span className="text-white font-medium">
                    {toneOptions.find(t => t.id === selectedTone)?.label}
                  </span>
                  <span>{toneOptions.find(t => t.id === selectedTone)?.icon}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Background:</span>
                  <span className="text-white font-medium">
                    {backgroundSounds.find(s => s.id === selectedBackground)?.label}
                  </span>
                  <span>{backgroundSounds.find(s => s.id === selectedBackground)?.icon}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Duration:</span>
                  <span className="text-white font-medium">{duration}s max</span>
                </div>
                {customPhrases.length > 0 && (
                  <div className="pt-2 border-t border-zinc-700">
                    <span className="text-zinc-400 text-xs block mb-2">Will mention:</span>
                    <div className="flex flex-wrap gap-1">
                      {customPhrases.map((phrase, i) => (
                        <span key={i} className="px-2 py-1 bg-red-500/20 text-red-300 rounded-lg text-xs">
                          "{phrase}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
             <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-white">Identity</h2>
                <p className="text-sm text-zinc-400">Customize persona appearance</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Icon</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50"
                  maxLength={2}
                />
              </div>

              {isCustomPersona && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Call Behavior</label>
                  <p className="text-xs text-zinc-500 mb-3">Which AI character should this persona act like on calls?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {luronPersonaOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setLuronPersonaType(option.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                          luronPersonaType === option.id
                            ? 'bg-red-500/20 border-red-500/50 text-white'
                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        <span className="text-lg">{option.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{option.label}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{option.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-white">Tone</h2>
                <p className="text-sm text-zinc-400">How should they sound?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {toneOptions.map((tone) => (
                <ToneSelector
                  key={tone.id}
                  tone={tone}
                  selected={selectedTone === tone.id}
                  onClick={() => setSelectedTone(tone.id)}
                />
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-white">Background noise</h2>
                <p className="text-sm text-zinc-400">Add ambient realism</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {backgroundSounds.map((sound) => (
                <BackgroundSoundSelector
                  key={sound.id}
                  sound={sound}
                  selected={selectedBackground === sound.id}
                  onClick={() => setSelectedBackground(sound.id)}
                />
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-white">Custom phrases</h2>
                <p className="text-sm text-zinc-400">Keywords to mention ({customPhrases.length}/5)</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {customPhrases.map((phrase, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 bg-zinc-800/50 rounded-2xl p-3"
                >
                  <span className="flex-1 text-sm text-white">{phrase}</span>
                  <button
                    onClick={() => handleRemovePhrase(index)}
                    className="p-1 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </motion.div>
              ))}
            </div>

            {showAddPhrase ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  placeholder="e.g., 'the meeting', 'urgent matter'..."
                  maxLength={50}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddPhrase}
                    disabled={!newPhrase.trim()}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 rounded-full transition-colors"
                  >
                    Add Phrase
                  </button>
                  <button
                    onClick={() => {
                      setShowAddPhrase(false);
                      setNewPhrase('');
                    }}
                    className="px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddPhrase(true)}
                disabled={customPhrases.length >= 5}
                className="w-full bg-zinc-800/50 hover:bg-zinc-800 disabled:bg-zinc-800/30 disabled:text-zinc-600 border-2 border-dashed border-zinc-700 hover:border-zinc-600 disabled:border-zinc-800 rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <Plus className="w-5 h-5 text-white" />
                <span className="text-white">Add Custom Phrase</span>
              </button>
            )}
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-white">Duration</h2>
                <p className="text-sm text-zinc-400">Maximum call length</p>
              </div>
            </div>

            <DurationSlider
              value={duration}
              onChange={setDuration}
            />
          </div>

          <div className="pb-20">
            <motion.button
              onClick={isCustomPersona ? handleDelete : undefined}
              disabled={!isCustomPersona}
              whileTap={isCustomPersona ? { scale: 0.97, opacity: 0.85 } : {}}
              className={`w-full font-bold py-4 rounded-full transition-all ${
                isCustomPersona
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isCustomPersona ? 'Delete Persona' : 'Default Persona'}
            </motion.button>
          </div>

        </div>


      </div>
    </div>
  );
}