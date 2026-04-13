import { supabase } from '../lib/supabase';
import { supabaseQuery, withAuth } from '../lib/supabaseMiddleware';

// ─── Quick Schedules ──────────────────────────────────────────────────────────

export const getQuickSchedules = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('quick_schedules').select('*').eq('user_id', userId)
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: true })
    )
  );

export const getQuickSchedule = (scheduleId) =>
  supabaseQuery(() =>
    supabase.from('quick_schedules').select('*').eq('id', scheduleId).single()
  );

export const createQuickSchedule = (schedule) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('quick_schedules').insert([{ ...schedule, user_id: userId }]).select().single()
    )
  );

export const updateQuickSchedule = (scheduleId, updates) =>
  supabaseQuery(() =>
    supabase.from('quick_schedules').update(updates).eq('id', scheduleId).select().single()
  );

export const deleteQuickSchedule = (scheduleId) =>
  supabaseQuery(() =>
    supabase.from('quick_schedules').delete().eq('id', scheduleId)
  );

export const promoteQuickSchedule = async (scheduleId) => {
  const { data: maxData } = await supabase
    .from('quick_schedules')
    .select('usage_count')
    .order('usage_count', { ascending: false })
    .limit(1)
    .single();

  return updateQuickSchedule(scheduleId, {
    usage_count: (maxData?.usage_count || 0) + 1
  });
};

export const initializeDefaultQuickSchedules = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('quick_schedules').insert([
        { name: 'Manager', icon: '💼', color: 'bg-blue-500/10 text-blue-500',  persona_id: 'manager', voice_id: 'james', contact_methods: ['call'], context_note: '', time_preset: '3min', voice_category: 'realistic', user_id: userId },
        { name: 'Friend',  icon: '💬', color: 'bg-green-500/10 text-green-500', persona_id: 'friend',  voice_id: 'emma',  contact_methods: ['call'], context_note: '', time_preset: '3min', voice_category: 'realistic', user_id: userId },
        { name: 'Mom',     icon: '❤️', color: 'bg-pink-500/10 text-pink-500',  persona_id: 'mom',     voice_id: 'emma',  contact_methods: ['call'], context_note: '', time_preset: '3min', voice_category: 'realistic', user_id: userId },
        { name: 'Doctor',  icon: '⚕️', color: 'bg-red-500/10 text-red-500',   persona_id: 'doctor',  voice_id: 'james', contact_methods: ['call'], context_note: '', time_preset: '3min', voice_category: 'realistic', user_id: userId },
      ]).select()
    )
  );
