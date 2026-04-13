import { supabase } from '../lib/supabase';
import { supabaseQuery, withAuth } from '../lib/supabaseMiddleware';

// ─── Caller IDs ───────────────────────────────────────────────────────────────

export const getCallerIds = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('caller_ids').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    )
  );

export const getCallerId = (callerId) =>
  supabaseQuery(() =>
    supabase.from('caller_ids').select('*').eq('id', callerId).single()
  );

export const createCallerId = (callerIdData) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('caller_ids').insert([{ ...callerIdData, user_id: userId }]).select().single()
    )
  );

export const updateCallerId = (callerId, updates) =>
  supabaseQuery(() =>
    supabase.from('caller_ids').update(updates).eq('id', callerId).select().single()
  );

export const updateCallerIdName = (callerId, newName) =>
  updateCallerId(callerId, { name: newName });

export const deleteCallerId = (callerId) =>
  supabaseQuery(() =>
    supabase.from('caller_ids').delete().eq('id', callerId)
  );

export const initializeDefaultCallerIds = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('caller_ids').insert([
        { name: 'Mom',        phone_number: '(555) 123-4567', location: 'Mobile',          user_id: userId },
        { name: 'Office',     phone_number: '(555) 987-6543', location: 'Work',             user_id: userId },
        { name: 'Girlfriend', phone_number: '(555) 246-8135', location: 'Mobile',          user_id: userId },
        { name: 'Manager',    phone_number: '(555) 369-2580', location: 'Work',             user_id: userId },
        { name: 'Doctor',     phone_number: '(555) 753-9514', location: 'Medical Center',  user_id: userId },
      ]).select()
    )
  );
