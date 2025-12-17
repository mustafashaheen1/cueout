import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/supabase';

// ============================================================================
// UPCOMING CALLS API
// ============================================================================

/**
 * Get all upcoming calls for current user
 */
export const getUpcomingCalls = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('upcoming_calls')
    .select('*')
    .eq('user_id', userId)
    .order('due_timestamp', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get upcoming calls with detailed information (using view)
 */
export const getUpcomingCallsDetailed = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('upcoming_calls_detailed')
    .select('*')
    .eq('user_id', userId)
    .order('due_timestamp', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Create a new upcoming call
 */
export const createUpcomingCall = async (call) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('upcoming_calls')
    .insert([{
      ...call,
      user_id: userId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an upcoming call
 */
export const updateUpcomingCall = async (callId, updates) => {
  const { data, error } = await supabase
    .from('upcoming_calls')
    .update(updates)
    .eq('id', callId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete an upcoming call
 */
export const deleteUpcomingCall = async (callId) => {
  const { error } = await supabase
    .from('upcoming_calls')
    .delete()
    .eq('id', callId);

  if (error) throw error;
};

/**
 * Mark call as not new (remove animation flag)
 */
export const markCallAsNotNew = async (callId) => {
  return updateUpcomingCall(callId, { is_new: false });
};

// ============================================================================
// CALL HISTORY API
// ============================================================================

/**
 * Get call history for current user
 */
export const getCallHistory = async (limit = 50) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('call_history')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

/**
 * Get call history with detailed information (using view)
 */
export const getCallHistoryDetailed = async (limit = 50) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('call_history_detailed')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

/**
 * Get unread history count
 */
export const getUnreadHistoryCount = async () => {
  const userId = await getCurrentUserId();

  const { count, error } = await supabase
    .from('call_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

/**
 * Add a call to history
 */
export const addToHistory = async (call) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('call_history')
    .insert([{
      ...call,
      user_id: userId,
      completed_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Mark all history as read
 */
export const markHistoryAsRead = async () => {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('call_history')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
};

/**
 * Mark a single history item as read
 */
export const markHistoryItemAsRead = async (historyId) => {
  const { error } = await supabase
    .from('call_history')
    .update({ is_read: true })
    .eq('id', historyId);

  if (error) throw error;
};

/**
 * Delete a history item
 */
export const deleteHistoryItem = async (historyId) => {
  const { error } = await supabase
    .from('call_history')
    .delete()
    .eq('id', historyId);

  if (error) throw error;
};

/**
 * Move upcoming call to history (when completed)
 */
export const completeCall = async (upcomingCall, status = 'answered') => {
  const userId = await getCurrentUserId();

  // Add to history
  const { data: historyCall, error: historyError } = await supabase
    .from('call_history')
    .insert([{
      user_id: userId,
      persona_id: upcomingCall.persona_id,
      voice_id: upcomingCall.voice_id,
      caller_id: upcomingCall.caller_id,
      contact_methods: upcomingCall.contact_methods,
      context_note: upcomingCall.context_note,
      status,
      duration_seconds: upcomingCall.duration_seconds,
      scheduled_time: upcomingCall.due_timestamp,
      completed_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (historyError) throw historyError;

  // Delete from upcoming
  await deleteUpcomingCall(upcomingCall.id);

  return historyCall;
};
