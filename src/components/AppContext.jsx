import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getUpcomingCalls as fetchUpcomingCalls,
  getCallHistory as fetchCallHistory,
  addToHistory as addHistoryItem,
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
import { getUserId, getHistory as fetchLuronHistory } from '../api/luronApi';

const AppContext = createContext();

export function AppProvider({ children }) {
  // State
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  const [history, setHistory] = useState([]);
  const [callerIDs, setCallerIDs] = useState([]);
  const [quickSchedules, setQuickSchedules] = useState([]);
  const [unreadHistoryCount, setUnreadHistoryCount] = useState(0);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticatedState] = useState(false);

  // Luron API Integration
  const [userId] = useState(() => getUserId()); // Generate/retrieve user ID on mount
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Load data from Supabase on mount
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
        // Fall back to localStorage if not authenticated
        loadFromLocalStorage();
        setIsLoading(false);
        return;
      }

      // Load all data in parallel
      const [calls, historyData, callerIdsData, schedulesData, unreadCount] = await Promise.all([
        fetchUpcomingCalls().catch(() => []),
        fetchCallHistory().catch(() => []),
        fetchCallerIds().catch(async () => {
          // Initialize default caller IDs if none exist
          await initializeDefaultCallerIds();
          return fetchCallerIds();
        }),
        fetchQuickSchedules().catch(async () => {
          // Initialize default quick schedules if none exist
          await initializeDefaultQuickSchedules();
          return fetchQuickSchedules();
        }),
        fetchUnreadCount().catch(() => 0)
      ]);

      setUpcomingCalls(calls);
      setHistory(historyData);
      setCallerIDs(callerIdsData);
      setQuickSchedules(schedulesData);
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
      if (isAuthenticated) {
        const newSchedule = await createSchedule(schedule);
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
      if (isAuthenticated) {
        const updated = await updateSchedule(id, updates);
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
      if (isAuthenticated) {
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
      if (isAuthenticated) {
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
    try {
      const historyItem = {
        ...call,
        completed_at: new Date().toISOString(),
        status: 'answered'
      };

      if (isAuthenticated) {
        const newHistoryItem = await addHistoryItem(historyItem);
        setHistory(prev => [newHistoryItem, ...prev]);
        setUnreadHistoryCount(prev => prev + 1);
        return newHistoryItem;
      } else {
        setHistory(prev => [historyItem, ...prev]);
        setUnreadHistoryCount(prev => prev + 1);
        return historyItem;
      }
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  };

  const clearUnreadHistory = async () => {
    try {
      if (isAuthenticated) {
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
    try {
      if (isAuthenticated) {
        await deleteUpcomingCall(id);
      }
      setUpcomingCalls(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error removing upcoming call:', error);
      // Optimistic delete fallback
      setUpcomingCalls(prev => prev.filter(c => c.id !== id));
    }
  };

  const updateUpcomingCall = async (id, updates) => {
    try {
      if (isAuthenticated) {
        const updated = await updateCall(id, updates);
        setUpcomingCalls(prev => prev.map(c => c.id === id ? updated : c));
        return updated;
      } else {
        setUpcomingCalls(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      }
    } catch (error) {
      console.error('Error updating upcoming call:', error);
      // Optimistic update fallback
      setUpcomingCalls(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
  };

  const addUpcomingCall = async (call) => {
    try {
      if (isAuthenticated) {
        const newCall = await createUpcomingCall(call);
        setUpcomingCalls(prev => [newCall, ...prev]);
        return newCall;
      } else {
        setUpcomingCalls(prev => [call, ...prev]);
        return call;
      }
    } catch (error) {
      console.error('Error adding upcoming call:', error);
      // Optimistic add fallback
      setUpcomingCalls(prev => [call, ...prev]);
      return call;
    }
  };

  // Caller IDs
  const updateCallerIDName = async (id, newName) => {
    try {
      if (isAuthenticated) {
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
        // Map API history to app format
        const mappedHistory = response.history.map(apiCall => ({
          id: apiCall.call_id,
          persona: apiCall.persona_type,
          personaName: apiCall.persona_type,
          icon: getPersonaIcon(apiCall.persona_type),
          completedAt: apiCall.created_at,
          status: apiCall.status || 'completed',
          context: apiCall.custom_instruction || apiCall.call_context || '',
          contactMethods: [apiCall.type],
          voice: apiCall.advanced_settings?.voice || 'emma',
          callerId: apiCall.advanced_settings?.caller_id ?
            { number: apiCall.advanced_settings.caller_id } : null,
          duration: apiCall.duration || 0,
          // Keep original API data for reference
          apiData: apiCall
        }));

        // Merge with local history (keep local items not in API)
        setHistory(mappedHistory);
        return mappedHistory;
      }

      return [];
    } catch (error) {
      console.error('Error syncing history with API:', error);
      setApiError(error.message);
      // Don't clear existing history on error
      return history;
    } finally {
      setApiLoading(false);
    }
  };

  // Helper to get persona icon based on persona_type
  const getPersonaIcon = (personaType) => {
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
      isAuthenticated,

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