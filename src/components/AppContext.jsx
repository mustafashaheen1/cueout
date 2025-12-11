import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Load initial state from localStorage if available
  const [upcomingCalls, setUpcomingCalls] = useState(() => {
    const saved = localStorage.getItem('upcomingCalls');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('callHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const [callerIDs, setCallerIDs] = useState(() => {
    const saved = localStorage.getItem('callerIDs_v3');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Mom', number: '(555) 123-4567', location: 'Mobile' },
      { id: 2, name: 'Office', number: '(555) 987-6543', location: 'Work' },
      { id: 3, name: 'Girlfriend', number: '(555) 246-8135', location: 'Mobile' },
      { id: 4, name: 'Manager', number: '(555) 369-2580', location: 'Work' },
      { id: 6, name: 'Doctor', number: '(555) 753-9514', location: 'Medical Center' },
    ];
  });

  const updateCallerIDName = (id, newName) => {
    setCallerIDs(prev => prev.map(cid => cid.id === id ? { ...cid, name: newName } : cid));
  };

  const [quickSchedules, setQuickSchedules] = useState(() => {
    const saved = localStorage.getItem('quickSchedules');
    return saved ? JSON.parse(saved) : [
      { 
        id: 'manager', 
        name: 'Manager', 
        icon: '💼', 
        color: 'bg-red-500/10 text-red-500',
        preset: {
          persona: 'manager',
          note: 'Sound like my manager checking in about a project.',
          contactMethods: ['call'],
          voice: 'james'
        }
      },
      { 
        id: 'friend', 
        name: 'Friend', 
        icon: '💬', 
        color: 'bg-rose-500/10 text-rose-500',
        preset: {
          persona: 'friend',
          note: 'Hey, can we chat real quick?',
          contactMethods: ['call', 'text'],
          voice: 'emma'
        }
      },
      { 
        id: 'mom', 
        name: 'Mom', 
        icon: '❤️', 
        color: 'bg-pink-500/10 text-pink-500',
        preset: {
          persona: 'mom',
          note: 'Checking in to see how you\'re doing.',
          contactMethods: ['call'],
          voice: 'emma'
        }
      },
      { 
        id: 'doctor', 
        name: 'Doctor', 
        icon: '⚕️', 
        color: 'bg-orange-500/10 text-orange-500',
        preset: {
          persona: 'doctor',
          note: 'This is Dr. Smith\'s office calling about your appointment.',
          contactMethods: ['call'],
          voice: 'james'
        }
      },
    ];
  });

  const [unreadHistoryCount, setUnreadHistoryCount] = useState(0);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('upcomingCalls', JSON.stringify(upcomingCalls));
  }, [upcomingCalls]);

  useEffect(() => {
    localStorage.setItem('callHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('quickSchedules', JSON.stringify(quickSchedules));
  }, [quickSchedules]);

  useEffect(() => {
    localStorage.setItem('callerIDs_v3', JSON.stringify(callerIDs));
  }, [callerIDs]);

  const addQuickSchedule = (schedule) => {
    setQuickSchedules(prev => [schedule, ...prev]);
  };

  const updateQuickSchedule = (id, updates) => {
    setQuickSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeQuickSchedule = (id) => {
    setQuickSchedules(prev => prev.filter(s => s.id !== id));
  };

  const promoteQuickSchedule = (id) => {
    setQuickSchedules(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index <= 0) return prev;
      const item = prev[index];
      const newSchedules = [...prev];
      newSchedules.splice(index, 1);
      newSchedules.unshift(item);
      return newSchedules;
    });
  };

  const addToHistory = (call) => {
    const historyItem = {
      ...call,
      completedAt: Date.now(),
      status: 'completed'
    };
    setHistory(prev => [historyItem, ...prev]);
    setUnreadHistoryCount(prev => prev + 1);
  };

  const clearUnreadHistory = () => {
    setUnreadHistoryCount(0);
  };

  const removeUpcomingCall = (id) => {
    setUpcomingCalls(prev => prev.filter(c => c.id !== id));
  };

  const updateUpcomingCall = (id, updates) => {
    setUpcomingCalls(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addUpcomingCall = (call) => {
    setUpcomingCalls(prev => [call, ...prev]);
  };

  return (
    <AppContext.Provider value={{
      upcomingCalls,
      setUpcomingCalls, // Exposing setter for flexibility, but prefer helper methods
      addUpcomingCall,
      removeUpcomingCall,
      updateUpcomingCall,
      history,
      addToHistory,
      unreadHistoryCount,
      clearUnreadHistory,
      isTabBarHidden,
      setIsTabBarHidden,
      quickSchedules,
      addQuickSchedule,
      updateQuickSchedule,
      removeQuickSchedule,
      promoteQuickSchedule,
      callerIDs,
      updateCallerIDName
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