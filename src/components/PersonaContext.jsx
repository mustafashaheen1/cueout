import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getPersonas as fetchPersonas,
  createPersona as createPersonaAPI,
  updatePersona as updatePersonaAPI,
  deletePersona as deletePersonaAPI,
  getPersonaConfigs as fetchPersonaConfigs,
  upsertPersonaConfig,
  isAuthenticated
} from '../api';

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
  { id: 'manager', name: 'Manager', icon: '💼', color: 'bg-red-500/10 text-red-500', is_default: true },
  { id: 'coordinator', name: 'Coordinator', icon: '📋', color: 'bg-orange-500/10 text-orange-500', is_default: true },
  { id: 'service', name: 'Reminder', icon: '🔔', color: 'bg-pink-500/10 text-pink-500', is_default: true },
  { id: 'friend', name: 'Friend', icon: '💬', color: 'bg-rose-500/10 text-rose-500', is_default: true },
  { id: 'mom', name: 'Mom', icon: '❤️', color: 'bg-red-600/10 text-red-600', is_default: true },
  { id: 'doctor', name: 'Doctor', icon: '⚕️', color: 'bg-orange-600/10 text-orange-600', is_default: true },
  { id: 'boss', name: 'Boss', icon: '👔', color: 'bg-amber-500/10 text-amber-500', is_default: true },
];

export function PersonaProvider({ children }) {
  const [personaConfigs, setPersonaConfigs] = useState(defaultPersonaConfigs);
  const [personas, setPersonas] = useState(defaultPersonas);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);

  // Load personas and configs from Supabase on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Check if user is authenticated
      const authenticated = await isAuthenticated();
      setIsAuthenticatedState(authenticated);

      if (!authenticated) {
        // Use defaults if not authenticated
        setPersonas(defaultPersonas);
        setPersonaConfigs(defaultPersonaConfigs);
        setIsLoading(false);
        return;
      }

      // Load personas and configs from Supabase
      const [personasData, configsData] = await Promise.all([
        fetchPersonas().catch(() => defaultPersonas),
        fetchPersonaConfigs().catch(() => defaultPersonaConfigs)
      ]);

      setPersonas(personasData.length > 0 ? personasData : defaultPersonas);
      setPersonaConfigs(Object.keys(configsData).length > 0 ? configsData : defaultPersonaConfigs);
    } catch (error) {
      console.error('Error loading personas:', error);
      // Fallback to defaults on error
      setPersonas(defaultPersonas);
      setPersonaConfigs(defaultPersonaConfigs);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePersonaConfig = async (personaId, config) => {
    try {
      // Update locally first (optimistic update)
      setPersonaConfigs(prev => ({
        ...prev,
        [personaId]: { ...prev[personaId], ...config }
      }));

      // Update in Supabase if authenticated
      if (isAuthenticatedState) {
        await upsertPersonaConfig(personaId, config);
      }
    } catch (error) {
      console.error('Error updating persona config:', error);
      // Optimistic update already applied, so UI stays updated even if API fails
    }
  };

  const getPersonaConfig = (personaId) => {
    return personaConfigs[personaId] || defaultPersonaConfigs[personaId] || {
      tone: 'casual',
      background: 'none',
      customPhrases: [],
      duration: 30
    };
  };

  const updatePersona = async (id, updates) => {
    try {
      // Update locally first (optimistic update)
      setPersonas(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

      // Update in Supabase if authenticated
      if (isAuthenticatedState) {
        await updatePersonaAPI(id, updates);
      }
    } catch (error) {
      console.error('Error updating persona:', error);
      // Optimistic update already applied
    }
  };

  const deletePersona = async (id) => {
    try {
      // Delete locally first (optimistic delete)
      setPersonas(prev => prev.filter(p => p.id !== id));

      // Delete from Supabase if authenticated
      if (isAuthenticatedState) {
        await deletePersonaAPI(id);
      }
    } catch (error) {
      console.error('Error deleting persona:', error);
      // Optimistic delete already applied
    }
  };

  const addPersona = async (persona) => {
    try {
      // Add locally first (optimistic add)
      const newPersona = { ...persona, is_default: false };
      setPersonas(prev => [...prev, newPersona]);
      setPersonaConfigs(prev => ({
        ...prev,
        [persona.id]: { tone: 'casual', background: 'none', customPhrases: [], duration: 30 }
      }));

      // Add to Supabase if authenticated
      if (isAuthenticatedState) {
        await createPersonaAPI(newPersona);
      }
    } catch (error) {
      console.error('Error adding persona:', error);
      // Optimistic add already applied
    }
  };

  return (
    <PersonaContext.Provider value={{
      // Data
      personaConfigs,
      personas,

      // Loading state
      isLoading,
      isAuthenticated: isAuthenticatedState,

      // Config methods
      updatePersonaConfig,
      getPersonaConfig,

      // Persona methods
      updatePersona,
      deletePersona,
      addPersona,

      // Utilities
      loadData
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