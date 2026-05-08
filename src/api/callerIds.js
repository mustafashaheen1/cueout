import { supabase } from '../lib/supabase';
import { supabaseQuery, withAuth } from '../lib/supabaseMiddleware';

// ─── Caller IDs ───────────────────────────────────────────────────────────────

export const getCallerIds = () =>
  supabaseQuery(() =>
    supabase.from('caller_ids').select('*').is('user_id', null).order('created_at', { ascending: true })
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

/**
 * Sync the Luron caller ID pool with the user's Supabase records.
 *
 * - Creates a row for each Luron number that doesn't yet exist for this user
 *   (default name "Caller ID 1"…"Caller ID 5").
 * - Preserves custom names the user has already saved.
 * - Deletes any stale rows (e.g. old mock (555) numbers) no longer in the pool.
 * - Returns the final array in the same order as luronNumbers.
 */
export const syncCallerIdsWithLuron = (luronNumbers) =>
  withAuth(async (userId) => {
    // Fetch all existing caller ID records for this user
    const existing = await supabaseQuery(() =>
      supabase.from('caller_ids').select('*').eq('user_id', userId)
    ) || [];

    const byPhone = new Map(existing.map(r => [r.phone_number, r]));

    // Insert rows for any Luron numbers not yet in Supabase
    const toInsert = luronNumbers
      .filter(phone => !byPhone.has(phone))
      .map((phone) => ({
        user_id:      userId,
        phone_number: phone,
        name:         `Caller ID ${luronNumbers.indexOf(phone) + 1}`,
        location:     '',
      }));

    if (toInsert.length > 0) {
      const created = await supabaseQuery(() =>
        supabase.from('caller_ids').insert(toInsert).select()
      ) || [];
      created.forEach(r => byPhone.set(r.phone_number, r));
    }

    // Delete stale rows only if they have auto-generated names ("Caller ID N").
    // Never delete records with user-customised names — the user set those deliberately.
    const isAutoName = (name) => /^Caller ID \d+$/.test(name || '');
    const stale = existing.filter(
      r => !luronNumbers.includes(r.phone_number) && isAutoName(r.name)
    );
    if (stale.length > 0) {
      await supabaseQuery(() =>
        supabase.from('caller_ids').delete().in('id', stale.map(r => r.id))
      ).catch(() => {});
    }

    // Return in the same order as the Luron pool
    return luronNumbers.map(phone => byPhone.get(phone)).filter(Boolean);
  });
