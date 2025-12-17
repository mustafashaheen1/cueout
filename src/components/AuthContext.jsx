import React, { createContext, useContext, useState, useEffect } from 'react';
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

    return () => {
      subscription?.unsubscribe();
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
