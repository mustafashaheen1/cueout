import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  getUpcomingCalls as fetchUpcomingCalls,
  getCallHistory as fetchCallHistory,
  addToHistory as addHistoryItem,
  deleteHistoryItem as removeHistoryItem,
  getUnreadHistoryCount as fetchUnreadCount,
  markHistoryAsRead,
  createUpcomingCall,
  updateUpcomingCall as updateCall,
  deleteUpcomingCall,
  getCallerIds as fetchCallerIds,
  updateCallerIdName as updateCallerName,
  initializeDefaultCallerIds,
  getQuickSchedules as fetchQuickSchedules,
  createQuickSchedule as createSchedule,
  updateQuickSchedule as updateSchedule,
  deleteQuickSchedule,
  promoteQuickSchedule as promoteSchedule,
  initializeDefaultQuickSchedules,
  isAuthenticated
} from '../api';
import { getHistory as fetchLuronHistory } from '../api/luronApi';
import { useAuth } from './AuthContext';

const AppContext = createContext();

// Whitelist of columns that exist in the upcoming_calls DB table
const DB_UPCOMING_CALL_FIELDS = new Set([
  'id', 'persona_id', 'voice_id', 'caller_id', 'contact_methods', 'context_note',
  'due_timestamp', 'tone', 'background_sound', 'duration_seconds', 'voice_category',
  'is_new', 'is_editing',
]);

const pickDbUpcomingCallFields = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => DB_UPCOMING_CALL_FIELDS.has(k)));

