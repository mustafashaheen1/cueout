import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/supabase';

// ============================================================================
// CALLER IDS API
// ============================================================================

/**
 * Get all caller IDs for current user
 */
export const getCallerIds = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('caller_ids')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get a single caller ID
 */
export const getCallerId = async (callerId) => {
  const { data, error } = await supabase
    .from('caller_ids')
    .select('*')
    .eq('id', callerId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create a new caller ID
 */
export const createCallerId = async (callerIdData) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('caller_ids')
    .insert([{
      ...callerIdData,
      user_id: userId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update a caller ID
 */
export const updateCallerId = async (callerId, updates) => {
  const { data, error } = await supabase
    .from('caller_ids')
    .update(updates)
    .eq('id', callerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update caller ID name only
 */
export const updateCallerIdName = async (callerId, newName) => {
  return updateCallerId(callerId, { name: newName });
};

/**
 * Delete a caller ID
 */
export const deleteCallerId = async (callerId) => {
  const { error } = await supabase
    .from('caller_ids')
    .delete()
    .eq('id', callerId);

  if (error) throw error;
};

/**
 * Initialize default caller IDs for a new user
 */
export const initializeDefaultCallerIds = async () => {
  const userId = await getCurrentUserId();

  const defaultCallerIds = [
    { name: 'Mom', phone_number: '(555) 123-4567', location: 'Mobile' },
    { name: 'Office', phone_number: '(555) 987-6543', location: 'Work' },
    { name: 'Girlfriend', phone_number: '(555) 246-8135', location: 'Mobile' },
    { name: 'Manager', phone_number: '(555) 369-2580', location: 'Work' },
    { name: 'Doctor', phone_number: '(555) 753-9514', location: 'Medical Center' }
  ];

  const { data, error } = await supabase
    .from('caller_ids')
    .insert(defaultCallerIds.map(ci => ({ ...ci, user_id: userId })))
    .select();

  if (error) throw error;
  return data;
};
