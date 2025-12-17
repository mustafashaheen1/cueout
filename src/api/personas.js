import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/supabase';

// ============================================================================
// PERSONAS API
// ============================================================================

/**
 * Get all personas (default + user's custom personas)
 */
export const getPersonas = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .or(`is_default.eq.true,user_id.eq.${userId}`)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get a single persona by ID
 */
export const getPersona = async (personaId) => {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', personaId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create a custom persona
 */
export const createPersona = async (persona) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('personas')
    .insert([{
      ...persona,
      user_id: userId,
      is_default: false
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update a persona
 */
export const updatePersona = async (personaId, updates) => {
  const { data, error } = await supabase
    .from('personas')
    .update(updates)
    .eq('id', personaId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a custom persona
 */
export const deletePersona = async (personaId) => {
  const { error } = await supabase
    .from('personas')
    .delete()
    .eq('id', personaId)
    .eq('is_default', false); // Safety: can't delete defaults

  if (error) throw error;
};

// ============================================================================
// PERSONA CONFIGS API
// ============================================================================

/**
 * Get persona config for a specific persona
 */
export const getPersonaConfig = async (personaId) => {
  const userId = await getCurrentUserId();

  // Try to get user-specific config first, fall back to default
  const { data, error } = await supabase
    .from('persona_configs')
    .select('*')
    .eq('persona_id', personaId)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('user_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return data;
};

/**
 * Get all persona configs for current user
 */
export const getPersonaConfigs = async () => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('persona_configs')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`);

  if (error) throw error;

  // Convert to object keyed by persona_id
  return data.reduce((acc, config) => {
    acc[config.persona_id] = config;
    return acc;
  }, {});
};

/**
 * Update or create persona config
 */
export const upsertPersonaConfig = async (personaId, config) => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('persona_configs')
    .upsert([{
      persona_id: personaId,
      user_id: userId,
      ...config
    }], {
      onConflict: 'persona_id,user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete persona config
 */
export const deletePersonaConfig = async (personaId) => {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('persona_configs')
    .delete()
    .eq('persona_id', personaId)
    .eq('user_id', userId);

  if (error) throw error;
};
