import React, { createContext, useContext, useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../lib/supabase';
import {
  signUp,
  signIn,
  signOut as authSignOut,
  getCurrentUser,
  onAuthStateChange,
  signInWithApple,
  updateEmail,
  updatePassword,
  resetPassword
} from '../api';


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Get initial session
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
    });

    // Handle deep links (e.g. email change confirmation: cueout://?token_hash=...&type=email_change)
    const handleAppUrl = async ({ url }) => {
      try {
        const parsed = new URL(url);
        const token_hash = parsed.searchParams.get('token_hash');
        const type = parsed.searchParams.get('type');
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash, type });
          if (!error) {
            await checkUser();
          }
        }
      } catch (err) {
        console.error('Deep link handling error:', err);
      }
    };

    // Refresh session when app comes back to foreground (e.g. after browser email confirmation)
    const handleAppStateChange = ({ isActive }) => {
      if (isActive) checkUser();
    };

    CapacitorApp.addListener('appUrlOpen', handleAppUrl);
    CapacitorApp.addListener('appStateChange', handleAppStateChange);

    return () => {
      subscription?.unsubscribe();
      CapacitorApp.removeAllListeners();
    };
  }, []);

  const checkUser = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email, password) => {
    try {
      const { user, session } = await signUp(email, password);
      setUser(user);
      setSession(session);
      setIsAuthenticated(!!user);
      return { user, session };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { user, session } = await signIn(email, password);
      setUser(user);
      setSession(session);
      setIsAuthenticated(!!user);
      return { user, session };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signInWithAppleOAuth = async () => {
    try {
      const result = await signInWithApple();
      return result;
    } catch (error) {
      console.error('Apple sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear all user-specific cache synchronously BEFORE the async signOut call.
      // This guarantees the next user never sees stale data even if Supabase events
      // are delayed or AppContext is briefly unmounted.
      ['subscription', 'upcomingCalls', 'callHistory', 'quickSchedules', 'callerIDs_v3'].forEach(k =>
        localStorage.removeItem(k)
      );
      await authSignOut();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateUserEmail = async (newEmail) => {
    try {
      await updateEmail(newEmail);
      await checkUser(); // Refresh user
    } catch (error) {
      console.error('Update email error:', error);
      throw error;
    }
  };

  const updateUserPassword = async (newPassword) => {
    try {
      await updatePassword(newPassword);
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  };

  const resetUserPassword = async (email) => {
    try {
      await resetPassword(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    isLoading,
    isAuthenticated,
    signUp: signUpWithEmail,
    signIn: signInWithEmail,
    signInWithApple: signInWithAppleOAuth,
    signOut,
    updateEmail: updateUserEmail,
    updatePassword: updateUserPassword,
    resetPassword: resetUserPassword,
    checkUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
