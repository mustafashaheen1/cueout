import React, { createContext, useContext, useState } from 'react';

const PersonaContext = createContext();

const defaultPersonaConfigs = {
  manager: { tone: 'formal', background: 'office', customPhrases: [], duration: 30 },
  coordinator: { tone: 'casual', background: 'office', customPhrases: [], duration: 30 },
  service: { tone: 'friendly', background: 'none', customPhrases: [], duration: 30 },
  friend: { tone: 'casual', background: 'cafe', customPhrases: [], duration: 30 },
  mom: { tone: 'concerned', background: 'home', customPhrases: [], duration: 30 },
  doctor: { tone: 'formal', background: 'office', customPhrases: [], duration: 30 },
  boss: { tone: 'formal', background: 'office', customPhrases: [], duration: 30 },
};

const defaultPersonas = [
  { id: 'manager', name: 'Manager', icon: '💼', color: 'bg-red-500/10 text-red-500' },
  { id: 'coordinator', name: 'Coordinator', icon: '📋', color: 'bg-orange-500/10 text-orange-500' },
  { id: 'service', name: 'Reminder', icon: '🔔', color: 'bg-pink-500/10 text-pink-500' },
  { id: 'friend', name: 'Friend', icon: '💬', color: 'bg-rose-500/10 text-rose-500' },
  { id: 'mom', name: 'Mom', icon: '❤️', color: 'bg-red-600/10 text-red-600' },
  { id: 'doctor', name: 'Doctor', icon: '⚕️', color: 'bg-orange-600/10 text-orange-600' },
  { id: 'boss', name: 'Boss', icon: '👔', color: 'bg-amber-500/10 text-amber-500' },
];

export function PersonaProvider({ children }) {
  const [personaConfigs, setPersonaConfigs] = useState(defaultPersonaConfigs);
  const [personas, setPersonas] = useState(defaultPersonas);

  const updatePersonaConfig = (personaId, config) => {
    setPersonaConfigs(prev => ({
      ...prev,
      [personaId]: { ...prev[personaId], ...config }
    }));
  };

  const getPersonaConfig = (personaId) => {
    return personaConfigs[personaId] || defaultPersonaConfigs[personaId] || { tone: 'casual', background: 'none', customPhrases: [], duration: 30 };
  };

  const updatePersona = (id, updates) => {
    setPersonas(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePersona = (id) => {
    setPersonas(prev => prev.filter(p => p.id !== id));
  };

  const addPersona = (persona) => {
    setPersonas(prev => [...prev, persona]);
    setPersonaConfigs(prev => ({
      ...prev,
      [persona.id]: { tone: 'casual', background: 'none', customPhrases: [], duration: 30 }
    }));
  };

  return (
    <PersonaContext.Provider value={{ 
      personaConfigs, 
      updatePersonaConfig, 
      getPersonaConfig,
      personas,
      updatePersona,
      deletePersona,
      addPersona
    }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within PersonaProvider');
  }
  return context;
}