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

// Expand nested preset object to flat DB columns.
// Only includes columns that are safe to write — never sends auto-managed fields
// like created_at, user_id, or id, which can cause Supabase to reject the request.
const toDbRecord = (schedule) => {
  const { preset } = schedule;
  const record = {};

  // Top-level metadata — included only when the caller provides them
  if (schedule.name        !== undefined) record.name        = schedule.name;
  if (schedule.icon        !== undefined) record.icon        = schedule.icon;
  if (schedule.color       !== undefined) record.color       = schedule.color;
  if (schedule.usage_count !== undefined) record.usage_count = schedule.usage_count;

  // Preset-derived flat columns
  if (preset) {
    record.persona_id      = preset.persona        || 'manager';
    record.voice_id        = preset.voice          || 'emma';
    record.contact_methods = preset.contactMethods || ['call'];
    record.context_note    = preset.note           || '';
    // When time is 'custom', store the ISO date string directly in time_preset
    // so it survives DB round-trips without needing an extra column.
    record.time_preset     = (preset.time === 'custom' && preset.customDate)
                               ? preset.customDate
                               : (preset.time || '3min');
    record.voice_category  = preset.voiceCategory  || 'realistic';
  }

  return record;
};

export const createQuickSchedule = (schedule) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('quick_schedules').insert([{ ...toDbRecord(schedule), user_id: userId }]).select().single()
    )
  );

export const updateQuickSchedule = (scheduleId, updates) =>
  supabaseQuery(() =>
    supabase.from('quick_schedules').update(toDbRecord(updates)).eq('id', scheduleId).select().single()
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
