import { supabase } from '../lib/supabase';
import { supabaseQuery, withAuth } from '../lib/supabaseMiddleware';

// ─── Personas ─────────────────────────────────────────────────────────────────

export const getPersonas = () =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('personas').select('*')
        .or(`is_default.eq.true,user_id.eq.${userId}`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
    )
  );

export const getPersona = (personaId) =>
  supabaseQuery(() =>
    supabase.from('personas').select('*').eq('id', personaId).single()
  );

export const createPersona = (persona) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('personas').insert([{ ...persona, user_id: userId, is_default: false }]).select().single()
    )
  );

export const updatePersona = (personaId, updates) =>
  supabaseQuery(() =>
    supabase.from('personas').update(updates).eq('id', personaId).select().single()
  );

export const deletePersona = (personaId) =>
  supabaseQuery(() =>
    supabase.from('personas').delete().eq('id', personaId).eq('is_default', false)
  );

// ─── Persona Configs ──────────────────────────────────────────────────────────

export const getPersonaConfig = (personaId) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('persona_configs').select('*')
        .eq('persona_id', personaId)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('user_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .single()
    ).catch((err) => {
      // PGRST116 = no row found — not an error, just no config yet
      if (err.code === 'PGRST116') return null;
      throw err;
    })
  );

export const getPersonaConfigs = () =>
  withAuth(async (userId) => {
    const data = await supabaseQuery(() =>
      supabase.from('persona_configs').select('*').or(`user_id.eq.${userId},user_id.is.null`)
    );
    return (data || []).reduce((acc, config) => {
      acc[config.persona_id] = config;
      return acc;
    }, {});
  });

export const upsertPersonaConfig = (personaId, config) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('persona_configs').upsert([{
        persona_id: personaId,
        user_id: userId,
        tone: config.tone,
        background_sound: config.background,
        custom_phrases: config.customPhrases,
        duration_seconds: config.duration,
      }], { onConflict: 'persona_id,user_id' }).select().single()
    )
  );

export const deletePersonaConfig = (personaId) =>
  withAuth((userId) =>
    supabaseQuery(() =>
      supabase.from('persona_configs').delete().eq('persona_id', personaId).eq('user_id', userId)
    )
  );
