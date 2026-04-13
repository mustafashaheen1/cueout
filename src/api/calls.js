import { supabase } from '../lib/supabase';
import { supabaseQuery, withAuth } from '../lib/supabaseMiddleware';

// ─── Upcoming Calls ───────────────────────────────────────────────────────────

export const getUpcomingCalls = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('upcoming_calls').select('*').eq('user_id', userId).order('due_timestamp', { ascending: true })
    )
  );

export const getUpcomingCallsDetailed = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('upcoming_calls_detailed').select('*').eq('user_id', userId).order('due_timestamp', { ascending: true })
    )
  );

export const createUpcomingCall = (call) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('upcoming_calls').insert([{ ...call, user_id: userId }]).select().single()
    )
  );

export const updateUpcomingCall = (callId, updates) =>
  supabaseQuery(() =>
    supabase.from('upcoming_calls').update(updates).eq('id', callId).select().single()
  );

export const deleteUpcomingCall = (callId) =>
  supabaseQuery(() =>
    supabase.from('upcoming_calls').delete().eq('id', callId)
  );

export const markCallAsNotNew = (callId) => updateUpcomingCall(callId, { is_new: false });

// ─── Call History ─────────────────────────────────────────────────────────────

export const getCallHistory = (limit = 50) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('call_history').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(limit)
    )
  );

export const getCallHistoryDetailed = (limit = 50) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('call_history_detailed').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(limit)
    )
  );

export const getUnreadHistoryCount = () =>
  withAuth(async (userId) => {
    const { count, error } = await supabase
      .from('call_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count || 0;
  });

export const addToHistory = (call) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('call_history').insert([{
        ...call,
        user_id: userId,
        completed_at: new Date().toISOString()
      }]).select().single()
    )
  );

export const markHistoryAsRead = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('call_history').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    )
  );

export const markHistoryItemAsRead = (historyId) =>
  supabaseQuery(() =>
    supabase.from('call_history').update({ is_read: true }).eq('id', historyId)
  );

export const deleteHistoryItem = (historyId) =>
  supabaseQuery(() =>
    supabase.from('call_history').delete().eq('id', historyId)
  );

export const completeCall = (upcomingCall, status = 'answered') =>
  withAuth(async (userId) => {
    const historyCall = await supabaseQuery(() =>
      supabase.from('call_history').insert([{
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
      }]).select().single()
    );
    await deleteUpcomingCall(upcomingCall.id);
    return historyCall;
  });
