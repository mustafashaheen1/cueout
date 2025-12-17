import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/supabase';

// ============================================================================
// QUICK SCHEDULES API
// ============================================================================

/**
 * Get all quick schedules for current user
 */
export const getQuickSchedules = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('quick_schedules')
    .select('*')
    .eq('user_id', userId)
    .order('usage_count', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get a single quick schedule
 */
export const getQuickSchedule = async (scheduleId) => {
  const { data, error } = await supabase
    .from('quick_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create a new quick schedule
 */
export const createQuickSchedule = async (schedule) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('quick_schedules')
    .insert([{
      ...schedule,
      user_id: userId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update a quick schedule
 */
export const updateQuickSchedule = async (scheduleId, updates) => {
  const { data, error } = await supabase
    .from('quick_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a quick schedule
 */
export const deleteQuickSchedule = async (scheduleId) => {
  const { error } = await supabase
    .from('quick_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) throw error;
};

/**
 * Increment usage count when a quick schedule is used
 */
export const incrementQuickScheduleUsage = async (scheduleId) => {
  const schedule = await getQuickSchedule(scheduleId);

  const { data, error } = await supabase
    .from('quick_schedules')
    .update({
      usage_count: (schedule.usage_count || 0) + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Promote a quick schedule to the top (reset to max usage count)
 */
export const promoteQuickSchedule = async (scheduleId) => {
  // Get the max usage count
  const { data: maxData } = await supabase
    .from('quick_schedules')
    .select('usage_count')
    .order('usage_count', { ascending: false })
    .limit(1)
    .single();

  const maxUsageCount = maxData?.usage_count || 0;

  return updateQuickSchedule(scheduleId, {
    usage_count: maxUsageCount + 1
  });
};

/**
 * Initialize default quick schedules for a new user
 */
export const initializeDefaultQuickSchedules = async () => {
  const userId = await getCurrentUserId();

  const defaultSchedules = [
    {
      name: 'Manager',
      icon: '💼',
      color: 'bg-blue-500/10 text-blue-500',
      persona_id: 'manager',
      voice_id: 'james',
      contact_methods: ['call'],
      context_note: 'Quick call from manager',
      time_preset: 'now',
      voice_category: 'realistic'
    },
    {
      name: 'Friend',
      icon: '💬',
      color: 'bg-green-500/10 text-green-500',
      persona_id: 'friend',
      voice_id: 'emma',
      contact_methods: ['call', 'text'],
      context_note: 'Quick call from friend',
      time_preset: 'now',
      voice_category: 'realistic'
    },
    {
      name: 'Mom',
      icon: '👩',
      color: 'bg-pink-500/10 text-pink-500',
      persona_id: 'mom',
      voice_id: 'emma',
      contact_methods: ['call'],
      context_note: 'Quick call from mom',
      time_preset: 'now',
      voice_category: 'realistic'
    },
    {
      name: 'Doctor',
      icon: '⚕️',
      color: 'bg-red-500/10 text-red-500',
      persona_id: 'doctor',
      voice_id: 'james',
      contact_methods: ['call'],
      context_note: 'Quick call from doctor',
      time_preset: 'now',
      voice_category: 'realistic'
    }
  ];

  const { data, error } = await supabase
    .from('quick_schedules')
    .insert(defaultSchedules.map(qs => ({ ...qs, user_id: userId })))
    .select();

  if (error) throw error;
  return data;
};
