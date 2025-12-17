import { supabase } from '../lib/supabase';

// ============================================================================
// AUTHENTICATION API
// ============================================================================

/**
 * Sign up a new user with email and password
 */
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

/**
 * Sign in with email and password
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

/**
 * Sign in with Apple (OAuth)
 */
export const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
  });

  if (error) throw error;
  return data;
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get current session
 */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

/**
 * Update user email
 */
export const updateEmail = async (newEmail) => {
  const { data, error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (error) throw error;
  return data;
};

/**
 * Update user password
 */
export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

// ============================================================================
// USER PROFILE API
// ============================================================================

/**
 * Get user profile
 */
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update phone number
 */
export const updatePhoneNumber = async (userId, phoneNumber, countryCode) => {
  return updateUserProfile(userId, { phone_number: phoneNumber, country_code: countryCode });
};

/**
 * Toggle creator mode
 */
export const toggleCreatorMode = async (userId, enabled) => {
  return updateUserProfile(userId, { creator_mode_enabled: enabled });
};

/**
 * Toggle notifications
 */
export const toggleNotifications = async (userId, enabled) => {
  return updateUserProfile(userId, { notifications_enabled: enabled });
};

/**
 * Update ringtone selection
 */
export const updateRingtone = async (userId, ringtone) => {
  return updateUserProfile(userId, { selected_ringtone: ringtone });
};