export function AppProvider({ children }) {
  const { user } = useAuth();
  // State — initialize from localStorage cache for instant render
  const [upcomingCalls, setUpcomingCalls] = useState(() => {
    try { const s = localStorage.getItem('upcomingCalls'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [history, setHistory] = useState(() => {
    try { const s = localStorage.getItem('callHistory'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [callerIDs, setCallerIDs] = useState(() => {
    try { const s = localStorage.getItem('callerIDs_v3'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [quickSchedules, setQuickSchedules] = useState(() => {
    try { const s = localStorage.getItem('quickSchedules'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [unreadHistoryCount, setUnreadHistoryCount] = useState(0);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuthenticatedState] = useState(false);

  // Luron API Integration
  // Use Supabase UUID as the Luron user_id — stable across logout/login/devices
  const userId = user?.id ?? null;
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Ref so syncHistoryWithAPI error fallback always sees current history
  const historyRef = useRef([]);

  // Keep historyRef in sync with history state for use in closures
  useEffect(() => { historyRef.current = history; }, [history]);

  // Map Supabase call_history row → consistent app shape used by History.jsx
  const normalizeHistoryItem = (item) => ({
    id:             item.id,
    persona:        item.persona    ?? item.persona_id    ?? 'manager',
    personaName:    item.personaName ?? item.persona_id   ?? 'Unknown',
    icon:           item.icon       ?? getPersonaIconStatic(item.persona_id),
    completedAt:    item.completedAt ?? item.completed_at,
    status:         item.status     ?? 'completed',
    context:        item.context    ?? item.context_note  ?? '',
    contactMethods: item.contactMethods ?? item.contact_methods ?? ['call'],
    voice:          item.voice      ?? item.voice_id      ?? 'emma',
    callerId:       item.callerId   ?? item.caller_id     ?? null,
    duration:       item.duration   ?? item.duration_seconds ?? 0,
    is_read:        item.is_read    ?? true,
  });

  // Normalize quick schedule from Supabase flat structure to app's nested preset structure
  const normalizeQuickSchedule = (qs) => ({
    ...qs,
    preset: qs.preset || {
      persona: qs.persona_id || 'manager',
      note: qs.context_note || '',
      contactMethods: qs.contact_methods || ['call'],
      voice: qs.voice_id || 'emma',
      callerId: qs.caller_id || null,
      time: qs.time_preset || '3min',
      voiceCategory: qs.voice_category || 'realistic'
    }
  });

  // Load data on mount and whenever auth state changes
  useEffect(() => {
    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // New user signed in — reload fresh data for this account
        loadData();
      } else if (event === 'SIGNED_OUT') {
        // Reset all state immediately so next user starts completely clean
        setUpcomingCalls([]);
        setHistory([]);
        setCallerIDs([]);
        setQuickSchedules([]);
        setUnreadHistoryCount(0);
        setIsAuthenticatedState(false);
        setApiError(null);
        setIsLoading(false);
        // Wipe all user-specific localStorage cache keys
        localStorage.removeItem('upcomingCalls');
        localStorage.removeItem('callHistory');
        localStorage.removeItem('quickSchedules');
        localStorage.removeItem('callerIDs_v3');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Check if user is authenticated
      const authenticated = await isAuthenticated();
      setIsAuthenticatedState(authenticated);

      if (!authenticated) {
        // Fall back to localStorage if not authenticated
        loadFromLocalStorage();
        setIsLoading(false);
        return;
      }

      // Load all data in parallel
      const [calls, historyData, callerIdsData, schedulesData, unreadCount] = await Promise.all([
        fetchUpcomingCalls().catch(() => []),
        fetchCallHistory().catch(() => []),
        fetchCallerIds().then(async (data) => {
          if (data.length === 0) {
            await initializeDefaultCallerIds().catch(() => {});
            return fetchCallerIds().catch(() => []);
          }
          return data;
        }).catch(() => []),
        fetchQuickSchedules().then(async (data) => {
          if (data.length === 0) {
            await initializeDefaultQuickSchedules().catch(() => {});
            return fetchQuickSchedules().catch(() => []);
          }
          return data;
        }).catch(() => []),
        fetchUnreadCount().catch(() => 0)
      ]);

      setUpcomingCalls(calls);
      setHistory((historyData || []).map(normalizeHistoryItem));
      setCallerIDs(callerIdsData);
      setQuickSchedules(schedulesData.map(normalizeQuickSchedule));
      setUnreadHistoryCount(unreadCount);
    } catch (error) {
      console.error('Error loading data:', error);
      // Fall back to localStorage on error
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback: Load from localStorage (for development/offline)
  const loadFromLocalStorage = () => {
    const savedCalls = localStorage.getItem('upcomingCalls');
    const savedHistory = localStorage.getItem('callHistory');
    const savedCallerIDs = localStorage.getItem('callerIDs_v3');
    const savedSchedules = localStorage.getItem('quickSchedules');

    setUpcomingCalls(savedCalls ? JSON.parse(savedCalls) : []);
    setHistory(savedHistory ? JSON.parse(savedHistory) : []);
    setCallerIDs(savedCallerIDs ? JSON.parse(savedCallerIDs) : [
      { id: 1, name: 'Mom', number: '(555) 123-4567', location: 'Mobile' },
      { id: 2, name: 'Office', number: '(555) 987-6543', location: 'Work' },
      { id: 3, name: 'Girlfriend', number: '(555) 246-8135', location: 'Mobile' },
      { id: 4, name: 'Manager', number: '(555) 369-2580', location: 'Work' },
      { id: 6, name: 'Doctor', number: '(555) 753-9514', location: 'Medical Center' },
    ]);
    setQuickSchedules(savedSchedules ? JSON.parse(savedSchedules) : []);
  };

  // Also persist to localStorage as backup
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('upcomingCalls', JSON.stringify(upcomingCalls));
    }
  }, [upcomingCalls, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('callHistory', JSON.stringify(history));
    }
  }, [history, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('quickSchedules', JSON.stringify(quickSchedules));
    }
  }, [quickSchedules, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('callerIDs_v3', JSON.stringify(callerIDs));
    }
  }, [callerIDs, isLoading]);

  // Quick Schedules
  const addQuickSchedule = async (schedule) => {
    try {
      if (isAuth) {
        const newSchedule = normalizeQuickSchedule(await createSchedule(schedule));
        setQuickSchedules(prev => [newSchedule, ...prev]);
        return newSchedule;
      } else {
        setQuickSchedules(prev => [schedule, ...prev]);
        return schedule;
      }
    } catch (error) {
      console.error('Error adding quick schedule:', error);
      // Optimistic update fallback
      setQuickSchedules(prev => [schedule, ...prev]);
      return schedule;
    }
  };

  const updateQuickSchedule = async (id, updates) => {
    try {
      if (isAuth) {
        const updated = normalizeQuickSchedule(await updateSchedule(id, updates));
        setQuickSchedules(prev => prev.map(s => s.id === id ? updated : s));
        return updated;
      } else {
        setQuickSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      }
    } catch (error) {
      console.error('Error updating quick schedule:', error);
      // Optimistic update fallback
      setQuickSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
  };

  const removeQuickSchedule = async (id) => {
    try {
      if (isAuth) {
        await deleteQuickSchedule(id);
      }
      setQuickSchedules(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error removing quick schedule:', error);
      // Optimistic delete fallback
      setQuickSchedules(prev => prev.filter(s => s.id !== id));
    }
  };

  const promoteQuickSchedule = async (id) => {
    try {
      if (isAuth) {
        await promoteSchedule(id);
        // Reload to get correct ordering
        const schedules = await fetchQuickSchedules();
        setQuickSchedules(schedules);
      } else {
        setQuickSchedules(prev => {
          const index = prev.findIndex(s => s.id === id);
          if (index <= 0) return prev;
          const item = prev[index];
          const newSchedules = [...prev];
          newSchedules.splice(index, 1);
          newSchedules.unshift(item);
          return newSchedules;
        });
      }
    } catch (error) {
      console.error('Error promoting quick schedule:', error);
    }
  };

  // History
  const addToHistory = async (call) => {
    const historyItem = {
      ...call,
      completed_at: new Date().toISOString(),
      status: 'answered', // DB constraint: only 'answered' or 'missed' allowed
    };
    try {
      // withAuth in addHistoryItem handles auth independently — no isAuth gate needed
      const newHistoryItem = await addHistoryItem(historyItem);
      setHistory(prev => [newHistoryItem, ...prev]);
      setUnreadHistoryCount(prev => prev + 1);
      return newHistoryItem;
    } catch (error) {
      console.error('Error adding to history:', error);
      // Fall back to local state so UI still shows the entry
      setHistory(prev => [historyItem, ...prev]);
      setUnreadHistoryCount(prev => prev + 1);
      return historyItem;
    }
  };

  const refreshHistory = async () => {
    try {
      const data = await fetchCallHistory().catch(() => []);
      const normalized = (data || []).map(normalizeHistoryItem);
      setHistory(normalized);
      return normalized;
    } catch (error) {
      console.error('Error refreshing history:', error);
      return historyRef.current;
    }
  };

  const deleteFromHistory = async (id) => {
    try {
      if (isAuth) await removeHistoryItem(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting history item:', error);
      setHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  const clearUnreadHistory = async () => {
    try {
      if (isAuth) {
        await markHistoryAsRead();
      }
      setUnreadHistoryCount(0);
    } catch (error) {
      console.error('Error clearing unread history:', error);
      setUnreadHistoryCount(0);
    }
  };

  // Upcoming Calls
  const removeUpcomingCall = async (id) => {
    // Remove from local state immediately
    setUpcomingCalls(prev => prev.filter(c => c.id !== id));
    // Delete from DB — withAuth handles auth check
    deleteUpcomingCall(id).catch(error => {
      console.error('Error removing upcoming call from database:', error);
    });
  };

  const updateUpcomingCall = async (id, updates) => {
    // Apply all updates to local state immediately (includes UI-only fields)
    setUpcomingCalls(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    // Only send DB-valid fields to Supabase
    const dbUpdates = pickDbUpcomingCallFields(updates);
    if (Object.keys(dbUpdates).length > 0) {
      updateCall(id, dbUpdates).catch(error => {
        console.error('Error updating upcoming call:', error);
      });
    }
  };

  const addUpcomingCall = async (call) => {
    // Generate a proper UUID so local state and DB use the same ID from the start
    const tempId = crypto.randomUUID();
    const localCall = { ...call, id: tempId };

    // Add to local state immediately (optimistic)
    setUpcomingCalls(prev => [localCall, ...prev]);

    // Save to DB — send only valid DB columns (no UI-only fields)
    createUpcomingCall({ ...pickDbUpcomingCallFields(call), id: tempId })
      .then(savedCall => {
        // Merge real DB response back into local item (keeps UI fields intact)
        setUpcomingCalls(prev => prev.map(c => c.id === tempId ? { ...localCall, ...savedCall } : c));
      })
      .catch(error => {
        console.error('Error saving upcoming call to database:', error);
      });

    return localCall;
  };

  // Caller IDs
  const updateCallerIDName = async (id, newName) => {
    try {
      if (isAuth) {
        await updateCallerName(id, newName);
      }
      setCallerIDs(prev => prev.map(cid => cid.id === id ? { ...cid, name: newName } : cid));
    } catch (error) {
      console.error('Error updating caller ID:', error);
      // Optimistic update fallback
      setCallerIDs(prev => prev.map(cid => cid.id === id ? { ...cid, name: newName } : cid));
    }
  };

  // Luron API - Sync history with API
  const syncHistoryWithAPI = async (filters = {}) => {
    try {
      setApiLoading(true);
      setApiError(null);

      const response = await fetchLuronHistory(userId, filters);

      if (response.success && response.history) {
        const mappedHistory = response.history.map(apiCall =>
          normalizeHistoryItem({
            id:             apiCall.call_id,
            persona:        apiCall.persona_type,
            personaName:    apiCall.persona_type,
            icon:           getPersonaIconStatic(apiCall.persona_type),
            completedAt:    apiCall.created_at,
            status:         apiCall.status || 'completed',
            context:        apiCall.custom_instruction || apiCall.call_context || '',
            contactMethods: [apiCall.type],
            voice:          apiCall.advanced_settings?.voice || 'emma',
            callerId:       apiCall.advanced_settings?.caller_id
                              ? { number: apiCall.advanced_settings.caller_id }
                              : null,
            duration:       apiCall.duration || 0,
            apiData:        apiCall,
          })
        );

        setHistory(mappedHistory);
        return mappedHistory;
      }

      return [];
    } catch (error) {
      console.error('Error syncing history with API:', error);
      setApiError(error.message);
      // Don't clear existing history on error — use ref to avoid stale closure
      return historyRef.current;
    } finally {
      setApiLoading(false);
    }
  };

  // Helper to get persona icon based on persona_type
  const getPersonaIconStatic = (personaType) => {
    const iconMap = {
      manager: '💼',
      coordinator: '📋',
      service: '🔔',
      friend: '💬',
      mom: '❤️',
      doctor: '⚕️',
      boss: '👔',
    };
    return iconMap[personaType] || '✨';
  };

  return (
    <AppContext.Provider value={{
      // Data
      upcomingCalls,
      history,
      quickSchedules,
      callerIDs,
      unreadHistoryCount,

      // UI State
      isTabBarHidden,
      setIsTabBarHidden,
      isLoading,
      isAuthenticated: isAuth,

      // Luron API Integration
      userId,
      apiLoading,
      apiError,
      syncHistoryWithAPI,

      // Upcoming Calls
      setUpcomingCalls, // Exposing setter for flexibility
      addUpcomingCall,
      removeUpcomingCall,
      updateUpcomingCall,

      // History
      addToHistory,
      deleteFromHistory,
      refreshHistory,
      clearUnreadHistory,

      // Quick Schedules
      addQuickSchedule,
      updateQuickSchedule,
      removeQuickSchedule,
      promoteQuickSchedule,

      // Caller IDs
      updateCallerIDName,

      // Utilities
      loadData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}